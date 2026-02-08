/**
 * Chess utility functions for square/piece conversion and UCI parsing.
 * Original implementation for @indiefoundry/chessboard.
 */

import { CastlingSide, Color, FILE_NAMES, isDrop, Move, RANK_NAMES, Role, Square, SquareName } from './types';

export const isDefined = <A>(v: A | undefined): v is A => v !== undefined;

export const flipColor = (color: Color): Color => (color === 'white' ? 'black' : 'white');

export const getRank = (square: Square): number => square >> 3;

export const getFile = (square: Square): number => square & 0x7;

export const coordsToSquare = (file: number, rank: number): Square | undefined =>
  0 <= file && file < 8 && 0 <= rank && rank < 8 ? file + 8 * rank : undefined;

export const pieceRoleToChar = (role: Role): string => {
  switch (role) {
    case 'pawn': return 'p';
    case 'knight': return 'n';
    case 'bishop': return 'b';
    case 'rook': return 'r';
    case 'queen': return 'q';
    case 'king': return 'k';
  }
};

export function charToPieceRole(ch: string): Role | undefined {
  switch (ch.toLowerCase()) {
    case 'p': return 'pawn';
    case 'n': return 'knight';
    case 'b': return 'bishop';
    case 'r': return 'rook';
    case 'q': return 'queen';
    case 'k': return 'king';
    default: return;
  }
}

export function parseSquareName(str: string): Square | undefined {
  if (str.length !== 2) return;
  return coordsToSquare(str.charCodeAt(0) - 'a'.charCodeAt(0), str.charCodeAt(1) - '1'.charCodeAt(0));
}

export const squareToName = (square: Square): SquareName =>
  (FILE_NAMES[getFile(square)] + RANK_NAMES[getRank(square)]) as SquareName;

export const parseUciMove = (str: string): Move | undefined => {
  if (str[1] === '@' && str.length === 4) {
    const role = charToPieceRole(str[0]);
    const to = parseSquareName(str.slice(2));
    if (role && isDefined(to)) return { role, to };
  } else if (str.length === 4 || str.length === 5) {
    const from = parseSquareName(str.slice(0, 2));
    const to = parseSquareName(str.slice(2, 4));
    let promotion: Role | undefined;
    if (str.length === 5) {
      promotion = charToPieceRole(str[4]);
      if (!promotion) return;
    }
    if (isDefined(from) && isDefined(to)) return { from, to, promotion };
  }
  return;
};

export const moveToUci = (move: Move): string =>
  isDrop(move)
    ? `${pieceRoleToChar(move.role).toUpperCase()}@${squareToName(move.to)}`
    : squareToName(move.from) + squareToName(move.to) + (move.promotion ? pieceRoleToChar(move.promotion) : '');

export const kingCastleTarget = (color: Color, side: CastlingSide): Square =>
  color === 'white' ? (side === 'a' ? 2 : 6) : side === 'a' ? 58 : 62;

export const rookCastleTarget = (color: Color, side: CastlingSide): Square =>
  color === 'white' ? (side === 'a' ? 3 : 5) : side === 'a' ? 59 : 61;

// Backwards compatibility aliases
export const defined = isDefined;
export const opposite = flipColor;
export const squareRank = getRank;
export const squareFile = getFile;
export const squareFromCoords = coordsToSquare;
export const roleToChar = pieceRoleToChar;
export const charToRole = charToPieceRole;
export const parseSquare = parseSquareName;
export const makeSquare = squareToName;
export const parseUci = parseUciMove;
export const makeUci = moveToUci;
export const kingCastlesTo = kingCastleTarget;
export const rookCastlesTo = rookCastleTarget;
