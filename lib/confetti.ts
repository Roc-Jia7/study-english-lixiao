import confetti from "canvas-confetti";

const KID_COLORS = ["#FFD166", "#FF6B9D", "#7BDFF2", "#B388FF", "#7AE582", "#FF9770"];

/** Honor the OS "reduce motion" setting — flying confetti is a lot of motion. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Full-screen celebration: center burst plus two side cannons. */
export function fireVictoryConfetti() {
  if (prefersReducedMotion()) {
    // A single gentle puff instead of a storm.
    confetti({
      particleCount: 30,
      spread: 70,
      startVelocity: 25,
      origin: { x: 0.5, y: 0.6 },
      colors: KID_COLORS,
      ticks: 60,
    });
    return;
  }
  confetti({
    particleCount: 120,
    spread: 90,
    startVelocity: 45,
    origin: { x: 0.5, y: 0.6 },
    colors: KID_COLORS,
    scalar: 1.2,
  });

  setTimeout(() => {
    confetti({
      particleCount: 60,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.8 },
      colors: KID_COLORS,
    });
    confetti({
      particleCount: 60,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.8 },
      colors: KID_COLORS,
    });
  }, 250);

  setTimeout(() => {
    confetti({
      particleCount: 80,
      spread: 120,
      startVelocity: 30,
      origin: { x: 0.5, y: 0.4 },
      colors: KID_COLORS,
      shapes: ["star"],
      scalar: 1.4,
    });
  }, 550);
}

/** Small sparkle for a single correct answer. */
export function fireMiniSparkle() {
  if (prefersReducedMotion()) return;
  confetti({
    particleCount: 24,
    spread: 50,
    startVelocity: 25,
    origin: { x: 0.5, y: 0.65 },
    colors: KID_COLORS,
    scalar: 0.9,
    ticks: 80,
  });
}
