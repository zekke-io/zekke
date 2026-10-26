import { describe, expect, it } from 'vitest';
import {
  RECENT_LIMIT,
  feedbackItems,
  feedbackOpenedBy,
  inNotificationsTab,
  notificationAction,
  notificationIcon,
  recentEntries,
  unreadAtLoad,
  unreadByFeedback,
  type RecentCandidate,
} from './activity';

const now = new Date('2026-10-26T12:00:00Z');
const FEEDBACK = '00000000-0000-4000-8000-0000000000f1';
const OTHER = '00000000-0000-4000-8000-0000000000f2';

function candidate(id: string, updatedAt: string, kind: RecentCandidate['kind'] = 'note'): RecentCandidate {
  return { id, kind, title: `Item ${id}`, updatedAt };
}

describe('notificationAction', () => {
  it('points plan and storage notices at the plans, deletions at the Drive and sharing at Shared', () => {
    expect(notificationAction('grace_started')).toEqual({ label: 'See plans', target: 'plan' });
    expect(notificationAction('data_loss_countdown')?.target).toBe('plan');
    expect(notificationAction('data_deleted')).toEqual({ label: 'Open Drive', target: 'drive' });
    expect(notificationAction('item_shared')).toEqual({ label: 'Open Shared', target: 'shared' });
    expect(notificationAction('connection_invited')?.target).toBe('shared');
  });

  it('offers nothing for a notice that only informs, or a kind this version does not know', () => {
    expect(notificationAction('purchase_succeeded')).toBeUndefined();
    expect(notificationAction('announcement')).toBeUndefined();
    expect(notificationAction('lottery_won')).toBeUndefined();
  });
});

describe('notificationIcon', () => {
  it('picks an icon per kind and falls back to the information icon', () => {
    expect(notificationIcon('purchase_succeeded')).toBe('card');
    expect(notificationIcon('payment_failed')).toBe('alert');
    expect(notificationIcon('data_deleted')).toBe('trash');
    expect(notificationIcon('item_shared')).toBe('sharing');
    expect(notificationIcon('feedback_replied')).toBe('chat');
    expect(notificationIcon('lottery_won')).toBe('info');
  });
});

describe('unreadAtLoad', () => {
  it('counts the notifications without a read time, leaving out the replies shown in the Feedback pill', () => {
    const plain = { kind: 'item_shared', params: {} };
    const reply = { kind: 'feedback_replied', params: { feedback_id: FEEDBACK } };

    expect(unreadAtLoad([plain, { ...plain, read_at: '2026-10-25T00:00:00Z' }, plain, reply])).toBe(2);
    expect(unreadAtLoad([])).toBe(0);
  });
});

describe('recentEntries', () => {
  it('lists the newest first with the kind and how long ago', () => {
    const entries = recentEntries(
      [
        candidate('a', '2026-10-25T12:00:00Z', 'password'),
        candidate('b', '2026-10-26T11:48:00Z', 'note'),
        candidate('c', '2026-10-26T10:00:00Z', 'document'),
      ],
      now,
    );

    expect(entries.map((entry) => entry.id)).toEqual(['b', 'c', 'a']);
    expect(entries[0]).toMatchObject({ detail: 'Note', when: '12 min ago' });
    expect(entries[1]).toMatchObject({ detail: 'Document', when: '2 h ago' });
    expect(entries[2]).toMatchObject({ detail: 'Password', when: 'Yesterday' });
  });

  it('keeps only the newest ones, drops unreadable times and breaks ties by id', () => {
    const many = Array.from({ length: RECENT_LIMIT + 5 }, (_, index) =>
      candidate(String(index).padStart(2, '0'), `2026-10-${String(10 + index).padStart(2, '0')}T00:00:00Z`),
    );
    expect(recentEntries(many, now)).toHaveLength(RECENT_LIMIT);

    const tied = recentEntries([candidate('b', '2026-10-26T00:00:00Z'), candidate('a', '2026-10-26T00:00:00Z')], now);
    expect(tied.map((entry) => entry.id)).toEqual(['a', 'b']);

    expect(recentEntries([candidate('x', 'not a date')], now)).toEqual([]);
  });
});

