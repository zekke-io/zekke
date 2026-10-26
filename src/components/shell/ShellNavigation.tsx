'use client';

import { createContext, useContext, type ComponentType } from 'react';
import type { SettingsTabId } from '@/lib/app';

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
}

const ShellNavigationContext = createContext<ShellNavigation>({
  destinations: [],
  open: () => undefined,
  openSettings: () => undefined,
});

export const ShellNavigationProvider = ShellNavigationContext.Provider;

export function useShellNavigation(): ShellNavigation {
  return useContext(ShellNavigationContext);
}
