"use client";

import { motion } from "framer-motion";
import { ChevronRight, BookOpen, GraduationCap } from "lucide-react";
import { useActiveStudent } from "@/store/useAppStore";
import { packStatsFromProgress } from "@/lib/study-plan";
import { WORD_PACK_META, type PackCategory } from "@/lib/wordpacks";

interface WordPackPanelProps {
  /** Open a pack's overview + plan screen (words lazy-load on open). */
  onOpenPack: (packId: string) => void;
}

const GROUPS: Array<{
  category: PackCategory;
  label: string;
  icon: typeof BookOpen;
  gradient: string;
}> = [
  {
    category: "textbook",
    label: "教材同步",
    icon: BookOpen,
    gradient: "from-sky-400 to-violet-500",
  },
  {
    category: "exam",
    label: "考试分级",
    icon: GraduationCap,
    gradient: "from-amber-400 to-orange-500",
  },
];

/**
 * Word-pack picker — bundled textbook / exam vocabulary grouped by kind, with an
 * overall card total and per-pack progress. Progress is computed from the saved
 * forgetting-curve state (by pack id), so no pack's words are loaded until it's
 * opened. Tapping a pack lazy-loads its words and opens the study plan.
 */
export default function WordPackPanel({ onOpenPack }: WordPackPanelProps) {
  const student = useActiveStudent();
  if (!student) return null;

  const all = WORD_PACK_META.map((meta) => ({
    meta,
    stats: packStatsFromProgress(student, meta),
  }));
  const totalCards = all.reduce((n, x) => n + x.stats.total, 0);
  const totalMastered = all.reduce((n, x) => n + x.stats.mastered, 0);
  const totalDue = all.reduce((n, x) => n + x.stats.dueCount, 0);

  let idx = 0; // staggered entrance across all cards

  return (
    <div className="mt-10">
      <h2 className="mb-1 text-center text-xl font-extrabold text-white/90">
        📚 词包 · 背诵计划
      </h2>
      {/* Overall snapshot across all packs */}
      <p className="mb-4 text-center text-sm text-white/50">
        共 <b className="text-white/80">{totalCards}</b> 张卡片 · 已掌握{" "}
        <b className="text-emerald-300">{totalMastered}</b>
        {totalDue > 0 && (
          <>
            {" "}· 今日 <b className="text-amber-300">{totalDue}</b> 待复习
          </>
        )}
      </p>

      {GROUPS.map((group) => {
        const packs = all.filter((x) => x.meta.category === group.category);
        if (packs.length === 0) return null;
        const GroupIcon = group.icon;
        return (
          <div key={group.category} className="mb-5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-white/40">
              <GroupIcon className="h-3.5 w-3.5" /> {group.label}
            </p>
            <div className="space-y-3">
              {packs.map(({ meta, stats }) => (
                <motion.button
                  key={meta.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * idx++ }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOpenPack(meta.id)}
                  className="flex w-full items-center gap-4 rounded-3xl bg-white/10 p-5 text-left ring-2 ring-white/15"
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${group.gradient} text-white shadow`}
                  >
                    <GroupIcon className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-extrabold text-white">
                      {meta.name}
                    </p>
                    <p className="truncate text-xs text-white/50">{meta.subtitle}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500"
                          style={{ width: `${stats.masteredPct}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-xs font-bold text-white/60">
                        掌握 {stats.mastered}/{stats.total}
                      </span>
                    </div>
                    {stats.dueCount > 0 && (
                      <p className="mt-1 text-xs font-bold text-amber-300/90">
                        {stats.dueCount} 个待复习
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-7 w-7 shrink-0 text-white/70" />
                </motion.button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
