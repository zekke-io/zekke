import {
  validateEventInput,
  MAX_LOCATION_CHARACTERS,
  MAX_NOTES_CHARACTERS,
  MAX_TITLE_CHARACTERS,
  parseReminders,
  type CalendarEvent,
  type EventInput,
  type OccurrenceOverride,
} from './events';
import { parseRecurrence, type Recurrence } from './recurrence';
import type { Task } from './tasks';
import { addDays, isAllDay, isValidTimeZone, momentDate, parseDate, type MomentSpec } from './time';

export const MAX_ICS_CHARACTERS = 2_000_000;
export const MAX_IMPORTED_ITEMS = 5000;
export const ICS_PRODUCT = '-//Zekke//Calendar//EN';

const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const FOLD_OCTETS = 74;

export interface ImportedEvent extends EventInput {
  overrides: Record<string, OccurrenceOverride>;
}

export interface ImportedTask {
  title: string;
  notes: string;
  due?: MomentSpec;
  reminders: number[];
  done: boolean;
}

export interface SkippedItem {
  summary: string;
  reason: string;
}

export interface IcsImport {
  events: ImportedEvent[];
  tasks: ImportedTask[];
  skipped: SkippedItem[];
}

interface Property {
  name: string;
  params: Record<string, string>;
  value: string;
}

interface Component {
  type: string;
  properties: Property[];
  children: Component[];
}

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\;').replace(/,/g, '\\,');
}

function unescapeText(value: string): string {
  return value.replace(/\\([nN,;\\])/g, (_, char: string) => (char === 'n' || char === 'N' ? '\n' : char));
}

function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const pieces: string[] = [];
  let current = '';
  let octets = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = pieces.length === 0 ? FOLD_OCTETS : FOLD_OCTETS - 1;
    if (octets + size > limit) {
      pieces.push(current);
      current = '';
      octets = 0;
    }
    current += char;
    octets += size;
  }
  pieces.push(current);
  return pieces.join('\r\n ');
}

function compactDate(date: string): string {
  return date.replace(/-/g, '');
}

function compactDateTime(dateTime: string): string {
  return `${dateTime.slice(0, 10).replace(/-/g, '')}T${dateTime.slice(11, 13)}${dateTime.slice(14, 16)}00`;
}

function momentLine(name: string, moment: MomentSpec): string {
  if (isAllDay(moment)) {
    return `${name};VALUE=DATE:${compactDate(moment.date)}`;
  }
  return `${name};TZID=${moment.tz}:${compactDateTime(moment.dateTime)}`;
}

