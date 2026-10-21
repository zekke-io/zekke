'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadCalendar, planReminders, REMINDER_TEXT, REMINDER_TITLE } from '@/lib/calendar';
import { useFeedChanges } from '@/components/session/useFeed';
import { useAuthedContext } from '@/components/session/ZekkeProvider';

export type ReminderPermission = 'unsupported' | 'default' | 'granted' | 'denied';

export function reminderPermission(): ReminderPermission {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

export function useReminderPermission(): [ReminderPermission, () => Promise<void>] {
  const [permission, setPermission] = useState<ReminderPermission>('default');

  useEffect(() => setPermission(reminderPermission()), []);

  const request = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      return;
    }
    setPermission(await Notification.requestPermission());
  }, []);

  return [permission, request];
}

export function useReminderScheduler(enabled: boolean): void {
  const context = useAuthedContext();
  const [version, setVersion] = useState(0);

  useFeedChanges('calendar', () => setVersion((current) => current + 1));

  useEffect(() => {
    if (!enabled || reminderPermission() !== 'granted') {
      return undefined;
    }
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    void (async () => {
      try {
        const data = await loadCalendar(context);
        if (cancelled) {
          return;
        }
        const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const now = Date.now();
        for (const reminder of planReminders(data.events, data.tasks, now, zone)) {
          timers.push(
            setTimeout(() => {
              new Notification(REMINDER_TITLE, { body: REMINDER_TEXT[reminder.kind], tag: reminder.key });
            }, reminder.fireAtMs - now),
          );
        }
      } catch {
        return;
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [context, version, enabled]);
}
