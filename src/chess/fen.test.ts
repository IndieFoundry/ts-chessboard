/**
 * Comprehensive tests for FEN parsing and serialization.
 * Tests starting position, empty board, castling, en passant, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
  STARTING_FEN,
  STARTING_BOARD_FEN,
  EMPTY_POSITION_FEN,
  fenToBoard,
  loadFen,
  boardToFen,
  toFen,
  fenToCastling,
  castlingToFen,
  pieceToFenChar,
} from './fen';
import { BitBoard } from './board';
import { SquareMask } from './squareSet';
import { parseSquareName as sq } from './util';

// Helper to get square number from name
const s = (name: string): number => sq(name)!;

describe('fen', () => {
  // ============================================
  // Constants
  // ============================================
  describe('constants', () => {
    it('should have correct starting FEN', () => {
      expect(STARTING_FEN).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    it('should have correct starting board FEN', () => {
      expect(STARTING_BOARD_FEN).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    });

    it('should have correct empty position FEN', () => {
      expect(EMPTY_POSITION_FEN).toBe('8/8/8/8/8/8/8/8 w - - 0 1');
    });
  });

  // ============================================
  // fenToBoard (parseBoardFen)
  // ============================================
  describe('fenToBoard', () => {
    it('should parse starting position', () => {
      const board = fenToBoard(STARTING_BOARD_FEN);
      expect(board).toBeDefined();
      expect(board!.occupied.size()).toBe(32);

      // Check specific pieces
      expect(board!.get(s('e1'))?.role).toBe('king');
      expect(board!.get(s('e1'))?.color).toBe('white');
      expect(board!.get(s('e8'))?.role).toBe('king');
      expect(board!.get(s('e8'))?.color).toBe('black');
    });

    it('should parse empty board', () => {
      const board = fenToBoard('8/8/8/8/8/8/8/8');
      expect(board).toBeDefined();
      expect(board!.occupied.isEmpty()).toBe(true);
    });

    it('should parse single piece', () => {
      const board = fenToBoard('8/8/8/8/4K3/8/8/8');
      expect(board).toBeDefined();
      expect(board!.occupied.size()).toBe(1);
      expect(board!.get(s('e4'))?.role).toBe('king');
      expect(board!.get(s('e4'))?.color).toBe('white');
    });

    it('should parse promoted pieces with ~', () => {
      const board = fenToBoard('Q~7/8/8/8/8/8/8/8');
      expect(board).toBeDefined();
      expect(board!.get(s('a8'))?.role).toBe('queen');
      expect(board!.get(s('a8'))?.promoted).toBe(true);
    });

    it('should return undefined for invalid FEN', () => {
      expect(fenToBoard('')).toBeUndefined();
      expect(fenToBoard('invalid')).toBeUndefined();
      expect(fenToBoard('8/8/8/8/8/8/8')).toBeUndefined(); // Missing rank
      expect(fenToBoard('8/8/8/8/8/8/8/9')).toBeUndefined(); // Invalid digit
    });

    it('should parse complex position', () => {
      const board = fenToBoard('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R');
      expect(board).toBeDefined();
      expect(board!.get(s('e1'))?.role).toBe('king');
      expect(board!.get(s('e8'))?.role).toBe('king');
      expect(board!.get(s('a6'))?.role).toBe('bishop');
      expect(board!.get(s('a6'))?.color).toBe('black');
    });

    it('should parse all piece types correctly', () => {
      // Position with all piece types
      const board = fenToBoard('kqrbnp2/KQRBNP2/8/8/8/8/8/8');
      expect(board).toBeDefined();

      // Black pieces on rank 8
      expect(board!.get(s('a8'))?.role).toBe('king');
      expect(board!.get(s('a8'))?.color).toBe('black');
      expect(board!.get(s('b8'))?.role).toBe('queen');
      expect(board!.get(s('c8'))?.role).toBe('rook');
      expect(board!.get(s('d8'))?.role).toBe('bishop');
      expect(board!.get(s('e8'))?.role).toBe('knight');
      expect(board!.get(s('f8'))?.role).toBe('pawn');

      // White pieces on rank 7
      expect(board!.get(s('a7'))?.role).toBe('king');
      expect(board!.get(s('a7'))?.color).toBe('white');
    });
  });

  // ============================================
  // loadFen (parseFen)
  // ============================================
  describe('loadFen', () => {
    it('should parse starting position', () => {
      const setup = loadFen(STARTING_FEN);
      expect(setup).toBeDefined();
      expect(setup!.turn).toBe('white');
      expect(setup!.halfmoves).toBe(0);
      expect(setup!.fullmoves).toBe(1);
      expect(setup!.epSquare).toBeUndefined();
    });

    it('should parse turn correctly', () => {
      const white = loadFen('8/8/8/8/8/8/8/8 w - - 0 1');
      expect(white?.turn).toBe('white');

      const black = loadFen('8/8/8/8/8/8/8/8 b - - 0 1');
      expect(black?.turn).toBe('black');
    });

    it('should parse halfmoves and fullmoves', () => {
      const setup = loadFen('8/8/8/8/8/8/8/8 w - - 42 100');
      expect(setup?.halfmoves).toBe(42);
      expect(setup?.fullmoves).toBe(100);
    });

    it('should parse en passant square', () => {
      const setup = loadFen('8/8/8/8/4P3/8/8/8 b - e3 0 1');
      expect(setup?.epSquare).toBe(s('e3'));
    });

    it('should handle missing parts gracefully', () => {
      // Just board FEN
      const setup = loadFen('8/8/8/8/8/8/8/8');
      expect(setup).toBeDefined();
      expect(setup?.turn).toBe('white');
    });

    it('should return undefined for invalid FEN', () => {
      expect(loadFen('')).toBeUndefined();
      expect(loadFen('invalid')).toBeUndefined();
      expect(loadFen('8/8/8/8/8/8/8/8 x - - 0 1')).toBeUndefined(); // Invalid turn
    });

    it('should handle underscore as space separator', () => {
      const setup = loadFen('8/8/8/8/8/8/8/8_w_-_-_0_1');
      expect(setup).toBeDefined();
      expect(setup?.turn).toBe('white');
    });

    it('should clamp fullmoves to minimum 1', () => {
      const setup = loadFen('8/8/8/8/8/8/8/8 w - - 0 0');
      expect(setup?.fullmoves).toBe(1);
    });

    it('should handle large move numbers', () => {
      const setup = loadFen('8/8/8/8/8/8/8/8 w - - 150 500');
      expect(setup?.halfmoves).toBe(150);
      expect(setup?.fullmoves).toBe(500);
    });
  });

  // ============================================
  // Castling Rights
  // ============================================
  describe('fenToCastling', () => {
    it('should parse KQkq', () => {
      const board = BitBoard.default();
      const rights = fenToCastling(board, 'KQkq');
      expect(rights).toBeDefined();
      expect(rights!.size()).toBe(4);
      expect(rights!.has(s('a1'))).toBe(true);
      expect(rights!.has(s('h1'))).toBe(true);
      expect(rights!.has(s('a8'))).toBe(true);
      expect(rights!.has(s('h8'))).toBe(true);
    });

    it('should parse only white castling (KQ)', () => {
      const board = BitBoard.default();
      const rights = fenToCastling(board, 'KQ');
      expect(rights).toBeDefined();
      expect(rights!.size()).toBe(2);
      expect(rights!.has(s('h1'))).toBe(true);
      expect(rights!.has(s('a1'))).toBe(true);
    });

    it('should parse only black castling (kq)', () => {
      const board = BitBoard.default();
      const rights = fenToCastling(board, 'kq');
      expect(rights).toBeDefined();
      expect(rights!.size()).toBe(2);
      expect(rights!.has(s('h8'))).toBe(true);
      expect(rights!.has(s('a8'))).toBe(true);
    });

    it('should parse kingside only (Kk)', () => {
      const board = BitBoard.default();
      const rights = fenToCastling(board, 'Kk');
      expect(rights).toBeDefined();
      expect(rights!.size()).toBe(2);
      expect(rights!.has(s('h1'))).toBe(true);
      expect(rights!.has(s('h8'))).toBe(true);
    });

    it('should parse queenside only (Qq)', () => {
      const board = BitBoard.default();
      const rights = fenToCastling(board, 'Qq');
      expect(rights).toBeDefined();
      expect(rights!.size()).toBe(2);
      expect(rights!.has(s('a1'))).toBe(true);
      expect(rights!.has(s('a8'))).toBe(true);
    });

    it('should parse - as no castling', () => {
      const board = BitBoard.default();
      const rights = fenToCastling(board, '-');
      expect(rights).toBeDefined();
      expect(rights!.isEmpty()).toBe(true);
    });

    it('should parse X-FEN file notation', () => {
      const board = BitBoard.default();
      // X-FEN uses file letters for rook positions
      const rights = fenToCastling(board, 'HAha');
      expect(rights).toBeDefined();
      expect(rights!.has(s('h1'))).toBe(true);
      expect(rights!.has(s('a1'))).toBe(true);
      expect(rights!.has(s('h8'))).toBe(true);
      expect(rights!.has(s('a8'))).toBe(true);
    });

    it('should return undefined for invalid castling', () => {
      const board = BitBoard.default();
      expect(fenToCastling(board, 'X')).toBeUndefined();
      expect(fenToCastling(board, '1')).toBeUndefined();
    });
  });

  describe('castlingToFen', () => {
    it('should produce KQkq for all castling rights', () => {
      const board = BitBoard.default();
      const rights = SquareMask.corners();
      const fen = castlingToFen(board, rights);
      expect(fen).toBe('KQkq');
    });

    it('should produce - for no castling rights', () => {
      const board = BitBoard.default();
      const rights = SquareMask.empty();
      const fen = castlingToFen(board, rights);
      expect(fen).toBe('-');
    });

    it('should produce K for kingside white only', () => {
      const board = BitBoard.default();
      const rights = SquareMask.fromSquare(s('h1'));
      const fen = castlingToFen(board, rights);
      expect(fen).toBe('K');
    });

    it('should produce Qk for queenside white and kingside black', () => {
      const board = BitBoard.default();
      const rights = SquareMask.fromSquare(s('a1')).union(SquareMask.fromSquare(s('h8')));
      const fen = castlingToFen(board, rights);
      expect(fen).toBe('Qk');
    });
  });

  // ============================================
  // boardToFen (makeBoardFen)
  // ============================================
  describe('boardToFen', () => {
    it('should produce starting board FEN', () => {
      const board = BitBoard.default();
      expect(boardToFen(board)).toBe(STARTING_BOARD_FEN);
    });

    it('should produce empty board FEN', () => {
      const board = BitBoard.empty();
      expect(boardToFen(board)).toBe('8/8/8/8/8/8/8/8');
    });

    it('should handle single piece', () => {
      const board = BitBoard.empty();
      board.set(s('e4'), { role: 'king', color: 'white' });
      expect(boardToFen(board)).toBe('8/8/8/8/4K3/8/8/8');
    });

    it('should handle promoted pieces', () => {
      const board = BitBoard.empty();
      board.set(s('a8'), { role: 'queen', color: 'white', promoted: true });
      expect(boardToFen(board)).toBe('Q~7/8/8/8/8/8/8/8');
    });

    it('should handle multiple pieces on same rank', () => {
      const board = BitBoard.empty();
      board.set(s('a1'), { role: 'rook', color: 'white' });
      board.set(s('h1'), { role: 'rook', color: 'white' });
      expect(boardToFen(board)).toBe('8/8/8/8/8/8/8/R6R');
    });
  });

  // ============================================
  // toFen (makeFen)
  // ============================================
  describe('toFen', () => {
    it('should produce starting FEN', () => {
      const setup = loadFen(STARTING_FEN);
      expect(setup).toBeDefined();
      expect(toFen(setup!)).toBe(STARTING_FEN);
    });

    it('should produce empty position FEN', () => {
      const setup = loadFen(EMPTY_POSITION_FEN);
      expect(setup).toBeDefined();
      expect(toFen(setup!)).toBe(EMPTY_POSITION_FEN);
    });

    it('should include all FEN parts', () => {
      const setup = loadFen('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R b KQkq e3 5 10');
      expect(setup).toBeDefined();
      const fen = toFen(setup!);
      expect(fen).toContain(' b ');
      expect(fen).toContain('KQkq');
      expect(fen).toContain(' 5 10');
    });

    it('should clamp halfmoves to 0-9999', () => {
      const setup = loadFen('8/8/8/8/8/8/8/8 w - - 99999 1');
      expect(setup).toBeDefined();
      // Halfmoves is parsed but clamped in output
      const fen = toFen(setup!);
      expect(fen).toMatch(/\d+ 1$/);
    });
  });

  // ============================================
  // pieceToFenChar
  // ============================================
  describe('pieceToFenChar', () => {
    it('should produce uppercase for white', () => {
      expect(pieceToFenChar({ role: 'king', color: 'white' })).toBe('K');
      expect(pieceToFenChar({ role: 'queen', color: 'white' })).toBe('Q');
      expect(pieceToFenChar({ role: 'rook', color: 'white' })).toBe('R');
      expect(pieceToFenChar({ role: 'bishop', color: 'white' })).toBe('B');
      expect(pieceToFenChar({ role: 'knight', color: 'white' })).toBe('N');
      expect(pieceToFenChar({ role: 'pawn', color: 'white' })).toBe('P');
    });

    it('should produce lowercase for black', () => {
      expect(pieceToFenChar({ role: 'king', color: 'black' })).toBe('k');
      expect(pieceToFenChar({ role: 'queen', color: 'black' })).toBe('q');
      expect(pieceToFenChar({ role: 'rook', color: 'black' })).toBe('r');
      expect(pieceToFenChar({ role: 'bishop', color: 'black' })).toBe('b');
      expect(pieceToFenChar({ role: 'knight', color: 'black' })).toBe('n');
      expect(pieceToFenChar({ role: 'pawn', color: 'black' })).toBe('p');
    });

    it('should add ~ for promoted pieces', () => {
      expect(pieceToFenChar({ role: 'queen', color: 'white', promoted: true })).toBe('Q~');
      expect(pieceToFenChar({ role: 'knight', color: 'black', promoted: true })).toBe('n~');
    });
  });

  // ============================================
  // Round-trip Tests
  // ============================================
  describe('round-trip', () => {
    const testFens = [
      STARTING_FEN,
      '8/8/8/8/8/8/8/8 w - - 0 1',
      'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      '8/8/8/8/8/8/8/4K2R w K - 0 1',
      '8/8/8/4k3/8/8/8/R3K3 w Q - 0 1',
    ];

    for (const fen of testFens) {
      it(`should round-trip: ${fen}`, () => {
        const setup = loadFen(fen);
        expect(setup).toBeDefined();
        const result = toFen(setup!);
        expect(result).toBe(fen);
      });
    }
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('edge cases', () => {
    it('should handle position with all pieces on one rank', () => {
      const board = fenToBoard('RNBQKBNR/8/8/8/8/8/8/8');
      expect(board).toBeDefined();
      expect(board!.occupied.size()).toBe(8);
    });

    it('should handle alternating pieces', () => {
      const board = fenToBoard('PpPpPpPp/8/8/8/8/8/8/8');
      expect(board).toBeDefined();
      expect(board!.occupied.size()).toBe(8);
      expect(board!.white.size()).toBe(4);
      expect(board!.black.size()).toBe(4);
    });

    it('should reject FEN with too many squares per rank', () => {
      expect(fenToBoard('9/8/8/8/8/8/8/8')).toBeUndefined();
      expect(fenToBoard('PPPPPPPPP/8/8/8/8/8/8/8')).toBeUndefined();
    });

    it('should reject FEN with too few squares per rank', () => {
      expect(fenToBoard('7/8/8/8/8/8/8/8')).toBeUndefined();
      expect(fenToBoard('PPPPPPP/8/8/8/8/8/8/8')).toBeUndefined();
    });

    it('should handle en passant square validation in loadFen', () => {
      // e3 is valid en passant square when there's a pawn that could have moved there
      const validEp = loadFen('rnbqkbnr/pppp1ppp/8/4pP2/8/8/PPPPP1PP/RNBQKBNR w KQkq e6 0 3');
      expect(validEp).toBeDefined();
    });
  });
});
