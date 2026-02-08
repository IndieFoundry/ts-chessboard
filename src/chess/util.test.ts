/**
 * Comprehensive tests for chess utility functions.
 * Tests square/piece conversion, UCI parsing, and helper functions.
 */

import { describe, it, expect } from 'vitest';
import {
  getRank,
  getFile,
  coordsToSquare,
  pieceRoleToChar,
  charToPieceRole,
  parseSquareName,
  squareToName,
  parseUciMove,
  moveToUci,
  flipColor,
  isDefined,
  kingCastleTarget,
  rookCastleTarget,
} from './util';

describe('util', () => {
  // ============================================
  // getRank / getFile
  // ============================================
  describe('getRank', () => {
    it('should return rank 0 for a1-h1', () => {
      for (let file = 0; file < 8; file++) {
        expect(getRank(file)).toBe(0);
      }
    });

    it('should return rank 7 for a8-h8', () => {
      for (let file = 0; file < 8; file++) {
        expect(getRank(56 + file)).toBe(7);
      }
    });

    it('should return correct rank for all 64 squares', () => {
      for (let sq = 0; sq < 64; sq++) {
        expect(getRank(sq)).toBe(Math.floor(sq / 8));
      }
    });

    it('should return rank 3 for e4 (square 28)', () => {
      expect(getRank(28)).toBe(3);
    });
  });

  describe('getFile', () => {
    it('should return file 0 for a1, a2, ..., a8', () => {
      for (let rank = 0; rank < 8; rank++) {
        expect(getFile(rank * 8)).toBe(0);
      }
    });

    it('should return file 7 for h1, h2, ..., h8', () => {
      for (let rank = 0; rank < 8; rank++) {
        expect(getFile(rank * 8 + 7)).toBe(7);
      }
    });

    it('should return correct file for all 64 squares', () => {
      for (let sq = 0; sq < 64; sq++) {
        expect(getFile(sq)).toBe(sq % 8);
      }
    });

    it('should return file 4 for e4 (square 28)', () => {
      expect(getFile(28)).toBe(4);
    });
  });

  // ============================================
  // coordsToSquare
  // ============================================
  describe('coordsToSquare', () => {
    it('should convert (0,0) to a1 (0)', () => {
      expect(coordsToSquare(0, 0)).toBe(0);
    });

    it('should convert (7,7) to h8 (63)', () => {
      expect(coordsToSquare(7, 7)).toBe(63);
    });

    it('should convert (4,3) to e4 (28)', () => {
      expect(coordsToSquare(4, 3)).toBe(28);
    });

    it('should return undefined for invalid coordinates', () => {
      expect(coordsToSquare(-1, 0)).toBeUndefined();
      expect(coordsToSquare(0, -1)).toBeUndefined();
      expect(coordsToSquare(8, 0)).toBeUndefined();
      expect(coordsToSquare(0, 8)).toBeUndefined();
      expect(coordsToSquare(-1, -1)).toBeUndefined();
      expect(coordsToSquare(8, 8)).toBeUndefined();
    });

    it('should handle all valid coordinates', () => {
      for (let file = 0; file < 8; file++) {
        for (let rank = 0; rank < 8; rank++) {
          const sq = coordsToSquare(file, rank);
          expect(sq).toBeDefined();
          expect(getFile(sq!)).toBe(file);
          expect(getRank(sq!)).toBe(rank);
        }
      }
    });
  });

  // ============================================
  // pieceRoleToChar / charToPieceRole
  // ============================================
  describe('pieceRoleToChar', () => {
    it('should convert pawn to p', () => {
      expect(pieceRoleToChar('pawn')).toBe('p');
    });

    it('should convert knight to n', () => {
      expect(pieceRoleToChar('knight')).toBe('n');
    });

    it('should convert bishop to b', () => {
      expect(pieceRoleToChar('bishop')).toBe('b');
    });

    it('should convert rook to r', () => {
      expect(pieceRoleToChar('rook')).toBe('r');
    });

    it('should convert queen to q', () => {
      expect(pieceRoleToChar('queen')).toBe('q');
    });

    it('should convert king to k', () => {
      expect(pieceRoleToChar('king')).toBe('k');
    });
  });

  describe('charToPieceRole', () => {
    it('should convert p/P to pawn', () => {
      expect(charToPieceRole('p')).toBe('pawn');
      expect(charToPieceRole('P')).toBe('pawn');
    });

    it('should convert n/N to knight', () => {
      expect(charToPieceRole('n')).toBe('knight');
      expect(charToPieceRole('N')).toBe('knight');
    });

    it('should convert b/B to bishop', () => {
      expect(charToPieceRole('b')).toBe('bishop');
      expect(charToPieceRole('B')).toBe('bishop');
    });

    it('should convert r/R to rook', () => {
      expect(charToPieceRole('r')).toBe('rook');
      expect(charToPieceRole('R')).toBe('rook');
    });

    it('should convert q/Q to queen', () => {
      expect(charToPieceRole('q')).toBe('queen');
      expect(charToPieceRole('Q')).toBe('queen');
    });

    it('should convert k/K to king', () => {
      expect(charToPieceRole('k')).toBe('king');
      expect(charToPieceRole('K')).toBe('king');
    });

    it('should return undefined for invalid chars', () => {
      expect(charToPieceRole('x')).toBeUndefined();
      expect(charToPieceRole('1')).toBeUndefined();
      expect(charToPieceRole('')).toBeUndefined();
      expect(charToPieceRole(' ')).toBeUndefined();
    });
  });

  it('pieceRoleToChar and charToPieceRole should be inverses', () => {
    const roles = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'] as const;
    for (const role of roles) {
      expect(charToPieceRole(pieceRoleToChar(role))).toBe(role);
    }
  });

  // ============================================
  // parseSquareName / squareToName
  // ============================================
  describe('parseSquareName', () => {
    it('should parse a1 to 0', () => {
      expect(parseSquareName('a1')).toBe(0);
    });

    it('should parse h8 to 63', () => {
      expect(parseSquareName('h8')).toBe(63);
    });

    it('should parse e4 to 28', () => {
      expect(parseSquareName('e4')).toBe(28);
    });

    it('should parse all valid square names', () => {
      const files = 'abcdefgh';
      const ranks = '12345678';
      for (let f = 0; f < 8; f++) {
        for (let r = 0; r < 8; r++) {
          const name = files[f] + ranks[r];
          const sq = parseSquareName(name);
          expect(sq).toBe(f + r * 8);
        }
      }
    });

    it('should return undefined for invalid names', () => {
      expect(parseSquareName('')).toBeUndefined();
      expect(parseSquareName('a')).toBeUndefined();
      expect(parseSquareName('1')).toBeUndefined();
      expect(parseSquareName('a9')).toBeUndefined();
      expect(parseSquareName('i1')).toBeUndefined();
      expect(parseSquareName('a0')).toBeUndefined();
      expect(parseSquareName('A1')).toBeUndefined(); // Case sensitive
      expect(parseSquareName('a1b')).toBeUndefined(); // Too long
    });
  });

  describe('squareToName', () => {
    it('should convert 0 to a1', () => {
      expect(squareToName(0)).toBe('a1');
    });

    it('should convert 63 to h8', () => {
      expect(squareToName(63)).toBe('h8');
    });

    it('should convert 28 to e4', () => {
      expect(squareToName(28)).toBe('e4');
    });

    it('should convert all 64 squares correctly', () => {
      const files = 'abcdefgh';
      const ranks = '12345678';
      for (let sq = 0; sq < 64; sq++) {
        const expected = files[sq % 8] + ranks[Math.floor(sq / 8)];
        expect(squareToName(sq)).toBe(expected);
      }
    });
  });

  it('parseSquareName and squareToName should be inverses', () => {
    for (let sq = 0; sq < 64; sq++) {
      expect(parseSquareName(squareToName(sq))).toBe(sq);
    }
  });

  // ============================================
  // parseUciMove / moveToUci
  // ============================================
  describe('parseUciMove', () => {
    it('should parse normal move e2e4', () => {
      const move = parseUciMove('e2e4');
      expect(move).toEqual({ from: 12, to: 28 });
    });

    it('should parse normal move a1h8', () => {
      const move = parseUciMove('a1h8');
      expect(move).toEqual({ from: 0, to: 63 });
    });

    it('should parse promotion move e7e8q', () => {
      const move = parseUciMove('e7e8q');
      expect(move).toEqual({ from: 52, to: 60, promotion: 'queen' });
    });

    it('should parse promotion with all piece types', () => {
      expect(parseUciMove('a7a8n')).toEqual({ from: 48, to: 56, promotion: 'knight' });
      expect(parseUciMove('a7a8b')).toEqual({ from: 48, to: 56, promotion: 'bishop' });
      expect(parseUciMove('a7a8r')).toEqual({ from: 48, to: 56, promotion: 'rook' });
      expect(parseUciMove('a7a8q')).toEqual({ from: 48, to: 56, promotion: 'queen' });
    });

    it('should parse drop move (crazyhouse) N@e4', () => {
      const move = parseUciMove('N@e4');
      expect(move).toEqual({ role: 'knight', to: 28 });
    });

    it('should parse drop move with various pieces', () => {
      expect(parseUciMove('P@d4')).toEqual({ role: 'pawn', to: 27 });
      expect(parseUciMove('Q@a1')).toEqual({ role: 'queen', to: 0 });
      expect(parseUciMove('R@h8')).toEqual({ role: 'rook', to: 63 });
    });

    it('should return undefined for invalid moves', () => {
      expect(parseUciMove('')).toBeUndefined();
      expect(parseUciMove('e2')).toBeUndefined();
      expect(parseUciMove('e2e4e6')).toBeUndefined();
      expect(parseUciMove('e2e9')).toBeUndefined();
      expect(parseUciMove('i2e4')).toBeUndefined();
      expect(parseUciMove('e2e4x')).toBeUndefined(); // Invalid promotion piece
    });
  });

  describe('moveToUci', () => {
    it('should convert normal move', () => {
      expect(moveToUci({ from: 12, to: 28 })).toBe('e2e4');
    });

    it('should convert promotion move', () => {
      expect(moveToUci({ from: 52, to: 60, promotion: 'queen' })).toBe('e7e8q');
    });

    it('should convert drop move', () => {
      expect(moveToUci({ role: 'knight', to: 28 })).toBe('N@e4');
    });

    it('should convert all promotion types', () => {
      expect(moveToUci({ from: 48, to: 56, promotion: 'knight' })).toBe('a7a8n');
      expect(moveToUci({ from: 48, to: 56, promotion: 'bishop' })).toBe('a7a8b');
      expect(moveToUci({ from: 48, to: 56, promotion: 'rook' })).toBe('a7a8r');
      expect(moveToUci({ from: 48, to: 56, promotion: 'queen' })).toBe('a7a8q');
    });
  });

  it('parseUciMove and moveToUci should be inverses for normal moves', () => {
    const moves = ['e2e4', 'a1h8', 'd7d8q', 'b2b1n'];
    for (const uci of moves) {
      const move = parseUciMove(uci);
      expect(move).toBeDefined();
      expect(moveToUci(move!)).toBe(uci);
    }
  });

  // ============================================
  // flipColor
  // ============================================
  describe('flipColor', () => {
    it('should flip white to black', () => {
      expect(flipColor('white')).toBe('black');
    });

    it('should flip black to white', () => {
      expect(flipColor('black')).toBe('white');
    });

    it('double flip should return original', () => {
      expect(flipColor(flipColor('white'))).toBe('white');
      expect(flipColor(flipColor('black'))).toBe('black');
    });
  });

  // ============================================
  // isDefined
  // ============================================
  describe('isDefined', () => {
    it('should return true for defined values', () => {
      expect(isDefined(0)).toBe(true);
      expect(isDefined('')).toBe(true);
      expect(isDefined(false)).toBe(true);
      expect(isDefined(null)).toBe(true); // null is defined, just null
      expect(isDefined([])).toBe(true);
      expect(isDefined({})).toBe(true);
    });

    it('should return false for undefined', () => {
      expect(isDefined(undefined)).toBe(false);
    });
  });

  // ============================================
  // kingCastleTarget / rookCastleTarget
  // ============================================
  describe('kingCastleTarget', () => {
    it('should return c1 for white queenside castling', () => {
      expect(kingCastleTarget('white', 'a')).toBe(2); // c1
    });

    it('should return g1 for white kingside castling', () => {
      expect(kingCastleTarget('white', 'h')).toBe(6); // g1
    });

    it('should return c8 for black queenside castling', () => {
      expect(kingCastleTarget('black', 'a')).toBe(58); // c8
    });

    it('should return g8 for black kingside castling', () => {
      expect(kingCastleTarget('black', 'h')).toBe(62); // g8
    });
  });

  describe('rookCastleTarget', () => {
    it('should return d1 for white queenside castling', () => {
      expect(rookCastleTarget('white', 'a')).toBe(3); // d1
    });

    it('should return f1 for white kingside castling', () => {
      expect(rookCastleTarget('white', 'h')).toBe(5); // f1
    });

    it('should return d8 for black queenside castling', () => {
      expect(rookCastleTarget('black', 'a')).toBe(59); // d8
    });

    it('should return f8 for black kingside castling', () => {
      expect(rookCastleTarget('black', 'h')).toBe(61); // f8
    });
  });
});
