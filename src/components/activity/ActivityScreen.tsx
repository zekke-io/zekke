'use client';

import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import {
  ACTIVITY_COPY,
  feedbackItems,
  inNotificationsTab,
  notificationAction,
  notificationIcon,
  notificationView,
  type NotificationIconId,
  type RecentKind,
  NOTIFICATIONS_WATCH_MS,
} from '@/lib/app';
import { useNotifications } from './NotificationsProvider';
import { listFeedback, type FeedbackSummary } from '@/lib/feedback';
import { useAuthedContext } from '@/components/session/ZekkeProvider';
import { useRecentItems } from './useRecentItems';
import { useShellNavigation } from '@/components/shell/ShellNavigation';
import { Empty, Spinner } from '@/components/ui';
import {
  AlertIcon,
  CardIcon,
  ChatIcon,
  DocumentFileIcon,
  InfoIcon,
  NotesIcon,
  PasswordsIcon,
  SharingIcon,
  SpreadsheetFileIcon,
  TrashIcon,
  VaultIcon,
  type IconProps,
} from '@/components/ui/icons';

const NOTIFICATION_ICONS: Record<NotificationIconId, ComponentType<IconProps>> = {
  card: CardIcon,
  alert: AlertIcon,
  trash: TrashIcon,
  sharing: SharingIcon,
  chat: ChatIcon,
  info: InfoIcon,
};

const RECENT_ICONS: Record<RecentKind, ComponentType<IconProps>> = {
  note: NotesIcon,
  password: PasswordsIcon,
  secret: VaultIcon,
  document: DocumentFileIcon,
  spreadsheet: SpreadsheetFileIcon,
};

const RECENT_SECTIONS: Record<RecentKind, string> = {
  note: 'notes',
  password: 'passwords',
  secret: 'vault',
  document: 'documents',
  spreadsheet: 'spreadsheets',
};

const ROW =
  'flex min-h-[4.75rem] items-center gap-3.5 rounded-[1.25rem] bg-surface px-4 py-2 transition-colors';
const TILE =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9375rem] bg-brand-100 text-brand-700';
const ACTION =
  'inline-flex h-11 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-full bg-brand-100 px-[1.125rem] text-compact font-extrabold text-ink transition-colors hover:bg-brand-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50';

export default function ActivityScreen() {
  const { activityTab: tab, setActivityTab: setTab } = useShellNavigation();
  const { unreadWhenLoaded, unreadFeedback, unread, reload, check } = useNotifications();
  const seen = useRef<number>(undefined);

  useEffect(() => {
    if (seen.current === undefined || unread > seen.current) {
      void reload();
    }
    seen.current = unread;
  }, [unread, reload]);

  useEffect(() => {
    const watch = () => {
      if (document.visibilityState === 'visible') {
        void check();
      }
    };
    const timer = window.setInterval(watch, NOTIFICATIONS_WATCH_MS);
    document.addEventListener('visibilitychange', watch);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', watch);
    };
  }, [check]);

  return (
    <div className="flex max-w-[61.25rem] flex-col gap-6">
      <div
        role="group"
        aria-label={ACTIVITY_COPY.tabsLabel}
        className="flex w-fit gap-1 rounded-full bg-chip p-1"
      >
        <TabButton active={tab === 'notifications'} onClick={() => setTab('notifications')}>
          {ACTIVITY_COPY.notifications}
          <Count value={unreadWhenLoaded} />
        </TabButton>
        <TabButton active={tab === 'feedback'} onClick={() => setTab('feedback')}>
          {ACTIVITY_COPY.feedback}
          <Count value={unreadFeedback.size} />
        </TabButton>
        <TabButton active={tab === 'recent'} onClick={() => setTab('recent')}>
          {ACTIVITY_COPY.recent}
        </TabButton>
      </div>

      {tab === 'notifications' ? <NotificationsList /> : tab === 'feedback' ? <FeedbackList /> : <RecentList />}
    </div>
  );
}

