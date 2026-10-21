import { describe, expect, it } from 'vitest';
import {
  compareOrder,
  eventPayload,
  expandEvents,
  exportIcs,
  importIcs,
  instantOf,
  listPayload,
  occurrenceDates,
  orderBetween,
  parseEvent,
  parseList,
  parseRecurrence,
  parseTask,
  planReminders,
  REMINDER_TEXT,
  REMINDER_TITLE,
  taskPayload,
  weekdayOf,
  type CalendarEvent,
  type EventInput,
  type Recurrence,
  type Task,
  type TaskInput,
} from './index';

const TZ = 'America/Sao_Paulo';

function timed(date: string, time: string) {
  return { dateTime: `${date}T${time}`, tz: TZ };
}

let counter = 0;

function makeEvent(input: EventInput): CalendarEvent {
  counter += 1;
  const event = parseEvent(`event${String(counter).padStart(5, '0')}`, JSON.parse(JSON.stringify(eventPayload(input))));
  if (event === undefined) {
    throw new Error('the payload did not parse');
  }
  return event;
}

function makeTask(input: Partial<TaskInput> & { title: string }): Task {
  counter += 1;
  const task = parseTask(`task${String(counter).padStart(6, '0')}`, JSON.parse(JSON.stringify(taskPayload({ order: 'V', ...input }))));
  if (task === undefined) {
    throw new Error('the payload did not parse');
  }
  return task;
}

describe('order keys', () => {
  it('sorts between neighbours and at both ends', () => {
    const first = orderBetween(undefined, undefined);
    const second = orderBetween(first, undefined);
    const between = orderBetween(first, second);
    const before = orderBetween(undefined, first);
    expect([before, first, between, second].every((key, index, keys) => index === 0 || keys[index - 1] < key)).toBe(true);
  });

  it('keeps inserting between the same two keys', () => {
    let low = orderBetween(undefined, undefined);
    const high = orderBetween(low, undefined);
    for (let step = 0; step < 40; step += 1) {
      const next = orderBetween(low, high);
      expect(next > low && next < high).toBe(true);
      low = next;
    }
  });

  it('refuses keys out of order and breaks ties by id', () => {
    expect(() => orderBetween('b', 'a')).toThrow(RangeError);
    expect(compareOrder({ order: 'a', id: 'y' }, { order: 'a', id: 'z' })).toBeLessThan(0);
  });
});

describe('time', () => {
  it('computes instants across zones and daylight saving', () => {
    expect(instantOf('2026-01-01T12:00', 'UTC')).toBe(Date.UTC(2026, 0, 1, 12));
    expect(instantOf('2026-01-01T12:00', TZ)).toBe(Date.UTC(2026, 0, 1, 15));
    expect(instantOf('2026-01-15T09:00', 'America/New_York')).toBe(Date.UTC(2026, 0, 15, 14));
    expect(instantOf('2026-07-15T09:00', 'America/New_York')).toBe(Date.UTC(2026, 6, 15, 13));
  });

  it('knows the weekday', () => {
    expect(weekdayOf('2026-10-20')).toBe(2);
    expect(weekdayOf('1970-01-01')).toBe(4);
  });
});

