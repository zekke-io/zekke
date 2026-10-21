import type { CalendarEvent, EventInput, Occurrence } from './events';
import { MAX_NOTES_CHARACTERS, MAX_TITLE_CHARACTERS } from './events';
import type { Recurrence } from './recurrence';
import {
  addDays,
  dayNumber,
  instantOf,
  isAllDay,
  isValidTimeZone,
  momentDate,
  parseDate,
  weekdayOf,
  withDate,
  type MomentSpec,
} from './time';

export type RepeatChoice = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export const REPEAT_CHOICES: readonly { value: RepeatChoice; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
  { value: 'yearly', label: 'Every year' },
];

export const REMINDER_CHOICES: readonly { value: number | null; label: string }[] = [
  { value: null, label: 'No reminder' },
  { value: 0, label: 'At the time of the event' },
  { value: 5, label: '5 minutes before' },
  { value: 10, label: '10 minutes before' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
];

export const DEFAULT_REMINDER = 30;

export interface EventForm {
  title: string;
  notes: string;
  allDay: boolean;
  date: string;
  startTime: string;
  endTime: string;
  repeat: RepeatChoice;
  reminder: number | null;
}

export type FormProblem = 'title' | 'date' | 'time' | 'order' | 'zone' | 'length';

export class EventFormError extends Error {
  readonly problem: FormProblem;

  constructor(problem: FormProblem, message: string) {
    super(message);
    this.name = 'EventFormError';
    this.problem = problem;
  }
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function clock(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function blankEventForm(date: string, now: Date): EventForm {
  const start = new Date(now.getTime());
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const startHour = start.getHours();
  return {
    title: '',
    notes: '',
    allDay: false,
    date,
    startTime: clock(startHour, 0),
    endTime: clock((startHour + 1) % 24, 0),
    repeat: 'none',
    reminder: DEFAULT_REMINDER,
  };
}

export function repeatChoiceOf(recurrence: Recurrence | undefined): RepeatChoice {
  return recurrence === undefined ? 'none' : recurrence.frequency;
}

export function recurrenceFor(choice: RepeatChoice, date: string): Recurrence | undefined {
  switch (choice) {
    case 'none':
      return undefined;
    case 'weekly':
      return { frequency: 'weekly', interval: 1, weekdays: [weekdayOf(date)] };
    case 'monthly':
      return { frequency: 'monthly', interval: 1, monthDay: Number(date.slice(8, 10)) };
    default:
      return { frequency: choice, interval: 1 };
  }
}

export function eventToForm(source: { title: string; notes: string; start: MomentSpec; end: MomentSpec; recurrence?: Recurrence; reminders: readonly number[] }): EventForm {
  const allDay = isAllDay(source.start);
  const clockOf = (moment: MomentSpec) => (isAllDay(moment) ? '' : moment.dateTime.slice(11, 16));
  return {
    title: source.title,
    notes: source.notes,
    allDay,
    date: momentDate(source.start),
    startTime: allDay ? '09:00' : clockOf(source.start),
    endTime: allDay ? '10:00' : clockOf(source.end),
    repeat: repeatChoiceOf(source.recurrence),
    reminder: source.reminders.length === 0 ? null : source.reminders[0],
  };
}

export function formToInput(form: EventForm, timeZone: string, previous?: { recurrence?: Recurrence; overrides?: EventInput['overrides']; location?: string }): EventInput {
  const title = form.title.trim();
  if (title === '') {
    throw new EventFormError('title', 'Give the event a title.');
  }
  if (Array.from(title).length > MAX_TITLE_CHARACTERS) {
    throw new EventFormError('length', `A title is at most ${MAX_TITLE_CHARACTERS} characters.`);
  }
  if (Array.from(form.notes).length > MAX_NOTES_CHARACTERS) {
    throw new EventFormError('length', `Notes are at most ${MAX_NOTES_CHARACTERS} characters.`);
  }
  if (parseDate(form.date) === undefined) {
    throw new EventFormError('date', 'Choose a date.');
  }
  if (!isValidTimeZone(timeZone)) {
    throw new EventFormError('zone', 'This device’s time zone is not known.');
  }

  let start: MomentSpec;
  let end: MomentSpec;
  if (form.allDay) {
    start = { date: form.date };
    end = { date: addDays(form.date, 1) };
  } else {
    if (!TIME_PATTERN.test(form.startTime) || !TIME_PATTERN.test(form.endTime)) {
      throw new EventFormError('time', 'Choose a start and an end time.');
    }
    start = { dateTime: `${form.date}T${form.startTime}`, tz: timeZone };
    end = { dateTime: `${form.date}T${form.endTime}`, tz: timeZone };
    if (instantOf(end.dateTime, timeZone) < instantOf(start.dateTime, timeZone)) {
      throw new EventFormError('order', 'An event cannot end before it starts.');
    }
  }

  const recurrence =
    form.repeat === 'none' ? undefined : sameRepeat(form.repeat, previous?.recurrence) ?? recurrenceFor(form.repeat, form.date);
  return {
    title,
    notes: form.notes,
    location: previous?.location ?? '',
    start,
    end,
    recurrence,
    overrides: previous?.overrides ?? {},
    reminders: form.reminder === null ? [] : [form.reminder],
  };
}

function sameRepeat(choice: RepeatChoice, previous: Recurrence | undefined): Recurrence | undefined {
  return previous !== undefined && previous.frequency === choice ? previous : undefined;
}

export function inputOf(event: CalendarEvent): EventInput {
  return {
    title: event.title,
    notes: event.notes,
    location: event.location,
    start: event.start,
    end: event.end,
    recurrence: event.recurrence,
    overrides: event.overrides,
    reminders: event.reminders,
  };
}

export type RecurringScope = 'this' | 'all';

function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

function shiftRecurrence(rule: Recurrence, delta: number, seriesDate: string): Recurrence {
  if (delta === 0) {
    return rule;
  }
  const shifted: Recurrence = { ...rule };
  if (rule.weekdays !== undefined) {
    shifted.weekdays = rule.weekdays.map((day) => (((day + delta) % 7) + 7) % 7).sort((a, b) => a - b);
  }
  if (rule.monthDay !== undefined) {
    shifted.monthDay = Number(seriesDate.slice(8, 10));
  }
  if (rule.weekdayPosition !== undefined) {
    shifted.weekdayPosition = { ...rule.weekdayPosition, weekday: (((rule.weekdayPosition.weekday + delta) % 7) + 7) % 7 };
  }
  return shifted;
}

export function editSeries(event: CalendarEvent, originalDate: string, edited: EventInput): EventInput {
  const delta = daysBetween(originalDate, momentDate(edited.start));
  const seriesDate = addDays(momentDate(event.start), delta);
  const span = daysBetween(momentDate(edited.start), momentDate(edited.end));
  const start = withDate(edited.start, seriesDate);
  const end = withDate(edited.end, addDays(seriesDate, span));
  const recurrence =
    edited.recurrence === undefined
      ? undefined
      : edited.recurrence.frequency === event.recurrence?.frequency
        ? shiftRecurrence(edited.recurrence, delta, seriesDate)
        : recurrenceFor(edited.recurrence.frequency, seriesDate);
  return { ...edited, start, end, recurrence, overrides: delta === 0 ? event.overrides : {} };
}

export function editOccurrence(event: CalendarEvent, originalDate: string, edited: EventInput): EventInput {
  return {
    ...inputOf(event),
    overrides: {
      ...event.overrides,
      [originalDate]: {
        title: edited.title,
        notes: edited.notes,
        location: edited.location ?? '',
        start: edited.start,
        end: edited.end,
      },
    },
  };
}

export function cancelOccurrence(event: CalendarEvent, originalDate: string): EventInput {
  return { ...inputOf(event), overrides: { ...event.overrides, [originalDate]: { cancelled: true } } };
}

export function formForOccurrence(occurrence: Occurrence, event: CalendarEvent): EventForm {
  return eventToForm({
    title: occurrence.title,
    notes: occurrence.notes,
    start: occurrence.start,
    end: occurrence.end,
    recurrence: event.recurrence,
    reminders: event.reminders,
  });
}
