"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Loader2, Clock, Lock } from "lucide-react";
import type { VocabularyWord } from "@/lib/types";
import type { LxllAntiForgetRecord } from "@/lib/lxll/types";
import { useLxllStore } from "@/store/useLxllStore";
import { splitSchedule } from "@/lib/lxll/schedule";
import { localDateStr } from "@/lib/streak";
import { popSound } from "@/lib/sfx";

interface LxllReviewPanelProps {
  /** Start a review session with one slot's real words. */
  onStartReview: (words: VocabularyWord[]) => void;
}

const MONSTERS = ["👾", "🐲", "👹", "🦖", "🐙", "👻"];

function timeLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function dayLabel(date: string, now = new Date()): string {
  const today = localDateStr(now);
  const tomorrow = localDateStr(new Date(now.getTime() + 86400000));
  if (date === today) return "今天";
  if (date === tomorrow) return "明天";
  const [, m, d] = date.split("-");
  return `${Number(m)}月${Number(d)}日`;
}

/**
 * The child's anti-forget mission board: today's due review slots as tappable
 * hungry-monster cards (tap one to start just that batch), plus a gentle
 * preview of the next few days — so they choose a slot instead of being
 * dropped into a huge pile of words.
 */
export default function LxllReviewPanel({ onStartReview }: LxllReviewPanelProps) {
  const schedule = useLxllStore((s) => s.schedule);
  const metric = useLxllStore((s) => s.metric);
  const loadingData = useLxllStore((s) => s.loadingData);
  const loadSlotWords = useLxllStore((s) => s.loadSlotWords);
  const [startingId, setStartingId] = useState<number | null>(null);

  const { due, upcoming } = useMemo(() => splitSchedule(schedule), [schedule]);

  const startSlot = async (record: LxllAntiForgetRecord) => {
    if (startingId !== null) return;
    popSound();
    setStartingId(record.antiForgetId);
    try {
      const words = await loadSlotWords(record.antiForgetId);
      if (words.length > 0) onStartReview(words);
    } finally {
      setStartingId(null);
    }
  };

  return (
    <div className="mt-8 w-full">
      {/* Lifetime achievement — a real number, shown playfully */}
      {metric && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-center justify-center gap-3 rounded-3xl bg-white/10 px-5 py-4 ring-2 ring-white/15"
        >
          <span className="text-4xl">📚</span>
          <p className="text-lg font-bold text-white">
            已经认识{" "}
            <span className="text-2xl font-extrabold text-amber-300">
              {metric.totalLearnedWordCount}
            </span>{" "}
            个单词啦！
          </p>
        </motion.div>
      )}

      {loadingData && schedule.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-8 text-white/60">
          <Loader2 className="h-6 w-6 animate-spin" /> 正在连接李校来啦…
        </div>
      ) : (
        <>
          {/* Today's due slots — tappable monster cards */}
          {due.length > 0 ? (
            <>
              <h2 className="mb-3 text-center text-xl font-extrabold text-white/90">
                🦖 今天要复习（{due.length} 关）
              </h2>
              <div className="space-y-3">
                {due.map((record, i) => {
                  const starting = startingId === record.antiForgetId;
                  const busy = startingId !== null;
                  return (
                    <motion.button
                      key={record.antiForgetId}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.06 * i }}
                      whileHover={busy ? undefined : { scale: 1.02, rotate: -0.5 }}
                      whileTap={busy ? undefined : { scale: 0.97 }}
                      onClick={() => startSlot(record)}
                      disabled={busy}
                      className="flex w-full items-center gap-4 rounded-3xl bg-gradient-to-r from-grape to-bubblegum p-5 text-left shadow-2xl ring-4 ring-white/25 disabled:opacity-80"
                    >
                      <motion.span
                        className="text-5xl"
                        animate={
                          starting ? {} : { rotate: [0, -8, 8, 0] }
                        }
                        transition={{ duration: 1.6, repeat: Infinity }}
                      >
                        {starting ? "🍳" : MONSTERS[i % MONSTERS.length]}
                      </motion.span>
                      <div className="flex-1">
                        <p className="text-xl font-extrabold text-white">
                          第 {i + 1} 关 · 单词小怪兽
                        </p>
                        <p className="flex items-center gap-1 text-white/85">
                          <Clock className="h-4 w-4" />
                          {starting ? "正在准备单词…" : timeLabel(record.antiForgetDate)}
                        </p>
                      </div>
                      {starting ? (
                        <Loader2 className="h-8 w-8 shrink-0 animate-spin text-white" />
                      ) : (
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/25 px-3 py-1.5 font-extrabold text-white">
                          去复习 <ChevronRight className="h-5 w-5" />
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 rounded-3xl bg-white/10 p-8 text-center ring-2 ring-white/15"
            >
              <span className="text-6xl">🏆</span>
              <p className="text-2xl font-extrabold text-white">
                今天的单词都复习完啦！
              </p>
              <p className="text-white/70">小怪兽们都吃饱饱，看看接下来几天吧～</p>
            </motion.div>
          )}

          {/* Upcoming days — gentle preview, not yet tappable */}
          {upcoming.length > 0 && (
            <>
              <h3 className="mt-8 mb-3 text-center text-base font-bold text-white/70">
                🗓️ 接下来几天
              </h3>
              <div className="space-y-2">
                {upcoming.slice(0, 5).map((day) => (
                  <div
                    key={day.date}
                    className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10"
                  >
                    <Lock className="h-4 w-4 shrink-0 text-white/30" />
                    <span className="w-20 shrink-0 font-bold text-white/70">
                      {dayLabel(day.date)}
                    </span>
                    <div className="flex flex-1 flex-wrap gap-1">
                      {day.records.map((r) => (
                        <span
                          key={r.antiForgetId}
                          className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50"
                        >
                          {timeLabel(r.antiForgetDate)}
                        </span>
                      ))}
                    </div>
                    <span className="shrink-0 text-sm font-bold text-white/40">
                      {day.records.length} 关
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
