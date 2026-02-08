/**
 * Tests for the public API.
 * These tests focus on API method behavior with mocked state.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { start, type Api } from './api';
import { defaults, type State } from './state';
import type { Key } from '../core/types';

// Mock browser globals for tests
beforeAll(() => {
  // @ts-expect-error - mocking window for tests
  global.window = { ontouchstart: undefined };
  // @ts-expect-error - mocking document for tests
  global.document = {
    createElement: () => ({
      style: {},
      appendChild: () => {},
    }),
  };
  // @ts-expect-error - mocking requestAnimationFrame for tests
  global.requestAnimationFrame = (cb: (time: number) => void) => {
    cb(0);
    return 0;
  };
  // @ts-expect-error - mocking performance for tests
  global.performance = { now: () => 0 };
});

// Helper to create a mock state with DOM
const createMockState = (): State => {
  const headless = defaults();
  // Disable animations to avoid requestAnimationFrame issues in tests
  headless.animation.enabled = false;
  return {
    ...headless,
    dom: {
      elements: {
        board: document.createElement('div'),
        wrap: document.createElement('div'),
        container: document.createElement('div'),
      },
      bounds: Object.assign(() => ({ left: 0, top: 0, width: 800, height: 800, right: 800, bottom: 800, x: 0, y: 0, toJSON: () => ({}) } as DOMRectReadOnly), { clear: () => {} }),
      redraw: vi.fn(),
      redrawNow: vi.fn(),
    },
  };
};

// Helper to create an API instance
const createApi = (): { api: Api; state: State; redrawAll: ReturnType<typeof vi.fn> } => {
  const state = createMockState();
  const redrawAll = vi.fn();
  const api = start(state, redrawAll);
  return { api, state, redrawAll };
};

describe('api', () => {
  // ============================================
  // getFen
  // ============================================
  describe('getFen', () => {
    it('should return FEN for starting position', () => {
      const { api } = createApi();
      const fen = api.getFen();
      expect(fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
    });

    it('should return FEN after pieces are modified', () => {
      const { api, state } = createApi();
      state.pieces.clear();
      state.pieces.set('e4', { role: 'pawn', color: 'white' });
      const fen = api.getFen();
      expect(fen).toBe('8/8/8/8/4P3/8/8/8');
    });

    it('should return FEN for empty board', () => {
      const { api, state } = createApi();
      state.pieces.clear();
      const fen = api.getFen();
      expect(fen).toBe('8/8/8/8/8/8/8/8');
    });
  });

  // ============================================
  // toggleOrientation
  // ============================================
  describe('toggleOrientation', () => {
    it('should flip from white to black', () => {
      const { api, state, redrawAll } = createApi();
      expect(state.orientation).toBe('white');
      api.toggleOrientation();
      expect(state.orientation).toBe('black');
      expect(redrawAll).toHaveBeenCalled();
    });

    it('should flip from black to white', () => {
      const { api, state, redrawAll } = createApi();
      state.orientation = 'black';
      api.toggleOrientation();
      expect(state.orientation).toBe('white');
      expect(redrawAll).toHaveBeenCalled();
    });

    it('should clear selection when toggling', () => {
      const { api, state } = createApi();
      state.selected = 'e4';
      api.toggleOrientation();
      expect(state.selected).toBeUndefined();
    });
  });

  // ============================================
  // set
  // ============================================
  describe('set', () => {
    it('should toggle orientation when orientation changes', () => {
      const { api, state, redrawAll } = createApi();
      api.set({ orientation: 'black' });
      expect(state.orientation).toBe('black');
      expect(redrawAll).toHaveBeenCalled();
    });

    it('should apply animation config', () => {
      const { api, state } = createApi();
      api.set({ animation: { duration: 100 } });
      expect(state.animation.duration).toBe(100);
    });

    it('should parse FEN when provided', () => {
      const { api, state } = createApi();
      api.set({ fen: '8/8/8/8/4P3/8/8/8' });
      expect(state.pieces.size).toBe(1);
      expect(state.pieces.get('e4')?.role).toBe('pawn');
    });
  });

  // ============================================
  // setPieces
  // ============================================
  describe('setPieces', () => {
    it('should add pieces', () => {
      const { api, state } = createApi();
      state.pieces.clear();
      api.setPieces(new Map([['e4', { role: 'pawn', color: 'white' }]]));
      expect(state.pieces.get('e4')).toEqual({ role: 'pawn', color: 'white' });
    });

    it('should remove pieces when undefined', () => {
      const { api, state } = createApi();
      api.setPieces(new Map([['e2', undefined]]));
      expect(state.pieces.has('e2')).toBe(false);
    });
  });

  // ============================================
  // move
  // ============================================
  describe('move', () => {
    it('should move piece from origin to destination', () => {
      const { api, state } = createApi();
      api.move('e2', 'e4');
      expect(state.pieces.has('e2')).toBe(false);
      expect(state.pieces.get('e4')?.role).toBe('pawn');
    });

    it('should update lastMove', () => {
      const { api, state } = createApi();
      api.move('e2', 'e4');
      expect(state.lastMove).toEqual(['e2', 'e4']);
    });

    it('should handle capture', () => {
      const { api, state } = createApi();
      state.pieces.set('e4', { role: 'pawn', color: 'black' });
      api.move('d2', 'e4');
      // The white pawn should replace the black pawn
      expect(state.pieces.get('e4')?.color).toBe('white');
    });
  });

  // ============================================
  // newPiece
  // ============================================
  describe('newPiece', () => {
    it('should place a new piece on empty square', () => {
      const { api, state } = createApi();
      api.newPiece({ role: 'queen', color: 'white' }, 'e4');
      expect(state.pieces.get('e4')).toEqual({ role: 'queen', color: 'white' });
    });

    it('should update lastMove to single key', () => {
      const { api, state } = createApi();
      api.newPiece({ role: 'queen', color: 'white' }, 'e4');
      expect(state.lastMove).toEqual(['e4']);
    });
  });

  // ============================================
  // selectSquare
  // ============================================
  describe('selectSquare', () => {
    it('should select a square', () => {
      const { api, state } = createApi();
      api.selectSquare('e2');
      expect(state.selected).toBe('e2');
    });

    it('should deselect when null is passed', () => {
      const { api, state } = createApi();
      state.selected = 'e2';
      api.selectSquare(null);
      expect(state.selected).toBeUndefined();
    });
  });

  // ============================================
  // playPremove / cancelPremove
  // ============================================
  describe('playPremove', () => {
    it('should return false when no premove is set', () => {
      const { api } = createApi();
      const result = api.playPremove();
      expect(result).toBe(false);
    });

    it('should execute premove and return true', () => {
      const { api, state } = createApi();
      state.premovable.current = ['e2', 'e4'];
      state.movable.dests = new Map([['e2', ['e4']]]);
      state.movable.color = 'white';
      state.turnColor = 'white';
      const result = api.playPremove();
      expect(result).toBe(true);
    });
  });

  describe('cancelPremove', () => {
    it('should clear premove', () => {
      const { api, state } = createApi();
      state.premovable.current = ['e2', 'e4'];
      api.cancelPremove();
      expect(state.premovable.current).toBeUndefined();
    });
  });

  // ============================================
  // playPredrop / cancelPredrop
  // ============================================
  describe('playPredrop', () => {
    it('should return false when no predrop is set', () => {
      const { api } = createApi();
      const result = api.playPredrop(() => true);
      expect(result).toBe(false);
    });

    it('should execute valid predrop and return true', () => {
      const { api, state } = createApi();
      state.predroppable.current = { role: 'queen', key: 'e4' };
      state.movable.color = 'white';
      const result = api.playPredrop(() => true);
      expect(result).toBe(true);
      expect(state.pieces.get('e4')?.role).toBe('queen');
    });

    it('should not execute invalid predrop', () => {
      const { api, state } = createApi();
      state.predroppable.current = { role: 'queen', key: 'e4' };
      const result = api.playPredrop(() => false);
      expect(result).toBe(false);
    });
  });

  describe('cancelPredrop', () => {
    it('should clear predrop', () => {
      const { api, state } = createApi();
      state.predroppable.current = { role: 'queen', key: 'e4' };
      api.cancelPredrop();
      expect(state.predroppable.current).toBeUndefined();
    });
  });

  // ============================================
  // cancelMove
  // ============================================
  describe('cancelMove', () => {
    it('should clear selection and premove', () => {
      const { api, state } = createApi();
      state.selected = 'e2';
      state.premovable.current = ['e2', 'e4'];
      api.cancelMove();
      expect(state.selected).toBeUndefined();
      expect(state.premovable.current).toBeUndefined();
    });
  });

  // ============================================
  // stop
  // ============================================
  describe('stop', () => {
    it('should disable movable and clear state', () => {
      const { api, state } = createApi();
      state.movable.color = 'white';
      state.selected = 'e2';
      api.stop();
      expect(state.movable.color).toBeUndefined();
      expect(state.selected).toBeUndefined();
    });
  });

  // ============================================
  // setShapes / setAutoShapes
  // ============================================
  describe('setShapes', () => {
    it('should set user shapes', () => {
      const { api, state } = createApi();
      const shapes = [{ orig: 'e2' as Key, dest: 'e4' as Key, brush: 'green' }];
      api.setShapes(shapes);
      expect(state.drawable.shapes).toEqual(shapes);
    });

    it('should make a copy of shapes array', () => {
      const { api, state } = createApi();
      const shapes = [{ orig: 'e2' as Key, dest: 'e4' as Key, brush: 'green' }];
      api.setShapes(shapes);
      shapes.push({ orig: 'a1' as Key, dest: 'a2' as Key, brush: 'red' });
      expect(state.drawable.shapes.length).toBe(1);
    });
  });

  describe('setAutoShapes', () => {
    it('should set auto shapes', () => {
      const { api, state } = createApi();
      const shapes = [{ orig: 'e2' as Key, dest: 'e4' as Key, brush: 'green' }];
      api.setAutoShapes(shapes);
      expect(state.drawable.autoShapes).toEqual(shapes);
    });
  });

  // ============================================
  // getKeyAtDomPos
  // ============================================
  describe('getKeyAtDomPos', () => {
    it('should return key for position within board', () => {
      const { api } = createApi();
      const key = api.getKeyAtDomPos([50, 750]);
      expect(key).toBe('a1');
    });

    it('should return undefined for position outside board', () => {
      const { api } = createApi();
      const key = api.getKeyAtDomPos([-10, 400]);
      expect(key).toBeUndefined();
    });
  });

  // ============================================
  // destroy
  // ============================================
  describe('destroy', () => {
    it('should mark state as destroyed', () => {
      const { api, state } = createApi();
      api.destroy();
      expect(state.dom.destroyed).toBe(true);
    });

    it('should stop all interactions', () => {
      const { api, state } = createApi();
      state.movable.color = 'white';
      state.selected = 'e2';
      api.destroy();
      expect(state.movable.color).toBeUndefined();
      expect(state.selected).toBeUndefined();
    });

    it('should call unbind if available', () => {
      const { api, state } = createApi();
      const unbind = vi.fn();
      state.dom.unbind = unbind;
      api.destroy();
      expect(unbind).toHaveBeenCalled();
    });
  });

  // ============================================
  // state access
  // ============================================
  describe('state', () => {
    it('should expose state for reading', () => {
      const { api, state } = createApi();
      expect(api.state).toBe(state);
    });

    it('should allow direct state modification', () => {
      const { api } = createApi();
      api.state.pieces.clear();
      expect(api.state.pieces.size).toBe(0);
    });
  });
});
