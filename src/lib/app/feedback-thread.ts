import { regionalDate, regionalTime } from '@/lib/regional';
import type { FeedbackAuthor, FeedbackThread } from '@/lib/feedback';

export const FEEDBACK_THREAD_COPY = {
  title: 'Feedback',
  subtitle: 'Your message and the answers from the Zekke team',
  back: 'Back',
  you: 'You',
  team: 'Zekke team',
  replyLabel: 'Your reply',
  replyPlaceholder: 'Write a reply',
  privacy: 'The Zekke team reads feedback. Do not write passwords or your phrase here.',
  send: 'Send reply',
  sending: 'Sending…',
  loading: 'Loading…',
  failed: 'This feedback could not be loaded. Try again in a moment.',
  noReplies: 'No replies yet',
} as const;

export const FEEDBACK_TITLE_MAX_CHARACTERS = 60;

const DAY = 24 * 60 * 60 * 1000;

export interface ThreadMessage {
  id: string;
  author: FeedbackAuthor;
  name: string;
  initial: string;
  message: string;
  when: string;
}

export function feedbackTitle(message: string): string {
  const first = message
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (first === undefined) {
    return FEEDBACK_THREAD_COPY.title;
  }

  const characters = Array.from(first);
  return characters.length <= FEEDBACK_TITLE_MAX_CHARACTERS
    ? first
    : `${characters.slice(0, FEEDBACK_TITLE_MAX_CHARACTERS).join('').trimEnd()}…`;
}

export function repliesLabel(count: number): string {
  return count === 0 ? FEEDBACK_THREAD_COPY.noReplies : count === 1 ? '1 reply' : `${count} replies`;
}

function daysBetween(moment: Date, now: Date): number {
  const start = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((start(now) - start(moment)) / DAY);
}

function dayName(moment: Date, now: Date): string {
  const days = daysBetween(moment, now);
  if (days === 0) {
    return 'Today';
  }
  if (days === 1) {
    return 'Yesterday';
  }
  return regionalDate(moment);
}

export function threadWhen(at: string, now: Date = new Date()): string {
  const moment = new Date(at);
  if (Number.isNaN(moment.getTime())) {
    return '';
  }
  return `${dayName(moment, now)}, ${regionalTime(moment)}`;
}

export function sentLabel(at: string, now: Date = new Date()): string {
  const moment = new Date(at);
  if (Number.isNaN(moment.getTime())) {
    return '';
  }
  const day = dayName(moment, now);
  return `Sent ${day === 'Today' || day === 'Yesterday' ? day.toLowerCase() : day}`;
}

export function threadMessages(thread: FeedbackThread, username: string | undefined, now: Date = new Date()): ThreadMessage[] {
  const initial = Array.from((username ?? '').trim())[0]?.toUpperCase() ?? FEEDBACK_THREAD_COPY.you.charAt(0);
  const from = (author: FeedbackAuthor) =>
    author === 'user'
      ? { name: FEEDBACK_THREAD_COPY.you, initial }
      : { name: FEEDBACK_THREAD_COPY.team, initial: 'Z' };

  return [
    { id: thread.id, author: 'user' as const, message: thread.message, at: thread.createdAt },
    ...thread.replies.map((reply) => ({ id: reply.id, author: reply.author, message: reply.message, at: reply.createdAt })),
  ].map((entry) => ({
    id: entry.id,
    author: entry.author,
    ...from(entry.author),
    message: entry.message,
    when: threadWhen(entry.at, now),
  }));
}
