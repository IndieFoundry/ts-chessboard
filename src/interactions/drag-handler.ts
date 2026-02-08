/**
 * Drag and drop handling for pieces
 */
import type { State } from '../engine/state';
import type { Key, Piece, NumberPair, MouchEvent, PieceNode } from '../core/types';
import * as moves from '../core/moves';
import { key2pos, samePiece } from '../core/squares';
import { eventPosition, translate, posToTranslate, setVisible } from '../utils/dom';
import { distanceSq } from '../utils/math';
import { clear as drawClear } from './draw-handler';
import { anim } from '../animation/animator';

/** Current drag state */
export interface DragCurrent {
  orig: Key;
  piece: Piece;
  origPos: NumberPair;
  pos: NumberPair;
  started: boolean;
  element: PieceNode | (() => PieceNode | undefined);
  newPiece?: boolean;
  force?: boolean;
  previouslySelected?: Key;
  originTarget: EventTarget | null;
  keyHasChanged: boolean;
}

/**
 * Starts dragging a piece
 */
export function start(s: State, e: MouchEvent): void {
  if (!(s.trustAllEvents || e.isTrusted)) return;
  if (e.buttons !== undefined && e.buttons > 1) return;
  if (e.touches && e.touches.length > 1) return;

  const bounds = s.dom.bounds(),
    position = eventPosition(e)!,
    orig = moves.getKeyAtDomPos(position, moves.whitePov(s), bounds);
  if (!orig) return;

  const piece = s.pieces.get(orig);
  const previouslySelected = s.selected;

  if (
    !previouslySelected &&
    s.drawable.enabled &&
    (s.drawable.eraseOnMovablePieceClick || !piece || piece.color !== s.turnColor)
  )
    drawClear(s);

  if (
    e.cancelable !== false &&
    (!e.touches || s.blockTouchScroll || piece || previouslySelected || pieceCloseTo(s, position))
  )
    e.preventDefault();
  else if (e.touches) return;

  const hadPremove = !!s.premovable.current;
  const hadPredrop = !!s.predroppable.current;
  s.stats.ctrlKey = e.ctrlKey;

  if (s.selected && moves.canMove(s, s.selected, orig)) {
    anim(state => moves.selectSquare(state, orig), s);
  } else {
    moves.selectSquare(s, orig);
  }

  const stillSelected = s.selected === orig;
  const element = pieceElementByKey(s, orig);

  if (piece && element && stillSelected && moves.isDraggable(s, orig)) {
    s.draggable.current = {
      orig,
      piece,
      origPos: position,
      pos: position,
      started: s.draggable.autoDistance && s.stats.dragged,
      element,
      previouslySelected,
      originTarget: e.target,
      keyHasChanged: false,
    };
    element.cbDragging = true;
    element.classList.add('dragging');

    const ghost = s.dom.elements.ghost;
    if (ghost) {
      ghost.className = `ghost ${piece.color} ${piece.role}`;
      translate(ghost, posToTranslate(bounds)(key2pos(orig), moves.whitePov(s)));
      setVisible(ghost, true);
    }
    processDrag(s);
  } else {
    if (hadPremove) moves.unsetPremove(s);
    if (hadPredrop) moves.unsetPredrop(s);
  }
  s.dom.redraw();
}

export function pieceCloseTo(s: State, pos: NumberPair): boolean {
  const asWhite = moves.whitePov(s),
    bounds = s.dom.bounds();
  // Check if position corresponds to a valid square
  const center = moves.getKeyAtDomPos(pos, asWhite, bounds);
  if (center && s.pieces.has(center)) return true;
  return false;
}

/**
 * Drags a new piece from outside the board
 */
export function dragNewPiece(s: State, piece: Piece, e: MouchEvent, force?: boolean): void {
  const key: Key = 'a0';
  s.pieces.set(key, piece);
  s.dom.redraw();

  const position = eventPosition(e)!;

  s.draggable.current = {
    orig: key,
    piece,
    origPos: position,
    pos: position,
    started: true,
    element: () => pieceElementByKey(s, key),
    originTarget: e.target,
    newPiece: true,
    force: !!force,
    keyHasChanged: false,
  };
  processDrag(s);
}

