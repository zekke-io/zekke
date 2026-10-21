'use client';

import { useState } from 'react';
import type { RecurringScope } from '@/lib/calendar';
import { Button } from '@/components/ui';
import { Modal } from '@/components/modal';
import { ModalActions } from '@/components/modal/ModalActions';

export function ScopeModal({
  title,
  confirmLabel,
  danger = false,
  busy,
  onClose,
  onChoose,
}: {
  title: string;
  confirmLabel: string;
  danger?: boolean;
  busy: boolean;
  onClose: () => void;
  onChoose: (scope: RecurringScope) => void;
}) {
  const [scope, setScope] = useState<RecurringScope>('this');

  return (
    <Modal
      title={title}
      subtitle="This event repeats."
      onClose={onClose}
      footer={
        <ModalActions busy={busy} onCancel={onClose}>
          <Button variant={danger ? 'danger' : 'primary'} disabled={busy} onClick={() => onChoose(scope)}>
            {confirmLabel}
          </Button>
        </ModalActions>
      }
    >
      <fieldset className="space-y-2">
        <legend className="sr-only">Which events</legend>
        {(
          [
            ['this', 'Only this event'],
            ['all', 'All events in the series'],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 text-compact font-extrabold text-ink">
            <input type="radio" name="scope" checked={scope === value} onChange={() => setScope(value)} className="h-4 w-4 accent-brand-500" />
            {label}
          </label>
        ))}
      </fieldset>
    </Modal>
  );
}
