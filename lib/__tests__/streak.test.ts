import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getEffectiveStreak,
  lastNDays,
  localDateStr,
  yesterdayStr,
} from "../streak";
import type { StudentProfile } from "../types";

function studentWith(
  learnedDates: string[],
  streakDays: number,
): StudentProfile {
  return {
    id: "t",
    name: "Test",
    title: "Explorer",
    titleZh: "测试",
    avatar: "🧪",
    gradient: "",
    xp: 0,
    energyToday: 0,
    energyDate: "2026-06-12",
    streakDays,
    bestStreak: streakDays,
    learnedDates,
    progress: {},
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("localDateStr", () => {
  it("uses the LOCAL calendar day, not UTC", () => {
    // 7am June 12 local time — must be June 12 even if UTC says otherwise.
    vi.setSystemTime(new Date(2026, 5, 12, 7, 0, 0));
    expect(localDateStr()).toBe("2026-06-12");
  });

  it("zero-pads month and day", () => {
    vi.setSystemTime(new Date(2026, 0, 5));
    expect(localDateStr()).toBe("2026-01-05");
  });
});

describe("yesterdayStr", () => {
  it("crosses month boundaries correctly", () => {
    vi.setSystemTime(new Date(2026, 2, 1, 9, 0, 0)); // March 1
    expect(yesterdayStr()).toBe("2026-02-28");
  });

  it("crosses year boundaries correctly", () => {
    vi.setSystemTime(new Date(2026, 0, 1, 9, 0, 0)); // Jan 1
    expect(yesterdayStr()).toBe("2025-12-31");
  });
});

describe("getEffectiveStreak", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date(2026, 5, 12, 9, 0, 0)); // June 12
  });

  it("shows the stored streak when the child learned today", () => {
    const s = studentWith(["2026-06-11", "2026-06-12"], 2);
    expect(getEffectiveStreak(s)).toBe(2);
  });

  it("keeps the streak alive if yesterday was learned (still continuable)", () => {
    const s = studentWith(["2026-06-11"], 3);
    expect(getEffectiveStreak(s)).toBe(3);
  });

  it("resets to 0 once a full day was skipped", () => {
    const s = studentWith(["2026-06-10"], 5);
    expect(getEffectiveStreak(s)).toBe(0);
  });

  it("is 0 for a brand-new student", () => {
    expect(getEffectiveStreak(studentWith([], 0))).toBe(0);
  });
});

describe("lastNDays", () => {
  it("returns n consecutive local dates ending today", () => {
    vi.setSystemTime(new Date(2026, 5, 12, 9, 0, 0));
    const days = lastNDays(3);
    expect(days).toEqual(["2026-06-10", "2026-06-11", "2026-06-12"]);
  });

  it("spans month boundaries", () => {
    vi.setSystemTime(new Date(2026, 5, 1, 9, 0, 0)); // June 1
    expect(lastNDays(2)).toEqual(["2026-05-31", "2026-06-01"]);
  });
});
