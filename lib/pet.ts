/**
 * The "Anti-Forgetting" pet: every answered word feeds the egg,
 * and XP milestones hatch and evolve it. This is the child-facing
 * face of the spaced-repetition engine. More, closer-spaced stages keep
 * young learners chasing the next evolution.
 */

export interface PetStage {
  minXp: number;
  name: string;
  nameZh: string;
  emoji: string;
  hint: string;
  /** Tailwind gradient for this stage's glow aura (themes the halo). */
  aura: string;
}

export const PET_STAGES: PetStage[] = [
  {
    minXp: 0,
    name: "Mystery Egg",
    nameZh: "神秘蛋",
    emoji: "🥚",
    hint: "Learn words to warm the egg!",
    aura: "from-amber-300/50 to-yellow-200/5",
  },
  {
    minXp: 40,
    name: "Hatchling",
    nameZh: "破壳宝宝",
    emoji: "🐣",
    hint: "Keep feeding me words!",
    aura: "from-lime-300/50 to-emerald-200/5",
  },
  {
    minXp: 100,
    name: "Fuzzball",
    nameZh: "绒绒宝宝",
    emoji: "🐥",
    hint: "Cheep! More words please!",
    aura: "from-sky-300/50 to-cyan-200/5",
  },
  {
    minXp: 190,
    name: "Baby Dragon",
    nameZh: "龙宝宝",
    emoji: "🐲",
    hint: "Yum! Words make me grow!",
    aura: "from-violet-400/50 to-fuchsia-300/5",
  },
  {
    minXp: 310,
    name: "Dino Buddy",
    nameZh: "小恐龙",
    emoji: "🦖",
    hint: "Rawr! I'm getting strong!",
    aura: "from-emerald-400/50 to-teal-300/5",
  },
  {
    minXp: 470,
    name: "Sky Dragon",
    nameZh: "飞天巨龙",
    emoji: "🐉",
    hint: "We soar over the word galaxy!",
    aura: "from-orange-400/50 to-rose-300/5",
  },
  {
    minXp: 680,
    name: "Star Unicorn",
    nameZh: "星光神兽",
    emoji: "🦄",
    hint: "Legendary! You did this!",
    aura: "from-fuchsia-400/50 to-indigo-300/5",
  },
];

export const XP_PER_KNOWN = 10;
export const XP_PER_TRY = 4; // "Oops" still earns a little — effort counts
export const XP_BATCH_BONUS = 20;

/** Daily energy goal: answers per day to fill the navbar energy bar. */
export const DAILY_ENERGY_GOAL = 10;

/** Playful lines the pet says when the child pokes it. */
export const PET_TAP_PHRASES = [
  "嗨！",
  "嘿嘿，好痒～",
  "再喂我一个单词吧！",
  "我们一起加油！",
  "你最棒啦！",
  "抱抱！🤗",
  "我爱学单词！",
  "我会变得更强哦！",
];

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

/** The stage the pet is growing toward, or null once fully evolved. */
export function getNextStage(xp: number): PetStage | null {
  const index = getPetStageIndex(xp);
  return index < PET_STAGES.length - 1 ? PET_STAGES[index + 1] : null;
}

/** 0..1 progress toward the next evolution (1 when fully evolved). */
export function getPetProgress(xp: number): number {
  const index = getPetStageIndex(xp);
  if (index >= PET_STAGES.length - 1) return 1;
  const current = PET_STAGES[index].minXp;
  const next = PET_STAGES[index + 1].minXp;
  return Math.min(1, (xp - current) / (next - current));
}
