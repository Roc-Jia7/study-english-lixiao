"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2, VolumeX, Languages, Eye, EyeOff, Loader2, Wifi } from "lucide-react";
import type { DisplayMode, VocabularyWord } from "@/lib/types";
import { playWordAudio, playBilingual } from "@/lib/audio";
import { speechSupported } from "@/lib/speech";
import { speakSentence } from "@/lib/speech";
import { popSound, happySound, softSound } from "@/lib/sfx";

interface LearningCardProps {
  word: VocabularyWord;
  onAnswer: (known: boolean) => void;
  /** Which side(s) of the card to reveal up front. */
  displayMode?: DisplayMode;
  /** View-only (looking back at a past word): hides the answer buttons. */
  readOnly?: boolean;
}

/** Card must be on screen this long before an answer counts (anti-spam). */
const MIN_VIEW_MS = 600;

/** Long words can blow past the card width at a fixed 60px — shrink to fit. */
function wordSizeClass(len: number): string {
  if (len <= 6) return "text-6xl tracking-wide";
  if (len <= 9) return "text-5xl";
  if (len <= 12) return "text-4xl";
  if (len <= 16) return "text-3xl";
  return "text-2xl";
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

/** A gentle dashed "tap to reveal" button used to uncover the hidden side. */
function RevealButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      className="mx-auto mt-2 flex min-h-11 items-center gap-2 rounded-full border-2 border-dashed border-violet-300 bg-violet-50 px-5 py-2 font-bold text-violet-500"
    >
      <Eye className="h-5 w-5" />
      {label}
    </motion.button>
  );
}

