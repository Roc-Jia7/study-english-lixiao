"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Play, Star, Volume2 } from "lucide-react";
import type { VocabularyWord } from "@/lib/types";
import { useActiveStudent, useAppStore } from "@/store/useAppStore";
import { MASTERED_STAGE } from "@/lib/spaced-repetition";
import {
  DAILY_NEW_OPTIONS,
  DEFAULT_DAILY_NEW,
  nextReviewLabel,
  packStats,
  type PackStats,
  planToday,
  reviewSchedule,
} from "@/lib/study-plan";
import { playWordAudio } from "@/lib/audio";
import { popSound } from "@/lib/sfx";
import type { WordPack } from "@/lib/wordpacks";

interface PackDetailProps {
  pack: WordPack;
  onBack: () => void;
  onStart: (words: VocabularyWord[]) => void;
}

/** A 0–5 star gauge of one word's memory strength (forgetting-curve stage). */
function MemoryStars({ stage }: { stage: number }) {
  const filled = Math.round((Math.min(stage, MASTERED_STAGE) / MASTERED_STAGE) * 5);
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < filled ? "fill-amber-300 text-amber-300" : "text-white/20"
          }`}
        />
      ))}
    </span>
  );
}

/** Cap the rendered word rows so big packs (e.g. 600 words) stay snappy. */
const LIST_CAP = 60;

type WordFilter = "all" | "due" | "learning" | "mastered" | "fresh";

const WORD_FILTERS: Array<{
  key: WordFilter;
  label: string;
  count: (s: PackStats) => number;
}> = [
  { key: "all", label: "全部", count: (s) => s.total },
  { key: "due", label: "待复习", count: (s) => s.dueCount },
  { key: "learning", label: "学习中", count: (s) => s.learning },
  { key: "mastered", label: "已掌握", count: (s) => s.mastered },
  { key: "fresh", label: "未学", count: (s) => s.fresh },
];

/**
 * One word pack's overview + forgetting-curve study plan: total cards and
 * mastery progress, today's quota-driven task, an ETA, a preview of when the
 * curve brings words back, and a filterable, capped per-word status list.
 */
export default function PackDetail({ pack, onBack, onStart }: PackDetailProps) {
  const student = useActiveStudent();
  const packDailyNew = useAppStore((s) => s.packDailyNew);
  const setPackDailyNew = useAppStore((s) => s.setPackDailyNew);
  // Hooks must run unconditionally — keep them above the early return.
  const [filter, setFilter] = useState<WordFilter>("all");
  const [showAll, setShowAll] = useState(false);
  if (!student) return null;

  const dailyNew = packDailyNew[pack.id] ?? DEFAULT_DAILY_NEW;
  const stats = packStats(student, pack);
  const plan = planToday(student, pack, dailyNew);
  const schedule = reviewSchedule(student, pack);

  const nowMs = Date.now();
  const filtered = pack.words.filter((wd) => {
    const p = student.progress[wd.id];
    switch (filter) {
      case "due":
        return !!p && new Date(p.nextReviewTime).getTime() <= nowMs;
      case "learning":
        return !!p && p.stage < MASTERED_STAGE;
      case "mastered":
        return !!p && p.stage >= MASTERED_STAGE;
      case "fresh":
        return !p;
      default:
        return true;
    }
  });
  const shown = showAll ? filtered : filtered.slice(0, LIST_CAP);

  const seg = (n: number) => (stats.total ? (n / stats.total) * 100 : 0);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="返回"
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white/70 active:scale-90"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-extrabold text-white">
            {pack.name}
          </h1>
          <p className="truncate text-xs text-white/50">{pack.subtitle}</p>
        </div>
      </div>

      {/* Overview: total + mastery segments */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-5 rounded-3xl bg-white/10 p-5 ring-2 ring-white/15"
      >
        <div className="flex items-end justify-between">
          <p className="text-lg font-bold text-white">学习进度</p>
          <p className="text-sm text-white/60">
            共 <span className="text-xl font-extrabold text-white">{stats.total}</span> 张卡片
          </p>
        </div>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-white/10">
          <div className="bg-emerald-400" style={{ width: `${seg(stats.mastered)}%` }} />
          <div className="bg-amber-400" style={{ width: `${seg(stats.learning)}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            { n: stats.mastered, label: "已掌握", c: "text-emerald-300" },
            { n: stats.learning, label: "学习中", c: "text-amber-300" },
            { n: stats.fresh, label: "未学", c: "text-white/60" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/5 py-2">
              <p className={`text-2xl font-extrabold ${s.c}`}>{s.n}</p>
              <p className="text-xs font-bold text-white/50">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Today's plan (curve-driven) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-4 rounded-3xl bg-gradient-to-br from-grape/40 to-bubblegum/30 p-5 ring-2 ring-white/20"
      >
        <p className="text-lg font-extrabold text-white">📅 今日计划</p>
        <p className="mt-1 text-white/85">
          {plan.words.length > 0 ? (
            <>
              <span className="font-extrabold text-amber-200">{plan.due.length}</span> 个复习
              {" · "}
              <span className="font-extrabold text-amber-200">{plan.newToday.length}</span> 个新词
            </>
          ) : (
            "今天的任务都完成啦,休息一下 🎉"
          )}
        </p>
        {stats.fresh > 0 && (
          <p className="mt-1 text-sm text-white/60">
            按每天 {dailyNew} 个新词,约 <b className="text-white/80">{plan.etaDays}</b> 天学完全部新词
          </p>
        )}

        {/* Daily-new quota knob */}
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-bold text-white/50">每天学新词</p>
          <div className="flex flex-wrap gap-2">
            {DAILY_NEW_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setPackDailyNew(pack.id, n)}
                className={`min-h-11 rounded-full px-3.5 text-sm font-extrabold transition ${
                  dailyNew === n
                    ? "bg-white text-space-900 shadow"
                    : "bg-white/10 text-white/70"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {plan.words.length > 0 && (
          <motion.button
            onClick={() => onStart(plan.words)}
            whileTap={{ scale: 0.97 }}
            className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white text-lg font-extrabold text-space-900 shadow-pop active:scale-95"
          >
            <Play className="h-6 w-6" /> 开始今天的学习
          </motion.button>
        )}
      </motion.div>

      {/* Forgetting-curve schedule preview */}
      {schedule.length > 0 && (
        <div className="mt-4 rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
          <p className="mb-2 text-sm font-bold text-white/60">🧠 复习排期(遗忘曲线)</p>
          <div className="flex flex-wrap gap-2">
            {schedule.map((b) => (
              <span
                key={b.key}
                className={`rounded-full px-3 py-1 text-sm font-bold ${
                  b.key === "overdue"
                    ? "bg-rose-400/20 text-rose-200"
                    : "bg-white/10 text-white/70"
                }`}
              >
                {b.label} · {b.count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Per-word status list — filterable + capped so big packs stay snappy */}
      <h2 className="mb-2 mt-6 text-center text-sm font-bold text-white/50">
        单词列表 · {stats.total}
      </h2>
      <div className="mb-3 flex flex-wrap justify-center gap-2">
        {WORD_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setFilter(f.key);
              setShowAll(false);
            }}
            className={`min-h-8 rounded-full px-3 py-1 text-xs font-bold transition ${
              filter === f.key
                ? "bg-white text-space-900"
                : "bg-white/10 text-white/60"
            }`}
          >
            {f.label} {f.count(stats)}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {shown.map((wd) => {
          const p = student.progress[wd.id];
          const stage = p?.stage ?? 0;
          const status = !p
            ? { label: "未学", c: "text-white/40" }
            : stage >= MASTERED_STAGE
              ? { label: "已掌握", c: "text-emerald-300" }
              : { label: nextReviewLabel(p.nextReviewTime), c: "text-amber-300" };
          return (
            <div
              key={wd.id}
              className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-2.5 ring-1 ring-white/10"
            >
              <button
                onClick={() => {
                  popSound();
                  playWordAudio(wd.id, wd.word, wd.audioUrl);
                }}
                aria-label={`朗读 ${wd.word}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/30 text-sky-200 active:scale-90"
              >
                <Volume2 className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold text-white">{wd.word}</p>
                <p className="truncate text-xs text-white/50">
                  {wd.phonetic} · {wd.translation}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <MemoryStars stage={stage} />
                <span className={`text-xs font-bold ${status.c}`}>{status.label}</span>
              </div>
            </div>
          );
        })}
        {shown.length === 0 && (
          <p className="py-6 text-center text-sm text-white/40">
            这一类暂时没有单词
          </p>
        )}
      </div>
      {filtered.length > shown.length && (
        <button
          onClick={() => setShowAll(true)}
          className="mx-auto mt-3 block rounded-full bg-white/10 px-5 py-2 text-sm font-bold text-white/70 active:scale-95"
        >
          显示全部 {filtered.length} 个
        </button>
      )}
    </div>
  );
}
