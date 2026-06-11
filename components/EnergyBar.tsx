"use client";

import { motion } from "framer-motion";

interface EnergyBarProps {
  /** 0..1 fill level. */
  value: number;
  /** Emoji badge at the head of the bar (⚡ daily energy, ✨ pet growth). */
  icon: string;
  /** Tailwind gradient for the fill, e.g. "from-amber-400 to-orange-500". */
  gradient?: string;
  className?: string;
}

/**
 * The child-friendly progress meter: a glowing filling bar with an emoji
 * badge. Never shows numbers or time — just "how full is my energy".
 */
export default function EnergyBar({
  value,
  icon,
  gradient = "from-amber-300 to-orange-400",
  className = "",
}: EnergyBarProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const full = clamped >= 1;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        className={`text-2xl drop-shadow ${full ? "animate-wiggle" : ""}`}
        aria-hidden
      >
        {icon}
      </span>
      <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-white/20 ring-2 ring-white/30">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
          initial={false}
          animate={{ width: `${clamped * 100}%` }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
        />
        {/* Soft shine on top of the fill */}
        <div className="pointer-events-none absolute inset-x-1 top-0.5 h-1.5 rounded-full bg-white/30" />
        {full && (
          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs animate-twinkle">
            ✨
          </span>
        )}
      </div>
    </div>
  );
}
