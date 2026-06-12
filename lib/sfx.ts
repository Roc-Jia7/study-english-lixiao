/**
 * Tiny synthesized sound effects via Web Audio — no audio files, instant,
 * and safe to call on every tap. Adds playful "juice" to interactions.
 */

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function blip(freq: number, duration: number, type: OscillatorType = "sine") {
  const ac = audioCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  gain.gain.setValueAtTime(0.0001, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration);
}

/** Soft bubbly pop — for ordinary taps. */
export function popSound() {
  blip(520, 0.12);
  setTimeout(() => blip(780, 0.1), 40);
}

/** Happy rising chime — for a correct / "I know it" answer. */
export function happySound() {
  [523, 659, 784].forEach((f, i) => setTimeout(() => blip(f, 0.16), i * 90));
}

/** Gentle low boop — for "help me", never harsh or punishing. */
export function softSound() {
  blip(330, 0.18, "triangle");
}
