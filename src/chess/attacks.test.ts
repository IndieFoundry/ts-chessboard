/**
 * Comprehensive tests for attack generation.
 * Tests all piece types including pawns, knights, kings, and sliding pieces.
 */

import { describe, it, expect } from 'vitest';
import {
  computeKingMoves,
  computeKnightMoves,
  computePawnCaptures,
  computeBishopMoves,
  computeRookMoves,
  computeQueenMoves,
  computePieceMoves,
  getSquareRay,
  squaresBetween,
} from './attacks';
import { SquareMask } from './squareSet';
import { parseSquareName as sq } from './util';

// Helper to get square number from name
const s = (name: string): number => sq(name)!;

describe('attacks', () => {
  // ============================================
  // Pawn Attacks
  // ============================================
  describe('computePawnCaptures', () => {
    describe('white pawns', () => {
      it('should attack diagonally forward from e4', () => {
        const attacks = computePawnCaptures('white', s('e4'));
        expect(attacks.size()).toBe(2);
        expect(attacks.has(s('d5'))).toBe(true);
        expect(attacks.has(s('f5'))).toBe(true);
      });

      it('should attack one square from a-file (a4)', () => {
        const attacks = computePawnCaptures('white', s('a4'));
        expect(attacks.size()).toBe(1);
        expect(attacks.has(s('b5'))).toBe(true);
      });

      it('should attack one square from h-file (h4)', () => {
        const attacks = computePawnCaptures('white', s('h4'));
        expect(attacks.size()).toBe(1);
        expect(attacks.has(s('g5'))).toBe(true);
      });

      it('should attack from a2', () => {
        const attacks = computePawnCaptures('white', s('a2'));
        expect(attacks.size()).toBe(1);
        expect(attacks.has(s('b3'))).toBe(true);
      });

      it('should attack from h7', () => {
        const attacks = computePawnCaptures('white', s('h7'));
        expect(attacks.size()).toBe(1);
        expect(attacks.has(s('g8'))).toBe(true);
      });
    });

    describe('black pawns', () => {
      it('should attack diagonally backward from e5', () => {
        const attacks = computePawnCaptures('black', s('e5'));
        expect(attacks.size()).toBe(2);
        expect(attacks.has(s('d4'))).toBe(true);
        expect(attacks.has(s('f4'))).toBe(true);
      });

      it('should attack one square from a-file (a5)', () => {
        const attacks = computePawnCaptures('black', s('a5'));
        expect(attacks.size()).toBe(1);
        expect(attacks.has(s('b4'))).toBe(true);
      });

      it('should attack one square from h-file (h5)', () => {
        const attacks = computePawnCaptures('black', s('h5'));
        expect(attacks.size()).toBe(1);
        expect(attacks.has(s('g4'))).toBe(true);
      });

      it('should attack from a7', () => {
        const attacks = computePawnCaptures('black', s('a7'));
        expect(attacks.size()).toBe(1);
        expect(attacks.has(s('b6'))).toBe(true);
      });

      it('should attack from h2', () => {
        const attacks = computePawnCaptures('black', s('h2'));
        expect(attacks.size()).toBe(1);
        expect(attacks.has(s('g1'))).toBe(true);
      });
    });

    it('white and black pawns on same square attack opposite directions', () => {
      const whiteAttacks = computePawnCaptures('white', s('d4'));
      const blackAttacks = computePawnCaptures('black', s('d4'));
      expect(whiteAttacks.isDisjoint(blackAttacks)).toBe(true);
    });
  });

  // ============================================
  // Knight Attacks
  // ============================================
  describe('computeKnightMoves', () => {
    it('should attack 8 squares from center (e4)', () => {
      const attacks = computeKnightMoves(s('e4'));
      expect(attacks.size()).toBe(8);
      expect(attacks.has(s('d6'))).toBe(true);
      expect(attacks.has(s('f6'))).toBe(true);
      expect(attacks.has(s('g5'))).toBe(true);
      expect(attacks.has(s('g3'))).toBe(true);
      expect(attacks.has(s('f2'))).toBe(true);
      expect(attacks.has(s('d2'))).toBe(true);
      expect(attacks.has(s('c3'))).toBe(true);
      expect(attacks.has(s('c5'))).toBe(true);
    });

    it('should attack 2 squares from corner (a1)', () => {
      const attacks = computeKnightMoves(s('a1'));
      expect(attacks.size()).toBe(2);
      expect(attacks.has(s('b3'))).toBe(true);
      expect(attacks.has(s('c2'))).toBe(true);
    });

    it('should attack 2 squares from corner (h1)', () => {
      const attacks = computeKnightMoves(s('h1'));
      expect(attacks.size()).toBe(2);
      expect(attacks.has(s('g3'))).toBe(true);
      expect(attacks.has(s('f2'))).toBe(true);
    });

    it('should attack 2 squares from corner (a8)', () => {
      const attacks = computeKnightMoves(s('a8'));
      expect(attacks.size()).toBe(2);
      expect(attacks.has(s('b6'))).toBe(true);
      expect(attacks.has(s('c7'))).toBe(true);
    });

    it('should attack 2 squares from corner (h8)', () => {
      const attacks = computeKnightMoves(s('h8'));
      expect(attacks.size()).toBe(2);
      expect(attacks.has(s('g6'))).toBe(true);
      expect(attacks.has(s('f7'))).toBe(true);
    });

    it('should attack 3 squares from edge (a2)', () => {
      const attacks = computeKnightMoves(s('a2'));
      expect(attacks.size()).toBe(3);
    });

    it('should attack 4 squares from edge (b1)', () => {
      const attacks = computeKnightMoves(s('b1'));
      expect(attacks.size()).toBe(3);
    });

    it('should attack 4 squares from b2', () => {
      const attacks = computeKnightMoves(s('b2'));
      expect(attacks.size()).toBe(4);
    });

    it('should attack 8 squares from c3 (not on edge)', () => {
      const attacks = computeKnightMoves(s('c3'));
      expect(attacks.size()).toBe(8);
    });
  });

  // ============================================
  // King Attacks
  // ============================================
  describe('computeKingMoves', () => {
    it('should attack 8 squares from center (e4)', () => {
      const attacks = computeKingMoves(s('e4'));
      expect(attacks.size()).toBe(8);
      expect(attacks.has(s('d5'))).toBe(true);
      expect(attacks.has(s('e5'))).toBe(true);
      expect(attacks.has(s('f5'))).toBe(true);
      expect(attacks.has(s('d4'))).toBe(true);
      expect(attacks.has(s('f4'))).toBe(true);
      expect(attacks.has(s('d3'))).toBe(true);
      expect(attacks.has(s('e3'))).toBe(true);
      expect(attacks.has(s('f3'))).toBe(true);
    });

    it('should attack 3 squares from corner (a1)', () => {
      const attacks = computeKingMoves(s('a1'));
      expect(attacks.size()).toBe(3);
      expect(attacks.has(s('a2'))).toBe(true);
      expect(attacks.has(s('b1'))).toBe(true);
      expect(attacks.has(s('b2'))).toBe(true);
    });

    it('should attack 3 squares from corner (h8)', () => {
      const attacks = computeKingMoves(s('h8'));
      expect(attacks.size()).toBe(3);
      expect(attacks.has(s('g8'))).toBe(true);
      expect(attacks.has(s('h7'))).toBe(true);
      expect(attacks.has(s('g7'))).toBe(true);
    });

    it('should attack 5 squares from edge (a4)', () => {
      const attacks = computeKingMoves(s('a4'));
      expect(attacks.size()).toBe(5);
    });

    it('should attack 5 squares from edge (e1)', () => {
      const attacks = computeKingMoves(s('e1'));
      expect(attacks.size()).toBe(5);
    });
  });

  // ============================================
  // Bishop Attacks
  // ============================================
  describe('computeBishopMoves', () => {
    it('should attack all diagonals from e4 on empty board', () => {
      const attacks = computeBishopMoves(s('e4'), SquareMask.empty());
      // e4 can reach: d5,c6,b7,a8 (4) + f5,g6,h7 (3) + d3,c2,b1 (3) + f3,g2,h1 (3) = 13
      expect(attacks.size()).toBe(13);
      // Check some specific squares
      expect(attacks.has(s('a8'))).toBe(true);
      expect(attacks.has(s('h7'))).toBe(true);
      expect(attacks.has(s('b1'))).toBe(true);
      expect(attacks.has(s('h1'))).toBe(true);
    });

    it('should attack 7 squares from corner (a1) on empty board', () => {
      const attacks = computeBishopMoves(s('a1'), SquareMask.empty());
      expect(attacks.size()).toBe(7);
      // Should reach b2, c3, d4, e5, f6, g7, h8
      for (let i = 1; i <= 7; i++) {
        expect(attacks.has(9 * i)).toBe(true); // diagonal squares
      }
    });

    it('should be blocked by occupied squares', () => {
      const occupied = SquareMask.fromSquare(s('c6')).union(SquareMask.fromSquare(s('g2')));
      const attacks = computeBishopMoves(s('e4'), occupied);
      // Blocked by c6 on one diagonal, g2 on another
      expect(attacks.has(s('c6'))).toBe(true);  // Can capture blocker
      expect(attacks.has(s('b7'))).toBe(false); // Blocked
      expect(attacks.has(s('a8'))).toBe(false); // Blocked
      expect(attacks.has(s('g2'))).toBe(true);  // Can capture blocker
      expect(attacks.has(s('h1'))).toBe(false); // Blocked
    });

    it('should not include own square', () => {
      const attacks = computeBishopMoves(s('d4'), SquareMask.empty());
      expect(attacks.has(s('d4'))).toBe(false);
    });

    it('should attack correct diagonals from h1', () => {
      const attacks = computeBishopMoves(s('h1'), SquareMask.empty());
      expect(attacks.size()).toBe(7);
      expect(attacks.has(s('g2'))).toBe(true);
      expect(attacks.has(s('a8'))).toBe(true);
    });

    it('should attack correct diagonals from a8', () => {
      const attacks = computeBishopMoves(s('a8'), SquareMask.empty());
      expect(attacks.size()).toBe(7);
      expect(attacks.has(s('b7'))).toBe(true);
      expect(attacks.has(s('h1'))).toBe(true);
    });
  });

  // ============================================
  // Rook Attacks
  // ============================================
  describe('computeRookMoves', () => {
    it('should attack file and rank from e4 on empty board', () => {
      const attacks = computeRookMoves(s('e4'), SquareMask.empty());
      // e-file: 7 squares, 4th rank: 7 squares = 14 total
      expect(attacks.size()).toBe(14);
      // Check file
      expect(attacks.has(s('e1'))).toBe(true);
      expect(attacks.has(s('e8'))).toBe(true);
      // Check rank
      expect(attacks.has(s('a4'))).toBe(true);
      expect(attacks.has(s('h4'))).toBe(true);
    });

    it('should attack 14 squares from corner (a1) on empty board', () => {
      const attacks = computeRookMoves(s('a1'), SquareMask.empty());
      expect(attacks.size()).toBe(14);
    });

    it('should be blocked by occupied squares on file', () => {
      const occupied = SquareMask.fromSquare(s('e6'));
      const attacks = computeRookMoves(s('e4'), occupied);
      expect(attacks.has(s('e5'))).toBe(true);
      expect(attacks.has(s('e6'))).toBe(true);  // Can capture blocker
      expect(attacks.has(s('e7'))).toBe(false); // Blocked
      expect(attacks.has(s('e8'))).toBe(false); // Blocked
    });

    it('should be blocked by occupied squares on rank', () => {
      const occupied = SquareMask.fromSquare(s('b4'));
      const attacks = computeRookMoves(s('e4'), occupied);
      expect(attacks.has(s('c4'))).toBe(true);
      expect(attacks.has(s('b4'))).toBe(true);  // Can capture blocker
      expect(attacks.has(s('a4'))).toBe(false); // Blocked
    });

    it('should not include own square', () => {
      const attacks = computeRookMoves(s('d4'), SquareMask.empty());
      expect(attacks.has(s('d4'))).toBe(false);
    });
  });

  // ============================================
  // Queen Attacks
  // ============================================
  describe('computeQueenMoves', () => {
    it('should combine bishop and rook attacks from e4', () => {
      const queen = computeQueenMoves(s('e4'), SquareMask.empty());
      const bishop = computeBishopMoves(s('e4'), SquareMask.empty());
      const rook = computeRookMoves(s('e4'), SquareMask.empty());

      // Queen should attack everything bishop and rook attack
      expect(queen.equals(bishop.union(rook))).toBe(true);
      expect(queen.size()).toBe(13 + 14); // 27 squares
    });

    it('should be blocked same as components', () => {
      const occupied = SquareMask.fromSquare(s('e6')).union(SquareMask.fromSquare(s('g6')));
      const queen = computeQueenMoves(s('e4'), occupied);
      const bishop = computeBishopMoves(s('e4'), occupied);
      const rook = computeRookMoves(s('e4'), occupied);

      expect(queen.equals(bishop.union(rook))).toBe(true);
    });

    it('should attack 21 squares from corner on empty board', () => {
      const attacks = computeQueenMoves(s('a1'), SquareMask.empty());
      // Bishop: 7, Rook: 14 = 21
      expect(attacks.size()).toBe(21);
    });
  });

  // ============================================
  // computePieceMoves (generic)
  // ============================================
  describe('computePieceMoves', () => {
    const occupied = SquareMask.empty();

    it('should return pawn captures for pawn', () => {
      const attacks = computePieceMoves({ role: 'pawn', color: 'white' }, s('e4'), occupied);
      expect(attacks.equals(computePawnCaptures('white', s('e4')))).toBe(true);
    });

    it('should return knight attacks for knight', () => {
      const attacks = computePieceMoves({ role: 'knight', color: 'white' }, s('e4'), occupied);
      expect(attacks.equals(computeKnightMoves(s('e4')))).toBe(true);
    });

    it('should return bishop attacks for bishop', () => {
      const attacks = computePieceMoves({ role: 'bishop', color: 'white' }, s('e4'), occupied);
      expect(attacks.equals(computeBishopMoves(s('e4'), occupied))).toBe(true);
    });

    it('should return rook attacks for rook', () => {
      const attacks = computePieceMoves({ role: 'rook', color: 'white' }, s('e4'), occupied);
      expect(attacks.equals(computeRookMoves(s('e4'), occupied))).toBe(true);
    });

    it('should return queen attacks for queen', () => {
      const attacks = computePieceMoves({ role: 'queen', color: 'white' }, s('e4'), occupied);
      expect(attacks.equals(computeQueenMoves(s('e4'), occupied))).toBe(true);
    });

    it('should return king attacks for king', () => {
      const attacks = computePieceMoves({ role: 'king', color: 'white' }, s('e4'), occupied);
      expect(attacks.equals(computeKingMoves(s('e4')))).toBe(true);
    });
  });

  // ============================================
  // Ray (getSquareRay)
  // ============================================
  describe('getSquareRay', () => {
    it('should return file ray for aligned squares on same file', () => {
      const ray = getSquareRay(s('e2'), s('e7'));
      expect(ray.has(s('e1'))).toBe(true);
      expect(ray.has(s('e2'))).toBe(true);
      expect(ray.has(s('e3'))).toBe(true);
      expect(ray.has(s('e7'))).toBe(true);
      expect(ray.has(s('e8'))).toBe(true);
      expect(ray.has(s('d2'))).toBe(false);
    });

    it('should return rank ray for aligned squares on same rank', () => {
      const ray = getSquareRay(s('b4'), s('g4'));
      expect(ray.has(s('a4'))).toBe(true);
      expect(ray.has(s('b4'))).toBe(true);
      expect(ray.has(s('g4'))).toBe(true);
      expect(ray.has(s('h4'))).toBe(true);
      expect(ray.has(s('b5'))).toBe(false);
    });

    it('should return diagonal ray for aligned squares on diagonal', () => {
      const ray = getSquareRay(s('b2'), s('g7'));
      expect(ray.has(s('a1'))).toBe(true);
      expect(ray.has(s('b2'))).toBe(true);
      expect(ray.has(s('g7'))).toBe(true);
      expect(ray.has(s('h8'))).toBe(true);
      expect(ray.has(s('c2'))).toBe(false);
    });

    it('should return anti-diagonal ray', () => {
      const ray = getSquareRay(s('b7'), s('g2'));
      expect(ray.has(s('a8'))).toBe(true);
      expect(ray.has(s('b7'))).toBe(true);
      expect(ray.has(s('g2'))).toBe(true);
      expect(ray.has(s('h1'))).toBe(true);
    });

    it('should return empty for non-aligned squares', () => {
      const ray = getSquareRay(s('e4'), s('g5'));
      expect(ray.isEmpty()).toBe(true);
    });

    it('should return empty for knight-move squares', () => {
      const ray = getSquareRay(s('e4'), s('f6'));
      expect(ray.isEmpty()).toBe(true);
    });

    it('should include both endpoints', () => {
      const ray = getSquareRay(s('a1'), s('h8'));
      expect(ray.has(s('a1'))).toBe(true);
      expect(ray.has(s('h8'))).toBe(true);
    });
  });

  // ============================================
  // Between (squaresBetween)
  // ============================================
  describe('squaresBetween', () => {
    it('should return squares between on file (exclusive)', () => {
      const between = squaresBetween(s('e2'), s('e6'));
      expect(between.size()).toBe(3);
      expect(between.has(s('e3'))).toBe(true);
      expect(between.has(s('e4'))).toBe(true);
      expect(between.has(s('e5'))).toBe(true);
      expect(between.has(s('e2'))).toBe(false); // Excluded
      expect(between.has(s('e6'))).toBe(false); // Excluded
    });

    it('should return squares between on rank (exclusive)', () => {
      const between = squaresBetween(s('b4'), s('f4'));
      expect(between.size()).toBe(3);
      expect(between.has(s('c4'))).toBe(true);
      expect(between.has(s('d4'))).toBe(true);
      expect(between.has(s('e4'))).toBe(true);
      expect(between.has(s('b4'))).toBe(false);
      expect(between.has(s('f4'))).toBe(false);
    });

    it('should return squares between on diagonal', () => {
      const between = squaresBetween(s('b2'), s('f6'));
      expect(between.size()).toBe(3);
      expect(between.has(s('c3'))).toBe(true);
      expect(between.has(s('d4'))).toBe(true);
      expect(between.has(s('e5'))).toBe(true);
    });

    it('should return empty for adjacent squares', () => {
      const between = squaresBetween(s('e4'), s('e5'));
      expect(between.isEmpty()).toBe(true);
    });

    it('should return empty for same square', () => {
      const between = squaresBetween(s('e4'), s('e4'));
      expect(between.isEmpty()).toBe(true);
    });

    it('should return empty for non-aligned squares', () => {
      const between = squaresBetween(s('e4'), s('g5'));
      expect(between.isEmpty()).toBe(true);
    });

    it('should work with reversed order', () => {
      const between1 = squaresBetween(s('e2'), s('e6'));
      const between2 = squaresBetween(s('e6'), s('e2'));
      // Between should be the same regardless of order
      expect(between1.size()).toBe(between2.size());
    });

    it('should return full diagonal between corners', () => {
      const between = squaresBetween(s('a1'), s('h8'));
      expect(between.size()).toBe(6); // b2 to g7
    });
  });

  // ============================================
  // Edge Cases and Comprehensive Tests
  // ============================================
  describe('edge cases', () => {
    it('all piece attacks should not include own square', () => {
      for (let sq = 0; sq < 64; sq++) {
        expect(computeKingMoves(sq).has(sq)).toBe(false);
        expect(computeKnightMoves(sq).has(sq)).toBe(false);
        expect(computeBishopMoves(sq, SquareMask.empty()).has(sq)).toBe(false);
        expect(computeRookMoves(sq, SquareMask.empty()).has(sq)).toBe(false);
        expect(computeQueenMoves(sq, SquareMask.empty()).has(sq)).toBe(false);
      }
    });

    it('knight attacks should be symmetric (if a attacks b, b attacks a)', () => {
      for (let sq = 0; sq < 64; sq++) {
        const attacks = computeKnightMoves(sq);
        for (const target of attacks) {
          expect(computeKnightMoves(target).has(sq)).toBe(true);
        }
      }
    });

    it('king attacks should be symmetric', () => {
      for (let sq = 0; sq < 64; sq++) {
        const attacks = computeKingMoves(sq);
        for (const target of attacks) {
          expect(computeKingMoves(target).has(sq)).toBe(true);
        }
      }
    });

    it('rook on empty board covers exactly 14 squares', () => {
      for (let sq = 0; sq < 64; sq++) {
        expect(computeRookMoves(sq, SquareMask.empty()).size()).toBe(14);
      }
    });

    it('queen on empty board covers between 21 and 27 squares', () => {
      for (let sq = 0; sq < 64; sq++) {
        const size = computeQueenMoves(sq, SquareMask.empty()).size();
        expect(size).toBeGreaterThanOrEqual(21);
        expect(size).toBeLessThanOrEqual(27);
      }
    });

    it('bishop attacks should be on same color squares', () => {
      const lightSquares = SquareMask.lightSquares();
      const darkSquares = SquareMask.darkSquares();

      // Bishop on light square attacks only light squares
      const bishopOnLight = computeBishopMoves(s('b1'), SquareMask.empty()); // b1 is light
      expect(bishopOnLight.intersect(darkSquares).isEmpty()).toBe(true);

      // Bishop on dark square attacks only dark squares
      const bishopOnDark = computeBishopMoves(s('a1'), SquareMask.empty()); // a1 is dark
      expect(bishopOnDark.intersect(lightSquares).isEmpty()).toBe(true);
    });
  });
});
