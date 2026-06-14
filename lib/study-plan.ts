import type { StudentProfile, VocabularyWord } from "./types";
import {
  MASTERED_STAGE,
  getDueFromPool,
  getNewFromPool,
} from "./spaced-repetition";
import { localDateStr } from "./streak";
import type { WordPack } from "./wordpacks";

/**
 * Quota-driven study planning over the forgetting curve. The single knob is
 * "new words per day"; the curve (applyAnswer) decides every review time, so
 * the plan is just: today's due reviews + a few new words, plus an ETA and a
 * schedule preview derived entirely from each word's nextReviewTime.
 */

export const DEFAULT_DAILY_NEW = 8;
export const DAILY_NEW_OPTIONS = [4, 6, 8, 10, 15, 20];
/** Never pile more than this many due reviews into one sitting. */
export const DUE_CAP = 12;

export interface PackStats {
  total: number;
  /** stage === MASTERED_STAGE */
  mastered: number;
  /** studied but not yet mastered */
  learning: number;
  /** never studied */
  fresh: number;
  /** due right now */
  dueCount: number;
  masteredPct: number; // 0..100
}

export function packStats(
  student: StudentProfile,
  pack: WordPack,
  now: Date = new Date(),
): PackStats {
  const total = pack.words.length;
  let mastered = 0;
  let learning = 0;
  let fresh = 0;
  for (const w of pack.words) {
    const p = student.progress[w.id];
    if (!p) fresh++;
    else if (p.stage >= MASTERED_STAGE) mastered++;
    else learning++;
  }
  const dueCount = getDueFromPool(student, pack.words, now).length;
  return {
    total,
    mastered,
    learning,
    fresh,
    dueCount,
    masteredPct: total ? Math.round((mastered / total) * 100) : 0,
  };
}

export interface TodayPlan {
  /** Due reviews to clear today (capped). */
  due: VocabularyWord[];
  /** New words introduced today (capped by the daily quota). */
  newToday: VocabularyWord[];
  /** The session deck: due first, then new. */
  words: VocabularyWord[];
  /** Days to introduce every remaining new word at this quota. */
  etaDays: number;
}

export function planToday(
  student: StudentProfile,
  pack: WordPack,
  dailyNew: number,
  now: Date = new Date(),
): TodayPlan {
  const due = getDueFromPool(student, pack.words, now).slice(0, DUE_CAP);
  const allNew = getNewFromPool(student, pack.words);
  const newToday = allNew.slice(0, Math.max(0, dailyNew));
  return {
    due,
    newToday,
    words: [...due, ...newToday],
    etaDays: Math.ceil(allNew.length / Math.max(1, dailyNew)),
  };
}

export interface DueBucket {
  key: "overdue" | "hour" | "today" | "tomorrow" | "later";
  label: string;
  count: number;
}

/**
 * When the curve will bring words back — a preview of upcoming reviews,
 * bucketed by each studied (not-yet-mastered) word's nextReviewTime.
 */
export function reviewSchedule(
  student: StudentProfile,
  pack: WordPack,
  now: Date = new Date(),
): DueBucket[] {
  const buckets: Record<DueBucket["key"], number> = {
    overdue: 0,
    hour: 0,
    today: 0,
    tomorrow: 0,
    later: 0,
  };
  const today = localDateStr(now);
  const tomorrow = localDateStr(new Date(now.getTime() + 86_400_000));

  for (const w of pack.words) {
    const p = student.progress[w.id];
    if (!p || p.stage >= MASTERED_STAGE) continue; // unstudied or done
    const when = new Date(p.nextReviewTime);
    const diff = when.getTime() - now.getTime();
    if (diff <= 0) buckets.overdue++;
    else if (diff <= 3_600_000) buckets.hour++;
    else {
      const day = localDateStr(when);
      if (day === today) buckets.today++;
      else if (day === tomorrow) buckets.tomorrow++;
      else buckets.later++;
    }
  }

  const labels: Record<DueBucket["key"], string> = {
    overdue: "已到期",
    hour: "1小时内",
    today: "今天稍晚",
    tomorrow: "明天",
    later: "更晚",
  };
  return (Object.keys(buckets) as DueBucket["key"][])
    .map((key) => ({ key, label: labels[key], count: buckets[key] }))
    .filter((b) => b.count > 0);
}

/** Human "next review" hint for one word, from its forgetting-curve timer. */
export function nextReviewLabel(
  nextReviewTime: string,
  now: Date = new Date(),
): string {
  const diff = new Date(nextReviewTime).getTime() - now.getTime();
  if (diff <= 0) return "已到期";
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `${mins} 分钟后`;
  const hours = Math.round(diff / 3_600_000);
  if (hours < 24) return `${hours} 小时后`;
  const days = Math.round(diff / 86_400_000);
  return `${days} 天后`;
}
