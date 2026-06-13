import { describe, expect, it } from "vitest";
import {
  GROUP_TARGET,
  balancedChunk,
  buildSessionQueue,
  pickQuizOptions,
} from "../session";
import { VOCABULARY } from "../vocabulary";

const words = (...ids: string[]) =>
  ids.map((id) => {
    const w = VOCABULARY.find((v) => v.id === id);
    if (!w) throw new Error(`fixture word missing: ${id}`);
    return w;
  });

const SIX = words("cat", "dog", "fish", "apple", "banana", "milk");

describe("buildSessionQueue", () => {
  it("deals a quiz after every 3rd study card", () => {
    const queue = buildSessionQueue(SIX, "discovery");
    const kinds = queue.map((c) => (c.kind === "study" ? "S" : "Q"));
    expect(kinds).toEqual(["S", "S", "S", "Q", "S", "S", "S", "Q"]);
  });

  it("keeps study cards in the original word order", () => {
    const queue = buildSessionQueue(SIX, "discovery");
    const studied = queue.filter((c) => c.kind === "study").map((c) => c.word.id);
    expect(studied).toEqual(SIX.map((w) => w.id));
  });

  it("never quizzes the word the child literally just saw", () => {
    // Random target selection — assert the invariant across many deals.
    for (let i = 0; i < 50; i++) {
      const queue = buildSessionQueue(SIX, "discovery");
      queue.forEach((card, idx) => {
        if (card.kind === "study") return;
        expect(card.word.id).not.toBe(queue[idx - 1].word.id);
      });
    }
  });

  it("only quizzes words already studied at that point in the deck", () => {
    for (let i = 0; i < 50; i++) {
      const queue = buildSessionQueue(SIX, "review");
      const seen = new Set<string>();
      for (const card of queue) {
        if (card.kind === "study") seen.add(card.word.id);
        else expect(seen.has(card.word.id)).toBe(true);
      }
    }
  });

  it("guarantees at least one quiz even for a tiny deck", () => {
    const queue = buildSessionQueue(words("cat", "dog"), "discovery");
    expect(queue.filter((c) => c.kind !== "study")).toHaveLength(1);
  });

  it("handles a single-word deck by quizzing that word", () => {
    const queue = buildSessionQueue(words("cat"), "review");
    expect(queue).toHaveLength(2);
    expect(queue[1].kind).not.toBe("study");
    expect(queue[1].word.id).toBe("cat");
  });

  it("gives every card a unique React key", () => {
    const queue = buildSessionQueue(SIX, "discovery");
    const keys = queue.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("balancedChunk", () => {
  const range = (n: number) => Array.from({ length: n }, (_, i) => i);

  it("keeps a small slot as a single group", () => {
    expect(balancedChunk(range(7))).toEqual([range(7)]);
    expect(balancedChunk(range(3))).toHaveLength(1);
  });

  it("splits a 20-item slot into balanced groups (7,7,6)", () => {
    const groups = balancedChunk(range(20));
    expect(groups.map((g) => g.length)).toEqual([7, 7, 6]);
  });

  it("avoids a lonely tiny last group", () => {
    // 8 → two groups of 4, never 7 + 1.
    expect(balancedChunk(range(8)).map((g) => g.length)).toEqual([4, 4]);
  });

  it("preserves order and loses no items", () => {
    const groups = balancedChunk(range(15));
    expect(groups.flat()).toEqual(range(15));
    expect(groups.every((g) => g.length <= GROUP_TARGET)).toBe(true);
  });
});

describe("pickQuizOptions", () => {
  const cat = words("cat")[0];

  it("returns 4 unique options including the answer", () => {
    for (let i = 0; i < 50; i++) {
      const options = pickQuizOptions(cat);
      expect(options).toHaveLength(4);
      expect(new Set(options.map((o) => o.id)).size).toBe(4);
      expect(options.some((o) => o.id === "cat")).toBe(true);
    }
  });

  it("prefers same-category distractors when enough exist", () => {
    // Vocabulary has 5 other animals, so all 3 distractors must be animals.
    const options = pickQuizOptions(cat);
    const distractors = options.filter((o) => o.id !== "cat");
    expect(distractors.every((o) => o.category === "animals")).toBe(true);
  });

  it("shuffles the answer position", () => {
    const positions = new Set<number>();
    for (let i = 0; i < 80; i++) {
      positions.add(pickQuizOptions(cat).findIndex((o) => o.id === "cat"));
    }
    expect(positions.size).toBeGreaterThan(1);
  });
});
