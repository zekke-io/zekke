import type { RegionalPreferences } from '@/lib/regional';
import { formatTimePattern } from '@/lib/regional';
import type { Occurrence } from './events';
import type { Task } from './tasks';
import { addDays, dateFromDayNumber, dayNumber, daysInMonth, isAllDay, momentDate, weekdayOf, type MomentSpec } from './time';

export const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

export interface DayCell {
  date: string;
  inMonth: boolean;
}

export function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

export function monthStart(year: number, month: number): string {
  return `${pad(year, 4)}-${pad(month)}-01`;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

export function monthGrid(year: number, month: number): DayCell[][] {
  const first = monthStart(year, month);
  const offset = weekdayOf(first);
  const length = daysInMonth(year, month);
  const weeks = Math.ceil((offset + length) / 7);
  const start = dayNumber(first) - offset;
  const grid: DayCell[][] = [];
  for (let week = 0; week < weeks; week += 1) {
    const row: DayCell[] = [];
    for (let day = 0; day < 7; day += 1) {
      const date = dateFromDayNumber(start + week * 7 + day);
      row.push({ date, inMonth: date.startsWith(`${pad(year, 4)}-${pad(month)}-`) });
    }
    grid.push(row);
  }
  return grid;
}

export function gridRange(grid: readonly (readonly DayCell[])[]): { from: string; to: string } {
  return { from: grid[0][0].date, to: grid[grid.length - 1][6].date };
}

export function localDate(now: Date): string {
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function monthTitle(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function dayTitle(date: string): string {
  return `${WEEKDAY_NAMES[weekdayOf(date)]}, ${Number(date.slice(8, 10))} ${MONTH_NAMES[Number(date.slice(5, 7)) - 1]}`;
}

export function shortDayTitle(date: string): string {
  return `${WEEKDAY_NAMES[weekdayOf(date)].slice(0, 3)}, ${Number(date.slice(8, 10))} ${MONTH_NAMES[Number(date.slice(5, 7)) - 1].slice(0, 3)}`;
}

export function clockText(moment: MomentSpec, preferences: RegionalPreferences): string {
  if (isAllDay(moment)) {
    return '';
  }
  return formatTimePattern(Number(moment.dateTime.slice(11, 13)), Number(moment.dateTime.slice(14, 16)), preferences.time);
}

export function occurrenceTimes(occurrence: Occurrence, preferences: RegionalPreferences): string {
  if (occurrence.allDay) {
    return 'All day';
  }
  return `${clockText(occurrence.start, preferences)} – ${clockText(occurrence.end, preferences)}`;
}

export function occurrenceDays(occurrence: Occurrence): string[] {
  const first = momentDate(occurrence.start);
  const last = isAllDay(occurrence.end) ? addDays(momentDate(occurrence.end), -1) : momentDate(occurrence.end);
  const days: string[] = [];
  for (let day = first; day <= last && days.length < 62; day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
}

export function daysWithOccurrences(occurrences: readonly Occurrence[]): Set<string> {
  const days = new Set<string>();
  for (const occurrence of occurrences) {
    for (const day of occurrenceDays(occurrence)) {
      days.add(day);
    }
  }
  return days;
}

export function occurrencesOn(occurrences: readonly Occurrence[], date: string): Occurrence[] {
  return occurrences
    .filter((occurrence) => occurrenceDays(occurrence).includes(date))
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.startMs - b.startMs || a.eventId.localeCompare(b.eventId));
}

export type TaskFilter = { kind: 'all' } | { kind: 'today' } | { kind: 'list'; id: string };

export interface TaskSections {
  todo: Task[];
  done: Task[];
}

export function taskDueDate(task: Task): string | undefined {
  return task.due === undefined ? undefined : momentDate(task.due);
}

export function taskMatches(task: Task, filter: TaskFilter, today: string): boolean {
  if (filter.kind === 'all') {
    return true;
  }
  if (filter.kind === 'list') {
    return task.listId === filter.id;
  }
  const due = taskDueDate(task);
  return due !== undefined && due <= today && task.doneAt === undefined;
}

export function taskSections(tasks: readonly Task[], filter: TaskFilter, today: string): TaskSections {
  const matching = tasks.filter((task) => taskMatches(task, filter, today));
  return {
    todo: matching.filter((task) => task.doneAt === undefined),
    done: matching.filter((task) => task.doneAt !== undefined).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)),
  };
}

export function dueLabel(due: string | undefined, today: string, done: boolean): string {
  if (due === undefined) {
    return '';
  }
  if (due === today) {
    return 'Today';
  }
  if (due === addDays(today, 1)) {
    return 'Tomorrow';
  }
  if (due === addDays(today, -1)) {
    return done ? 'Yesterday' : 'Yesterday · overdue';
  }
  const label = shortDayTitle(due);
  return due < today && !done ? `${label} · overdue` : label;
}

export function taskCounts(tasks: readonly Task[]): { todo: number; done: number } {
  const done = tasks.filter((task) => task.doneAt !== undefined).length;
  return { todo: tasks.length - done, done };
}

export function taskCountLabel(tasks: readonly Task[]): string {
  const { todo, done } = taskCounts(tasks);
  return `${todo} to do, ${done} done`;
}
