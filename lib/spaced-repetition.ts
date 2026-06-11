import type { StudentProfile, VocabularyWord, WordProgress } from "./types";
import { VOCABULARY } from "./vocabulary";

/**
 * Ebbinghaus forgetting-curve checkpoints, expressed in milliseconds.
 * Index = memory stage. The child never sees these numbers — they only
 * see hungry monsters appear when a word becomes due.
 */
export const REVIEW_INTERVALS_MS = [
  0, //              stage 0: brand new
  5 * 60_000, //     stage 1: 5 minutes
  30 * 60_000, //    stage 2: 30 minutes
  12 * 3_600_000, // stage 3: 12 hours
  24 * 3_600_000, // stage 4: 1 day
  2 * 86_400_000, // stage 5: 2 days
  4 * 86_400_000, // stage 6: 4 days
  7 * 86_400_000, // stage 7: 1 week
  15 * 86_400_000, // stage 8: 15 days → mastered
];

export const MASTERED_STAGE = REVIEW_INTERVALS_MS.length - 1;

/** How many new words make up one Discovery Pack. */
export const DISCOVERY_PACK_SIZE = 6;
/** Cap a single review session so it never overwhelms a child. */
export const REVIEW_SESSION_CAP = 8;

export function advanceStage(stage: number, known: boolean): number {
  if (known) return Math.min(stage + 1, MASTERED_STAGE);
  // Gentle for kids: forgetting drops the word back two checkpoints,
  // never below stage 1 (so it always comes back soon, not instantly).
  return Math.max(1, stage - 2);
}

export function applyAnswer(
  prev: WordProgress | undefined,
  wordId: string,
  known: boolean,
  now: Date = new Date(),
): WordProgress {
  const stage = advanceStage(prev?.stage ?? 0, known);
  return {
    wordId,
    stage,
    lastReviewedAt: now.toISOString(),
    nextReviewTime: new Date(
      now.getTime() + REVIEW_INTERVALS_MS[stage],
    ).toISOString(),
    timesCorrect: (prev?.timesCorrect ?? 0) + (known ? 1 : 0),
    timesWrong: (prev?.timesWrong ?? 0) + (known ? 0 : 1),
  };
}

/** 0..1 memory strength — drives per-word star gauges, never raw hours. */
export function memoryStrength(progress: WordProgress | undefined): number {
  return (progress?.stage ?? 0) / MASTERED_STAGE;
}

/** Words this student has never studied, grouped for Discovery Packs. */
export function getNewWords(student: StudentProfile): VocabularyWord[] {
  return VOCABULARY.filter((w) => !student.progress[w.id]);
}

/** Words whose forgetting-curve timer has expired — the hungry monsters. */
export function getDueWords(
  student: StudentProfile,
  now: Date = new Date(),
): VocabularyWord[] {
  return VOCABULARY.filter((w) => {
    const p = student.progress[w.id];
    return p && new Date(p.nextReviewTime).getTime() <= now.getTime();
  }).sort((a, b) => {
    const pa = student.progress[a.id];
    const pb = student.progress[b.id];
    return (
      new Date(pa.nextReviewTime).getTime() -
      new Date(pb.nextReviewTime).getTime()
    );
  });
}

export function countMastered(student: StudentProfile): number {
  return Object.values(student.progress).filter(
    (p) => p.stage >= MASTERED_STAGE,
  ).length;
}
