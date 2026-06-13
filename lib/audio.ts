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

interface PlayHooks {
  onEnd?: () => void;
  onError?: () => void;
  /** Fired when real audio actually starts playing. */
  onPlay?: () => void;
}

/** Play one recording; reports start/end/failure via hooks. */
function playUrl(src: string, hooks: PlayHooks = {}) {
  const audio = getAudio(src);
  audio.onended = hooks.onEnd ? () => hooks.onEnd!() : null;
  audio.onplaying = hooks.onPlay ? () => hooks.onPlay!() : null;
  audio.currentTime = 0;
  audio.play().catch(() => {
    missing.add(src);
    hooks.onError?.();
  });
}

/** Lets the UI show a spinner while loading and a hint on speech fallback. */
export interface WordAudioHooks {
  /** Trying a real recording (may take a moment on weak networks). */
  onLoading?: () => void;
  /** Real recording is now playing. */
  onPlaying?: () => void;
  /** Couldn't load the recording — synthesized speech is used instead. */
  onFallback?: () => void;
}

export function playWordAudio(
  wordId: string,
  fallbackText: string,
  audioUrl?: string,
  hooks?: WordAudioHooks,
) {
  if (typeof window === "undefined") return;
  stopSpeaking();
  const src = audioUrl ?? `/audio/words/${wordId}.mp3`;
  if (missing.has(src)) {
    speakWord(fallbackText);
    hooks?.onFallback?.();
    return;
  }
  hooks?.onLoading?.();
  playUrl(src, {
    onPlay: hooks?.onPlaying,
    onError: () => {
      speakWord(fallbackText);
      hooks?.onFallback?.();
    },
  });
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
    playUrl(bilingualUrl, {
      onError: () => englishThenChinese(wordId, word, translation, audioUrl),
    });
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
  playUrl(src, {
    onEnd: sayZh,
    onError: () => {
      speakWord(word);
      window.setTimeout(sayZh, 900);
    },
  });
}
