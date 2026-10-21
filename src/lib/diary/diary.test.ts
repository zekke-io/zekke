import { describe, expect, it } from 'vitest';
import type { SealedRecord } from '@/lib/records';
import { arrangeDiary, entriesOnDay, entryPayload, parseEntry, MAX_ENTRY_CHARACTERS } from './index';

function record(id: string, createdAt: string): SealedRecord {
  return { id, ciphertext: 'c', wrapped_dek: 'w', key_generation: 1, version: 'v1', created_at: createdAt, updated_at: createdAt };
}

describe('diary entries', () => {
  it('round-trips a payload and keeps the date inside it', () => {
    const payload = entryPayload({ date: '2026-10-18', text: 'Long walk by the river.' });
    expect(payload).toMatchObject({ version: 1, type: 'entry', date: '2026-10-18' });
    const entry = parseEntry(record('abcdefghij', '2026-10-18T09:00:00Z'), JSON.parse(JSON.stringify(payload)));
    expect(entry).toMatchObject({ id: 'abcdefghij', date: '2026-10-18', text: 'Long walk by the river.' });
  });

  it('refuses an impossible date and a text over the limit, and accepts one at it', () => {
    expect(() => entryPayload({ date: '2026-02-30', text: 'x' })).toThrow(RangeError);
    expect(() => entryPayload({ date: '2026-10-18', text: 'x'.repeat(MAX_ENTRY_CHARACTERS + 1) })).toThrow(RangeError);
    expect(() => entryPayload({ date: '2026-10-18', text: '𝒳'.repeat(MAX_ENTRY_CHARACTERS) })).not.toThrow();
    expect(() => entryPayload({ date: '2026-10-18', text: 'x'.repeat(MAX_ENTRY_CHARACTERS) })).not.toThrow();
  });

  it('ignores payloads of another kind or version, or written badly', () => {
    const r = record('abcdefghij', '2026-10-18T09:00:00Z');
    expect(parseEntry(r, { version: 2, type: 'entry', date: '2026-10-18', text: '' })).toBeUndefined();
    expect(parseEntry(r, { version: 1, type: 'event' })).toBeUndefined();
    expect(parseEntry(r, { version: 1, type: 'entry', date: 'nope', text: '' })).toBeUndefined();
    expect(parseEntry(r, { version: 1, type: 'entry', date: '2026-10-18' })).toBeUndefined();
    expect(parseEntry(r, null)).toBeUndefined();
  });

  it('lists newest days first, and two entries of one day in the order they were written', () => {
    const data = arrangeDiary([
      { record: record('aaaaaaaaaa', '2026-10-15T08:00:00Z'), payload: entryPayload({ date: '2026-10-15', text: 'old' }) },
      { record: record('cccccccccc', '2026-10-18T20:00:00Z'), payload: entryPayload({ date: '2026-10-18', text: 'evening' }) },
      { record: record('bbbbbbbbbb', '2026-10-18T08:00:00Z'), payload: entryPayload({ date: '2026-10-18', text: 'morning' }) },
      { record: record('dddddddddd', '2026-10-19T08:00:00Z'), payload: undefined },
    ]);
    expect(data.entries.map((entry) => entry.text)).toEqual(['morning', 'evening', 'old']);
    expect(data.unreadable).toBe(1);
    expect(entriesOnDay(data.entries, '2026-10-18')).toHaveLength(2);
  });
});
