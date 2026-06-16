/**
 * Offline word-pack builder. Reads the raw datasets under data/raw/ (gitignored,
 * see scripts/fetch-word-data.sh) and emits compact, app-ready JSON packs to
 * lib/wordpacks/generated/ - never bundling the full multi-hundred-MB sources.
 *
 * Combination model (docs/word-integration-plan.md):
 *   selection (which words) x enrichment (per-word fields) x ordering (sequence)
 * Enrichment priority: manual override > DictionaryData > ECDICT.
 *
 * Run: npm run build:packs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { PACKS, type PackSpec } from "../data/packs.config";
import { OVERRIDES } from "../data/overrides";

const ROOT = process.cwd();
const RAW = path.join(ROOT, "data/raw");
const OUT = path.join(ROOT, "lib/wordpacks/generated");

/** One compact word as stored in a generated pack. */
interface OutWord {
  word: string;
  phonetic: string;
  translation: string;
  unit?: string;
}

// CSV / format helpers ----------------------------------------------------

/** Streaming CSV reader: handles quoted fields, "" escapes, embedded newlines. */
function* csvRecords(text: string): Generator<string[]> {
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      record.push(field);
      field = "";
    } else if (c === "\n") {
      record.push(field);
      yield record;
      record = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field.length || record.length) {
    record.push(field);
    yield record;
  }
}

// Part-of-speech markers ("n." "adj." "a." "ad." ...) - both leading and inline,
// e.g. "yellowADJ.yellow" or "a. that". \b sits between a Chinese (\W) and latin
// (\w) char, so inline markers split too. They become "/" - a split delimiter.
const POS_MARK =
  /\b(vbl|adj|adv|pron|art|num|prep|conj|aux|interj|int|abbr|vt|vi|pl|ad|n|v|a|u|c)\.\s*/gi;

/** Reduce a messy dictionary gloss to one short, kid-friendly Chinese sense. */
function cleanTranslation(raw: string): string {
  if (!raw) return "";
  let s = raw.split("\\n")[0]; // first sense line (literal backslash-n in data)
  s = s.replace(/\[[^\]]*\]/g, ""); // drop [网络] [军] tags
  s = s.replace(/<[^>]*>/g, ""); // drop <美> <用作宾语> tags
  s = s.replace(POS_MARK, "/"); // POS markers become a split delimiter
  // Split on punctuation OR a run of 2+ spaces (which separates alt senses,
  // often a trailing English proper noun like "电视  Tuvalu").
  const parts = s.split(/[;,/；，]|\s{2,}/).map((x) => x.trim()).filter(Boolean);
  const first = parts[0] ?? "";
  return first.replace(/（[^）]*）|\([^)]*\)/g, "").trim().slice(0, 16);
}

/** Resolved gloss: manual override wins over the dictionary sense. */
function glossFor(key: string, raw: string): string {
  return OVERRIDES[key]?.translation ?? cleanTranslation(raw);
}

/** Resolved phonetic: manual override wins, else the source phonetic. */
function phoneticFor(key: string, fromSource: string): string {
  return OVERRIDES[key]?.phonetic ?? fromSource;
}

/** DictionaryData phonetics come bracketed: "[pensl]" -> "/pensl/". */
function fromBracket(p: string): string {
  const t = (p || "").replace(/[[\]]/g, "").replace(/\r/g, "").trim();
  return t ? `/${t}/` : "";
}

/** ECDICT phonetics are bare: "hood" -> "/hood/". */
function wrapSlash(p: string): string {
  const t = (p || "").replace(/\r/g, "").replace(/^\/+|\/+$/g, "").trim();
  return t ? `/${t}/` : "";
}

function readRaw(rel: string): string {
  const f = path.join(RAW, rel);
  if (!existsSync(f)) {
    throw new Error(
      `Missing raw data: ${rel}\n-> run scripts/fetch-word-data.sh first (see docs/word-integration-plan.md).`,
    );
  }
  return readFileSync(f, "utf8");
}

// DictionaryData loaders (cached across packs) ----------------------------

let _trans: Map<string, string> | null = null;
let _words: Map<string, { word: string; us: string }> | null = null;

