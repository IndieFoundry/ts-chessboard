/**
 * Comprehensive tests for premove calculation.
 * Tests piece mobility for all piece types including castling premoves.
 */

import { describe, it, expect } from 'vitest';
import { calculatePremoves, type PremoveState } from './premoves';
import type { Key, Pieces, Color } from './types';

// Helper to create a pieces map from an object
const makePieces = (obj: Record<string, { role: string; color: string }>): Pieces => {
  const pieces: Pieces = new Map();
  for (const [key, piece] of Object.entries(obj)) {
    pieces.set(key as Key, { role: piece.role as any, color: piece.color as any });
  }
  return pieces;
};

// Helper to create a minimal state for testing
const makeState = (
  pieces: Pieces,
  turnColor: Color,
  lastMove?: Key[],
): PremoveState => ({
  pieces,
  turnColor,
  lastMove,
  premovable: {
    additionalPremoveRequirements: () => true, // No additional requirements
  },
});

describe('premoves', () => {
  describe('calculatePremoves', () => {
    it('should return empty array if piece does not exist', () => {
      const state = makeState(new Map(), 'white');
      expect(calculatePremoves(state, 'e4')).toEqual([]);
    });

    it('should return empty array if it is the piece color turn', () => {
      const pieces = makePieces({ e4: { role: 'pawn', color: 'white' } });
      const state = makeState(pieces, 'white');
      expect(calculatePremoves(state, 'e4')).toEqual([]);
    });

    it('should return destinations when it is opponent turn', () => {
      const pieces = makePieces({ e4: { role: 'pawn', color: 'white' } });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'e4');
      expect(dests.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Pawn Premoves
  // ============================================
  describe('pawn premoves', () => {
    it('should allow white pawn to premove one square forward', () => {
      const pieces = makePieces({ e4: { role: 'pawn', color: 'white' } });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'e4');
      expect(dests).toContain('e5');
    });

    it('should allow black pawn to premove one square forward', () => {
      const pieces = makePieces({ e5: { role: 'pawn', color: 'black' } });
      const state = makeState(pieces, 'white');
      const dests = calculatePremoves(state, 'e5');
      expect(dests).toContain('e4');
    });

    it('should allow white pawn to premove diagonal captures', () => {
      const pieces = makePieces({ e4: { role: 'pawn', color: 'white' } });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'e4');
      expect(dests).toContain('d5');
      expect(dests).toContain('f5');
    });

    it('should allow black pawn to premove diagonal captures', () => {
      const pieces = makePieces({ e5: { role: 'pawn', color: 'black' } });
      const state = makeState(pieces, 'white');
      const dests = calculatePremoves(state, 'e5');
      expect(dests).toContain('d4');
      expect(dests).toContain('f4');
    });

    it('should allow white pawn on starting rank to premove two squares', () => {
      const pieces = makePieces({ e2: { role: 'pawn', color: 'white' } });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'e2');
      expect(dests).toContain('e3');
      expect(dests).toContain('e4');
    });

    it('should allow black pawn on starting rank to premove two squares', () => {
      const pieces = makePieces({ e7: { role: 'pawn', color: 'black' } });
      const state = makeState(pieces, 'white');
      const dests = calculatePremoves(state, 'e7');
      expect(dests).toContain('e6');
      expect(dests).toContain('e5');
    });

    it('should not allow pawn to move backward', () => {
      const pieces = makePieces({ e4: { role: 'pawn', color: 'white' } });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'e4');
      expect(dests).not.toContain('e3');
    });

    it('should handle a-file pawn correctly', () => {
      const pieces = makePieces({ a4: { role: 'pawn', color: 'white' } });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'a4');
      expect(dests).toContain('a5');
      expect(dests).toContain('b5');
      expect(dests).not.toContain('h5'); // No wrap-around
    });

    it('should handle h-file pawn correctly', () => {
      const pieces = makePieces({ h4: { role: 'pawn', color: 'white' } });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'h4');
      expect(dests).toContain('h5');
      expect(dests).toContain('g5');
      expect(dests).not.toContain('a5'); // No wrap-around
    });
  });

  // ============================================
  // Knight Premoves
  // ============================================
  describe('knight premoves', () => {
    it('should have 8 moves from center', () => {
      const pieces = makePieces({ d4: { role: 'knight', color: 'white' } });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'd4');
      expect(dests).toContain('b3');
      expect(dests).toContain('b5');
      expect(dests).toContain('c2');
      expect(dests).toContain('c6');
      expect(dests).toContain('e2');
      expect(dests).toContain('e6');
      expect(dests).toContain('f3');
      expect(dests).toContain('f5');
    });

    it('should have 2 moves from corner', () => {
      const pieces = makePieces({ a1: { role: 'knight', color: 'white' } });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'a1');
      expect(dests).toContain('b3');
      expect(dests).toContain('c2');
      expect(dests.length).toBe(2);
    });

    it('should have 4 moves from edge', () => {
      const pieces = makePieces({ a4: { role: 'knight', color: 'white' } });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'a4');
      expect(dests).toContain('b2');
      expect(dests).toContain('b6');
      expect(dests).toContain('c3');
      expect(dests).toContain('c5');
      expect(dests.length).toBe(4);
    });
  });

  // ============================================
  // Bishop Premoves
  // ============================================
  describe('bishop premoves', () => {
    it('should attack all diagonals', () => {
      const pieces = makePieces({ d4: { role: 'bishop', color: 'white' } });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'd4');
      // NE diagonal
      expect(dests).toContain('e5');
      expect(dests).toContain('f6');
      expect(dests).toContain('g7');
      expect(dests).toContain('h8');
      // NW diagonal
      expect(dests).toContain('c5');
      expect(dests).toContain('b6');
      expect(dests).toContain('a7');
      // SE diagonal
      expect(dests).toContain('e3');
      expect(dests).toContain('f2');
      expect(dests).toContain('g1');
      // SW diagonal
      expect(dests).toContain('c3');
      expect(dests).toContain('b2');
      expect(dests).toContain('a1');
    });

    it('should not move horizontally or vertically', () => {
      const pieces = makePieces({ d4: { role: 'bishop', color: 'white' } });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'd4');
      expect(dests).not.toContain('d5'); // vertical
      expect(dests).not.toContain('e4'); // horizontal
    });

    it('should have limited moves from corner', () => {
      const pieces = makePieces({ a1: { role: 'bishop', color: 'white' } });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'a1');
      expect(dests).toContain('b2');
      expect(dests).toContain('h8');
      expect(dests.length).toBe(7); // a1-h8 diagonal
    });
  });

  // ============================================
  // Rook Premoves
  // ============================================
  describe('rook premoves', () => {
    it('should attack files and ranks', () => {
      const pieces = makePieces({ d4: { role: 'rook', color: 'white' } });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'd4');
      // File
      expect(dests).toContain('d1');
      expect(dests).toContain('d8');
      // Rank
      expect(dests).toContain('a4');
      expect(dests).toContain('h4');
    });

    it('should not move diagonally', () => {
      const pieces = makePieces({ d4: { role: 'rook', color: 'white' } });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'd4');
      expect(dests).not.toContain('e5');
      expect(dests).not.toContain('c3');
    });

    it('should have 14 moves from any position', () => {
      const pieces = makePieces({ d4: { role: 'rook', color: 'white' } });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'd4');
      expect(dests.length).toBe(14); // 7 on file + 7 on rank
    });
  });

  // ============================================
  // Queen Premoves
  // ============================================
  describe('queen premoves', () => {
    it('should attack all directions', () => {
      const pieces = makePieces({ d4: { role: 'queen', color: 'white' } });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'd4');
      // Rook-like moves
      expect(dests).toContain('d1');
      expect(dests).toContain('d8');
      expect(dests).toContain('a4');
      expect(dests).toContain('h4');
      // Bishop-like moves
      expect(dests).toContain('a1');
      expect(dests).toContain('g7');
      expect(dests).toContain('a7');
      expect(dests).toContain('g1');
    });

    it('should have 27 moves from d4', () => {
      const pieces = makePieces({ d4: { role: 'queen', color: 'white' } });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'd4');
      expect(dests.length).toBe(27); // 14 rook + 13 bishop
    });
  });

  // ============================================
  // King Premoves
  // ============================================
  describe('king premoves', () => {
    it('should move one square in all directions', () => {
      const pieces = makePieces({ e4: { role: 'king', color: 'white' } });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'e4');
      expect(dests).toContain('d3');
      expect(dests).toContain('d4');
      expect(dests).toContain('d5');
      expect(dests).toContain('e3');
      expect(dests).toContain('e5');
      expect(dests).toContain('f3');
      expect(dests).toContain('f4');
      expect(dests).toContain('f5');
    });

    it('should have 8 moves from center', () => {
      const pieces = makePieces({ e4: { role: 'king', color: 'white' } });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'e4');
      expect(dests.length).toBe(8);
    });

    it('should have 3 moves from corner', () => {
      const pieces = makePieces({ a1: { role: 'king', color: 'white' } });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'a1');
      expect(dests).toContain('a2');
      expect(dests).toContain('b1');
      expect(dests).toContain('b2');
      expect(dests.length).toBe(3);
    });

    it('should have 5 moves from edge', () => {
      const pieces = makePieces({ e1: { role: 'king', color: 'white' } });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'e1');
      expect(dests).toContain('d1');
      expect(dests).toContain('d2');
      expect(dests).toContain('e2');
      expect(dests).toContain('f1');
      expect(dests).toContain('f2');
    });

    it('should include kingside castling square for white', () => {
      const pieces = makePieces({
        e1: { role: 'king', color: 'white' },
        h1: { role: 'rook', color: 'white' },
      });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'e1');
      expect(dests).toContain('g1'); // Castling destination
      expect(dests).toContain('h1'); // Also can premove to rook square
    });

    it('should include queenside castling square for white', () => {
      const pieces = makePieces({
        e1: { role: 'king', color: 'white' },
        a1: { role: 'rook', color: 'white' },
      });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'e1');
      expect(dests).toContain('c1'); // Castling destination
      expect(dests).toContain('a1'); // Also can premove to rook square
    });

    it('should include kingside castling square for black', () => {
      const pieces = makePieces({
        e8: { role: 'king', color: 'black' },
        h8: { role: 'rook', color: 'black' },
      });
      const state = makeState(pieces, 'white');
      const dests = calculatePremoves(state, 'e8');
      expect(dests).toContain('g8');
      expect(dests).toContain('h8');
    });

    it('should include queenside castling square for black', () => {
      const pieces = makePieces({
        e8: { role: 'king', color: 'black' },
        a8: { role: 'rook', color: 'black' },
      });
      const state = makeState(pieces, 'white');
      const dests = calculatePremoves(state, 'e8');
      expect(dests).toContain('c8');
      expect(dests).toContain('a8');
    });

    it('should not allow castling destination when king is not on e-file', () => {
      const pieces = makePieces({
        d1: { role: 'king', color: 'white' },
        h1: { role: 'rook', color: 'white' },
      });
      const state = makeState(pieces, 'black');
      const dests = calculatePremoves(state, 'd1');
      // g1 is the standard castling destination, should not be included
      expect(dests).not.toContain('g1');
      // Note: h1 is still reachable via rook-click style premove
      // since the rook is a friendly piece on the back rank
      // This is intentional - premoves allow moving to rook squares
    });
  });

  // ============================================
  // Additional Premove Requirements
  // ============================================
  describe('additional premove requirements', () => {
    it('should apply custom filter to destinations', () => {
      const pieces = makePieces({ e4: { role: 'queen', color: 'white' } });
      const state: PremoveState = {
        pieces,
        turnColor: 'black',
        premovable: {
          additionalPremoveRequirements: (ctx) => ctx.dest.key[0] === 'e', // Only e-file
        },
      };
      const dests = calculatePremoves(state, 'e4');
      expect(dests.every(k => k[0] === 'e')).toBe(true);
      expect(dests).toContain('e1');
      expect(dests).toContain('e8');
      expect(dests).not.toContain('d4');
    });

    it('should block all destinations when requirements return false', () => {
      const pieces = makePieces({ e4: { role: 'knight', color: 'white' } });
      const state: PremoveState = {
        pieces,
        turnColor: 'black',
        premovable: {
          additionalPremoveRequirements: () => false,
        },
      };
      const dests = calculatePremoves(state, 'e4');
      expect(dests.length).toBe(0);
    });
  });
});
