import { expandEvents, type CalendarEvent } from './events';
import { addDays, momentDate, reminderAnchor } from './time';
import type { Task } from './tasks';

export const REMINDER_WINDOW_DAYS = 14;
export const MAX_SCHEDULED_REMINDERS = 60;

export type ReminderKind = 'event' | 'task';

export interface ScheduledReminder {
  key: string;
  kind: ReminderKind;
  fireAtMs: number;
}

export const REMINDER_TITLE = 'Zekke';

export const REMINDER_TEXT: Record<ReminderKind, string> = {
  event: 'You have an event',
  task: 'A task is due',
};

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

export function planReminders(
  events: readonly CalendarEvent[],
  tasks: readonly Task[],
  nowMs: number,
  fallbackTz: string,
  windowDays: number = REMINDER_WINDOW_DAYS,
  limit: number = MAX_SCHEDULED_REMINDERS,
): ScheduledReminder[] {
  const horizonMs = nowMs + windowDays * MS_PER_DAY;
  const today = new Date(nowMs).toISOString().slice(0, 10);
  const planned: ScheduledReminder[] = [];

  const from = addDays(today, -1);
  const to = addDays(today, windowDays + 1);
  for (const occurrence of expandEvents(events, from, to, fallbackTz)) {
    const event = events.find((candidate) => candidate.id === occurrence.eventId);
    const anchor = reminderAnchor(occurrence.start, fallbackTz);
    for (const minutes of event?.reminders ?? []) {
      const fireAtMs = anchor - minutes * MS_PER_MINUTE;
      if (fireAtMs > nowMs && fireAtMs <= horizonMs) {
        planned.push({ key: `event:${occurrence.eventId}:${occurrence.originalDate}:${minutes}`, kind: 'event', fireAtMs });
      }
    }
  }

  for (const task of tasks) {
    if (task.due === undefined || task.doneAt !== undefined) {
      continue;
    }
    const anchor = reminderAnchor(task.due, fallbackTz);
    for (const minutes of task.reminders) {
      const fireAtMs = anchor - minutes * MS_PER_MINUTE;
      if (fireAtMs > nowMs && fireAtMs <= horizonMs) {
        planned.push({ key: `task:${task.id}:${momentDate(task.due)}:${minutes}`, kind: 'task', fireAtMs });
      }
    }
  }

  return planned.sort((a, b) => a.fireAtMs - b.fireAtMs || a.key.localeCompare(b.key)).slice(0, limit);
}
