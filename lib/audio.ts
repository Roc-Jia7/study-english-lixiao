import { speakWord, stopSpeaking } from "./speech";

/**
 * Word pronunciation player. Prefers a real recording — an explicit URL
 * (lxll's resource CDN for backend words) or the bundled demo mp3 at
 * /public/audio/words/<id>.mp3 — and falls back to Web Speech synthesis when
 * none is reachable, so the app sounds natural yet always speaks.
 */

const cache = new Map<string, HTMLAudioElement>();
const missing = new Set<string>();

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

  let audio = cache.get(src);
  if (!audio) {
    audio = new Audio(src);
    audio.preload = "auto";
    cache.set(src, audio);
  }

  audio.currentTime = 0;
  audio.play().catch(() => {
    // 404 / unsupported — remember and don't retry the network every tap.
    missing.add(src);
    speakWord(fallbackText);
  });
}
