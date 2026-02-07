/**
 * Square and position conversion utilities
 */
import type { Key, Pos, Rank, PosAndKey, Piece, Color, NumberPair } from './types';
import { files, ranks } from './types';

/** Ranks in reverse order (8 to 1) for FEN parsing */
export const invRanks: readonly Rank[] = [...ranks].reverse();

/** All 64 board keys in order (a1, a2, ..., h8) */
export const allKeys: readonly Key[] = files.flatMap(f => ranks.map(r => (f + r) as Key));

/**
 * Converts a position [file, rank] to a key like 'e4'.
 * Returns undefined if the position is out of bounds.
 */
export const pos2key = (pos: Pos): Key | undefined =>
  pos.every(x => x >= 0 && x <= 7) ? allKeys[8 * pos[0] + pos[1]] : undefined;

/**
 * Converts a position to a key, assuming valid input.
 * Use when you're certain the position is valid.
 */
export const pos2keyUnsafe = (pos: Pos): Key => pos2key(pos)!;

/**
 * Converts a key like 'e4' to a position [4, 3].
 */
export const key2pos = (k: Key): Pos => [k.charCodeAt(0) - 97, k.charCodeAt(1) - 49];

/**
 * Converts a UCI move string to keys.
 * Handles drops (e.g., 'N@e4') and regular moves (e.g., 'e2e4').
 */
export const uciToMove = (uci: string | undefined): Key[] | undefined => {
  if (!uci) return undefined;
  if (uci[1] === '@') return [uci.slice(2, 4) as Key];
  return [uci.slice(0, 2), uci.slice(2, 4)] as Key[];
};

/** All 64 board positions */
export const allPos: readonly Pos[] = allKeys.map(key2pos);

/** All 64 board positions with their keys */
export const allPosAndKey: readonly PosAndKey[] = allKeys.map((key, i) => ({ key, pos: allPos[i] }));

/** Returns the opposite color */
export const opposite = (c: Color): Color => (c === 'white' ? 'black' : 'white');

/** Checks if two pieces are the same (same role and color) */
export const samePiece = (p1: Piece, p2: Piece): boolean =>
  p1.role === p2.role && p1.color === p2.color;

/**
 * Computes the center of a square in screen coordinates.
 */
export function computeSquareCenter(key: Key, asWhite: boolean, bounds: DOMRectReadOnly): NumberPair {
  const pos = key2pos(key);
  if (!asWhite) {
    pos[0] = 7 - pos[0];
    pos[1] = 7 - pos[1];
  }
  return [
    bounds.left + (bounds.width * pos[0]) / 8 + bounds.width / 16,
    bounds.top + (bounds.height * (7 - pos[1])) / 8 + bounds.height / 16,
  ];
}
