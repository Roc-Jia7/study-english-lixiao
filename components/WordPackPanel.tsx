"use client";

import { motion } from "framer-motion";
import { ChevronRight, BookOpen } from "lucide-react";
import type { VocabularyWord } from "@/lib/types";
import { useActiveStudent } from "@/store/useAppStore";
import {
  MASTERED_STAGE,
  getDueFromPool,
  getNewFromPool,
} from "@/lib/spaced-repetition";
import { WORD_PACKS, type WordPack } from "@/lib/wordpacks";

interface WordPackPanelProps {
  /** Start a local study session with a pack's due + new words (no quiz). */
  onStartPack: (words: VocabularyWord[]) => void;
}

/** How many new words a pack introduces per sitting (the daily-quota knob). */
const NEW_PER_SITTING = 8;
const DUE_CAP = 8;

/**
 * Bundled word packs (textbook / exam vocabulary) as a local memorization
 * plan: each pack shows mastered progress and today's task (due reviews +
 * a few new words), reusing the same forgetting-curve engine, pet, and
 * confetti as everything else. A sample to validate the experience.
 */
export default function WordPackPanel({ onStartPack }: WordPackPanelProps) {
  const student = useActiveStudent();
  if (!student) return null;

  const stats = (pack: WordPack) => {
    const total = pack.words.length;
    const due = getDueFromPool(student, pack.words);
    const fresh = getNewFromPool(student, pack.words);
    const mastered = pack.words.filter(
      (w) => (student.progress[w.id]?.stage ?? 0) >= MASTERED_STAGE,
    ).length;
    const started = total - fresh.length;
    return { total, due, fresh, mastered, started };
  };

  const todaysWords = (pack: WordPack): VocabularyWord[] => {
    const { due, fresh } = stats(pack);
    return [...due.slice(0, DUE_CAP), ...fresh.slice(0, NEW_PER_SITTING)];
  };

  return (
    <div className="mt-10">
      <h2 className="mb-3 text-center text-xl font-extrabold text-white/90">
        📚 课本词单 · 背诵计划
      </h2>
      <div className="space-y-3">
        {WORD_PACKS.map((pack, i) => {
          const { total, due, mastered } = stats(pack);
          const words = todaysWords(pack);
          const pct = Math.round((mastered / total) * 100);
          const done = words.length === 0;
          return (
            <motion.button
              key={pack.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              whileHover={done ? undefined : { scale: 1.01 }}
              whileTap={done ? undefined : { scale: 0.98 }}
              onClick={() => !done && onStartPack(words)}
              disabled={done}
              className="flex w-full items-center gap-4 rounded-3xl bg-white/10 p-5 text-left ring-2 ring-white/15 disabled:opacity-70"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-violet-500 text-white shadow">
                <BookOpen className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-extrabold text-white">
                  {pack.name}
                </p>
                <p className="truncate text-xs text-white/50">{pack.subtitle}</p>
                {/* Mastery progress */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-xs font-bold text-white/60">
                    掌握 {mastered}/{total}
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold text-amber-300/90">
                  {done
                    ? "今天没有要学的啦,休息一下 🎉"
                    : `今日:${due.length > 0 ? `${Math.min(due.length, DUE_CAP)} 复习 · ` : ""}${words.length - Math.min(due.length, DUE_CAP)} 新词`}
                </p>
              </div>
              {!done && <ChevronRight className="h-7 w-7 shrink-0 text-white/70" />}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
