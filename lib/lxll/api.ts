/**
 * Course & anti-forget (spaced-repetition) data from lxll. The anti-forget
 * record is the student's forgetting-curve review schedule; the detail
 * endpoint returns the actual words for one or more scheduled reviews.
 * All confirmed against real responses.
 */

import { rpc, v2 } from "./client";
import { LXLL_RPC } from "./endpoints";
import type {
  LxllAntiForgetDay,
  LxllAntiForgetDetail,
  LxllStudentMetric,
  LxllTrainingBoardItem,
} from "./types";

/** Lifetime stats: total words learned, remaining lesson quotas. */
export function retrieveStudentMetric(): Promise<LxllStudentMetric> {
  return rpc<LxllStudentMetric>(LXLL_RPC.retrieveStudentMetric);
}

/** The student's full forgetting-curve schedule, grouped by due day. */
export function listAntiForgetSchedule(): Promise<LxllAntiForgetDay[]> {
  return v2<LxllAntiForgetDay[]>("customer/anti-forget/record/student", {
    method: "GET",
  });
}

/** The words for one or more scheduled anti-forget reviews. */
export function getAntiForgetDetail(
  antiForgetIds: Array<number | string>,
): Promise<LxllAntiForgetDetail[]> {
  return v2<LxllAntiForgetDetail[]>("customer/anti-forget/detail", {
    method: "GET",
    query: { antiForgetIds: antiForgetIds.join(",") },
  });
}

/** Upcoming training sessions (teacher + word material) for the student. */
export function listTrainingBoard(): Promise<LxllTrainingBoardItem[]> {
  return v2<LxllTrainingBoardItem[]>("customer/training/board", {
    method: "GET",
  });
}

export interface AntiForgetSubmission {
  antiForgetId: number;
  words: Array<{ wordId: number; status: boolean }>;
}

/**
 * Write review results back to the forgetting curve. Confirmed payload:
 * a per-review array of word pass/fail (`status:true` = remembered). This
 * advances the child's real anti-forget schedule on the backend.
 */
export function submitAntiForgetProgress(
  submissions: AntiForgetSubmission[],
): Promise<boolean> {
  const body = submissions.map((s) => ({ role: "STUDENT", ...s }));
  return v2<boolean>("customer/anti-forget/progress/submit", {
    method: "POST",
    body,
  });
}

/**
 * Today's due reviews: every record whose due day is today or earlier and
 * still PENDING, flattened and de-duplicated by antiForgetId.
 */
export function selectDueReviews(
  schedule: LxllAntiForgetDay[],
  now: Date = new Date(),
): LxllAntiForgetDay["records"] {
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const cutoff = endOfToday.getTime();

  const seen = new Set<number>();
  const due: LxllAntiForgetDay["records"] = [];
  for (const day of schedule) {
    for (const r of day.records) {
      if (r.status !== "PENDING") continue;
      if (r.antiForgetDate > cutoff) continue;
      if (seen.has(r.antiForgetId)) continue;
      seen.add(r.antiForgetId);
      due.push(r);
    }
  }
  return due.sort((a, b) => a.antiForgetDate - b.antiForgetDate);
}
