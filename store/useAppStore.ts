"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { StudentProfile } from "@/lib/types";
import { applyAnswer } from "@/lib/spaced-repetition";
import { localDateStr, yesterdayStr } from "@/lib/streak";
import { XP_BATCH_BONUS, XP_PER_KNOWN, XP_PER_TRY } from "@/lib/pet";

function makeStudent(
  id: string,
  name: string,
  title: string,
  titleZh: string,
  avatar: string,
  gradient: string,
): StudentProfile {
  return {
    id,
    name,
    title,
    titleZh,
    avatar,
    gradient,
    xp: 0,
    energyToday: 0,
    energyDate: localDateStr(),
    streakDays: 0,
    bestStreak: 0,
    learnedDates: [],
    progress: {},
  };
}

const DEFAULT_STUDENTS: Record<string, StudentProfile> = {
  lixiao: makeStudent(
    "lixiao",
    "Lixiao",
    "Explorer",
    "小小探险家",
    "🦖",
    "from-amber-300 to-orange-400",
  ),
  max: makeStudent(
    "max",
    "Max",
    "Voyager",
    "星际旅行家",
    "🚀",
    "from-sky-300 to-blue-400",
  ),
  lily: makeStudent(
    "lily",
    "Lily",
    "Star Captain",
    "星星船长",
    "🦄",
    "from-pink-300 to-rose-400",
  ),
};

interface AppState {
  students: Record<string, StudentProfile>;
  activeStudentId: string | null;
  parentUnlocked: boolean;

  unlockParentGate: () => void;
  lockStation: () => void;
  selectStudent: (id: string) => void;
  switchProfile: () => void;
  recordAnswer: (wordId: string, known: boolean) => void;
  grantBatchBonus: () => void;
  /** Create (once) and select a profile for a real lxll student. */
  ensureStudent: (
    profile: Pick<StudentProfile, "id" | "name" | "title" | "titleZh" | "avatar" | "gradient">,
  ) => void;
}

/** Reset the daily energy counter when the calendar day changes. */
function withFreshEnergy(student: StudentProfile): StudentProfile {
  return student.energyDate === localDateStr()
    ? student
    : { ...student, energyToday: 0, energyDate: localDateStr() };
}

/** First answer of the day lights today's sticker and extends the streak. */
function withTodayLearned(student: StudentProfile): StudentProfile {
  const today = localDateStr();
  if (student.learnedDates.includes(today)) return student;
  const continued = student.learnedDates.includes(yesterdayStr());
  const streakDays = continued ? student.streakDays + 1 : 1;
  return {
    ...student,
    learnedDates: [...student.learnedDates, today],
    streakDays,
    bestStreak: Math.max(streakDays, student.bestStreak),
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      students: DEFAULT_STUDENTS,
      activeStudentId: null,
      parentUnlocked: false,

      unlockParentGate: () => set({ parentUnlocked: true }),

      lockStation: () => set({ parentUnlocked: false, activeStudentId: null }),

      selectStudent: (id) =>
        set((state) => ({
          activeStudentId: id,
          students: {
            ...state.students,
            [id]: withFreshEnergy(state.students[id]),
          },
        })),

      switchProfile: () => set({ activeStudentId: null }),

      ensureStudent: (profile) =>
        set((state) => {
          const existing = state.students[profile.id];
          const student: StudentProfile = existing
            ? withFreshEnergy(existing)
            : {
                ...profile,
                xp: 0,
                energyToday: 0,
                energyDate: localDateStr(),
                streakDays: 0,
                bestStreak: 0,
                learnedDates: [],
                progress: {},
              };
          return {
            activeStudentId: profile.id,
            parentUnlocked: true,
            students: { ...state.students, [profile.id]: student },
          };
        }),

      recordAnswer: (wordId, known) =>
        set((state) => {
          const id = state.activeStudentId;
          if (!id) return state;
          const student = withTodayLearned(withFreshEnergy(state.students[id]));
          const updated: StudentProfile = {
            ...student,
            xp: student.xp + (known ? XP_PER_KNOWN : XP_PER_TRY),
            energyToday: student.energyToday + 1,
            progress: {
              ...student.progress,
              [wordId]: applyAnswer(student.progress[wordId], wordId, known),
            },
          };
          return { students: { ...state.students, [id]: updated } };
        }),

      grantBatchBonus: () =>
        set((state) => {
          const id = state.activeStudentId;
          if (!id) return state;
          const student = state.students[id];
          return {
            students: {
              ...state.students,
              [id]: { ...student, xp: student.xp + XP_BATCH_BONUS },
            },
          };
        }),
    }),
    {
      name: "word-star-academy",
      storage: createJSONStorage(() => localStorage),
      version: 3,
      migrate: (persisted) => {
        const state = persisted as Partial<AppState> | undefined;
        // v1 profiles (pre-streak) gain the new fields with safe defaults.
        if (state?.students) {
          for (const student of Object.values(state.students)) {
            student.streakDays ??= 0;
            student.bestStreak ??= 0;
            student.learnedDates ??= [];
          }
        }
        // v3: real account login became the default entry — return returning
        // users to the landing screen once so they see it (and re-pick a child).
        if (state) {
          state.activeStudentId = null;
          state.parentUnlocked = false;
        }
        return state as AppState;
      },
    },
  ),
);

export function useActiveStudent(): StudentProfile | null {
  return useAppStore((s) =>
    s.activeStudentId ? (s.students[s.activeStudentId] ?? null) : null,
  );
}
