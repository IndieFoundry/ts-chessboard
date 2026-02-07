/**
 * Drop mode handling for piece drops (crazyhouse/editor)
 */
import type { State } from '../engine/state';
import type { Piece, MouchEvent } from '../core/types';
import * as moves from '../core/moves';
import { eventPosition } from '../utils/dom';
import { cancel as dragCancel } from './drag-handler';

/**
 * Enables drop mode for a piece
 */
export function setDropMode(s: State, piece?: Piece): void {
  s.dropmode = {
    active: true,
    piece,
  };
  dragCancel(s);
}

/**
 * Cancels drop mode
 */
export function cancelDropMode(s: State): void {
  s.dropmode = {
    active: false,
  };
}

/**
 * Handles a piece drop
 */
export function drop(s: State, e: MouchEvent): void {
  if (!s.dropmode.active) return;

  moves.unsetPremove(s);
  moves.unsetPredrop(s);

  const piece = s.dropmode.piece;

  if (piece) {
    s.pieces.set('a0', piece);
    const position = eventPosition(e);
    const dest = position && moves.getKeyAtDomPos(position, moves.whitePov(s), s.dom.bounds());
    if (dest) moves.dropNewPiece(s, 'a0', dest);
  }
  s.dom.redraw();
}
