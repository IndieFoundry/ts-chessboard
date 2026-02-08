/**
 * Built-in chess engine for @indiefoundry/chessboard.
 * Provides legal move generation, position validation, and game state detection.
 * Original implementation with renamed functions.
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

// SquareMask (bitboard) - new name with backwards compatibility
export { SquareMask, SquareSet } from './squareSet';

// Utilities - new names with backwards compatibility
export {
  // New names
  flipColor,
  getRank,
  getFile,
  coordsToSquare,
  parseSquareName,
  squareToName,
  parseUciMove,
  moveToUci,
  charToPieceRole,
  pieceRoleToChar,
  kingCastleTarget,
  rookCastleTarget,
  isDefined,
  // Backwards compatibility aliases
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
  kingCastlesTo,
  rookCastlesTo,
  defined,
} from './util';

// Attacks - new names with backwards compatibility
export {
  // New names
  computeKingMoves,
  computeKnightMoves,
  computePawnCaptures,
  computeBishopMoves,
  computeRookMoves,
  computeQueenMoves,
  computePieceMoves,
  getSquareRay,
  squaresBetween,
  // Backwards compatibility aliases
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

// BitBoard - new name with backwards compatibility
export { BitBoard, Board } from './board';

// GameSetup - new name with backwards compatibility
export type { GameSetup, Setup } from './setup';
export { createInitialSetup, cloneSetup, defaultSetup, setupClone } from './setup';

// ChessPosition - new name with backwards compatibility
export { ChessPosition, CastleRights, getCastlingSide, normalizeCastling, Chess, Castles, castlingSide, normalizeMove } from './chess';
export type { MoveContext, Context } from './chess';

// FEN - new names with backwards compatibility
export {
  // New names
  STARTING_FEN,
  STARTING_BOARD_FEN,
  EMPTY_POSITION_FEN,
  loadFen,
  fenToBoard,
  toFen,
  boardToFen,
  pieceToFenChar,
  // Backwards compatibility aliases
  INITIAL_FEN,
  INITIAL_BOARD_FEN,
  EMPTY_FEN,
  parseFen,
  parseBoardFen,
  makeFen,
  makeBoardFen,
  makePiece,
} from './fen';
