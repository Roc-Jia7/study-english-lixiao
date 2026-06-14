import { describe, expect, it } from "vitest";
import { MASTERED_STAGE } from "../spaced-repetition";
import { packStats, planToday, reviewSchedule } from "../study-plan";
import type { StudentProfile, VocabularyWord, WordProgress } from "../types";
import type { WordPack } from "../wordpacks";

const NOW = new Date("2026-06-14T10:00:00.000Z");

function word(id: string): VocabularyWord {
  return {
    id,
    word: id,
    phonetic: "",
    translation: "",
    sentence_en: "",
    sentence_zh: "",
    category: "nature",
    tier: "beginner",
    imageUrl: "",
    emoji: "",
    nextReviewTime: "",
  };
}

function pack(...ids: string[]): WordPack {
  return { id: "p", name: "p", subtitle: "", source: "", words: ids.map(word) };
}

function prog(stage: number, nextReviewTime: string): WordProgress {
  return {
    wordId: "x",
    stage,
    nextReviewTime,
    lastReviewedAt: NOW.toISOString(),
    timesCorrect: 0,
    timesWrong: 0,
  };
}

function student(progress: Record<string, WordProgress>): StudentProfile {
  return {
    id: "t",
    name: "T",
    title: "",
    titleZh: "",
    avatar: "",
    gradient: "",
    xp: 0,
    energyToday: 0,
    energyDate: "",
    streakDays: 0,
    bestStreak: 0,
    learnedDates: [],
    progress,
  };
}

const past = new Date(NOW.getTime() - 60_000).toISOString();
const future = new Date(NOW.getTime() + 5 * 86_400_000).toISOString();

describe("packStats", () => {
  it("breaks the pack into mastered / learning / fresh + due", () => {
    const p = pack("a", "b", "c", "d");
    const s = student({
      a: prog(MASTERED_STAGE, future), // mastered
      b: prog(2, past), // learning + due
      c: prog(2, future), // learning, not due
      // d untouched → fresh
    });
    const st = packStats(s, p, NOW);
    expect(st).toMatchObject({
      total: 4,
      mastered: 1,
      learning: 2,
      fresh: 1,
      dueCount: 1,
      masteredPct: 25,
    });
  });
});

describe("planToday", () => {
  it("combines due reviews with a capped number of new words + ETA", () => {
    const p = pack("a", "b", "c", "d", "e"); // a due, rest new
    const s = student({ a: prog(2, past) });
    const plan = planToday(s, p, 2, NOW);
    expect(plan.due.map((w) => w.id)).toEqual(["a"]);
    expect(plan.newToday).toHaveLength(2); // quota
    expect(plan.words).toHaveLength(3);
    expect(plan.etaDays).toBe(2); // 4 new / 2 per day
  });
});

describe("reviewSchedule", () => {
  it("buckets studied, not-yet-mastered words by next review time", () => {
    const p = pack("a", "b", "c", "d");
    const s = student({
      a: prog(2, past), // overdue
      b: prog(MASTERED_STAGE, future), // mastered → excluded
      c: prog(2, new Date(NOW.getTime() + 30 * 60_000).toISOString()), // within hour
    });
    const buckets = reviewSchedule(s, p, NOW);
    const map = Object.fromEntries(buckets.map((b) => [b.key, b.count]));
    expect(map.overdue).toBe(1);
    expect(map.hour).toBe(1);
    expect(buckets.find((b) => b.key === "later")).toBeUndefined();
  });
});
