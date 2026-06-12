import { speakWord, speakChinese, stopSpeaking } from "./speech";

/**
 * Word pronunciation player. Prefers a real recording — an explicit URL
 * (lxll's resource CDN for backend words) or the bundled demo mp3 at
 * /public/audio/words/<id>.mp3 — and falls back to Web Speech synthesis when
 * none is reachable, so the app sounds natural yet always speaks.
 */

const cache = new Map<string, HTMLAudioElement>();
const missing = new Set<string>();

function getAudio(src: string): HTMLAudioElement {
  let audio = cache.get(src);
  if (!audio) {
    audio = new Audio(src);
    audio.preload = "auto";
    cache.set(src, audio);
  }
  return audio;
}

/** Play one recording; on success calls onEnd, on failure calls onError. */
function playUrl(src: string, onEnd?: () => void, onError?: () => void) {
  const audio = getAudio(src);
  audio.onended = onEnd ? () => onEnd() : null;
  audio.currentTime = 0;
  audio.play().catch(() => {
    missing.add(src);
    onError?.();
  });
}

export function playWordAudio(
  wordId: string,
  fallbackText: string,
  audioUrl?: string,
) {
  if (typeof window === "undefined") return;
  stopSpeaking();
  const src = audioUrl ?? `/audio/words/${wordId}.mp3`;
  if (missing.has(src)) {
    speakWord(fallbackText);
    return;
  }
  playUrl(src, undefined, () => speakWord(fallbackText));
}

export interface BilingualAudio {
  wordId: string;
  word: string;
  translation: string;
  /** English-only real recording. */
  audioUrl?: string;
  /** English+Chinese real recording (preferred when present). */
  bilingualUrl?: string;
}

/**
 * Bilingual playback: one real English+Chinese recording when available,
 * otherwise the English word followed by the Chinese meaning (spoken).
 */
export function playBilingual({
  wordId,
  word,
  translation,
  audioUrl,
  bilingualUrl,
}: BilingualAudio) {
  if (typeof window === "undefined") return;
  stopSpeaking();

  if (bilingualUrl && !missing.has(bilingualUrl)) {
    playUrl(bilingualUrl, undefined, () =>
      englishThenChinese(wordId, word, translation, audioUrl),
    );
    return;
  }
  englishThenChinese(wordId, word, translation, audioUrl);
}

function englishThenChinese(
  wordId: string,
  word: string,
  translation: string,
  audioUrl?: string,
) {
  const src = audioUrl ?? `/audio/words/${wordId}.mp3`;
  const sayZh = () => speakChinese(translation);
  if (missing.has(src)) {
    // No English recording — speak the word, then the meaning.
    speakWord(word);
    window.setTimeout(sayZh, 900);
    return;
  }
  playUrl(src, sayZh, () => {
    speakWord(word);
    window.setTimeout(sayZh, 900);
  });
}
