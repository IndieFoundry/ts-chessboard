/**
 * Event binding for board interactions
 */
import type { State } from '../engine/state';
import type { MouchEvent, Unbind } from '../core/types';
import * as drag from './drag-handler';
import * as draw from './draw-handler';
import { drop } from './drop-handler';
import { isRightButton } from '../utils/dom';

type MouchBind = (e: MouchEvent) => void;
type StateMouchBind = (d: State, e: MouchEvent) => void;

/**
 * Binds events to the board element
 */
export function bindBoard(s: State, onResize: () => void): void {
  const boardEl = s.dom.elements.board;

  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(s.dom.elements.wrap);

  if (s.disableContextMenu || s.drawable.enabled) {
    boardEl.addEventListener('contextmenu', e => e.preventDefault());
  }

  // Always bind drag/draw events, even if currently viewOnly.
  // The handlers check s.viewOnly at runtime (line 78), so they'll no-op when viewOnly is true.
  // This fixes a bug where the board starts as viewOnly (e.g., opponent moves first in training)
  // and becomes interactive later — without this, events would never be bound.
  const onStart = startDragOrDraw(s);
  boardEl.addEventListener('touchstart', onStart as EventListener, {
    passive: false,
  });
  boardEl.addEventListener('mousedown', onStart as EventListener, {
    passive: false,
  });
}

/**
 * Binds document-level events
 */
export function bindDocument(s: State, onResize: () => void): Unbind {
  const unbinds: Unbind[] = [];

  if (!('ResizeObserver' in window)) unbinds.push(unbindable(document.body, 'board.resize', onResize));

  // Always bind document events (handlers check s.viewOnly at runtime)
  const onmove = dragOrDraw(s, drag.move, draw.move);
  const onend = dragOrDraw(s, drag.end, draw.end);

  for (const ev of ['touchmove', 'mousemove'])
    unbinds.push(unbindable(document, ev, onmove as EventListener));
  for (const ev of ['touchend', 'mouseup']) unbinds.push(unbindable(document, ev, onend as EventListener));

  const onScroll = () => s.dom.bounds.clear();
  unbinds.push(unbindable(document, 'scroll', onScroll, { capture: true, passive: true }));
  unbinds.push(unbindable(window, 'resize', onScroll, { passive: true }));

  return () => unbinds.forEach(f => f());
}

function unbindable(
  el: EventTarget,
  eventName: string,
  callback: EventListener,
  options?: AddEventListenerOptions,
): Unbind {
  el.addEventListener(eventName, callback, options);
  return () => el.removeEventListener(eventName, callback, options);
}

const startDragOrDraw =
  (s: State): MouchBind =>
  e => {
    // Re-measure before mapping this pointer to a square. The board rect is
    // memoized and only invalidated by scroll and by a resize of the wrap, so
    // a board that MOVED without either - chrome above it appearing or
    // disappearing, a panel collapsing, an accordion opening - kept mapping
    // pointers to where it used to be. Every click then landed on the wrong
    // square, or on none at all, with nothing in the console: the board
    // simply read as dead. One getBoundingClientRect per gesture is cheap
    // (the fresh value still serves the whole drag, and mid-gesture scrolling
    // clears it again), and it is the only moment where being wrong costs the
    // user their move.
    s.dom.bounds.clear();
    if (s.draggable.current) drag.cancel(s);
    else if (s.drawable.current) draw.cancel(s);
    else if (e.shiftKey || isRightButton(e)) {
      if (s.drawable.enabled) draw.start(s, e);
    } else if (!s.viewOnly) {
      if (s.dropmode.active) drop(s, e);
      else drag.start(s, e);
    } else if (s.drawable.enabled && s.drawable.eraseOnClick && !isIgnoredPointer(s, e)) {
      // drag.start is where a playable board erases; a view-only one never gets there.
      draw.clear(s);
    }
  };

// Same filter drag.start applies before it erases.
const isIgnoredPointer = (s: State, e: MouchEvent): boolean =>
  !(s.trustAllEvents || e.isTrusted) ||
  (e.buttons !== undefined && e.buttons > 1) ||
  (!!e.touches && e.touches.length > 1);

const dragOrDraw =
  (s: State, withDrag: StateMouchBind, withDraw: StateMouchBind): MouchBind =>
  e => {
    if (s.drawable.current) {
      if (s.drawable.enabled) withDraw(s, e);
    } else if (!s.viewOnly) withDrag(s, e);
  };