describe('recurrence', () => {
  const rule = (extra: Partial<Recurrence> & Pick<Recurrence, 'frequency'>): Recurrence => ({ interval: 1, ...extra });

  it('repeats daily with an interval and a count', () => {
    expect(occurrenceDates(rule({ frequency: 'daily', interval: 2, count: 3 }), '2026-10-01', '2026-10-01', '2026-12-31')).toEqual([
      '2026-10-01',
      '2026-10-03',
      '2026-10-05',
    ]);
  });

  it('repeats weekly on chosen weekdays and stops at an end date', () => {
    const dates = occurrenceDates(rule({ frequency: 'weekly', weekdays: [1, 3], until: '2026-10-14' }), '2026-10-05', '2026-10-01', '2026-12-31');
    expect(dates).toEqual(['2026-10-05', '2026-10-07', '2026-10-12', '2026-10-14']);
  });

  it('skips the start week days before the start', () => {
    const dates = occurrenceDates(rule({ frequency: 'weekly', weekdays: [1, 5] }), '2026-10-07', '2026-10-01', '2026-10-16');
    expect(dates).toEqual(['2026-10-09', '2026-10-12', '2026-10-16']);
  });

  it('repeats monthly on a day, skipping months that lack it', () => {
    const dates = occurrenceDates(rule({ frequency: 'monthly', monthDay: 31 }), '2026-01-31', '2026-01-01', '2026-06-30');
    expect(dates).toEqual(['2026-01-31', '2026-03-31', '2026-05-31']);
  });

  it('repeats monthly on the last Friday and the second Tuesday', () => {
    expect(
      occurrenceDates(rule({ frequency: 'monthly', weekdayPosition: { weekday: 5, position: -1 } }), '2026-10-30', '2026-10-01', '2026-12-31'),
    ).toEqual(['2026-10-30', '2026-11-27', '2026-12-25']);
    expect(
      occurrenceDates(rule({ frequency: 'monthly', weekdayPosition: { weekday: 2, position: 2 } }), '2026-10-13', '2026-10-01', '2026-11-30'),
    ).toEqual(['2026-10-13', '2026-11-10']);
  });

  it('repeats yearly and skips 29 February in common years', () => {
    expect(occurrenceDates(rule({ frequency: 'yearly' }), '2024-02-29', '2024-01-01', '2032-12-31')).toEqual(['2024-02-29', '2028-02-29', '2032-02-29']);
  });

  it('counts occurrences from the start even when the window begins later', () => {
    expect(occurrenceDates(rule({ frequency: 'daily', count: 5 }), '2026-10-01', '2026-10-04', '2026-10-31')).toEqual(['2026-10-04', '2026-10-05']);
  });

  it('returns a single date without a rule', () => {
    expect(occurrenceDates(undefined, '2026-10-01', '2026-10-01', '2026-10-01')).toEqual(['2026-10-01']);
    expect(occurrenceDates(undefined, '2026-10-01', '2026-10-02', '2026-10-09')).toEqual([]);
  });

  it('refuses rules outside the subset', () => {
    expect(parseRecurrence({ frequency: 'hourly', interval: 1 })).toBeUndefined();
    expect(parseRecurrence({ frequency: 'daily', interval: 0 })).toBeUndefined();
    expect(parseRecurrence({ frequency: 'daily', interval: 1, count: 3, until: '2026-10-01' })).toBeUndefined();
    expect(parseRecurrence({ frequency: 'weekly', interval: 1, weekdays: [7] })).toBeUndefined();
    expect(parseRecurrence({ frequency: 'daily', interval: 1 })).toEqual({ frequency: 'daily', interval: 1 });
  });
});

