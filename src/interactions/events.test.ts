/**
 * Regression test for the "board moved, board went dead" bug.
 *
 * The board rect is memoized and only invalidated on scroll and on a resize of
 * the wrap, so a board that MOVES without either (chrome above it appearing or
 * disappearing, a panel collapsing) kept mapping pointers to its old position:
 * clicks landed on the wrong square or on nothing, silently. bindBoard's
 * pointer-down must therefore re-measure before resolving the square.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { bindBoard } from './events';
import { defaults, type State } from '../engine/state';
import { memo } from '../utils/memo';
import type { Key, MouchEvent, PieceNode } from '../core/types';

beforeAll(() => {
  // @ts-expect-error - minimal window mock; no ResizeObserver, so bindBoard skips it
  global.window = { ontouchstart: undefined };
  // @ts-expect-error - minimal document mock
  global.document = { createElement: () => ({ style: {}, dataset: {}, appendChild: () => {} }) };
  // @ts-expect-error - drag start queues a frame we never need to run here
  global.requestAnimationFrame = (() => 1) as typeof requestAnimationFrame;
  // @ts-expect-error - performance mock
  global.performance = { now: () => 0 };
});

function makePieceNode(key: Key): PieceNode {
  const classes = new Set<string>(['cb-piece']);
  const node = {
    cbKey: key,
    cbDragging: false,
    nextSibling: null,
    style: {} as CSSStyleDeclaration,
    dataset: {} as DOMStringMap,
    classList: {
      add: (c: string) => classes.add(c),
      remove: (c: string) => classes.delete(c),
      contains: (c: string) => classes.has(c),
      toggle: (c: string, force?: boolean) => {
        const on = force ?? !classes.has(c);
        if (on) classes.add(c);
        else classes.delete(c);
        return on;
      },
    },
  };
  return node as unknown as PieceNode;
}

/** 800x800 white-oriented board whose top edge is wherever `top` says. */
function rectAt(top: number): DOMRectReadOnly {
  return {
    left: 0, top, width: 800, height: 800,
    right: 800, bottom: top + 800, x: 0, y: top, toJSON: () => ({}),
  } as DOMRectReadOnly;
}

function setup(orig: Key) {
  const node = makePieceNode(orig);
  const s = defaults() as unknown as State;
  s.trustAllEvents = true;
  s.orientation = 'white';
  s.turnColor = 'white';
  s.movable.color = 'white';
  s.movable.free = true;
  s.drawable.enabled = false;
  s.pieces = new Map([[orig, { role: 'pawn', color: 'white' }]]) as State['pieces'];

  // The live rect the memo reads: moving the board is moving this.
  const live = { top: 0 };
  const measured = vi.fn(() => rectAt(live.top));

  // A real memo, so the caching this test is about is the caching in prod.
  let onStart: ((e: MouchEvent) => void) | undefined;
  const board = {
    firstChild: node,
    addEventListener: (ev: string, cb: EventListener) => {
      if (ev === 'mousedown') onStart = cb as unknown as (e: MouchEvent) => void;
    },
  } as unknown as HTMLElement;

  s.dom = {
    elements: { board, wrap: board, container: board },
    bounds: memo(measured),
    redraw: vi.fn(),
    redrawNow: vi.fn(),
  } as unknown as State['dom'];

  bindBoard(s, () => {});
  return { s, node, live, measured, mousedown: (x: number, y: number) =>
    onStart!({
      clientX: x, clientY: y, isTrusted: false, buttons: 0,
      touches: undefined, cancelable: true, ctrlKey: false,
      target: node, preventDefault: () => {},
    } as unknown as MouchEvent) };
}

describe('pointer-down bounds freshness', () => {
  it('resolves the square against the board CURRENT position after it moved', () => {
    const { s, live, mousedown } = setup('e2');

    // e2 on an 800x800 white board with its top at 0: x in [400,500),
    // y in [600,700).
    mousedown(450, 650);
    expect(s.selected).toBe('e2');

    // The board slides 300px down with no scroll and no resize: nothing in the
    // DOM tells the engine, and the memo still holds the old rect.
    s.selected = undefined;
    s.draggable.current = undefined;
    live.top = 300;

    // Same square, its new on-screen position.
    mousedown(450, 950);
    expect(s.selected).toBe('e2');
  });

  it('costs one measurement per gesture, not one per read', () => {
    const { s, measured, mousedown } = setup('e2');

    // start() reads the rect more than once (square lookup, then seating the
    // dragged piece); the cache must absorb all but the first.
    mousedown(450, 650);
    expect(measured).toHaveBeenCalledTimes(1);

    s.selected = undefined;
    s.draggable.current = undefined;
    mousedown(450, 650);
    expect(measured).toHaveBeenCalledTimes(2);
  });
});