function Count({ value }: { value: number }) {
  return value > 0 ? (
    <span className="inline-flex h-[1.375rem] min-w-[1.375rem] items-center justify-center rounded-full bg-brand-500 px-1.5 text-[0.8125rem] font-black text-on-brand">
      {value}
    </span>
  ) : null;
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-[1.375rem] text-base font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 ${active ? 'bg-chip-active text-on-chip-active' : 'text-ink hover:bg-brand-200'}`}
    >
      {children}
    </button>
  );
}

function NotificationsList() {
  const { records, hasMore, failed, loading, loadMore } = useNotifications();
  const { open, openSettings } = useShellNavigation();
  const shown = records === undefined ? undefined : inNotificationsTab(records);

  const now = new Date();

  function run(target: 'plan' | 'shared' | 'drive') {
    if (target === 'plan') {
      openSettings('plan');
    } else {
      open(target === 'shared' ? 'shared' : 'drive');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {records === undefined && loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : null}
      {failed ? <p className="text-compact text-danger">{ACTIVITY_COPY.failedNotifications}</p> : null}
      {shown !== undefined && shown.length === 0 && !failed ? (
        <Empty>{ACTIVITY_COPY.emptyNotifications}</Empty>
      ) : null}
      {shown?.map((record) => {
        const view = notificationView(record, now);
        const Glyph = NOTIFICATION_ICONS[notificationIcon(record.kind)];
        const action = notificationAction(record.kind);
        return (
          <div key={view.id} className={ROW}>
            <span className={TILE}>
              <Glyph className="h-6 w-6 shrink-0" />
            </span>
            <span className="flex min-w-0 grow flex-col">
              <span className="text-base font-extrabold text-ink">{view.title}</span>
              <span className="text-[0.8125rem] font-semibold text-ink-muted">{view.body}</span>
            </span>
            {action !== undefined ? (
              <button type="button" onClick={() => run(action.target)} className={ACTION}>
                {action.label}
              </button>
            ) : (
              <span className="shrink-0 text-[0.8125rem] font-semibold text-ink-muted">{view.when}</span>
            )}
          </div>
        );
      })}
      {hasMore ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void loadMore()}
          className={`${ACTION} self-start disabled:cursor-default disabled:opacity-60`}
        >
          {loading ? ACTIVITY_COPY.loading : ACTIVITY_COPY.loadMore}
        </button>
      ) : null}
    </div>
  );
}

function FeedbackList() {
  const context = useAuthedContext();
  const { records, unreadFeedback } = useNotifications();
  const { openFeedback } = useShellNavigation();
  const [feedback, setFeedback] = useState<FeedbackSummary[]>();
  const [cursor, setCursor] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (from?: string) => {
      setLoading(true);
      try {
        const page = await listFeedback(context, { cursor: from });
        setFeedback((current) => (from === undefined ? page.feedback : [...(current ?? []), ...page.feedback]));
        setCursor(page.nextCursor);
        setFailed(false);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [context],
  );

  useEffect(() => {
    void load();
  }, [load, records]);

  const items = feedback === undefined ? undefined : feedbackItems(feedback, unreadFeedback);

  return (
    <div className="flex flex-col gap-3">
      {items === undefined && !failed ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : null}
      {failed ? <p className="text-compact text-danger">{ACTIVITY_COPY.failedFeedback}</p> : null}
      {items !== undefined && items.length === 0 ? <Empty>{ACTIVITY_COPY.emptyFeedback}</Empty> : null}
      {items?.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => openFeedback(item.id)}
          className={`${ROW} w-full cursor-pointer text-left hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50`}
        >
          <span className={TILE}>
            <ChatIcon className="h-6 w-6 shrink-0" />
          </span>
          <span className="flex min-w-0 grow flex-col">
            <span className="truncate text-base font-extrabold text-ink">{item.title}</span>
            <span className="truncate text-[0.8125rem] font-semibold text-ink-muted">{item.preview}</span>
          </span>
          {item.unread ? (
            <span role="img" aria-label="Unread" className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500" />
          ) : null}
          <span className="flex shrink-0 flex-col items-end text-[0.8125rem] font-semibold text-ink-muted">
            <span>{item.when}</span>
            <span>{item.replies}</span>
          </span>
        </button>
      ))}
      {cursor !== undefined ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void load(cursor)}
          className={`${ACTION} self-start disabled:cursor-default disabled:opacity-60`}
        >
          {loading ? ACTIVITY_COPY.loading : ACTIVITY_COPY.loadMore}
        </button>
      ) : null}
    </div>
  );
}

function RecentList() {
  const { entries, failed } = useRecentItems();
  const { open } = useShellNavigation();

  return (
    <div className="flex flex-col gap-3">
      {entries === undefined && !failed ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : null}
      {failed ? <p className="text-compact text-danger">{ACTIVITY_COPY.failedRecent}</p> : null}
      {entries !== undefined && entries.length === 0 ? <Empty>{ACTIVITY_COPY.emptyRecent}</Empty> : null}
      {entries?.map((entry) => {
        const Glyph = RECENT_ICONS[entry.kind];
        return (
          <button
            key={`${entry.kind}-${entry.id}`}
            type="button"
            onClick={() => open(RECENT_SECTIONS[entry.kind])}
            className={`${ROW} w-full cursor-pointer text-left hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50`}
          >
            <span className={TILE}>
              <Glyph className="h-6 w-6 shrink-0" />
            </span>
            <span className="flex min-w-0 grow flex-col">
              <span className="truncate text-base font-extrabold text-ink">{entry.title}</span>
              <span className="text-[0.8125rem] font-semibold text-ink-muted">{entry.detail}</span>
            </span>
            <span className="shrink-0 text-[0.8125rem] font-semibold text-ink-muted">{entry.when}</span>
          </button>
        );
      })}
    </div>
  );
}
