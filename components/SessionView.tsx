"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { SessionMode, VocabularyWord } from "@/lib/types";
import { buildSessionQueue, type SessionCard } from "@/lib/session";
import { useAppStore, useActiveStudent } from "@/store/useAppStore";
import { fireMiniSparkle } from "@/lib/confetti";
import { speak, stopSpeaking } from "@/lib/speech";
import LearningCard from "./LearningCard";
import QuizCard from "./QuizCard";
import RewardOverlay from "./RewardOverlay";

interface SessionViewProps {
  words: VocabularyWord[];
  mode: SessionMode;
  onExit: () => void;
  /** Insert verification quizzes (needs emoji pictures). Off for lxll words. */
  withQuiz?: boolean;
  /** Final outcome per word (fires once when a word leaves the deck). */
  onResult?: (word: VocabularyWord, known: boolean) => void;
  /** Called when the deck is cleared, before the reward screen continue. */
  onComplete?: () => void;
}

/** A word re-enters the session at most this many times after a miss. */
const MAX_RETRIES = 2;

/**
 * Runs one learning session over a mixed deck of study cards and
 * verification quizzes. Misses (study "Oops" or a wrong quiz tap) slip the
 * word back in a couple of cards later, and the deck ends in confetti.
 */
export default function SessionView({
  words,
  mode,
  onExit,
  withQuiz = true,
  onResult,
  onComplete,
}: SessionViewProps) {
  const student = useActiveStudent();
  const recordAnswer = useAppStore((s) => s.recordAnswer);
  const grantBatchBonus = useAppStore((s) => s.grantBatchBonus);

  const [queue, setQueue] = useState<SessionCard[]>(() =>
    buildSessionQueue(words, mode, withQuiz),
  );
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [stars, setStars] = useState(0);
  const [finished, setFinished] = useState(false);
  const retries = useRef<Record<string, number>>({});
  const retrySeq = useRef(0);
  const xpBefore = useRef(student?.xp ?? 0);

  if (!student) return null;

  const current = queue[0];

  /** Drop the head card; optionally slip a retry card in 2 positions later. */
  const advanceQueue = (reinsert?: SessionCard) => {
    const rest = queue.slice(1);
    let next = rest;
    if (reinsert) {
      const at = Math.min(2, rest.length);
      next = [...rest.slice(0, at), reinsert, ...rest.slice(at)];
    }
    setQueue(next);
    if (next.length === 0) {
      grantBatchBonus();
      setFinished(true);
      onComplete?.();
    }
  };

  /** A fresh study card for a missed word, while its retry budget lasts. */
  const makeRetryCard = (word: VocabularyWord): SessionCard | undefined => {
    const used = retries.current[word.id] ?? 0;
    if (used >= MAX_RETRIES) return undefined;
    retries.current[word.id] = used + 1;
    return { key: `retry-${word.id}-${retrySeq.current++}`, kind: "study", word };
  };

  const handleStudyAnswer = (known: boolean) => {
    if (!current) return;
    recordAnswer(current.word.id, known);

    let reinsert: SessionCard | undefined;
    if (known) {
      fireMiniSparkle();
      if (!(current.word.id in retries.current)) setStars((s) => s + 1);
      setDoneIds((ids) => new Set(ids).add(current.word.id));
      onResult?.(current.word, true);
    } else {
      reinsert = makeRetryCard(current.word);
      if (reinsert) {
        speak("No problem! Let's see it again soon.", { rate: 1, pitch: 1.25 });
      } else {
        // Retry budget spent — let the word rest, keep the mood kind.
        setDoneIds((ids) => new Set(ids).add(current.word.id));
        onResult?.(current.word, false);
      }
    }
    advanceQueue(reinsert);
  };

  const handleQuizAnswer = (correct: boolean) => {
    if (!current) return;
    // The quiz is the honest signal: wrong tap really drops the stage.
    recordAnswer(current.word.id, correct);

    let reinsert: SessionCard | undefined;
    if (correct) {
      fireMiniSparkle();
      setStars((s) => s + 1);
    } else {
      reinsert = makeRetryCard(current.word); // re-study, then move on
    }
    advanceQueue(reinsert);
  };

  return (
    <div className="flex min-h-dvh flex-col items-center px-4 pb-10 pt-4">
      {/* Session header: exit + star-dot progress (no numbers, just dots) */}
      <div className="flex w-full max-w-md items-center gap-3">
        <button
          onClick={() => {
            stopSpeaking();
            onExit();
          }}
          aria-label="Back to base"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white/70 transition hover:bg-white/20 active:scale-90"
        >
          <X className="h-6 w-6" />
        </button>
        <div className="flex flex-1 items-center justify-center gap-1.5">
          {words.map((w) => (
            <motion.span
              key={w.id}
              className="text-xl"
              animate={doneIds.has(w.id) ? { scale: [1, 1.5, 1] } : {}}
            >
              {doneIds.has(w.id) ? "⭐" : "・"}
            </motion.span>
          ))}
        </div>
        <span className="text-3xl" aria-hidden>
          {mode === "discovery" ? "🎁" : "👾"}
        </span>
      </div>

      <p className="mt-2 text-sm text-white/50">
        {mode === "discovery"
          ? "New word friends! 认识新单词朋友"
          : "Feed the hungry word monsters! 喂饱单词小怪兽"}
      </p>

      {/* The card stage */}
      <div className="mt-6 flex w-full flex-1 items-start justify-center">
        <AnimatePresence mode="wait">
          {current && !finished && (
            current.kind === "study" ? (
              <LearningCard
                key={current.key}
                word={current.word}
                onAnswer={handleStudyAnswer}
              />
            ) : (
              <QuizCard
                key={current.key}
                card={current}
                onAnswer={handleQuizAnswer}
              />
            )
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {finished && (
          <RewardOverlay
            xpBefore={xpBefore.current}
            xpAfter={student.xp}
            starsEarned={stars}
            onContinue={onExit}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
