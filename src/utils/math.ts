/**
 * Mathematical utilities for geometric calculations
 */
import type { Pos, NumberPair, DirectionalCheck, Key } from '../core/types';

/** Returns the absolute difference between two numbers */
export const diff = (a: number, b: number): number => Math.abs(a - b);

/** Returns the squared distance between two positions */
export const distanceSq = (pos1: NumberPair, pos2: NumberPair): number =>
  (pos1[0] - pos2[0]) ** 2 + (pos1[1] - pos2[1]) ** 2;

/** Checks if two positions are the same */
export const samePos = (p1: Pos, p2: Pos): boolean => p1[0] === p2[0] && p1[1] === p2[1];

/** Knight movement check: L-shaped move (2x1 or 1x2) */
export const knightDir: DirectionalCheck = (x1, y1, x2, y2) => diff(x1, x2) * diff(y1, y2) === 2;

/** Rook movement check: horizontal or vertical line */
export const rookDir: DirectionalCheck = (x1, y1, x2, y2) => (x1 === x2) !== (y1 === y2);

/** Bishop movement check: diagonal line */
export const bishopDir: DirectionalCheck = (x1, y1, x2, y2) => diff(x1, x2) === diff(y1, y2) && x1 !== x2;

/** Queen movement check: horizontal, vertical, or diagonal line */
export const queenDir: DirectionalCheck = (x1, y1, x2, y2) =>
  rookDir(x1, y1, x2, y2) || bishopDir(x1, y1, x2, y2);

/** King movement check (without castling): one square in any direction */
export const kingDirNonCastling: DirectionalCheck = (x1, y1, x2, y2) =>
  Math.max(diff(x1, x2), diff(y1, y2)) === 1;

/** Pawn capture movement check */
export const pawnDirCapture = (x1: number, y1: number, x2: number, y2: number, isDirectionUp: boolean) =>
  diff(x1, x2) === 1 && y2 === y1 + (isDirectionUp ? 1 : -1);

/** Pawn advance movement check (includes 2-square initial move for Horde variant) */
export const pawnDirAdvance = (x1: number, y1: number, x2: number, y2: number, isDirectionUp: boolean) => {
  const step = isDirectionUp ? 1 : -1;
  return (
    x1 === x2 &&
    (y2 === y1 + step ||
      // allow 2 squares from first two ranks, for horde
      (y2 === y1 + 2 * step && (isDirectionUp ? y1 <= 1 : y1 >= 6)))
  );
};

/**
 * Returns all board squares between (x1, y1) and (x2, y2) exclusive,
 * along a straight line (rook or bishop path). Returns [] if not aligned, or none between.
 */
export function squaresBetween(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  pos2key: (pos: Pos) => Key | undefined
): Key[] {
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Must be a straight or diagonal line
  if (dx && dy && Math.abs(dx) !== Math.abs(dy)) return [];

  const stepX = Math.sign(dx),
    stepY = Math.sign(dy);
  const squares: Pos[] = [];
  let x = x1 + stepX,
    y = y1 + stepY;
  while (x !== x2 || y !== y2) {
    squares.push([x, y]);
    x += stepX;
    y += stepY;
  }
  return squares.map(pos2key).filter((k): k is Key => k !== undefined);
}

/**
 * Returns horizontally adjacent squares (left and right neighbors)
 */
export function adjacentSquares(
  square: Key,
  key2pos: (k: Key) => Pos,
  pos2key: (pos: Pos) => Key | undefined
): Key[] {
  const pos = key2pos(square);
  const adjacentSquares: Pos[] = [];
  if (pos[0] > 0) adjacentSquares.push([pos[0] - 1, pos[1]]);
  if (pos[0] < 7) adjacentSquares.push([pos[0] + 1, pos[1]]);
  return adjacentSquares.map(pos2key).filter((k): k is Key => k !== undefined);
}

/**
 * Returns a square shifted vertically by delta ranks
 */
export function squareShiftedVertically(
  square: Key,
  delta: number,
  key2pos: (k: Key) => Pos,
  pos2key: (pos: Pos) => Key | undefined
): Key | undefined {
  const pos = key2pos(square);
  pos[1] += delta;
  return pos2key(pos);
}
