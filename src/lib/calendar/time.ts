export type AllDay = { date: string };
export type Timed = { dateTime: string; tz: string };
export type MomentSpec = AllDay | Timed;

export const ALL_DAY_REMINDER_HOUR = 9;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export function isAllDay(moment: MomentSpec): moment is AllDay {
  return 'date' in moment;
}

export function parseDate(text: string): { year: number; month: number; day: number } | undefined {
  const match = DATE_PATTERN.exec(text);
  if (match === null) {
    return undefined;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return undefined;
  }
  return { year, month, day };
}

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz === '') {
    return false;
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function parseMoment(value: unknown): MomentSpec | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.date === 'string') {
    return parseDate(record.date) === undefined ? undefined : { date: record.date };
  }
  if (typeof record.dateTime === 'string' && isValidTimeZone(record.tz)) {
    const match = DATE_TIME_PATTERN.exec(record.dateTime);
    if (match === null || parseDate(record.dateTime.slice(0, 10)) === undefined) {
      return undefined;
    }
    if (Number(match[4]) > 23 || Number(match[5]) > 59) {
      return undefined;
    }
    return { dateTime: record.dateTime, tz: record.tz };
  }
  return undefined;
}

export function dayNumber(date: string): number {
  const parts = parseDate(date);
  if (parts === undefined) {
    throw new RangeError(`Not a date: ${date}`);
  }
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / MS_PER_DAY);
}

export function dateFromDayNumber(day: number): string {
  const value = new Date(day * MS_PER_DAY);
  const year = String(value.getUTCFullYear()).padStart(4, '0');
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
}

export function addDays(date: string, days: number): string {
  return dateFromDayNumber(dayNumber(date) + days);
}

export function weekdayOf(date: string): number {
  return (((dayNumber(date) + 4) % 7) + 7) % 7;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function zoneOffsetMs(utcMs: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(read('year'), read('month') - 1, read('day'), read('hour'), read('minute'), read('second'));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

export function instantOf(dateTime: string, tz: string): number {
  const match = DATE_TIME_PATTERN.exec(dateTime);
  if (match === null) {
    throw new RangeError(`Not a date and time: ${dateTime}`);
  }
  const wall = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  let instant = wall - zoneOffsetMs(wall, tz);
  const corrected = wall - zoneOffsetMs(instant, tz);
  if (corrected !== instant) {
    instant = corrected;
  }
  return instant;
}

export function momentInstant(moment: MomentSpec, fallbackTz: string): number {
  if (isAllDay(moment)) {
    return instantOf(`${moment.date}T00:00`, fallbackTz);
  }
  return instantOf(moment.dateTime, moment.tz);
}

export function reminderAnchor(moment: MomentSpec, fallbackTz: string): number {
  if (isAllDay(moment)) {
    const hour = String(ALL_DAY_REMINDER_HOUR).padStart(2, '0');
    return instantOf(`${moment.date}T${hour}:00`, fallbackTz);
  }
  return instantOf(moment.dateTime, moment.tz);
}

export function momentDate(moment: MomentSpec): string {
  return isAllDay(moment) ? moment.date : moment.dateTime.slice(0, 10);
}

export function withDate(moment: MomentSpec, date: string): MomentSpec {
  return isAllDay(moment) ? { date } : { dateTime: `${date}${moment.dateTime.slice(10)}`, tz: moment.tz };
}
