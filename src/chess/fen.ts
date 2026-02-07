/**
 * FEN (Forsyth-Edwards Notation) parsing and serialization.
 * Handles standard FEN format including X-FEN castling notation.
 * Part of @indiefoundry/chessboard's built-in chess engine.
 */

import { Board } from './board';
import { Setup } from './setup';
import { SquareSet } from './squareSet';
import type { Color, Piece, Square } from './types';
import { charToRole, defined, makeSquare, parseSquare, roleToChar, squareFile, squareFromCoords } from './util';

export const INITIAL_BOARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const EMPTY_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';

const COLORS: readonly Color[] = ['white', 'black'];
const FILE_NAMES_ARRAY = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const charToPiece = (ch: string): Piece | undefined => {
  const role = charToRole(ch);
  return role && { role, color: ch.toLowerCase() === ch ? 'black' : 'white' };
};

/** Parse the board part of a FEN string. */
export const parseBoardFen = (boardPart: string): Board | undefined => {
  const board = Board.empty();
  let rank = 7;
  let file = 0;
  for (let i = 0; i < boardPart.length; i++) {
    const c = boardPart[i];
    if (c === '/' && file === 8) {
      file = 0;
      rank--;
    } else {
      const step = parseInt(c, 10);
      if (step > 0) file += step;
      else {
        if (file >= 8 || rank < 0) return undefined;
        const square = file + rank * 8;
        const piece = charToPiece(c);
        if (!piece) return undefined;
        if (boardPart[i + 1] === '~') {
          piece.promoted = true;
          i++;
        }
        board.set(square, piece);
        file++;
      }
    }
  }
  if (rank !== 0 || file !== 8) return undefined;
  return board;
};

/** Parse castling rights from FEN. */
export const parseCastlingFen = (board: Board, castlingPart: string): SquareSet | undefined => {
  let castlingRights = SquareSet.empty();
  if (castlingPart === '-') return castlingRights;

  for (const c of castlingPart) {
    const lower = c.toLowerCase();
    const color: Color = c === lower ? 'black' : 'white';
    const rank = color === 'white' ? 0 : 7;
    if ('a' <= lower && lower <= 'h') {
      const sq = squareFromCoords(lower.charCodeAt(0) - 'a'.charCodeAt(0), rank);
      if (sq !== undefined) castlingRights = castlingRights.with(sq);
    } else if (lower === 'k' || lower === 'q') {
      const rooksAndKings = board[color].intersect(SquareSet.backrank(color)).intersect(board.rook.union(board.king));
      const candidate = lower === 'k' ? rooksAndKings.last() : rooksAndKings.first();
      const sq = squareFromCoords(lower === 'k' ? 7 : 0, rank);
      castlingRights = castlingRights.with(
        defined(candidate) && board.rook.has(candidate) ? candidate : sq!,
      );
    } else {
      return undefined;
    }
  }

  return castlingRights;
};

/** Parse a FEN string into a Setup. Returns undefined if invalid. */
export const parseFen = (fen: string): Setup | undefined => {
  const parts = fen.split(/[\s_]+/);
  const boardPart = parts.shift();
  if (!boardPart) return undefined;

  const board = parseBoardFen(boardPart);
  if (!board) return undefined;

  // Turn
  let turn: Color;
  const turnPart = parts.shift();
  if (!defined(turnPart) || turnPart === 'w') turn = 'white';
  else if (turnPart === 'b') turn = 'black';
  else return undefined;

  // Castling
  const castlingPart = parts.shift();
  const castlingRights = defined(castlingPart) ? parseCastlingFen(board, castlingPart) : SquareSet.empty();
  if (!castlingRights) return undefined;

  // En passant
  const epPart = parts.shift();
  let epSquare: Square | undefined;
  if (defined(epPart) && epPart !== '-') {
    epSquare = parseSquare(epPart);
    if (!defined(epSquare)) return undefined;
  }

  // Halfmoves
  const halfmovePart = parts.shift();
  const halfmoves = defined(halfmovePart) && /^\d{1,4}$/.test(halfmovePart) ? parseInt(halfmovePart, 10) : 0;

  // Fullmoves
  const fullmovesPart = parts.shift();
  const fullmoves = defined(fullmovesPart) && /^\d{1,4}$/.test(fullmovesPart) ? parseInt(fullmovesPart, 10) : 1;

  return {
    board,
    turn,
    castlingRights,
    epSquare,
    halfmoves,
    fullmoves: Math.max(1, fullmoves),
  };
};

/** Create a piece character for FEN. */
export const makePiece = (piece: Piece): string => {
  let r = roleToChar(piece.role);
  if (piece.color === 'white') r = r.toUpperCase();
  if (piece.promoted) r += '~';
  return r;
};

/** Create the board part of a FEN string. */
export const makeBoardFen = (board: Board): string => {
  let fen = '';
  let empty = 0;
  for (let rank = 7; rank >= 0; rank--) {
    for (let file = 0; file < 8; file++) {
      const square = file + rank * 8;
      const piece = board.get(square);
      if (!piece) empty++;
      else {
        if (empty > 0) {
          fen += empty;
          empty = 0;
        }
        fen += makePiece(piece);
      }

      if (file === 7) {
        if (empty > 0) {
          fen += empty;
          empty = 0;
        }
        if (rank !== 0) fen += '/';
      }
    }
  }
  return fen;
};

/** Create the castling part of a FEN string. */
export const makeCastlingFen = (board: Board, castlingRights: SquareSet): string => {
  let fen = '';
  for (const color of COLORS) {
    const backrank = SquareSet.backrank(color);
    let king = board.kingOf(color);
    if (defined(king) && !backrank.has(king)) king = undefined;
    const candidates = board.pieces(color, 'rook').intersect(backrank);
    for (const rook of castlingRights.intersect(backrank).reversed()) {
      if (rook === candidates.first() && defined(king) && rook < king) {
        fen += color === 'white' ? 'Q' : 'q';
      } else if (rook === candidates.last() && defined(king) && king < rook) {
        fen += color === 'white' ? 'K' : 'k';
      } else {
        const file = FILE_NAMES_ARRAY[squareFile(rook)];
        fen += color === 'white' ? file.toUpperCase() : file;
      }
    }
  }
  return fen || '-';
};

/** Create a full FEN string from a Setup. */
export const makeFen = (setup: Setup): string =>
  [
    makeBoardFen(setup.board),
    setup.turn[0],
    makeCastlingFen(setup.board, setup.castlingRights),
    defined(setup.epSquare) ? makeSquare(setup.epSquare) : '-',
    Math.max(0, Math.min(setup.halfmoves, 9999)),
    Math.max(1, Math.min(setup.fullmoves, 9999)),
  ].join(' ');
