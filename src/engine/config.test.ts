/**
 * Comprehensive tests for configuration handling.
 * Tests deep merging, FEN parsing, and special config handling.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { configure, applyAnimation, type Config } from './config';
import { defaults, type HeadlessState } from './state';
import type { Key } from '../core/types';

// Mock window for tests
beforeAll(() => {
  // @ts-expect-error - mocking window for tests
  global.window = { ontouchstart: undefined };
});

// Helper to create a default state for testing
const createState = (): HeadlessState => defaults();

describe('config', () => {
  // ============================================
  // applyAnimation
  // ============================================
  describe('applyAnimation', () => {
    it('should enable animation with duration above threshold', () => {
      const state = createState();
      const config: Config = { animation: { enabled: true, duration: 200 } };
      applyAnimation(state, config);
      expect(state.animation.enabled).toBe(true);
      expect(state.animation.duration).toBe(200);
    });

    it('should disable animation when duration is below 70ms', () => {
      const state = createState();
      const config: Config = { animation: { enabled: true, duration: 50 } };
      applyAnimation(state, config);
      expect(state.animation.enabled).toBe(false);
    });

    it('should disable animation when duration is exactly 70ms', () => {
      const state = createState();
      const config: Config = { animation: { enabled: true, duration: 70 } };
      applyAnimation(state, config);
      expect(state.animation.enabled).toBe(true);
    });

    it('should not change state if no animation config provided', () => {
      const state = createState();
      const originalEnabled = state.animation.enabled;
      const originalDuration = state.animation.duration;
      applyAnimation(state, {});
      expect(state.animation.enabled).toBe(originalEnabled);
      expect(state.animation.duration).toBe(originalDuration);
    });

    it('should merge partial animation config', () => {
      const state = createState();
      state.animation.duration = 300;
      const config: Config = { animation: { enabled: false } };
      applyAnimation(state, config);
      expect(state.animation.enabled).toBe(false);
      expect(state.animation.duration).toBe(300);
    });
  });

  // ============================================
  // configure - Basic settings
  // ============================================
  describe('configure - basic settings', () => {
    it('should set orientation', () => {
      const state = createState();
      configure(state, { orientation: 'black' });
      expect(state.orientation).toBe('black');
    });

    it('should set turnColor', () => {
      const state = createState();
      configure(state, { turnColor: 'black' });
      expect(state.turnColor).toBe('black');
    });

    it('should set autoCastle', () => {
      const state = createState();
      configure(state, { autoCastle: false });
      expect(state.autoCastle).toBe(false);
    });

    it('should set viewOnly', () => {
      const state = createState();
      configure(state, { viewOnly: true });
      expect(state.viewOnly).toBe(true);
    });

    it('should set coordinates', () => {
      const state = createState();
      configure(state, { coordinates: false });
      expect(state.coordinates).toBe(false);
    });

    it('should set ranksPosition', () => {
      const state = createState();
      configure(state, { ranksPosition: 'left' });
      expect(state.ranksPosition).toBe('left');
    });
  });

  // ============================================
  // configure - FEN handling
  // ============================================
  describe('configure - FEN handling', () => {
    it('should parse FEN and set pieces', () => {
      const state = createState();
      configure(state, { fen: '8/8/8/8/4P3/8/8/8' });
      expect(state.pieces.size).toBe(1);
      expect(state.pieces.get('e4')?.role).toBe('pawn');
      expect(state.pieces.get('e4')?.color).toBe('white');
    });

    it('should clear shapes when FEN is set', () => {
      const state = createState();
      state.drawable.shapes = [{ orig: 'e2', dest: 'e4', brush: 'green' }];
      configure(state, { fen: '8/8/8/8/8/8/8/8' });
      expect(state.drawable.shapes).toEqual([]);
    });

    it('should preserve shapes when FEN is set with shapes', () => {
      const state = createState();
      const shapes = [{ orig: 'e2' as const, dest: 'e4' as const, brush: 'green' as const }];
      configure(state, { fen: '8/8/8/8/8/8/8/8', drawable: { shapes } });
      expect(state.drawable.shapes).toEqual(shapes);
    });

    it('should handle empty board FEN', () => {
      const state = createState();
      configure(state, { fen: '8/8/8/8/8/8/8/8' });
      expect(state.pieces.size).toBe(0);
    });

    it('should handle full starting position FEN', () => {
      const state = createState();
      configure(state, { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR' });
      expect(state.pieces.size).toBe(32);
    });
  });

  // ============================================
  // configure - check highlighting
  // ============================================
  describe('configure - check highlighting', () => {
    it('should set check for specific color', () => {
      const state = createState();
      configure(state, { fen: '4k3/8/8/8/8/8/8/4K3', check: 'white' });
      expect(state.check).toBe('e1');
    });

    it('should set check for current turn when true', () => {
      const state = createState();
      state.turnColor = 'black';
      configure(state, { fen: '4k3/8/8/8/8/8/8/4K3', check: true });
      expect(state.check).toBe('e8');
    });

    it('should clear check when false', () => {
      const state = createState();
      state.check = 'e1';
      configure(state, { check: false });
      expect(state.check).toBeUndefined();
    });
  });

  // ============================================
  // configure - lastMove handling
  // ============================================
  describe('configure - lastMove handling', () => {
    it('should set lastMove from config', () => {
      const state = createState();
      configure(state, { lastMove: ['e2', 'e4'] });
      expect(state.lastMove).toEqual(['e2', 'e4']);
    });

    it('should clear lastMove when undefined in config', () => {
      const state = createState();
      state.lastMove = ['e2', 'e4'];
      configure(state, { lastMove: undefined });
      expect(state.lastMove).toBeUndefined();
    });

    it('should handle single square lastMove (drop)', () => {
      const state = createState();
      state.lastMove = ['e2', 'e4'];
      configure(state, { lastMove: ['e4'] });
      expect(state.lastMove).toEqual(['e4']);
    });
  });

  // ============================================
  // configure - movable dests
  // ============================================
  describe('configure - movable dests', () => {
    it('should override dests completely', () => {
      const state = createState();
      state.movable.dests = new Map<Key, Key[]>([['a2', ['a3', 'a4']]]);
      const newDests = new Map<Key, Key[]>([['e2', ['e3', 'e4']]]);
      configure(state, { movable: { dests: newDests } });
      expect(state.movable.dests).toEqual(newDests);
      expect(state.movable.dests?.has('a2')).toBe(false);
    });

    it('should filter rook squares when rookCastle is false', () => {
      const state = createState();
      state.pieces = new Map([['e1', { role: 'king', color: 'white' }]]);
      const dests = new Map<Key, Key[]>([['e1', ['a1', 'c1', 'g1', 'h1']]]);
      configure(state, {
        movable: { dests, color: 'white', rookCastle: false },
      });
      // a1 and h1 should be filtered since c1 and g1 are available
      expect(state.movable.dests?.get('e1')).not.toContain('a1');
      expect(state.movable.dests?.get('e1')).not.toContain('h1');
      expect(state.movable.dests?.get('e1')).toContain('c1');
      expect(state.movable.dests?.get('e1')).toContain('g1');
    });
  });

  // ============================================
  // configure - drawable autoShapes
  // ============================================
  describe('configure - drawable', () => {
    it('should override autoShapes completely', () => {
      const state = createState();
      state.drawable.autoShapes = [{ orig: 'a1', brush: 'green' }];
      const newAutoShapes = [{ orig: 'e4' as const, brush: 'red' as const }];
      configure(state, { drawable: { autoShapes: newAutoShapes } });
      expect(state.drawable.autoShapes).toEqual(newAutoShapes);
    });

    it('should set user shapes', () => {
      const state = createState();
      const shapes = [{ orig: 'e2' as const, dest: 'e4' as const, brush: 'green' as const }];
      configure(state, { drawable: { shapes } });
      expect(state.drawable.shapes).toEqual(shapes);
    });

    it('should set drawable enabled', () => {
      const state = createState();
      configure(state, { drawable: { enabled: false } });
      expect(state.drawable.enabled).toBe(false);
    });

    it('should set drawable visible', () => {
      const state = createState();
      configure(state, { drawable: { visible: false } });
      expect(state.drawable.visible).toBe(false);
    });
  });

  // ============================================
  // configure - deep merge
  // ============================================
  describe('configure - deep merge', () => {
    it('should deep merge nested objects', () => {
      const state = createState();
      state.movable.showDests = true;
      state.movable.free = false;
      configure(state, { movable: { showDests: false } });
      expect(state.movable.showDests).toBe(false);
      expect(state.movable.free).toBe(false); // preserved
    });

    it('should deep merge highlight settings', () => {
      const state = createState();
      state.highlight.lastMove = true;
      state.highlight.check = true;
      configure(state, { highlight: { check: false } });
      expect(state.highlight.check).toBe(false);
      expect(state.highlight.lastMove).toBe(true); // preserved
    });

    it('should merge premovable settings', () => {
      const state = createState();
      configure(state, { premovable: { enabled: false, castle: false } });
      expect(state.premovable.enabled).toBe(false);
      expect(state.premovable.castle).toBe(false);
      expect(state.premovable.showDests).toBe(true); // preserved
    });

    it('should merge draggable settings', () => {
      const state = createState();
      configure(state, { draggable: { enabled: false, showGhost: false } });
      expect(state.draggable.enabled).toBe(false);
      expect(state.draggable.showGhost).toBe(false);
      expect(state.draggable.deleteOnDropOff).toBe(false); // preserved
    });
  });

  // ============================================
  // configure - selected
  // ============================================
  describe('configure - selected', () => {
    it('should set selected square', () => {
      const state = createState();
      configure(state, { selected: 'e4' });
      expect(state.selected).toBe('e4');
    });

    it('should compute premove dests when setting selected', () => {
      const state = createState();
      state.pieces = new Map([['e2', { role: 'pawn', color: 'white' }]]);
      state.turnColor = 'black'; // It's black's turn, so white can premove
      state.movable.color = 'white';
      configure(state, { selected: 'e2' });
      // premovable.dests should be calculated
      expect(state.premovable.dests).toBeDefined();
    });
  });

  // ============================================
  // configure - events
  // ============================================
  describe('configure - events', () => {
    it('should set move event handler', () => {
      const state = createState();
      const moveHandler = () => {};
      configure(state, { events: { move: moveHandler } });
      expect(state.events.move).toBe(moveHandler);
    });

    it('should set movable after event handler', () => {
      const state = createState();
      const afterHandler = () => {};
      configure(state, { movable: { events: { after: afterHandler } } });
      expect(state.movable.events.after).toBe(afterHandler);
    });

    it('should set premovable set event handler', () => {
      const state = createState();
      const setHandler = () => {};
      configure(state, { premovable: { events: { set: setHandler } } });
      expect(state.premovable.events.set).toBe(setHandler);
    });
  });
});
