'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  REMINDER_CHOICES,
  WHEN_CHOICES,
  choiceFromDue,
  dueFromChoice,
  dueLabel,
  loadCalendar,
  localDate,
  orderAfterLast,
  orderAtTop,
  orderToMove,
  removeCalendarItems,
  saveList,
  saveTask,
  sortLists,
  taskCountLabel,
  taskInputOf,
  taskSections,
  type CalendarData,
  type Task,
  type TaskFilter,
  type TaskList,
  type WhenChoice,
} from '@/lib/calendar';
import { useFeedChanges } from '@/components/session/useFeed';
import { useAuthedContext, useZekke } from '@/components/session/ZekkeProvider';
import { Button, Empty, Field, IconButton, Notice, Select, Spinner, TextArea } from '@/components/ui';
import { ArrowLeftIcon, CheckIcon, PlusIcon, TaskListIcon, TrashIcon } from '@/components/ui/icons';
import { ConfirmDeleteModal, FormModal } from '@/components/modal';
import { useReminderPermission } from './useReminders';

type TaskEditor = { mode: 'new' } | { mode: 'edit'; task: Task };
type ListEditor = { mode: 'new' } | { mode: 'edit'; list: TaskList };
type Confirming = { kind: 'task'; task: Task } | { kind: 'list'; list: TaskList };

