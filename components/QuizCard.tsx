"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import type { VocabularyWord } from "@/lib/types";
import { pickQuizOptions, type SessionCard } from "@/lib/session";
import { playWordAudio } from "@/lib/audio";
import { speak } from "@/lib/speech";

interface QuizCardProps {
  card: SessionCard; // kind: "quiz-listen" | "quiz-picture"
  onAnswer: (correct: boolean) => void;
}

/**
 * Verification quiz — the honest memory check between self-assessed cards.
 *   quiz-listen:  hear the word → tap the matching picture.
 *   quiz-picture: see the picture → tap the matching word.
 * A wrong tap reveals the answer kindly, then drops the word's stage.
 */
export default function QuizCard({ card, onAnswer }: QuizCardProps) {
  const { word, kind } = card;
  const isListen = kind === "quiz-listen";
  const [options] = useState(() => pickQuizOptions(word));
  const [picked, setPicked] = useState<string | null>(null);

  // In listen mode the audio IS the question — play it right away.
  useEffect(() => {
    if (!isListen) return;
    const timer = setTimeout(() => playWordAudio(word.id, word.word), 400);
    return () => clearTimeout(timer);
  }, [isListen, word.id, word.word]);

  const choose = (option: VocabularyWord) => {
    if (picked) return;
    setPicked(option.id);
    const correct = option.id === word.id;
    if (correct) {
      playWordAudio(word.id, word.word);
    } else {
      speak(`Almost! This is ${word.word}.`, { rate: 0.95, pitch: 1.2 });
    }
    // Let the child see the highlighted answer before the deck moves on.
    setTimeout(() => onAnswer(correct), correct ? 900 : 1700);
  };

  return (
    <motion.div
      initial={{ x: 80, opacity: 0, rotate: 2 }}
      animate={{ x: 0, opacity: 1, rotate: 0 }}
      exit={{ x: -80, opacity: 0, rotate: -2 }}
      transition={{ type: "spring", stiffness: 160, damping: 20 }}
      className="w-full max-w-md"
    >
      <div className="rounded-[2rem] bg-cream p-6 shadow-2xl ring-8 ring-grape/30">
        {/* Quiz badge */}
        <div className="mx-auto w-fit rounded-full bg-violet-100 px-4 py-1.5 text-sm font-extrabold text-violet-700 ring-2 ring-violet-200">
          🎯 Quiz Time! 小考验
        </div>

        {/* The question: a replayable sound, or a big picture */}
        {isListen ? (
          <div className="mt-5 flex flex-col items-center gap-2">
            <motion.button
              onClick={() => playWordAudio(word.id, word.word)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Play the word again"
              className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-xl ring-4 ring-sky-200"
            >
              <Volume2 className="h-12 w-12" />
            </motion.button>
            <p className="text-xl font-extrabold text-space-800">
              Which one did you hear?
            </p>
            <p className="text-sm font-bold text-space-700/60">
              听一听，选一选！
            </p>
          </div>
        ) : (
          <div className="mt-5 flex flex-col items-center gap-2">
            <motion.span
              className="text-8xl drop-shadow"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              role="img"
              aria-label="Mystery picture"
            >
              {word.emoji}
            </motion.span>
            <p className="text-xl font-extrabold text-space-800">What is this?</p>
            <p className="text-sm font-bold text-space-700/60">这是什么呀？</p>
          </div>
        )}

        {/* 2x2 answer grid — every option is a huge touch target */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {options.map((option) => {
            const isAnswer = option.id === word.id;
            const isPicked = option.id === picked;
            const revealed = picked !== null;

            let style = "bg-white ring-2 ring-violet-100";
            if (revealed && isAnswer) {
              style = "bg-emerald-100 ring-4 ring-emerald-400";
            } else if (revealed && isPicked) {
              style = "bg-rose-100 ring-4 ring-rose-300";
            } else if (revealed) {
              style = "bg-white/60 ring-2 ring-violet-100 opacity-50";
            }

            return (
              <motion.button
                key={option.id}
                onClick={() => choose(option)}
                disabled={revealed}
                whileHover={revealed ? undefined : { scale: 1.05 }}
                whileTap={revealed ? undefined : { scale: 0.93 }}
                animate={
                  revealed && isPicked && !isAnswer
                    ? { x: [0, -8, 8, -6, 6, 0] }
                    : revealed && isAnswer
                      ? { scale: [1, 1.12, 1] }
                      : {}
                }
                className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-3xl p-3 shadow-md transition ${style}`}
              >
                {isListen ? (
                  <span className="text-5xl" role="img" aria-label={option.word}>
                    {option.emoji}
                  </span>
                ) : (
                  <span className="text-2xl font-extrabold text-space-900">
                    {option.word}
                  </span>
                )}
                {revealed && isAnswer && (
                  <span className="text-xs font-bold text-emerald-700">
                    {isListen ? option.word : option.translation}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
