import type { SessionMode, VocabularyWord } from "./types";
import { VOCABULARY } from "./vocabulary";

/**
 * Session deck builder. Self-assessment alone is unreliable for young kids
 * (and easy to game for XP), so after every few study cards we deal a
 * verification quiz — hear-and-pick or see-and-pick. Failing a quiz is the
 * honest signal that actually drops a word back down the forgetting curve.
 */

export type SessionCardKind = "study" | "quiz-listen" | "quiz-picture";

export interface SessionCard {
  /** Unique per card instance, so retries never collide in React keys. */
  key: string;
  kind: SessionCardKind;
  word: VocabularyWord;
}

/** Deal a verification quiz after every N study cards. */
const QUIZ_EVERY = 3;

/** A comfortable number of words to study before a celebratory breather. */
export const GROUP_TARGET = 7;

/**
 * Split a slot's words into evenly-sized small groups (~GROUP_TARGET each) so a
 * 20-word review becomes a few bite-size rounds with a celebration between
 * them — never a single intimidating pile. Sizes stay balanced (no lonely
 * 1-word last group). Returns a single group when the slot is already small.
 */
export function balancedChunk<T>(items: T[], target = GROUP_TARGET): T[][] {
  if (items.length <= target) return [items];
  const groupCount = Math.ceil(items.length / target);
  const size = Math.ceil(items.length / groupCount);
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomQuizKind(): SessionCardKind {
  return Math.random() < 0.5 ? "quiz-listen" : "quiz-picture";
}

export function buildSessionQueue(
  words: VocabularyWord[],
  mode: SessionMode,
  withQuiz = true,
): SessionCard[] {
  const queue: SessionCard[] = [];
  let quizzes = 0;

  words.forEach((word, i) => {
    queue.push({ key: `study-${word.id}`, kind: "study", word });

    // Quizzes need a picture (emoji); backend words have none yet.
    if (!withQuiz) return;

    const groupDone = (i + 1) % QUIZ_EVERY === 0;
    const isLast = i === words.length - 1;
    if (groupDone || (isLast && quizzes === 0)) {
      // Quiz a word studied earlier — preferring not the one the child
      // literally just saw, so the quiz tests memory, not echo.
      const pool =
        mode === "review"
          ? words.slice(0, i + 1)
          : words.slice(Math.max(0, i + 1 - QUIZ_EVERY), i + 1);
      const candidates =
        pool.length > 1 ? pool.filter((w) => w.id !== word.id) : pool;
      const target = candidates[Math.floor(Math.random() * candidates.length)];
      queue.push({
        key: `quiz-${target.id}-${quizzes++}`,
        kind: randomQuizKind(),
        word: target,
      });
    }
  });

  return queue;
}

/**
 * The 4 quiz choices: the answer plus 3 distractors, same-category first
 * (telling a cat from a dog is the discrimination that matters).
 */
export function pickQuizOptions(word: VocabularyWord): VocabularyWord[] {
  const sameCategory = VOCABULARY.filter(
    (w) => w.category === word.category && w.id !== word.id,
  );
  const others = VOCABULARY.filter(
    (w) => w.category !== word.category && w.id !== word.id,
  );
  const distractors = [...shuffle(sameCategory), ...shuffle(others)].slice(0, 3);
  return shuffle([word, ...distractors]);
}
