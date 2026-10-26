'use client';

import { ACTIVITY_COPY } from '@/lib/app';
import { useNotifications } from '@/components/activity/NotificationsProvider';
import { HintedIconButton } from '@/components/ui';
import { ClockIcon } from '@/components/ui/icons';

export default function NotificationBell({ active, onOpen }: { active: boolean; onOpen: () => void }) {
  const { unread } = useNotifications();

  return (
    <HintedIconButton
      hint={ACTIVITY_COPY.unreadLabel(unread)}
      aria-current={active ? 'page' : undefined}
      onClick={onOpen}
      className={`relative ${active ? 'border-line-strong bg-raised text-ink' : ''}`}
    >
      <ClockIcon className="h-4 w-4 shrink-0" />
      {unread > 0 ? (
        <span
          aria-hidden="true"
          className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-surface"
        />
      ) : null}
    </HintedIconButton>
  );
}
