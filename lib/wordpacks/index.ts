import type { VocabularyWord } from "../types";
import pep3a from "./generated/pep-3a.json";
import zhongkao from "./generated/zhongkao-core.json";

/**
 * Bundled word packs. The word data is GENERATED offline by
 * scripts/build-packs.ts from ECDICT (MIT) / DictionaryData (Apache-2.0) into
 * ./generated/*.json — never hand-edited here. See docs/word-integration-plan.md.
 * To change membership/data, edit data/packs.config.ts or data/overrides.ts and
 * re-run `npm run build:packs`.
 */
export interface WordPack {
  id: string;
  /** Chinese display name. */
  name: string;
  /** English / source line shown under the name. */
  subtitle: string;
  /** Attribution note (license + origin), surfaced on the credits page. */
  source: string;
  words: VocabularyWord[];
}

/** Compact word shape as stored in generated/*.json. */
interface RawWord {
  word: string;
  phonetic: string;
  translation: string;
  unit?: string;
}
interface RawPack {
  id: string;
  name: string;
  subtitle: string;
  source: string;
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

function load(raw: RawPack): WordPack {
  return {
    id: raw.id,
    name: raw.name,
    subtitle: raw.subtitle,
    source: raw.source,
    words: raw.words.map((w) => toVocab(raw.id, w)),
  };
}

export const WORD_PACKS: WordPack[] = [
  load(pep3a as unknown as RawPack),
  load(zhongkao as unknown as RawPack),
];
