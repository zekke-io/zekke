import { parseRecurrence, occurrenceDates, type Recurrence } from './recurrence';
import { addDays, dayNumber, isAllDay, momentDate, momentInstant, parseMoment, withDate, type MomentSpec } from './time';

export const EVENT_PAYLOAD_VERSION = 1;
export const MAX_TITLE_CHARACTERS = 300;
export const MAX_NOTES_CHARACTERS = 10_000;
export const MAX_LOCATION_CHARACTERS = 500;
export const MAX_REMINDERS = 5;
export const MAX_REMINDER_MINUTES = 60 * 24 * 28;
export const MAX_OVERRIDES = 200;
export const MAX_PAYLOAD_BYTES = 90_000;

export interface OccurrenceOverride {
  cancelled?: true;
  title?: string;
  notes?: string;
  location?: string;
  start?: MomentSpec;
  end?: MomentSpec;
}

export interface EventInput {
  title: string;
  notes?: string;
  location?: string;
  start: MomentSpec;
  end: MomentSpec;
  recurrence?: Recurrence;
  overrides?: Record<string, OccurrenceOverride>;
  reminders?: number[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  notes: string;
  location: string;
  start: MomentSpec;
  end: MomentSpec;
  recurrence?: Recurrence;
  overrides: Record<string, OccurrenceOverride>;
  reminders: number[];
}

export interface Occurrence {
  eventId: string;
  originalDate: string;
  title: string;
  notes: string;
  location: string;
  start: MomentSpec;
  end: MomentSpec;
  allDay: boolean;
  startMs: number;
  endMs: number;
  recurring: boolean;
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function text(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.slice(0, limit) : '';
}

export function parseReminders(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const minutes = value.filter(
    (entry): entry is number => typeof entry === 'number' && Number.isInteger(entry) && entry >= 0 && entry <= MAX_REMINDER_MINUTES,
  );
  return [...new Set(minutes)].sort((a, b) => a - b).slice(0, MAX_REMINDERS);
}

function parseOverride(value: unknown): OccurrenceOverride | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const override: OccurrenceOverride = {};
  if (record.cancelled === true) {
    override.cancelled = true;
  }
  if (typeof record.title === 'string') {
    override.title = record.title.slice(0, MAX_TITLE_CHARACTERS);
  }
  if (typeof record.notes === 'string') {
    override.notes = record.notes.slice(0, MAX_NOTES_CHARACTERS);
  }
  if (typeof record.location === 'string') {
    override.location = record.location.slice(0, MAX_LOCATION_CHARACTERS);
  }
  const start = parseMoment(record.start);
  const end = parseMoment(record.end);
  if (start !== undefined && end !== undefined) {
    override.start = start;
    override.end = end;
  }
  return override;
}

export function validateEventInput(input: EventInput): void {
  if (parseMoment(input.start) === undefined || parseMoment(input.end) === undefined) {
    throw new RangeError('The start and the end must be real dates, and times need a known time zone');
  }
  if (isAllDay(input.start) !== isAllDay(input.end)) {
    throw new RangeError('An event starts and ends the same way: both all day or both timed');
  }
  if (isAllDay(input.start)) {
    if (momentDate(input.end) <= momentDate(input.start)) {
      throw new RangeError('An all-day event ends after the day it starts');
    }
  } else if (momentInstant(input.end, 'UTC') < momentInstant(input.start, 'UTC')) {
    throw new RangeError('An event cannot end before it starts');
  }
  if (input.recurrence !== undefined && parseRecurrence(input.recurrence) === undefined) {
    throw new RangeError('The recurrence is not one Zekke supports');
  }
  for (const [date, override] of Object.entries(input.overrides ?? {})) {
    if (!DATE_KEY.test(date)) {
      throw new RangeError('An override is keyed by a date');
    }
    if (override.start !== undefined || override.end !== undefined) {
      if (parseMoment(override.start) === undefined || parseMoment(override.end) === undefined) {
        throw new RangeError('A moved occurrence needs a valid start and end');
      }
    }
  }
  if (Object.keys(input.overrides ?? {}).length > MAX_OVERRIDES) {
    throw new RangeError('Too many changed occurrences');
  }
}

export function requirePayloadFits(payload: unknown): void {
  const bytes = new TextEncoder().encode(JSON.stringify(payload)).length;
  if (bytes > MAX_PAYLOAD_BYTES) {
    throw new RangeError(`This is too large to save: ${bytes} bytes, at most ${MAX_PAYLOAD_BYTES}`);
  }
}

export function eventPayload(input: EventInput): Record<string, unknown> {
  validateEventInput(input);
  const payload: Record<string, unknown> = {
    version: EVENT_PAYLOAD_VERSION,
    type: 'event',
    title: input.title.slice(0, MAX_TITLE_CHARACTERS),
    notes: (input.notes ?? '').slice(0, MAX_NOTES_CHARACTERS),
    location: (input.location ?? '').slice(0, MAX_LOCATION_CHARACTERS),
    start: input.start,
    end: input.end,
    overrides: input.overrides ?? {},
    reminders: parseReminders(input.reminders ?? []),
  };
  if (input.recurrence !== undefined) {
    payload.recurrence = input.recurrence;
  }
  requirePayloadFits(payload);
  return payload;
}

export function parseEvent(id: string, value: unknown): CalendarEvent | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (record.version !== EVENT_PAYLOAD_VERSION || record.type !== 'event') {
    return undefined;
  }
  const start = parseMoment(record.start);
  const end = parseMoment(record.end);
  if (start === undefined || end === undefined || isAllDay(start) !== isAllDay(end)) {
    return undefined;
  }
  const recurrence = record.recurrence === undefined ? undefined : parseRecurrence(record.recurrence);
  if (record.recurrence !== undefined && recurrence === undefined) {
    return undefined;
  }
  const overrides: Record<string, OccurrenceOverride> = {};
  if (typeof record.overrides === 'object' && record.overrides !== null) {
    for (const [date, value] of Object.entries(record.overrides).slice(0, MAX_OVERRIDES)) {
      const override = parseOverride(value);
      if (override !== undefined && DATE_KEY.test(date)) {
        overrides[date] = override;
      }
    }
  }
  return {
    id,
    title: text(record.title, MAX_TITLE_CHARACTERS),
    notes: text(record.notes, MAX_NOTES_CHARACTERS),
    location: text(record.location, MAX_LOCATION_CHARACTERS),
    start,
    end,
    recurrence,
    overrides,
    reminders: parseReminders(record.reminders),
  };
}

