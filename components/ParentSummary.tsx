"use client";

import { motion } from "framer-motion";
import type { StudentProfile } from "@/lib/types";
import { lastNDays } from "@/lib/streak";
import { useLxllStore } from "@/store/useLxllStore";

/**
 * A calm, chart-free snapshot for parents at the bottom of the dashboard:
 * just four honest numbers — days learned this week, total words known,
 * best streak, and today's practice count. Deliberately understated so it
 * never competes with the child's playful mission control above it.
 */
export default function ParentSummary({ student }: { student: StudentProfile }) {
  const metric = useLxllStore((s) => s.metric);
  const profile = useLxllStore((s) => s.profile);

  const week = new Set(lastNDays(7));
  const daysThisWeek = student.learnedDates.filter((d) => week.has(d)).length;

  // Only trust the backend lifetime count when the signed-in lxll user IS
  // this child; otherwise (different child, or a demo profile) fall back to
  // the words touched locally, so no one else's number leaks in.
  const lxllMatches =
    !!profile && student.id === `lxll:${profile.userId}`;
  const wordsKnown =
    (lxllMatches ? metric?.totalLearnedWordCount : undefined) ??
    Object.values(student.progress).filter((p) => p.stage > 0).length;

  const stats: Array<{ icon: string; value: string | number; label: string }> = [
    { icon: "📅", value: `${daysThisWeek}/7`, label: "本周学习" },
    { icon: "📚", value: wordsKnown, label: "认识单词" },
    { icon: "🏅", value: student.bestStreak, label: "最长连续(天)" },
    { icon: "✍️", value: student.energyToday, label: "今日练习" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-12 rounded-3xl bg-white/[0.07] p-5 ring-1 ring-white/10"
    >
      <p className="mb-3 text-center text-sm font-bold text-white/50">
        👀 家长看板 · Parent View
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-0.5 rounded-2xl bg-white/5 px-2 py-3 text-center"
          >
            <span className="text-2xl">{s.icon}</span>
            <span className="text-2xl font-extrabold text-white">{s.value}</span>
            <span className="text-xs font-bold text-white/50">{s.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
