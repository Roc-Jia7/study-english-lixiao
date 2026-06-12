"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2, Languages } from "lucide-react";
import type { VocabularyWord } from "@/lib/types";
import { playWordAudio, playBilingual } from "@/lib/audio";
import { speakSentence } from "@/lib/speech";
import { popSound, happySound, softSound } from "@/lib/sfx";

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

/** A few floating bubbles drifting up behind the card — pure cuteness. */
function Bubbles() {
  const bubbles = [
    { left: "8%", size: 18, delay: 0, dur: 5, e: "🫧" },
    { left: "24%", size: 12, delay: 1.4, dur: 6, e: "⭐" },
    { left: "72%", size: 16, delay: 0.6, dur: 5.5, e: "🫧" },
    { left: "88%", size: 14, delay: 2, dur: 6.5, e: "✨" },
    { left: "54%", size: 12, delay: 3, dur: 5, e: "💫" },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {bubbles.map((b, i) => (
        <motion.span
          key={i}
          className="absolute bottom-0 opacity-60"
          style={{ left: b.left, fontSize: b.size }}
          animate={{ y: [20, -260], opacity: [0, 0.7, 0] }}
          transition={{
            duration: b.dur,
            delay: b.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {b.e}
        </motion.span>
      ))}
    </div>
  );
}

/**
 * One word, one card, zero clutter — but extra bouncy and cuddly. Big
 * tappable picture, big word, listen + bilingual buttons, and two giant
 * jelly self-assessment buttons.
 */
export default function LearningCard({ word, onAnswer }: LearningCardProps) {
  // Say the word out loud as soon as the card appears (the session was
  // started by a tap, so the audio gesture requirement is satisfied).
  useEffect(() => {
    const timer = setTimeout(
      () => playWordAudio(word.id, word.word, word.audioUrl),
      350,
    );
    return () => clearTimeout(timer);
  }, [word.id, word.word, word.audioUrl]);

  const sayWord = () => {
    popSound();
    playWordAudio(word.id, word.word, word.audioUrl);
  };
  const sayBilingual = () => {
    popSound();
    playBilingual({
      wordId: word.id,
      word: word.word,
      translation: word.translation,
      audioUrl: word.audioUrl,
      bilingualUrl: word.audioUrlBilingual,
    });
  };

  return (
    <motion.div
      key={word.id}
      initial={{ x: 80, opacity: 0, scale: 0.9, rotate: 3 }}
      animate={{ x: 0, opacity: 1, scale: 1, rotate: 0 }}
      exit={{ x: -80, opacity: 0, scale: 0.9, rotate: -3 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className="relative w-full max-w-md"
    >
      <Bubbles />

      <div className="relative rounded-[2.5rem] bg-cream p-6 shadow-2xl ring-8 ring-white/30">
        {/* Tappable visual anchor — a squishy sticker. Backend words have no
            emoji, so we show a friendly letter tile with a tiny face. */}
        <motion.button
          onClick={sayWord}
          aria-label={`Listen to ${word.word}`}
          className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-[2rem] bg-gradient-to-b from-sky-100 to-violet-100 shadow-inner"
          animate={{ y: [0, -7, 0], rotate: [-2, 2, -2] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          whileTap={{ scale: 0.88, rotate: -4 }}
        >
          {word.emoji ? (
            <span className="text-8xl drop-shadow" role="img" aria-label={word.word}>
              {word.emoji}
            </span>
          ) : (
            <span className="flex flex-col items-center leading-none">
              <span className="text-7xl font-extrabold text-violet-400 drop-shadow">
                {word.word.charAt(0).toUpperCase()}
              </span>
              <span className="-mt-2 text-2xl">◡̈</span>
            </span>
          )}
          <span className="absolute -right-1 -top-1 text-2xl animate-twinkle">✨</span>
        </motion.button>

        {/* Word + two listen buttons (English / bilingual) */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <h2 className="text-6xl font-extrabold tracking-wide text-space-900">
            {word.word}
          </h2>
          <motion.button
            onClick={sayWord}
            whileHover={{ scale: 1.12, rotate: -6 }}
            whileTap={{ scale: 0.85 }}
            aria-label={`Listen to ${word.word}`}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-lg"
          >
            <Volume2 className="h-7 w-7" />
          </motion.button>
        </div>

        <p className="mt-1 text-center text-lg text-space-700/60">{word.phonetic}</p>

        {/* Translation row — tap for bilingual (English + Chinese) audio */}
        <motion.button
          onClick={sayBilingual}
          whileTap={{ scale: 0.95 }}
          className="mx-auto mt-2 flex items-center gap-2 rounded-full bg-violet-100 px-4 py-1.5 shadow-sm ring-2 ring-violet-200"
          aria-label="双语朗读"
        >
          <span className="text-2xl font-bold text-space-700">
            {word.translation}
          </span>
          <Languages className="h-5 w-5 text-violet-500" />
          <span className="text-xs font-bold text-violet-500">中英</span>
        </motion.button>

        {/* Simple sentence with color-coded focus word.
            Backend words ship without a sentence — hide the block then. */}
        {word.sentence_en && (
          <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-center ring-2 ring-amber-200/70">
            <div className="flex items-start justify-center gap-2">
              <HighlightedSentence sentence={word.sentence_en} focus={word.word} />
              <motion.button
                onClick={() => {
                  popSound();
                  speakSentence(word.sentence_en);
                }}
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

      {/* Giant jelly self-assessment buttons (≥72px tall) */}
      <div className="mt-5 grid grid-cols-2 gap-4">
        <motion.button
          onClick={() => {
            softSound();
            onAnswer(false);
          }}
          whileHover={{ scale: 1.05, rotate: -1 }}
          whileTap={{ scale: 0.9, rotate: -3 }}
          transition={{ type: "spring", stiffness: 400, damping: 12 }}
          className="flex min-h-20 flex-col items-center justify-center rounded-[1.75rem] bg-gradient-to-b from-yellow-300 to-amber-400 px-4 py-3 shadow-xl ring-4 ring-yellow-200/60"
        >
          <motion.span
            className="text-3xl"
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            🐣
          </motion.span>
          <span className="text-lg font-extrabold text-amber-900">帮帮我</span>
          <span className="text-xs font-bold text-amber-800/70">Help Me!</span>
        </motion.button>
        <motion.button
          onClick={() => {
            happySound();
            onAnswer(true);
          }}
          whileHover={{ scale: 1.05, rotate: 1 }}
          whileTap={{ scale: 0.9, rotate: 3 }}
          transition={{ type: "spring", stiffness: 400, damping: 12 }}
          className="flex min-h-20 flex-col items-center justify-center rounded-[1.75rem] bg-gradient-to-b from-emerald-400 to-green-500 px-4 py-3 shadow-xl ring-4 ring-emerald-300/60"
        >
          <motion.span
            className="text-3xl"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          >
            🌟
          </motion.span>
          <span className="text-lg font-extrabold text-white">我会啦</span>
          <span className="text-xs font-bold text-emerald-100">I Know It!</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
