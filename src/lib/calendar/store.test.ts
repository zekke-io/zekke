import { describe, expect, it } from 'vitest';
import type { SealedRecord } from '@/lib/records';
import { eventPayload } from './events';
import { listPayload, taskPayload } from './tasks';
import { arrangeCalendar, orderAfterLast, orderAtTop, orderBetweenTasks, sortTasks, taskInputOf } from './store';

function record(id: string): SealedRecord {
  return { id, ciphertext: 'c', wrapped_dek: 'w', key_generation: 1, version: 'v1', created_at: '2026-10-18T09:00:00Z', updated_at: '2026-10-18T09:00:00Z' };
}

describe('arranging the opened records of the calendar scope', () => {
  const opened = [
    { record: record('eventaaaaa'), payload: JSON.parse(JSON.stringify(eventPayload({ title: 'Lunch', start: { date: '2026-10-18' }, end: { date: '2026-10-19' } }))) },
    { record: record('taskbbbbbb'), payload: JSON.parse(JSON.stringify(taskPayload({ title: 'Pay rent', order: 'k' }))) },
    { record: record('taskcccccc'), payload: JSON.parse(JSON.stringify(taskPayload({ title: 'Call mom', order: 'V' }))) },
    { record: record('listdddddd'), payload: JSON.parse(JSON.stringify(listPayload({ name: 'Home', order: 'V' }))) },
    { record: record('brokeneeee'), payload: { type: 'event', version: 1 } },
    { record: record('unreadffff'), payload: undefined },
  ];

  it('files each record under its kind, in order, and counts what cannot be read', () => {
    const data = arrangeCalendar(opened);
    expect(data.events.map((event) => event.title)).toEqual(['Lunch']);
    expect(data.tasks.map((task) => task.title)).toEqual(['Call mom', 'Pay rent']);
    expect(data.lists.map((list) => list.name)).toEqual(['Home']);
    expect(data.unreadable).toBe(2);
    expect(data.records.size).toBe(6);
  });

  it('computes order keys at the top, the end and between tasks', () => {
    const { tasks } = arrangeCalendar(opened);
    expect(orderAfterLast(tasks) > tasks[1].order).toBe(true);
    expect(orderAtTop(tasks) < tasks[0].order).toBe(true);
    const between = orderBetweenTasks(tasks[0], tasks[1]);
    expect(between > tasks[0].order && between < tasks[1].order).toBe(true);
    expect(orderAfterLast([])).toBe('V');
  });

  it('keeps ties in a stable order by id and rebuilds a task input with a patch', () => {
    const tied = [
      { record: record('taskzzzzzz'), payload: JSON.parse(JSON.stringify(taskPayload({ title: 'Z', order: 'V' }))) },
      { record: record('taskaaaaaa'), payload: JSON.parse(JSON.stringify(taskPayload({ title: 'A', order: 'V' }))) },
    ];
    const { tasks } = arrangeCalendar(tied);
    expect(sortTasks(tasks).map((task) => task.title)).toEqual(['A', 'Z']);
    expect(taskInputOf(tasks[0], { doneAt: 5 })).toMatchObject({ title: 'A', order: 'V', doneAt: 5 });
  });
});
