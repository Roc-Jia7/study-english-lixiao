import type { StudentProfile } from "./types";

/**
 * Streak helpers. All dates are LOCAL yyyy-mm-dd, never UTC — a child in
 * UTC+8 studying at 7am must light up today's sticker, not yesterday's.
 */

export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDateStr(d);
}

/**
 * The streak to display right now: the stored count is only alive if the
 * child learned today or could still continue it today (learned yesterday).
 */
export function getEffectiveStreak(student: StudentProfile): number {
  const dates = new Set(student.learnedDates);
  if (dates.has(localDateStr()) || dates.has(yesterdayStr())) {
    return student.streakDays;
  }
  return 0;
}

/** The last n local dates, oldest first, ending today — the sticker wall. */
export function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(localDateStr(d));
  }
  return days;
}
