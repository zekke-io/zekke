'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  listNotifications,
  markNotificationsRead,
  unreadNotificationCount,
  type NotificationRecord,
} from '@/lib/notifications';
import { unreadAtLoad, unreadIds } from '@/lib/app';
import { useAuthedContext, useZekke } from '@/components/session/ZekkeProvider';

const POLL_MS = 5 * 60 * 1000;

export interface Notifications {
  unread: number;
  records: NotificationRecord[] | undefined;
  unreadWhenLoaded: number;
  hasMore: boolean;
  failed: boolean;
  loading: boolean;
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
}

const NotificationsContext = createContext<Notifications>({
  unread: 0,
  records: undefined,
  unreadWhenLoaded: 0,
  hasMore: false,
  failed: false,
  loading: false,
  reload: async () => undefined,
  loadMore: async () => undefined,
});

export function useNotifications(): Notifications {
  return useContext(NotificationsContext);
}

export default function NotificationsProvider({ children }: { children: ReactNode }) {
  const context = useAuthedContext();
  const { refreshAccount } = useZekke();
  const [unread, setUnread] = useState(0);
  const [records, setRecords] = useState<NotificationRecord[]>();
  const [unreadWhenLoaded, setUnreadWhenLoaded] = useState(0);
  const [cursor, setCursor] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const known = useRef<number>(undefined);

  const poll = useCallback(async () => {
    try {
      const count = await unreadNotificationCount(context);
      if (known.current !== undefined && count > known.current) {
        void refreshAccount();
      }
      known.current = count;
      setUnread(count);
    } catch {
      return;
    }
  }, [context, refreshAccount]);

  useEffect(() => {
    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);
    const onFocus = () => void poll();
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [poll]);

  const markShown = useCallback(
    async (shown: NotificationRecord[]) => {
      const ids = unreadIds(shown);
      if (ids.length === 0) {
        return;
      }
      try {
        await markNotificationsRead(context, ids);
        setUnread((current) => {
          const next = Math.max(0, current - ids.length);
          known.current = next;
          return next;
        });
      } catch {
        return;
      }
    },
    [context],
  );

  const load = useCallback(
    async (from?: string) => {
      setLoading(true);
      setFailed(false);
      try {
        const page = await listNotifications(context, { cursor: from });
        setRecords((current) => (from === undefined ? page.notifications : [...(current ?? []), ...page.notifications]));
        setCursor(page.nextCursor);
        if (from === undefined) {
          known.current = page.unreadCount;
          setUnread(page.unreadCount);
          setUnreadWhenLoaded(unreadAtLoad(page.notifications));
        }
        void markShown(page.notifications);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [context, markShown],
  );

  const reload = useCallback(() => load(), [load]);
  const loadMore = useCallback(async () => {
    if (cursor !== undefined) {
      await load(cursor);
    }
  }, [cursor, load]);

  const value = useMemo(
    () => ({ unread, records, unreadWhenLoaded, hasMore: cursor !== undefined, failed, loading, reload, loadMore }),
    [unread, records, unreadWhenLoaded, cursor, failed, loading, reload, loadMore],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
