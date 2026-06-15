#!/usr/bin/env bash
# Download the raw word datasets used by scripts/build-packs.ts into data/raw/.
# These are large (ECDICT ~66MB, DictionaryData relation ~111MB unzipped) and
# are .gitignored — only the trimmed generated packs are committed.
# See docs/word-integration-plan.md.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RAW="$ROOT/data/raw"
mkdir -p "$RAW/ecdict" "$RAW/DictionaryData"

echo "▸ ECDICT (MIT) — full graded dictionary (~66MB)"
curl -fSL --retry 3 -o "$RAW/ecdict/ecdict.csv" \
  "https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv"

echo "▸ DictionaryData (Apache-2.0) — textbook word lists"
base="https://raw.githubusercontent.com/LinXueyuanStdio/DictionaryData/master"
for f in book.csv word.csv word_translation.csv relation_book_word.zip; do
  curl -fSL --retry 3 -o "$RAW/DictionaryData/$f" "$base/$f"
done
( cd "$RAW/DictionaryData" && unzip -o relation_book_word.zip >/dev/null )

echo "✓ raw data ready in data/raw/. Now run: npm run build:packs"
