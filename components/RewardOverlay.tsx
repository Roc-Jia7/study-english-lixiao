"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { fireVictoryConfetti } from "@/lib/confetti";
import { speakCheer } from "@/lib/speech";
import { getPetStage, getPetStageIndex } from "@/lib/pet";

interface RewardOverlayProps {
  /** Pet XP before / after the session — detects an evolution moment. */
  xpBefore: number;
  xpAfter: number;
  starsEarned: number;
  onContinue: () => void;
}

/**
 * High-dopamine victory screen: full-screen confetti, the pet hatching or
 * growing, a row of earned stars, and a synthesized audio cheer.
 */
export default function RewardOverlay({
  xpBefore,
  xpAfter,
  starsEarned,
  onContinue,
}: RewardOverlayProps) {
  const evolved = getPetStageIndex(xpAfter) > getPetStageIndex(xpBefore);
  const pet = getPetStage(xpAfter);

  useEffect(() => {
    fireVictoryConfetti();
    const cheer = setTimeout(() => speakCheer(), 400);
    const encore = setTimeout(() => fireVictoryConfetti(), 1500);
    return () => {
      clearTimeout(cheer);
      clearTimeout(encore);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-space-950/90 px-6 backdrop-blur-sm"
    >
      {/* The pet bursts in */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.2 }}
        className="relative"
      >
        <motion.span
          className="block text-9xl drop-shadow-2xl"
          animate={{ y: [0, -16, 0], rotate: [0, -5, 5, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          {pet.emoji}
        </motion.span>
        {evolved && (
          <motion.span
            className="absolute -right-8 -top-6 text-5xl"
            animate={{ scale: [1, 1.4, 1], rotate: [0, 20, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            💥
          </motion.span>
        )}
      </motion.div>

      <motion.h2
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-6 text-center text-4xl font-extrabold text-white"
      >
        {evolved ? `It evolved into a ${pet.name}!` : "Fantastic! You are a superstar!"}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-2 text-center text-lg text-white/70"
      >
        {evolved ? `哇！宠物进化成${pet.nameZh}啦！` : "太棒了！你的宠物吃得饱饱的！"}
      </motion.p>

      {/* Earned stars pop in one by one */}
      <div className="mt-6 flex gap-2">
        {Array.from({ length: starsEarned }).map((_, i) => (
          <motion.span
            key={i}
            initial={{ scale: 0, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ delay: 0.7 + i * 0.12, type: "spring", stiffness: 300 }}
            className="text-4xl drop-shadow"
          >
            ⭐
          </motion.span>
        ))}
      </div>

      <motion.button
        onClick={onContinue}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="mt-10 min-h-16 rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-12 py-4 text-2xl font-extrabold text-space-900 shadow-2xl ring-4 ring-amber-200/40"
      >
        Keep Going! 继续冒险 🚀
      </motion.button>
    </motion.div>
  );
}
