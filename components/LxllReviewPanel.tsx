"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import type { VocabularyWord } from "@/lib/types";
import { useLxllStore } from "@/store/useLxllStore";
import { popSound } from "@/lib/sfx";

interface LxllReviewPanelProps {
  /** Start a review session with real backend words (no emoji → no quiz). */
  onStartReview: (words: VocabularyWord[]) => void;
}

/**
 * Real lxll data on the child's dashboard: today's anti-forget reviews shown
 * as a hungry-monster card, plus a friendly "words learned" achievement.
 * Tapping fetches the real words and hands them to the game session.
 */
export default function LxllReviewPanel({ onStartReview }: LxllReviewPanelProps) {
  const dueReviews = useLxllStore((s) => s.dueReviews);
  const metric = useLxllStore((s) => s.metric);
  const loadingData = useLxllStore((s) => s.loadingData);
  const loadDueWords = useLxllStore((s) => s.loadDueWords);
  const [starting, setStarting] = useState(false);

  const start = async () => {
    if (starting) return;
    popSound();
    setStarting(true);
    try {
      const words = await loadDueWords();
      if (words.length > 0) onStartReview(words);
    } finally {
      setStarting(false);
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

      {loadingData ? (
        <div className="flex items-center justify-center gap-2 py-8 text-white/60">
          <Loader2 className="h-6 w-6 animate-spin" /> 正在连接李校来啦…
        </div>
      ) : dueReviews.length > 0 ? (
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={start}
          disabled={starting}
          className="flex w-full items-center gap-4 rounded-3xl bg-gradient-to-r from-grape to-bubblegum p-5 text-left shadow-2xl ring-4 ring-white/25 disabled:opacity-80"
        >
          <motion.span
            className="text-6xl"
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          >
            {starting ? "🍳" : "👾"}
          </motion.span>
          <div className="flex-1">
            <p className="text-2xl font-extrabold text-white">
              {starting ? "小怪兽来啦…" : "今天有单词要复习！"}
            </p>
            <p className="text-white/85">
              {starting ? (
                "正在准备今天的单词"
              ) : (
                <>
                  抗遗忘小怪兽饿啦 ·{" "}
                  <span className="font-bold">
                    {dueReviews.length} 只等你喂
                  </span>
                </>
              )}
            </p>
          </div>
          {starting ? (
            <Loader2 className="h-9 w-9 shrink-0 animate-spin text-white" />
          ) : (
            <ChevronRight className="h-10 w-10 shrink-0 text-white" />
          )}
        </motion.button>
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
          <p className="text-white/70">小怪兽们都吃饱饱，明天再来吧～</p>
        </motion.div>
      )}
    </div>
  );
}
