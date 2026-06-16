"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import {
  PET_TAP_PHRASES,
  getNextStage,
  getPetProgress,
  getPetStage,
  getPetStageIndex,
} from "@/lib/pet";
import { popSound, happySound } from "@/lib/sfx";
import { fireMiniSparkle } from "@/lib/confetti";

interface PetCompanionProps {
  xp: number;
  size?: "mini" | "large";
  /** The pet's chosen name (large size only). */
  petName?: string;
  /** When provided, the child can name/rename the pet (large size only). */
  onRename?: (name: string) => void;
}

/** "Almost evolving" feels imminent once the bar is this full. */
const EVOLVE_SOON = 0.8;

interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
}

const BURST_EMOJIS = ["💖", "✨", "⭐", "🌟", "💫", "🎉"];

/**
 * The student's evolving pet — the friendly face of the forgetting curve.
 * Every reviewed word feeds it; XP milestones evolve egg → unicorn. Poking
 * the big pet makes it bounce, spill sparkles, and say something cute, so it
 * feels like a real little companion rather than a static icon.
 */
export default function PetCompanion({
  xp,
  size = "large",
  petName,
  onRename,
}: PetCompanionProps) {
  const stage = getPetStage(xp);
  const stageIndex = getPetStageIndex(xp);
  const next = getNextStage(xp);
  const progress = getPetProgress(xp);
  const evolveSoon = next !== null && progress >= EVOLVE_SOON;

  const controls = useAnimationControls();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [bubble, setBubble] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(petName ?? "");
  const seq = useRef(0);
  const taps = useRef(0);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveName = () => {
    onRename?.(draft);
    setEditing(false);
  };

  useEffect(
    () => () => {
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    },
    [],
  );

  if (size === "mini") {
    return (
      <motion.button
        className="text-3xl"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        whileTap={{ scale: 0.8, rotate: -8 }}
        onClick={() => popSound()}
        title={stage.name}
        aria-label={stage.name}
      >
        {stage.emoji}
      </motion.button>
    );
  }

  const poke = () => {
    taps.current += 1;
    // Squishy bounce that overrides the gentle idle wobble for a moment.
    void controls.start({
      scale: [1, 0.82, 1.28, 1],
      rotate: [0, -10, 10, 0],
      transition: { duration: 0.5, ease: "easeInOut" },
    });

    // Spray a handful of sparkles outward from the pet.
    const fresh: Particle[] = Array.from({ length: 6 }).map(() => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 55 + Math.random() * 45;
      return {
        id: seq.current++,
        emoji: BURST_EMOJIS[Math.floor(Math.random() * BURST_EMOJIS.length)],
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
      };
    });
    setParticles((p) => [...p, ...fresh]);

    // Say something cute.
    setBubble(PET_TAP_PHRASES[Math.floor(Math.random() * PET_TAP_PHRASES.length)]);
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), 1500);

    // Every 5th poke is a little party.
    if (taps.current % 5 === 0) {
      happySound();
      fireMiniSparkle();
    } else {
      popSound();
    }
  };

  const removeParticle = (id: number) =>
    setParticles((p) => p.filter((x) => x.id !== id));

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        className="relative flex h-40 w-40 items-center justify-center"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Themed glow aura that pulses gently. */}
        <motion.div
          className={`absolute inset-0 rounded-full bg-gradient-to-b ${stage.aura} ring-4 ring-white/20`}
          animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ boxShadow: "var(--shadow-glow)" }}
        />

        {/* Speech bubble on poke */}
        <AnimatePresence>
          {bubble && (
            <motion.div
              key={bubble + seq.current}
              initial={{ opacity: 0, y: 10, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              className="absolute -top-10 z-20 whitespace-nowrap rounded-2xl bg-white px-3 py-1.5 text-sm font-bold text-space-900 shadow-lg"
            >
              {bubble}
              <span className="absolute -bottom-1 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Poke particles */}
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 text-2xl"
            initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
            animate={{ x: p.x, y: p.y, scale: 1.1, opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            onAnimationComplete={() => removeParticle(p.id)}
          >
            {p.emoji}
          </motion.span>
        ))}

        {/* The pet itself — poke me! */}
        <motion.button
          onClick={poke}
          animate={controls}
          whileTap={{ scale: 0.9 }}
          aria-label={`${stage.name} — 戳一戳`}
          className="relative z-10 text-7xl drop-shadow-lg"
        >
          {stage.emoji}
        </motion.button>

        <span className="pointer-events-none absolute -right-1 top-2 text-xl animate-twinkle">
          ✨
        </span>
        <span
          className="pointer-events-none absolute -left-2 bottom-4 text-sm animate-twinkle"
          style={{ animationDelay: "1.2s" }}
        >
          ⭐
        </span>

        {/* Level badge */}
        <span className="absolute -bottom-1 right-0 z-20 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-extrabold text-space-900 shadow ring-2 ring-white/40">
          Lv.{stageIndex + 1}
        </span>

        {/* Evolution preview — builds anticipation when the bar is nearly full */}
        <AnimatePresence>
          {evolveSoon && (
            <motion.span
              initial={{ opacity: 0, y: 6, scale: 0.7 }}
              animate={{ opacity: 1, y: 0, scale: [1, 1.08, 1] }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ scale: { duration: 1.2, repeat: Infinity } }}
              className="absolute -top-3 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-3 py-0.5 text-xs font-extrabold text-space-900 shadow-lg ring-2 ring-white/40"
            >
              马上要进化啦！{next.emoji}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Name tag — the child names their companion and we use it everywhere */}
      <div className="text-center">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") setEditing(false);
              }}
              maxLength={12}
              placeholder="给宠物起名"
              className="w-36 rounded-full bg-white px-3 py-1.5 text-center font-bold text-space-900 shadow outline-none ring-2 ring-violet-300"
            />
            <button
              onClick={saveName}
              aria-label="保存名字"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400 text-lg shadow active:scale-90"
            >
              ✅
            </button>
            <button
              onClick={() => setEditing(false)}
              aria-label="取消"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg active:scale-90"
            >
              ✖️
            </button>
          </div>
        ) : petName ? (
          <button
            onClick={() => onRename && (setDraft(petName), setEditing(true))}
            className="flex items-center gap-1.5 text-xl font-extrabold text-white"
          >
            🏷️ {petName}
            {onRename && <span className="text-sm opacity-60">✏️</span>}
          </button>
        ) : onRename ? (
          <motion.button
            onClick={() => (setDraft(""), setEditing(true))}
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 px-4 py-1.5 text-base font-extrabold text-white shadow-lg ring-2 ring-white/30"
          >
            ✏️ 给我取个名字吧！
          </motion.button>
        ) : (
          <p className="text-xl font-bold text-white">{stage.name}</p>
        )}
        <p className="mt-0.5 text-sm text-white/70">
          {petName ? `${stage.nameZh} · ` : ""}
          {stage.hint}
        </p>
      </div>

      {/* Progress to the next evolution, with the goal emoji as the carrot. */}
      {next ? (
        <div className="flex w-52 items-center gap-2">
          <span className="text-lg">{stage.emoji}</span>
          <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-white/15">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400"
              initial={false}
              animate={{ width: `${Math.round(progress * 100)}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
          <motion.span
            className="text-lg grayscale"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            {next.emoji}
          </motion.span>
        </div>
      ) : (
        <span className="rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-4 py-1 text-sm font-extrabold text-space-900 shadow">
          ✨ 最强形态 MAX ✨
        </span>
      )}
    </div>
  );
}