/** word(lowercased) -> raw translation, from word_translation.csv (CSV). */
function loadTranslations(): Map<string, string> {
  if (_trans) return _trans;
  const m = new Map<string, string>();
  let first = true;
  for (const rec of csvRecords(readRaw("DictionaryData/word_translation.csv"))) {
    if (first) {
      first = false;
      continue;
    }
    if (rec.length >= 2 && rec[0]) m.set(rec[0].toLowerCase(), rec[1]);
  }
  _trans = m;
  return m;
}

/** vc_id -> {word, us-phonetic}, from word.csv (">"-separated, no quotes). */
function loadWords(): Map<string, { word: string; us: string }> {
  if (_words) return _words;
  const m = new Map<string, { word: string; us: string }>();
  const lines = readRaw("DictionaryData/word.csv").split("\n");
  // vc_id>vc_vocabulary>vc_phonetic_uk>vc_phonetic_us>vc_frequency>...
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split(">");
    if (f.length < 4 || !f[1]) continue;
    m.set(f[0], { word: f[1], us: f[3] });
  }
  _words = m;
  return m;
}

/** Rows of one book from relation_book_word.csv (">"-separated). */
function loadBookRows(
  bookId: string,
): Array<{ vcId: string; unit: string; order: number }> {
  const out: Array<{ vcId: string; unit: string; order: number }> = [];
  const lines = readRaw("DictionaryData/relation_book_word.csv").split("\n");
  // bv_id>bv_book_id>bv_voc_id>bv_flag>bv_tag>bv_order
  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split(">");
    if (f[1] !== bookId) continue;
    out.push({ vcId: f[2], unit: (f[4] || "").trim(), order: Number(f[5]) || 0 });
  }
  return out;
}

const unitNum = (u: string): number => {
  const m = u.match(/(\d+)/);
  return m ? Number(m[1]) : 9999;
};

let _ecdict: Map<string, { trans: string; phon: string }> | null = null;

/** word(lowercased) → raw ECDICT translation+phonetic, for textbook fallback
 *  enrichment (DictionaryData's dictionary misses many common words). */
function loadEcdictMap(): Map<string, { trans: string; phon: string }> {
  if (_ecdict) return _ecdict;
  const m = new Map<string, { trans: string; phon: string }>();
  let first = true;
  for (const rec of csvRecords(readRaw("ecdict/ecdict.csv"))) {
    if (first) {
      first = false;
      continue;
    }
    const w = (rec[0] || "").trim().toLowerCase();
    if (w && !m.has(w)) m.set(w, { trans: rec[3] || "", phon: rec[1] || "" });
  }
  _ecdict = m;
  return m;
}

// Selectors -> enriched, ordered word lists -------------------------------

interface BuildResult {
  words: OutWord[];
  /** Words skipped for lack of a usable gloss (kept for the build report). */
  dropped: string[];
}

function buildTextbook(bookId: string, units?: string[]): BuildResult {
  const rows = loadBookRows(bookId);
  const words = loadWords();
  const trans = loadTranslations();
  const ecdict = loadEcdictMap();
  const filtered = units?.length
    ? rows.filter((r) => units.includes(r.unit))
    : rows;
  filtered.sort((a, b) => unitNum(a.unit) - unitNum(b.unit) || a.order - b.order);

  const out: OutWord[] = [];
  const dropped: string[] = [];
  const seen = new Set<string>();
  for (const r of filtered) {
    const w = words.get(r.vcId);
    const word = w?.word.trim();
    if (!word) {
      dropped.push("(missing word entry)");
      continue;
    }
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    const e = ecdict.get(key);
    // Enrichment chain: override → DictionaryData → ECDICT.
    let translation = OVERRIDES[key]?.translation;
    if (!translation) translation = cleanTranslation(trans.get(key) || "");
    if (!translation && e) translation = cleanTranslation(e.trans);
    if (!translation) {
      dropped.push(word);
      continue;
    }
    let phonetic = OVERRIDES[key]?.phonetic ?? fromBracket(w!.us);
    if (!phonetic && e) phonetic = wrapSlash(e.phon);
    seen.add(key);
    out.push({ word, phonetic, translation, unit: r.unit });
  }
  if (dropped.length)
    console.log(`    (skipped ${dropped.length} words with no usable data)`);
  return { words: out, dropped };
}

