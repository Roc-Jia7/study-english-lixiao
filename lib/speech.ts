/**
 * Lively text-to-speech built on the browser's Web Speech API.
 * No keys, no network calls — works offline in every modern browser.
 */

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  if (cachedVoice) return cachedVoice;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null; // voices load async; retry next call

  // Prefer warm, natural English voices commonly available per platform.
  const preferred = [
    "Google US English",
    "Samantha",
    "Microsoft Aria",
    "Microsoft Jenny",
    "Karen",
  ];
  cachedVoice =
    voices.find((v) => preferred.some((p) => v.name.includes(p))) ??
    voices.find((v) => v.lang.startsWith("en-US")) ??
    voices.find((v) => v.lang.startsWith("en")) ??
    null;
  return cachedVoice;
}

// Warm the voice list early — Chrome populates it asynchronously.
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    pickVoice();
  };
}

interface SpeakOptions {
  rate?: number;
  pitch?: number;
}

export function speak(text: string, { rate = 0.9, pitch = 1.1 }: SpeakOptions = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = rate;
  utterance.pitch = pitch;
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

/** Slow and clear — for the headline word. */
export function speakWord(word: string) {
  speak(word, { rate: 0.75, pitch: 1.15 });
}

/** Natural pace — for the context sentence. */
export function speakSentence(sentence: string) {
  speak(sentence, { rate: 0.85, pitch: 1.1 });
}

const CHEERS = [
  "Fantastic! You are a superstar!",
  "Wow! Amazing job!",
  "You did it! High five!",
  "Super duper! Your dragon is so happy!",
  "Hooray! You are unstoppable!",
];

/** Excited celebration line for the reward screen. */
export function speakCheer() {
  const line = CHEERS[Math.floor(Math.random() * CHEERS.length)];
  speak(line, { rate: 1, pitch: 1.35 });
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
