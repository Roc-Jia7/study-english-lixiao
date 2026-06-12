import { localDateStr } from "@/lib/streak";
import type { LxllAntiForgetDay, LxllAntiForgetRecord } from "./types";

/**
 * Turn the raw anti-forget schedule into a browse-and-pick model:
 * the review slots due today (or overdue) that the child can start now,
 * and a light preview of the next few days. Grouping is by the LOCAL day of
 * each record's `antiForgetDate` (not the API's UTC `time` bucket), and
 * records are de-duplicated by `antiForgetId`.
 */

export interface ReviewDay {
  /** Local yyyy-mm-dd. */
  date: string;
  records: LxllAntiForgetRecord[];
}

export function flattenPending(
  schedule: LxllAntiForgetDay[],
): LxllAntiForgetRecord[] {
  const seen = new Set<number>();
  const out: LxllAntiForgetRecord[] = [];
  for (const day of schedule) {
    for (const r of day.records) {
      if (r.status !== "PENDING") continue;
      if (seen.has(r.antiForgetId)) continue;
      seen.add(r.antiForgetId);
      out.push(r);
    }
  }
  return out;
}

export interface SplitSchedule {
  /** Due now (today or earlier), oldest first — the tappable slots. */
  due: LxllAntiForgetRecord[];
  /** Future days, earliest first — preview only. */
  upcoming: ReviewDay[];
}

export function splitSchedule(
  schedule: LxllAntiForgetDay[],
  now: Date = new Date(),
): SplitSchedule {
  const today = localDateStr(now);
  const all = flattenPending(schedule);

  const due = all
    .filter((r) => localDateStr(new Date(r.antiForgetDate)) <= today)
    .sort((a, b) => a.antiForgetDate - b.antiForgetDate);

  const byDay = new Map<string, LxllAntiForgetRecord[]>();
  for (const r of all) {
    const d = localDateStr(new Date(r.antiForgetDate));
    if (d <= today) continue;
    const list = byDay.get(d) ?? [];
    list.push(r);
    byDay.set(d, list);
  }
  const upcoming: ReviewDay[] = [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, records]) => ({
      date,
      records: records.sort((a, b) => a.antiForgetDate - b.antiForgetDate),
    }));

  return { due, upcoming };
}
