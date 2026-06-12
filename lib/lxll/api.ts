/**
 * Typed wrappers for the lxll course & anti-forget (spaced-repetition)
 * endpoints. Request endpoints are confirmed; the param objects and the
 * returned row shapes are PROVISIONAL inferences — verify each against one
 * real authenticated response before relying on field names.
 *
 * `unknown[]` returns are deliberate: the official client splits page logic
 * into lazy chunks, so exact row fields aren't recoverable statically.
 */

import { LXLL_RPC } from "./endpoints";
import { rpc } from "./client";

/** A student under the logged-in customer account (parent → children). */
export interface LxllStudentCourse {
  courseOrderId?: string;
  courseBookId?: string;
  courseName?: string;
  studentName?: string;
  [extra: string]: unknown;
}

/** A vocabulary word as the backend models it (anti-forget course word). */
export interface LxllWord {
  wordId?: string;
  word?: string;
  /** Backend's forgetting-curve timing field (seen in submit params). */
  antiForgetTime?: number | string;
  [extra: string]: unknown;
}

// ── Courses ───────────────────────────────────────────────────────────
export function listStudentCourses(): Promise<LxllStudentCourse[]> {
  return rpc<LxllStudentCourse[]>(LXLL_RPC.listStudentCourses, {});
}

export function listSubscriptionCourses(): Promise<unknown[]> {
  return rpc<unknown[]>(LXLL_RPC.listUserSubscriptionCourse, {});
}

export function queryCourseDetail(courseOrderId: string): Promise<unknown> {
  return rpc(LXLL_RPC.queryCourseDetail, { courseOrderId });
}

export function listCourseWords(courseId: string): Promise<LxllWord[]> {
  return rpc<LxllWord[]>(LXLL_RPC.listCourseWordByCourseId, { courseId });
}

export function getCourseOrderCount(): Promise<unknown> {
  return rpc(LXLL_RPC.getCourseOrderCount, {});
}

// ── Anti-forget: new words & reviews (maps to our Discovery / Monster UX) ──
export function listNewWords(courseOrderId: string): Promise<LxllWord[]> {
  return rpc<LxllWord[]>(LXLL_RPC.listNewWords, { courseOrderId });
}

export function listReviewWords(courseOrderId: string): Promise<LxllWord[]> {
  return rpc<LxllWord[]>(LXLL_RPC.listReviewWords, { courseOrderId });
}

/** Confirmed param shape from the client bundle. */
export function submitLearnNewWordResult(params: {
  courseBookId: string;
  courseOrderId: string;
  antiForgetTime: number | string;
  [extra: string]: unknown;
}): Promise<unknown> {
  return rpc(LXLL_RPC.submitLearnNewWordResult, params);
}

export function submitReviewResult(params: {
  courseOrderId: string;
  [extra: string]: unknown;
}): Promise<unknown> {
  return rpc(LXLL_RPC.submitReviewResult, params);
}
