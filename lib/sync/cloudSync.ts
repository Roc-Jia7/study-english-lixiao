"use client";

import { loadSession } from "@/lib/lxll/client";
import { useAppStore } from "@/store/useAppStore";
import { mergeIntoStudent, toSyncState, type SyncState } from "./merge";

/**
 * Cross-device sync of a child's game progress via /api/state (Upstash Redis).
 * Entirely optional: if the backend isn't configured (no DB) every call
 * no-ops and the app stays purely local. Only lxll children sync (they have a
 * verified identity); demo profiles never do.
 */

const STATE_URL = "/api/state";

let disabled = false; // remember once the server reports "no DB"
let started = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let lastSerialized = "";

function authHeaders(): Record<string, string> | null {
  const s = loadSession();
  if (!s?.accessToken) return null;
  return { "x-lxll-token": s.accessToken, "x-lxll-user": s.userId ?? "" };
}

async function loadRemote(): Promise<SyncState | null> {
  if (disabled) return null;
  const headers = authHeaders();
  if (!headers) return null;
  try {
    const res = await fetch(STATE_URL, { headers });
    const json = await res.json().catch(() => null);
    if (json?.disabled) {
      disabled = true;
      return null;
    }
    return (json?.state as SyncState) ?? null;
  } catch {
    return null;
  }
}

async function saveRemote(state: SyncState): Promise<void> {
  if (disabled) return;
  const headers = authHeaders();
  if (!headers) return;
  try {
    const res = await fetch(STATE_URL, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    });
    const json = await res.json().catch(() => null);
    if (json?.disabled) disabled = true;
  } catch {
    /* keep local; the next change retries */
  }
}

/** On login/restore: pull remote, merge into the local student, push back. */
export async function pullAndMerge(userId: string): Promise<void> {
  const id = `lxll:${userId}`;
  const remote = await loadRemote();
  const store = useAppStore.getState();
  const local = store.students[id];
  if (!local) return;
  const merged = mergeIntoStudent(local, remote);
  store.replaceStudent(merged);
  lastSerialized = JSON.stringify(toSyncState(merged));
  // Persist the merged result (also seeds the very first device).
  void saveRemote(toSyncState(merged));
}

/** Debounced auto-push whenever the active lxll child's progress changes. */
export function startCloudSync(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  useAppStore.subscribe((state) => {
    if (disabled) return;
    const id = state.activeStudentId;
    if (!id || !id.startsWith("lxll:")) return;
    const stu = state.students[id];
    if (!stu) return;
    const ser = JSON.stringify(toSyncState(stu));
    if (ser === lastSerialized) return;
    lastSerialized = ser;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => void saveRemote(toSyncState(stu)), 2500);
  });
}
