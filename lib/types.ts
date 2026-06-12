export type WordCategory = "animals" | "food" | "colors" | "nature";
export type WordTier = "beginner" | "intermediate";

export interface VocabularyWord {
  id: string;
  word: string;
  phonetic: string;
  translation: string;
  sentence_en: string;
  sentence_zh: string;
  category: WordCategory;
  tier: WordTier;
  /** Vector placeholder illustration url (swap in real artwork later). */
  imageUrl: string;
  /** Optional pre-recorded pronunciation URL; falls back to Web Speech. */
  audioUrl?: string;
  /** Optional real English+Chinese recording for bilingual playback. */
  audioUrlBilingual?: string;
  /** Always-available visual anchor rendered on the card. */
  emoji: string;
  /** ISO string mapping to forgetting stages. Seed value; live value lives in WordProgress. */
  nextReviewTime: string;
}

/** Per-student memory state for one word (the live forgetting-curve record). */
export interface WordProgress {
  wordId: string;
  /** 0 = never studied, 1..MASTERED_STAGE = forgetting-curve checkpoints. */
  stage: number;
  nextReviewTime: string;
  lastReviewedAt: string;
  timesCorrect: number;
  timesWrong: number;
}

export interface StudentProfile {
  id: string;
  name: string;
  /** Space rank shown under the name, e.g. "Explorer". */
  title: string;
  titleZh: string;
  avatar: string;
  /** Tailwind gradient classes for this child's card. */
  gradient: string;
  xp: number;
  /** Answers given today, drives the daily energy bar. */
  energyToday: number;
  /** yyyy-mm-dd (local time) used to reset energyToday each morning. */
  energyDate: string;
  /** Consecutive learning days as of the last learned day. */
  streakDays: number;
  bestStreak: number;
  /** Every local yyyy-mm-dd the child answered at least once — the sticker wall. */
  learnedDates: string[];
  progress: Record<string, WordProgress>;
}

export type SessionMode = "discovery" | "review";
