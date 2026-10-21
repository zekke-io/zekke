'use client';

import { useState } from 'react';
import {
  EventFormError,
  REMINDER_CHOICES,
  REPEAT_CHOICES,
  formToInput,
  type EventForm,
  type EventInput,
  type RepeatChoice,
} from '@/lib/calendar';
import { Button, Field, Notice, Select, TextArea } from '@/components/ui';
import { TrashIcon } from '@/components/ui/icons';
import { FormModal } from '@/components/modal';

export function EventModal({
  title,
  initial,
  timeZone,
  previous,
  busy,
  onClose,
  onSave,
  onDelete,
}: {
  title: string;
  initial: EventForm;
  timeZone: string;
  previous?: { recurrence?: EventInput['recurrence']; overrides?: EventInput['overrides']; location?: string };
  busy: boolean;
  onClose: () => void;
  onSave: (input: EventInput, form: EventForm) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [problem, setProblem] = useState<string>();

  function change(patch: Partial<EventForm>) {
    setForm((current) => ({ ...current, ...patch }));
    setProblem(undefined);
  }

  function submit() {
    try {
      onSave(formToInput(form, timeZone, previous), form);
    } catch (error) {
      setProblem(error instanceof EventFormError || error instanceof RangeError ? error.message : 'This event cannot be saved.');
    }
  }

  return (
    <FormModal title={title} submitLabel="Save event" canSubmit={form.title.trim() !== ''} busy={busy} onClose={onClose} onSubmit={submit}>
      <div className="space-y-4">
        <Field label="Title" value={form.title} onChange={(event) => change({ title: event.target.value })} autoFocus />
        <label className="flex items-center gap-2 text-compact font-extrabold text-ink">
          <input type="checkbox" checked={form.allDay} onChange={(event) => change({ allDay: event.target.checked })} className="h-4 w-4 accent-brand-500" />
          All day
        </label>
        <Field label="Date" type="date" value={form.date} onChange={(event) => change({ date: event.target.value })} />
        {form.allDay ? null : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts" type="time" value={form.startTime} onChange={(event) => change({ startTime: event.target.value })} />
            <Field label="Ends" type="time" value={form.endTime} onChange={(event) => change({ endTime: event.target.value })} />
          </div>
        )}
        <Select
          label="Repeat"
          value={form.repeat}
          onChange={(event) => change({ repeat: event.target.value as RepeatChoice })}
          choices={REPEAT_CHOICES.map((choice) => ({ value: choice.value, label: choice.label }))}
        />
        <Select
          label="Reminder"
          value={form.reminder === null ? 'none' : String(form.reminder)}
          onChange={(event) => change({ reminder: event.target.value === 'none' ? null : Number(event.target.value) })}
          choices={REMINDER_CHOICES.map((choice) => ({ value: choice.value === null ? 'none' : String(choice.value), label: choice.label }))}
          hint="The reminder says only that you have an event, never what it is."
        />
        <TextArea label="Notes" value={form.notes} onChange={(event) => change({ notes: event.target.value })} />
        {problem === undefined ? null : <Notice tone="danger">{problem}</Notice>}
        {onDelete === undefined ? null : (
          <Button variant="danger" disabled={busy} onClick={onDelete}>
            <TrashIcon />
            Delete event
          </Button>
        )}
      </div>
    </FormModal>
  );
}
