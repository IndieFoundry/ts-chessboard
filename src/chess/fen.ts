/**
 * FEN (Forsyth-Edwards Notation) parsing and serialization.
 * Handles standard FEN format including X-FEN castling notation.
 * Original implementation for @indiefoundry/chessboard.
 */

import { BitBoard } from './board';
import { GameSetup } from './setup';
import { SquareMask } from './squareSet';
import type { Color, Piece, Square } from './types';
import { charToPieceRole, isDefined, squareToName, parseSquareName, pieceRoleToChar, getFile, coordsToSquare } from './util';

export const STARTING_BOARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const EMPTY_POSITION_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';

const COLORS: readonly Color[] = ['white', 'black'];
const FILE_CHARS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const fenCharToPiece = (ch: string): Piece | undefined => {
  const role = charToPieceRole(ch);
  return role && { role, color: ch.toLowerCase() === ch ? 'black' : 'white' };
};

/** Parse the board part of a FEN string. */
export const fenToBoard = (boardPart: string): BitBoard | undefined => {
  const board = BitBoard.empty();
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
        const piece = fenCharToPiece(c);
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
export const fenToCastling = (board: BitBoard, castlingPart: string): SquareMask | undefined => {
  let castlingRights = SquareMask.empty();
  if (castlingPart === '-') return castlingRights;

  for (const c of castlingPart) {
    const lower = c.toLowerCase();
    const color: Color = c === lower ? 'black' : 'white';
    const rank = color === 'white' ? 0 : 7;
    if ('a' <= lower && lower <= 'h') {
      const sq = coordsToSquare(lower.charCodeAt(0) - 'a'.charCodeAt(0), rank);
      if (sq !== undefined) castlingRights = castlingRights.with(sq);
    } else if (lower === 'k' || lower === 'q') {
      const rooksAndKings = board[color].intersect(SquareMask.backrank(color)).intersect(board.rook.union(board.king));
      const candidate = lower === 'k' ? rooksAndKings.last() : rooksAndKings.first();
      const sq = coordsToSquare(lower === 'k' ? 7 : 0, rank);
      castlingRights = castlingRights.with(
        isDefined(candidate) && board.rook.has(candidate) ? candidate : sq!,
      );
    } else {
      return undefined;
    }
  }

  return castlingRights;
};

/** Parse a FEN string into a GameSetup. Returns undefined if invalid. */
export const loadFen = (fen: string): GameSetup | undefined => {
  const parts = fen.split(/[\s_]+/);
  const boardPart = parts.shift();
  if (!boardPart) return undefined;

  const board = fenToBoard(boardPart);
  if (!board) return undefined;

  // Turn
  let turn: Color;
  const turnPart = parts.shift();
  if (!isDefined(turnPart) || turnPart === 'w') turn = 'white';
  else if (turnPart === 'b') turn = 'black';
  else return undefined;

  // Castling
  const castlingPart = parts.shift();
  const castlingRights = isDefined(castlingPart) ? fenToCastling(board, castlingPart) : SquareMask.empty();
  if (!castlingRights) return undefined;

  // En passant
  const epPart = parts.shift();
  let epSquare: Square | undefined;
  if (isDefined(epPart) && epPart !== '-') {
    epSquare = parseSquareName(epPart);
    if (!isDefined(epSquare)) return undefined;
  }

  // Halfmoves
  const halfmovePart = parts.shift();
  const halfmoves = isDefined(halfmovePart) && /^\d{1,4}$/.test(halfmovePart) ? parseInt(halfmovePart, 10) : 0;

  // Fullmoves
  const fullmovesPart = parts.shift();
  const fullmoves = isDefined(fullmovesPart) && /^\d{1,4}$/.test(fullmovesPart) ? parseInt(fullmovesPart, 10) : 1;

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
export const pieceToFenChar = (piece: Piece): string => {
  let r = pieceRoleToChar(piece.role);
  if (piece.color === 'white') r = r.toUpperCase();
  if (piece.promoted) r += '~';
  return r;
};

/** Create the board part of a FEN string. */
export const boardToFen = (board: BitBoard): string => {
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
        fen += pieceToFenChar(piece);
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
export const castlingToFen = (board: BitBoard, castlingRights: SquareMask): string => {
  let fen = '';
  for (const color of COLORS) {
    const backrank = SquareMask.backrank(color);
    let king = board.kingOf(color);
    if (isDefined(king) && !backrank.has(king)) king = undefined;
    const candidates = board.pieces(color, 'rook').intersect(backrank);
    for (const rook of castlingRights.intersect(backrank).reversed()) {
      if (rook === candidates.first() && isDefined(king) && rook < king) {
        fen += color === 'white' ? 'Q' : 'q';
      } else if (rook === candidates.last() && isDefined(king) && king < rook) {
        fen += color === 'white' ? 'K' : 'k';
      } else {
        const file = FILE_CHARS[getFile(rook)];
        fen += color === 'white' ? file.toUpperCase() : file;
      }
    }
  }
  return fen || '-';
};

/** Create a full FEN string from a GameSetup. */
export const toFen = (setup: GameSetup): string =>
  [
    boardToFen(setup.board),
    setup.turn[0],
    castlingToFen(setup.board, setup.castlingRights),
    isDefined(setup.epSquare) ? squareToName(setup.epSquare) : '-',
    Math.max(0, Math.min(setup.halfmoves, 9999)),
    Math.max(1, Math.min(setup.fullmoves, 9999)),
  ].join(' ');

// Backwards compatibility aliases
export const INITIAL_FEN = STARTING_FEN;
export const INITIAL_BOARD_FEN = STARTING_BOARD_FEN;
export const EMPTY_FEN = EMPTY_POSITION_FEN;
export const parseBoardFen = fenToBoard;
export const parseCastlingFen = fenToCastling;
export const parseFen = loadFen;
export const makePiece = pieceToFenChar;
export const makeBoardFen = boardToFen;
export const makeCastlingFen = castlingToFen;
export const makeFen = toFen;
