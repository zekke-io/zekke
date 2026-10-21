import type { AuthedContext } from '@/lib/context';
import { feedCalendar } from '@/lib/feed';
import {
  createRecord,
  deleteRecords,
  openRecord,
  updateRecord,
  type SealedRecord,
} from '@/lib/records';
import { eventPayload, parseEvent, type CalendarEvent, type EventInput } from './events';
import { orderBetween } from './order';
import { listPayload, parseList, parseTask, taskPayload, type Task, type TaskInput, type TaskList } from './tasks';

export const OPEN_CONCURRENCY = 8;

export interface CalendarData {
  events: CalendarEvent[];
  tasks: Task[];
  lists: TaskList[];
  records: Map<string, SealedRecord>;
  unreadable: number;
}

async function mapBounded<T, R>(items: readonly T[], limit: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await run(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

export function sortTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort((a, b) => (a.order === b.order ? a.id.localeCompare(b.id) : a.order < b.order ? -1 : 1));
}

export function sortLists(lists: readonly TaskList[]): TaskList[] {
  return [...lists].sort((a, b) => (a.order === b.order ? a.id.localeCompare(b.id) : a.order < b.order ? -1 : 1));
}

export function arrangeCalendar(opened: readonly { record: SealedRecord; payload: unknown | undefined }[]): CalendarData {
  const data: CalendarData = { events: [], tasks: [], lists: [], records: new Map(), unreadable: 0 };
  for (const { record, payload } of opened) {
    data.records.set(record.id, record);
    const type = typeof payload === 'object' && payload !== null ? (payload as { type?: unknown }).type : undefined;
    const event = type === 'event' ? parseEvent(record.id, payload) : undefined;
    const task = type === 'task' ? parseTask(record.id, payload) : undefined;
    const list = type === 'list' ? parseList(record.id, payload) : undefined;
    if (event !== undefined) {
      data.events.push(event);
    } else if (task !== undefined) {
      data.tasks.push(task);
    } else if (list !== undefined) {
      data.lists.push(list);
    } else {
      data.unreadable += 1;
    }
  }
  data.tasks = sortTasks(data.tasks);
  data.lists = sortLists(data.lists);
  return data;
}

export async function loadCalendar(context: AuthedContext): Promise<CalendarData> {
  const records = await feedCalendar(context);
  const opened = await mapBounded(records, OPEN_CONCURRENCY, async (record) => {
    try {
      return { record, payload: await openRecord(context, 'calendar', record) };
    } catch {
      return { record, payload: undefined };
    }
  });
  return arrangeCalendar(opened);
}

export async function saveEvent(
  context: AuthedContext,
  input: EventInput,
  target?: SealedRecord,
): Promise<SealedRecord> {
  const payload = eventPayload(input);
  if (target !== undefined) {
    return updateRecord(context, 'calendar', target, payload);
  }
  return (await createRecord(context, 'calendar', payload)).record;
}

export function orderAfterLast(siblings: readonly { order: string }[]): string {
  return orderBetween(siblings.length === 0 ? undefined : siblings[siblings.length - 1].order, undefined);
}

export function orderAtTop(siblings: readonly { order: string }[]): string {
  return orderBetween(undefined, siblings.length === 0 ? undefined : siblings[0].order);
}

export function orderBetweenTasks(before: Task | undefined, after: Task | undefined): string {
  return orderBetween(before?.order, after?.order);
}

export async function saveTask(context: AuthedContext, input: TaskInput, target?: SealedRecord): Promise<SealedRecord> {
  const payload = taskPayload(input);
  if (target !== undefined) {
    return updateRecord(context, 'calendar', target, payload);
  }
  return (await createRecord(context, 'calendar', payload)).record;
}

export function taskInputOf(task: Task, patch: Partial<TaskInput> = {}): TaskInput {
  return {
    title: task.title,
    notes: task.notes,
    listId: task.listId,
    due: task.due,
    doneAt: task.doneAt,
    order: task.order,
    reminders: task.reminders,
    ...patch,
  };
}

export async function saveList(
  context: AuthedContext,
  input: { name: string; order: string },
  target?: SealedRecord,
): Promise<SealedRecord> {
  const payload = listPayload(input);
  if (target !== undefined) {
    return updateRecord(context, 'calendar', target, payload);
  }
  return (await createRecord(context, 'calendar', payload)).record;
}

export async function removeCalendarItems(context: AuthedContext, ids: readonly string[]): Promise<void> {
  await deleteRecords(context, 'calendar', ids);
}
