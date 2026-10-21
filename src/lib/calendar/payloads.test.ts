import { describe, expect, it } from 'vitest';
import fixture from '@/test/fixtures/calendar-payloads.json';
import { entryPayload, parseEntry } from '@/lib/diary';
import {
  MAX_LOCATION_CHARACTERS,
  MAX_NOTES_CHARACTERS,
  MAX_OVERRIDES,
  MAX_PAYLOAD_BYTES,
  MAX_REMINDERS,
  MAX_REMINDER_MINUTES,
  MAX_TITLE_CHARACTERS,
  eventPayload,
  expandEvents,
  orderBetween,
  parseEvent,
  parseList,
  parseTask,
} from './index';
import { MAX_LIST_NAME_CHARACTERS, taskPayload } from './tasks';
import { MAX_ENTRY_CHARACTERS } from '@/lib/diary';

const sealed = { id: 'abcdefghij', ciphertext: 'c', wrapped_dek: 'w', key_generation: 1, version: 'v1', created_at: '2026-10-18T09:00:00Z', updated_at: '2026-10-18T09:00:00Z' };

describe('the shared payload fixture', () => {
  it('pins the limits the clients enforce', () => {
    expect(fixture.limits).toEqual({
      max_payload_bytes: MAX_PAYLOAD_BYTES,
      max_title_characters: MAX_TITLE_CHARACTERS,
      max_notes_characters: MAX_NOTES_CHARACTERS,
      max_location_characters: MAX_LOCATION_CHARACTERS,
      max_reminders: MAX_REMINDERS,
      max_reminder_minutes: MAX_REMINDER_MINUTES,
      max_overrides: MAX_OVERRIDES,
      max_list_name_characters: MAX_LIST_NAME_CHARACTERS,
      max_diary_characters: MAX_ENTRY_CHARACTERS,
    });
  });

  it('reads the recurring event and expands the same occurrences', () => {
    const event = parseEvent('abcdefghij', fixture.event.payload);
    expect(event).toBeDefined();
    const occurrences = expandEvents([event!], '2026-10-01', '2026-10-31', 'America/Sao_Paulo');
    expect(
      occurrences.map((o) => ({ original_date: o.originalDate, title: o.title, start: (o.start as { dateTime: string }).dateTime })),
    ).toEqual(fixture.event.occurrences_2026_10);
  });

  it('writes the payloads byte for byte as the fixture has them', () => {
    const event = parseEvent('abcdefghij', fixture.event.payload)!;
    expect(JSON.parse(JSON.stringify(eventPayload({ ...event })))).toEqual(fixture.event.payload);
    const trip = parseEvent('abcdefghij', fixture.event_all_day.payload)!;
    expect(JSON.parse(JSON.stringify(eventPayload({ ...trip })))).toEqual(fixture.event_all_day.payload);
    const task = parseTask('abcdefghij', fixture.task.payload)!;
    expect(JSON.parse(JSON.stringify(taskPayload({ ...task, listId: task.listId })))).toEqual(fixture.task.payload);
    const done = parseTask('abcdefghij', fixture.task.done_payload)!;
    expect(done.doneAt).toBe(1790000000000);
    expect(JSON.parse(JSON.stringify(taskPayload({ ...done })))).toEqual(fixture.task.done_payload);
    expect(parseList('listaaaaaa', fixture.list.payload)).toEqual({ id: 'listaaaaaa', name: 'Home', order: 'V' });
    expect(entryPayload({ date: '2026-10-18', text: 'Long walk by the river.' })).toEqual(fixture.diary_entry.payload);
    expect(parseEntry(sealed, fixture.diary_entry.payload)).toMatchObject({ date: '2026-10-18', text: 'Long walk by the river.' });
  });

  it('reads an all-day event as ending the day before its exclusive end', () => {
    const trip = parseEvent('abcdefghij', fixture.event_all_day.payload)!;
    expect(expandEvents([trip], '2026-10-12', '2026-10-12', 'UTC')).toHaveLength(1);
    expect(expandEvents([trip], '2026-10-13', '2026-10-13', 'UTC')).toHaveLength(0);
  });

  it('computes the order keys the fixture lists', () => {
    for (const { before, after, key } of fixture.order_keys.between) {
      expect(orderBetween(before ?? undefined, after ?? undefined)).toBe(key);
    }
  });

  it('refuses everything the fixture says to refuse', () => {
    for (const item of fixture.refused) {
      const payload = item.payload as Record<string, unknown>;
      if (item.type === 'event') {
        expect(parseEvent('abcdefghij', payload), item.reason).toBeUndefined();
      } else if (item.type === 'task') {
        expect(parseTask('abcdefghij', payload), item.reason).toBeUndefined();
      } else {
        expect(parseEntry(sealed, payload), item.reason).toBeUndefined();
      }
    }
  });
});
