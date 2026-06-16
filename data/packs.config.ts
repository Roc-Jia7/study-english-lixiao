/**
 * Declarative word-pack manifest — the only file you edit to add a pack.
 * Consumed by scripts/build-packs.ts, which reads the raw datasets under
 * data/raw/ (gitignored) and emits compact JSON to lib/wordpacks/generated/.
 * See docs/word-integration-plan.md for the selection × enrichment × ordering
 * model these specs drive.
 */

export type Selector =
  /** Words of one DictionaryData textbook (optionally limited to some units). */
  | { kind: "dictdata-book"; bookId: string; units?: string[] }
  /** Words carrying an ECDICT grade tag (zk/gk/cet4/cet6/ky/toefl/ielts/gre). */
  | { kind: "ecdict-tag"; tag: string; cap?: number };

/** Picker grouping — by 学段, plus a graded-exam bucket. */
export type PackCategory = "primary" | "middle" | "high" | "exam";

export interface PackSpec {
  id: string;
  /** Chinese display name. */
  name: string;
  /** English / source line shown under the name. */
  subtitle: string;
  /** Attribution note (license + origin), surfaced on the credits page. */
  source: string;
  select: Selector;
  /** unit = keep textbook order; frequency = most-common words first. */
  order: "unit" | "frequency";
  category: PackCategory;
}

/** Helper for the 人教版三年级起点 primary series (DictionaryData, Apache-2.0). */
function pep(
  id: string,
  grade: string,
  en: string,
  bookId: string,
): PackSpec {
  return {
    id,
    name: `人教版 ${grade}`,
    subtitle: `PEP ${en} · 人教三起`,
    source: `DictionaryData (Apache-2.0) · 人教版三年级起点${grade}册`,
    select: { kind: "dictdata-book", bookId },
    order: "unit",
    category: "primary",
  };
}

/** Helper for the 沪教版牛津英语 middle-school series (DictionaryData). */
function hj(id: string, grade: string, en: string, bookId: string): PackSpec {
  return {
    id,
    name: `沪教牛津 ${grade}`,
    subtitle: `Shanghai Oxford ${en} · 沪教版`,
    source: `DictionaryData (Apache-2.0) · 沪教版牛津英语${grade}册`,
    select: { kind: "dictdata-book", bookId },
    order: "unit",
    category: "middle",
  };
}

export const PACKS: PackSpec[] = [
  // 小学 — 人教版三年级起点 full primary series (三上 → 六下).
  pep("pep-3a", "三年级上", "Grade 3A", "34173cb38f07f89ddbebc2ac"),
  pep("pep-3b", "三年级下", "Grade 3B", "c16a5320fa475530d9583c34"),
  pep("pep-4a", "四年级上", "Grade 4A", "6364d3f0f495b6ab9dcf8d3b"),
  pep("pep-4b", "四年级下", "Grade 4B", "149e9677a5989fd342ae4421"),
  pep("pep-5a", "五年级上", "Grade 5A", "a4a042cf4fd6bfb47701cbc8"),
  pep("pep-5b", "五年级下", "Grade 5B", "f7e6c85504ce6e82442c770f"),
  pep("pep-6a", "六年级上", "Grade 6A", "bf8229696f7a3bb4700cfdde"),
  pep("pep-6b", "六年级下", "Grade 6B", "82161242827b703e6acf9c72"),

  // 初中 — 沪教版牛津英语 full middle series (七上 → 九下).
  hj("hj-7a", "七年级上", "Grade 7A", "58b2991c85ec50446c2ec5ba"),
  hj("hj-7b", "七年级下", "Grade 7B", "58b29c2d85ec50446c2ec6b0"),
  hj("hj-8a", "八年级上", "Grade 8A", "58b29ef285ec50446c2ec996"),
  hj("hj-8b", "八年级下", "Grade 8B", "58b2a07285ec50446c2eca90"),
  hj("hj-9a", "九年级上", "Grade 9A", "58b2a18a85ec50446c2ecba2"),
  hj("hj-9b", "九年级下", "Grade 9B", "58b2a32f85ec50446c2eccb7"),

  // 考试分级 — ECDICT tag=zk (中考), top by corpus frequency.
  {
    id: "zhongkao-core",
    name: "中考核心词 · 高频",
    subtitle: "Zhongkao core · top 600 by frequency",
    source: "ECDICT (MIT) · tag=zk(中考)",
    select: { kind: "ecdict-tag", tag: "zk", cap: 600 },
    order: "frequency",
    category: "exam",
  },
];