function buildGraded(tag: string, cap?: number): BuildResult {
  // word,phonetic,definition,translation,pos,collins,oxford,tag,bnc,frq,...
  type Cand = { word: string; phonetic: string; translation: string; rank: number };
  const cands: Cand[] = [];
  let first = true;
  let dropped = 0;
  for (const rec of csvRecords(readRaw("ecdict/ecdict.csv"))) {
    if (first) {
      first = false;
      continue;
    }
    if (!(rec[7] || "").split(/\s+/).includes(tag)) continue;
    const word = (rec[0] || "").trim();
    if (!word) continue;
    const key = word.toLowerCase();
    const translation = glossFor(key, rec[3] || "");
    if (!translation) {
      dropped++;
      continue;
    }
    const frq = Number(rec[9]) || 0;
    const bnc = Number(rec[8]) || 0;
    // Lower nonzero rank = more frequent; unranked words sink to the end.
    const rank = frq > 0 ? frq : bnc > 0 ? 100_000 + bnc : 1e9;
    cands.push({ word, phonetic: phoneticFor(key, wrapSlash(rec[1])), translation, rank });
  }
  cands.sort((a, b) => a.rank - b.rank);

  const out: OutWord[] = [];
  const seen = new Set<string>();
  for (const c of cands) {
    const key = c.word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ word: c.word, phonetic: c.phonetic, translation: c.translation });
    if (cap && out.length >= cap) break;
  }
  if (dropped) console.log(`    (skipped ${dropped} words with no usable gloss)`);
  return { words: out, dropped: [] };
}

function buildPack(spec: PackSpec): BuildResult {
  if (spec.select.kind === "dictdata-book")
    return buildTextbook(spec.select.bookId, spec.select.units);
  return buildGraded(spec.select.tag, spec.select.cap);
}

// Run ---------------------------------------------------------------------

mkdirSync(OUT, { recursive: true });
const report: string[] = [
  "# 词包构建报告",
  "",
  "> 由 `npm run build:packs` 自动生成。原始数据集见 `scripts/fetch-word-data.sh`。",
  "",
];
/** Lightweight, always-bundled index (no words) → drives the picker + lazy load. */
const manifest: Array<{
  id: string;
  name: string;
  subtitle: string;
  source: string;
  category: string;
  count: number;
}> = [];

const allDropped: string[] = [];

for (const spec of PACKS) {
  console.log(`Building ${spec.id} (${spec.name})...`);
  const { words, dropped } = buildPack(spec);
  const pack = {
    id: spec.id,
    name: spec.name,
    subtitle: spec.subtitle,
    source: spec.source,
    words,
  };
  writeFileSync(path.join(OUT, `${spec.id}.json`), JSON.stringify(pack, null, 1));
  manifest.push({
    id: spec.id,
    name: spec.name,
    subtitle: spec.subtitle,
    source: spec.source,
    category: spec.category,
    count: words.length,
  });
  console.log(`  -> ${words.length} words -> lib/wordpacks/generated/${spec.id}.json`);
  const dropNote = dropped.length ? ` · 跳过 ${dropped.length}` : "";
  report.push(`- **${spec.name}** \`${spec.id}\` - ${words.length} 词${dropNote} · ${spec.source}`);
  if (dropped.length) {
    report.push(`  - 跳过(无可用释义,可在 data/overrides.ts 补回): ${dropped.join(" / ")}`);
    allDropped.push(...dropped);
  }
}

if (allDropped.length) {
  console.log(
    `\n${allDropped.length} words skipped overall — listed in data/build-report.md (add to data/overrides.ts to recover).`,
  );
}

// Manifest sits OUTSIDE generated/ so the lazy `import('./generated/<id>.json')`
// context covers word packs only.
writeFileSync(
  path.join(ROOT, "lib/wordpacks/manifest.json"),
  JSON.stringify(manifest, null, 1) + "\n",
);
writeFileSync(path.join(ROOT, "data/build-report.md"), report.join("\n") + "\n");
console.log("Done. Wrote lib/wordpacks/manifest.json + generated/*.json");
