/**
 * Piece rendering and synchronization
 */
import type { State } from '../engine/state';
import type { Key, Pieces, Piece, PieceNode, SquareNode, Pos, SquareClasses } from '../core/types';
import type { AnimCurrent, AnimVectors, AnimVector, AnimFadings } from '../animation/animator';
import type { DragCurrent } from '../interactions/drag-handler';
import { key2pos } from '../core/squares';
import { whitePov } from '../core/moves';
import { createEl, translate, setVisible, posToTranslate as posToTranslateFromBounds } from '../utils/dom';
import { squaresBetween } from '../utils/math';
import { pos2key } from '../core/squares';

type PieceName = string; // `$color $role`

/**
 * Main render function - synchronizes pieces with the DOM
 */
export function render(s: State): void {
  const asWhite: boolean = whitePov(s),
    posToTranslate = posToTranslateFromBounds(s.dom.bounds()),
    boardEl: HTMLElement = s.dom.elements.board,
    pieces: Pieces = s.pieces,
    curAnim: AnimCurrent | undefined = s.animation.current,
    anims: AnimVectors = curAnim ? curAnim.plan.anims : new Map(),
    fadings: AnimFadings = curAnim ? curAnim.plan.fadings : new Map(),
    curDrag: DragCurrent | undefined = s.draggable.current,
    samePieces: Set<Key> = new Set(),
    movedPieces: Map<PieceName, PieceNode[]> = new Map(),
    desiredSquares: SquareClasses = computeSquareClasses(s),
    availableSquares: Map<string, SquareNode[]> = new Map();

  let k: Key,
    el: PieceNode | SquareNode | undefined,
    pieceAtKey: Piece | undefined,
    elPieceName: PieceName,
    anim: AnimVector | undefined,
    fading: Piece | undefined,
    pMvdset: PieceNode[] | undefined,
    pMvd: PieceNode | undefined,
    sAvail: SquareNode | undefined;

  // walk over all board dom elements, apply animations and flag moved pieces
  el = boardEl.firstChild as PieceNode | SquareNode | undefined;
  while (el) {
    k = el.cgKey;
    if (isPieceNode(el)) {
      pieceAtKey = pieces.get(k);
      anim = anims.get(k);
      fading = fadings.get(k);
      elPieceName = el.cgPiece;

      if (el.cgDragging && (!curDrag || curDrag.orig !== k)) {
        el.classList.remove('dragging');
        translate(el, posToTranslate(key2pos(k), asWhite));
        el.cgDragging = false;
      }

      if (!fading && el.cgFading) {
        el.cgFading = false;
        el.classList.remove('fading');
      }

      if (pieceAtKey) {
        if (anim && el.cgAnimating && elPieceName === pieceNameOf(pieceAtKey)) {
          const pos = key2pos(k);
          pos[0] += anim[2];
          pos[1] += anim[3];
          el.classList.add('anim');
          translate(el, posToTranslate(pos, asWhite));
        } else if (el.cgAnimating) {
          el.cgAnimating = false;
          el.classList.remove('anim');
          translate(el, posToTranslate(key2pos(k), asWhite));
          if (s.addPieceZIndex) el.style.zIndex = posZIndex(key2pos(k), asWhite);
        }

        if (elPieceName === pieceNameOf(pieceAtKey) && (!fading || !el.cgFading)) samePieces.add(k);
        else if (fading && elPieceName === pieceNameOf(fading)) {
          el.classList.add('fading');
          el.cgFading = true;
        } else appendValue(movedPieces, elPieceName, el);
      } else appendValue(movedPieces, elPieceName, el);
    } else if (isSquareNode(el)) {
      const cls = el.className;
      if (desiredSquares.get(k) === cls) {
        setVisible(el, true);
        desiredSquares.delete(k);
      } else appendValue(availableSquares, cls, el);
    }
    el = el.nextSibling as PieceNode | SquareNode | undefined;
  }

  // walk over all squares in current set, apply dom changes
  for (const [sk, className] of desiredSquares) {
    sAvail = availableSquares.get(className)?.pop();
    const translation = posToTranslate(key2pos(sk), asWhite);
    if (sAvail) {
      sAvail.cgKey = sk;
      translate(sAvail, translation);
      setVisible(sAvail, true);
    } else {
      const squareNode = createEl('square', className) as SquareNode;
      squareNode.cgKey = sk;
      translate(squareNode, translation);
      boardEl.insertBefore(squareNode, boardEl.firstChild);
    }
  }

  // hide unused squares
  for (const [_, nodes] of availableSquares.entries()) {
    for (const node of nodes) setVisible(node, false);
  }

  // walk over all pieces in current set
  for (const [k, p] of pieces) {
    anim = anims.get(k);
    if (!samePieces.has(k)) {
      pMvdset = movedPieces.get(pieceNameOf(p));
      pMvd = pMvdset && pMvdset.pop();

      if (pMvd) {
        pMvd.cgKey = k;
        if (pMvd.cgFading) {
          pMvd.classList.remove('fading');
          pMvd.cgFading = false;
        }
        const pos = key2pos(k);
        if (s.addPieceZIndex) pMvd.style.zIndex = posZIndex(pos, asWhite);
        if (anim) {
          pMvd.cgAnimating = true;
          pMvd.classList.add('anim');
          pos[0] += anim[2];
          pos[1] += anim[3];
        }
        translate(pMvd, posToTranslate(pos, asWhite));
      } else {
        const pieceName = pieceNameOf(p),
          pieceNode = createEl('piece', pieceName) as PieceNode,
          pos = key2pos(k);

        pieceNode.cgPiece = pieceName;
        pieceNode.cgKey = k;
        if (anim) {
          pieceNode.cgAnimating = true;
          pos[0] += anim[2];
          pos[1] += anim[3];
        }
        translate(pieceNode, posToTranslate(pos, asWhite));

        if (s.addPieceZIndex) pieceNode.style.zIndex = posZIndex(pos, asWhite);

        boardEl.appendChild(pieceNode);
      }
    }
  }

  // remove remaining pieces
  for (const nodes of movedPieces.values()) removeNodes(s, nodes);
}

