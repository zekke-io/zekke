import { describe, expect, it } from 'vitest';
import {
  EventFormError,
  blankEventForm,
  cancelOccurrence,
  editOccurrence,
  editSeries,
  eventToForm,
  formToInput,
  formForOccurrence,
  inputOf,
  recurrenceFor,
  type EventForm,
} from './form';
import { eventPayload, expandEvents, parseEvent, type CalendarEvent } from './events';

const TZ = 'America/Sao_Paulo';

function stored(input: Parameters<typeof eventPayload>[0]): CalendarEvent {
  return parseEvent('abcdefghij', JSON.parse(JSON.stringify(eventPayload(input))))!;
}

const form: EventForm = {
  title: 'Lunch with Ana',
  notes: '',
  allDay: false,
  date: '2026-10-18',
  startTime: '12:30',
  endTime: '14:00',
  repeat: 'none',
  reminder: 30,
};

describe('the event form', () => {
  it('starts on the next full hour with a 30-minute reminder', () => {
    const blank = blankEventForm('2026-10-18', new Date(2026, 9, 18, 11, 20));
    expect(blank).toMatchObject({ date: '2026-10-18', startTime: '12:00', endTime: '13:00', repeat: 'none', reminder: 30, allDay: false });
    expect(blankEventForm('2026-10-18', new Date(2026, 9, 18, 23, 10))).toMatchObject({ startTime: '00:00', endTime: '01:00' });
  });

  it('turns a form into an event input in the device’s zone', () => {
    expect(formToInput(form, TZ)).toMatchObject({
      title: 'Lunch with Ana',
      start: { dateTime: '2026-10-18T12:30', tz: TZ },
      end: { dateTime: '2026-10-18T14:00', tz: TZ },
      reminders: [30],
    });
  });

  it('makes an all-day event end on the next day, and no reminder when none is chosen', () => {
    const input = formToInput({ ...form, allDay: true, reminder: null }, TZ);
    expect(input.start).toEqual({ date: '2026-10-18' });
    expect(input.end).toEqual({ date: '2026-10-19' });
    expect(input.reminders).toEqual([]);
  });

  it('says what is wrong, in words', () => {
    const problem = (change: Partial<EventForm>, zone = TZ) => {
      try {
        formToInput({ ...form, ...change }, zone);
      } catch (error) {
        return error instanceof EventFormError ? error.problem : 'other';
      }
      return 'none';
    };
    expect(problem({ title: '   ' })).toBe('title');
    expect(problem({ date: '2026-02-30' })).toBe('date');
    expect(problem({ startTime: '25:00' })).toBe('time');
    expect(problem({ endTime: '11:00' })).toBe('order');
    expect(problem({}, 'Mars/Base')).toBe('zone');
    expect(problem({ title: 'x'.repeat(301) })).toBe('length');
    expect(problem({})).toBe('none');
  });

  it('repeats by the date it starts on', () => {
    expect(recurrenceFor('weekly', '2026-10-18')).toEqual({ frequency: 'weekly', interval: 1, weekdays: [0] });
    expect(recurrenceFor('monthly', '2026-10-18')).toEqual({ frequency: 'monthly', interval: 1, monthDay: 18 });
    expect(recurrenceFor('yearly', '2026-10-18')).toEqual({ frequency: 'yearly', interval: 1 });
    expect(recurrenceFor('none', '2026-10-18')).toBeUndefined();
  });

  it('keeps an event’s own rule when the choice does not change', () => {
    const event = stored({
      title: 'Class',
      start: { dateTime: '2026-10-05T19:00', tz: TZ },
      end: { dateTime: '2026-10-05T20:00', tz: TZ },
      recurrence: { frequency: 'weekly', interval: 2, weekdays: [1, 3], count: 6 },
    });
    const input = formToInput({ ...eventToForm(event), repeat: 'weekly' }, TZ, event);
    expect(input.recurrence).toEqual(event.recurrence);
    expect(formToInput({ ...eventToForm(event), repeat: 'monthly' }, TZ, event).recurrence).toMatchObject({ frequency: 'monthly' });
  });

  it('opens an event back into a form', () => {
    const event = stored({ title: 'Trip', notes: 'bags', start: { date: '2026-10-10' }, end: { date: '2026-10-11' }, reminders: [60] });
    expect(eventToForm(event)).toMatchObject({ title: 'Trip', notes: 'bags', allDay: true, date: '2026-10-10', reminder: 60, repeat: 'none' });
  });
});

describe('editing one occurrence or the whole series', () => {
  const series = stored({
    title: 'Class',
    start: { dateTime: '2026-10-05T19:00', tz: TZ },
    end: { dateTime: '2026-10-05T20:00', tz: TZ },
    recurrence: { frequency: 'weekly', interval: 1, weekdays: [1] },
    overrides: { '2026-10-12': { cancelled: true } },
  });

  function occurrencesOf(input: ReturnType<typeof inputOf>) {
    return expandEvents([stored(input)], '2026-10-01', '2026-10-31', TZ).map((o) => [o.originalDate, o.title, (o.start as { dateTime: string }).dateTime.slice(11)]);
  }

  it('changes only this occurrence and leaves the rest', () => {
    const edited = formToInput({ ...eventToForm(series), title: 'Class (online)', date: '2026-10-19', startTime: '20:00', endTime: '21:00' }, TZ, series);
    const input = editOccurrence(series, '2026-10-19', edited);
    expect(occurrencesOf(input)).toEqual([
      ['2026-10-05', 'Class', '19:00'],
      ['2026-10-19', 'Class (online)', '20:00'],
      ['2026-10-26', 'Class', '19:00'],
    ]);
  });

  it('changes every occurrence, keeping the days already cancelled when the date stays', () => {
    const edited = formToInput({ ...eventToForm(series), title: 'Pilates', date: '2026-10-19', startTime: '18:00', endTime: '19:00' }, TZ, series);
    const input = editSeries(series, '2026-10-19', edited);
    expect(occurrencesOf(input)).toEqual([
      ['2026-10-05', 'Pilates', '18:00'],
      ['2026-10-19', 'Pilates', '18:00'],
      ['2026-10-26', 'Pilates', '18:00'],
    ]);
  });

  it('moves the whole series by the days the occurrence moved, and clears the changed days', () => {
    const edited = formToInput({ ...eventToForm(series), date: '2026-10-20' }, TZ, series);
    const input = editSeries(series, '2026-10-19', edited);
    expect(input.overrides).toEqual({});
    expect(input.start).toMatchObject({ dateTime: '2026-10-06T19:00' });
    expect(input.recurrence).toEqual({ frequency: 'weekly', interval: 1, weekdays: [2] });
    expect(occurrencesOf(input).map((row) => row[0])).toEqual(['2026-10-06', '2026-10-13', '2026-10-20', '2026-10-27']);
  });

  it('cancels a single occurrence', () => {
    const input = cancelOccurrence(series, '2026-10-19');
    expect(occurrencesOf(input).map((row) => row[0])).toEqual(['2026-10-05', '2026-10-26']);
  });

  it('fills the form from an occurrence’s own values', () => {
    const [first] = expandEvents([series], '2026-10-01', '2026-10-06', TZ);
    expect(formForOccurrence(first, series)).toMatchObject({ title: 'Class', date: '2026-10-05', repeat: 'weekly' });
  });
});
