'use client';

import { useEffect, useState, type ComponentType } from 'react';
import {
  ACTIVITY_COPY,
  notificationAction,
  notificationIcon,
  notificationView,
  type ActivityTabId,
  type NotificationIconId,
  type RecentKind,
} from '@/lib/app';
import { useNotifications } from './NotificationsProvider';
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
  const [tab, setTab] = useState<ActivityTabId>('notifications');
  const { unreadWhenLoaded } = useNotifications();

  return (
    <div className="flex max-w-[61.25rem] flex-col gap-6">
      <div
        role="group"
        aria-label={ACTIVITY_COPY.tabsLabel}
        className="flex w-fit gap-1 rounded-full bg-brand-100 p-1"
      >
        <TabButton active={tab === 'notifications'} onClick={() => setTab('notifications')}>
          {ACTIVITY_COPY.notifications}
          {unreadWhenLoaded > 0 ? (
            <span className="inline-flex h-[1.375rem] min-w-[1.375rem] items-center justify-center rounded-full bg-brand-500 px-1.5 text-[0.8125rem] font-black text-on-brand">
              {unreadWhenLoaded}
            </span>
          ) : null}
        </TabButton>
        <TabButton active={tab === 'recent'} onClick={() => setTab('recent')}>
          {ACTIVITY_COPY.recent}
        </TabButton>
      </div>

      {tab === 'notifications' ? <NotificationsList /> : <RecentList />}
    </div>
  );
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
      className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-[1.375rem] text-base font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 ${active ? 'bg-ink text-ground' : 'text-ink hover:bg-brand-200'}`}
    >
      {children}
    </button>
  );
}

function NotificationsList() {
  const { records, hasMore, failed, loading, reload, loadMore } = useNotifications();
  const { open, openSettings } = useShellNavigation();

  useEffect(() => {
    void reload();
  }, [reload]);

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
      {records !== undefined && records.length === 0 && !failed ? (
        <Empty>{ACTIVITY_COPY.emptyNotifications}</Empty>
      ) : null}
      {records?.map((record) => {
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
