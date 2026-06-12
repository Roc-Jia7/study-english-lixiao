import type { VocabularyWord } from "@/lib/types";
import type { LxllWord } from "./types";

/**
 * Real human pronunciation MP3, hosted on lxll's resource CDN as
 * `/word/<lowercase first letter>/<word>.mp3` (the word keeps its original
 * case, e.g. `Italy.mp3`). No Referer gating; plays cross-origin directly.
 */
export function lxllWordAudioUrl(word: string): string | undefined {
  const w = word.trim();
  const first = w.charAt(0).toLowerCase();
  if (!/[a-z]/.test(first)) return undefined;
  return `https://resource.lxll.com/word/${first}/${encodeURIComponent(w)}.mp3`;
}

/** Real English+Chinese recording: `/word/<first>/<word><translation>.mp3`. */
export function lxllWordBilingualUrl(
  word: string,
  translation: string,
): string | undefined {
  const w = word.trim();
  const first = w.charAt(0).toLowerCase();
  if (!/[a-z]/.test(first)) return undefined;
  return `https://resource.lxll.com/word/${first}/${encodeURIComponent(
    w + translation.trim(),
  )}.mp3`;
}

/**
 * Map a backend word onto the app's VocabularyWord so the existing game UI
 * (cards, pet, confetti, TTS) can render it.
 *
 * The backend gives `word`, `translation`, `phonetic` only — no example
 * sentence, illustration, or category. The card degrades gracefully:
 * empty `emoji` → a first-letter tile, empty `sentence_en` → the sentence
 * block is hidden (see LearningCard). Audio falls back to Web Speech, since
 * the pre-downloaded mp3s only cover the demo words.
 */
export function lxllWordToVocabulary(w: LxllWord): VocabularyWord {
  const word = w.word.trim();
  return {
    id: `lxll-${w.wordId}`,
    word,
    phonetic: w.phonetic.replace(/[\r\n]/g, "").trim(),
    translation: w.translation.trim(),
    sentence_en: "",
    sentence_zh: "",
    category: "nature", // unused for real data; kept for type compatibility
    tier: "intermediate",
    imageUrl: "",
    audioUrl: lxllWordAudioUrl(word), // real human pronunciation
    audioUrlBilingual: lxllWordBilingualUrl(word, w.translation),
    emoji: "", // none from backend → LearningCard shows a letter tile
    nextReviewTime: new Date(0).toISOString(),
  };
}