describe('feedbackOpenedBy', () => {
  const id = '00000000-0000-4000-8000-0000000000f1';

  it('names the feedback a reply belongs to', () => {
    expect(feedbackOpenedBy({ kind: 'feedback_replied', params: { feedback_id: id, reply: 'Fixed' } })).toBe(id);
  });

  it('names nothing for another kind, a missing id or one that is not a canonical UUID', () => {
    expect(feedbackOpenedBy({ kind: 'item_shared', params: { feedback_id: id } })).toBeUndefined();
    expect(feedbackOpenedBy({ kind: 'feedback_replied', params: {} })).toBeUndefined();
    expect(feedbackOpenedBy({ kind: 'feedback_replied', params: { feedback_id: 'x' } })).toBeUndefined();
    expect(feedbackOpenedBy({ kind: 'feedback_replied', params: { feedback_id: 7 } })).toBeUndefined();
  });
});

describe('the conversation items of the Feedback pill', () => {
  const record = (id: string, feedback: string, read_at?: string) => ({
    id,
    kind: 'feedback_replied',
    params: { feedback_id: feedback, reply: 'x' },
    created_at: '2026-10-26T09:00:00Z',
    read_at,
  });

  it('keeps replies out of the Notifications pill', () => {
    const kept = inNotificationsTab([
      { kind: 'item_shared', params: {} },
      { kind: 'feedback_replied', params: { feedback_id: FEEDBACK } },
      { kind: 'feedback_replied', params: {} },
    ]);

    expect(kept.map((entry) => entry.kind)).toEqual(['item_shared', 'feedback_replied']);
  });

  it('groups the unread replies by the feedback they answer', () => {
    const unread = unreadByFeedback([
      record('n1', FEEDBACK),
      record('n2', FEEDBACK),
      record('n3', OTHER, '2026-10-26T10:00:00Z'),
      { id: 'n4', kind: 'item_shared', params: {}, created_at: '2026-10-26T09:00:00Z' },
    ]);

    expect(unread.get(FEEDBACK)).toEqual(['n1', 'n2']);
    expect(unread.has(OTHER)).toBe(false);
    expect(unread.size).toBe(1);
  });

  it('shows one item per conversation: its title, who spoke last, the count and the age', () => {
    const items = feedbackItems(
      [
        {
          id: FEEDBACK,
          message: 'Dark mode on the unlock screen\nMore detail',
          lastMessage: 'Dark, Noite is live.\n\nOpen Settings.',
          lastAuthor: 'team',
          replyCount: 2,
          createdAt: '2026-10-25T18:40:00Z',
          lastActivityAt: '2026-10-26T11:48:00Z',
        },
        {
          id: OTHER,
          message: 'Sort Drive by size',
          lastMessage: 'Sort Drive by size',
          lastAuthor: 'user',
          replyCount: 0,
          createdAt: '2026-10-24T18:40:00Z',
          lastActivityAt: '2026-10-24T18:40:00Z',
        },
      ],
      new Map([[FEEDBACK, ['n1']]]),
      now,
    );

    expect(items[0]).toEqual({
      id: FEEDBACK,
      title: 'Dark mode on the unlock screen',
      preview: 'Zekke team: Dark, Noite is live. Open Settings.',
      replies: '2 replies',
      when: '12 min ago',
      unread: true,
    });
    expect(items[1]).toMatchObject({ preview: 'You: Sort Drive by size', replies: 'No replies yet', unread: false });
  });

  it('cuts a long preview to one line', () => {
    const [item] = feedbackItems(
      [
        {
          id: FEEDBACK,
          message: 'x',
          lastMessage: 'word '.repeat(60),
          lastAuthor: 'user',
          replyCount: 0,
          createdAt: '2026-10-26T11:00:00Z',
          lastActivityAt: '2026-10-26T11:00:00Z',
        },
      ],
      new Map(),
      now,
    );

    expect(item.preview.endsWith('…')).toBe(true);
    expect(item.preview).not.toContain('\n');
  });
});