describe('event payloads', () => {
  it('round-trips through JSON and keeps the version and type inside the ciphertext', () => {
    const payload = eventPayload({
      title: 'Dentist',
      start: timed('2026-10-20', '14:00'),
      end: timed('2026-10-20', '15:00'),
      reminders: [30, 10, 10],
      recurrence: { frequency: 'weekly', interval: 2, weekdays: [1] },
      overrides: { '2026-11-03': { cancelled: true } },
    });
    expect(payload).toMatchObject({ version: 1, type: 'event' });
    const event = parseEvent('abcdefghij', JSON.parse(JSON.stringify(payload)));
    expect(event).toMatchObject({
      id: 'abcdefghij',
      title: 'Dentist',
      reminders: [10, 30],
      recurrence: { frequency: 'weekly', interval: 2, weekdays: [1] },
      overrides: { '2026-11-03': { cancelled: true } },
    });
  });

  it('refuses to write what a reader would refuse', () => {
    expect(() => eventPayload({ title: 'x', start: timed('2026-10-20', '15:00'), end: timed('2026-10-20', '14:00') })).toThrow(RangeError);
    expect(() => eventPayload({ title: 'x', start: { date: '2026-10-20' }, end: timed('2026-10-20', '14:00') })).toThrow(RangeError);
    expect(() => eventPayload({ title: 'x', start: { date: '2026-10-20' }, end: { date: '2026-10-20' } })).toThrow(RangeError);
    expect(() => eventPayload({ title: 'x', start: { date: '2026-02-30' }, end: { date: '2026-03-02' } })).toThrow(RangeError);
    expect(() =>
      eventPayload({ title: 'x', start: { dateTime: '2026-02-20T10:00', tz: 'Mars/Base' }, end: { dateTime: '2026-02-20T11:00', tz: 'Mars/Base' } }),
    ).toThrow(RangeError);
    expect(() =>
      eventPayload({
        title: 'x',
        start: { date: '2026-10-01' },
        end: { date: '2026-10-02' },
        overrides: { '2026-10-02': { start: { date: '2026-02-30' }, end: { date: '2026-03-01' } } },
      }),
    ).toThrow(RangeError);
  });

  it('ignores payloads a peer wrote badly or in another version', () => {
    expect(parseEvent('abcdefghij', { version: 2, type: 'event' })).toBeUndefined();
    expect(parseEvent('abcdefghij', { version: 1, type: 'task' })).toBeUndefined();
    expect(parseEvent('abcdefghij', { version: 1, type: 'event', start: { date: 'not-a-date' }, end: { date: '2026-10-21' } })).toBeUndefined();
    expect(parseEvent('abcdefghij', null)).toBeUndefined();
    expect(parseEvent('abcdefghij', 'text')).toBeUndefined();
  });

  it('expands a weekly event, with a cancelled and a moved occurrence', () => {
    const event = makeEvent({
      title: 'Class',
      start: timed('2026-10-05', '19:00'),
      end: timed('2026-10-05', '20:00'),
      recurrence: { frequency: 'weekly', interval: 1 },
      overrides: {
        '2026-10-12': { cancelled: true },
        '2026-10-19': { title: 'Class (online)', start: timed('2026-10-19', '20:00'), end: timed('2026-10-19', '21:00') },
      },
    });
    const occurrences = expandEvents([event], '2026-10-01', '2026-10-31', TZ);
    expect(occurrences.map((entry) => [entry.originalDate, entry.title, entry.start])).toEqual([
      ['2026-10-05', 'Class', timed('2026-10-05', '19:00')],
      ['2026-10-19', 'Class (online)', timed('2026-10-19', '20:00')],
      ['2026-10-26', 'Class', timed('2026-10-26', '19:00')],
    ]);
  });

  it('keeps a wall-clock time across a daylight-saving change', () => {
    const event = makeEvent({
      title: 'Stand-up',
      start: { dateTime: '2026-03-02T09:00', tz: 'America/New_York' },
      end: { dateTime: '2026-03-02T09:15', tz: 'America/New_York' },
      recurrence: { frequency: 'weekly', interval: 1 },
    });
    const [before, after] = expandEvents([event], '2026-03-02', '2026-03-16', 'UTC').filter((entry) =>
      ['2026-03-02', '2026-03-09'].includes(entry.originalDate),
    );
    expect(before.startMs).toBe(Date.UTC(2026, 2, 2, 14));
    expect(after.startMs).toBe(Date.UTC(2026, 2, 9, 13));
  });

  it('shows a multi-day all-day event on every day it covers', () => {
    const event = makeEvent({ title: 'Trip', start: { date: '2026-10-10' }, end: { date: '2026-10-13' } });
    expect(expandEvents([event], '2026-10-12', '2026-10-12', TZ)).toHaveLength(1);
    expect(expandEvents([event], '2026-10-13', '2026-10-13', TZ)).toHaveLength(0);
  });
});

