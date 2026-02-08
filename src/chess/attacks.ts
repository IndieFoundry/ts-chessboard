/**
 * Attack generation for chess pieces using ray-casting.
 * Simple and clear implementation without complex bit manipulation tricks.
 * @indiefoundry/chessboard - Original implementation using iterative rays.
 */

import { SquareMask } from './squareSet';
import type { Color, Piece, Square } from './types';
import { getFile, getRank } from './util';

// Direction deltas for ray-casting
const ROOK_DELTAS = [8, -8, 1, -1]; // north, south, east, west
const BISHOP_DELTAS = [9, 7, -9, -7]; // diagonals

/**
 * Check if stepping from one square by a delta is valid (stays on board, no wrap).
 */
const isValidStep = (from: Square, delta: number): boolean => {
  const to = from + delta;
  if (to < 0 || to >= 64) return false;

  const fromFile = getFile(from);
  const toFile = getFile(to);
  const fileDist = Math.abs(fromFile - toFile);

  // Horizontal moves (delta = ±1): file changes by exactly 1
  if (Math.abs(delta) === 1) return fileDist === 1;

  // Vertical moves (delta = ±8): file stays the same
  if (Math.abs(delta) === 8) return fileDist === 0;

  // Diagonal moves (delta = ±7, ±9): file changes by exactly 1
  if (Math.abs(delta) === 7 || Math.abs(delta) === 9) return fileDist === 1;

  // Knight moves: check expected file distance
  if (Math.abs(delta) === 6 || Math.abs(delta) === 10) return fileDist === 2;
  if (Math.abs(delta) === 15 || Math.abs(delta) === 17) return fileDist === 1;

  return true;
};

/**
 * Cast a ray from a square in a direction, stopping at the first occupied square.
 * The blocker square is included in the result (can be captured).
 */
const castRay = (from: Square, delta: number, occupied: SquareMask): SquareMask => {
  let result = SquareMask.empty();
  let current = from;

  while (true) {
    if (!isValidStep(current, delta)) break;
    const next = current + delta;
    result = result.with(next);
    if (occupied.has(next)) break; // Hit a piece, include it and stop
    current = next;
  }

  return result;
};

/**
 * Build attack mask for a leaping piece (king, knight, pawn).
 */
const buildLeapAttacks = (square: Square, deltas: number[]): SquareMask => {
  let mask = SquareMask.empty();

  for (const delta of deltas) {
    if (isValidStep(square, delta)) {
      mask = mask.with(square + delta);
    }
  }

  return mask;
};

// Precomputed attack tables for non-sliding pieces
const precomputeTable = <T>(f: (sq: Square) => T): T[] => {
  const table: T[] = [];
  for (let sq = 0; sq < 64; sq++) {
    table[sq] = f(sq);
  }
  return table;
};

const KING_ATTACKS = precomputeTable(sq =>
  buildLeapAttacks(sq, [-9, -8, -7, -1, 1, 7, 8, 9])
);

const KNIGHT_ATTACKS = precomputeTable(sq =>
  buildLeapAttacks(sq, [-17, -15, -10, -6, 6, 10, 15, 17])
);

const PAWN_ATTACKS = {
  white: precomputeTable(sq => buildLeapAttacks(sq, [7, 9])),
  black: precomputeTable(sq => buildLeapAttacks(sq, [-7, -9])),
};


// Precomputed full line masks (for ray function)
const FILE_MASKS = precomputeTable(sq => SquareMask.fromFile(getFile(sq)));
const RANK_MASKS = precomputeTable(sq => SquareMask.fromRank(getRank(sq)));

const DIAG_MASKS = precomputeTable(sq => {
  let mask = SquareMask.fromSquare(sq);
  // Go both directions on the diagonal
  for (const delta of [9, -9]) {
    let current = sq;
    while (isValidStep(current, delta)) {
      current += delta;
      mask = mask.with(current);
    }
  }
  return mask;
});

const ANTI_DIAG_MASKS = precomputeTable(sq => {
  let mask = SquareMask.fromSquare(sq);
  // Go both directions on the anti-diagonal
  for (const delta of [7, -7]) {
    let current = sq;
    while (isValidStep(current, delta)) {
      current += delta;
      mask = mask.with(current);
    }
  }
  return mask;
});

