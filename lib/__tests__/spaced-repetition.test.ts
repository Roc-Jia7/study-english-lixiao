import { describe, expect, it } from "vitest";
import {
  MASTERED_STAGE,
  REVIEW_INTERVALS_MS,
  advanceStage,
  applyAnswer,
  countMastered,
  getDueWords,
  getNewWords,
  memoryStrength,
} from "../spaced-repetition";
import { VOCABULARY } from "../vocabulary";
import type { StudentProfile, WordProgress } from "../types";

const NOW = new Date("2026-06-12T10:00:00.000Z");

function makeStudent(progress: Record<string, WordProgress> = {}): StudentProfile {
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
    streakDays: 0,
    bestStreak: 0,
    learnedDates: [],
    progress,
  };
}

function progressAt(
  wordId: string,
  stage: number,
  nextReviewTime: string,
): WordProgress {
  return {
    wordId,
    stage,
    nextReviewTime,
    lastReviewedAt: NOW.toISOString(),
    timesCorrect: 0,
    timesWrong: 0,
  };
}

describe("advanceStage", () => {
  it("moves up one checkpoint when known", () => {
    expect(advanceStage(0, true)).toBe(1);
    expect(advanceStage(3, true)).toBe(4);
  });

  it("caps at the mastered stage", () => {
    expect(advanceStage(MASTERED_STAGE, true)).toBe(MASTERED_STAGE);
  });

  it("drops two checkpoints when forgotten, but never below 1", () => {
    expect(advanceStage(5, false)).toBe(3);
    expect(advanceStage(2, false)).toBe(1);
    expect(advanceStage(1, false)).toBe(1);
    expect(advanceStage(0, false)).toBe(1);
  });
});

describe("applyAnswer", () => {
  it("starts a brand-new word at stage 1 with the 5-minute interval", () => {
    const p = applyAnswer(undefined, "cat", true, NOW);
    expect(p.stage).toBe(1);
    expect(new Date(p.nextReviewTime).getTime()).toBe(
      NOW.getTime() + REVIEW_INTERVALS_MS[1],
    );
    expect(p.timesCorrect).toBe(1);
    expect(p.timesWrong).toBe(0);
  });

  it("schedules the next review from the new stage's interval", () => {
    const prev = progressAt("cat", 3, NOW.toISOString());
    const p = applyAnswer(prev, "cat", true, NOW);
    expect(p.stage).toBe(4);
    expect(new Date(p.nextReviewTime).getTime()).toBe(
      NOW.getTime() + REVIEW_INTERVALS_MS[4],
    );
  });

  it("accumulates correct/wrong counters across answers", () => {
    let p = applyAnswer(undefined, "cat", true, NOW);
    p = applyAnswer(p, "cat", false, NOW);
    p = applyAnswer(p, "cat", false, NOW);
    expect(p.timesCorrect).toBe(1);
    expect(p.timesWrong).toBe(2);
  });

  it("a miss reschedules sooner than the stage it fell from", () => {
    const prev = progressAt("cat", 6, NOW.toISOString());
    const p = applyAnswer(prev, "cat", false, NOW);
    expect(p.stage).toBe(4);
    expect(new Date(p.nextReviewTime).getTime()).toBeLessThan(
      NOW.getTime() + REVIEW_INTERVALS_MS[6],
    );
  });
});

describe("memoryStrength", () => {
  it("is 0 for unstudied and 1 for mastered", () => {
    expect(memoryStrength(undefined)).toBe(0);
    expect(
      memoryStrength(progressAt("cat", MASTERED_STAGE, NOW.toISOString())),
    ).toBe(1);
  });
});

describe("getNewWords / getDueWords", () => {
  it("treats every word as new for a fresh student", () => {
    const student = makeStudent();
    expect(getNewWords(student)).toHaveLength(VOCABULARY.length);
    expect(getDueWords(student, NOW)).toHaveLength(0);
  });

  it("excludes studied words from new and includes only expired timers in due", () => {
    const past = new Date(NOW.getTime() - 1000).toISOString();
    const future = new Date(NOW.getTime() + 1000).toISOString();
    const student = makeStudent({
      cat: progressAt("cat", 2, past),
      dog: progressAt("dog", 2, future),
    });

    const newIds = getNewWords(student).map((w) => w.id);
    expect(newIds).not.toContain("cat");
    expect(newIds).not.toContain("dog");

    const dueIds = getDueWords(student, NOW).map((w) => w.id);
    expect(dueIds).toEqual(["cat"]);
  });

  it("sorts due words by how overdue they are, oldest first", () => {
    const student = makeStudent({
      dog: progressAt("dog", 2, new Date(NOW.getTime() - 1000).toISOString()),
      cat: progressAt("cat", 2, new Date(NOW.getTime() - 5000).toISOString()),
    });
    expect(getDueWords(student, NOW).map((w) => w.id)).toEqual(["cat", "dog"]);
  });
});

describe("countMastered", () => {
  it("counts only words at the final stage", () => {
    const student = makeStudent({
      cat: progressAt("cat", MASTERED_STAGE, NOW.toISOString()),
      dog: progressAt("dog", MASTERED_STAGE - 1, NOW.toISOString()),
    });
    expect(countMastered(student)).toBe(1);
  });
});
