"use client";

import { motion } from "framer-motion";
import { getPetProgress, getPetStage } from "@/lib/pet";
import EnergyBar from "./EnergyBar";

interface PetCompanionProps {
  xp: number;
  size?: "mini" | "large";
}

/**
 * The student's evolving pet — the friendly face of the forgetting curve.
 * Every reviewed word feeds it; XP milestones evolve egg → dragon.
 */
export default function PetCompanion({ xp, size = "large" }: PetCompanionProps) {
  const stage = getPetStage(xp);
  const progress = getPetProgress(xp);

  if (size === "mini") {
    return (
      <motion.span
        className="text-3xl"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        title={stage.name}
        aria-label={stage.name}
      >
        {stage.emoji}
      </motion.span>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        className="relative flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-b from-violet-400/40 to-fuchsia-400/20 ring-4 ring-white/20 shadow-[0_0_40px_rgba(179,136,255,0.35)]"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.span
          className="text-7xl drop-shadow-lg"
          animate={{ rotate: [0, -4, 4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          {stage.emoji}
        </motion.span>
        <span className="absolute -right-1 top-2 text-xl animate-twinkle">✨</span>
        <span
          className="absolute -left-2 bottom-4 text-sm animate-twinkle"
          style={{ animationDelay: "1.2s" }}
        >
          ⭐
        </span>
      </motion.div>

      <div className="text-center">
        <p className="text-xl font-bold text-white">{stage.name}</p>
        <p className="text-sm text-white/70">
          {stage.nameZh} · {stage.hint}
        </p>
      </div>

      <EnergyBar
        value={progress}
        icon="✨"
        gradient="from-violet-400 to-fuchsia-400"
        className="w-48"
      />
    </div>
  );
}
