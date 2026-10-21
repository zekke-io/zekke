import { afterEach, describe, expect, it, vi } from 'vitest';
import { openTestSession } from '@/test/session';
import { TokenStore } from '@/lib/api';
import type { AuthedContext } from '@/lib/context';
import { buildActionPayload, verifyPayload } from '@/lib/signing';
import {
  RecordTooLargeError,
  createRecord,
  deleteRecords,
  listRecordsMeta,
  openRecord,
  updateRecord,
  type RecordScope,
  type SealedRecord,
} from './index';

const shared = await openTestSession();
const ID_A = '0c892e57-93cf-423a-a9e9-fee5a9f87681';
const ID_B = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';

interface Call {
  url: string;
  method: string;
  body?: Record<string, unknown>;
}

function mockFetch(...specs: { status: number; body?: unknown }[]) {
  const calls: Call[] = [];
  let index = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, method: init.method as string, body: init.body ? JSON.parse(init.body as string) : undefined });
      const spec = specs[Math.min(index++, specs.length - 1)];
      const text = spec.body === undefined ? '' : JSON.stringify(spec.body);
      return {
        status: spec.status,
        ok: spec.status >= 200 && spec.status < 300,
        text: async () => text,
        headers: { get: () => null },
      } as unknown as Response;
    }),
  );
  return calls;
}

function newContext(): AuthedContext {
  const tokens = new TokenStore();
  tokens.set('jwt-token');
  return { session: shared.context.session, tokens, paranoid: false };
}

function stored(partial: Partial<SealedRecord> = {}): SealedRecord {
  return {
    id: ID_A,
    ciphertext: 'AXh4',
    wrapped_dek: 'd3JhcHBlZA==',
    key_generation: 1,
    version: 'v1',
    created_at: '2026-08-01T12:00:00Z',
    updated_at: '2026-08-01T12:00:00Z',
    ...partial,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe.each<RecordScope>(['calendar', 'diary'])('the %s records', (scope) => {
  it('posts to its own route with a client id, and never sends the payload in clear', async () => {
    const calls = mockFetch({ status: 201, body: { data: stored() } });

    const { created } = await createRecord(newContext(), scope, { type: 'event', title: 'secret dentist visit' });

    expect(created).toBe(true);
    expect(calls[0].url).toBe(`http://localhost:8080/${scope}`);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].body!.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(calls[0].body!.version).toBe('v1');
    expect(JSON.stringify(calls[0].body)).not.toContain('dentist');
    expect(calls[0].body).not.toHaveProperty('signature');
  });

  it('tells a replay from a creation', async () => {
    mockFetch({ status: 200, body: { data: stored() } });
    expect((await createRecord(newContext(), scope, { a: 1 }, { id: ID_A })).created).toBe(false);
  });

  it('round-trips a payload through the sealed record', async () => {
    const calls = mockFetch({ status: 201, body: { data: stored() } });
    const context = newContext();
    await createRecord(context, scope, { type: 'task', title: 'Pay rent' });

    const echoed = stored({ ciphertext: calls[0].body!.ciphertext as string, wrapped_dek: calls[0].body!.wrapped_dek as string });
    expect(await openRecord(context, scope, echoed)).toEqual({ type: 'task', title: 'Pay rent' });
  });

  it('updates with a PUT that keeps the stored wrap and changes the ciphertext', async () => {
    const created = mockFetch({ status: 201, body: { data: stored() } });
    const context = newContext();
    await createRecord(context, scope, { n: 1 });
    const record = stored({ ciphertext: created[0].body!.ciphertext as string, wrapped_dek: created[0].body!.wrapped_dek as string });

    const edits = mockFetch({ status: 200, body: { data: record } });
    await updateRecord(context, scope, record, { n: 2 });

    expect(edits[0].method).toBe('PUT');
    expect(edits[0].url).toBe(`http://localhost:8080/${scope}/${ID_A}`);
    expect(edits[0].body!.wrapped_dek).toBe(record.wrapped_dek);
    expect(edits[0].body!.ciphertext).not.toBe(record.ciphertext);
    expect(await openRecord(context, scope, { ...record, ciphertext: edits[0].body!.ciphertext as string })).toEqual({ n: 2 });
  });

  it('refuses a payload that seals over the server cap, before any request', async () => {
    const calls = mockFetch({ status: 201, body: { data: stored() } });
    await expect(createRecord(newContext(), scope, { text: 'x'.repeat(100_000) })).rejects.toBeInstanceOf(RecordTooLargeError);
    expect(calls).toHaveLength(0);
  });

  it('deletes a set with one signature over the sorted ids, under its own action', async () => {
    const calls = mockFetch({ status: 200, body: { data: { requested: 2, deleted: 2 } } });

    const result = await deleteRecords(newContext(), scope, [ID_A, ID_B, ID_A]);

    expect(result).toEqual({ requested: 2, deleted: 2 });
    expect(calls[0].method).toBe('DELETE');
    expect(calls[0].url).toBe(`http://localhost:8080/${scope}`);
    const sorted = [ID_B, ID_A].sort();
    expect(calls[0].body!.ids).toEqual(sorted);

    const body = calls[0].body!;
    const payload = buildActionPayload(body.challenge as string, body.timestamp as number, `${scope}-delete`, sorted);
    expect(verifyPayload(payload, body.signature as string, shared.devicePublicKey)).toBe(true);
  });

  it('lists the metadata the rekey needs', async () => {
    const calls = mockFetch({ status: 200, body: { data: [{ id: ID_A, wrapped_dek: 'w', key_generation: 1 }], page: { has_more: false } } });
    const metas = await listRecordsMeta(newContext(), scope);
    expect(metas.map((meta) => meta.id)).toEqual([ID_A]);
    expect(calls[0].url).toContain(`/${scope}`);
  });
});
