import type { VocabularyWord } from "@/lib/types";
import type { LxllWord } from "./types";

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
  return {
    id: `lxll-${w.wordId}`,
    word: w.word.trim(),
    phonetic: w.phonetic.replace(/[\r\n]/g, "").trim(),
    translation: w.translation.trim(),
    sentence_en: "",
    sentence_zh: "",
    category: "nature", // unused for real data; kept for type compatibility
    tier: "intermediate",
    imageUrl: "",
    emoji: "", // none from backend → LearningCard shows a letter tile
    nextReviewTime: new Date(0).toISOString(),
  };
}
