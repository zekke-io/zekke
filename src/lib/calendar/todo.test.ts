import { describe, expect, it } from 'vitest';
import { dueFromChoice, choiceFromDue, orderToMove } from './todo';
import type { Task } from './tasks';

function task(id: string, order: string): Task {
  return { id, title: id, notes: '', listId: undefined, due: undefined, doneAt: undefined, order, reminders: [] };
}

describe('the when choice', () => {
  const today = '2026-10-18';

  it('turns each choice into a due date', () => {
    expect(dueFromChoice('today', '', today)).toEqual({ date: '2026-10-18' });
    expect(dueFromChoice('tomorrow', '', today)).toEqual({ date: '2026-10-19' });
    expect(dueFromChoice('pick', '2026-11-02', today)).toEqual({ date: '2026-11-02' });
    expect(dueFromChoice('none', '', today)).toBeUndefined();
    expect(() => dueFromChoice('pick', '2026-02-30', today)).toThrow(RangeError);
  });

  it('reads a due date back into the choice', () => {
    expect(choiceFromDue({ date: today }, today)).toEqual({ choice: 'today', picked: today });
    expect(choiceFromDue({ date: '2026-10-19' }, today).choice).toBe('tomorrow');
    expect(choiceFromDue({ dateTime: '2026-11-02T10:00', tz: 'UTC' }, today)).toEqual({ choice: 'pick', picked: '2026-11-02' });
    expect(choiceFromDue(undefined, today).choice).toBe('none');
  });
});

describe('moving a task up or down the visible list', () => {
  const visible = [task('a', 'D'), task('b', 'M'), task('c', 'V'), task('d', 'k')];

  it('lands between the neighbours it passes', () => {
    const up = orderToMove(visible, 'c', 'up')!;
    expect(up > 'D' && up < 'M').toBe(true);
    const down = orderToMove(visible, 'b', 'down')!;
    expect(down > 'V' && down < 'k').toBe(true);
  });

  it('goes to the very top and the very bottom', () => {
    expect(orderToMove(visible, 'b', 'up')! < 'D').toBe(true);
    expect(orderToMove(visible, 'c', 'down')! > 'k').toBe(true);
  });

  it('does nothing at the ends or for an unknown task', () => {
    expect(orderToMove(visible, 'a', 'up')).toBeUndefined();
    expect(orderToMove(visible, 'd', 'down')).toBeUndefined();
    expect(orderToMove(visible, 'zzz', 'up')).toBeUndefined();
  });
});
