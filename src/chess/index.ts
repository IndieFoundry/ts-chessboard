/**
 * Built-in chess engine for @indiefoundry/chessboard.
 * Provides legal move generation, position validation, and game state detection.
 */

// Types
export type {
  Color,
  Role,
  Piece,
  Square,
  SquareName,
  Move,
  NormalMove,
  DropMove,
  Outcome,
  CastlingSide,
} from './types';
export { isDrop, isNormal, COLORS, ROLES, FILE_NAMES, RANK_NAMES } from './types';

// SquareSet (bitboard)
export { SquareSet } from './squareSet';

// Utilities
export {
  opposite,
  squareRank,
  squareFile,
  squareFromCoords,
  parseSquare,
  makeSquare,
  parseUci,
  makeUci,
  charToRole,
  roleToChar,
} from './util';

// Attacks
export {
  kingAttacks,
  knightAttacks,
  pawnAttacks,
  bishopAttacks,
  rookAttacks,
  queenAttacks,
  attacks,
  ray,
  between,
} from './attacks';

// Board
export { Board } from './board';

// Setup
export type { Setup } from './setup';
export { defaultSetup, setupClone } from './setup';

// Chess
export { Chess, Castles, castlingSide, normalizeMove } from './chess';
export type { Context } from './chess';

// FEN
export {
  INITIAL_FEN,
  INITIAL_BOARD_FEN,
  EMPTY_FEN,
  parseFen,
  parseBoardFen,
  makeFen,
  makeBoardFen,
  makePiece,
} from './fen';