function stamp(nowMs: number): string {
  return `${new Date(nowMs).toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
}

function ruleText(rule: Recurrence, start: string): string {
  const parts = [`FREQ=${rule.frequency.toUpperCase()}`, `INTERVAL=${rule.interval}`];
  if (rule.frequency === 'weekly' && rule.weekdays !== undefined && rule.weekdays.length > 0) {
    parts.push(`BYDAY=${rule.weekdays.map((day) => WEEKDAY_CODES[day]).join(',')}`);
  }
  if (rule.frequency === 'monthly') {
    if (rule.weekdayPosition !== undefined) {
      parts.push(`BYDAY=${rule.weekdayPosition.position}${WEEKDAY_CODES[rule.weekdayPosition.weekday]}`);
    } else {
      parts.push(`BYMONTHDAY=${rule.monthDay ?? Number(start.slice(8, 10))}`);
    }
  }
  if (rule.count !== undefined) {
    parts.push(`COUNT=${rule.count}`);
  }
  if (rule.until !== undefined) {
    parts.push(`UNTIL=${compactDate(rule.until)}`);
  }
  return parts.join(';');
}

function alarmLines(minutes: number): string[] {
  return ['BEGIN:VALARM', `TRIGGER:-PT${minutes}M`, 'ACTION:DISPLAY', 'DESCRIPTION:Reminder', 'END:VALARM'];
}

function textLines(summary: string, notes: string, location: string): string[] {
  const lines = [`SUMMARY:${escapeText(summary)}`];
  if (notes !== '') {
    lines.push(`DESCRIPTION:${escapeText(notes)}`);
  }
  if (location !== '') {
    lines.push(`LOCATION:${escapeText(location)}`);
  }
  return lines;
}

function eventLines(event: CalendarEvent, nowMs: number): string[] {
  const lines = ['BEGIN:VEVENT', `UID:${event.id}@zekke`, `DTSTAMP:${stamp(nowMs)}`];
  lines.push(momentLine('DTSTART', event.start), momentLine('DTEND', event.end));
  lines.push(...textLines(event.title, event.notes, event.location));
  if (event.recurrence !== undefined) {
    lines.push(`RRULE:${ruleText(event.recurrence, momentDate(event.start))}`);
  }
  for (const [date, override] of Object.entries(event.overrides)) {
    if (override.cancelled === true) {
      const original = isAllDay(event.start) ? { date } : { dateTime: `${date}${event.start.dateTime.slice(10)}`, tz: event.start.tz };
      lines.push(momentLine('EXDATE', original));
    }
  }
  for (const minutes of event.reminders) {
    lines.push(...alarmLines(minutes));
  }
  lines.push('END:VEVENT');
  for (const [date, override] of Object.entries(event.overrides)) {
    if (override.cancelled === true) {
      continue;
    }
    const original = isAllDay(event.start) ? { date } : { dateTime: `${date}${event.start.dateTime.slice(10)}`, tz: event.start.tz };
    lines.push('BEGIN:VEVENT', `UID:${event.id}@zekke`, `DTSTAMP:${stamp(nowMs)}`, momentLine('RECURRENCE-ID', original));
    lines.push(momentLine('DTSTART', override.start ?? original), momentLine('DTEND', override.end ?? event.end));
    lines.push(...textLines(override.title ?? event.title, override.notes ?? event.notes, override.location ?? event.location));
    lines.push('END:VEVENT');
  }
  return lines;
}

function taskLines(task: Task, nowMs: number): string[] {
  const lines = ['BEGIN:VTODO', `UID:${task.id}@zekke`, `DTSTAMP:${stamp(nowMs)}`];
  lines.push(...textLines(task.title, task.notes, ''));
  if (task.due !== undefined) {
    lines.push(momentLine('DUE', task.due));
  }
  lines.push(task.doneAt === undefined ? 'STATUS:NEEDS-ACTION' : 'STATUS:COMPLETED');
  if (task.doneAt !== undefined) {
    lines.push(`COMPLETED:${stamp(task.doneAt)}`);
  }
  for (const minutes of task.reminders) {
    lines.push(...alarmLines(minutes));
  }
  lines.push('END:VTODO');
  return lines;
}

export function exportIcs(events: readonly CalendarEvent[], tasks: readonly Task[], nowMs: number): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:${ICS_PRODUCT}`, 'CALSCALE:GREGORIAN'];
  for (const event of events) {
    lines.push(...eventLines(event, nowMs));
  }
  for (const task of tasks) {
    lines.push(...taskLines(task, nowMs));
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

function parseProperty(line: string): Property | undefined {
  let colon = -1;
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') {
      quoted = !quoted;
    } else if (line[index] === ':' && !quoted) {
      colon = index;
      break;
    }
  }
  if (colon < 1) {
    return undefined;
  }
  const [name, ...rawParams] = line.slice(0, colon).split(';');
  const params: Record<string, string> = {};
  for (const raw of rawParams) {
    const equals = raw.indexOf('=');
    if (equals > 0) {
      params[raw.slice(0, equals).toUpperCase()] = raw.slice(equals + 1).replace(/^"|"$/g, '');
    }
  }
  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) };
}

function parseComponents(text: string): Component[] {
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  const roots: Component[] = [];
  const stack: Component[] = [];
  for (const line of lines) {
    if (line === '') {
      continue;
    }
    const property = parseProperty(line);
    if (property === undefined) {
      continue;
    }
    if (property.name === 'BEGIN') {
      const component: Component = { type: property.value.toUpperCase(), properties: [], children: [] };
      (stack[stack.length - 1]?.children ?? roots).push(component);
      stack.push(component);
    } else if (property.name === 'END') {
      stack.pop();
    } else if (stack.length > 0) {
      stack[stack.length - 1].properties.push(property);
    }
  }
  return roots;
}

