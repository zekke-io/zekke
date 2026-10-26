import { describe, expect, it } from "vitest";
import {
  SHARED_POLL_MAX_MS,
  SHARED_POLL_MS,
  nextPollDelay,
  shareArrivals,
} from "./shared-refresh";
import type { NotificationRecord } from "@/lib/notifications";

function record(id: string, kind: string): NotificationRecord {
  return { id, kind, params: {}, created_at: "2026-10-24T10:00:00Z" };
}

describe("shareArrivals", () => {
  it("returns shares and invitations that have not been seen", () => {
    const records = [
      record("a", "item_shared"),
      record("b", "connection_invited"),
      record("c", "item_shared"),
    ];
    expect(shareArrivals(records, new Set(["c"]))).toEqual(["a", "b"]);
  });

  it("ignores other kinds, such as the plan's", () => {
    expect(
      shareArrivals(
        [record("a", "payment_failed"), record("b", "expiring")],
        new Set(),
      ),
    ).toEqual([]);
  });

  it("returns nothing when everything was seen", () => {
    expect(shareArrivals([record("a", "item_shared")], new Set(["a"]))).toEqual(
      [],
    );
  });
});

describe("nextPollDelay", () => {
  it("is the base interval until a request fails", () => {
    expect(nextPollDelay(0)).toBe(SHARED_POLL_MS);
  });

  it("doubles after each failure and stops at the ceiling", () => {
    expect(nextPollDelay(1)).toBe(SHARED_POLL_MS * 2);
    expect(nextPollDelay(2)).toBe(SHARED_POLL_MS * 4);
    expect(nextPollDelay(10)).toBe(SHARED_POLL_MAX_MS);
  });
});
