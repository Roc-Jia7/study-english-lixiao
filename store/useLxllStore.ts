"use client";

import { create } from "zustand";
import { loginByPassword, fetchUserProfile, logout as lxllLogout } from "@/lib/lxll/auth";
import {
  listAntiForgetSchedule,
  getAntiForgetDetail,
  retrieveStudentMetric,
  submitAntiForgetProgress,
  type AntiForgetSubmission,
} from "@/lib/lxll/api";
import { lxllWordToVocabulary } from "@/lib/lxll/adapter";
import { loadSession, clearSession, LxllApiError } from "@/lib/lxll/client";
import { rememberLogin } from "@/lib/lxll/recentLogins";
import { pullAndMerge } from "@/lib/sync/cloudSync";
import type {
  LxllAntiForgetDay,
  LxllStudentMetric,
  LxllUserProfile,
} from "@/lib/lxll/types";
import type { VocabularyWord } from "@/lib/types";
import { useAppStore } from "./useAppStore";

type Status = "idle" | "loading" | "authed" | "error";

/** Bring the real student into the local game layer (pet/streak/confetti). */
function adoptStudent(profile: LxllUserProfile) {
  useAppStore.getState().ensureStudent({
    id: `lxll:${profile.userId}`,
    name: profile.userName,
    title: "Word Explorer",
    titleZh: profile.age ? `${profile.age} 岁 · 单词探险家` : "单词探险家",
    avatar: profile.gender === "FEMALE" ? "👧" : "👦",
    gradient:
      profile.gender === "FEMALE"
        ? "from-pink-300 to-rose-400"
        : "from-sky-300 to-blue-400",
  });
}

interface LxllState {
  status: Status;
  profile: LxllUserProfile | null;
  error: string | null;

  /** Full anti-forget schedule (grouped by day) for browse-and-pick. */
  schedule: LxllAntiForgetDay[];
  metric: LxllStudentMetric | null;
  loadingData: boolean;
  /** Set when the schedule fetch fails, so we don't fake an "all done" state. */
  dataError: string | null;

  /** Which words belong to which review, for grouping the result submit. */
  sessionReviews: Array<{ antiForgetId: number; wordIds: number[] }>;
  /** Per-word result collected during the current session (wordId → known). */
  pendingResults: Record<number, boolean>;

  signIn: (identifier: string, password: string) => Promise<boolean>;
  restore: () => Promise<void>;
  loadData: () => Promise<void>;
  /** Fetch the words for ONE chosen review slot to start a session. */
  loadSlotWords: (antiForgetId: number) => Promise<VocabularyWord[]>;
  /** Record one word's outcome (called per card from the session). */
  recordWordResult: (backendWordId: number, known: boolean) => void;
  /** Write collected results back to the forgetting curve, then refresh. */
  submitResults: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useLxllStore = create<LxllState>((set, get) => ({
  status: "idle",
  profile: null,
  error: null,
  schedule: [],
  metric: null,
  loadingData: false,
  dataError: null,
  sessionReviews: [],
  pendingResults: {},

  signIn: async (identifier, password) => {
    // Clear the previous child's data up front. The same phone with a
    // different password is a DIFFERENT child, so nothing from the last
    // session may leak into this one.
    set({
      status: "loading",
      error: null,
      profile: null,
      schedule: [],
      metric: null,
      dataError: null,
      sessionReviews: [],
      pendingResults: {},
    });
    try {
      await loginByPassword(identifier, password);
      const profile = await fetchUserProfile();
      set({ status: "authed", profile });
      adoptStudent(profile);
      // Remember this child on the device (identifier + name, never password)
      // so switching back later only needs their password.
      rememberLogin({
        userId: profile.userId,
        identifier: identifier.trim(),
        name: profile.userName,
        avatar: profile.gender === "FEMALE" ? "👧" : "👦",
      });
      // Pull cross-device progress and merge it into the local profile.
      await pullAndMerge(profile.userId);
      void get().loadData();
      return true;
    } catch (e) {
      const msg = e instanceof LxllApiError ? e.message : "登录失败，请稍后重试";
      set({ status: "error", error: msg });
      return false;
    }
  },

  restore: async () => {
    if (!loadSession()) return;
    set({ status: "loading" });
    try {
      const profile = await fetchUserProfile();
      set({ status: "authed", profile });
      adoptStudent(profile);
      await pullAndMerge(profile.userId);
      void get().loadData();
    } catch {
      clearSession();
      set({ status: "idle", profile: null });
    }
  },

  loadData: async () => {
    set({ loadingData: true, dataError: null });
    try {
      const [schedule, metric] = await Promise.all([
        listAntiForgetSchedule(),
        retrieveStudentMetric().catch(() => null),
      ]);
      set({ schedule, metric, loadingData: false });
    } catch {
      // Surface the failure instead of letting an empty schedule masquerade
      // as "all done today".
      set({ loadingData: false, dataError: "没能连上李校来了，请检查网络后重试" });
    }
  },

  loadSlotWords: async (antiForgetId) => {
    const details = await getAntiForgetDetail([antiForgetId]);
    // One slot → its words, with the review remembered for result submit.
    const sessionReviews = details.map((d) => ({
      antiForgetId: d.antiForgetId,
      wordIds: (d.words ?? []).map((w) => w.wordId),
    }));
    const seen = new Set<string>();
    const words: VocabularyWord[] = [];
    for (const d of details) {
      for (const w of d.words ?? []) {
        const v = lxllWordToVocabulary(w);
        if (seen.has(v.id)) continue;
        seen.add(v.id);
        words.push(v);
      }
    }
    set({ sessionReviews, pendingResults: {} });
    return words;
  },

  recordWordResult: (backendWordId, known) =>
    set((state) => ({
      pendingResults: { ...state.pendingResults, [backendWordId]: known },
    })),

  submitResults: async () => {
    const { sessionReviews, pendingResults } = get();
    const submissions: AntiForgetSubmission[] = sessionReviews
      .map((rev) => ({
        antiForgetId: rev.antiForgetId,
        words: rev.wordIds
          .filter((id) => id in pendingResults)
          .map((id) => ({ wordId: id, status: pendingResults[id] })),
      }))
      .filter((s) => s.words.length > 0);

    if (submissions.length === 0) return;
    try {
      await submitAntiForgetProgress(submissions);
    } catch {
      // Keep results so a later retry can resend; surface nothing to the kid.
      return;
    }
    set({ pendingResults: {}, sessionReviews: [] });
    void get().loadData();
  },

  signOut: async () => {
    await lxllLogout();
    set({
      status: "idle",
      profile: null,
      error: null,
      schedule: [],
      metric: null,
      dataError: null,
    });
  },

  clearError: () => set({ error: null }),
}));
