import { describe, expect, it } from "vitest";
import { CATEGORY_META, VOCABULARY, WORD_BY_ID } from "../vocabulary";

/**
 * Data-integrity contract for the word list. Several components depend on
 * these invariants silently — a bad entry would only surface as a broken
 * card in front of a child, so we pin them here instead.
 */
describe("vocabulary data", () => {
  it("has unique ids and a complete lookup table", () => {
    const ids = VOCABULARY.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(WORD_BY_ID[id]).toBeDefined();
    }
  });

  it("every sentence contains its focus word (HighlightedSentence depends on it)", () => {
    for (const w of VOCABULARY) {
      expect(
        w.sentence_en.toLowerCase(),
        `"${w.sentence_en}" must contain "${w.word}"`,
      ).toContain(w.word.toLowerCase());
    }
  });

  it("keeps sentences short and child-sized", () => {
    for (const w of VOCABULARY) {
      const wordCount = w.sentence_en.trim().split(/\s+/).length;
      expect(wordCount, `"${w.sentence_en}" is too long`).toBeLessThanOrEqual(8);
    }
  });

  it("every word has the fields the card renders", () => {
    for (const w of VOCABULARY) {
      expect(w.emoji.length).toBeGreaterThan(0);
      expect(w.phonetic).toMatch(/^\/.+\/$/);
      expect(w.translation.length).toBeGreaterThan(0);
      expect(w.sentence_zh.length).toBeGreaterThan(0);
    }
  });

  it("every category has metadata and enough same-category quiz distractors", () => {
    for (const w of VOCABULARY) {
      expect(CATEGORY_META[w.category]).toBeDefined();
      const peers = VOCABULARY.filter(
        (o) => o.category === w.category && o.id !== w.id,
      );
      // pickQuizOptions prefers same-category distractors; 3 peers means
      // a full same-category quiz is always possible.
      expect(peers.length, `${w.category} needs more words`).toBeGreaterThanOrEqual(3);
    }
  });

  it("word ids match the audio filename convention (scripts/fetch-word-audio.mjs)", () => {
    for (const w of VOCABULARY) {
      expect(w.id).toMatch(/^[a-z]+$/);
      expect(w.id).toBe(w.word.toLowerCase());
    }
  });
});
