/**
 * The "Anti-Forgetting" pet: every answered word feeds the egg,
 * and XP milestones hatch and evolve it. This is the child-facing
 * face of the spaced-repetition engine.
 */

export interface PetStage {
  minXp: number;
  name: string;
  nameZh: string;
  emoji: string;
  hint: string;
}

export const PET_STAGES: PetStage[] = [
  {
    minXp: 0,
    name: "Mystery Egg",
    nameZh: "神秘蛋",
    emoji: "🥚",
    hint: "Learn words to warm the egg!",
  },
  {
    minXp: 60,
    name: "Hatchling",
    nameZh: "破壳宝宝",
    emoji: "🐣",
    hint: "Keep feeding me words!",
  },
  {
    minXp: 150,
    name: "Baby Dragon",
    nameZh: "龙宝宝",
    emoji: "🐲",
    hint: "Yum! Words make me grow!",
  },
  {
    minXp: 320,
    name: "Star Dragon",
    nameZh: "星辰巨龙",
    emoji: "🐉",
    hint: "We rule the word galaxy!",
  },
];

export const XP_PER_KNOWN = 10;
export const XP_PER_TRY = 4; // "Oops" still earns a little — effort counts
export const XP_BATCH_BONUS = 20;

/** Daily energy goal: answers per day to fill the navbar energy bar. */
export const DAILY_ENERGY_GOAL = 10;

export function getPetStageIndex(xp: number): number {
  let index = 0;
  for (let i = 0; i < PET_STAGES.length; i++) {
    if (xp >= PET_STAGES[i].minXp) index = i;
  }
  return index;
}

export function getPetStage(xp: number): PetStage {
  return PET_STAGES[getPetStageIndex(xp)];
}

/** 0..1 progress toward the next evolution (1 when fully evolved). */
export function getPetProgress(xp: number): number {
  const index = getPetStageIndex(xp);
  if (index >= PET_STAGES.length - 1) return 1;
  const current = PET_STAGES[index].minXp;
  const next = PET_STAGES[index + 1].minXp;
  return Math.min(1, (xp - current) / (next - current));
}
