/**
 * Comprehensive tests for board interaction functions.
 * Tests move execution, selection, premoves, and board state management.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  flipOrientation,
  clearBoard,
  applyPieceChanges,
  updateCheckHighlight,
  clearQueuedPremove,
  clearQueuedPredrop,
  executeMove,
  placePiece,
  handleSquareClick,
  markSelected,
  deselect,
  isMoveAllowed,
  canDrag,
  executePremove,
  abortMove,
  stopInteractions,
  keyAtPosition,
  isWhitePerspective,
  type BoardInteractionState,
} from './moves';
import type { Key, Piece, PiecesDiff, Color, Role } from './types';

// Helper to create a pieces map from an object
const makePieces = (obj: Record<string, { role: Role; color: Color }>): Map<Key, Piece> => {
  const pieces = new Map<Key, Piece>();
  for (const [key, piece] of Object.entries(obj)) {
    pieces.set(key as Key, piece);
  }
  return pieces;
};

// Helper to create a minimal state for testing
const createState = (overrides: Partial<BoardInteractionState> = {}): BoardInteractionState => ({
  pieces: new Map(),
  orientation: 'white',
  turnColor: 'white',
  autoCastle: true,
  viewOnly: false,
  movable: {
    free: false,
    color: 'white',
    dests: undefined,
    showDests: true,
    events: {},
    rookCastle: true,
  },
  premovable: {
    enabled: true,
    showDests: true,
    castle: true,
    dests: undefined,
    customDests: undefined,
    current: undefined,
    additionalPremoveRequirements: () => true,
    events: {},
  },
  predroppable: {
    enabled: false,
    current: undefined,
    events: {},
  },
  draggable: {
    enabled: true,
    current: undefined,
  },
  selectable: {
    enabled: true,
  },
  stats: {
    dragged: false,
  },
  events: {},
  hold: {
    start: vi.fn(),
    cancel: vi.fn(),
    stop: vi.fn(() => 0),
  },
  animation: {
    current: undefined,
  },
  ...overrides,
});

describe('moves', () => {
  // ============================================
  // flipOrientation
  // ============================================
  describe('flipOrientation', () => {
    it('should flip white to black', () => {
      const state = createState({ orientation: 'white' });
      flipOrientation(state);
      expect(state.orientation).toBe('black');
    });

    it('should flip black to white', () => {
      const state = createState({ orientation: 'black' });
      flipOrientation(state);
      expect(state.orientation).toBe('white');
    });

    it('should clear selection', () => {
      const state = createState({ orientation: 'white', selected: 'e4' });
      flipOrientation(state);
      expect(state.selected).toBeUndefined();
    });

    it('should clear animation', () => {
      const state = createState({ animation: { current: {} } });
      flipOrientation(state);
      expect(state.animation.current).toBeUndefined();
    });

    it('should clear draggable current', () => {
      const state = createState({ draggable: { enabled: true, current: {} } });
      flipOrientation(state);
      expect(state.draggable.current).toBeUndefined();
    });
  });

  // ============================================
  // clearBoard
  // ============================================
  describe('clearBoard', () => {
    it('should clear lastMove', () => {
      const state = createState({ lastMove: ['e2', 'e4'] });
      clearBoard(state);
      expect(state.lastMove).toBeUndefined();
    });

    it('should clear selection', () => {
      const state = createState({ selected: 'e4' });
      clearBoard(state);
      expect(state.selected).toBeUndefined();
    });

    it('should clear premove', () => {
      const state = createState();
      state.premovable.current = ['e2', 'e4'];
      clearBoard(state);
      expect(state.premovable.current).toBeUndefined();
    });

    it('should clear predrop', () => {
      const state = createState();
      state.predroppable.current = { role: 'queen', key: 'e4' };
      clearBoard(state);
      expect(state.predroppable.current).toBeUndefined();
    });
  });

  // ============================================
  // applyPieceChanges
  // ============================================
  describe('applyPieceChanges', () => {
    it('should add new pieces', () => {
      const state = createState();
      const changes: PiecesDiff = new Map([
        ['e4', { role: 'pawn', color: 'white' }],
      ]);
      applyPieceChanges(state, changes);
      expect(state.pieces.get('e4')).toEqual({ role: 'pawn', color: 'white' });
    });

    it('should remove pieces when undefined', () => {
      const state = createState({
        pieces: makePieces({ e4: { role: 'pawn', color: 'white' } }),
      });
      const changes: PiecesDiff = new Map([['e4', undefined]]);
      applyPieceChanges(state, changes);
      expect(state.pieces.has('e4')).toBe(false);
    });

    it('should replace existing pieces', () => {
      const state = createState({
        pieces: makePieces({ e4: { role: 'pawn', color: 'white' } }),
      });
      const changes: PiecesDiff = new Map([
        ['e4', { role: 'queen', color: 'black' }],
      ]);
      applyPieceChanges(state, changes);
      expect(state.pieces.get('e4')).toEqual({ role: 'queen', color: 'black' });
    });

    it('should apply multiple changes', () => {
      const state = createState();
      const changes: PiecesDiff = new Map([
        ['e2', { role: 'pawn', color: 'white' }],
        ['e4', { role: 'pawn', color: 'white' }],
        ['d7', { role: 'pawn', color: 'black' }],
      ]);
      applyPieceChanges(state, changes);
      expect(state.pieces.size).toBe(3);
    });
  });

  // ============================================
  // updateCheckHighlight
  // ============================================
  describe('updateCheckHighlight', () => {
    it('should set check to king square for color', () => {
      const state = createState({
        pieces: makePieces({ e1: { role: 'king', color: 'white' } }),
      });
      updateCheckHighlight(state, 'white');
      expect(state.check).toBe('e1');
    });

    it('should use turnColor when true is passed', () => {
      const state = createState({
        pieces: makePieces({
          e1: { role: 'king', color: 'white' },
          e8: { role: 'king', color: 'black' },
        }),
        turnColor: 'black',
      });
      updateCheckHighlight(state, true);
      expect(state.check).toBe('e8');
    });

    it('should clear check when false is passed', () => {
      const state = createState({ check: 'e1' });
      updateCheckHighlight(state, false as any);
      expect(state.check).toBeUndefined();
    });

    it('should clear check when no king found', () => {
      const state = createState({ check: 'e1' });
      updateCheckHighlight(state, 'white');
      expect(state.check).toBeUndefined();
    });
  });

  // ============================================
  // executeMove
  // ============================================
  describe('executeMove', () => {
    it('should move piece from origin to destination', () => {
      const state = createState({
        pieces: makePieces({ e2: { role: 'pawn', color: 'white' } }),
      });
      executeMove(state, 'e2', 'e4');
      expect(state.pieces.has('e2')).toBe(false);
      expect(state.pieces.get('e4')).toEqual({ role: 'pawn', color: 'white' });
    });

    it('should return false if origin is empty', () => {
      const state = createState();
      const result = executeMove(state, 'e2', 'e4');
      expect(result).toBe(false);
    });

    it('should return false if origin equals destination', () => {
      const state = createState({
        pieces: makePieces({ e2: { role: 'pawn', color: 'white' } }),
      });
      const result = executeMove(state, 'e2', 'e2');
      expect(result).toBe(false);
    });

    it('should return captured piece when capturing', () => {
      const state = createState({
        pieces: makePieces({
          e4: { role: 'pawn', color: 'white' },
          d5: { role: 'pawn', color: 'black' },
        }),
      });
      const result = executeMove(state, 'e4', 'd5');
      expect(result).toEqual({ role: 'pawn', color: 'black' });
    });

    it('should return true when not capturing', () => {
      const state = createState({
        pieces: makePieces({ e2: { role: 'pawn', color: 'white' } }),
      });
      const result = executeMove(state, 'e2', 'e4');
      expect(result).toBe(true);
    });

    it('should update lastMove', () => {
      const state = createState({
        pieces: makePieces({ e2: { role: 'pawn', color: 'white' } }),
      });
      executeMove(state, 'e2', 'e4');
      expect(state.lastMove).toEqual(['e2', 'e4']);
    });

    it('should clear check', () => {
      const state = createState({
        pieces: makePieces({ e2: { role: 'pawn', color: 'white' } }),
        check: 'e1',
      });
      executeMove(state, 'e2', 'e4');
      expect(state.check).toBeUndefined();
    });

    it('should handle kingside castling', () => {
      const state = createState({
        pieces: makePieces({
          e1: { role: 'king', color: 'white' },
          h1: { role: 'rook', color: 'white' },
        }),
        autoCastle: true,
      });
      executeMove(state, 'e1', 'h1');
      expect(state.pieces.get('g1')).toEqual({ role: 'king', color: 'white' });
      expect(state.pieces.get('f1')).toEqual({ role: 'rook', color: 'white' });
      expect(state.pieces.has('e1')).toBe(false);
      expect(state.pieces.has('h1')).toBe(false);
    });

    it('should handle queenside castling', () => {
      const state = createState({
        pieces: makePieces({
          e1: { role: 'king', color: 'white' },
          a1: { role: 'rook', color: 'white' },
        }),
        autoCastle: true,
      });
      executeMove(state, 'e1', 'a1');
      expect(state.pieces.get('c1')).toEqual({ role: 'king', color: 'white' });
      expect(state.pieces.get('d1')).toEqual({ role: 'rook', color: 'white' });
    });

    it('should handle standard castling notation e1-g1', () => {
      const state = createState({
        pieces: makePieces({
          e1: { role: 'king', color: 'white' },
          h1: { role: 'rook', color: 'white' },
        }),
        autoCastle: true,
      });
      executeMove(state, 'e1', 'g1');
      expect(state.pieces.get('g1')).toEqual({ role: 'king', color: 'white' });
      expect(state.pieces.get('f1')).toEqual({ role: 'rook', color: 'white' });
    });
  });

  // ============================================
  // placePiece
  // ============================================
  describe('placePiece', () => {
    it('should place piece on empty square', () => {
      const state = createState();
      const piece: Piece = { role: 'queen', color: 'white' };
      const result = placePiece(state, piece, 'e4');
      expect(result).toBe(true);
      expect(state.pieces.get('e4')).toEqual(piece);
    });

    it('should not place piece on occupied square without force', () => {
      const state = createState({
        pieces: makePieces({ e4: { role: 'pawn', color: 'black' } }),
      });
      const piece: Piece = { role: 'queen', color: 'white' };
      const result = placePiece(state, piece, 'e4');
      expect(result).toBe(false);
      expect(state.pieces.get('e4')?.role).toBe('pawn');
    });

    it('should place piece on occupied square with force', () => {
      const state = createState({
        pieces: makePieces({ e4: { role: 'pawn', color: 'black' } }),
      });
      const piece: Piece = { role: 'queen', color: 'white' };
      const result = placePiece(state, piece, 'e4', true);
      expect(result).toBe(true);
      expect(state.pieces.get('e4')).toEqual(piece);
    });

    it('should update lastMove to single key', () => {
      const state = createState();
      placePiece(state, { role: 'queen', color: 'white' }, 'e4');
      expect(state.lastMove).toEqual(['e4']);
    });

    it('should toggle turn', () => {
      const state = createState({ turnColor: 'white' });
      placePiece(state, { role: 'queen', color: 'white' }, 'e4');
      expect(state.turnColor).toBe('black');
    });
  });

  // ============================================
  // isMoveAllowed
  // ============================================
  describe('isMoveAllowed', () => {
    it('should return false if no piece at origin', () => {
      const state = createState();
      expect(isMoveAllowed(state, 'e2', 'e4')).toBe(false);
    });

    it('should return false if origin equals destination', () => {
      const state = createState({
        pieces: makePieces({ e2: { role: 'pawn', color: 'white' } }),
      });
      expect(isMoveAllowed(state, 'e2', 'e2')).toBe(false);
    });

    it('should return true when free movement is enabled', () => {
      const state = createState({
        pieces: makePieces({ e2: { role: 'pawn', color: 'white' } }),
        movable: { free: true, color: 'white', showDests: true, events: {}, rookCastle: true },
      });
      expect(isMoveAllowed(state, 'e2', 'e4')).toBe(true);
    });

    it('should return false when destination not in dests', () => {
      const state = createState({
        pieces: makePieces({ e2: { role: 'pawn', color: 'white' } }),
        movable: {
          free: false,
          color: 'white',
          dests: new Map([['e2', ['e3']]]),
          showDests: true,
          events: {},
          rookCastle: true,
        },
      });
      expect(isMoveAllowed(state, 'e2', 'e4')).toBe(false);
    });

    it('should return true when destination is in dests', () => {
      const state = createState({
        pieces: makePieces({ e2: { role: 'pawn', color: 'white' } }),
        movable: {
          free: false,
          color: 'white',
          dests: new Map([['e2', ['e3', 'e4']]]),
          showDests: true,
          events: {},
          rookCastle: true,
        },
      });
      expect(isMoveAllowed(state, 'e2', 'e4')).toBe(true);
    });

    it('should return false if piece color does not match movable color', () => {
      const state = createState({
        pieces: makePieces({ e2: { role: 'pawn', color: 'black' } }),
        movable: { free: true, color: 'white', showDests: true, events: {}, rookCastle: true },
      });
      expect(isMoveAllowed(state, 'e2', 'e4')).toBe(false);
    });

    it('should allow both colors when movable.color is both', () => {
      const state = createState({
        pieces: makePieces({ e2: { role: 'pawn', color: 'black' } }),
        movable: { free: true, color: 'both', showDests: true, events: {}, rookCastle: true },
        turnColor: 'black',
      });
      expect(isMoveAllowed(state, 'e2', 'e4')).toBe(true);
    });
  });

  // ============================================
  // canDrag
  // ============================================
  describe('canDrag', () => {
    it('should return false if no piece at origin', () => {
      const state = createState();
      expect(canDrag(state, 'e2')).toBe(false);
    });

    it('should return false if dragging is disabled', () => {
      const state = createState({
        pieces: makePieces({ e2: { role: 'pawn', color: 'white' } }),
        draggable: { enabled: false },
      });
      expect(canDrag(state, 'e2')).toBe(false);
    });

    it('should return true for own piece on own turn', () => {
      const state = createState({
        pieces: makePieces({ e2: { role: 'pawn', color: 'white' } }),
        turnColor: 'white',
        movable: { free: false, color: 'white', showDests: true, events: {}, rookCastle: true },
      });
      expect(canDrag(state, 'e2')).toBe(true);
    });

    it('should return true for opponent piece with premove enabled', () => {
      const state = createState({
        pieces: makePieces({ e2: { role: 'pawn', color: 'white' } }),
        turnColor: 'black',
        movable: { free: false, color: 'white', showDests: true, events: {}, rookCastle: true },
        premovable: {
          enabled: true,
          showDests: true,
          castle: true,
          additionalPremoveRequirements: () => true,
          events: {},
        },
      });
      expect(canDrag(state, 'e2')).toBe(true);
    });

    it('should return false for opponent piece without premove', () => {
      const state = createState({
        pieces: makePieces({ e2: { role: 'pawn', color: 'white' } }),
        turnColor: 'black',
        movable: { free: false, color: 'white', showDests: true, events: {}, rookCastle: true },
        premovable: {
          enabled: false,
          showDests: true,
          castle: true,
          additionalPremoveRequirements: () => true,
          events: {},
        },
      });
      expect(canDrag(state, 'e2')).toBe(false);
    });
  });

  // ============================================
  // handleSquareClick / markSelected / deselect
  // ============================================
  describe('handleSquareClick', () => {
    it('should select piece if nothing is selected', () => {
      const state = createState({
        pieces: makePieces({ e2: { role: 'pawn', color: 'white' } }),
        movable: { free: true, color: 'white', showDests: true, events: {}, rookCastle: true },
      });
      handleSquareClick(state, 'e2');
      expect(state.selected).toBe('e2');
    });

    it('should deselect if same square clicked and dragging disabled', () => {
      const state = createState({
        selected: 'e2',
        pieces: makePieces({ e2: { role: 'pawn', color: 'white' } }),
        draggable: { enabled: false },
      });
      handleSquareClick(state, 'e2');
      expect(state.selected).toBeUndefined();
    });

    it('should attempt move when clicking destination', () => {
      const state = createState({
        selected: 'e2',
        pieces: makePieces({ e2: { role: 'pawn', color: 'white' } }),
        movable: {
          free: false,
          color: 'white',
          dests: new Map([['e2', ['e4']]]),
          showDests: true,
          events: {},
          rookCastle: true,
        },
      });
      handleSquareClick(state, 'e4');
      expect(state.pieces.get('e4')?.role).toBe('pawn');
      expect(state.selected).toBeUndefined();
    });
  });

  describe('markSelected', () => {
    it('should set selected key', () => {
      const state = createState();
      markSelected(state, 'e4');
      expect(state.selected).toBe('e4');
    });
  });

  describe('deselect', () => {
    it('should clear selected', () => {
      const state = createState({ selected: 'e4' });
      deselect(state);
      expect(state.selected).toBeUndefined();
    });

    it('should clear premove dests', () => {
      const state = createState();
      state.premovable.dests = ['e3', 'e4'];
      deselect(state);
      expect(state.premovable.dests).toBeUndefined();
    });

    it('should cancel hold timer', () => {
      const state = createState();
      deselect(state);
      expect(state.hold.cancel).toHaveBeenCalled();
    });
  });

  // ============================================
  // Premove/Predrop
  // ============================================
  describe('clearQueuedPremove', () => {
    it('should clear current premove', () => {
      const state = createState();
      state.premovable.current = ['e2', 'e4'];
      clearQueuedPremove(state);
      expect(state.premovable.current).toBeUndefined();
    });

    it('should do nothing if no premove', () => {
      const state = createState();
      clearQueuedPremove(state);
      expect(state.premovable.current).toBeUndefined();
    });
  });

  describe('clearQueuedPredrop', () => {
    it('should clear current predrop', () => {
      const state = createState();
      state.predroppable.current = { role: 'queen', key: 'e4' };
      clearQueuedPredrop(state);
      expect(state.predroppable.current).toBeUndefined();
    });
  });

  describe('executePremove', () => {
    it('should return false if no premove queued', () => {
      const state = createState();
      const result = executePremove(state);
      expect(result).toBe(false);
    });

    it('should execute valid premove', () => {
      const state = createState({
        pieces: makePieces({ e2: { role: 'pawn', color: 'white' } }),
        movable: {
          free: false,
          color: 'white',
          dests: new Map([['e2', ['e4']]]),
          showDests: true,
          events: {},
          rookCastle: true,
        },
      });
      state.premovable.current = ['e2', 'e4'];
      const result = executePremove(state);
      expect(result).toBe(true);
      expect(state.pieces.get('e4')?.role).toBe('pawn');
    });

    it('should clear premove after execution', () => {
      const state = createState({
        pieces: makePieces({ e2: { role: 'pawn', color: 'white' } }),
        movable: {
          free: true,
          color: 'white',
          showDests: true,
          events: {},
          rookCastle: true,
        },
      });
      state.premovable.current = ['e2', 'e4'];
      executePremove(state);
      expect(state.premovable.current).toBeUndefined();
    });
  });

  // ============================================
  // abortMove / stopInteractions
  // ============================================
  describe('abortMove', () => {
    it('should clear premove and selection', () => {
      const state = createState({ selected: 'e2' });
      state.premovable.current = ['e2', 'e4'];
      abortMove(state);
      expect(state.premovable.current).toBeUndefined();
      expect(state.selected).toBeUndefined();
    });
  });

  describe('stopInteractions', () => {
    it('should disable movable and clear state', () => {
      const state = createState({
        selected: 'e2',
        movable: {
          free: false,
          color: 'white',
          dests: new Map(),
          showDests: true,
          events: {},
          rookCastle: true,
        },
      });
      stopInteractions(state);
      expect(state.movable.color).toBeUndefined();
      expect(state.movable.dests).toBeUndefined();
      expect(state.selected).toBeUndefined();
    });
  });

  // ============================================
  // keyAtPosition
  // ============================================
  describe('keyAtPosition', () => {
    const bounds = { left: 0, top: 0, width: 800, height: 800 } as DOMRectReadOnly;

    it('should return a1 for bottom-left corner as white', () => {
      const key = keyAtPosition([50, 750], true, bounds);
      expect(key).toBe('a1');
    });

    it('should return h8 for top-right corner as white', () => {
      const key = keyAtPosition([750, 50], true, bounds);
      expect(key).toBe('h8');
    });

    it('should return a8 for bottom-right corner as black', () => {
      // As black, bottom-right maps to a8 (board is flipped)
      const key = keyAtPosition([750, 750], false, bounds);
      expect(key).toBe('a8');
    });

    it('should return h1 for top-left corner as black', () => {
      // As black, top-left maps to h1 (board is flipped)
      const key = keyAtPosition([50, 50], false, bounds);
      expect(key).toBe('h1');
    });

    it('should return undefined for position outside board', () => {
      expect(keyAtPosition([-10, 400], true, bounds)).toBeUndefined();
      expect(keyAtPosition([400, 810], true, bounds)).toBeUndefined();
    });

    it('should return e4 for center of e4 square as white', () => {
      // e4 is file 4 (0-indexed), rank 3 (0-indexed from white's perspective)
      // Square center at: x = (4 + 0.5) * 100 = 450, y = (7 - 3 + 0.5) * 100 = 450
      const key = keyAtPosition([450, 450], true, bounds);
      expect(key).toBe('e4');
    });
  });

  // ============================================
  // isWhitePerspective
  // ============================================
  describe('isWhitePerspective', () => {
    it('should return true for white orientation', () => {
      expect(isWhitePerspective({ orientation: 'white' })).toBe(true);
    });

    it('should return false for black orientation', () => {
      expect(isWhitePerspective({ orientation: 'black' })).toBe(false);
    });
  });
});
