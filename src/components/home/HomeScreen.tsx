'use client';

import { useZekke } from '@/components/session/ZekkeProvider';
import { useShellNavigation } from '@/components/shell/ShellNavigation';
import HomeStorage from './HomeStorage';
import { Notice } from '@/components/ui';

export default function HomeScreen() {
  const { holds, fullDevice } = useZekke();

  return (
    <div className="space-y-10">
      {holds('files') ? <HomeStorage /> : null}
      {fullDevice && !holds('calendar') ? (
        <Notice tone="info">
          Calendar, To-do and Diary are only on accounts created after they were added. This account was created before, so it does not have them.
        </Notice>
      ) : null}
      <AppIcons />
    </div>
  );
}

function AppIcons() {
  const { destinations, open } = useShellNavigation();

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-x-4 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] sm:gap-y-9">
      {destinations.map(({ id, label, description, appIcon: AppIcon }) => (
        <li key={id} className="flex justify-center">
          <button
            type="button"
            onClick={() => open(id)}
            title={description}
            className="group flex w-full flex-col items-center gap-2.5 rounded-2xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-[28%] bg-surface p-3 shadow-raised ring-1 ring-line transition duration-150 group-hover:-translate-y-0.5 group-hover:shadow-lift group-hover:ring-brand-300 group-active:translate-y-0 group-active:scale-95 sm:h-20 sm:w-20 sm:p-4">
              <AppIcon />
            </span>
            <span className="text-compact font-extrabold text-ink">{label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
