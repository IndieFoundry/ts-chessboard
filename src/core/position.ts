/**
 * FEN parsing and writing for chess positions
 */
import type { FEN, Pieces, Role, Key } from './types';
import { files } from './types';
import { pos2key, invRanks } from './squares';

/** Starting position in FEN notation */
export const INITIAL_FEN: FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

/** Maps FEN characters to piece roles */
const ROLE_BY_LETTER: { [letter: string]: Role } = {
  p: 'pawn',
  r: 'rook',
  n: 'knight',
  b: 'bishop',
  q: 'queen',
  k: 'king',
};

/** Maps piece roles to FEN characters */
const LETTER_BY_ROLE: { [role: string]: string } = {
  pawn: 'p',
  rook: 'r',
  knight: 'n',
  bishop: 'b',
  queen: 'q',
  king: 'k',
};

/**
 * Parses a FEN string and returns a Pieces map.
 * Accepts 'start' as an alias for the starting position.
 */
export function parseFen(fen: FEN): Pieces {
  if (fen === 'start') fen = INITIAL_FEN;
  const pieces: Pieces = new Map();
  let row = 7,
    col = 0;
  for (const c of fen) {
    switch (c) {
      case ' ':
      case '[':
        return pieces;
      case '/':
        --row;
        if (row < 0) return pieces;
        col = 0;
        break;
      case '~': {
        const k = pos2key([col - 1, row]);
        const piece = k && pieces.get(k);
        if (piece) piece.promoted = true;
        break;
      }
      default: {
        const nb = c.charCodeAt(0);
        if (nb < 57) col += nb - 48;
        else {
          const role = c.toLowerCase();
          const key = pos2key([col, row]);
          if (key)
            pieces.set(key, {
              role: ROLE_BY_LETTER[role],
              color: c === role ? 'black' : 'white',
            });
          ++col;
        }
      }
    }
  }
  return pieces;
}

/**
 * Converts a Pieces map to a FEN string.
 * Only includes the piece placement part (not turn, castling, etc.)
 */
export function writeFen(pieces: Pieces): FEN {
  return invRanks
    .map(y =>
      files
        .map(x => {
          const piece = pieces.get((x + y) as Key);
          if (piece) {
            let p = LETTER_BY_ROLE[piece.role];
            if (piece.color === 'white') p = p.toUpperCase();
            if (piece.promoted) p += '~';
            return p;
          } else return '1';
        })
        .join(''),
    )
    .join('/')
    .replace(/1{2,}/g, s => s.length.toString());
}
