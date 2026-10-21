import { describe, expect, it } from 'vitest';
import { countryDefaults } from '@/lib/regional';
import { eventPayload, expandEvents, parseEvent, type CalendarEvent } from './events';
import { parseTask, taskPayload, type Task } from './tasks';
import {
  clockText,
  dayTitle,
  daysWithOccurrences,
  dueLabel,
  gridRange,
  localDate,
  monthGrid,
  monthTitle,
  occurrenceTimes,
  occurrencesOn,
  shiftMonth,
  taskCountLabel,
  taskSections,
} from './view';

function event(id: string, input: Parameters<typeof eventPayload>[0]): CalendarEvent {
  return parseEvent(id, JSON.parse(JSON.stringify(eventPayload(input))))!;
}

function task(id: string, input: Partial<Parameters<typeof taskPayload>[0]> & { title: string }): Task {
  return parseTask(id, JSON.parse(JSON.stringify(taskPayload({ order: 'V', ...input }))))!;
}

const us = countryDefaults('US');
const pt = countryDefaults('PT');

describe('the month grid', () => {
  it('lays October 2026 on Sunday-first weeks, five rows', () => {
    const grid = monthGrid(2026, 10);
    expect(grid).toHaveLength(5);
    expect(grid[0].map((cell) => cell.date)).toEqual([
      '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03',
    ]);
    expect(grid[0].filter((cell) => cell.inMonth)).toHaveLength(3);
    expect(gridRange(grid)).toEqual({ from: '2026-09-27', to: '2026-10-31' });
  });

  it('uses six rows when the month needs them and four when it fits', () => {
    expect(monthGrid(2026, 8)).toHaveLength(6);
    expect(monthGrid(2026, 2)).toHaveLength(4);
  });

  it('steps across years and names the month', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(monthTitle(2026, 10)).toBe('October 2026');
    expect(dayTitle('2026-10-18')).toBe('Sunday, 18 October');
  });

  it('reads the local date, not the UTC one', () => {
    expect(localDate(new Date(2026, 9, 18, 23, 30))).toBe('2026-10-18');
  });
});

describe('the agenda', () => {
  const events = [
    event('eventaaaaa', { title: 'Lunch', start: { dateTime: '2026-10-18T12:30', tz: 'UTC' }, end: { dateTime: '2026-10-18T14:00', tz: 'UTC' } }),
    event('eventbbbbb', { title: 'Call', start: { dateTime: '2026-10-18T16:00', tz: 'UTC' }, end: { dateTime: '2026-10-18T16:30', tz: 'UTC' } }),
    event('eventccccc', { title: 'Trip', start: { date: '2026-10-17' }, end: { date: '2026-10-20' } }),
  ];
  const occurrences = expandEvents(events, '2026-10-01', '2026-10-31', 'UTC');

  it('lists a day with all-day items first, then by time', () => {
    expect(occurrencesOn(occurrences, '2026-10-18').map((o) => o.title)).toEqual(['Trip', 'Lunch', 'Call']);
    expect(occurrencesOn(occurrences, '2026-10-20')).toEqual([]);
  });

  it('marks every day a multi-day event covers', () => {
    const days = daysWithOccurrences(occurrences);
    expect(['2026-10-17', '2026-10-18', '2026-10-19']).toEqual(expect.arrayContaining([...days].filter((d) => d < '2026-10-20' && d > '2026-10-16')));
    expect(days.has('2026-10-20')).toBe(false);
  });

  it('writes the times in the person’s format', () => {
    const lunch = occurrencesOn(occurrences, '2026-10-18')[1];
    expect(occurrenceTimes(lunch, pt)).toBe('12:30 – 14:00');
    expect(occurrenceTimes(lunch, { ...us, time: '12h' })).toBe('12:30 PM – 2:00 PM');
    expect(occurrenceTimes(occurrencesOn(occurrences, '2026-10-18')[0], pt)).toBe('All day');
    expect(clockText({ date: '2026-10-18' }, pt)).toBe('');
  });
});

describe('the to-do sections', () => {
  const today = '2026-10-18';
  const tasks = [
    task('taska00000', { title: 'Send the proposal', due: { date: '2026-10-17' } }),
    task('taskb00000', { title: 'Renew passport scan', due: { date: today } }),
    task('taskc00000', { title: 'Book the train', due: { date: '2026-10-23' }, listId: 'home000000' }),
    task('taskd00000', { title: 'Buy lemons', listId: 'home000000' }),
    task('taske00000', { title: 'Pay the bill', doneAt: 10 }),
    task('taskf00000', { title: 'Call mom', doneAt: 20, listId: 'home000000' }),
  ];

  it('splits to do from done, newest completion first', () => {
    const all = taskSections(tasks, { kind: 'all' }, today);
    expect(all.todo.map((t) => t.title)).toEqual(['Send the proposal', 'Renew passport scan', 'Book the train', 'Buy lemons']);
    expect(all.done.map((t) => t.title)).toEqual(['Call mom', 'Pay the bill']);
    expect(taskCountLabel(tasks)).toBe('4 to do, 2 done');
  });

  it('shows Today as what is due now or overdue and still open', () => {
    expect(taskSections(tasks, { kind: 'today' }, today).todo.map((t) => t.title)).toEqual(['Send the proposal', 'Renew passport scan']);
    expect(taskSections(tasks, { kind: 'today' }, today).done).toEqual([]);
  });

  it('filters by list', () => {
    const home = taskSections(tasks, { kind: 'list', id: 'home000000' }, today);
    expect(home.todo.map((t) => t.title)).toEqual(['Book the train', 'Buy lemons']);
    expect(home.done.map((t) => t.title)).toEqual(['Call mom']);
  });

  it('words the due date', () => {
    expect(dueLabel(undefined, today, false)).toBe('');
    expect(dueLabel('2026-10-18', today, false)).toBe('Today');
    expect(dueLabel('2026-10-19', today, false)).toBe('Tomorrow');
    expect(dueLabel('2026-10-17', today, false)).toBe('Yesterday · overdue');
    expect(dueLabel('2026-10-17', today, true)).toBe('Yesterday');
    expect(dueLabel('2026-10-23', today, false)).toBe('Fri, 23 Oct');
    expect(dueLabel('2026-10-12', today, false)).toBe('Mon, 12 Oct · overdue');
  });
});
