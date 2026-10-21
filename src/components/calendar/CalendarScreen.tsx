'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  WEEKDAY_INITIALS,
  cancelOccurrence,
  dayTitle,
  daysWithOccurrences,
  editOccurrence,
  editSeries,
  exportIcs,
  expandEvents,
  formForOccurrence,
  gridRange,
  importIcs,
  inputOf,
  loadCalendar,
  localDate,
  monthGrid,
  monthTitle,
  occurrenceTimes,
  occurrencesOn,
  orderAfterLast,
  removeCalendarItems,
  saveEvent,
  saveTask,
  shiftMonth,
  blankEventForm,
  type CalendarData,
  type CalendarEvent,
  type EventForm,
  type EventInput,
  type IcsImport,
  type Occurrence,
  type RecurringScope,
} from '@/lib/calendar';
import { activeRegional } from '@/lib/regional';
import { useFeedChanges } from '@/components/session/useFeed';
import { useAuthedContext, useZekke } from '@/components/session/ZekkeProvider';
import { Button, Empty, IconButton, Notice, Spinner } from '@/components/ui';
import { ArrowLeftIcon, CalendarIcon, PlusIcon, UploadIcon, DownloadIcon } from '@/components/ui/icons';
import { ConfirmDeleteModal, Modal } from '@/components/modal';
import { ModalActions } from '@/components/modal/ModalActions';
import { EventModal } from './EventModal';
import { ScopeModal } from './ScopeModal';
import { useReminderPermission } from './useReminders';

type Editor =
  | { mode: 'new'; form: EventForm }
  | { mode: 'edit'; occurrence: Occurrence; event: CalendarEvent; form: EventForm };

type Pending =
  | { kind: 'save'; occurrence: Occurrence; event: CalendarEvent; input: EventInput }
  | { kind: 'delete'; occurrence: Occurrence; event: CalendarEvent };

function deviceZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export default function CalendarScreen() {
  const context = useAuthedContext();
  const { reportError } = useZekke();
  const timeZone = useMemo(deviceZone, []);
  const regional = activeRegional();

  const [data, setData] = useState<CalendarData>();
  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [selected, setSelected] = useState(() => localDate(new Date()));
  const [editor, setEditor] = useState<Editor>();
  const [pending, setPending] = useState<Pending>();
  const [importing, setImporting] = useState<IcsImport>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);
  const [permission, requestPermission] = useReminderPermission();

  const load = useCallback(async () => {
    try {
      setData(await loadCalendar(context));
    } catch (error) {
      setMessage(reportError(error));
      setData((current) => current ?? { events: [], tasks: [], lists: [], records: new Map(), unreadable: 0 });
    }
  }, [context, reportError]);

  useEffect(() => {
    void load();
  }, [load]);

  useFeedChanges('calendar', load);

  const grid = useMemo(() => monthGrid(view.year, view.month), [view]);
  const range = useMemo(() => gridRange(grid), [grid]);
  const occurrences = useMemo(
    () => (data === undefined ? [] : expandEvents(data.events, range.from, range.to, timeZone)),
    [data, range, timeZone],
  );
  const busyDays = useMemo(() => daysWithOccurrences(occurrences), [occurrences]);
  const agenda = useMemo(() => occurrencesOn(occurrences, selected), [occurrences, selected]);
  const today = localDate(new Date());

  function go(delta: number) {
    setView((current) => shiftMonth(current.year, current.month, delta));
  }

  function backToToday() {
    const now = new Date();
    setView({ year: now.getFullYear(), month: now.getMonth() + 1 });
    setSelected(localDate(now));
  }

  function openNew() {
    setEditor({ mode: 'new', form: blankEventForm(selected, new Date()) });
  }

  function openOccurrence(occurrence: Occurrence) {
    const event = data?.events.find((candidate) => candidate.id === occurrence.eventId);
    if (event !== undefined) {
      setEditor({ mode: 'edit', occurrence, event, form: formForOccurrence(occurrence, event) });
    }
  }

  async function finishSave(input: EventInput, target?: CalendarEvent) {
    setBusy(true);
    try {
      await saveEvent(context, input, target === undefined ? undefined : data?.records.get(target.id));
      setEditor(undefined);
      setPending(undefined);
      await load();
      setMessage(undefined);
    } catch (error) {
      setMessage(reportError(error));
    } finally {
      setBusy(false);
    }
  }

  function onSave(input: EventInput) {
    if (editor === undefined) {
      return;
    }
    if (editor.mode === 'new') {
      void finishSave(input);
      return;
    }
    if (editor.event.recurrence === undefined) {
      void finishSave(input, editor.event);
      return;
    }
    setPending({ kind: 'save', occurrence: editor.occurrence, event: editor.event, input });
  }

  async function chooseSave(scope: RecurringScope) {
    if (pending?.kind !== 'save') {
      return;
    }
    const { event, occurrence, input } = pending;
    await finishSave(scope === 'all' ? editSeries(event, occurrence.originalDate, input) : editOccurrence(event, occurrence.originalDate, input), event);
  }

  async function removeEvent(event: CalendarEvent, scope: RecurringScope | 'one', occurrence: Occurrence) {
    setBusy(true);
    try {
      if (scope === 'this') {
        await saveEvent(context, cancelOccurrence(event, occurrence.originalDate), data?.records.get(event.id));
      } else {
        await removeCalendarItems(context, [event.id]);
      }
      setEditor(undefined);
      setPending(undefined);
      await load();
      setMessage(undefined);
    } catch (error) {
      setMessage(reportError(error));
    } finally {
      setBusy(false);
    }
  }

  async function chooseFile(file: File | undefined) {
    if (file === undefined) {
      return;
    }
    try {
      setImporting(importIcs(await file.text(), timeZone));
    } catch (error) {
      setMessage(reportError(error));
    }
  }

  async function confirmImport() {
    if (importing === undefined || data === undefined) {
      return;
    }
    setBusy(true);
    try {
      for (const { overrides, ...event } of importing.events) {
        await saveEvent(context, { ...event, overrides });
      }
      const siblings = [...data.tasks];
      for (const task of importing.tasks) {
        const order = orderAfterLast(siblings);
        siblings.push({ id: '', title: task.title, notes: task.notes, listId: undefined, due: task.due, doneAt: task.done ? Date.now() : undefined, order, reminders: task.reminders });
        await saveTask(context, { title: task.title, notes: task.notes, due: task.due, doneAt: task.done ? Date.now() : undefined, order, reminders: task.reminders });
      }
      setImporting(undefined);
      await load();
    } catch (error) {
      setMessage(reportError(error));
    } finally {
      setBusy(false);
    }
  }

  function exportFile() {
    if (data === undefined) {
      return;
    }
    const text = exportIcs(data.events, data.tasks, Date.now());
    const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'zekke-calendar.ics';
    link.click();
    URL.revokeObjectURL(url);
  }

  if (data === undefined) {
    return <Spinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-compact text-ink-muted">Events and reminders, locked in this browser.</p>
        <div className="flex flex-wrap items-center gap-2">
          {permission === 'default' ? (
            <Button variant="secondary" onClick={() => void requestPermission()}>
              Turn on reminders
            </Button>
          ) : null}
          <IconButton label="Import a calendar file" onClick={() => fileInput.current?.click()}>
            <UploadIcon />
          </IconButton>
          <IconButton label="Export as a calendar file" onClick={exportFile}>
            <DownloadIcon />
          </IconButton>
          <Button onClick={openNew}>
            <PlusIcon />
            New event
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".ics,text/calendar"
            className="hidden"
            onChange={(event) => {
              void chooseFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>
      </div>

      {permission === 'denied' ? (
        <Notice tone="info">Reminders are blocked for this site. Allow notifications in your browser to turn them on.</Notice>
      ) : null}
      {permission === 'granted' ? (
        <Notice tone="info">
          Reminders fire while Zekke is open in this browser and say only that you have an event. They cannot fire while it is closed or locked.
        </Notice>
      ) : null}
      {data.unreadable > 0 ? (
        <Notice tone="warning">
          {data.unreadable} {data.unreadable === 1 ? 'item' : 'items'} could not be read on this device and {data.unreadable === 1 ? 'is' : 'are'} not shown.
        </Notice>
      ) : null}
      {message === undefined ? null : (
        <Notice tone="danger" onDismiss={() => setMessage(undefined)}>
          {message}
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="rounded-3xl border border-line bg-surface p-5 shadow-raised lg:col-span-3" aria-label="Month">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black text-ink">{monthTitle(view.year, view.month)}</h2>
            <div className="flex items-center gap-1">
              <Button variant="ghost" onClick={backToToday}>
                Today
              </Button>
              <IconButton label="Previous month" onClick={() => go(-1)}>
                <ArrowLeftIcon />
              </IconButton>
              <IconButton label="Next month" onClick={() => go(1)}>
                <ArrowLeftIcon className="h-5 w-5 rotate-180" />
              </IconButton>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_INITIALS.map((initial, index) => (
              <span key={index} className="py-1.5 text-compact font-extrabold text-ink-muted">
                {initial}
              </span>
            ))}
            {grid.flat().map((cell) => {
              const isSelected = cell.date === selected;
              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => setSelected(cell.date)}
                  aria-label={dayTitle(cell.date)}
                  aria-pressed={isSelected}
                  className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-base font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 ${
                    isSelected ? 'bg-brand-500 text-on-brand' : cell.date === today ? 'bg-brand-100 text-ink' : cell.inMonth ? 'text-ink hover:bg-brand-50' : 'text-ink-faint hover:bg-brand-50'
                  }`}
                >
                  {Number(cell.date.slice(8, 10))}
                  {busyDays.has(cell.date) ? <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-on-brand' : 'bg-brand-500'}`} /> : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-surface p-5 shadow-raised lg:col-span-2" aria-label="Agenda">
          <h2 className="text-xl font-black text-ink">{dayTitle(selected)}</h2>
          <p className="mb-4 text-compact text-ink-muted">{agenda.length === 1 ? '1 event' : `${agenda.length} events`}</p>
          {agenda.length === 0 ? (
            <Empty icon={<CalendarIcon />}>Nothing planned for this day.</Empty>
          ) : (
            <ul className="space-y-2">
              {agenda.map((occurrence) => (
                <li key={`${occurrence.eventId}:${occurrence.originalDate}`}>
                  <button
                    type="button"
                    onClick={() => openOccurrence(occurrence)}
                    className="flex w-full flex-col items-start rounded-2xl border-l-4 border-brand-500 bg-brand-50 px-4 py-3 text-left transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
                  >
                    <span className="font-extrabold text-ink">{occurrence.title || 'Untitled event'}</span>
                    <span className="text-compact text-ink-muted">{occurrenceTimes(occurrence, regional)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <Button variant="secondary" onClick={openNew}>
              <PlusIcon />
              New event
            </Button>
          </div>
        </section>
      </div>

      {editor === undefined ? null : (
        <>
          <EventModal
            title={editor.mode === 'new' ? 'New event' : 'Edit event'}
            initial={editor.form}
            timeZone={timeZone}
            previous={editor.mode === 'edit' ? inputOf(editor.event) : undefined}
            busy={busy}
            onClose={() => setEditor(undefined)}
            onSave={onSave}
            onDelete={
              editor.mode === 'edit'
                ? () => setPending({ kind: 'delete', occurrence: editor.occurrence, event: editor.event })
                : undefined
            }
          />
        </>
      )}

      {pending?.kind === 'save' ? (
        <ScopeModal title="Change a repeating event" confirmLabel="Save" busy={busy} onClose={() => setPending(undefined)} onChoose={(scope) => void chooseSave(scope)} />
      ) : null}

      {pending?.kind === 'delete' && pending.event.recurrence !== undefined ? (
        <ScopeModal
          title="Delete a repeating event"
          confirmLabel="Delete"
          danger
          busy={busy}
          onClose={() => setPending(undefined)}
          onChoose={(scope) => void removeEvent(pending.event, scope, pending.occurrence)}
        />
      ) : null}

      {pending?.kind === 'delete' && pending.event.recurrence === undefined ? (
        <ConfirmDeleteModal
          title="Delete this event?"
          confirmLabel="Delete"
          busy={busy}
          onKeep={() => setPending(undefined)}
          onConfirm={() => void removeEvent(pending.event, 'one', pending.occurrence)}
        >
          “{pending.occurrence.title}” is deleted from every device and cannot be brought back.
        </ConfirmDeleteModal>
      ) : null}

      {importing === undefined ? null : (
        <Modal
          title="Import a calendar file"
          subtitle="Read on this device. Nothing leaves it unencrypted."
          onClose={() => setImporting(undefined)}
          footer={
            <ModalActions busy={busy} onCancel={() => setImporting(undefined)}>
              <Button disabled={busy || importing.events.length + importing.tasks.length === 0} onClick={() => void confirmImport()}>
                Import
              </Button>
            </ModalActions>
          }
        >
          <ImportReport report={importing} />
        </Modal>
      )}
    </div>
  );
}

function ImportReport({ report }: { report: IcsImport }) {
  return (
    <div className="space-y-3 text-compact text-ink">
      <p>
        {report.events.length} {report.events.length === 1 ? 'event' : 'events'} and {report.tasks.length} {report.tasks.length === 1 ? 'task' : 'tasks'} can be imported.
      </p>
      {report.skipped.length === 0 ? null : (
        <Notice tone="warning">
          <p className="font-extrabold">Left behind ({report.skipped.length}):</p>
          <ul className="mt-1 list-disc pl-5">
            {report.skipped.slice(0, 20).map((item, index) => (
              <li key={index}>
                {item.summary === '' ? 'The file' : `“${item.summary}”`}: {item.reason}.
              </li>
            ))}
          </ul>
        </Notice>
      )}
    </div>
  );
}