function spanDays(event: CalendarEvent): number {
  return dayNumber(momentDate(event.end)) - dayNumber(momentDate(event.start));
}

export function expandEvents(events: readonly CalendarEvent[], from: string, to: string, fallbackTz: string): Occurrence[] {
  const found: Occurrence[] = [];
  for (const event of events) {
    const startDate = momentDate(event.start);
    const span = spanDays(event);
    const searchFrom = addDays(from, -Math.max(span, 0));
    const dates = occurrenceDates(event.recurrence, startDate, searchFrom, to);
    for (const originalDate of dates) {
      const override = event.overrides[originalDate];
      if (override?.cancelled === true) {
        continue;
      }
      const start = override?.start ?? withDate(event.start, originalDate);
      const end = override?.end ?? withDate(event.end, addDays(originalDate, span));
      const lastDay = isAllDay(end) ? addDays(momentDate(end), -1) : momentDate(end);
      if (momentDate(start) > to || lastDay < from) {
        continue;
      }
      found.push({
        eventId: event.id,
        originalDate,
        title: override?.title ?? event.title,
        notes: override?.notes ?? event.notes,
        location: override?.location ?? event.location,
        start,
        end,
        allDay: isAllDay(start),
        startMs: momentInstant(start, fallbackTz),
        endMs: momentInstant(end, fallbackTz),
        recurring: event.recurrence !== undefined,
      });
    }
  }
  return found.sort((a, b) => a.startMs - b.startMs || a.eventId.localeCompare(b.eventId));
}