/** Small "collapse / hide again" toggle shown once a side is revealed. */
function HideToggle({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mx-auto mt-1.5 flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-violet-400/80 active:scale-95"
    >
      <EyeOff className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

/**
 * One word, one card, zero clutter — but extra bouncy and cuddly. Big
 * tappable picture, big word, listen + bilingual buttons, and two giant
 * jelly self-assessment buttons. Tapping the hidden language toggles it open
 * and closed; "帮帮我" turns into a kind little teaching moment instead of a
 * silent skip.
 */
export default function LearningCard({
  word,
  onAnswer,
  displayMode = "both",
  readOnly = false,
}: LearningCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [ready, setReady] = useState(false);
  const [helping, setHelping] = useState(false);
  const [audioState, setAudioState] = useState<
    "idle" | "loading" | "playing" | "speech"
  >("idle");
  const skipAutoplay = useRef(false);

  const audioHooks = {
    onLoading: () => setAudioState("loading"),
    onPlaying: () => setAudioState("playing"),
    onFallback: () => setAudioState("speech"),
  };

  // Which side is hidden until revealed (the other side is the prompt).
  const hideSide = displayMode === "en" ? "zh" : displayMode === "zh" ? "en" : null;
  const showEnglish = hideSide !== "en" || revealed;
  const showChinese = hideSide !== "zh" || revealed;

  // Switching mode mid-deck gives a fresh recall challenge.
  useEffect(() => setRevealed(false), [displayMode]);

  // Anti-spam: a new card can't be answered for a brief beat, so a child
  // can't blast through the whole deck by hammering the same button.
  useEffect(() => {
    if (readOnly) return;
    setReady(false);
    const t = setTimeout(() => setReady(true), MIN_VIEW_MS);
    return () => clearTimeout(t);
  }, [word.id, readOnly]);

  // Clear the weak-network hint a few seconds after it appears.
  useEffect(() => {
    if (audioState !== "speech") return;
    const t = setTimeout(() => setAudioState("idle"), 4000);
    return () => clearTimeout(t);
  }, [audioState]);

  // Say the word once it's visible (the session began with a tap, so the
  // audio gesture requirement is satisfied). Stay silent while the English
  // answer is hidden, and skip when "帮帮我" is already speaking it bilingually.
  useEffect(() => {
    if (!showEnglish) return;
    if (skipAutoplay.current) {
      skipAutoplay.current = false;
      return;
    }
    const timer = setTimeout(
      () => playWordAudio(word.id, word.word, word.audioUrl, audioHooks),
      350,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word.id, word.word, word.audioUrl, showEnglish]);

  const sayWord = () => {
    popSound();
    playWordAudio(word.id, word.word, word.audioUrl, audioHooks);
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

  const knowIt = () => {
    if (!ready || helping) return;
    happySound();
    onAnswer(true);
  };

  // "帮帮我": reveal the answer, hear it, and show a warm "let's look together"
  // beat before the word slips back into the deck — real help, not a silent skip.
  const helpMe = () => {
    if (!ready || helping) return;
    softSound();
    skipAutoplay.current = true;
    setRevealed(true);
    setHelping(true);
    playBilingual({
      wordId: word.id,
      word: word.word,
      translation: word.translation,
      audioUrl: word.audioUrl,
      bilingualUrl: word.audioUrlBilingual,
    });
    setTimeout(() => onAnswer(false), 2200);
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

      <div className="relative overflow-hidden rounded-[2.5rem] bg-cream p-6 shadow-card ring-8 ring-white/30">
        {/* Warm "let's learn it together" banner when the child asks for help */}
        <AnimatePresence>
          {helping && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute inset-x-3 top-3 z-20 flex items-center justify-center gap-2 rounded-2xl bg-emerald-400/95 px-3 py-2 text-center text-sm font-extrabold text-white shadow-lg"
            >
              🤗 没关系，我们一起看一遍！It&apos;s okay — let&apos;s learn it!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tappable visual anchor — a squishy sticker. Backend words have no
            emoji, so we show a friendly letter tile with a tiny face. When the
            English answer is hidden, a mystery tile keeps the spelling secret. */}
        <motion.button
          onClick={showEnglish ? sayWord : () => setRevealed(true)}
          aria-label={showEnglish ? `Listen to ${word.word}` : "揭晓单词"}
          className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-[2rem] bg-gradient-to-b from-sky-100 to-violet-100 shadow-inner"
          animate={{ y: [0, -7, 0], rotate: [-2, 2, -2] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          whileTap={{ scale: 0.88, rotate: -4 }}
        >
          {word.emoji ? (
            <span className="text-8xl drop-shadow" role="img" aria-label={word.word}>
              {word.emoji}
            </span>
          ) : showEnglish ? (
            <span className="flex flex-col items-center leading-none">
              <span className="text-7xl font-extrabold text-violet-400 drop-shadow">
                {word.word.charAt(0).toUpperCase()}
              </span>
              <span className="-mt-2 text-2xl">◡̈</span>
            </span>
          ) : (
            <span className="text-7xl font-extrabold text-violet-300 drop-shadow">
              ❓
            </span>
          )}
          <span className="absolute -right-1 -top-1 text-2xl animate-twinkle">✨</span>
        </motion.button>

        {/* English word + listen button — or a reveal prompt when hidden */}
        {showEnglish ? (
          <>
            <div className="mt-4 flex items-center justify-center gap-2">
              <h2
                className={`min-w-0 break-words text-center font-extrabold leading-tight text-space-900 ${wordSizeClass(
                  word.word.length,
                )}`}
              >
                {word.word}
              </h2>
              <motion.button
                onClick={sayWord}
                whileHover={{ scale: 1.12, rotate: -6 }}
                whileTap={{ scale: 0.85 }}
                aria-label={`Listen to ${word.word}`}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-pop"
              >
                {audioState === "loading" ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : (
                  <Volume2 className="h-7 w-7" />
                )}
              </motion.button>
            </div>
            <p className="mt-1 break-words px-2 text-center text-lg text-space-700/60">
              {word.phonetic}
            </p>
            {/* Honest audio hint: only flag a problem. A word with its own
                recording that fell back = weak network; no recording = TTS by
                design (no alarm); no speech support at all = say so. */}
            {audioState === "speech" &&
              (!speechSupported() ? (
                <p className="mt-1 flex items-center justify-center gap-1 text-center text-xs font-bold text-rose-500/80">
                  <VolumeX className="h-3.5 w-3.5" /> 此设备暂不支持朗读发音
                </p>
              ) : word.audioUrl ? (
                <p className="mt-1 flex items-center justify-center gap-1 text-center text-xs font-bold text-amber-600/80">
                  <Wifi className="h-3.5 w-3.5" /> 弱网 · 暂用朗读发音
                </p>
              ) : null)}
            {hideSide === "en" && (
              <HideToggle label="收起英文" onClick={() => setRevealed(false)} />
            )}
          </>
        ) : (
          <RevealButton label="看看英文" onClick={() => setRevealed(true)} />
        )}

        {/* Chinese translation — tap for bilingual audio, or reveal when hidden */}
        {showChinese ? (
          <>
            <motion.button
              onClick={sayBilingual}
              whileTap={{ scale: 0.95 }}
              className="mx-auto mt-2 flex max-w-full flex-wrap items-center justify-center gap-2 rounded-3xl bg-violet-100 px-4 py-1.5 shadow-sm ring-2 ring-violet-200"
              aria-label="双语朗读"
            >
              <span className="break-words text-center text-2xl font-bold text-space-700">
                {word.translation}
              </span>
              <Languages className="h-5 w-5 shrink-0 text-violet-500" />
              <span className="shrink-0 text-xs font-bold text-violet-500">中英</span>
            </motion.button>
            {hideSide === "zh" && (
              <HideToggle label="收起中文" onClick={() => setRevealed(false)} />
            )}
          </>
        ) : (
          <RevealButton label="看看中文" onClick={() => setRevealed(true)} />
        )}

        {/* Simple sentence with color-coded focus word. Backend words ship
            without a sentence; English line hides with the English answer. */}
        {word.sentence_en && showEnglish && (
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
            {showChinese && (
              <p className="mt-1 text-base text-space-700/70">{word.sentence_zh}</p>
            )}
          </div>
        )}
      </div>

      {/* Giant jelly self-assessment buttons (≥72px tall). Hidden in view-only
          peek mode, and briefly locked after a new card to prevent spam-taps. */}
      {!readOnly && (
        <div className="mt-5 grid grid-cols-2 gap-4">
          <motion.button
            onClick={helpMe}
            disabled={!ready || helping}
            whileHover={ready && !helping ? { scale: 1.05, rotate: -1 } : undefined}
            whileTap={ready && !helping ? { scale: 0.9, rotate: -3 } : undefined}
            transition={{ type: "spring", stiffness: 400, damping: 12 }}
            className="flex min-h-20 flex-col items-center justify-center rounded-[1.75rem] bg-gradient-to-b from-yellow-300 to-amber-400 px-4 py-3 shadow-pop ring-4 ring-yellow-200/60 transition-opacity disabled:opacity-50"
          >
            <motion.span
              className="text-3xl"
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              {helping ? "📖" : "🐣"}
            </motion.span>
            <span className="text-lg font-extrabold text-amber-900">
              {helping ? "一起看～" : "帮帮我"}
            </span>
            <span className="text-xs font-bold text-amber-800/70">
              {helping ? "Learning together" : "Help Me!"}
            </span>
          </motion.button>
          <motion.button
            onClick={knowIt}
            disabled={!ready || helping}
            whileHover={ready && !helping ? { scale: 1.05, rotate: 1 } : undefined}
            whileTap={ready && !helping ? { scale: 0.9, rotate: 3 } : undefined}
            transition={{ type: "spring", stiffness: 400, damping: 12 }}
            className="flex min-h-20 flex-col items-center justify-center rounded-[1.75rem] bg-gradient-to-b from-emerald-400 to-green-500 px-4 py-3 shadow-pop ring-4 ring-emerald-300/60 transition-opacity disabled:opacity-50"
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
      )}
    </motion.div>
  );
}
