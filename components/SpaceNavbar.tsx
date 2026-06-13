"use client";

import { motion } from "framer-motion";
import { Users, Lock } from "lucide-react";
import { useAppStore, useActiveStudent } from "@/store/useAppStore";
import { useLxllStore } from "@/store/useLxllStore";
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
  const lxllSignOut = useLxllStore((s) => s.signOut);

  if (!student) return null;

  const isLxll = student.id.startsWith("lxll:");

  const lockAndSignOut = () => {
    // Fully exit: clear the local station and any real lxll session.
    if (isLxll) void lxllSignOut();
    lockStation();
  };

  const handleSwitch = () => {
    // For a real lxll family, switching child means logging in again with
    // that child's password — so sign out and return to the login screen.
    // (Demo profiles share one device, so keep the local avatar picker.)
    if (isLxll) {
      void lxllSignOut();
      lockStation();
    } else {
      switchProfile();
    }
  };

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

        {/* Switch pilot — for lxll, this re-logs in as another child */}
        <button
          onClick={handleSwitch}
          aria-label={isLxll ? "切换孩子（重新登录）" : "Switch profile"}
          title={isLxll ? "切换孩子（需重新登录）" : "切换档案"}
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white/80 transition hover:bg-white/20 active:scale-90"
        >
          <Users className="h-6 w-6" />
        </button>

        {/* Parent lock — returns to the phone gate */}
        <button
          onClick={lockAndSignOut}
          aria-label="Lock station (parents)"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white/50 transition hover:bg-white/20 active:scale-90"
        >
          <Lock className="h-5 w-5" />
        </button>
      </div>
    </motion.header>
  );
}
