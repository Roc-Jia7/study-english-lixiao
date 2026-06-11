"use client";

import { motion } from "framer-motion";
import { Users, Lock } from "lucide-react";
import { useAppStore, useActiveStudent } from "@/store/useAppStore";
import { DAILY_ENERGY_GOAL } from "@/lib/pet";
import EnergyBar from "./EnergyBar";
import PetCompanion from "./PetCompanion";

/**
 * The Space Station top bar: who is flying, today's energy, and big
 * touch-friendly buttons to switch pilots or lock the station (parents).
 */
export default function SpaceNavbar() {
  const student = useActiveStudent();
  const switchProfile = useAppStore((s) => s.switchProfile);
  const lockStation = useAppStore((s) => s.lockStation);

  if (!student) return null;

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 16 }}
      className="sticky top-0 z-40 border-b border-white/10 bg-space-950/80 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        {/* Pilot badge */}
        <div className="flex items-center gap-2">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${student.gradient} text-2xl shadow-md ring-2 ring-white/40`}
          >
            {student.avatar}
          </span>
          <div className="hidden sm:block">
            <p className="text-base font-bold leading-tight text-white">
              {student.name}
            </p>
            <p className="text-xs leading-tight text-white/60">
              {student.title}
            </p>
          </div>
        </div>

        {/* Daily energy — fills as the child answers, resets each morning */}
        <EnergyBar
          value={student.energyToday / DAILY_ENERGY_GOAL}
          icon="⚡"
          className="flex-1"
        />

        <PetCompanion xp={student.xp} size="mini" />

        {/* Switch pilot */}
        <button
          onClick={switchProfile}
          aria-label="Switch profile"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white/80 transition hover:bg-white/20 active:scale-90"
        >
          <Users className="h-6 w-6" />
        </button>

        {/* Parent lock — returns to the phone gate */}
        <button
          onClick={lockStation}
          aria-label="Lock station (parents)"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white/50 transition hover:bg-white/20 active:scale-90"
        >
          <Lock className="h-5 w-5" />
        </button>
      </div>
    </motion.header>
  );
}
