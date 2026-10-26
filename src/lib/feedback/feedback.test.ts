import { afterEach, describe, expect, it, vi } from 'vitest';
import { TokenStore } from '@/lib/api';
import {
  answerFeedback,
  feedbackCharacters,
  isSendableFeedback,
  listFeedback,
  MAX_FEEDBACK_CHARACTERS,
  readFeedbackThread,
  sendFeedback,
} from './index';

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

const FEEDBACK_ID = '00000000-0000-4000-8000-0000000000f1';

describe('readFeedbackThread', () => {
  it('reads the sender\'s message with its replies, oldest first as the server sends them', async () => {
    const calls = mockFetch({
      status: 200,
      body: {
        data: {
          id: FEEDBACK_ID,
          message: 'Too bright at night',
          created_at: '2026-10-25T18:40:00Z',
          replies: [
            { id: 'r1', author: 'team', message: 'Thank you', created_at: '2026-10-26T09:12:00Z' },
            { id: 'r2', author: 'user', message: 'Great', created_at: '2026-10-26T10:00:00Z' },
          ],
        },
      },
    });

    const thread = await readFeedbackThread(context(), FEEDBACK_ID);

    expect(calls[0]).toMatchObject({ method: 'GET' });
    expect(calls[0].url).toContain(`/feedback/${FEEDBACK_ID}`);
    expect(thread.message).toBe('Too bright at night');
    expect(thread.replies.map((reply) => reply.author)).toEqual(['team', 'user']);
    expect(thread.replies[0]).toEqual({
      id: 'r1',
      author: 'team',
      message: 'Thank you',
      createdAt: '2026-10-26T09:12:00Z',
    });
  });

  it('treats a missing reply list as no replies and an unknown author as the team', async () => {
    mockFetch({ status: 200, body: { data: { id: FEEDBACK_ID, message: 'Hi', created_at: '2026-10-25T18:40:00Z' } } });
    expect((await readFeedbackThread(context(), FEEDBACK_ID)).replies).toEqual([]);

    mockFetch({
      status: 200,
      body: {
        data: {
          id: FEEDBACK_ID,
          message: 'Hi',
          created_at: '2026-10-25T18:40:00Z',
          replies: [{ id: 'r1', author: 'robot', message: 'x', created_at: '2026-10-26T09:12:00Z' }],
        },
      },
    });
    expect((await readFeedbackThread(context(), FEEDBACK_ID)).replies[0].author).toBe('team');
  });

  it('refuses an id that is not a canonical UUID before any request', async () => {
    const calls = mockFetch({ status: 200, body: { data: {} } });

    await expect(readFeedbackThread(context(), 'not-an-id')).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });
});

describe('answerFeedback', () => {
  it('posts the trimmed reply to the thread and returns its id', async () => {
    const calls = mockFetch({ status: 201, body: { data: { id: 'r3', created_at: '2026-10-26T11:00:00Z' } } });

    const sent = await answerFeedback(context(), FEEDBACK_ID, '  Thanks!  ');

    expect(calls[0]).toMatchObject({ method: 'POST', body: { message: 'Thanks!' } });
    expect(calls[0].url).toContain(`/feedback/${FEEDBACK_ID}/replies`);
    expect(sent).toEqual({ id: 'r3', createdAt: '2026-10-26T11:00:00Z' });
  });

  it('refuses an empty or over-long reply before any request', async () => {
    const calls = mockFetch({ status: 201, body: { data: {} } });

    await expect(answerFeedback(context(), FEEDBACK_ID, '   ')).rejects.toThrow();
    await expect(answerFeedback(context(), FEEDBACK_ID, 'a'.repeat(MAX_FEEDBACK_CHARACTERS + 1))).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });
});

describe('listFeedback', () => {
  it('reads one item per conversation with the newest message and the paging cursor', async () => {
    const calls = mockFetch({
      status: 200,
      body: {
        data: {
          feedback: [
            {
              id: FEEDBACK_ID,
              message: 'Too bright at night',
              last_message: 'Dark, Noite is live.',
              last_author: 'team',
              reply_count: 2,
              created_at: '2026-10-25T18:40:00Z',
              last_activity_at: '2026-10-26T09:12:00Z',
            },
          ],
        },
        page: { has_more: true, next_cursor: 'c2' },
      },
    });

    const page = await listFeedback(context(), { limit: 20, cursor: 'c1' });

    expect(calls[0]).toMatchObject({ method: 'GET' });
    expect(calls[0].url).toContain('/feedback?');
    expect(calls[0].url).toContain('limit=20');
    expect(calls[0].url).toContain('cursor=c1');
    expect(page.nextCursor).toBe('c2');
    expect(page.feedback).toEqual([
      {
        id: FEEDBACK_ID,
        message: 'Too bright at night',
        lastMessage: 'Dark, Noite is live.',
        lastAuthor: 'team',
        replyCount: 2,
        createdAt: '2026-10-25T18:40:00Z',
        lastActivityAt: '2026-10-26T09:12:00Z',
      },
    ]);
  });

  it('has no cursor on the last page and reads an unknown author as the sender', async () => {
    mockFetch({
      status: 200,
      body: {
        data: {
          feedback: [
            {
              id: FEEDBACK_ID,
              message: 'Hi',
              last_message: 'Hi',
              last_author: 'robot',
              reply_count: 0,
              created_at: '2026-10-25T18:40:00Z',
              last_activity_at: '2026-10-25T18:40:00Z',
            },
          ],
        },
        page: { has_more: false },
      },
    });

    const page = await listFeedback(context());

    expect(page.nextCursor).toBeUndefined();
    expect(page.feedback[0].lastAuthor).toBe('user');
  });
});
