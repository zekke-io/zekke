import { MAX_NOTES_CHARACTERS, MAX_TITLE_CHARACTERS, parseReminders, requirePayloadFits } from './events';
import { isOrderKey } from './order';
import { parseMoment, type MomentSpec } from './time';

export const TASK_PAYLOAD_VERSION = 1;
export const LISTS_MANIFEST_VERSION = 1;
export const MAX_LIST_NAME_CHARACTERS = 100;
export const MAX_LISTS = 100;

export interface TaskList {
  id: string;
  name: string;
  order: string;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  listId: string | undefined;
  due: MomentSpec | undefined;
  doneAt: number | undefined;
  order: string;
  reminders: number[];
}

export interface TaskInput {
  title: string;
  notes?: string;
  listId?: string;
  due?: MomentSpec;
  doneAt?: number;
  order: string;
  reminders?: number[];
}

function text(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.slice(0, limit) : '';
}

export function validateTaskInput(input: TaskInput): void {
  if (input.due !== undefined && parseMoment(input.due) === undefined) {
    throw new RangeError('The due date must be a real date, and a time needs a known time zone');
  }
  if (!isOrderKey(input.order)) {
    throw new RangeError('The order must be a valid order key');
  }
}

export function taskPayload(input: TaskInput): Record<string, unknown> {
  validateTaskInput(input);
  const payload: Record<string, unknown> = {
    version: TASK_PAYLOAD_VERSION,
    type: 'task',
    title: input.title.slice(0, MAX_TITLE_CHARACTERS),
    notes: (input.notes ?? '').slice(0, MAX_NOTES_CHARACTERS),
    order: input.order,
    reminders: parseReminders(input.reminders ?? []),
  };
  if (input.listId !== undefined) {
    payload.list = input.listId;
  }
  if (input.due !== undefined) {
    payload.due = input.due;
  }
  if (input.doneAt !== undefined) {
    payload.doneAt = input.doneAt;
  }
  requirePayloadFits(payload);
  return payload;
}

export function parseTask(id: string, value: unknown): Task | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (record.version !== TASK_PAYLOAD_VERSION || record.type !== 'task' || !isOrderKey(record.order)) {
    return undefined;
  }
  const due = record.due === undefined ? undefined : parseMoment(record.due);
  if (record.due !== undefined && due === undefined) {
    return undefined;
  }
  return {
    id,
    title: text(record.title, MAX_TITLE_CHARACTERS),
    notes: text(record.notes, MAX_NOTES_CHARACTERS),
    listId: typeof record.list === 'string' ? record.list : undefined,
    due,
    doneAt: typeof record.doneAt === 'number' && Number.isFinite(record.doneAt) ? record.doneAt : undefined,
    order: record.order,
    reminders: parseReminders(record.reminders),
  };
}

export function listsManifest(lists: readonly TaskList[]): Record<string, unknown> {
  const manifest = {
    version: LISTS_MANIFEST_VERSION,
    lists: lists.slice(0, MAX_LISTS).map((list) => ({ id: list.id, name: list.name.slice(0, MAX_LIST_NAME_CHARACTERS), order: list.order })),
  };
  requirePayloadFits(manifest);
  return manifest;
}

export function parseListsManifest(value: unknown): TaskList[] {
  if (typeof value !== 'object' || value === null) {
    return [];
  }
  const record = value as Record<string, unknown>;
  if (record.version !== LISTS_MANIFEST_VERSION || !Array.isArray(record.lists)) {
    return [];
  }
  const lists: TaskList[] = [];
  for (const entry of record.lists.slice(0, MAX_LISTS)) {
    const candidate = entry as Record<string, unknown> | null;
    if (candidate !== null && typeof candidate === 'object' && typeof candidate.id === 'string' && isOrderKey(candidate.order)) {
      lists.push({ id: candidate.id, name: text(candidate.name, MAX_LIST_NAME_CHARACTERS), order: candidate.order });
    }
  }
  return lists;
}
