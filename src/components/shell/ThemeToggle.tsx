"use client";

import { useEffect, useState } from "react";
import {
  nextTheme,
  readTheme,
  THEME_LABELS,
  writeTheme,
  type ThemeChoice,
} from "@/lib/app";
import { HintedIconButton } from "@/components/ui";
import { MonitorIcon, MoonIcon, SunIcon } from "@/components/ui/icons";

const THEME_ICONS = {
  system: MonitorIcon,
  light: SunIcon,
  dark: MoonIcon,
} as const;

function applyTheme(theme: ThemeChoice) {
  if (theme === "system") {
    delete document.documentElement.dataset.theme;
    return;
  }
  document.documentElement.dataset.theme = theme;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeChoice>("system");

  useEffect(() => {
    const stored = readTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  const ThemeIcon = THEME_ICONS[theme];

  return (
    <HintedIconButton
      hint={THEME_LABELS[theme]}
      onClick={() => {
        const next = nextTheme(theme);
        setTheme(next);
        writeTheme(next);
        applyTheme(next);
      }}
    >
      <ThemeIcon className="h-4 w-4 shrink-0" />
    </HintedIconButton>
  );
}