export default function TodoScreen() {
  const context = useAuthedContext();
  const { reportError } = useZekke();
  const [data, setData] = useState<CalendarData>();
  const [filter, setFilter] = useState<TaskFilter>({ kind: 'all' });
  const [taskEditor, setTaskEditor] = useState<TaskEditor>();
  const [listEditor, setListEditor] = useState<ListEditor>();
  const [confirming, setConfirming] = useState<Confirming>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [permission, requestPermission] = useReminderPermission();
  const today = localDate(new Date());

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

  const sections = useMemo(() => (data === undefined ? { todo: [], done: [] } : taskSections(data.tasks, filter, today)), [data, filter, today]);
  const listName = useMemo(() => new Map((data?.lists ?? []).map((list) => [list.id, list.name])), [data]);

  async function run(work: () => Promise<void>) {
    setBusy(true);
    try {
      await work();
      await load();
      setMessage(undefined);
    } catch (error) {
      setMessage(reportError(error));
    } finally {
      setBusy(false);
    }
  }

  const toggle = (task: Task) =>
    run(async () => {
      await saveTask(context, taskInputOf(task, { doneAt: task.doneAt === undefined ? Date.now() : undefined }), data?.records.get(task.id));
    });

  const move = (task: Task, direction: 'up' | 'down') =>
    run(async () => {
      const order = orderToMove(sections.todo, task.id, direction);
      if (order !== undefined) {
        await saveTask(context, taskInputOf(task, { order }), data?.records.get(task.id));
      }
    });

  if (data === undefined) {
    return <Spinner />;
  }

  const activeList = filter.kind === 'list' ? data.lists.find((list) => list.id === filter.id) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-compact text-ink-muted" aria-live="polite">
          {taskCountLabel(data.tasks)}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {permission === 'default' ? (
            <Button variant="secondary" onClick={() => void requestPermission()}>
              Turn on reminders
            </Button>
          ) : null}
          <Button onClick={() => setTaskEditor({ mode: 'new' })}>
            <PlusIcon />
            New task
          </Button>
        </div>
      </div>

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

      <nav aria-label="Lists" className="flex flex-wrap items-center gap-2">
        <FilterChip active={filter.kind === 'all'} onClick={() => setFilter({ kind: 'all' })}>
          All
        </FilterChip>
        <FilterChip active={filter.kind === 'today'} onClick={() => setFilter({ kind: 'today' })}>
          Today
        </FilterChip>
        {data.lists.map((list) => (
          <FilterChip key={list.id} active={filter.kind === 'list' && filter.id === list.id} onClick={() => setFilter({ kind: 'list', id: list.id })}>
            {list.name || 'Untitled list'}
          </FilterChip>
        ))}
        <IconButton label="New list" onClick={() => setListEditor({ mode: 'new' })}>
          <PlusIcon />
        </IconButton>
        {activeList === undefined ? null : (
          <Button variant="ghost" onClick={() => setListEditor({ mode: 'edit', list: activeList })}>
            Rename or delete this list
          </Button>
        )}
      </nav>

      {sections.todo.length === 0 && sections.done.length === 0 ? (
        <Empty icon={<TaskListIcon />}>
          {filter.kind === 'today' ? 'Nothing is due today.' : 'No tasks here yet. Add one with New task.'}
        </Empty>
      ) : (
        <>
          <TaskSection
            title="To do"
            tasks={sections.todo}
            today={today}
            listName={filter.kind === 'list' ? undefined : listName}
            busy={busy}
            onToggle={toggle}
            onOpen={(task) => setTaskEditor({ mode: 'edit', task })}
            onMove={move}
          />
          <TaskSection
            title="Done"
            tasks={sections.done}
            today={today}
            listName={filter.kind === 'list' ? undefined : listName}
            busy={busy}
            onToggle={toggle}
            onOpen={(task) => setTaskEditor({ mode: 'edit', task })}
          />
        </>
      )}

      {taskEditor === undefined ? null : (
        <TaskModal
          editor={taskEditor}
          lists={sortLists(data.lists)}
          defaultList={filter.kind === 'list' ? filter.id : undefined}
          today={today}
          busy={busy}
          onClose={() => setTaskEditor(undefined)}
          onDelete={taskEditor.mode === 'edit' ? () => setConfirming({ kind: 'task', task: taskEditor.task }) : undefined}
          onSave={(input) =>
            run(async () => {
              if (taskEditor.mode === 'new') {
                await saveTask(context, { ...input, order: orderAtTop(data.tasks.filter((task) => task.listId === input.listId)) });
              } else {
                await saveTask(context, { ...taskInputOf(taskEditor.task), ...input, order: taskEditor.task.order }, data.records.get(taskEditor.task.id));
              }
              setTaskEditor(undefined);
            })
          }
        />
      )}

      {listEditor === undefined ? null : (
        <ListModal
          editor={listEditor}
          busy={busy}
          onClose={() => setListEditor(undefined)}
          onDelete={listEditor.mode === 'edit' ? () => setConfirming({ kind: 'list', list: listEditor.list }) : undefined}
          onSave={(name) =>
            run(async () => {
              if (listEditor.mode === 'new') {
                await saveList(context, { name, order: orderAfterLast(data.lists) });
              } else {
                await saveList(context, { name, order: listEditor.list.order }, data.records.get(listEditor.list.id));
              }
              setListEditor(undefined);
            })
          }
        />
      )}

      {confirming?.kind === 'task' ? (
        <ConfirmDeleteModal
          title="Delete this task?"
          confirmLabel="Delete"
          busy={busy}
          onKeep={() => setConfirming(undefined)}
          onConfirm={() =>
            void run(async () => {
              await removeCalendarItems(context, [confirming.task.id]);
              setConfirming(undefined);
              setTaskEditor(undefined);
            })
          }
        >
          “{confirming.task.title}” is deleted from every device and cannot be brought back.
        </ConfirmDeleteModal>
      ) : null}

      {confirming?.kind === 'list' ? (
        <ConfirmDeleteModal
          title="Delete this list?"
          confirmLabel="Delete the list"
          busy={busy}
          onKeep={() => setConfirming(undefined)}
          onConfirm={() =>
            void run(async () => {
              const members = data.tasks.filter((task) => task.listId === confirming.list.id);
              for (const task of members) {
                await saveTask(context, taskInputOf(task, { listId: undefined }), data.records.get(task.id));
              }
              await removeCalendarItems(context, [confirming.list.id]);
              setConfirming(undefined);
              setListEditor(undefined);
              setFilter({ kind: 'all' });
            })
          }
        >
          “{confirming.list.name}” is deleted. Its tasks stay, with no list.
        </ConfirmDeleteModal>
      ) : null}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-compact font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 ${
        active ? 'bg-brand-500 text-on-brand' : 'bg-brand-100 text-ink hover:bg-brand-200'
      }`}
    >
      {children}
    </button>
  );
}

function TaskSection({
  title,
  tasks,
  today,
  listName,
  busy,
  onToggle,
  onOpen,
  onMove,
}: {
  title: string;
  tasks: Task[];
  today: string;
  listName: ReadonlyMap<string, string> | undefined;
  busy: boolean;
  onToggle: (task: Task) => void;
  onOpen: (task: Task) => void;
  onMove?: (task: Task, direction: 'up' | 'down') => void;
}) {
  if (tasks.length === 0) {
    return null;
  }
  return (
    <section aria-label={title}>
      <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wider text-ink-muted">{title}</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface shadow-raised">
        {tasks.map((task, index) => {
          const done = task.doneAt !== undefined;
          const due = dueLabel(task.due === undefined ? undefined : 'date' in task.due ? task.due.date : task.due.dateTime.slice(0, 10), today, done);
          const list = task.listId === undefined ? undefined : listName?.get(task.listId);
          return (
            <li key={task.id} className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={done}
                aria-label={done ? `Mark “${task.title}” as not done` : `Mark “${task.title}” as done`}
                disabled={busy}
                onClick={() => onToggle(task)}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 ${
                  done ? 'border-brand-500 bg-brand-500 text-on-brand' : 'border-ink-faint text-transparent hover:border-brand-500'
                }`}
              >
                <CheckIcon className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50">
                <span className={`block truncate font-extrabold ${done ? 'text-ink-muted line-through' : 'text-ink'}`}>{task.title || 'Untitled task'}</span>
                {due === '' && list === undefined ? null : (
                  <span className={`block text-compact ${due.includes('overdue') ? 'text-danger' : 'text-ink-muted'}`}>
                    {[due, list].filter((part) => part !== undefined && part !== '').join(' · ')}
                  </span>
                )}
              </button>
              {onMove === undefined ? null : (
                <span className="flex shrink-0 items-center">
                  <IconButton label={`Move “${task.title}” up`} disabled={busy || index === 0} onClick={() => onMove(task, 'up')}>
                    <ArrowLeftIcon className="h-5 w-5 rotate-90" />
                  </IconButton>
                  <IconButton label={`Move “${task.title}” down`} disabled={busy || index === tasks.length - 1} onClick={() => onMove(task, 'down')}>
                    <ArrowLeftIcon className="h-5 w-5 -rotate-90" />
                  </IconButton>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TaskModal({
  editor,
  lists,
  defaultList,
  today,
  busy,
  onClose,
  onSave,
  onDelete,
}: {
  editor: TaskEditor;
  lists: TaskList[];
  defaultList: string | undefined;
  today: string;
  busy: boolean;
  onClose: () => void;
  onSave: (input: { title: string; notes: string; listId: string | undefined; due: Task['due']; reminders: number[] }) => void;
  onDelete?: () => void;
}) {
  const initialWhen = editor.mode === 'edit' ? choiceFromDue(editor.task.due, today) : { choice: 'today' as WhenChoice, picked: today };
  const [title, setTitle] = useState(editor.mode === 'edit' ? editor.task.title : '');
  const [notes, setNotes] = useState(editor.mode === 'edit' ? editor.task.notes : '');
  const [when, setWhen] = useState<WhenChoice>(initialWhen.choice);
  const [picked, setPicked] = useState(initialWhen.picked);
  const [listId, setListId] = useState<string>(editor.mode === 'edit' ? (editor.task.listId ?? '') : (defaultList ?? ''));
  const [reminder, setReminder] = useState<number | null>(editor.mode === 'edit' ? (editor.task.reminders[0] ?? null) : null);
  const [problem, setProblem] = useState<string>();

  function submit() {
    try {
      const due = dueFromChoice(when, picked, today);
      onSave({ title: title.trim(), notes, listId: listId === '' ? undefined : listId, due, reminders: due === undefined || reminder === null ? [] : [reminder] });
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'This task cannot be saved.');
    }
  }

  return (
    <FormModal
      title={editor.mode === 'new' ? 'New task' : 'Edit task'}
      submitLabel={editor.mode === 'new' ? 'Add task' : 'Save task'}
      canSubmit={title.trim() !== ''}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-4">
        <Field label="Task" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
        <fieldset>
          <legend className="text-compact font-extrabold text-ink">When</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {WHEN_CHOICES.map((choice) => (
              <FilterChip key={choice.value} active={when === choice.value} onClick={() => setWhen(choice.value)}>
                {choice.label}
              </FilterChip>
            ))}
          </div>
        </fieldset>
        {when === 'pick' ? <Field label="Date" type="date" value={picked} onChange={(event) => setPicked(event.target.value)} /> : null}
        <Select
          label="List"
          value={listId}
          onChange={(event) => setListId(event.target.value)}
          choices={[{ value: '', label: 'No list' }, ...lists.map((list) => ({ value: list.id, label: list.name || 'Untitled list' }))]}
        />
        {when === 'none' ? null : (
          <Select
            label="Reminder"
            value={reminder === null ? 'none' : String(reminder)}
            onChange={(event) => setReminder(event.target.value === 'none' ? null : Number(event.target.value))}
            choices={REMINDER_CHOICES.map((choice) => ({ value: choice.value === null ? 'none' : String(choice.value), label: choice.label }))}
            hint="Counted from 9:00 on the day it is due. The reminder says only that a task is due."
          />
        )}
        <TextArea label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
        {problem === undefined ? null : <Notice tone="danger">{problem}</Notice>}
        {onDelete === undefined ? null : (
          <Button variant="danger" disabled={busy} onClick={onDelete}>
            <TrashIcon />
            Delete task
          </Button>
        )}
      </div>
    </FormModal>
  );
}

function ListModal({
  editor,
  busy,
  onClose,
  onSave,
  onDelete,
}: {
  editor: ListEditor;
  busy: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(editor.mode === 'edit' ? editor.list.name : '');

  return (
    <FormModal
      title={editor.mode === 'new' ? 'New list' : 'Rename list'}
      submitLabel={editor.mode === 'new' ? 'Add list' : 'Save list'}
      canSubmit={name.trim() !== ''}
      busy={busy}
      onClose={onClose}
      onSubmit={() => onSave(name.trim())}
    >
      <div className="space-y-4">
        <Field label="List name" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
        {onDelete === undefined ? null : (
          <Button variant="danger" disabled={busy} onClick={onDelete}>
            <TrashIcon />
            Delete list
          </Button>
        )}
      </div>
    </FormModal>
  );
}
