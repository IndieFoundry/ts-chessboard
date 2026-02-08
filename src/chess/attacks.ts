/**
 * Sliding piece attack generation using o^(o-2r) technique.
 * Computes bishop, rook, and queen attacks given occupied squares.
 * Original implementation for @indiefoundry/chessboard.
 */

import { SquareMask } from './squareSet';
import type { Color, Piece, Square } from './types';
import { getFile, getRank } from './util';

type BySquare<T> = T[];

const buildMoveRange = (square: Square, deltas: number[]): SquareMask => {
  let range = SquareMask.empty();
  for (const delta of deltas) {
    const sq = square + delta;
    if (0 <= sq && sq < 64 && Math.abs(getFile(square) - getFile(sq)) <= 2) {
      range = range.with(sq);
    }
  }
  return range;
};

const precomputeTable = <T>(f: (square: Square) => T): BySquare<T> => {
  const table = [];
  for (let square = 0; square < 64; square++) table[square] = f(square);
  return table;
};

const KING_MOVES = precomputeTable(sq => buildMoveRange(sq, [-9, -8, -7, -1, 1, 7, 8, 9]));
const KNIGHT_MOVES = precomputeTable(sq => buildMoveRange(sq, [-17, -15, -10, -6, 6, 10, 15, 17]));
const PAWN_CAPTURES = {
  white: precomputeTable(sq => buildMoveRange(sq, [7, 9])),
  black: precomputeTable(sq => buildMoveRange(sq, [-7, -9])),
};

/** Gets squares attacked or defended by a king on `square`. */
export const computeKingMoves = (square: Square): SquareMask => KING_MOVES[square];

/** Gets squares attacked or defended by a knight on `square`. */
export const computeKnightMoves = (square: Square): SquareMask => KNIGHT_MOVES[square];

/** Gets squares attacked or defended by a pawn of the given `color` on `square`. */
export const computePawnCaptures = (color: Color, square: Square): SquareMask => PAWN_CAPTURES[color][square];

const FILE_RANGE = precomputeTable(sq => SquareMask.fromFile(getFile(sq)).without(sq));
const RANK_RANGE = precomputeTable(sq => SquareMask.fromRank(getRank(sq)).without(sq));

const DIAG_RANGE = precomputeTable(sq => {
  const diag = new SquareMask(0x0804_0201, 0x8040_2010);
  const shift = 8 * (getRank(sq) - getFile(sq));
  return (shift >= 0 ? diag.shl64(shift) : diag.shr64(-shift)).without(sq);
});

const ANTI_DIAG_RANGE = precomputeTable(sq => {
  const diag = new SquareMask(0x1020_4080, 0x0102_0408);
  const shift = 8 * (getRank(sq) + getFile(sq) - 7);
  return (shift >= 0 ? diag.shl64(shift) : diag.shr64(-shift)).without(sq);
});

/** Compute sliding attacks using o^(o-2r) trick with byte swap for reverse direction. */
const slidingAttacks = (bit: SquareMask, range: SquareMask, occupied: SquareMask): SquareMask => {
  let forward = occupied.intersect(range);
  let reverse = forward.bswap64();
  forward = forward.minus64(bit);
  reverse = reverse.minus64(bit.bswap64());
  return forward.xor(reverse.bswap64()).intersect(range);
};

const fileSliding = (square: Square, occupied: SquareMask): SquareMask =>
  slidingAttacks(SquareMask.fromSquare(square), FILE_RANGE[square], occupied);

const rankSliding = (square: Square, occupied: SquareMask): SquareMask => {
  const range = RANK_RANGE[square];
  let forward = occupied.intersect(range);
  let reverse = forward.rbit64();
  forward = forward.minus64(SquareMask.fromSquare(square));
  reverse = reverse.minus64(SquareMask.fromSquare(63 - square));
  return forward.xor(reverse.rbit64()).intersect(range);
};

/** Gets squares attacked or defended by a bishop on `square`, given `occupied` squares. */
export const computeBishopMoves = (square: Square, occupied: SquareMask): SquareMask => {
  const bit = SquareMask.fromSquare(square);
  return slidingAttacks(bit, DIAG_RANGE[square], occupied).xor(slidingAttacks(bit, ANTI_DIAG_RANGE[square], occupied));
};

/** Gets squares attacked or defended by a rook on `square`, given `occupied` squares. */
export const computeRookMoves = (square: Square, occupied: SquareMask): SquareMask =>
  fileSliding(square, occupied).xor(rankSliding(square, occupied));

/** Gets squares attacked or defended by a queen on `square`, given `occupied` squares. */
export const computeQueenMoves = (square: Square, occupied: SquareMask): SquareMask =>
  computeBishopMoves(square, occupied).xor(computeRookMoves(square, occupied));

/** Gets squares attacked or defended by a `piece` on `square`, given `occupied` squares. */
export const computePieceMoves = (piece: Piece, square: Square, occupied: SquareMask): SquareMask => {
  switch (piece.role) {
    case 'pawn': return computePawnCaptures(piece.color, square);
    case 'knight': return computeKnightMoves(square);
    case 'bishop': return computeBishopMoves(square, occupied);
    case 'rook': return computeRookMoves(square, occupied);
    case 'queen': return computeQueenMoves(square, occupied);
    case 'king': return computeKingMoves(square);
  }
};

/** Gets all squares of the rank, file or diagonal with the two squares `a` and `b`. */
export const getSquareRay = (a: Square, b: Square): SquareMask => {
  const other = SquareMask.fromSquare(b);
  if (RANK_RANGE[a].intersects(other)) return RANK_RANGE[a].with(a);
  if (ANTI_DIAG_RANGE[a].intersects(other)) return ANTI_DIAG_RANGE[a].with(a);
  if (DIAG_RANGE[a].intersects(other)) return DIAG_RANGE[a].with(a);
  if (FILE_RANGE[a].intersects(other)) return FILE_RANGE[a].with(a);
  return SquareMask.empty();
};

/** Gets all squares between `a` and `b` (bounds not included). */
export const squaresBetween = (a: Square, b: Square): SquareMask =>
  getSquareRay(a, b)
    .intersect(SquareMask.full().shl64(a).xor(SquareMask.full().shl64(b)))
    .withoutFirst();

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
