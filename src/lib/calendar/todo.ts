import { orderBetween } from './order';
import type { Task } from './tasks';
import { addDays, parseDate, type MomentSpec } from './time';

export type WhenChoice = 'today' | 'tomorrow' | 'pick' | 'none';

export const WHEN_CHOICES: readonly { value: WhenChoice; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'pick', label: 'Pick a date' },
  { value: 'none', label: 'No date' },
];

export function dueFromChoice(choice: WhenChoice, picked: string, today: string): MomentSpec | undefined {
  switch (choice) {
    case 'today':
      return { date: today };
    case 'tomorrow':
      return { date: addDays(today, 1) };
    case 'pick':
      if (parseDate(picked) === undefined) {
        throw new RangeError('Choose a date.');
      }
      return { date: picked };
    case 'none':
      return undefined;
  }
}

export function choiceFromDue(due: MomentSpec | undefined, today: string): { choice: WhenChoice; picked: string } {
  if (due === undefined) {
    return { choice: 'none', picked: today };
  }
  const date = 'date' in due ? due.date : due.dateTime.slice(0, 10);
  if (date === today) {
    return { choice: 'today', picked: date };
  }
  if (date === addDays(today, 1)) {
    return { choice: 'tomorrow', picked: date };
  }
  return { choice: 'pick', picked: date };
}

export function orderToMove(visible: readonly Task[], id: string, direction: 'up' | 'down'): string | undefined {
  const index = visible.findIndex((task) => task.id === id);
  if (index < 0) {
    return undefined;
  }
  if (direction === 'up') {
    if (index === 0) {
      return undefined;
    }
    return orderBetween(visible[index - 2]?.order, visible[index - 1].order);
  }
  if (index === visible.length - 1) {
    return undefined;
  }
  return orderBetween(visible[index + 1].order, visible[index + 2]?.order);
}
