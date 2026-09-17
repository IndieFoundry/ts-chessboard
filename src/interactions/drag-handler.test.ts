/**
 * Regression tests for piece drag positioning.
 *
 * Guards the "tap flashes the piece to the top-left corner" bug: adding the
 * `.dragging` class drops the CSS square-positioning transform, and the pointer-
 * following transform is written a frame later in processDrag (and only once the
 * drag crosses the distance threshold). start() must therefore seat the piece on
 * its origin square SYNCHRONOUSLY, so a piece never renders at translate(0,0).
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { start } from './drag-handler';
import { defaults, type State } from '../engine/state';
import type { Key, MouchEvent, PieceNode } from '../core/types';

// rAF is QUEUED, not run, so we observe the state right after start() returns,
// before processDrag's frame. That is exactly the window the flash lived in.
let rafQueue: Array<(t: number) => void> = [];
beforeAll(() => {
  // @ts-expect-error - minimal window mock; 'ontouchstart' present => stats.dragged=false => drag not auto-started
  global.window = { ontouchstart: undefined };
  // @ts-expect-error - minimal document mock
  global.document = { createElement: () => ({ style: {}, dataset: {}, appendChild: () => {} }) };
  // @ts-expect-error - queue rAF instead of running it, to observe the pre-frame state
  global.requestAnimationFrame = ((cb: (t: number) => void) => {
    rafQueue.push(cb);
    return rafQueue.length;
  }) as typeof requestAnimationFrame;
  // @ts-expect-error - performance mock
  global.performance = { now: () => 0 };
});

/** A stand-in for a rendered piece node with just the surface start() touches. */
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

function makeState(pieceNode: PieceNode, orig: Key): State {
  const s = defaults() as unknown as State;
  s.trustAllEvents = true;
  s.orientation = 'white';
  s.turnColor = 'white';
  s.movable.color = 'white';
  s.movable.free = true;
  // Drawing off so a movable-piece click does not branch into drawClear.
  s.drawable.enabled = false;
  s.pieces = new Map([[orig, { role: 'pawn', color: 'white' }]]) as State['pieces'];

  const board = { firstChild: pieceNode } as unknown as HTMLElement;
  s.dom = {
    elements: { board, wrap: board, container: board },
    bounds: Object.assign(
      () =>
        ({
          left: 0, top: 0, width: 800, height: 800,
          right: 800, bottom: 800, x: 0, y: 0, toJSON: () => ({}),
        }) as DOMRectReadOnly,
      { clear: () => {} },
    ),
    redraw: vi.fn(),
    redrawNow: vi.fn(),
  } as unknown as State['dom'];
  return s;
}

/** Pointer-down at the center of a square, given an 800x800 white-oriented board. */
function pointerDownAt(x: number, y: number, target: PieceNode): MouchEvent {
  return {
    clientX: x, clientY: y, isTrusted: false, buttons: 0,
    touches: undefined, cancelable: true, ctrlKey: false,
    target, preventDefault: () => {},
  } as unknown as MouchEvent;
}

describe('drag start positioning', () => {
  it('seats the piece on its origin square synchronously (no top-left flash)', () => {
    rafQueue = [];
    const node = makePieceNode('e2');
    const s = makeState(node, 'e2');

    // e2 center on an 800x800 white board: file e -> x in [400,500), rank 2 ->
    // y in [600,700). key2pos('e2')=[4,1] -> translate(4*100, (7-1)*100).
    start(s, pointerDownAt(450, 650, node));

    expect(node.classList.contains('dragging')).toBe(true);
    // The piece must already carry an inline transform - the origin square, NOT
    // the empty string that would leave it pinned at translate(0,0).
    expect(node.style.transform).toBe('translate(400px,600px)');
    expect(node.style.transform).not.toBe('');
  });

  it('does not auto-start the drag on a plain tap (started stays false)', () => {
    // If the drag had auto-started, processDrag would have queued a frame that
    // overwrites the seat with the pointer position. On a tap it must not.
    rafQueue = [];
    const node = makePieceNode('e2');
    const s = makeState(node, 'e2');
    start(s, pointerDownAt(450, 650, node));
    // The seated transform is the square, not the pointer-centered position.
    expect(node.style.transform).toBe('translate(400px,600px)');
  });
});

describe('erase on click', () => {
  // A host that persists the user's shapes (a study/repertoire editor) must be
  // able to keep them across the clicks that play the next move.
  const shape = { orig: 'd4' as Key, brush: 'green' };

  function drawingState(eraseOnClick?: boolean) {
    rafQueue = [];
    const node = makePieceNode('e2');
    const s = makeState(node, 'e2');
    s.drawable.enabled = true;
    s.drawable.shapes = [shape];
    s.drawable.onChange = vi.fn();
    if (eraseOnClick !== undefined) s.drawable.eraseOnClick = eraseOnClick;
    return { s, node };
  }

  it.each([
    ['a movable piece', 450, 650],
    ['an empty square', 450, 450],
  ])('clears the shapes on a click on %s by default', (_label, x, y) => {
    const { s, node } = drawingState();
    start(s, pointerDownAt(x, y, node));
    expect(s.drawable.shapes).toEqual([]);
    expect(s.drawable.onChange).toHaveBeenCalledWith([]);
  });

  it.each([
    ['a movable piece', 450, 650],
    ['an empty square', 450, 450],
  ])('keeps the shapes on a click on %s with eraseOnClick: false', (_label, x, y) => {
    const { s, node } = drawingState(false);
    start(s, pointerDownAt(x, y, node));
    expect(s.drawable.shapes).toEqual([shape]);
    expect(s.drawable.onChange).not.toHaveBeenCalled();
  });
});