function processDrag(s: State): void {
  requestAnimationFrame(() => {
    const cur = s.draggable.current;
    if (!cur) return;

    if (s.animation.current?.plan.anims.has(cur.orig)) s.animation.current = undefined;

    const origPiece = s.pieces.get(cur.orig);
    if (!origPiece || !samePiece(origPiece, cur.piece)) cancel(s);
    else {
      if (!cur.started && distanceSq(cur.pos, cur.origPos) >= Math.pow(s.draggable.distance, 2))
        cur.started = true;

      if (cur.started) {
        if (typeof cur.element === 'function') {
          const found = cur.element();
          if (!found) return;
          found.cbDragging = true;
          found.classList.add('dragging');
          cur.element = found;
        }

        const bounds = s.dom.bounds();
        translate(cur.element, [
          cur.pos[0] - bounds.left - bounds.width / 16,
          cur.pos[1] - bounds.top - bounds.height / 16,
        ]);

        cur.keyHasChanged ||= cur.orig !== moves.getKeyAtDomPos(cur.pos, moves.whitePov(s), bounds);
      }
    }
    processDrag(s);
  });
}

/**
 * Handles mouse move during drag
 */
export function move(s: State, e: MouchEvent): void {
  if (s.draggable.current && (!e.touches || e.touches.length < 2)) {
    s.draggable.current.pos = eventPosition(e)!;
  }
}

/**
 * Ends dragging
 */
export function end(s: State, e: MouchEvent): void {
  const cur = s.draggable.current;
  if (!cur) return;

  if (e.type === 'touchend' && e.cancelable !== false) e.preventDefault();

  if (e.type === 'touchend' && cur.originTarget !== e.target && !cur.newPiece) {
    s.draggable.current = undefined;
    return;
  }

  moves.unsetPremove(s);
  moves.unsetPredrop(s);

  const eventPos = eventPosition(e) || cur.pos;
  const dest = moves.getKeyAtDomPos(eventPos, moves.whitePov(s), s.dom.bounds());

  if (dest && cur.started && cur.orig !== dest) {
    if (cur.newPiece) moves.dropNewPiece(s, cur.orig, dest, cur.force);
    else {
      s.stats.ctrlKey = e.ctrlKey;
      if (moves.userMove(s, cur.orig, dest)) s.stats.dragged = true;
    }
  } else if (cur.newPiece) {
    s.pieces.delete(cur.orig);
  } else if (s.draggable.deleteOnDropOff && !dest) {
    s.pieces.delete(cur.orig);
    moves.callUserFunction(s.events.change);
  }

  if ((cur.orig === cur.previouslySelected || cur.keyHasChanged) && (cur.orig === dest || !dest))
    moves.unselect(s);
  else if (!s.selectable.enabled) moves.unselect(s);

  removeDragElements(s);

  s.draggable.current = undefined;
  s.dom.redraw();
}

/**
 * Cancels dragging
 */
export function cancel(s: State): void {
  const cur = s.draggable.current;
  if (cur) {
    if (cur.newPiece) s.pieces.delete(cur.orig);
    s.draggable.current = undefined;
    moves.unselect(s);
    removeDragElements(s);
    s.dom.redraw();
  }
}

function removeDragElements(s: State): void {
  const e = s.dom.elements;
  if (e.ghost) setVisible(e.ghost, false);
}

function isPieceNode(el: Node): el is PieceNode {
  return (el as HTMLElement).tagName === 'PIECE';
}

function pieceElementByKey(s: State, key: Key): PieceNode | undefined {
  let el = s.dom.elements.board.firstChild;
  while (el) {
    if (isPieceNode(el) && el.cbKey === key) return el;
    el = el.nextSibling;
  }
  return;
}
