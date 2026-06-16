"use client";

import { motion } from "framer-motion";
import type { StudentProfile } from "@/lib/types";
import { lastNDays } from "@/lib/streak";
import { useLxllStore } from "@/store/useLxllStore";
import { splitSchedule } from "@/lib/lxll/schedule";
import { packStatsFromProgress } from "@/lib/study-plan";
import { WORD_PACK_META } from "@/lib/wordpacks";

/** One calm number tile — icon, value, label. */
function Tile({
  icon,
  value,
  label,
  accent = "text-white",
}: {
  icon: string;
  value: string | number;
  label: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-2xl bg-white/5 px-2 py-3 text-center">
      <span className="text-2xl">{icon}</span>
      <span className={`text-2xl font-extrabold ${accent}`}>{value}</span>
      <span className="text-xs font-bold text-white/50">{label}</span>
    </div>
  );
}

/**
 * A calm, chart-free snapshot for parents at the bottom of the dashboard.
 * Two learning tracks are kept visually separate so it's clear which numbers
 * come from the 李校来了 course (backend) and which from the bundled textbook
 * word packs (local memorization), plus a small shared "habits" row on top.
 */
export default function ParentSummary({ student }: { student: StudentProfile }) {
  const metric = useLxllStore((s) => s.metric);
  const profile = useLxllStore((s) => s.profile);
  const schedule = useLxllStore((s) => s.schedule);

  const week = new Set(lastNDays(7));
  const daysThisWeek = student.learnedDates.filter((d) => week.has(d)).length;

  // Only show the backend course numbers when the signed-in lxll user IS this
  // child, so another child's cached schedule/metric can never leak in.
  const lxllMatches = !!profile && student.id === `lxll:${profile.userId}`;
  const { due, done } = splitSchedule(schedule);

  // Overall accuracy across every answered card (numbers are allowed in the
  // parent view). "—" until there's at least one answer.
  const tally = Object.values(student.progress).reduce(
    (a, p) => {
      a.correct += p.timesCorrect;
      a.wrong += p.timesWrong;
      return a;
    },
    { correct: 0, wrong: 0 },
  );
  const answered = tally.correct + tally.wrong;
  const accuracy = answered > 0 ? `${Math.round((tally.correct / answered) * 100)}%` : "—";

  // 课本词单 — aggregate progress across every bundled pack (pack-scoped ids,
  // so lxll review words never count toward this track).
  const pack = WORD_PACK_META.reduce(
    (acc, meta) => {
      const s = packStatsFromProgress(student, meta);
      acc.total += s.total;
      acc.mastered += s.mastered;
      acc.due += s.dueCount;
      return acc;
    },
    { total: 0, mastered: 0, due: 0 },
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-12 rounded-3xl bg-white/[0.07] p-5 ring-1 ring-white/10"
    >
      <p className="mb-3 text-center text-sm font-bold text-white/50">
        👀 家长看板 · Parent View
      </p>

      {/* Shared habits — apply to both tracks */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile icon="📅" value={`${daysThisWeek}/7`} label="本周学习" />
        <Tile icon="🏅" value={student.bestStreak} label="最长连续(天)" />
        <Tile icon="✍️" value={student.energyToday} label="今日练习" />
        <Tile icon="🎯" value={accuracy} label="正确率" accent="text-sky-300" />
      </div>

      {/* 李校来了 · course (backend) — only for the signed-in child */}
      {lxllMatches && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold text-white/40">
            🎓 李校来了 · 课程（来自后端）
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Tile
              icon="📚"
              value={metric?.totalLearnedWordCount ?? 0}
              label="累计认识(词)"
              accent="text-amber-300"
            />
            <Tile
              icon="🦖"
              value={due.length}
              label="今日待复习(关)"
              accent="text-rose-300"
            />
            <Tile
              icon="✅"
              value={done.length}
              label="今日已复习(关)"
              accent="text-emerald-300"
            />
          </div>
        </div>
      )}

      {/* 课本词单 · local memorization packs */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-bold text-white/40">
          📚 课本词单 · 本地背诵
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Tile icon="🗂️" value={pack.total} label="卡片总数" />
          <Tile
            icon="⭐"
            value={pack.mastered}
            label="已掌握"
            accent="text-emerald-300"
          />
          <Tile
            icon="⏰"
            value={pack.due}
            label="今日待复习"
            accent="text-amber-300"
          />
        </div>
      </div>
    </motion.div>
  );
}
