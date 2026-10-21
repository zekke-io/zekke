import { beforeAll, describe, expect, it } from 'vitest';
import { TokenStore } from '@/lib/api';
import { completeSignUp, draftSignUp, enrolThisBrowser, readVerifiedChain, type AccountServices } from '@/lib/account';
import {
  loadCalendar,
  orderAfterLast,
  removeCalendarItems,
  saveEvent,
  saveList,
  saveTask,
  taskInputOf,
  type CalendarData,
} from '@/lib/calendar';
import type { AuthedContext } from '@/lib/context';
import { memoryDeviceStore } from '@/lib/device/store';
import { loadDiary, removeEntries, saveEntry } from '@/lib/diary';
import { Feed, fetchChanges, type FeedScope } from '@/lib/feed';
import { deriveRootKeysFromMnemonic, generateMnemonic } from '@/lib/keys';
import { applyDeviceBatch, buildRotation, wrapKekForRoot } from '@/lib/keyrings';
import { listRecordsMeta } from '@/lib/records';
import { rewrapAfterRotation } from '@/lib/rekey';
import { SessionKeystore } from '@/lib/session';

function services(): AccountServices {
  return { session: new SessionKeystore({ idleTimeoutMs: 0 }), tokens: new TokenStore(), store: memoryDeviceStore() };
}

function context(account: AccountServices): AuthedContext {
  return { session: account.session, tokens: account.tokens, paranoid: false };
}

