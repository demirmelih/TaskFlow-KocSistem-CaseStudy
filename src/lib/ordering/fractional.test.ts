import { describe, expect, it } from "vitest";
import {
  generateKeyBetween,
  generateNKeysBetween,
  positionForIndex,
} from "./fractional";

describe("generateKeyBetween", () => {
  it("creates a first key when both bounds are null", () => {
    const k = generateKeyBetween(null, null);
    expect(k.length).toBeGreaterThan(0);
  });

  it("creates a key before another when left bound is null", () => {
    const a = generateKeyBetween(null, null);
    const b = generateKeyBetween(null, a);
    expect(b < a).toBe(true);
  });

  it("creates a key after another when right bound is null", () => {
    const a = generateKeyBetween(null, null);
    const b = generateKeyBetween(a, null);
    expect(b > a).toBe(true);
  });

  it("creates a key strictly between two existing keys", () => {
    const a = generateKeyBetween(null, null);
    const c = generateKeyBetween(a, null);
    const b = generateKeyBetween(a, c);
    expect(a < b).toBe(true);
    expect(b < c).toBe(true);
  });

  it("rejects an inverted range", () => {
    const a = generateKeyBetween(null, null);
    const b = generateKeyBetween(a, null);
    expect(() => generateKeyBetween(b, a)).toThrow();
    expect(() => generateKeyBetween(a, a)).toThrow();
  });

  it("supports many sequential inserts at the end", () => {
    let prev: string | null = null;
    const keys: string[] = [];
    for (let i = 0; i < 100; i++) {
      const next = generateKeyBetween(prev, null);
      keys.push(next);
      prev = next;
    }
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i - 1]! < keys[i]!).toBe(true);
    }
    // Length growth is logarithmic. Sanity bound for 100 inserts.
    expect(keys.at(-1)!.length).toBeLessThan(10);
  });

  it("supports repeated mid-inserts (worst case for fractional indexing)", () => {
    let lo = generateKeyBetween(null, null);
    let hi = generateKeyBetween(lo, null);
    for (let i = 0; i < 50; i++) {
      const mid = generateKeyBetween(lo, hi);
      expect(lo < mid).toBe(true);
      expect(mid < hi).toBe(true);
      hi = mid;
    }
    // Length grows by O(1) per mid-insert in this pattern; should stay bounded.
    expect(hi.length).toBeLessThan(80);
  });
});

describe("generateNKeysBetween", () => {
  it("returns n keys in strict ascending order", () => {
    const keys = generateNKeysBetween(null, null, 10);
    expect(keys).toHaveLength(10);
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i - 1]! < keys[i]!).toBe(true);
    }
  });

  it("respects bounds when both are provided", () => {
    const a = generateKeyBetween(null, null);
    const b = generateKeyBetween(a, null);
    const keys = generateNKeysBetween(a, b, 5);
    expect(keys).toHaveLength(5);
    expect(a < keys[0]!).toBe(true);
    expect(keys.at(-1)! < b).toBe(true);
  });

  it("returns empty array for n=0", () => {
    expect(generateNKeysBetween(null, null, 0)).toEqual([]);
  });
});

describe("positionForIndex", () => {
  // Build siblings in deterministic order for these tests.
  function makeSiblings(n: number) {
    const positions = generateNKeysBetween(null, null, n);
    return positions.map((position, i) => ({ id: `id-${i}`, position }));
  }

  it("places at the start when targetIndex=0", () => {
    const siblings = makeSiblings(3);
    const pos = positionForIndex(siblings, 0);
    expect(pos < siblings[0]!.position).toBe(true);
  });

  it("places at the end when targetIndex=length", () => {
    const siblings = makeSiblings(3);
    const pos = positionForIndex(siblings, siblings.length);
    expect(pos > siblings.at(-1)!.position).toBe(true);
  });

  it("places between siblings for interior indices", () => {
    const siblings = makeSiblings(4);
    const pos = positionForIndex(siblings, 2);
    expect(siblings[1]!.position < pos).toBe(true);
    expect(pos < siblings[2]!.position).toBe(true);
  });

  it("excludes the moving item from the calculation", () => {
    const siblings = makeSiblings(4);
    // Move id-1 from its current spot to slot between id-2 and id-3.
    // targetIndex follows dnd-kit's convention: the destination index in the
    // POST-removal list. Filtered list is [id-0, id-2, id-3]; index 2 means
    // "place between id-2 and id-3".
    const pos = positionForIndex(siblings, 2, "id-1");
    expect(siblings[2]!.position < pos).toBe(true);
    expect(pos < siblings[3]!.position).toBe(true);
  });

  it("works on empty siblings (first card in column)", () => {
    const pos = positionForIndex([], 0);
    expect(pos.length).toBeGreaterThan(0);
  });

  it("clamps out-of-range indices", () => {
    const siblings = makeSiblings(2);
    const pos = positionForIndex(siblings, 99);
    expect(pos > siblings.at(-1)!.position).toBe(true);
  });
});
