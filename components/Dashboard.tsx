"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import type { SessionMode, VocabularyWord, WordCategory } from "@/lib/types";
import { useActiveStudent, useAppStore } from "@/store/useAppStore";
import {
  DISCOVERY_PACK_SIZE,
  REVIEW_SESSION_CAP,
  getDueWords,
  getNewWords,
} from "@/lib/spaced-repetition";
import { CATEGORY_META } from "@/lib/vocabulary";
import PetCompanion from "./PetCompanion";
import StickerWall from "./StickerWall";
import LxllReviewPanel from "./LxllReviewPanel";

interface DashboardProps {
  onStartSession: (mode: SessionMode, words: VocabularyWord[]) => void;
  /** A real lxll review session (real words, results submitted, no quiz).
   *  `practice` re-runs a finished slot locally without writing the curve. */
  onStartLxllReview: (words: VocabularyWord[], practice?: boolean) => void;
}

const CATEGORIES: WordCategory[] = ["animals", "food", "colors", "nature"];

/**
 * The child's mission control: their pet front and center, hungry word
 * monsters when reviews are due, and Discovery Packs of new words.
 */
export default function Dashboard({
  onStartSession,
  onStartLxllReview,
}: DashboardProps) {
  const student = useActiveStudent();
  const setPetName = useAppStore((s) => s.setPetName);

  // Re-check the forgetting-curve clock every 30s so monsters appear
  // while the app is open (the 5-minute stage comes due fast).
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!student) return null;

  // Real lxll students learn from backend course words; demo profiles use
  // the local mock vocabulary. Both keep the pet / streak / confetti layer.
  const isLxll = student.id.startsWith("lxll:");

  const dueWords = getDueWords(student, now);
  const newWords = getNewWords(student);
  const allDone = dueWords.length === 0 && newWords.length === 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8">
      {/* Greeting + pet */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-2 text-center"
      >
        <h1 className="text-3xl font-extrabold text-white">
          Hi, {student.name}! 🚀
        </h1>
        <PetCompanion
          xp={student.xp}
          petName={student.petName}
          onRename={setPetName}
        />
      </motion.div>

      {/* Star Path — streak flame + 14-day sticker wall */}
      <StickerWall student={student} />

      {/* Real lxll learner: backend anti-forget reviews + lifetime stats */}
      {isLxll && <LxllReviewPanel onStartReview={onStartLxllReview} />}

      {/* Hungry monsters — words due for review (demo mock vocabulary) */}
      {!isLxll && dueWords.length > 0 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() =>
            onStartSession("review", dueWords.slice(0, REVIEW_SESSION_CAP))
          }
          className="mt-8 flex w-full items-center gap-4 rounded-3xl bg-gradient-to-r from-grape to-bubblegum p-5 text-left shadow-2xl ring-4 ring-white/25"
        >
          <motion.span
            className="text-6xl"
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          >
            👾
          </motion.span>
          <div className="flex-1">
            <p className="text-2xl font-extrabold text-white">
              The word monsters are hungry!
            </p>
            <p className="text-white/85">
              单词小怪兽饿啦！快去喂它们 ·{" "}
              <span className="font-bold">
                {Math.min(dueWords.length, REVIEW_SESSION_CAP)} snacks ready
              </span>
            </p>
          </div>
          <ChevronRight className="h-10 w-10 shrink-0 text-white" />
        </motion.button>
      )}

      {/* Discovery Packs — new words grouped by category (demo only) */}
      {!isLxll && newWords.length > 0 && (
        <>
          <h2 className="mt-10 mb-4 text-center text-xl font-extrabold text-white/90">
            🎁 Discovery Packs · 探索新单词
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CATEGORIES.map((category, i) => {
              const meta = CATEGORY_META[category];
              const packWords = newWords
                .filter((w) => w.category === category)
                .slice(0, DISCOVERY_PACK_SIZE);
              if (packWords.length === 0) return null;
              return (
                <motion.button
                  key={category}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  whileHover={{ scale: 1.03, rotate: -0.5 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onStartSession("discovery", packWords)}
                  className={`flex items-center gap-4 rounded-3xl bg-gradient-to-br ${meta.gradient} p-5 text-left shadow-xl ring-4 ring-white/30`}
                >
                  <span className="text-5xl drop-shadow">{meta.emoji}</span>
                  <div className="flex-1">
                    <p className="text-xl font-extrabold text-space-900">
                      {meta.label}
                    </p>
                    <p className="text-sm font-bold text-space-800/70">
                      {meta.labelZh}
                    </p>
                    {/* Word count as little dots, never a number table */}
                    <div className="mt-1 flex gap-1">
                      {packWords.map((w) => (
                        <span key={w.id} className="text-xs">
                          🔵
                        </span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="h-8 w-8 shrink-0 text-space-800/60" />
                </motion.button>
              );
            })}
          </div>
        </>
      )}

      {/* Everything learned and nothing due — rest state (demo only) */}
      {!isLxll && allDone && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-10 flex flex-col items-center gap-3 rounded-3xl bg-white/10 p-8 text-center ring-2 ring-white/15"
        >
          <span className="text-6xl">🏆</span>
          <p className="text-2xl font-extrabold text-white">
            All monsters are full and happy!
          </p>
          <p className="text-white/70">
            小怪兽们都吃饱啦！休息一下，待会再来看看吧～
          </p>
        </motion.div>
      )}
    </div>
  );
}
