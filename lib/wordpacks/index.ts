import type { VocabularyWord } from "../types";
import manifest from "./manifest.json";

/**
 * Bundled word packs, GENERATED offline by scripts/build-packs.ts from ECDICT
 * (MIT) / DictionaryData (Apache-2.0). Only the lightweight manifest (no words)
 * is bundled eagerly; each pack's words are lazy-loaded on demand so the initial
 * bundle stays small. See docs/word-integration-plan.md. To change a pack, edit
 * data/packs.config.ts or data/overrides.ts and run `npm run build:packs`.
 */

/** Pack category — drives grouping in the picker UI. */
export type PackCategory = "textbook" | "exam";

/** Lightweight, always-bundled pack descriptor (no words). */
export interface WordPackMeta {
  id: string;
  name: string;
  subtitle: string;
  source: string;
  category: PackCategory;
  /** Total word count (for progress totals without loading the words). */
  count: number;
}

/** A fully-loaded pack: metadata + expanded words. */
export interface WordPack extends WordPackMeta {
  words: VocabularyWord[];
}

export const WORD_PACK_META = manifest as WordPackMeta[];

/** Compact word shape as stored in generated/*.json. */
interface RawWord {
  word: string;
  phonetic: string;
  translation: string;
  unit?: string;
}
interface RawPack {
  words: RawWord[];
}

const slug = (w: string) => w.toLowerCase().replace(/\s+/g, "-");

/**
 * Expand a compact generated word into a full VocabularyWord (backend-style:
 * no emoji/sentence, Web Speech audio, forgetting-curve id `pack-<packId>-<word>`).
 */
function toVocab(packId: string, r: RawWord): VocabularyWord {
  return {
    id: `pack-${packId}-${slug(r.word)}`,
    word: r.word,
    phonetic: r.phonetic,
    translation: r.translation,
    sentence_en: "",
    sentence_zh: "",
    category: "nature",
    tier: "beginner",
    imageUrl: "",
    emoji: "",
    nextReviewTime: "",
  };
}

/** Lazy-load one pack's words (its own chunk — not in the initial bundle). */
export async function loadPackWords(id: string): Promise<VocabularyWord[]> {
  const mod = await import(`./generated/${id}.json`);
  const raw = (mod.default ?? mod) as RawPack;
  return raw.words.map((w) => toVocab(id, w));
}

/** Lazy-load a full pack (metadata + words); null if the id is unknown. */
export async function loadPack(id: string): Promise<WordPack | null> {
  const meta = WORD_PACK_META.find((m) => m.id === id);
  if (!meta) return null;
  return { ...meta, words: await loadPackWords(id) };
}
