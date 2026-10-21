import { assertCanonicalUuid, collectPages, request, type PageRequest } from '@/lib/api';
import { requireToken, type AuthedContext } from '@/lib/context';
import { zeroBytes } from '@/lib/encoding';
import { scopeDekWrapper, withCurrentGeneration } from '@/lib/keyrings';
import { generateDek, openText, sealText } from '@/lib/secrets';
import { normalizeActionArgs, signActionEnvelope } from '@/lib/signing';

export const RECORD_VERSION = 'v1';
export const MAX_RECORD_CIPHERTEXT_CHARACTERS = 131072;

export type RecordScope = 'calendar' | 'diary';

const ROUTES = {
  calendar: { path: '/calendar', deleteAction: 'calendar-delete' },
  diary: { path: '/diary', deleteAction: 'diary-delete' },
} as const;

export interface SealedRecord {
  id: string;
  ciphertext: string;
  wrapped_dek: string;
  key_generation: number;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface RecordMeta {
  id: string;
  wrapped_dek: string;
  key_generation: number;
  ciphertext_sha256: string;
  ciphertext_bytes: number;
  version: string;
  created_at: string;
  updated_at: string;
}

export class RecordTooLargeError extends Error {
  constructor(characters: number) {
    super(`This is too large to save: ${characters} characters sealed, at most ${MAX_RECORD_CIPHERTEXT_CHARACTERS}`);
    this.name = 'RecordTooLargeError';
  }
}

function assertFits(ciphertext: string): string {
  if (ciphertext.length > MAX_RECORD_CIPHERTEXT_CHARACTERS) {
    throw new RecordTooLargeError(ciphertext.length);
  }
  return ciphertext;
}

export async function createRecord(
  context: AuthedContext,
  scope: RecordScope,
  payload: unknown,
  options: { id?: string } = {},
): Promise<{ record: SealedRecord; created: boolean }> {
  const id = options.id === undefined ? crypto.randomUUID() : assertCanonicalUuid(options.id);
  const dek = generateDek();

  try {
    const ciphertext = assertFits(await sealText(JSON.stringify(payload), dek));
    const response = await withCurrentGeneration(context, async () =>
      request<SealedRecord>({
        method: 'POST',
        path: ROUTES[scope].path,
        token: requireToken(context),
        timeoutMs: context.timeoutMs,
        body: { id, ciphertext, ...(await scopeDekWrapper(context, scope).wrapDek(dek)), version: RECORD_VERSION },
      }),
    );
    return { record: response.data, created: response.status === 201 };
  } finally {
    zeroBytes(dek);
  }
}

export async function updateRecord(
  context: AuthedContext,
  scope: RecordScope,
  record: SealedRecord,
  payload: unknown,
): Promise<SealedRecord> {
  const id = assertCanonicalUuid(record.id);
  const wrapper = scopeDekWrapper(context, scope);
  const dek = await wrapper.unwrapDek(record);

  try {
    const ciphertext = assertFits(await sealText(JSON.stringify(payload), dek));
    let wrapped = { wrapped_dek: record.wrapped_dek, key_generation: record.key_generation };
    const response = await withCurrentGeneration(context, async () => {
      if (wrapped.key_generation !== context.session.currentGeneration(scope)) {
        wrapped = await wrapper.wrapDek(dek);
      }
      return request<SealedRecord>({
        method: 'PUT',
        path: `${ROUTES[scope].path}/${id}`,
        token: requireToken(context),
        timeoutMs: context.timeoutMs,
        body: { ciphertext, ...wrapped, version: record.version || RECORD_VERSION },
      });
    });
    return response.data;
  } finally {
    zeroBytes(dek);
  }
}

export async function openRecord(context: AuthedContext, scope: RecordScope, record: SealedRecord): Promise<unknown> {
  const dek = await scopeDekWrapper(context, scope).unwrapDek(record);
  try {
    return JSON.parse(await openText(record.ciphertext, dek)) as unknown;
  } finally {
    zeroBytes(dek);
  }
}

export async function listRecordsMeta(context: AuthedContext, scope: RecordScope): Promise<RecordMeta[]> {
  return collectPages<RecordMeta>(
    (page: PageRequest) =>
      request<RecordMeta[]>({
        method: 'GET',
        path: ROUTES[scope].path,
        query: { limit: page.limit, cursor: page.cursor },
        token: requireToken(context),
        timeoutMs: context.timeoutMs,
      }),
    {},
  );
}

export async function deleteRecords(
  context: AuthedContext,
  scope: RecordScope,
  ids: readonly string[],
): Promise<{ requested: number; deleted: number }> {
  const canonical = ids.map((id) => assertCanonicalUuid(id));
  const action = ROUTES[scope].deleteAction;
  const normalized = normalizeActionArgs(action, canonical);
  const envelope = await signActionEnvelope(action, normalized, context.session.signer());

  const response = await request<{ requested: number; deleted: number }>({
    method: 'DELETE',
    path: ROUTES[scope].path,
    token: requireToken(context),
    timeoutMs: context.timeoutMs,
    body: { ids: normalized, ...envelope },
  });
  return response.data;
}
