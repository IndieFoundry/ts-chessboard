/**
 * Drawing annotations on the board (arrows, circles, etc.)
 */
import type { State } from '../engine/state';
import type { Key, Color, Role, BrushColor, NumberPair, MouchEvent } from '../core/types';
import { unselect, cancelMove, getKeyAtDomPos, getSnappedKeyAtDomPos, whitePov } from '../core/moves';
import { eventPosition, isRightButton } from '../utils/dom';

/** A drawable shape on the board */
export interface DrawShape {
  orig: Key;
  dest?: Key;
  brush?: string;
  modifiers?: DrawModifiers;
  piece?: DrawShapePiece;
  customSvg?: { html: string; center?: 'orig' | 'dest' | 'label' };
  label?: { text: string; fill?: string };
  below?: boolean;
}

/** Shape modifiers */
export interface DrawModifiers {
  lineWidth?: number;
  hilite?: string;
}

/** A piece to draw */
export interface DrawShapePiece {
  role: Role;
  color: Color;
  scale?: number;
}

/** A drawing brush */
export interface DrawBrush {
  key: string;
  color: string;
  opacity: number;
  lineWidth: number;
}

/** Collection of brushes */
export interface DrawBrushes {
  green: DrawBrush;
  red: DrawBrush;
  blue: DrawBrush;
  yellow: DrawBrush;
  [color: string]: DrawBrush;
}

/** Drawable state */
export interface Drawable {
  enabled: boolean;
  visible: boolean;
  defaultSnapToValidMove: boolean;
  eraseOnMovablePieceClick: boolean;
  onChange?: (shapes: DrawShape[]) => void;
  shapes: DrawShape[];
  autoShapes: DrawShape[];
  current?: DrawCurrent;
  brushes: DrawBrushes;
  prevSvgHash: string;
}

/** Current drawing state */
export interface DrawCurrent {
  orig: Key;
  dest?: Key;
  mouseSq?: Key;
  pos: NumberPair;
  brush: BrushColor;
  snapToValidMove: boolean;
}

const brushes: BrushColor[] = ['green', 'red', 'blue', 'yellow'];

/**
 * Starts drawing
 */
export function start(state: State, e: MouchEvent): void {
  if (e.touches && e.touches.length > 1) return;
  e.stopPropagation();
  e.preventDefault();
  e.ctrlKey ? unselect(state) : cancelMove(state);
  const pos = eventPosition(e)!,
    orig = getKeyAtDomPos(pos, whitePov(state), state.dom.bounds());
  if (!orig) return;
  state.drawable.current = {
    orig,
    pos,
    brush: eventBrush(e),
    snapToValidMove: state.drawable.defaultSnapToValidMove,
  };

  processDraw(state);
}

/**
 * Processes drawing animation frame
 */
export function processDraw(state: State): void {
  requestAnimationFrame(() => {
    const cur = state.drawable.current;
    if (cur) {
      const keyAtDomPos = getKeyAtDomPos(cur.pos, whitePov(state), state.dom.bounds());
      if (!keyAtDomPos) {
        cur.snapToValidMove = false;
      }
      const mouseSq = cur.snapToValidMove
        ? getSnappedKeyAtDomPos(cur.orig, cur.pos, whitePov(state), state.dom.bounds())
        : keyAtDomPos;
      if (mouseSq !== cur.mouseSq) {
        cur.mouseSq = mouseSq;
        cur.dest = mouseSq !== cur.orig ? mouseSq : undefined;
        state.dom.redrawNow();
      }
      processDraw(state);
    }
  });
}

/**
 * Handles mouse move during drawing
 */
export function move(state: State, e: MouchEvent): void {
  if (state.drawable.current) state.drawable.current.pos = eventPosition(e)!;
}

/**
 * Ends drawing
 */
export function end(state: State): void {
  const cur = state.drawable.current;
  if (cur) {
    if (cur.mouseSq) addShape(state.drawable, cur);
    cancel(state);
  }
}

/**
 * Cancels drawing
 */
export function cancel(state: State): void {
  if (state.drawable.current) {
    state.drawable.current = undefined;
    state.dom.redraw();
  }
}

/**
 * Clears all user shapes
 */
export function clear(state: State): void {
  if (state.drawable.shapes.length) {
    state.drawable.shapes = [];
    state.dom.redraw();
    onChange(state.drawable);
  }
}

/** Checks if two shapes have the same endpoints */
export const sameEndpoints = (s1: DrawShape, s2: DrawShape) => s1.orig === s2.orig && s1.dest === s2.dest;

/** Checks if two shapes have the same color */
export const sameColor = (s1: DrawShape, s2: DrawShape) => s1.brush === s2.brush;

function eventBrush(e: MouchEvent): BrushColor {
  const modA = (e.shiftKey || e.ctrlKey) && isRightButton(e);
  const modB = e.altKey || e.metaKey || e.getModifierState?.('AltGraph');
  return brushes[(modA ? 1 : 0) + (modB ? 2 : 0)];
}

function addShape(drawable: Drawable, cur: DrawCurrent): void {
  const similar = drawable.shapes.find(s => sameEndpoints(s, cur));
  if (similar) drawable.shapes = drawable.shapes.filter(s => !sameEndpoints(s, cur));
  if (!similar || !sameColor(similar, cur))
    drawable.shapes.push({
      orig: cur.orig,
      dest: cur.dest,
      brush: cur.brush,
    });
  onChange(drawable);
}

function onChange(drawable: Drawable): void {
  if (drawable.onChange) drawable.onChange(drawable.shapes);
}