describe('payload size', () => {
  const base = { title: 'Big', start: { date: '2026-10-01' }, end: { date: '2026-10-02' } };

  it('writes an event near the limit and refuses one just over it', () => {
    const fits = { ...base, notes: '𝒳'.repeat(10_000), location: '𝒳'.repeat(500), title: '𝒳'.repeat(300) };
    expect(() => eventPayload(fits)).not.toThrow();
    expect(new TextEncoder().encode(JSON.stringify(eventPayload(fits))).length).toBeLessThanOrEqual(90_000);

    const overrides: Record<string, { notes: string }> = {};
    for (let day = 1; day <= 5; day += 1) {
      overrides[`2026-11-${String(day).padStart(2, '0')}`] = { notes: '𝒳'.repeat(10_000) };
    }
    expect(() => eventPayload({ ...fits, overrides })).toThrow(RangeError);
  });

  it('keeps the largest normal event under the server cap once sealed', () => {
    const payload = eventPayload({ ...base, notes: '𝒳'.repeat(10_000), location: '𝒳'.repeat(500), title: '𝒳'.repeat(300) });
    const sealedBase64Characters = Math.ceil((new TextEncoder().encode(JSON.stringify(payload)).length + 29) / 3) * 4;
    expect(sealedBase64Characters).toBeLessThanOrEqual(131_072);
  });

  it('covers tasks', () => {
    expect(() => taskPayload({ title: 't', order: 'V', notes: '𝒳'.repeat(10_000) })).not.toThrow();
  });
});

describe('task payloads and lists', () => {
  it('round-trips a task and refuses a bad due date or order', () => {
    const task = makeTask({ title: 'Pay rent', due: { date: '2026-10-30' }, reminders: [60], listId: 'listaaaaaa' });
    expect(task).toMatchObject({ title: 'Pay rent', due: { date: '2026-10-30' }, reminders: [60], listId: 'listaaaaaa', order: 'V' });
    expect(() => taskPayload({ title: 'x', order: 'V', due: { date: '2026-13-01' } })).toThrow(RangeError);
    expect(() => taskPayload({ title: 'x', order: 'V', due: { dateTime: '2026-02-20T10:00', tz: 'Nowhere/Land' } })).toThrow(RangeError);
    expect(() => taskPayload({ title: 'x', order: 'V0' })).toThrow(RangeError);
  });

  it('keeps completion and ignores payloads of another kind', () => {
    expect(makeTask({ title: 'Done', doneAt: 1000 }).doneAt).toBe(1000);
    expect(parseTask('abcdefghij', { version: 1, type: 'event' })).toBeUndefined();
    expect(parseTask('abcdefghij', { version: 1, type: 'task', order: '' })).toBeUndefined();
  });

  it('round-trips a list payload and refuses a bad one', () => {
    const list = parseList('listaaaaaa', JSON.parse(JSON.stringify(listPayload({ name: 'Home', order: 'V' }))));
    expect(list).toEqual({ id: 'listaaaaaa', name: 'Home', order: 'V' });
    expect(() => listPayload({ name: 'x', order: '' })).toThrow(RangeError);
    expect(parseList('listaaaaaa', { version: 1, type: 'list', name: 'no order' })).toBeUndefined();
    expect(parseList('listaaaaaa', { version: 9, type: 'list', name: 'x', order: 'V' })).toBeUndefined();
    expect(parseList('listaaaaaa', undefined)).toBeUndefined();
  });
});

