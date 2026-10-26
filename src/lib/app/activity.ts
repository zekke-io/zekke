import { isCanonicalUuid } from '@/lib/api';
import { isKnownKind, type NotificationKind, type NotificationRecord } from '@/lib/notifications';
import { notificationAge } from './notifications';
import { feedbackTitle, repliesLabel } from './feedback-thread';
import type { FeedbackSummary } from '@/lib/feedback';

export const ACTIVITY_COPY = {
  title: 'Activity',
  tabsLabel: 'Show',
  notifications: 'Notifications',
  recent: 'Recent',
  feedback: 'Feedback',
  emptyNotifications:
    'Nothing new. Invitations, shared items and notices about your plan and storage appear here.',
  emptyRecent: 'Nothing yet. The notes, passwords, secrets and documents you change appear here.',
  failedNotifications: 'Notifications could not be loaded. Try again in a moment.',
  emptyFeedback: 'Nothing sent yet. What you tell the Zekke team, and what they answer, appears here as one conversation.',
  failedFeedback: 'Your feedback could not be loaded. Try again in a moment.',
  failedRecent: 'Recent items could not be loaded. Try again in a moment.',
  loadMore: 'Show older',
  loading: 'Loading…',
  open: 'Activity',
  unreadLabel: (count: number) =>
    count === 0 ? 'Activity' : count === 1 ? 'Activity, 1 unread' : `Activity, ${count} unread`,
} as const;

export const NOTIFICATIONS_WATCH_MS = 10_000;

export type ActivityTabId = 'notifications' | 'feedback' | 'recent';

export type NotificationIconId = 'card' | 'alert' | 'trash' | 'sharing' | 'chat' | 'info';

export type NotificationTarget = 'plan' | 'shared' | 'drive';

export interface NotificationAction {
  label: string;
  target: NotificationTarget;
}

const ICONS: Record<NotificationKind, NotificationIconId> = {
  purchase_succeeded: 'card',
  subscription_renewed: 'card',
  payment_failed: 'alert',
  refunded: 'card',
  expiring: 'alert',
  grace_started: 'alert',
  data_loss_countdown: 'alert',
  data_deleted: 'trash',
  connection_invited: 'sharing',
  item_shared: 'sharing',
  announcement: 'info',
  maintenance: 'alert',
  terms_changed: 'info',
  feedback_replied: 'chat',
};

const ACTIONS: Partial<Record<NotificationKind, NotificationAction>> = {
  payment_failed: { label: 'See plans', target: 'plan' },
  expiring: { label: 'See plans', target: 'plan' },
  grace_started: { label: 'See plans', target: 'plan' },
  data_loss_countdown: { label: 'See plans', target: 'plan' },
  data_deleted: { label: 'Open Drive', target: 'drive' },
  connection_invited: { label: 'Open Shared', target: 'shared' },
  item_shared: { label: 'Open Shared', target: 'shared' },
};

export function notificationIcon(kind: string): NotificationIconId {
  return isKnownKind(kind) ? ICONS[kind] : 'info';
}

export function notificationAction(kind: string): NotificationAction | undefined {
  return isKnownKind(kind) ? ACTIONS[kind] : undefined;
}

export function feedbackOpenedBy(record: Pick<NotificationRecord, 'kind' | 'params'>): string | undefined {
  const id = record.params.feedback_id;
  return record.kind === 'feedback_replied' && typeof id === 'string' && isCanonicalUuid(id) ? id : undefined;
}

export function inNotificationsTab<T extends Pick<NotificationRecord, 'kind' | 'params'>>(records: readonly T[]): T[] {
  return records.filter((record) => feedbackOpenedBy(record) === undefined);
}

export function unreadAtLoad(records: readonly Pick<NotificationRecord, 'kind' | 'params' | 'read_at'>[]): number {
  return inNotificationsTab(records).filter((record) => record.read_at === undefined).length;
}

export function unreadByFeedback(records: readonly NotificationRecord[]): Map<string, string[]> {
  const unread = new Map<string, string[]>();
  for (const record of records) {
    const feedback = feedbackOpenedBy(record);
    if (feedback !== undefined && record.read_at === undefined) {
      unread.set(feedback, [...(unread.get(feedback) ?? []), record.id]);
    }
  }
  return unread;
}

export const FEEDBACK_PREVIEW_MAX_CHARACTERS = 90;

export interface FeedbackItem {
  id: string;
  title: string;
  preview: string;
  replies: string;
  when: string;
  unread: boolean;
}

function singleLine(text: string): string {
  const characters = Array.from(text.replace(/\s+/g, ' ').trim());
  return characters.length <= FEEDBACK_PREVIEW_MAX_CHARACTERS
    ? characters.join('')
    : `${characters.slice(0, FEEDBACK_PREVIEW_MAX_CHARACTERS).join('').trimEnd()}…`;
}

export function feedbackItems(
  feedback: readonly FeedbackSummary[],
  unread: ReadonlyMap<string, readonly string[]>,
  now: Date = new Date(),
): FeedbackItem[] {
  return feedback.map((item) => ({
    id: item.id,
    title: feedbackTitle(item.message),
    preview: `${item.lastAuthor === 'team' ? 'Zekke team' : 'You'}: ${singleLine(item.lastMessage)}`,
    replies: repliesLabel(item.replyCount),
    when: notificationAge(item.lastActivityAt, now),
    unread: unread.has(item.id),
  }));
}

export const RECENT_LIMIT = 12;

export type RecentKind = 'note' | 'password' | 'secret' | 'document' | 'spreadsheet';

export const RECENT_LABELS: Record<RecentKind, string> = {
  note: 'Note',
  password: 'Password',
  secret: 'Secret',
  document: 'Document',
  spreadsheet: 'Spreadsheet',
};

export interface RecentCandidate {
  id: string;
  kind: RecentKind;
  title: string;
  updatedAt: string;
}

export interface RecentEntry extends RecentCandidate {
  detail: string;
  when: string;
}

export function recentEntries(
  candidates: readonly RecentCandidate[],
  now: Date = new Date(),
  limit: number = RECENT_LIMIT,
): RecentEntry[] {
  return [...candidates]
    .filter((candidate) => !Number.isNaN(new Date(candidate.updatedAt).getTime()))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id))
    .slice(0, limit)
    .map((candidate) => ({
      ...candidate,
      detail: RECENT_LABELS[candidate.kind],
      when: notificationAge(candidate.updatedAt, now),
    }));
}
