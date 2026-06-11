"use client";

import { motion } from "framer-motion";
import type { StudentProfile } from "@/lib/types";
import { getEffectiveStreak, lastNDays, localDateStr } from "@/lib/streak";

/** Rotating sticker art so the wall feels collected, not repeated. */
const STICKERS = ["🪐", "⭐", "🌟", "🌍", "🌈", "☄️", "🌕"];
const WALL_DAYS = 14;

/**
 * The Star Path: the last two weeks as a sticker wall. Each learning day
 * lights a planet; the streak flame celebrates consecutive days.
 */
export default function StickerWall({ student }: { student: StudentProfile }) {
  const days = lastNDays(WALL_DAYS);
  const learned = new Set(student.learnedDates);
  const streak = getEffectiveStreak(student);
  const today = localDateStr();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mt-8 rounded-3xl bg-white/10 p-5 ring-2 ring-white/15"
    >
      <div className="text-center">
        {streak > 0 ? (
          <p className="text-xl font-extrabold text-white">
            <motion.span
              className="inline-block"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              🔥
            </motion.span>{" "}
            {streak} {streak === 1 ? "day" : "days"} in a row!{" "}
            <span className="text-base font-bold text-white/70">
              连续学习 {streak} 天
            </span>
          </p>
        ) : (
          <p className="text-lg font-bold text-white/80">
            Light up a planet today! 今天也来点亮一颗星球吧 ✨
          </p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-7 justify-items-center gap-2">
        {days.map((day, i) => {
          const lit = learned.has(day);
          const isToday = day === today;
          return (
            <div
              key={day}
              className={`flex h-11 w-11 items-center justify-center rounded-full ${
                lit ? "bg-white/15" : "bg-white/5"
              } ${isToday ? "ring-2 ring-amber-300" : ""}`}
            >
              {lit ? (
                <motion.span
                  className="text-2xl drop-shadow"
                  initial={isToday ? { scale: 0 } : false}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 14 }}
                >
                  {STICKERS[i % STICKERS.length]}
                </motion.span>
              ) : (
                <span
                  className={`h-2 w-2 rounded-full ${
                    isToday ? "animate-twinkle bg-amber-300" : "bg-white/20"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {student.bestStreak > 1 && (
        <p className="mt-3 text-center text-xs text-white/40">
          Best adventure: 🏅 {student.bestStreak} days · 最长连续 {student.bestStreak} 天
        </p>
      )}
    </motion.div>
  );
}
