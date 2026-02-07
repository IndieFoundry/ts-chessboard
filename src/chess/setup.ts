/**
 * Setup - Chess position representation
 */

import { Board } from './board';
import { SquareSet } from './squareSet';
import type { Color, Square } from './types';

/**
 * A chess position (may not be legal).
 */
export interface Setup {
  board: Board;
  turn: Color;
  castlingRights: SquareSet;
  epSquare: Square | undefined;
  halfmoves: number;
  fullmoves: number;
}

export const defaultSetup = (): Setup => ({
  board: Board.default(),
  turn: 'white',
  castlingRights: SquareSet.corners(),
  epSquare: undefined,
  halfmoves: 0,
  fullmoves: 1,
});

export const setupClone = (setup: Setup): Setup => ({
  board: setup.board.clone(),
  turn: setup.turn,
  castlingRights: setup.castlingRights,
  epSquare: setup.epSquare,
  halfmoves: setup.halfmoves,
  fullmoves: setup.fullmoves,
});