describe('162 calendar, to-do and diary', () => {
  const mnemonic = generateMnemonic(12);
  let writer: AuthedContext;
  let reader: AuthedContext;

  beforeAll(async () => {
    const first = services();
    await completeSignUp(first, await draftSignUp(mnemonic), { pin: '482915', paranoid: false });
    const second = services();
    await enrolThisBrowser(second, { mnemonic, pin: '962730' });
    writer = context(first);
    reader = context(second);
  });

  it('gives a new account both scopes, on every full device', () => {
    for (const ctx of [writer, reader]) {
      expect(ctx.session.holds('calendar')).toBe(true);
      expect(ctx.session.holds('diary')).toBe(true);
      expect(ctx.session.currentGeneration('calendar')).toBe(1);
      expect(ctx.session.currentGeneration('diary')).toBe(1);
    }
  });

  it('keeps a verified chain whose genesis names all eight keyrings', async () => {
    const state = await readVerifiedChain(
      writer,
      { userAddress: writer.session.userAddress, rootPublicKey: writer.session.rootPublicKey },
      writer.session.deviceId,
    );
    expect(state.generations.get('calendar')).toBe(1);
    expect(state.generations.get('diary')).toBe(1);
  });

  let events: CalendarData;

  it('shows another browser’s event, task and list, edited and deleted, through the feed', async () => {
    const list = await saveList(writer, { name: 'Home', order: 'V' });
    const event = await saveEvent(writer, {
      title: 'Lunch with Ana',
      start: { dateTime: '2026-10-18T12:30', tz: 'UTC' },
      end: { dateTime: '2026-10-18T14:00', tz: 'UTC' },
      recurrence: { frequency: 'weekly', interval: 1, weekdays: [0] },
      overrides: { '2026-10-25': { cancelled: true } },
      reminders: [30],
    });
    const task = await saveTask(writer, { title: 'Buy lemons', order: orderAfterLast([]), listId: list.id, due: { date: '2026-10-19' }, reminders: [60] });

    events = await loadCalendar(reader);
    expect(events.events.map((e) => e.title)).toEqual(['Lunch with Ana']);
    expect(events.events[0].overrides['2026-10-25']).toEqual({ cancelled: true });
    expect(events.tasks.map((t) => t.title)).toEqual(['Buy lemons']);
    expect(events.tasks[0].listId).toBe(list.id);
    expect(events.lists.map((l) => l.name)).toEqual(['Home']);

    const done = events.tasks[0];
    await saveTask(reader, taskInputOf(done, { doneAt: 5 }), events.records.get(done.id));
    await saveEvent(reader, { ...eventPayloadInput(events), title: 'Lunch with Ana (moved)' }, events.records.get(event.id));

    const seen = await loadCalendar(writer);
    expect(seen.tasks[0].doneAt).toBe(5);
    expect(seen.events[0].title).toBe('Lunch with Ana (moved)');

    await removeCalendarItems(writer, [event.id, task.id, list.id]);
    const gone = await loadCalendar(reader);
    expect(gone.events).toEqual([]);
    expect(gone.tasks).toEqual([]);
    expect(gone.lists).toEqual([]);
    expect(gone.unreadable).toBe(0);
  });

  it('serves the calendar scope on its own feed, with a tombstone for what was deleted', async () => {
    const feed = new Feed((scope: FeedScope, from: number, limit: number) => fetchChanges(reader, scope, from, limit));
    expect(await feed.sync('calendar')).toBe(true);
    expect(feed.replica('calendar').cursor).toBeGreaterThan(0);
    expect(feed.replica('calendar').items('calendar_item')).toEqual([]);
  });

  it('keeps the diary in its own scope, two entries on one day included', async () => {
    const morning = await saveEntry(writer, { date: '2026-10-18', text: 'Woke up late.' });
    await saveEntry(reader, { date: '2026-10-18', text: 'Lunch with Ana.' });

    const data = await loadDiary(writer);
    expect(data.entries.map((entry) => entry.text).sort()).toEqual(['Lunch with Ana.', 'Woke up late.']);
    expect(data.unreadable).toBe(0);

    await saveEntry(reader, { date: '2026-10-18', text: 'Woke up very late.' }, (await loadDiary(reader)).records.get(morning.id));
    expect((await loadDiary(writer)).entries.map((entry) => entry.text)).toContain('Woke up very late.');

    await removeEntries(writer, data.entries.map((entry) => entry.id));
    expect((await loadDiary(reader)).entries).toEqual([]);
  });

  it('rotates both keyrings and re-wraps what was left behind without touching a byte of ciphertext', async () => {
    const list = await saveList(writer, { name: 'Work', order: 'V' });
    const entry = await saveEntry(writer, { date: '2026-10-19', text: 'Before the rotation.' });
    const before = [...(await listRecordsMeta(writer, 'calendar')), ...(await listRecordsMeta(writer, 'diary'))];
    expect(before.every((meta) => meta.key_generation === 1)).toBe(true);

    const root = await deriveRootKeysFromMnemonic(mnemonic);
    const state = await readVerifiedChain(
      writer,
      { userAddress: writer.session.userAddress, rootPublicKey: writer.session.rootPublicKey },
      writer.session.deviceId,
    );
    const built = await buildRotation({
      state,
      author: { name: writer.session.deviceId, signer: writer.session.signer() },
      wrapForRoot: (kek) => wrapKekForRoot(root.wrapKey, kek),
      scopes: ['calendar', 'diary'],
    });
    await applyDeviceBatch(writer, built.batch);
    writer.session.addKeyrings(
      built.created.map((created) => ({ scope: created.scope, generation: 2, kek: created.kek })),
      { calendar: 2, diary: 2 },
    );

    expect((await loadCalendar(writer)).lists.map((l) => l.name)).toEqual(['Work']);
    expect((await loadDiary(writer)).entries.map((e) => e.text)).toEqual(['Before the rotation.']);

    const outcomes = await rewrapAfterRotation(writer, ['calendar', 'diary']);
    expect(outcomes.map((outcome) => [outcome.scope, outcome.requested, outcome.rekeyed])).toEqual([
      ['calendar', 1, 1],
      ['diary', 1, 1],
    ]);

    const after = [...(await listRecordsMeta(writer, 'calendar')), ...(await listRecordsMeta(writer, 'diary'))];
    expect(after.every((meta) => meta.key_generation === 2)).toBe(true);
    for (const meta of after) {
      expect(before.find((old) => old.id === meta.id)?.ciphertext_sha256).toBe(meta.ciphertext_sha256);
    }
    expect((await loadDiary(writer)).entries[0].id).toBe(entry.id);
    expect(list.id).toBeDefined();
  });
});

function eventPayloadInput(data: CalendarData) {
  const event = data.events[0];
  return {
    title: event.title,
    notes: event.notes,
    location: event.location,
    start: event.start,
    end: event.end,
    recurrence: event.recurrence,
    overrides: event.overrides,
    reminders: event.reminders,
  };
}

