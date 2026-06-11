import { speakWord, stopSpeaking } from "./speech";

/**
 * Word pronunciation player. Prefers pre-generated human recordings in
 * /public/audio/words/<id>.mp3 (see scripts/fetch-word-audio.mjs) and falls
 * back to Web Speech synthesis when a recording is missing — so the app
 * sounds natural where files exist and still always speaks.
 */

const cache = new Map<string, HTMLAudioElement>();
const missing = new Set<string>();

export function playWordAudio(wordId: string, fallbackText: string) {
  if (typeof window === "undefined") return;
  stopSpeaking();

  if (missing.has(wordId)) {
    speakWord(fallbackText);
    return;
  }

  let audio = cache.get(wordId);
  if (!audio) {
    audio = new Audio(`/audio/words/${wordId}.mp3`);
    audio.preload = "auto";
    cache.set(wordId, audio);
  }

  audio.currentTime = 0;
  audio.play().catch(() => {
    // 404 / unsupported — remember and don't retry the network every tap.
    missing.add(wordId);
    speakWord(fallbackText);
  });
}
