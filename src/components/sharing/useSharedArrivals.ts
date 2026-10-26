"use client";

import { useEffect, useRef } from "react";
import { listNotifications } from "@/lib/notifications";
import { nextPollDelay, shareArrivals, SHARED_POLL_PAGE } from "@/lib/app";
import { useAuthedContext } from "@/components/session/ZekkeProvider";

const listeners = new Set<() => void>();

function announceArrival() {
  for (const listener of listeners) {
    listener();
  }
}

export function useOnSharedArrival(reload: () => unknown): void {
  const latest = useRef(reload);

  useEffect(() => {
    latest.current = reload;
  }, [reload]);

  useEffect(() => {
    const listener = () => void latest.current();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
}

export function useSharedPolling(): void {
  const context = useAuthedContext();

  useEffect(() => {
    const seen = new Set<string>();
    let baselined = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    function schedule() {
      clearTimeout(timer);
      if (stopped || document.visibilityState !== "visible") {
        return;
      }
      timer = setTimeout(() => void tick(), nextPollDelay(failures));
    }

    async function tick() {
      clearTimeout(timer);
      try {
        const page = await listNotifications(context, {
          limit: SHARED_POLL_PAGE,
        });
        if (stopped) {
          return;
        }
        const arrivals = baselined
          ? shareArrivals(page.notifications, seen)
          : [];
        for (const record of page.notifications) {
          seen.add(record.id);
        }
        baselined = true;
        failures = 0;
        if (arrivals.length > 0) {
          announceArrival();
        }
      } catch {
        failures += 1;
      }
      schedule();
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void tick();
      } else {
        clearTimeout(timer);
      }
    }

    void tick();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onVisibilityChange);

    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onVisibilityChange);
    };
  }, [context]);
}