function firstValue(component: Component, name: string): Property | undefined {
  return component.properties.find((property) => property.name === name);
}

function parseIcsMoment(property: Property | undefined, fallbackTz: string): MomentSpec | undefined {
  if (property === undefined) {
    return undefined;
  }
  const value = property.value.trim();
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (dateOnly !== null) {
    const date = `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;
    return parseDate(date) === undefined ? undefined : { date };
  }
  const full = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z?)$/.exec(value);
  if (full === null) {
    return undefined;
  }
  const date = `${full[1]}-${full[2]}-${full[3]}`;
  if (parseDate(date) === undefined) {
    return undefined;
  }
  const tz = full[7] === 'Z' ? 'UTC' : (property.params.TZID ?? fallbackTz);
  if (!isValidTimeZone(tz)) {
    return undefined;
  }
  return { dateTime: `${date}T${full[4]}:${full[5]}`, tz };
}

function parseTrigger(value: string): number | undefined {
  const match = /^-P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:\d+S)?)?$/.exec(value.trim());
  if (match === null) {
    return undefined;
  }
  const minutes = Number(match[1] ?? 0) * 10080 + Number(match[2] ?? 0) * 1440 + Number(match[3] ?? 0) * 60 + Number(match[4] ?? 0);
  return minutes;
}

function parseAlarms(component: Component): number[] {
  const minutes: number[] = [];
  for (const child of component.children) {
    if (child.type !== 'VALARM') {
      continue;
    }
    const trigger = firstValue(child, 'TRIGGER');
    const parsed = trigger === undefined || trigger.params.RELATED === 'END' ? undefined : parseTrigger(trigger.value);
    if (parsed !== undefined) {
      minutes.push(parsed);
    }
  }
  return parseReminders(minutes);
}

function parseRule(value: string): { rule?: Recurrence; unsupported?: string } {
  const parts = new Map<string, string>();
  for (const part of value.split(';')) {
    const equals = part.indexOf('=');
    if (equals > 0) {
      parts.set(part.slice(0, equals).toUpperCase(), part.slice(equals + 1).toUpperCase());
    }
  }
  const frequency = parts.get('FREQ')?.toLowerCase();
  if (frequency !== 'daily' && frequency !== 'weekly' && frequency !== 'monthly' && frequency !== 'yearly') {
    return { unsupported: `the repeat "${parts.get('FREQ') ?? value}" is not supported` };
  }
  const supported = new Set(['FREQ', 'INTERVAL', 'COUNT', 'UNTIL', 'BYDAY', 'BYMONTHDAY', 'WKST']);
  for (const key of parts.keys()) {
    if (!supported.has(key)) {
      return { unsupported: `the repeat part ${key} is not supported` };
    }
  }
  const candidate: Record<string, unknown> = { frequency, interval: Number(parts.get('INTERVAL') ?? 1) };
  if (parts.has('COUNT')) {
    candidate.count = Number(parts.get('COUNT'));
  }
  if (parts.has('UNTIL')) {
    const until = parseIcsMoment({ name: 'UNTIL', params: {}, value: parts.get('UNTIL')! }, 'UTC');
    if (until === undefined) {
      return { unsupported: 'the repeat end date cannot be read' };
    }
    candidate.until = momentDate(until);
  }
  const byDay = parts.get('BYDAY');
  if (byDay !== undefined) {
    const entries = byDay.split(',').map((entry) => /^(-?\d)?(SU|MO|TU|WE|TH|FR|SA)$/.exec(entry));
    if (entries.some((entry) => entry === null)) {
      return { unsupported: 'the repeat weekdays cannot be read' };
    }
    if (frequency === 'weekly') {
      if (entries.some((entry) => entry![1] !== undefined)) {
        return { unsupported: 'a numbered weekday in a weekly repeat is not supported' };
      }
      candidate.weekdays = entries.map((entry) => WEEKDAY_CODES.indexOf(entry![2]));
    } else if (frequency === 'monthly' && entries.length === 1 && entries[0]![1] !== undefined) {
      candidate.weekdayPosition = { weekday: WEEKDAY_CODES.indexOf(entries[0]![2]), position: Number(entries[0]![1]) };
    } else {
      return { unsupported: 'those repeat weekdays are not supported' };
    }
  }
  const monthDay = parts.get('BYMONTHDAY');
  if (monthDay !== undefined) {
    if (frequency !== 'monthly' || !/^\d{1,2}$/.test(monthDay)) {
      return { unsupported: 'that repeat day of the month is not supported' };
    }
    candidate.monthDay = Number(monthDay);
  }
  const rule = parseRecurrence(candidate);
  if (rule === undefined) {
    return { unsupported: 'the repeat is outside what Zekke supports' };
  }
  return { rule };
}

function clip(value: string | undefined, limit: number): string {
  return value === undefined ? '' : unescapeText(value).slice(0, limit);
}

function unknownZone(property: Property | undefined): string | undefined {
  const zone = property?.params.TZID;
  return zone !== undefined && !/Z$/.test(property!.value.trim()) && !isValidTimeZone(zone) ? zone : undefined;
}

function importEvent(master: Component, siblings: Component[], fallbackTz: string): ImportedEvent | SkippedItem {
  const summary = clip(firstValue(master, 'SUMMARY')?.value, MAX_TITLE_CHARACTERS);
  const start = parseIcsMoment(firstValue(master, 'DTSTART'), fallbackTz);
  if (start === undefined) {
    const zone = unknownZone(firstValue(master, 'DTSTART'));
    return { summary, reason: zone === undefined ? 'it has no readable start' : `its time zone "${zone}" is not supported` };
  }
  if (firstValue(master, 'RDATE') !== undefined) {
    return { summary, reason: 'extra dates (RDATE) are not supported' };
  }
  let end = parseIcsMoment(firstValue(master, 'DTEND'), fallbackTz);
  if (end === undefined) {
    end = isAllDay(start) ? { date: addDays(start.date, 1) } : start;
  }
  if (isAllDay(start) !== isAllDay(end)) {
    return { summary, reason: 'its start and end do not match' };
  }
  const input: ImportedEvent = {
    title: summary,
    notes: clip(firstValue(master, 'DESCRIPTION')?.value, MAX_NOTES_CHARACTERS),
    location: clip(firstValue(master, 'LOCATION')?.value, MAX_LOCATION_CHARACTERS),
    start,
    end,
    reminders: parseAlarms(master),
    overrides: {},
  };
  const rrule = firstValue(master, 'RRULE');
  if (rrule !== undefined) {
    const parsed = parseRule(rrule.value);
    if (parsed.rule === undefined) {
      return { summary, reason: parsed.unsupported ?? 'the repeat is not supported' };
    }
    input.recurrence = parsed.rule;
  }
  for (const property of master.properties.filter((entry) => entry.name === 'EXDATE')) {
    for (const piece of property.value.split(',')) {
      const moment = parseIcsMoment({ ...property, value: piece }, fallbackTz);
      if (moment !== undefined) {
        input.overrides[momentDate(moment)] = { cancelled: true };
      }
    }
  }
  for (const sibling of siblings) {
    const original = parseIcsMoment(firstValue(sibling, 'RECURRENCE-ID'), fallbackTz);
    const moved = parseIcsMoment(firstValue(sibling, 'DTSTART'), fallbackTz);
    const movedEnd = parseIcsMoment(firstValue(sibling, 'DTEND'), fallbackTz);
    if (original === undefined || moved === undefined || movedEnd === undefined || isAllDay(moved) !== isAllDay(movedEnd)) {
      continue;
    }
    input.overrides[momentDate(original)] = {
      title: clip(firstValue(sibling, 'SUMMARY')?.value, MAX_TITLE_CHARACTERS),
      notes: clip(firstValue(sibling, 'DESCRIPTION')?.value, MAX_NOTES_CHARACTERS),
      location: clip(firstValue(sibling, 'LOCATION')?.value, MAX_LOCATION_CHARACTERS),
      start: moved,
      end: movedEnd,
    };
  }
  try {
    validateEventInput(input);
  } catch (error) {
    return { summary, reason: error instanceof Error ? error.message : 'it is not valid' };
  }
  return input;
}

function importTask(component: Component, fallbackTz: string): ImportedTask | SkippedItem {
  const summary = clip(firstValue(component, 'SUMMARY')?.value, MAX_TITLE_CHARACTERS);
  const dueProperty = firstValue(component, 'DUE') ?? firstValue(component, 'DTSTART');
  const due = parseIcsMoment(dueProperty, fallbackTz);
  if (dueProperty !== undefined && due === undefined) {
    const zone = unknownZone(dueProperty);
    return { summary, reason: zone === undefined ? 'its due date cannot be read' : `its time zone "${zone}" is not supported` };
  }
  const status = firstValue(component, 'STATUS')?.value.toUpperCase();
  return {
    title: summary,
    notes: clip(firstValue(component, 'DESCRIPTION')?.value, MAX_NOTES_CHARACTERS),
    due,
    reminders: parseAlarms(component),
    done: status === 'COMPLETED' || firstValue(component, 'COMPLETED') !== undefined,
  };
}

function isSkipped(value: ImportedEvent | ImportedTask | SkippedItem): value is SkippedItem {
  return 'reason' in value;
}

export function importIcs(text: string, fallbackTz: string): IcsImport {
  const result: IcsImport = { events: [], tasks: [], skipped: [] };
  if (text.length > MAX_ICS_CHARACTERS) {
    result.skipped.push({ summary: '', reason: 'the file is too large to import' });
    return result;
  }
  const calendars = parseComponents(text).filter((component) => component.type === 'VCALENDAR');
  const events = calendars.flatMap((calendar) => calendar.children.filter((child) => child.type === 'VEVENT'));
  const todos = calendars.flatMap((calendar) => calendar.children.filter((child) => child.type === 'VTODO'));

  const byUid = new Map<string, Component[]>();
  const standalone: Component[] = [];
  for (const event of events) {
    const uid = firstValue(event, 'UID')?.value;
    if (uid === undefined) {
      standalone.push(event);
      continue;
    }
    byUid.set(uid, [...(byUid.get(uid) ?? []), event]);
  }

  const groups: { master: Component; siblings: Component[] }[] = standalone.map((master) => ({ master, siblings: [] }));
  for (const members of byUid.values()) {
    const master = members.find((member) => firstValue(member, 'RECURRENCE-ID') === undefined);
    const siblings = members.filter((member) => firstValue(member, 'RECURRENCE-ID') !== undefined);
    if (master !== undefined) {
      groups.push({ master, siblings });
    }
  }

  let accepted = 0;
  for (const group of groups) {
    if (accepted >= MAX_IMPORTED_ITEMS) {
      result.skipped.push({ summary: clip(firstValue(group.master, 'SUMMARY')?.value, MAX_TITLE_CHARACTERS), reason: 'the file has too many items' });
      continue;
    }
    const imported = importEvent(group.master, group.siblings, fallbackTz);
    if (isSkipped(imported)) {
      result.skipped.push(imported);
    } else {
      result.events.push(imported);
      accepted += 1;
    }
  }
  for (const todo of todos) {
    if (accepted >= MAX_IMPORTED_ITEMS) {
      result.skipped.push({ summary: clip(firstValue(todo, 'SUMMARY')?.value, MAX_TITLE_CHARACTERS), reason: 'the file has too many items' });
      continue;
    }
    const imported = importTask(todo, fallbackTz);
    if (isSkipped(imported)) {
      result.skipped.push(imported);
    } else {
      result.tasks.push(imported);
      accepted += 1;
    }
  }
  return result;
}
