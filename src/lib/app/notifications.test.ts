import { describe, expect, it } from 'vitest';
import type { NotificationRecord } from '@/lib/notifications';
import { NOTIFICATIONS_COPY, notificationAge, notificationView, planName, unreadIds } from './notifications';

const now = new Date('2026-10-03T12:00:00Z');

function record(kind: string, params: Record<string, unknown> = {}, extra: Partial<NotificationRecord> = {}): NotificationRecord {
  return { id: 'n1', kind, params, created_at: '2026-10-03T11:30:00Z', ...extra };
}

describe('notificationView', () => {
  it('writes every kind the API sends without a blank title or body', () => {
    const kinds = [
      'purchase_succeeded',
      'subscription_renewed',
      'payment_failed',
      'refunded',
      'expiring',
      'grace_started',
      'data_loss_countdown',
      'data_deleted',
      'connection_invited',
      'item_shared',
    ];
    for (const kind of kinds) {
      const view = notificationView(record(kind), now);
      expect(view.title.length, kind).toBeGreaterThan(0);
      expect(view.body.length, kind).toBeGreaterThan(0);
      expect(view.body, kind).not.toContain('undefined');
    }
  });

  it('names the plan and the paid date', () => {
    const view = notificationView(record('purchase_succeeded', { plan: 'premium_2', paid_until: '2027-10-04T00:00:00Z' }), now);
    expect(view.title).toBe('Premium 2 is active');
    expect(view.body).toContain('2027');
    expect(view.tone).toBe('success');
  });

  it('counts down the days and the bytes over the free plan', () => {
    const view = notificationView(record('data_loss_countdown', { days_left: 1, over_bytes: 3 * 1024 ** 3 }), now);
    expect(view.title).toBe('Files will be deleted in 1 day');
    expect(view.body).toContain('3.0 GiB');
    expect(view.tone).toBe('danger');

    expect(notificationView(record('expiring', { plan: 'premium_1', days: 7 }), now).title).toBe('Premium 1 ends in 7 days');
  });

  it('tells the invitee about an invitation to connect', () => {
    const view = notificationView(record('connection_invited', { connection_id: 'c1' }), now);
    expect(view.title).toBe('New invitation to connect');
    expect(view.body).toContain('Shared');
    expect(view.tone).toBe('info');
  });

  it('names what was shared and falls back when the type is unknown', () => {
    expect(notificationView(record('item_shared', { item_type: 'note' }), now).title).toBe('A note was shared with you');
    expect(notificationView(record('item_shared', { item_type: 'file' }), now).title).toBe('A file was shared with you');
    expect(notificationView(record('item_shared', { item_type: 'toast' }), now).title).toBe('Something was shared with you');
    expect(notificationView(record('item_shared'), now).title).toBe('Something was shared with you');
  });

  it('ignores parameters of the wrong type', () => {
    const view = notificationView(record('data_deleted', { files: 'many', deleted_bytes: -4 }), now);
    expect(view.body).toBe('Files were deleted so your Drive fits your plan. Everything else is untouched.');
  });

  it('tells an ended plan from a smaller one', () => {
    const ended = notificationView(record('grace_started', { plan: 'premium_1', reason: 'ended', grace_ends_at: '2026-10-17T12:00:00Z' }), now);
    expect(ended.title).toBe('Premium 1 has ended');
    expect(ended.body).toContain('free plan');

    expect(notificationView(record('grace_started', { reason: 'ended' }), now).title).toBe('Your plan has ended');

    const smaller = notificationView(record('grace_started', { plan: 'premium_1', reason: 'smaller_plan' }), now);
    expect(smaller.title).toBe('Your Drive is larger than Premium 1 allows');
    expect(smaller.body).toContain('in 14 days');
    expect(smaller.body).not.toContain('free plan');
  });

  it('writes the global kinds without any per-account parameter', () => {
    expect(notificationView(record('announcement'), now).title).toBe('News from Zekke');
    const maintenance = notificationView(record('maintenance', { starts_at: '2026-10-30T02:00:00Z' }), now);
    expect(maintenance.tone).toBe('warning');
    expect(maintenance.body).toContain('around');
    expect(notificationView(record('maintenance'), now).body).not.toContain('around');
    expect(notificationView(record('terms_changed'), now).body).toBe('We updated the terms of service.');
    expect(notificationView(record('terms_changed', { effective_at: '2026-11-15T00:00:00Z' }), now).body).toContain('apply from');
  });

  it('shows the text of an announcement and of a reply as plain text', () => {
    const announcement = notificationView(record('announcement', { title: 'Calendar is here', body: 'Turn it on in Settings.' }), now);
    expect(announcement.title).toBe('Calendar is here');
    expect(announcement.body).toBe('Turn it on in Settings.');
    expect(notificationView(record('announcement', { title: 1, body: '  ' }), now).title).toBe('News from Zekke');

    const reply = notificationView(record('feedback_replied', { reply: '<b>Fixed</b> in 1.4' }), now);
    expect(reply.title).toBe('We replied to your feedback');
    expect(reply.body).toBe('<b>Fixed</b> in 1.4');
    expect(notificationView(record('feedback_replied'), now).body).toContain('answered your message');
  });

  it('shows something sensible for a kind this version does not know', () => {
    const view = notificationView(record('lottery_won'), now);
    expect(view.title).toBe('Account notice');
    expect(view.tone).toBe('info');
  });

  it('is unread until the API recorded it read', () => {
    expect(notificationView(record('refunded'), now).unread).toBe(true);
    expect(notificationView(record('refunded', {}, { read_at: '2026-10-03T11:31:00Z' }), now).unread).toBe(false);
  });
});

describe('helpers', () => {
  it('names plans, and falls back to the code', () => {
    expect(planName('premium_1')).toBe('Premium 1');
    expect(planName('enterprise')).toBe('enterprise');
    expect(planName(undefined)).toBe('your plan');
  });

  it('says how long ago', () => {
    expect(notificationAge('2026-10-03T11:59:40Z', now)).toBe('Just now');
    expect(notificationAge('2026-10-03T11:30:00Z', now)).toBe('30 min ago');
    expect(notificationAge('2026-10-03T07:00:00Z', now)).toBe('5 h ago');
    expect(notificationAge('2026-10-02T11:00:00Z', now)).toBe('Yesterday');
    expect(notificationAge('2026-09-30T11:00:00Z', now)).toBe('3 days ago');
    expect(notificationAge('2026-09-01T11:00:00Z', now)).toContain('2026');
    expect(notificationAge('garbage', now)).toBe('');
  });

  it('lists what is unread, and labels the bell', () => {
    expect(unreadIds([record('refunded'), record('refunded', {}, { id: 'n2', read_at: 'x' })])).toEqual(['n1']);
    expect(NOTIFICATIONS_COPY.unreadLabel(0)).toBe('Notifications');
    expect(NOTIFICATIONS_COPY.unreadLabel(3)).toBe('Notifications, 3 unread');
    expect(NOTIFICATIONS_COPY.badge(250)).toBe('99+');
  });
});
