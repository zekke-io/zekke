import { addDays, dateFromDayNumber, dayNumber, daysInMonth, parseDate, weekdayOf } from './time';

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface WeekdayPosition {
  weekday: number;
  position: number;
}

export interface Recurrence {
  frequency: Frequency;
  interval: number;
  weekdays?: number[];
  monthDay?: number;
  weekdayPosition?: WeekdayPosition;
  count?: number;
  until?: string;
}

export const MAX_INTERVAL = 999;
export const MAX_COUNT = 5000;
export const MAX_SCAN_STEPS = 40_000;

const FREQUENCIES: readonly Frequency[] = ['daily', 'weekly', 'monthly', 'yearly'];

function isInteger(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

export function parseRecurrence(value: unknown): Recurrence | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (!FREQUENCIES.includes(record.frequency as Frequency) || !isInteger(record.interval, 1, MAX_INTERVAL)) {
    return undefined;
  }
  const rule: Recurrence = { frequency: record.frequency as Frequency, interval: record.interval };
  if (record.weekdays !== undefined) {
    if (!Array.isArray(record.weekdays) || !record.weekdays.every((day) => isInteger(day, 0, 6))) {
      return undefined;
    }
    rule.weekdays = [...new Set(record.weekdays as number[])].sort((a, b) => a - b);
  }
  if (record.monthDay !== undefined) {
    if (!isInteger(record.monthDay, 1, 31)) {
      return undefined;
    }
    rule.monthDay = record.monthDay;
  }
  if (record.weekdayPosition !== undefined) {
    const position = record.weekdayPosition as Record<string, unknown> | null;
    if (typeof position !== 'object' || position === null) {
      return undefined;
    }
    const validPosition = position.position === -1 || isInteger(position.position, 1, 4);
    if (!isInteger(position.weekday, 0, 6) || !validPosition) {
      return undefined;
    }
    rule.weekdayPosition = { weekday: position.weekday as number, position: position.position as number };
  }
  if (record.count !== undefined) {
    if (!isInteger(record.count, 1, MAX_COUNT)) {
      return undefined;
    }
    rule.count = record.count;
  }
  if (record.until !== undefined) {
    if (typeof record.until !== 'string' || parseDate(record.until) === undefined) {
      return undefined;
    }
    rule.until = record.until;
  }
  if (rule.count !== undefined && rule.until !== undefined) {
    return undefined;
  }
  if (rule.monthDay !== undefined && rule.weekdayPosition !== undefined) {
    return undefined;
  }
  return rule;
}

function weekdayInMonth(year: number, month: number, target: WeekdayPosition): string | undefined {
  const length = daysInMonth(year, month);
  const first = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`;
  if (target.position > 0) {
    const offset = (target.weekday - weekdayOf(first) + 7) % 7;
    const day = 1 + offset + (target.position - 1) * 7;
    return day <= length ? addDays(first, day - 1) : undefined;
  }
  const last = addDays(first, length - 1);
  const back = (weekdayOf(last) - target.weekday + 7) % 7;
  return addDays(last, -back);
}

function monthlyDates(rule: Recurrence, start: string, index: number): string[] {
  const origin = parseDate(start)!;
  const total = origin.year * 12 + (origin.month - 1) + index * rule.interval;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  if (rule.weekdayPosition !== undefined) {
    const date = weekdayInMonth(year, month, rule.weekdayPosition);
    return date === undefined ? [] : [date];
  }
  const day = rule.monthDay ?? origin.day;
  if (day > daysInMonth(year, month)) {
    return [];
  }
  return [`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`];
}

function yearlyDates(rule: Recurrence, start: string, index: number): string[] {
  const origin = parseDate(start)!;
  const year = origin.year + index * rule.interval;
  if (origin.day > daysInMonth(year, origin.month)) {
    return [];
  }
  return [`${String(year).padStart(4, '0')}-${String(origin.month).padStart(2, '0')}-${String(origin.day).padStart(2, '0')}`];
}

function weeklyDates(rule: Recurrence, start: string, index: number): string[] {
  const days = rule.weekdays !== undefined && rule.weekdays.length > 0 ? rule.weekdays : [weekdayOf(start)];
  const sinceMonday = (weekdayOf(start) + 6) % 7;
  const weekStart = dayNumber(start) - sinceMonday + index * rule.interval * 7;
  return days
    .map((weekday) => (weekday + 6) % 7)
    .sort((a, b) => a - b)
    .map((offset) => dateFromDayNumber(weekStart + offset));
}

function periodDates(rule: Recurrence, start: string, index: number): string[] {
  switch (rule.frequency) {
    case 'daily':
      return [addDays(start, index * rule.interval)];
    case 'weekly':
      return weeklyDates(rule, start, index);
    case 'monthly':
      return monthlyDates(rule, start, index);
    case 'yearly':
      return yearlyDates(rule, start, index);
  }
}

export function occurrenceDates(rule: Recurrence | undefined, start: string, from: string, to: string): string[] {
  if (from > to) {
    return [];
  }
  if (rule === undefined) {
    return start >= from && start <= to ? [start] : [];
  }
  const found: string[] = [];
  let emitted = 0;
  for (let index = 0; index < MAX_SCAN_STEPS; index += 1) {
    const dates = periodDates(rule, start, index);
    for (const date of dates) {
      if (date < start) {
        continue;
      }
      if (rule.until !== undefined && date > rule.until) {
        return found;
      }
      if (date > to) {
        return found;
      }
      emitted += 1;
      if (date >= from) {
        found.push(date);
      }
      if (rule.count !== undefined && emitted >= rule.count) {
        return found;
      }
    }
    if (dates.length > 0 && dates[dates.length - 1] > to && dates[0] > to) {
      return found;
    }
  }
  return found;
}
