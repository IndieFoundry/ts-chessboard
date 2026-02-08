/**
 * Auto-generated piece rendering for shapes
 */
import type { State } from '../../engine/state';
import type { PieceNode } from '../../core/types';
import type { DrawShape } from '../../interactions/draw-handler';
import type { SyncableShape, Hash } from './shapes';
import { syncShapesSimple } from './shapes';
import { key2pos } from '../../core/squares';
import { whitePov } from '../../core/moves';
import { createEl, translateAndScale, posToTranslate as posToTranslateFromBounds } from '../../utils/dom';

/**
 * Renders auto-pieces for shapes
 */
export function render(state: State, autoPieceEl: HTMLElement): void {
  const autoPieces = state.drawable.autoShapes.filter(autoShape => autoShape.piece);
  const autoPieceShapes: SyncableShape[] = autoPieces.map((s: DrawShape) => {
    return {
      shape: s,
      hash: hash(s),
      current: false,
      pendingErase: false,
    };
  });

  syncShapesSimple(autoPieceShapes, autoPieceEl, shape => renderShape(state, shape, state.dom.bounds()));
}

/**
 * Re-renders auto-pieces after resize
 */
export function renderResized(state: State): void {
  const asWhite: boolean = whitePov(state),
    posToTranslate = posToTranslateFromBounds(state.dom.bounds());
  let el = state.dom.elements.autoPieces?.firstChild as PieceNode | undefined;
  while (el) {
    translateAndScale(el, posToTranslate(key2pos(el.cbKey), asWhite), el.cbScale);
    el = el.nextSibling as PieceNode | undefined;
  }
}

/** Role to single-char code */
const roleCode: Record<string, string> = {
  pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k'
};

function renderShape(state: State, { shape, hash }: SyncableShape, bounds: DOMRectReadOnly): PieceNode {
  const orig = shape.orig;
  const role = shape.piece?.role;
  const color = shape.piece?.color;
  const scale = shape.piece?.scale;

  const pieceEl = createEl('div', 'cb-piece') as PieceNode;
  pieceEl.dataset.c = color === 'white' ? 'w' : 'b';
  pieceEl.dataset.r = role ? roleCode[role] : '';
  pieceEl.setAttribute('cbHash', hash);
  pieceEl.cbKey = orig;
  pieceEl.cbScale = scale;
  translateAndScale(pieceEl, posToTranslateFromBounds(bounds)(key2pos(orig), whitePov(state)), scale);

  return pieceEl;
}

const hash = (autoPiece: DrawShape): Hash =>
  [autoPiece.orig, autoPiece.piece?.role, autoPiece.piece?.color, autoPiece.piece?.scale].join(',');
