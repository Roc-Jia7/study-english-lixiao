import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flattenPending, splitSchedule } from "../schedule";
import type { LxllAntiForgetDay, LxllAntiForgetRecord } from "../types";

function rec(
  antiForgetId: number,
  antiForgetDate: number,
  status: LxllAntiForgetRecord["status"] = "PENDING",
): LxllAntiForgetRecord {
  return {
    antiForgetId,
    antiForgetDate,
    status,
    userName: "test",
    userId: 1,
    materialName: "m",
    materialId: 1,
    courseOrderId: 1,
    trainTime: 0,
  };
}

const at = (y: number, m: number, d: number, h = 9) =>
  new Date(y, m - 1, d, h).getTime();

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("flattenPending", () => {
  it("drops non-PENDING and de-duplicates by antiForgetId", () => {
    const schedule: LxllAntiForgetDay[] = [
      { time: 0, records: [rec(1, at(2026, 6, 12)), rec(2, at(2026, 6, 12), "DONE")] },
      { time: 0, records: [rec(1, at(2026, 6, 12))] }, // dup id
    ];
    const out = flattenPending(schedule);
    expect(out.map((r) => r.antiForgetId)).toEqual([1]);
  });
});

describe("splitSchedule", () => {
  beforeEach(() => vi.setSystemTime(new Date(2026, 5, 12, 10, 0, 0))); // Jun 12

  it("puts today's and overdue slots in `due`, future in `upcoming`", () => {
    const schedule: LxllAntiForgetDay[] = [
      { time: 0, records: [rec(10, at(2026, 6, 10))] }, // overdue
      { time: 0, records: [rec(11, at(2026, 6, 12, 8)), rec(12, at(2026, 6, 12, 14))] }, // today x2
      { time: 0, records: [rec(13, at(2026, 6, 13))] }, // tomorrow
      { time: 0, records: [rec(14, at(2026, 6, 15))] }, // later
    ];
    const { due, upcoming } = splitSchedule(schedule);

    expect(due.map((r) => r.antiForgetId)).toEqual([10, 11, 12]); // sorted by date
    expect(upcoming.map((d) => d.date)).toEqual(["2026-06-13", "2026-06-15"]);
    expect(upcoming[0].records).toHaveLength(1);
  });

  it("sorts due oldest-first and groups upcoming by local day", () => {
    const schedule: LxllAntiForgetDay[] = [
      { time: 0, records: [rec(20, at(2026, 6, 14, 16)), rec(21, at(2026, 6, 14, 9))] },
    ];
    const { due, upcoming } = splitSchedule(schedule);
    expect(due).toHaveLength(0);
    expect(upcoming).toHaveLength(1);
    // within a day, slots are ordered by time
    expect(upcoming[0].records.map((r) => r.antiForgetId)).toEqual([21, 20]);
  });

  it("returns empty groups for an empty schedule", () => {
    expect(splitSchedule([])).toEqual({ due: [], upcoming: [], done: [] });
  });

  it("collects today's completed slots into `done` for re-practice", () => {
    const schedule: LxllAntiForgetDay[] = [
      { time: 0, records: [rec(30, at(2026, 6, 12, 8), "DONE")] }, // done today
      { time: 0, records: [rec(31, at(2026, 6, 10), "DONE")] }, // done, overdue day
      { time: 0, records: [rec(32, at(2026, 6, 12, 14))] }, // still pending today
      { time: 0, records: [rec(33, at(2026, 6, 13), "DONE")] }, // future, ignore
    ];
    const { due, done } = splitSchedule(schedule);
    expect(due.map((r) => r.antiForgetId)).toEqual([32]);
    expect(done.map((r) => r.antiForgetId)).toEqual([31, 30]); // oldest first
  });
});
