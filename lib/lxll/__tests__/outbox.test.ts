import { beforeEach, describe, expect, it } from "vitest";
import {
  loadOutbox,
  getBatch,
  saveBatch,
  clearBatch,
  clearOutbox,
} from "../outbox";
import type { AntiForgetSubmission } from "../api";

const sub = (antiForgetId: number, wordId = 1): AntiForgetSubmission => ({
  antiForgetId,
  words: [{ wordId, status: true }],
});

beforeEach(() => {
  // The outbox is a browser module; under vitest's node env we give it a
  // minimal in-memory window.localStorage (no jsdom dependency needed).
  const store = new Map<string, string>();
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    },
  };
});

describe("outbox", () => {
  it("saves and reads back a child's batch", () => {
    saveBatch("u1", [sub(10)]);
    const b = getBatch("u1");
    expect(b?.userId).toBe("u1");
    expect(b?.submissions).toHaveLength(1);
    expect(b?.submissions[0].antiForgetId).toBe(10);
  });

  it("keeps batches separate per userId (no cross-child bleed)", () => {
    saveBatch("u1", [sub(10)]);
    saveBatch("u2", [sub(20)]);
    expect(getBatch("u1")?.submissions[0].antiForgetId).toBe(10);
    expect(getBatch("u2")?.submissions[0].antiForgetId).toBe(20);
    expect(loadOutbox()).toHaveLength(2);
  });

  it("merges by antiForgetId: new slots accumulate, same slot updates", () => {
    saveBatch("u1", [sub(10, 1)]);
    saveBatch("u1", [sub(11, 2)]); // different slot → accumulates
    saveBatch("u1", [sub(10, 9)]); // same slot → replaces
    const b = getBatch("u1");
    expect(b?.submissions).toHaveLength(2);
    const slot10 = b?.submissions.find((s) => s.antiForgetId === 10);
    expect(slot10?.words[0].wordId).toBe(9);
  });

  it("clearBatch removes only that child", () => {
    saveBatch("u1", [sub(10)]);
    saveBatch("u2", [sub(20)]);
    clearBatch("u1");
    expect(getBatch("u1")).toBeUndefined();
    expect(getBatch("u2")).toBeDefined();
  });

  it("clearOutbox wipes everything", () => {
    saveBatch("u1", [sub(10)]);
    saveBatch("u2", [sub(20)]);
    clearOutbox();
    expect(loadOutbox()).toHaveLength(0);
  });

  it("prunes batches older than the 7-day TTL", () => {
    const old = 1_000_000;
    saveBatch("u1", [sub(10)], old);
    // 8 days later
    const later = old + 8 * 24 * 60 * 60 * 1000;
    expect(loadOutbox(later)).toHaveLength(0);
    expect(getBatch("u1", later)).toBeUndefined();
  });

  it("ignores empty submissions", () => {
    saveBatch("u1", []);
    expect(getBatch("u1")).toBeUndefined();
  });
});
