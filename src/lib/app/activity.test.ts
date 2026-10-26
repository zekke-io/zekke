import { describe, expect, it } from 'vitest';
import {
  RECENT_LIMIT,
  notificationAction,
  notificationIcon,
  recentEntries,
  unreadAtLoad,
  type RecentCandidate,
} from './activity';

const now = new Date('2026-10-26T12:00:00Z');

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
  it('counts the records without a read time', () => {
    expect(unreadAtLoad([{}, { read_at: '2026-10-25T00:00:00Z' }, {}])).toBe(2);
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
