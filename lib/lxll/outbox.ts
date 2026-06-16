"use client";

import type { AntiForgetSubmission } from "./api";

/**
 * Durable "outbox" for review results that failed to upload. Persisted to
 * localStorage and keyed by lxll userId, so a failed submit survives a full
 * page reload and can be retried — and is only ever resent under the SAME
 * child's token (never cross-child). Batches older than the TTL are pruned so
 * a child who never returns can't pile up forever.
 */

const KEY = "lxll:outbox";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface OutboxBatch {
  userId: string;
  submissions: AntiForgetSubmission[];
  savedAt: number;
}

function read(): OutboxBatch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as OutboxBatch[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list: OutboxBatch[]): void {
  if (typeof window === "undefined") return;
  try {
    if (list.length === 0) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage full / disabled — best effort */
  }
}

/** All batches that haven't expired (expired ones are pruned on read). */
export function loadOutbox(now: number = Date.now()): OutboxBatch[] {
  return read().filter((b) => now - b.savedAt < TTL_MS);
}

/** The pending batch for one child, if any. */
export function getBatch(
  userId: string,
  now: number = Date.now(),
): OutboxBatch | undefined {
  return loadOutbox(now).find((b) => b.userId === userId);
}

/**
 * Queue (or update) a child's failed submissions. Merges by `antiForgetId` so
 * separately-failed slots accumulate and a re-attempt of the same slot updates
 * it. Refreshes the timestamp, so TTL counts from the last activity.
 */
export function saveBatch(
  userId: string,
  submissions: AntiForgetSubmission[],
  now: number = Date.now(),
): void {
  if (!userId || submissions.length === 0) return;
  const all = loadOutbox(now);
  const existing = all.find((b) => b.userId === userId);
  const others = all.filter((b) => b.userId !== userId);
  const byId = new Map<number, AntiForgetSubmission>();
  for (const s of existing?.submissions ?? []) byId.set(s.antiForgetId, s);
  for (const s of submissions) byId.set(s.antiForgetId, s);
  write([...others, { userId, submissions: [...byId.values()], savedAt: now }]);
}

/** Remove a child's queued batch (after a successful send). */
export function clearBatch(userId: string, now: number = Date.now()): void {
  write(loadOutbox(now).filter((b) => b.userId !== userId));
}

/** Wipe every queued batch (full sign-out / device-record clear). */
export function clearOutbox(): void {
  write([]);
}
