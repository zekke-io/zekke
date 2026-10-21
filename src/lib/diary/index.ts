import type { AuthedContext } from '@/lib/context';
import { requirePayloadFits } from '@/lib/calendar/events';
import { parseDate } from '@/lib/calendar/time';
import { feedDiary } from '@/lib/feed';
import { createRecord, deleteRecords, openRecord, updateRecord, type SealedRecord } from '@/lib/records';

export const ENTRY_PAYLOAD_VERSION = 1;
export const MAX_ENTRY_CHARACTERS = 20_000;
export const DIARY_OPEN_CONCURRENCY = 8;

export interface DiaryEntry {
  id: string;
  date: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryData {
  entries: DiaryEntry[];
  records: Map<string, SealedRecord>;
  unreadable: number;
}

export function entryPayload(input: { date: string; text: string }): Record<string, unknown> {
  if (parseDate(input.date) === undefined) {
    throw new RangeError('The diary date must be a real date');
  }
  if (Array.from(input.text).length > MAX_ENTRY_CHARACTERS) {
    throw new RangeError(`A diary entry is at most ${MAX_ENTRY_CHARACTERS} characters`);
  }
  const payload = { version: ENTRY_PAYLOAD_VERSION, type: 'entry', date: input.date, text: input.text };
  requirePayloadFits(payload);
  return payload;
}

export function parseEntry(record: SealedRecord, value: unknown): DiaryEntry | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const payload = value as Record<string, unknown>;
  if (payload.version !== ENTRY_PAYLOAD_VERSION || payload.type !== 'entry') {
    return undefined;
  }
  if (typeof payload.date !== 'string' || parseDate(payload.date) === undefined || typeof payload.text !== 'string') {
    return undefined;
  }
  return {
    id: record.id,
    date: payload.date,
    text: payload.text.slice(0, MAX_ENTRY_CHARACTERS),
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export function arrangeDiary(opened: readonly { record: SealedRecord; payload: unknown | undefined }[]): DiaryData {
  const data: DiaryData = { entries: [], records: new Map(), unreadable: 0 };
  for (const { record, payload } of opened) {
    data.records.set(record.id, record);
    const entry = parseEntry(record, payload);
    if (entry === undefined) {
      data.unreadable += 1;
    } else {
      data.entries.push(entry);
    }
  }
  data.entries.sort((a, b) => b.date.localeCompare(a.date) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  return data;
}

export function entriesOnDay(entries: readonly DiaryEntry[], date: string): DiaryEntry[] {
  return entries.filter((entry) => entry.date === date);
}

export async function loadDiary(context: AuthedContext): Promise<DiaryData> {
  const records = await feedDiary(context);
  const opened: { record: SealedRecord; payload: unknown | undefined }[] = new Array(records.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(DIARY_OPEN_CONCURRENCY, records.length) }, async () => {
    while (next < records.length) {
      const index = next++;
      const record = records[index];
      try {
        opened[index] = { record, payload: await openRecord(context, 'diary', record) };
      } catch {
        opened[index] = { record, payload: undefined };
      }
    }
  });
  await Promise.all(workers);
  return arrangeDiary(opened);
}

export async function saveEntry(
  context: AuthedContext,
  input: { date: string; text: string },
  target?: SealedRecord,
): Promise<SealedRecord> {
  const payload = entryPayload(input);
  if (target !== undefined) {
    return updateRecord(context, 'diary', target, payload);
  }
  return (await createRecord(context, 'diary', payload)).record;
}

export async function removeEntries(context: AuthedContext, ids: readonly string[]): Promise<void> {
  await deleteRecords(context, 'diary', ids);
}