describe('reminders', () => {
  const now = Date.UTC(2026, 9, 20, 12);

  it('plans content-free reminders for the next events and open tasks', () => {
    const event = makeEvent({
      title: 'Secret meeting',
      start: { dateTime: '2026-10-21T09:00', tz: 'UTC' },
      end: { dateTime: '2026-10-21T10:00', tz: 'UTC' },
      reminders: [15, 60],
    });
    const done = makeTask({ title: 'Done already', due: { date: '2026-10-22' }, reminders: [0], doneAt: now });
    const open = makeTask({ title: 'Pay rent', due: { dateTime: '2026-10-23T08:00', tz: 'UTC' }, reminders: [30] });
    const plan = planReminders([event], [done, open], now, 'UTC');
    expect(plan.map((entry) => [entry.kind, entry.fireAtMs])).toEqual([
      ['event', Date.UTC(2026, 9, 21, 8)],
      ['event', Date.UTC(2026, 9, 21, 8, 45)],
      ['task', Date.UTC(2026, 9, 23, 7, 30)],
    ]);
    expect(JSON.stringify(plan)).not.toContain('Secret');
    expect(JSON.stringify(plan)).not.toContain('Pay rent');
    expect(plan[0].key).toContain(event.id);
  });

  it('words every notification without naming anything', () => {
    expect(REMINDER_TEXT).toEqual({ event: 'You have an event', task: 'A task is due' });
    expect(REMINDER_TITLE).toBe('Zekke');
  });

  it('skips the past, the far future and respects the limit', () => {
    const event = makeEvent({
      title: 'Daily',
      start: { date: '2026-10-01' },
      end: { date: '2026-10-02' },
      recurrence: { frequency: 'daily', interval: 1 },
      reminders: [0],
    });
    const plan = planReminders([event], [], now, 'UTC', 14, 5);
    expect(plan).toHaveLength(5);
    expect(plan.every((entry) => entry.fireAtMs > now)).toBe(true);
    expect(planReminders([event], [], now, 'UTC', 1).length).toBeLessThanOrEqual(2);
  });
});

