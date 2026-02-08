/**
 * Comprehensive tests for BitBoard.
 * Tests piece storage, retrieval, and manipulation.
 */

import { describe, it, expect } from 'vitest';
import { BitBoard } from './board';
import { SquareMask } from './squareSet';
import { parseSquareName as sq } from './util';
import type { Piece, Color } from './types';

// Helper to get square number from name
const s = (name: string): number => sq(name)!;

describe('BitBoard', () => {
  // ============================================
  // Construction - default()
  // ============================================
  describe('default()', () => {
    it('should create starting position', () => {
      const board = BitBoard.default();
      expect(board.occupied.size()).toBe(32);
    });

    it('should have correct white pieces', () => {
      const board = BitBoard.default();
      expect(board.white.size()).toBe(16);
    });

    it('should have correct black pieces', () => {
      const board = BitBoard.default();
      expect(board.black.size()).toBe(16);
    });

    it('should have 16 pawns total', () => {
      const board = BitBoard.default();
      expect(board.pawn.size()).toBe(16);
    });

    it('should have pawns on ranks 2 and 7', () => {
      const board = BitBoard.default();
      // White pawns on rank 2
      for (let file = 0; file < 8; file++) {
        expect(board.get(8 + file)).toEqual({ role: 'pawn', color: 'white', promoted: false });
      }
      // Black pawns on rank 7
      for (let file = 0; file < 8; file++) {
        expect(board.get(48 + file)).toEqual({ role: 'pawn', color: 'black', promoted: false });
      }
    });

    it('should have knights on b1, g1, b8, g8', () => {
      const board = BitBoard.default();
      expect(board.get(s('b1'))).toEqual({ role: 'knight', color: 'white', promoted: false });
      expect(board.get(s('g1'))).toEqual({ role: 'knight', color: 'white', promoted: false });
      expect(board.get(s('b8'))).toEqual({ role: 'knight', color: 'black', promoted: false });
      expect(board.get(s('g8'))).toEqual({ role: 'knight', color: 'black', promoted: false });
    });

    it('should have bishops on c1, f1, c8, f8', () => {
      const board = BitBoard.default();
      expect(board.get(s('c1'))).toEqual({ role: 'bishop', color: 'white', promoted: false });
      expect(board.get(s('f1'))).toEqual({ role: 'bishop', color: 'white', promoted: false });
      expect(board.get(s('c8'))).toEqual({ role: 'bishop', color: 'black', promoted: false });
      expect(board.get(s('f8'))).toEqual({ role: 'bishop', color: 'black', promoted: false });
    });

    it('should have rooks on a1, h1, a8, h8', () => {
      const board = BitBoard.default();
      expect(board.get(s('a1'))).toEqual({ role: 'rook', color: 'white', promoted: false });
      expect(board.get(s('h1'))).toEqual({ role: 'rook', color: 'white', promoted: false });
      expect(board.get(s('a8'))).toEqual({ role: 'rook', color: 'black', promoted: false });
      expect(board.get(s('h8'))).toEqual({ role: 'rook', color: 'black', promoted: false });
    });

    it('should have queens on d1, d8', () => {
      const board = BitBoard.default();
      expect(board.get(s('d1'))).toEqual({ role: 'queen', color: 'white', promoted: false });
      expect(board.get(s('d8'))).toEqual({ role: 'queen', color: 'black', promoted: false });
    });

    it('should have kings on e1, e8', () => {
      const board = BitBoard.default();
      expect(board.get(s('e1'))).toEqual({ role: 'king', color: 'white', promoted: false });
      expect(board.get(s('e8'))).toEqual({ role: 'king', color: 'black', promoted: false });
    });

    it('should have 4 knights total', () => {
      const board = BitBoard.default();
      expect(board.knight.size()).toBe(4);
    });

    it('should have 4 bishops total', () => {
      const board = BitBoard.default();
      expect(board.bishop.size()).toBe(4);
    });

    it('should have 4 rooks total', () => {
      const board = BitBoard.default();
      expect(board.rook.size()).toBe(4);
    });

    it('should have 2 queens total', () => {
      const board = BitBoard.default();
      expect(board.queen.size()).toBe(2);
    });

    it('should have 2 kings total', () => {
      const board = BitBoard.default();
      expect(board.king.size()).toBe(2);
    });

    it('should have no promoted pieces', () => {
      const board = BitBoard.default();
      expect(board.promoted.isEmpty()).toBe(true);
    });
  });

  // ============================================
  // Construction - empty()
  // ============================================
  describe('empty()', () => {
    it('should create empty board', () => {
      const board = BitBoard.empty();
      expect(board.occupied.isEmpty()).toBe(true);
    });

    it('should have no pieces of any color', () => {
      const board = BitBoard.empty();
      expect(board.white.isEmpty()).toBe(true);
      expect(board.black.isEmpty()).toBe(true);
    });

    it('should have no pieces of any role', () => {
      const board = BitBoard.empty();
      expect(board.pawn.isEmpty()).toBe(true);
      expect(board.knight.isEmpty()).toBe(true);
      expect(board.bishop.isEmpty()).toBe(true);
      expect(board.rook.isEmpty()).toBe(true);
      expect(board.queen.isEmpty()).toBe(true);
      expect(board.king.isEmpty()).toBe(true);
    });

    it('should have no promoted pieces', () => {
      const board = BitBoard.empty();
      expect(board.promoted.isEmpty()).toBe(true);
    });

    it('get should return undefined for all squares', () => {
      const board = BitBoard.empty();
      for (let sq = 0; sq < 64; sq++) {
        expect(board.get(sq)).toBeUndefined();
      }
    });
  });

  // ============================================
  // get/set/take
  // ============================================
  describe('get', () => {
    it('should return piece at square', () => {
      const board = BitBoard.default();
      expect(board.get(s('e2'))).toEqual({ role: 'pawn', color: 'white', promoted: false });
    });

    it('should return undefined for empty square', () => {
      const board = BitBoard.default();
      expect(board.get(s('e4'))).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should place piece on empty square', () => {
      const board = BitBoard.empty();
      const piece: Piece = { role: 'queen', color: 'white' };
      const old = board.set(s('d4'), piece);

      expect(old).toBeUndefined();
      expect(board.get(s('d4'))).toEqual({ role: 'queen', color: 'white', promoted: false });
      expect(board.occupied.size()).toBe(1);
    });

    it('should replace existing piece', () => {
      const board = BitBoard.default();
      const piece: Piece = { role: 'queen', color: 'black' };
      const old = board.set(s('e2'), piece);

      expect(old).toEqual({ role: 'pawn', color: 'white', promoted: false });
      expect(board.get(s('e2'))).toEqual({ role: 'queen', color: 'black', promoted: false });
    });

    it('should handle promoted pieces', () => {
      const board = BitBoard.empty();
      const piece: Piece = { role: 'queen', color: 'white', promoted: true };
      board.set(s('e8'), piece);

      expect(board.get(s('e8'))).toEqual({ role: 'queen', color: 'white', promoted: true });
      expect(board.promoted.has(s('e8'))).toBe(true);
    });

    it('should update all bitboards correctly', () => {
      const board = BitBoard.empty();
      board.set(s('a1'), { role: 'rook', color: 'white' });
      board.set(s('h8'), { role: 'rook', color: 'black' });

      expect(board.occupied.size()).toBe(2);
      expect(board.white.size()).toBe(1);
      expect(board.black.size()).toBe(1);
      expect(board.rook.size()).toBe(2);
    });
  });

  describe('take', () => {
    it('should remove and return piece', () => {
      const board = BitBoard.default();
      const piece = board.take(s('e2'));

      expect(piece).toEqual({ role: 'pawn', color: 'white', promoted: false });
      expect(board.get(s('e2'))).toBeUndefined();
      expect(board.occupied.size()).toBe(31);
    });

    it('should return undefined for empty square', () => {
      const board = BitBoard.empty();
      expect(board.take(s('e4'))).toBeUndefined();
    });

    it('should update all bitboards correctly', () => {
      const board = BitBoard.default();
      board.take(s('e1')); // Remove white king

      expect(board.king.size()).toBe(1);
      expect(board.white.size()).toBe(15);
      expect(board.occupied.size()).toBe(31);
    });

    it('should clear promoted flag when taking promoted piece', () => {
      const board = BitBoard.empty();
      board.set(s('e8'), { role: 'queen', color: 'white', promoted: true });
      expect(board.promoted.has(s('e8'))).toBe(true);

      board.take(s('e8'));
      expect(board.promoted.has(s('e8'))).toBe(false);
    });
  });

  // ============================================
  // has
  // ============================================
  describe('has', () => {
    it('should return true for occupied squares', () => {
      const board = BitBoard.default();
      expect(board.has(s('e1'))).toBe(true);
      expect(board.has(s('e2'))).toBe(true);
    });

    it('should return false for empty squares', () => {
      const board = BitBoard.default();
      expect(board.has(s('e4'))).toBe(false);
      expect(board.has(s('e5'))).toBe(false);
    });
  });

  // ============================================
  // getColor/getRole
  // ============================================
  describe('getColor', () => {
    it('should return white for white pieces', () => {
      const board = BitBoard.default();
      expect(board.getColor(s('e1'))).toBe('white');
      expect(board.getColor(s('e2'))).toBe('white');
    });

    it('should return black for black pieces', () => {
      const board = BitBoard.default();
      expect(board.getColor(s('e8'))).toBe('black');
      expect(board.getColor(s('e7'))).toBe('black');
    });

    it('should return undefined for empty squares', () => {
      const board = BitBoard.default();
      expect(board.getColor(s('e4'))).toBeUndefined();
    });
  });

  describe('getRole', () => {
    it('should return correct role', () => {
      const board = BitBoard.default();
      expect(board.getRole(s('e1'))).toBe('king');
      expect(board.getRole(s('d1'))).toBe('queen');
      expect(board.getRole(s('a1'))).toBe('rook');
      expect(board.getRole(s('c1'))).toBe('bishop');
      expect(board.getRole(s('b1'))).toBe('knight');
      expect(board.getRole(s('e2'))).toBe('pawn');
    });

    it('should return undefined for empty squares', () => {
      const board = BitBoard.default();
      expect(board.getRole(s('e4'))).toBeUndefined();
    });
  });

  // ============================================
  // kingOf
  // ============================================
  describe('kingOf', () => {
    it('should find white king', () => {
      const board = BitBoard.default();
      expect(board.kingOf('white')).toBe(s('e1'));
    });

    it('should find black king', () => {
      const board = BitBoard.default();
      expect(board.kingOf('black')).toBe(s('e8'));
    });

    it('should return undefined when no king', () => {
      const board = BitBoard.empty();
      expect(board.kingOf('white')).toBeUndefined();
      expect(board.kingOf('black')).toBeUndefined();
    });

    it('should return undefined when multiple kings', () => {
      const board = BitBoard.empty();
      board.set(s('e1'), { role: 'king', color: 'white' });
      board.set(s('e2'), { role: 'king', color: 'white' });
      // When there are multiple kings, singleSquare returns undefined
      expect(board.kingOf('white')).toBeUndefined();
    });
  });

  // ============================================
  // pieces
  // ============================================
  describe('pieces', () => {
    it('should return white pawns', () => {
      const board = BitBoard.default();
      const whitePawns = board.pieces('white', 'pawn');
      expect(whitePawns.size()).toBe(8);
      expect(whitePawns.equals(SquareMask.fromRank(1))).toBe(true);
    });

    it('should return black pawns', () => {
      const board = BitBoard.default();
      const blackPawns = board.pieces('black', 'pawn');
      expect(blackPawns.size()).toBe(8);
      expect(blackPawns.equals(SquareMask.fromRank(6))).toBe(true);
    });

    it('should return white knights', () => {
      const board = BitBoard.default();
      const whiteKnights = board.pieces('white', 'knight');
      expect(whiteKnights.size()).toBe(2);
      expect(whiteKnights.has(s('b1'))).toBe(true);
      expect(whiteKnights.has(s('g1'))).toBe(true);
    });

    it('should return empty for non-existent combination', () => {
      const board = BitBoard.default();
      // Remove all white queens
      board.take(s('d1'));
      const whiteQueens = board.pieces('white', 'queen');
      expect(whiteQueens.isEmpty()).toBe(true);
    });
  });

  // ============================================
  // rooksAndQueens/bishopsAndQueens
  // ============================================
  describe('rooksAndQueens', () => {
    it('should return all rooks and queens', () => {
      const board = BitBoard.default();
      const rooksAndQueens = board.rooksAndQueens();
      expect(rooksAndQueens.size()).toBe(6); // 4 rooks + 2 queens
    });
  });

  describe('bishopsAndQueens', () => {
    it('should return all bishops and queens', () => {
      const board = BitBoard.default();
      const bishopsAndQueens = board.bishopsAndQueens();
      expect(bishopsAndQueens.size()).toBe(6); // 4 bishops + 2 queens
    });
  });

  // ============================================
  // clone
  // ============================================
  describe('clone', () => {
    it('should create deep copy', () => {
      const board = BitBoard.default();
      const clone = board.clone();

      // Should be equal
      expect(clone.occupied.equals(board.occupied)).toBe(true);
      expect(clone.white.equals(board.white)).toBe(true);
      expect(clone.black.equals(board.black)).toBe(true);
    });

    it('modifications to clone should not affect original', () => {
      const board = BitBoard.default();
      const clone = board.clone();

      clone.take(s('e2'));

      expect(board.get(s('e2'))).toBeDefined();
      expect(clone.get(s('e2'))).toBeUndefined();
    });

    it('modifications to original should not affect clone', () => {
      const board = BitBoard.default();
      const clone = board.clone();

      board.take(s('e2'));

      expect(board.get(s('e2'))).toBeUndefined();
      expect(clone.get(s('e2'))).toBeDefined();
    });
  });

  // ============================================
  // clear
  // ============================================
  describe('clear', () => {
    it('should empty the board', () => {
      const board = BitBoard.default();
      board.clear();

      expect(board.occupied.isEmpty()).toBe(true);
      expect(board.white.isEmpty()).toBe(true);
      expect(board.black.isEmpty()).toBe(true);
      expect(board.pawn.isEmpty()).toBe(true);
      expect(board.knight.isEmpty()).toBe(true);
      expect(board.bishop.isEmpty()).toBe(true);
      expect(board.rook.isEmpty()).toBe(true);
      expect(board.queen.isEmpty()).toBe(true);
      expect(board.king.isEmpty()).toBe(true);
      expect(board.promoted.isEmpty()).toBe(true);
    });
  });

  // ============================================
  // reset
  // ============================================
  describe('reset', () => {
    it('should restore starting position', () => {
      const board = BitBoard.empty();
      board.set(s('e4'), { role: 'queen', color: 'white' });
      board.reset();

      expect(board.occupied.size()).toBe(32);
      expect(board.get(s('e4'))).toBeUndefined();
      expect(board.get(s('e1'))).toEqual({ role: 'king', color: 'white', promoted: false });
    });
  });

  // ============================================
  // Iterator
  // ============================================
  describe('iterator', () => {
    it('should iterate over all pieces', () => {
      const board = BitBoard.default();
      const pieces = [...board];

      expect(pieces.length).toBe(32);
    });

    it('should yield [square, piece] tuples', () => {
      const board = BitBoard.empty();
      board.set(s('e4'), { role: 'knight', color: 'white' });

      const pieces = [...board];
      expect(pieces.length).toBe(1);
      expect(pieces[0][0]).toBe(s('e4'));
      expect(pieces[0][1]).toEqual({ role: 'knight', color: 'white', promoted: false });
    });

    it('should work with empty board', () => {
      const board = BitBoard.empty();
      const pieces = [...board];
      expect(pieces.length).toBe(0);
    });

    it('should include promoted flag', () => {
      const board = BitBoard.empty();
      board.set(s('e8'), { role: 'queen', color: 'white', promoted: true });

      const pieces = [...board];
      expect(pieces[0][1].promoted).toBe(true);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('edge cases', () => {
    it('should handle multiple operations', () => {
      const board = BitBoard.empty();

      // Add pieces
      board.set(s('a1'), { role: 'rook', color: 'white' });
      board.set(s('h1'), { role: 'rook', color: 'white' });
      board.set(s('e1'), { role: 'king', color: 'white' });

      expect(board.occupied.size()).toBe(3);
      expect(board.white.size()).toBe(3);
      expect(board.rook.size()).toBe(2);
      expect(board.king.size()).toBe(1);

      // Remove a piece
      board.take(s('a1'));
      expect(board.occupied.size()).toBe(2);
      expect(board.rook.size()).toBe(1);

      // Replace a piece
      board.set(s('h1'), { role: 'queen', color: 'black' });
      expect(board.rook.size()).toBe(0);
      expect(board.queen.size()).toBe(1);
      expect(board.white.size()).toBe(1);
      expect(board.black.size()).toBe(1);
    });

    it('should handle all squares', () => {
      const board = BitBoard.empty();

      // Fill all squares with pawns
      for (let sq = 0; sq < 64; sq++) {
        const color: Color = sq < 32 ? 'white' : 'black';
        board.set(sq, { role: 'pawn', color });
      }

      expect(board.occupied.size()).toBe(64);
      expect(board.pawn.size()).toBe(64);
      expect(board.white.size()).toBe(32);
      expect(board.black.size()).toBe(32);

      // Remove all
      for (let sq = 0; sq < 64; sq++) {
        board.take(sq);
      }

      expect(board.occupied.isEmpty()).toBe(true);
    });
  });
});
