import { describe, expect, it } from "vitest";
import {
  PET_STAGES,
  getPetProgress,
  getPetStage,
  getPetStageIndex,
} from "../pet";

describe("getPetStageIndex", () => {
  it("starts at the egg", () => {
    expect(getPetStageIndex(0)).toBe(0);
  });

  it("evolves exactly at each minXp threshold", () => {
    for (let i = 1; i < PET_STAGES.length; i++) {
      const { minXp } = PET_STAGES[i];
      expect(getPetStageIndex(minXp - 1)).toBe(i - 1);
      expect(getPetStageIndex(minXp)).toBe(i);
    }
  });

  it("stays at the final form for huge XP", () => {
    expect(getPetStageIndex(1_000_000)).toBe(PET_STAGES.length - 1);
  });
});

describe("getPetStage", () => {
  it("returns the matching stage object", () => {
    expect(getPetStage(0).name).toBe(PET_STAGES[0].name);
    expect(getPetStage(1_000_000).name).toBe(
      PET_STAGES[PET_STAGES.length - 1].name,
    );
  });
});

describe("getPetProgress", () => {
  it("is 0 right after an evolution and approaches 1 before the next", () => {
    const second = PET_STAGES[1].minXp;
    const third = PET_STAGES[2].minXp;
    expect(getPetProgress(second)).toBe(0);
    expect(getPetProgress(third - 1)).toBeLessThan(1);
    expect(getPetProgress(third - 1)).toBeGreaterThan(0.9);
  });

  it("is pinned to 1 at the final form", () => {
    expect(getPetProgress(PET_STAGES[PET_STAGES.length - 1].minXp)).toBe(1);
    expect(getPetProgress(1_000_000)).toBe(1);
  });

  it("never leaves the 0..1 range", () => {
    for (let xp = 0; xp <= 400; xp += 7) {
      const p = getPetProgress(xp);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});
