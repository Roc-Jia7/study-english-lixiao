"use client";

import { create } from "zustand";
import {
  loginByPassword,
  fetchUserProfile,
  logout as lxllLogout,
  type LxllUserProfile,
} from "@/lib/lxll/auth";
import { loadSession } from "@/lib/lxll/client";
import { LxllApiError } from "@/lib/lxll/client";

type Status = "idle" | "loading" | "authed" | "error";

interface LxllState {
  status: Status;
  profile: LxllUserProfile | null;
  error: string | null;

  /** Account/password login, then load the profile. */
  signIn: (phone: string, password: string) => Promise<boolean>;
  /** Re-hydrate from a stored token (call once on mount). */
  restore: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useLxllStore = create<LxllState>((set) => ({
  status: "idle",
  profile: null,
  error: null,

  signIn: async (phone, password) => {
    set({ status: "loading", error: null });
    try {
      await loginByPassword(phone, password);
      const profile = await fetchUserProfile();
      set({ status: "authed", profile });
      return true;
    } catch (e) {
      const msg =
        e instanceof LxllApiError ? e.message : "登录失败，请稍后重试";
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
    } catch {
      // Stale/invalid token — fall back to logged-out, no error shown.
      set({ status: "idle", profile: null });
    }
  },

  signOut: async () => {
    await lxllLogout();
    set({ status: "idle", profile: null, error: null });
  },

  clearError: () => set({ error: null }),
}));
