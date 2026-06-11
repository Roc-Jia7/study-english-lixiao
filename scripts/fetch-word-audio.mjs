#!/usr/bin/env node
/**
 * Downloads real human pronunciations for every vocabulary word into
 * public/audio/words/<id>.mp3, using the free dictionaryapi.dev API
 * (audio sourced from Wiktionary recordings).
 *
 * Words without a downloadable recording simply fall back to Web Speech
 * synthesis at runtime (see lib/audio.ts) — running this script is an
 * enhancement, never a requirement.
 *
 * Usage: npm run fetch-audio
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Keep in sync with lib/vocabulary.ts (word id === word text there).
const WORDS = [
  "cat", "dog", "fish", "bird", "rabbit", "panda",
  "apple", "banana", "milk", "egg", "bread", "cake",
  "red", "blue", "yellow", "green", "pink", "purple",
  "sun", "moon", "star", "tree", "rain", "flower",
];

const OUT_DIR = path.join(process.cwd(), "public", "audio", "words");
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function findAudioUrl(word) {
  const res = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
  );
  if (!res.ok) return null;
  const entries = await res.json();
  const phonetics = entries.flatMap((e) => e.phonetics ?? []);
  const withAudio = phonetics.filter((p) => p.audio);
  // Prefer the US recording to match the app's en-US speech fallback.
  const us = withAudio.find((p) => p.audio.includes("-us."));
  return (us ?? withAudio[0])?.audio ?? null;
}

async function download(word) {
  const url = await findAudioUrl(word);
  if (!url) return false;
  const res = await fetch(url);
  if (!res.ok) return false;
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(path.join(OUT_DIR, `${word}.mp3`), buffer);
  return true;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let ok = 0;
  const missed = [];

  for (const word of WORDS) {
    try {
      if (await download(word)) {
        ok++;
        console.log(`  ✓ ${word}`);
      } else {
        missed.push(word);
        console.log(`  ✗ ${word} (no recording found)`);
      }
    } catch (err) {
      missed.push(word);
      console.log(`  ✗ ${word} (${err.message})`);
    }
    await delay(400); // be polite to the free API
  }

  console.log(`\nDone: ${ok}/${WORDS.length} recordings saved to ${OUT_DIR}`);
  if (missed.length > 0) {
    console.log(`Missing (will use Web Speech fallback): ${missed.join(", ")}`);
  }
}

main();