/** Gets squares attacked or defended by a king on `square`. */
export const computeKingMoves = (square: Square): SquareMask => KING_ATTACKS[square];

/** Gets squares attacked or defended by a knight on `square`. */
export const computeKnightMoves = (square: Square): SquareMask => KNIGHT_ATTACKS[square];

/** Gets squares attacked or defended by a pawn of the given `color` on `square`. */
export const computePawnCaptures = (color: Color, square: Square): SquareMask =>
  PAWN_ATTACKS[color][square];

/** Gets squares attacked or defended by a bishop on `square`, given `occupied` squares. */
export const computeBishopMoves = (square: Square, occupied: SquareMask): SquareMask => {
  let attacks = SquareMask.empty();
  for (const delta of BISHOP_DELTAS) {
    attacks = attacks.union(castRay(square, delta, occupied));
  }
  return attacks;
};

/** Gets squares attacked or defended by a rook on `square`, given `occupied` squares. */
export const computeRookMoves = (square: Square, occupied: SquareMask): SquareMask => {
  let attacks = SquareMask.empty();
  for (const delta of ROOK_DELTAS) {
    attacks = attacks.union(castRay(square, delta, occupied));
  }
  return attacks;
};

/** Gets squares attacked or defended by a queen on `square`, given `occupied` squares. */
export const computeQueenMoves = (square: Square, occupied: SquareMask): SquareMask =>
  computeBishopMoves(square, occupied).union(computeRookMoves(square, occupied));

/** Gets squares attacked or defended by a `piece` on `square`, given `occupied` squares. */
export const computePieceMoves = (piece: Piece, square: Square, occupied: SquareMask): SquareMask => {
  switch (piece.role) {
    case 'pawn':
      return computePawnCaptures(piece.color, square);
    case 'knight':
      return computeKnightMoves(square);
    case 'bishop':
      return computeBishopMoves(square, occupied);
    case 'rook':
      return computeRookMoves(square, occupied);
    case 'queen':
      return computeQueenMoves(square, occupied);
    case 'king':
      return computeKingMoves(square);
  }
};

/**
 * Gets all squares of the rank, file or diagonal containing both squares `a` and `b`.
 * Returns empty if the squares are not aligned.
 */
export const getSquareRay = (a: Square, b: Square): SquareMask => {
  // Check if they share a rank
  if (getRank(a) === getRank(b)) {
    return RANK_MASKS[a];
  }

  // Check if they share a file
  if (getFile(a) === getFile(b)) {
    return FILE_MASKS[a];
  }

  // Check if they share a diagonal
  if (DIAG_MASKS[a].has(b)) {
    return DIAG_MASKS[a];
  }

  // Check if they share an anti-diagonal
  if (ANTI_DIAG_MASKS[a].has(b)) {
    return ANTI_DIAG_MASKS[a];
  }

  return SquareMask.empty();
};

/**
 * Gets all squares strictly between `a` and `b` (bounds not included).
 * Returns empty if squares are not aligned or adjacent.
 */
export const squaresBetween = (a: Square, b: Square): SquareMask => {
  const ray = getSquareRay(a, b);
  if (ray.isEmpty()) return ray;

  // Find the direction from a to b
  const aFile = getFile(a);
  const bFile = getFile(b);
  const aRank = getRank(a);
  const bRank = getRank(b);

  const fileDelta = bFile > aFile ? 1 : bFile < aFile ? -1 : 0;
  const rankDelta = bRank > aRank ? 1 : bRank < aRank ? -1 : 0;
  const delta = fileDelta + rankDelta * 8;

  // Collect squares between a and b (exclusive)
  let result = SquareMask.empty();
  let current = a + delta;

  while (current !== b && current >= 0 && current < 64) {
    result = result.with(current);
    current += delta;
  }

  return result;
};

// Backwards compatibility aliases
export const kingAttacks = computeKingMoves;
export const knightAttacks = computeKnightMoves;
export const pawnAttacks = computePawnCaptures;
export const bishopAttacks = computeBishopMoves;
export const rookAttacks = computeRookMoves;
export const queenAttacks = computeQueenMoves;
export const attacks = computePieceMoves;
export const ray = getSquareRay;
export const between = squaresBetween;
