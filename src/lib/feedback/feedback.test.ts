import { afterEach, describe, expect, it, vi } from 'vitest';
import { TokenStore } from '@/lib/api';
import { feedbackCharacters, isSendableFeedback, MAX_FEEDBACK_CHARACTERS, sendFeedback } from './index';

function mockFetch(spec: { status: number; body?: unknown }) {
  const calls: { url: string; method: string; headers: Record<string, string>; body?: Record<string, unknown> }[] = [];

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({
        url,
        method: init.method as string,
        headers: init.headers as Record<string, string>,
        body: init.body ? JSON.parse(init.body as string) : undefined,
      });
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

function context() {
  const tokens = new TokenStore();
  tokens.set('jwt-token');
  return { tokens };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('feedback length', () => {
  it('counts characters, not UTF-16 units, after trimming', () => {
    expect(feedbackCharacters('  hello \n')).toBe(5);
    expect(feedbackCharacters('😀😀')).toBe(2);
  });

  it('accepts 1 to 1000 characters and nothing else', () => {
    expect(isSendableFeedback('')).toBe(false);
    expect(isSendableFeedback('   \n')).toBe(false);
    expect(isSendableFeedback('a')).toBe(true);
    expect(isSendableFeedback('a'.repeat(MAX_FEEDBACK_CHARACTERS))).toBe(true);
    expect(isSendableFeedback('a'.repeat(MAX_FEEDBACK_CHARACTERS + 1))).toBe(false);
    expect(isSendableFeedback('😀'.repeat(MAX_FEEDBACK_CHARACTERS))).toBe(true);
  });
});

describe('sendFeedback', () => {
  it('posts the trimmed message with the token and returns the receipt', async () => {
    const calls = mockFetch({
      status: 201,
      body: { message: 'Feedback received', data: { id: 'f1', created_at: '2026-10-22T12:00:00Z' } },
    });

    const sent = await sendFeedback(context(), '  The camera is slow.\n');

    expect(sent).toEqual({ id: 'f1', createdAt: '2026-10-22T12:00:00Z' });
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toMatch(/\/feedback$/);
    expect(calls[0].body).toEqual({ message: 'The camera is slow.' });
    expect(JSON.stringify(calls[0].headers)).toContain('jwt-token');
  });

  it('refuses an empty or over-long message without a request', async () => {
    const calls = mockFetch({ status: 201, body: { data: { id: 'f1', created_at: 'x' } } });

    await expect(sendFeedback(context(), '   ')).rejects.toThrow();
    await expect(sendFeedback(context(), 'a'.repeat(MAX_FEEDBACK_CHARACTERS + 1))).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });

  it('surfaces a refusal from the server', async () => {
    mockFetch({ status: 429, body: { error: 'TOO_MANY_REQUESTS' } });

    await expect(sendFeedback(context(), 'hello')).rejects.toThrow();
  });
});
