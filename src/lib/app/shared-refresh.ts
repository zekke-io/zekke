import type { NotificationRecord } from "@/lib/notifications";

export const SHARED_POLL_MS = 10_000;
export const SHARED_POLL_MAX_MS = 80_000;
export const SHARED_POLL_PAGE = 10;

export const SHARE_ARRIVAL_KINDS: readonly string[] = [
  "item_shared",
  "connection_invited",
];

export function shareArrivals(
  records: readonly NotificationRecord[],
  seen: ReadonlySet<string>,
): string[] {
  return records
    .filter(
      (record) =>
        SHARE_ARRIVAL_KINDS.includes(record.kind) && !seen.has(record.id),
    )
    .map((record) => record.id);
}

export function nextPollDelay(failures: number): number {
  return Math.min(
    SHARED_POLL_MS * 2 ** Math.max(0, failures),
    SHARED_POLL_MAX_MS,
  );
}