/**
 * Re-renders after resize
 */
export function renderResized(s: State): void {
  const asWhite: boolean = whitePov(s),
    posToTranslate = posToTranslateFromBounds(s.dom.bounds());
  let el = s.dom.elements.board.firstChild as PieceNode | SquareNode | undefined;
  while (el) {
    if ((isPieceNode(el) && !el.cgAnimating) || isSquareNode(el)) {
      translate(el, posToTranslate(key2pos(el.cgKey), asWhite));
    }
    el = el.nextSibling as PieceNode | SquareNode | undefined;
  }
}

/**
 * Updates bounds after resize
 */
export function updateBounds(s: State): void {
  const bounds = s.dom.elements.wrap.getBoundingClientRect();
  const container = s.dom.elements.container;
  const ratio = bounds.height / bounds.width;
  const width = (Math.floor((bounds.width * window.devicePixelRatio) / 8) * 8) / window.devicePixelRatio;
  const height = width * ratio;
  container.style.width = width + 'px';
  container.style.height = height + 'px';
  s.dom.bounds.clear();

  s.addDimensionsCssVarsTo?.style.setProperty('---cg-width', width + 'px');
  s.addDimensionsCssVarsTo?.style.setProperty('---cg-height', height + 'px');
}

const isPieceNode = (el: PieceNode | SquareNode): el is PieceNode => el.tagName === 'PIECE';
const isSquareNode = (el: PieceNode | SquareNode): el is SquareNode => el.tagName === 'SQUARE';

function removeNodes(s: State, nodes: HTMLElement[]): void {
  for (const node of nodes) s.dom.elements.board.removeChild(node);
}

function posZIndex(pos: Pos, asWhite: boolean): string {
  const minZ = 3;
  const rank = pos[1];
  const z = asWhite ? minZ + 7 - rank : minZ + rank;
  return `${z}`;
}

const pieceNameOf = (piece: Piece): string => `${piece.color} ${piece.role}`;

const normalizeLastMoveStandardRookCastle = (s: State, k: Key): Key =>
  !!s.lastMove?.[1] &&
  !s.pieces.has(s.lastMove[1]) &&
  s.lastMove[0][0] === 'e' &&
  ['h', 'a'].includes(s.lastMove[1][0]) &&
  s.lastMove[0][1] === s.lastMove[1][1] &&
  squaresBetween(...key2pos(s.lastMove[0]), ...key2pos(s.lastMove[1]), pos2key).some(sq => s.pieces.has(sq))
    ? (((k > s.lastMove[0] ? 'g' : 'c') + k[1]) as Key)
    : k;

function computeSquareClasses(s: State): SquareClasses {
  const squares: SquareClasses = new Map();
  if (s.lastMove && s.highlight.lastMove)
    for (const [i, k] of s.lastMove.entries())
      addSquare(squares, i === 1 ? normalizeLastMoveStandardRookCastle(s, k) : k, 'last-move');
  if (s.check && s.highlight.check) addSquare(squares, s.check, 'check');
  if (s.selected) {
    addSquare(squares, s.selected, 'selected');
    if (s.movable.showDests) {
      for (const k of s.movable.dests?.get(s.selected) ?? [])
        addSquare(squares, k, 'move-dest' + (s.pieces.has(k) ? ' oc' : ''));
      for (const k of s.premovable.customDests?.get(s.selected) ?? s.premovable.dests ?? [])
        addSquare(squares, k, 'premove-dest' + (s.pieces.has(k) ? ' oc' : ''));
    }
  }
  const premove = s.premovable.current;
  if (premove) for (const k of premove) addSquare(squares, k, 'current-premove');
  else if (s.predroppable.current) addSquare(squares, s.predroppable.current.key, 'current-premove');

  const o = s.exploding;
  if (o) for (const k of o.keys) addSquare(squares, k, 'exploding' + o.stage);

  if (s.highlight.custom) {
    s.highlight.custom.forEach((v: string, k: Key) => {
      addSquare(squares, k, v);
    });
  }

  return squares;
}

function addSquare(squares: SquareClasses, key: Key, klass: string): void {
  const classes = squares.get(key);
  if (classes) squares.set(key, `${classes} ${klass}`);
  else squares.set(key, klass);
}

function appendValue<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}
