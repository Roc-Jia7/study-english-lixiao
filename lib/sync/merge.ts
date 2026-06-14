import type { StudentProfile, WordProgress } from "@/lib/types";

/**
 * The cross-device sync payload — only a child's *game progress*, never their
 * name/avatar (those come live from the lxll profile on each device, keeping
 * personal info off our server). Merging is conflict-safe so two devices used
 * offline never clobber each other.
 */
export interface SyncState {
  petName?: string;
  xp: number;
  streakDays: number;
  bestStreak: number;
  learnedDates: string[];
  progress: Record<string, WordProgress>;
}

export function toSyncState(student: StudentProfile): SyncState {
  return {
    petName: student.petName,
    xp: student.xp,
    streakDays: student.streakDays,
    bestStreak: student.bestStreak,
    learnedDates: student.learnedDates,
    progress: student.progress,
  };
}

/** Per-word merge: the more-advanced memory wins (tie → more recent review). */
function mergeProgress(
  a: Record<string, WordProgress>,
  b: Record<string, WordProgress>,
): Record<string, WordProgress> {
  const out: Record<string, WordProgress> = { ...a };
  for (const [id, rp] of Object.entries(b)) {
    const lp = out[id];
    if (!lp) {
      out[id] = rp;
    } else if (
      rp.stage > lp.stage ||
      (rp.stage === lp.stage &&
        new Date(rp.lastReviewedAt).getTime() >
          new Date(lp.lastReviewedAt).getTime())
    ) {
      out[id] = rp;
    }
  }
  return out;
}

/**
 * Fold a remote sync payload into the local student record without losing
 * data: take the stronger of every signal. Returns a new student object.
 */
export function mergeIntoStudent(
  local: StudentProfile,
  remote: SyncState | null | undefined,
): StudentProfile {
  if (!remote) return local;
  return {
    ...local,
    petName: local.petName || remote.petName,
    xp: Math.max(local.xp, remote.xp ?? 0),
    streakDays: Math.max(local.streakDays, remote.streakDays ?? 0),
    bestStreak: Math.max(local.bestStreak, remote.bestStreak ?? 0),
    learnedDates: [
      ...new Set([...local.learnedDates, ...(remote.learnedDates ?? [])]),
    ].sort(),
    progress: mergeProgress(local.progress, remote.progress ?? {}),
  };
}
