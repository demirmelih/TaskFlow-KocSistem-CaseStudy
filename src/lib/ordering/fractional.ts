// Fractional (lexicographic) indexing for ordering rows without rewriting neighbors.
//
// Each row stores a string `position`. Rows are sorted by string comparison.
// To insert between two adjacent rows we generate a string strictly between
// their positions — so only ONE row is written, no cascade updates.
//
// Implementation: thin wrapper around the well-tested `fractional-indexing`
// package (David Greenspan's algorithm, the same approach Figma and others use).
// We deliberately delegate the math: ordering correctness is critical and a
// 200-line vetted library is safer than a hand-rolled version. The wrapper
// exists so the rest of the codebase imports a stable internal API.

import {
  generateKeyBetween as libGenerateKeyBetween,
  generateNKeysBetween as libGenerateNKeysBetween,
} from "fractional-indexing";

/**
 * Returns a key that sorts strictly between `a` and `b`.
 * - `generateKeyBetween(null, null)` returns the very first key.
 * - `generateKeyBetween(null, x)`    returns a key BEFORE x.
 * - `generateKeyBetween(x, null)`    returns a key AFTER x.
 * - `generateKeyBetween(x, y)`       returns a key BETWEEN x and y (requires x < y).
 */
export function generateKeyBetween(
  a: string | null,
  b: string | null,
): string {
  return libGenerateKeyBetween(a, b);
}

/**
 * Generates `n` keys evenly spaced between `a` and `b`. Used for seeding
 * multiple rows at once (e.g. default columns on a new board).
 */
export function generateNKeysBetween(
  a: string | null,
  b: string | null,
  n: number,
): string[] {
  return libGenerateNKeysBetween(a, b, n);
}

/**
 * Computes the position string for a card/column dropped at `targetIndex`
 * within an array of siblings (already sorted by position). Pass the moved
 * item's id as `movingId` so it is excluded from the index calculation.
 */
export function positionForIndex(
  siblings: readonly { id: string; position: string }[],
  targetIndex: number,
  movingId?: string,
): string {
  const filtered = movingId
    ? siblings.filter((s) => s.id !== movingId)
    : siblings.slice();
  const clamped = Math.max(0, Math.min(targetIndex, filtered.length));
  const before = clamped > 0 ? filtered[clamped - 1]!.position : null;
  const after = clamped < filtered.length ? filtered[clamped]!.position : null;
  return generateKeyBetween(before, after);
}
