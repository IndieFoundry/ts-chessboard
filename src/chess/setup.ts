/**
 * Chess position setup (may not be legal).
 * Stores board, turn, castling rights, en passant, and move counters.
 * Original implementation for @indiefoundry/chessboard.
 */

import { BitBoard } from './board';
import { SquareMask } from './squareSet';
import type { Color, Square } from './types';

/**
 * A chess position setup (may not be legal).
 */
export interface GameSetup {
  board: BitBoard;
  turn: Color;
  castlingRights: SquareMask;
  epSquare: Square | undefined;
  halfmoves: number;
  fullmoves: number;
}

export const createInitialSetup = (): GameSetup => ({
  board: BitBoard.default(),
  turn: 'white',
  castlingRights: SquareMask.corners(),
  epSquare: undefined,
  halfmoves: 0,
  fullmoves: 1,
});

export const cloneSetup = (setup: GameSetup): GameSetup => ({
  board: setup.board.clone(),
  turn: setup.turn,
  castlingRights: setup.castlingRights,
  epSquare: setup.epSquare,
  halfmoves: setup.halfmoves,
  fullmoves: setup.fullmoves,
});

// Backwards compatibility aliases
export type Setup = GameSetup;
export const defaultSetup = createInitialSetup;
export const setupClone = cloneSetup;
