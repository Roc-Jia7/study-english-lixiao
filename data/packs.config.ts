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
  /** Grouping in the pack-picker UI. */
  category: "textbook" | "exam";
}

export const PACKS: PackSpec[] = [
  // Textbook track — DictionaryData, 人教版三年级起点三年级上 (64 words, Units 1–6).
  {
    id: "pep-3a",
    name: "人教版 三年级上 · 全册",
    subtitle: "PEP Grade 3A · Units 1–6",
    source: "DictionaryData (Apache-2.0) · 人教版三年级起点三年级上",
    select: { kind: "dictdata-book", bookId: "34173cb38f07f89ddbebc2ac" },
    order: "unit",
    category: "textbook",
  },
  // Graded track — ECDICT tag=zk (中考), top by corpus frequency.
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
