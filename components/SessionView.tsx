"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { X } from "lucide-react";
import type { DisplayMode, SessionMode, VocabularyWord } from "@/lib/types";
import { balancedChunk, buildSessionQueue, type SessionCard } from "@/lib/session";
import { useAppStore, useActiveStudent } from "@/store/useAppStore";
import { fireMiniSparkle } from "@/lib/confetti";
import { getPetStage } from "@/lib/pet";
import { happySound } from "@/lib/sfx";
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

const DISPLAY_OPTIONS: Array<{ value: DisplayMode; label: string }> = [
  { value: "en", label: "英" },
  { value: "zh", label: "中" },
  { value: "both", label: "中英" },
];

/**
 * The pet riding along in the session header. Each correct answer "feeds" it:
 * it does a happy munch and a heart floats up — making the spaced-repetition
 * "feed the word monster" metaphor literal and rewarding in the moment.
 */
function SessionPet({ xp, feedSignal }: { xp: number; feedSignal: number }) {
  const stage = getPetStage(xp);
  const controls = useAnimationControls();
  const [hearts, setHearts] = useState<number[]>([]);
  const seq = useRef(0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return; // don't react to the initial render
    }
    void controls.start({
      scale: [1, 1.4, 0.85, 1],
      rotate: [0, -12, 12, 0],
      transition: { duration: 0.45, ease: "easeInOut" },
    });
    const id = seq.current++;
    setHearts((h) => [...h, id]);
  }, [feedSignal, controls]);

  return (
    <div className="relative h-9 w-9 shrink-0">
      <AnimatePresence>
        {hearts.map((id) => (
          <motion.span
            key={id}
            className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 text-base"
            initial={{ y: 0, opacity: 1, scale: 0.6 }}
            animate={{ y: -26, opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            onAnimationComplete={() =>
              setHearts((h) => h.filter((x) => x !== id))
            }
          >
            💖
          </motion.span>
        ))}
      </AnimatePresence>
      <motion.span className="block text-3xl" animate={controls} aria-hidden>
        {stage.emoji}
      </motion.span>
    </div>
  );
}

/**
 * A short, joyful breather shown between groups of a long slot, so a 20-word
 * review feels like a few quick rounds. Plays a little party and auto-advances,
 * with a button for kids who'd rather keep going right away.
 */
function GroupBreak({
  index,
  total,
  onNext,
}: {
  index: number;
  total: number;
  onNext: () => void;
}) {
  useEffect(() => {
    fireMiniSparkle();
    happySound();
    const t = setTimeout(onNext, 2400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-space-950/85 px-6 text-center backdrop-blur-sm"
    >
      <motion.span
        className="text-7xl"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 12 }}
      >
        🎉
      </motion.span>
      <h3 className="text-2xl font-extrabold text-white">
        第 {index + 1} / {total} 组完成！
      </h3>
      <p className="text-white/70">
        休息一下，准备好就继续下一组 💪 还剩 {total - index - 1} 组
      </p>
      <div className="mt-1 flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`h-2.5 w-2.5 rounded-full ${
              i <= index ? "bg-amber-300" : "bg-white/20"
            }`}
          />
        ))}
      </div>
      <motion.button
        onClick={onNext}
        whileTap={{ scale: 0.95 }}
        className="mt-3 min-h-12 rounded-full bg-gradient-to-r from-grape to-bubblegum px-8 py-3 text-lg font-extrabold text-white shadow-xl ring-4 ring-white/25"
      >
        继续 ▶
      </motion.button>
    </motion.div>
  );
}

/** Tiny segmented control letting the reviewer pick what the cards reveal. */
function DisplayModeToggle({
  value,
  onChange,
}: {
  value: DisplayMode;
  onChange: (mode: DisplayMode) => void;
}) {
  return (
    <div className="mt-3 flex items-center gap-2 rounded-full bg-white/10 p-1">
      <span className="pl-2 text-xs font-bold text-white/40">显示</span>
      {DISPLAY_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`min-h-9 rounded-full px-3.5 text-sm font-extrabold transition ${
            value === opt.value
              ? "bg-white text-space-900 shadow"
              : "text-white/60 hover:text-white/90"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

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
  const displayMode = useAppStore((s) => s.displayMode);
  const setDisplayMode = useAppStore((s) => s.setDisplayMode);

  // A long slot is broken into bite-size groups with a celebration between.
  const groups = useMemo(() => balancedChunk(words), [words]);
  const [groupIndex, setGroupIndex] = useState(0);
  const [queue, setQueue] = useState<SessionCard[]>(() =>
    buildSessionQueue(groups[0], mode, withQuiz),
  );
  const [breaking, setBreaking] = useState(false);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [stars, setStars] = useState(0);
  const [feeds, setFeeds] = useState(0);
  const [finished, setFinished] = useState(false);
  const retries = useRef<Record<string, number>>({});
  const retrySeq = useRef(0);
  const xpBefore = useRef(student?.xp ?? 0);

  if (!student) return null;

  const current = queue[0];
  const groupWords = groups[groupIndex] ?? [];
  const lastGroup = groupIndex >= groups.length - 1;

  /** Move on to the next group's deck after a celebratory breather. */
  const startNextGroup = () => {
    const next = groupIndex + 1;
    retries.current = {};
    setGroupIndex(next);
    setQueue(buildSessionQueue(groups[next], mode, withQuiz));
    setBreaking(false);
  };

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
      if (!lastGroup) {
        // More groups to go — take a celebratory breather, don't finish yet.
        setBreaking(true);
      } else {
        grantBatchBonus();
        setFinished(true);
        onComplete?.();
      }
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
      setFeeds((f) => f + 1); // feed the session pet
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
      setFeeds((f) => f + 1); // feed the session pet
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
        <div className="flex max-h-16 flex-1 flex-wrap items-center justify-center gap-1 overflow-hidden">
          {groupWords.map((w) => (
            <motion.span
              key={w.id}
              className="text-lg leading-none"
              animate={doneIds.has(w.id) ? { scale: [1, 1.5, 1] } : {}}
            >
              {doneIds.has(w.id) ? "⭐" : "・"}
            </motion.span>
          ))}
        </div>
        <SessionPet xp={student.xp} feedSignal={feeds} />
      </div>

      {groups.length > 1 && (
        <p className="mt-2 text-xs font-bold text-amber-300/90">
          第 {Math.min(groupIndex + 1, groups.length)} / {groups.length} 组
        </p>
      )}

      <p className="mt-2 text-sm text-white/50">
        {mode === "discovery"
          ? "New word friends! 认识新单词朋友"
          : student.petName
            ? `喂饱 ${student.petName}！每答对一个就喂一口 🍖`
            : "Feed the hungry word monsters! 喂饱单词小怪兽"}
      </p>

      {!finished && (
        <DisplayModeToggle value={displayMode} onChange={setDisplayMode} />
      )}

      {/* The card stage */}
      <div className="mt-6 flex w-full flex-1 items-start justify-center">
        <AnimatePresence mode="wait">
          {current && !finished && !breaking && (
            current.kind === "study" ? (
              <LearningCard
                key={current.key}
                word={current.word}
                onAnswer={handleStudyAnswer}
                displayMode={displayMode}
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
        {breaking && (
          <GroupBreak
            key={`break-${groupIndex}`}
            index={groupIndex}
            total={groups.length}
            onNext={startNextGroup}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {finished && (
          <RewardOverlay
            xpBefore={xpBefore.current}
            xpAfter={student.xp}
            starsEarned={stars}
            petName={student.petName}
            onContinue={onExit}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
