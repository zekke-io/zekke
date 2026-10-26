'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  listNotifications,
  markNotificationsRead,
  unreadNotificationCount,
  type NotificationRecord,
} from '@/lib/notifications';
import { inNotificationsTab, unreadAtLoad, unreadByFeedback, unreadIds } from '@/lib/app';
import { useAuthedContext, useZekke } from '@/components/session/ZekkeProvider';

const POLL_MS = 5 * 60 * 1000;
const LATEST_PAGE = 50;

export interface Notifications {
  unread: number;
  records: NotificationRecord[] | undefined;
  unreadFeedback: ReadonlyMap<string, readonly string[]>;
  unreadWhenLoaded: number;
  hasMore: boolean;
  failed: boolean;
  loading: boolean;
  reload: () => Promise<void>;
  check: () => Promise<void>;
  loadMore: () => Promise<void>;
  markFeedbackRead: (feedbackId: string) => Promise<void>;
}

const NotificationsContext = createContext<Notifications>({
  unread: 0,
  records: undefined,
  unreadFeedback: new Map(),
  unreadWhenLoaded: 0,
  hasMore: false,
  failed: false,
  loading: false,
  reload: async () => undefined,
  check: async () => undefined,
  loadMore: async () => undefined,
  markFeedbackRead: async () => undefined,
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
      const ids = unreadIds(inNotificationsTab(shown));
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

  const unreadFeedback = useMemo(() => unreadByFeedback(records ?? []), [records]);

  const markFeedbackRead = useCallback(
    async (feedbackId: string) => {
      try {
        const newest = await listNotifications(context, { limit: LATEST_PAGE });
        const ids = unreadByFeedback(newest.notifications).get(feedbackId) ?? [];
        if (ids.length === 0) {
          known.current = newest.unreadCount;
          setUnread(newest.unreadCount);
          return;
        }
        await markNotificationsRead(context, ids);
        const readAt = new Date().toISOString();
        setRecords((current) =>
          current?.map((record) => (ids.includes(record.id) ? { ...record, read_at: readAt } : record)),
        );
        const remaining = Math.max(0, newest.unreadCount - ids.length);
        known.current = remaining;
        setUnread(remaining);
      } catch {
        return;
      }
    },
    [context],
  );

  const value = useMemo(
    () => ({
      unread,
      records,
      unreadFeedback,
      unreadWhenLoaded,
      hasMore: cursor !== undefined,
      failed,
      loading,
      reload,
      check: poll,
      loadMore,
      markFeedbackRead,
    }),
    [unread, records, unreadFeedback, unreadWhenLoaded, cursor, failed, loading, reload, poll, loadMore, markFeedbackRead],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
