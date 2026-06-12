"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fireVictoryConfetti } from "@/lib/confetti";
import { speakCheer } from "@/lib/speech";
import { happySound } from "@/lib/sfx";
import {
  getPetProgress,
  getPetStage,
  getPetStageIndex,
} from "@/lib/pet";

interface RewardOverlayProps {
  /** Pet XP before / after the session — detects an evolution moment. */
  xpBefore: number;
  xpAfter: number;
  starsEarned: number;
  onContinue: () => void;
}

/**
 * High-dopamine victory screen: full-screen confetti, the pet hatching or
 * visibly leveling up, a count of earned XP/stars, and a synthesized cheer.
 * The layout scrolls/scales to always fit the screen, and it plays itself —
 * including a gentle auto-return so a young child never gets stuck here.
 */
export default function RewardOverlay({
  xpBefore,
  xpAfter,
  starsEarned,
  onContinue,
}: RewardOverlayProps) {
  const oldIndex = getPetStageIndex(xpBefore);
  const newIndex = getPetStageIndex(xpAfter);
  const evolved = newIndex > oldIndex;
  const oldPet = getPetStage(xpBefore);
  const newPet = getPetStage(xpAfter);
  const gained = Math.max(0, xpAfter - xpBefore);
  const progress = getPetProgress(xpAfter);

  // For an evolution, show the old form first, then morph into the new one.
  const [morphed, setMorphed] = useState(!evolved);
  const autoMs = evolved ? 9000 : 6000;

  useEffect(() => {
    fireVictoryConfetti();
    const cheer = setTimeout(() => speakCheer(), 400);
    const encore = setTimeout(() => fireVictoryConfetti(), 1600);

    let morphFx: ReturnType<typeof setTimeout> | undefined;
    if (evolved) {
      morphFx = setTimeout(() => {
        setMorphed(true);
        happySound();
        fireVictoryConfetti();
      }, 900);
    }

    // Gentle auto-return so a small child is never stranded on this screen.
    const auto = setTimeout(onContinue, autoMs);

    return () => {
      clearTimeout(cheer);
      clearTimeout(encore);
      if (morphFx) clearTimeout(morphFx);
      clearTimeout(auto);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shownPet = morphed ? newPet : oldPet;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-space-950/90 px-6 py-8 text-center backdrop-blur-sm"
    >
      {/* Pet stage with expanding shockwave halos */}
      <div className="relative flex h-44 w-44 items-center justify-center">
        {[0, 0.4].map((delay) => (
          <motion.span
            key={delay}
            className="absolute inset-0 rounded-full ring-4 ring-amber-300/40"
            initial={{ scale: 0.5, opacity: 0.6 }}
            animate={{ scale: 2.2, opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, delay, ease: "easeOut" }}
          />
        ))}

        {/* Flash burst at the moment of evolution */}
        {evolved && morphed && (
          <motion.span
            className="absolute inset-0 rounded-full bg-white"
            initial={{ scale: 0.4, opacity: 0.9 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        )}

        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.2 }}
          className="relative"
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={shownPet.emoji}
              className="block text-[5rem] drop-shadow-2xl sm:text-8xl"
              initial={evolved ? { scale: 0.3, rotate: -30, opacity: 0 } : false}
              animate={{ scale: 1, rotate: 0, opacity: 1, y: [0, -14, 0] }}
              transition={{
                scale: { type: "spring", stiffness: 260, damping: 12 },
                y: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              {shownPet.emoji}
            </motion.span>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* LEVEL UP banner — the unmistakable evolution signal */}
      {evolved && morphed && (
        <motion.div
          initial={{ scale: 0, y: -10 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 14 }}
          className="rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-5 py-1.5 text-lg font-extrabold text-space-900 shadow-lg ring-2 ring-white/40"
        >
          ⬆️ 升级啦！LEVEL UP · Lv.{newIndex + 1}
        </motion.div>
      )}

      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-2xl font-extrabold text-white sm:text-4xl"
      >
        {evolved ? `It became a ${newPet.name}!` : "Fantastic! You are a superstar!"}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-base text-white/70 sm:text-lg"
      >
        {evolved
          ? `哇！宠物进化成${newPet.nameZh}啦！`
          : "太棒了！你的宠物吃得饱饱的！"}
      </motion.p>

      {/* Earned XP pop + progress toward the next evolution */}
      {gained > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.7, type: "spring", stiffness: 300 }}
          className="flex flex-col items-center gap-2"
        >
          <span className="rounded-full bg-violet-500/30 px-4 py-1 text-lg font-extrabold text-amber-300 ring-2 ring-violet-300/30">
            +{gained} XP ✨
          </span>
          <div className="h-2.5 w-52 overflow-hidden rounded-full bg-white/15">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400"
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(progress * 100)}%` }}
              transition={{ delay: 0.9, duration: 1, ease: "easeOut" }}
            />
          </div>
        </motion.div>
      )}

      {/* Earned stars pop in one by one */}
      {starsEarned > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {Array.from({ length: starsEarned }).map((_, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.9 + i * 0.1, type: "spring", stiffness: 300 }}
              className="text-3xl drop-shadow sm:text-4xl"
            >
              ⭐
            </motion.span>
          ))}
        </div>
      )}

      <motion.button
        onClick={onContinue}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative mt-2 min-h-14 overflow-hidden rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-10 py-3 text-xl font-extrabold text-space-900 shadow-2xl ring-4 ring-amber-200/40 sm:text-2xl"
      >
        Keep Going! 继续冒险 🚀
        {/* Thin auto-return countdown so it advances on its own. */}
        <motion.span
          className="absolute bottom-0 left-0 h-1 bg-space-900/30"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: autoMs / 1000, ease: "linear" }}
        />
      </motion.button>
    </motion.div>
  );
}
