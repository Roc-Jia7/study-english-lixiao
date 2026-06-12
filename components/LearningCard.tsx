"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import type { VocabularyWord } from "@/lib/types";
import { playWordAudio } from "@/lib/audio";
import { speakSentence } from "@/lib/speech";

interface LearningCardProps {
  word: VocabularyWord;
  onAnswer: (known: boolean) => void;
}

/** Wraps every occurrence of the focus word in a warm highlight color. */
function HighlightedSentence({ sentence, focus }: { sentence: string; focus: string }) {
  const parts = sentence.split(new RegExp(`(${focus})`, "i"));
  return (
    <p className="text-2xl font-semibold leading-snug text-space-800">
      {parts.map((part, i) =>
        part.toLowerCase() === focus.toLowerCase() ? (
          <span key={i} className="font-extrabold text-orange-500">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

/**
 * One word, one card, zero clutter. Big picture, big word, one short
 * sentence, and two giant self-assessment buttons.
 */
export default function LearningCard({ word, onAnswer }: LearningCardProps) {
  // Say the word out loud as soon as the card appears (the session was
  // started by a tap, so the audio gesture requirement is satisfied).
  useEffect(() => {
    const timer = setTimeout(() => playWordAudio(word.id, word.word), 350);
    return () => clearTimeout(timer);
  }, [word.id, word.word]);

  return (
    <motion.div
      key={word.id}
      initial={{ x: 80, opacity: 0, rotate: 2 }}
      animate={{ x: 0, opacity: 1, rotate: 0 }}
      exit={{ x: -80, opacity: 0, rotate: -2 }}
      transition={{ type: "spring", stiffness: 160, damping: 20 }}
      className="w-full max-w-md"
    >
      <div className="rounded-[2rem] bg-cream p-6 shadow-2xl ring-8 ring-white/15">
        {/* Visual anchor — emoji illustration in a soft bubble.
            Backend words have no emoji, so we show a friendly letter tile.
            word.imageUrl is reserved for real artwork later. */}
        <motion.div
          className="mx-auto flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-b from-sky-100 to-violet-100 shadow-inner"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        >
          {word.emoji ? (
            <span className="text-8xl drop-shadow" role="img" aria-label={word.word}>
              {word.emoji}
            </span>
          ) : (
            <span className="text-7xl font-extrabold text-violet-400/80 drop-shadow">
              {word.word.charAt(0).toUpperCase()}
            </span>
          )}
        </motion.div>

        {/* Word + listen button */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <h2 className="text-6xl font-extrabold tracking-wide text-space-900">
            {word.word}
          </h2>
          <motion.button
            onClick={() => playWordAudio(word.id, word.word)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label={`Listen to ${word.word}`}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-lg"
          >
            <Volume2 className="h-7 w-7" />
          </motion.button>
        </div>

        <p className="mt-1 text-center text-lg text-space-700/60">{word.phonetic}</p>
        <p className="mt-1 text-center text-2xl font-bold text-space-700">
          {word.translation}
        </p>

        {/* Simple sentence with color-coded focus word.
            Backend words ship without a sentence — hide the block then. */}
        {word.sentence_en && (
          <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-center ring-2 ring-amber-200/70">
            <div className="flex items-start justify-center gap-2">
              <HighlightedSentence sentence={word.sentence_en} focus={word.word} />
              <motion.button
                onClick={() => speakSentence(word.sentence_en)}
                whileTap={{ scale: 0.85 }}
                aria-label="Listen to sentence"
                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-300 text-amber-900 shadow"
              >
                <Volume2 className="h-5 w-5" />
              </motion.button>
            </div>
            <p className="mt-1 text-base text-space-700/70">{word.sentence_zh}</p>
          </div>
        )}
      </div>

      {/* Giant self-assessment buttons (≥72px tall) */}
      <div className="mt-5 grid grid-cols-2 gap-4">
        <motion.button
          onClick={() => onAnswer(false)}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          className="flex min-h-20 flex-col items-center justify-center rounded-3xl bg-gradient-to-b from-yellow-300 to-amber-400 px-4 py-3 shadow-xl ring-4 ring-yellow-200/50"
        >
          <span className="text-xl font-extrabold text-amber-900">
            😅 Oops, Help Me!
          </span>
          <span className="text-sm font-bold text-amber-800/70">帮帮我</span>
        </motion.button>
        <motion.button
          onClick={() => onAnswer(true)}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          className="flex min-h-20 flex-col items-center justify-center rounded-3xl bg-gradient-to-b from-emerald-400 to-green-500 px-4 py-3 shadow-xl ring-4 ring-emerald-300/50"
        >
          <span className="text-xl font-extrabold text-white">✅ I Know It!</span>
          <span className="text-sm font-bold text-emerald-100">我会啦</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
