import { describe, expect, it } from "vitest";
import { mergeIntoStudent, toSyncState, type SyncState } from "../merge";
import type { StudentProfile, WordProgress } from "@/lib/types";

function prog(stage: number, lastReviewedAt: string): WordProgress {
  return {
    wordId: "x",
    stage,
    nextReviewTime: lastReviewedAt,
    lastReviewedAt,
    timesCorrect: 0,
    timesWrong: 0,
  };
}

function student(p: Partial<StudentProfile> = {}): StudentProfile {
  return {
    id: "lxll:1",
    name: "A",
    title: "",
    titleZh: "",
    avatar: "👦",
    gradient: "",
    xp: 0,
    energyToday: 0,
    energyDate: "",
    streakDays: 0,
    bestStreak: 0,
    learnedDates: [],
    progress: {},
    ...p,
  };
}

describe("mergeIntoStudent", () => {
  it("returns local unchanged when there is no remote", () => {
    const s = student({ xp: 10 });
    expect(mergeIntoStudent(s, null)).toEqual(s);
  });

  it("takes the stronger of each signal and unions dates", () => {
    const local = student({
      xp: 30,
      streakDays: 2,
      bestStreak: 5,
      learnedDates: ["2026-06-13"],
    });
    const remote: SyncState = {
      xp: 50,
      streakDays: 4,
      bestStreak: 3,
      learnedDates: ["2026-06-12", "2026-06-14"],
      progress: {},
    };
    const m = mergeIntoStudent(local, remote);
    expect(m.xp).toBe(50);
    expect(m.streakDays).toBe(4);
    expect(m.bestStreak).toBe(5);
    expect(m.learnedDates).toEqual(["2026-06-12", "2026-06-13", "2026-06-14"]);
  });

  it("keeps a local pet name, else adopts the remote one", () => {
    expect(
      mergeIntoStudent(student({ petName: "小火龙" }), {
        xp: 0,
        streakDays: 0,
        bestStreak: 0,
        learnedDates: [],
        progress: {},
        petName: "Other",
      }).petName,
    ).toBe("小火龙");
    expect(
      mergeIntoStudent(student({ petName: undefined }), {
        xp: 0,
        streakDays: 0,
        bestStreak: 0,
        learnedDates: [],
        progress: {},
        petName: "Cloudy",
      }).petName,
    ).toBe("Cloudy");
  });

  it("per-word: the higher stage wins, tie broken by recency", () => {
    const local = student({
      progress: { a: prog(3, "2026-06-14T10:00:00Z"), b: prog(2, "2026-06-14T09:00:00Z") },
    });
    const remote: SyncState = {
      xp: 0,
      streakDays: 0,
      bestStreak: 0,
      learnedDates: [],
      progress: {
        a: prog(5, "2026-06-13T10:00:00Z"), // higher stage → wins
        b: prog(2, "2026-06-14T11:00:00Z"), // same stage, newer → wins
        c: prog(1, "2026-06-14T10:00:00Z"), // only remote → added
      },
    };
    const m = mergeIntoStudent(local, remote);
    expect(m.progress.a.stage).toBe(5);
    expect(m.progress.b.lastReviewedAt).toBe("2026-06-14T11:00:00Z");
    expect(m.progress.c.stage).toBe(1);
  });

  it("toSyncState omits name/avatar (no personal info synced)", () => {
    const s = toSyncState(student({ name: "小明", xp: 7 }));
    expect(s).not.toHaveProperty("name");
    expect(s).not.toHaveProperty("avatar");
    expect(s.xp).toBe(7);
  });
});
