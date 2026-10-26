'use client';

import { createContext, useContext, type ComponentType } from 'react';
import type { ActivityTabId, SettingsTabId } from '@/lib/app';

export interface ShellDestination {
  id: string;
  label: string;
  description: string;
  appIcon: ComponentType;
}

export interface ShellNavigation {
  destinations: readonly ShellDestination[];
  open: (id: string) => void;
  openSettings: (tab: SettingsTabId) => void;
  openFeedback: (id: string) => void;
  feedbackId?: string;
  activityTab: ActivityTabId;
  setActivityTab: (tab: ActivityTabId) => void;
}

const ShellNavigationContext = createContext<ShellNavigation>({
  destinations: [],
  open: () => undefined,
  openSettings: () => undefined,
  openFeedback: () => undefined,
  activityTab: 'notifications',
  setActivityTab: () => undefined,
});

export const ShellNavigationProvider = ShellNavigationContext.Provider;

export function useShellNavigation(): ShellNavigation {
  return useContext(ShellNavigationContext);
}