describe('ics', () => {
  it('round-trips events, an override, a cancellation, reminders and tasks', () => {
    const planningEvent = makeEvent({
      title: 'Planning; weekly, with "quotes"',
      notes: 'Line one\nLine two \\ backslash',
      location: 'Room 4',
      start: timed('2026-10-05', '10:00'),
      end: timed('2026-10-05', '11:00'),
      recurrence: { frequency: 'weekly', interval: 1, weekdays: [1], count: 6 },
      reminders: [15],
      overrides: {
        '2026-10-12': { cancelled: true },
        '2026-10-19': { title: 'Planning (moved)', start: timed('2026-10-19', '11:00'), end: timed('2026-10-19', '12:00') },
      },
    });
    const holiday = makeEvent({ title: 'Holiday', start: { date: '2026-12-24' }, end: { date: '2026-12-26' } });
    const open = makeTask({ title: 'Send report', due: { date: '2026-10-30' }, reminders: [60] });
    const finished = makeTask({ title: 'Book flight', doneAt: Date.UTC(2026, 9, 1) });

    const text = exportIcs([planningEvent, holiday], [open, finished], Date.UTC(2026, 9, 20));
    expect(text.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(text.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true);

    const result = importIcs(text, TZ);
    expect(result.skipped).toEqual([]);
    const events = result.events;
    const planning = events.find((event) => event.title.startsWith('Planning;'))!;
    expect(planning).toMatchObject({
      notes: 'Line one\nLine two \\ backslash',
      location: 'Room 4',
      recurrence: { frequency: 'weekly', interval: 1, weekdays: [1], count: 6 },
      reminders: [15],
    });
    expect(planning.overrides['2026-10-12']).toEqual({ cancelled: true });
    expect(planning.overrides['2026-10-19']).toMatchObject({ title: 'Planning (moved)', start: timed('2026-10-19', '11:00') });
    expect(events.find((event) => event.title === 'Holiday')).toMatchObject({ start: { date: '2026-12-24' }, end: { date: '2026-12-26' } });
    const tasks = result.tasks;
    expect(tasks.find((task) => task.title === 'Send report')).toMatchObject({ due: { date: '2026-10-30' }, reminders: [60], done: false });
    expect(tasks.find((task) => task.title === 'Book flight')?.done).toBe(true);
  });

  it('reads a calendar written by another application', () => {
    const text = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:abc@example.com',
      'DTSTART:20261020T140000Z',
      'DTEND:20261020T150000Z',
      'SUMMARY:Review\\, with notes',
      'DESCRIPTION:A very long description that is folded onto the next line by the exporter of anoth',
      ' er application',
      'RRULE:FREQ=MONTHLY;BYDAY=-1FR;COUNT=3',
      'BEGIN:VALARM',
      'TRIGGER:-PT1H',
      'ACTION:DISPLAY',
      'END:VALARM',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'DTSTART;VALUE=DATE:20261101',
      'SUMMARY:All day',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'DTSTART;TZID=Europe/Lisbon:20261102T090000',
      'DTEND;TZID=Europe/Lisbon:20261102T100000',
      'SUMMARY:Floating TZ',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const result = importIcs(text, TZ);
    expect(result.skipped).toEqual([]);
    expect(result.events).toHaveLength(3);
    const review = result.events.find((event) => event.title === 'Review, with notes')!;
    expect(review.start).toEqual({ dateTime: '2026-10-20T14:00', tz: 'UTC' });
    expect(review.recurrence).toEqual({ frequency: 'monthly', interval: 1, weekdayPosition: { weekday: 5, position: -1 }, count: 3 });
    expect(review.reminders).toEqual([60]);
    expect(review.notes).toContain('exporter of another application');
    expect(result.events.find((event) => event.title === 'All day')?.end).toEqual({ date: '2026-11-02' });
    expect(result.events.find((event) => event.title === 'Floating TZ')?.start).toEqual({ dateTime: '2026-11-02T09:00', tz: 'Europe/Lisbon' });
  });

  it('lists what it cannot import instead of dropping it silently', () => {
    const text = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'DTSTART:20261020T140000Z',
      'DTEND:20261020T150000Z',
      'SUMMARY:Hourly',
      'RRULE:FREQ=HOURLY',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'DTSTART:20261020T140000Z',
      'DTEND:20261020T150000Z',
      'SUMMARY:Set position',
      'RRULE:FREQ=MONTHLY;BYDAY=MO,TU;BYSETPOS=1',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'SUMMARY:No start',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'DTSTART:20261020T140000Z',
      'DTEND:20261020T130000Z',
      'SUMMARY:Backwards',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'DTSTART:20261020T140000Z',
      'SUMMARY:Fine',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const result = importIcs(text, 'UTC');
    expect(result.events.map((event) => event.title)).toEqual(['Fine']);
    expect(result.skipped.map((item) => item.summary).sort()).toEqual(['Backwards', 'Hourly', 'No start', 'Set position']);
  });

  it('reports a Windows time zone name from another application, for an event and a task', () => {
    const text = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'DTSTART;TZID=W. Europe Standard Time:20261020T140000',
      'DTEND;TZID=W. Europe Standard Time:20261020T150000',
      'SUMMARY:Outlook meeting',
      'END:VEVENT',
      'BEGIN:VTODO',
      'DUE;TZID=Pacific Standard Time:20261021T170000',
      'SUMMARY:Outlook task',
      'END:VTODO',
      'END:VCALENDAR',
    ].join('\r\n');
    const result = importIcs(text, 'UTC');
    expect(result.events).toEqual([]);
    expect(result.tasks).toEqual([]);
    expect(result.skipped).toEqual([
      { summary: 'Outlook meeting', reason: 'its time zone "W. Europe Standard Time" is not supported' },
      { summary: 'Outlook task', reason: 'its time zone "Pacific Standard Time" is not supported' },
    ]);
  });

  it('refuses a file that is too large', () => {
    expect(importIcs('x'.repeat(2_000_001), 'UTC').skipped).toHaveLength(1);
  });
});
