'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PRIVATE_TEXT_PROPS } from '@/lib/app';
import { dayTitle, localDate, monthTitle, shortDayTitle } from '@/lib/calendar';
import { entriesOnDay, loadDiary, removeEntries, saveEntry, type DiaryData, type DiaryEntry } from '@/lib/diary';
import type { SealedRecord } from '@/lib/records';
import { useFeedChanges } from '@/components/session/useFeed';
import { useAuthedContext, useZekke } from '@/components/session/ZekkeProvider';
import { Button, Empty, Notice, Spinner } from '@/components/ui';
import { ArrowLeftIcon, DiaryIcon, PlusIcon, TrashIcon } from '@/components/ui/icons';
import { ConfirmDeleteModal } from '@/components/modal';

export const AUTOSAVE_DELAY_MS = 800;

type View = { mode: 'list' } | { mode: 'entry'; date: string; id?: string };

export default function DiaryScreen() {
  const context = useAuthedContext();
  const { reportError } = useZekke();
  const [data, setData] = useState<DiaryData>();
  const [view, setView] = useState<View>({ mode: 'list' });
  const [message, setMessage] = useState<string>();

  const load = useCallback(async () => {
    try {
      setData(await loadDiary(context));
    } catch (error) {
      setMessage(reportError(error));
      setData((current) => current ?? { entries: [], records: new Map(), unreadable: 0 });
    }
  }, [context, reportError]);

  useEffect(() => {
    void load();
  }, [load]);

  useFeedChanges('diary', load);

  const today = localDate(new Date());

  if (data === undefined) {
    return <Spinner />;
  }

  if (view.mode === 'entry') {
    const entry = view.id === undefined ? undefined : data.entries.find((candidate) => candidate.id === view.id);
    return (
      <EntryEditor
        key={view.id ?? `new:${view.date}`}
        date={view.date}
        entry={entry}
        record={view.id === undefined ? undefined : data.records.get(view.id)}
        onBack={() => {
          setView({ mode: 'list' });
          void load();
        }}
      />
    );
  }

  function write() {
    const first = entriesOnDay(data?.entries ?? [], today)[0];
    setView(first === undefined ? { mode: 'entry', date: today } : { mode: 'entry', date: today, id: first.id });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-compact text-ink-muted">Only you can read it.</p>
        <Button onClick={write}>
          <PlusIcon />
          Write
        </Button>
      </div>

      {message === undefined ? null : (
        <Notice tone="danger" onDismiss={() => setMessage(undefined)}>
          {message}
        </Notice>
      )}
      {data.unreadable > 0 ? (
        <Notice tone="warning">
          {data.unreadable} {data.unreadable === 1 ? 'entry' : 'entries'} could not be read on this device and {data.unreadable === 1 ? 'is' : 'are'} not shown.
        </Notice>
      ) : null}

      <button
        type="button"
        onClick={write}
        className="flex w-full flex-col items-start gap-1 rounded-3xl border border-line bg-surface p-5 text-left shadow-raised transition hover:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
      >
        <span className="text-sm font-extrabold uppercase tracking-wider text-brand-700">Today · {dayTitle(today)}</span>
        <span className="text-xl font-black text-ink">How was your day?</span>
        <span className="text-compact text-ink-muted">Only you can read your diary.</span>
      </button>

      {data.entries.length === 0 ? (
        <Empty icon={<DiaryIcon />}>Nothing written yet. Your entries are encrypted on this device before they are stored.</Empty>
      ) : (
        <EntryList entries={data.entries} onOpen={(entry) => setView({ mode: 'entry', date: entry.date, id: entry.id })} />
      )}
    </div>
  );
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function EntryList({ entries, onOpen }: { entries: DiaryEntry[]; onOpen: (entry: DiaryEntry) => void }) {
  const groups = useMemo(() => {
    const byMonth = new Map<string, DiaryEntry[]>();
    for (const entry of entries) {
      byMonth.set(monthKey(entry.date), [...(byMonth.get(monthKey(entry.date)) ?? []), entry]);
    }
    return [...byMonth.entries()];
  }, [entries]);

  return (
    <div className="space-y-6">
      {groups.map(([key, month]) => (
        <section key={key} aria-label={monthTitle(Number(key.slice(0, 4)), Number(key.slice(5, 7)))}>
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wider text-ink-muted">
            {monthTitle(Number(key.slice(0, 4)), Number(key.slice(5, 7)))}
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface shadow-raised">
            {month.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => onOpen(entry)}
                  className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
                >
                  <span className="w-14 shrink-0 text-center">
                    <span className="block text-2xl font-black text-ink">{Number(entry.date.slice(8, 10))}</span>
                    <span className="block text-compact text-ink-muted">{shortDayTitle(entry.date).split(' ')[0].replace(',', '')}</span>
                  </span>
                  <span className="line-clamp-3 min-w-0 flex-1 whitespace-pre-line text-ink">{entry.text || 'An empty entry'}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function EntryEditor({ date, entry, record, onBack }: { date: string; entry: DiaryEntry | undefined; record: SealedRecord | undefined; onBack: () => void }) {
  const context = useAuthedContext();
  const { reportError } = useZekke();
  const [text, setText] = useState(entry?.text ?? '');
  const [status, setStatus] = useState<'saved' | 'saving' | 'unsaved'>(entry === undefined ? 'unsaved' : 'saved');
  const [message, setMessage] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const saved = useRef({ text: entry?.text ?? '', record });
  const inFlight = useRef<Promise<void>>(Promise.resolve());
  const [deleting, setDeleting] = useState(false);

  const save = useCallback(
    (next: string) => {
      inFlight.current = inFlight.current.then(async () => {
        if (next === saved.current.text || (saved.current.record === undefined && next.trim() === '')) {
          setStatus('saved');
          return;
        }
        setStatus('saving');
        try {
          const stored = await saveEntry(context, { date, text: next }, saved.current.record);
          saved.current = { text: next, record: stored };
          setStatus('saved');
          setMessage(undefined);
        } catch (error) {
          setStatus('unsaved');
          setMessage(reportError(error));
        }
      });
      return inFlight.current;
    },
    [context, date, reportError],
  );

  useEffect(() => {
    if (text === saved.current.text) {
      return undefined;
    }
    setStatus('unsaved');
    const timer = setTimeout(() => void save(text), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, save]);

  async function back() {
    await save(text);
    onBack();
  }

  async function remove() {
    const target = saved.current.record;
    if (target === undefined) {
      onBack();
      return;
    }
    setDeleting(true);
    try {
      await inFlight.current;
      await removeEntries(context, [saved.current.record?.id ?? target.id]);
      onBack();
    } catch (error) {
      setMessage(reportError(error));
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => void back()}>
          <ArrowLeftIcon />
          Back
        </Button>
        <span className="text-compact font-extrabold text-ink-muted" role="status">
          {status === 'saved' ? 'Saved' : status === 'saving' ? 'Saving…' : 'Not saved yet'}
        </span>
      </div>
      <h2 className="text-2xl font-black text-ink">{dayTitle(date)}</h2>
      {message === undefined ? null : (
        <Notice tone="danger" onDismiss={() => setMessage(undefined)}>
          {message}
        </Notice>
      )}
      <label className="block">
        <span className="sr-only">Diary text</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          autoFocus
          {...PRIVATE_TEXT_PROPS}
          rows={14}
          placeholder="How was your day?"
          className="w-full resize-y rounded-3xl border-2 border-line bg-surface p-5 text-base font-semibold text-ink outline-none transition-all placeholder:text-ink-faint focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </label>
      {saved.current.record === undefined ? null : (
        <Button variant="danger" onClick={() => setConfirming(true)}>
          <TrashIcon />
          Delete this entry
        </Button>
      )}
      {confirming ? (
        <ConfirmDeleteModal title="Delete this entry?" confirmLabel="Delete" busy={deleting} onKeep={() => setConfirming(false)} onConfirm={() => void remove()}>
          The entry is deleted from every device and cannot be brought back.
        </ConfirmDeleteModal>
      ) : null}
    </div>
  );
}
