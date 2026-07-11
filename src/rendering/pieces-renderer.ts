/**
 * Piece rendering and DOM synchronization.
 * Original implementation for @indiefoundry/chessboard.
 */
import type { State } from '../engine/state';
import type { Key, Pieces, Piece, PieceNode, SquareNode, Pos, SquareClasses } from '../core/types';
import type { ActiveTransition, MotionVectorMap, FadingPieceMap } from '../animation/animator';
import type { DragCurrent } from '../interactions/drag-handler';
import { key2pos, pos2key } from '../core/squares';
import { isWhitePerspective } from '../core/moves';
import { createEl, translate, setVisible, setPositionByKey, posToTranslate as computePixelPosition } from '../utils/dom';
import { squaresBetween } from '../utils/math';

/** Piece identifier string: `${colorCode}${roleCode}` */
type PieceIdentifier = string;

/** Color to single-char code */
const colorCode: Record<string, string> = { white: 'w', black: 'b' };

/** Role to single-char code */
const roleCode: Record<string, string> = {
  pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k'
};

/**
 * Check if a DOM node is a piece element.
 */
function isPieceElement(el: HTMLElement): el is PieceNode {
  return el.classList.contains('cb-piece');
}

/**
 * Check if a DOM node is a square highlight element.
 */
function isSquareElement(el: HTMLElement): el is SquareNode {
  return el.classList.contains('cb-sq');
}

/**
 * Recover the logical highlight class from a square element's className
 * (for elements created before cbSquareClass existed).
 */
function logicalSquareClass(className: string): string {
  return className
    .split(' ')
    .filter(c => c && c !== 'cb-sq' && c !== 'hidden')
    .join(' ');
}

/**
 * Get a unique identifier for a piece (color code + role code).
 */
function getPieceIdentifier(piece: Piece): PieceIdentifier {
  return `${colorCode[piece.color]}${roleCode[piece.role]}`;
}

/**
 * Calculate z-index for a piece based on rank (for 3D boards).
 */
function calculateZIndex(coords: Pos, whiteBottom: boolean): string {
  const baseZ = 3;
  const rank = coords[1];
  const z = whiteBottom ? baseZ + 7 - rank : baseZ + rank;
  return `${z}`;
}

/**
 * Remove DOM nodes from the board.
 */
function cleanupDomNodes(state: State, nodes: HTMLElement[]): void {
  for (const node of nodes) {
    state.dom.elements.board.removeChild(node);
  }
}

/**
 * Push a value to an array in a Map, creating the array if needed.
 */
function pushToMap<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const existing = map.get(key);
  if (existing) existing.push(value);
  else map.set(key, [value]);
}

/**
 * Adjust last move destination for castling display.
 * When castling with rook notation (e1-h1), show king destination instead.
 */
function adjustLastMoveForCastle(state: State, key: Key): Key {
  const lastMove = state.lastMove;
  if (!lastMove?.[1]) return key;

  // Check if this looks like a castling move
  const fromFile = lastMove[0][0];
  const toFile = lastMove[1][0];
  const fromRank = lastMove[0][1];
  const toRank = lastMove[1][1];

  if (
    fromFile === 'e' &&
    (toFile === 'h' || toFile === 'a') &&
    fromRank === toRank &&
    !state.pieces.has(lastMove[1])
  ) {
    // Check if there's a piece between origin and destination (the castled king)
    const squaresInPath = squaresBetween(
      ...key2pos(lastMove[0]),
      ...key2pos(lastMove[1]),
      pos2key
    );
    if (squaresInPath.some(sq => state.pieces.has(sq))) {
      // This is a rook-notation castle, show king destination instead
      const kingFile = key > lastMove[0] ? 'g' : 'c';
      return (kingFile + key[1]) as Key;
    }
  }

  return key;
}

/**
 * Add a CSS class to a square in the highlights map.
 */
function addHighlight(map: SquareClasses, key: Key, className: string): void {
  const existing = map.get(key);
  if (existing) {
    map.set(key, `${existing} ${className}`);
  } else {
    map.set(key, className);
  }
}

/**
 * Build the map of squares that need visual highlighting.
 */
function buildSquareHighlights(state: State): SquareClasses {
  const highlights: SquareClasses = new Map();

  // Last move highlights
  if (state.lastMove && state.highlight.lastMove) {
    for (let i = 0; i < state.lastMove.length; i++) {
      const key = state.lastMove[i];
      // Adjust destination square for castling
      const adjustedKey = i === 1 ? adjustLastMoveForCastle(state, key) : key;
      addHighlight(highlights, adjustedKey, 'last-move');
    }
  }

  // Check highlight
  if (state.check && state.highlight.check) {
    addHighlight(highlights, state.check, 'check');
  }

  // Selected square and move destinations
  if (state.selected) {
    addHighlight(highlights, state.selected, 'selected');

    if (state.movable.showDests) {
      // Regular move destinations
      const destinations = state.movable.dests?.get(state.selected) ?? [];
      for (const dest of destinations) {
        const className = state.pieces.has(dest) ? 'move-dest oc' : 'move-dest';
        addHighlight(highlights, dest, className);
      }

      // Premove destinations
      const premoveDestinations = state.premovable.customDests?.get(state.selected) ?? state.premovable.dests ?? [];
      for (const dest of premoveDestinations) {
        const className = state.pieces.has(dest) ? 'premove-dest oc' : 'premove-dest';
        addHighlight(highlights, dest, className);
      }
    }
  }

  // Current premove highlight
  const premove = state.premovable.current;
  if (premove) {
    for (const key of premove) {
      addHighlight(highlights, key, 'current-premove');
    }
  } else if (state.predroppable.current) {
    addHighlight(highlights, state.predroppable.current.key, 'current-premove');
  }

  // Explosion effects (atomic chess)
  const explosion = state.exploding;
  if (explosion) {
    for (const key of explosion.keys) {
      addHighlight(highlights, key, 'exploding' + explosion.stage);
    }
  }

  // Custom user-defined highlights
  if (state.highlight.custom) {
    state.highlight.custom.forEach((className: string, key: Key) => {
      addHighlight(highlights, key, className);
    });
  }

  return highlights;
}

/**
 * Main DOM synchronization function.
 * Updates piece and square elements to match current board state.
 */
export function syncPiecesWithDom(state: State): void {
  const whiteBottom = isWhitePerspective(state);
  const posToPixel = computePixelPosition(state.dom.bounds());
  const boardElement = state.dom.elements.board;
  const pieces: Pieces = state.pieces;

  // Set board orientation for CSS positioning
  boardElement.dataset.orientation = whiteBottom ? 'white' : 'black';

  // Get current animation state
  const activeAnimation: ActiveTransition | undefined = state.animation.current;
  const motions: MotionVectorMap = activeAnimation ? activeAnimation.plan.anims : new Map();
  const fadings: FadingPieceMap = activeAnimation ? activeAnimation.plan.fadings : new Map();

  // Get current drag state
  const activeDrag: DragCurrent | undefined = state.draggable.current;

  // Track which pieces are already in correct position
  const unchangedPieces: Set<Key> = new Set();

  // Track pieces that need to be relocated
  const relocatablePieces: Map<PieceIdentifier, PieceNode[]> = new Map();

  // Compute desired square highlights
  const desiredHighlights: SquareClasses = buildSquareHighlights(state);

  // Track available square elements for reuse
  const availableSquareElements: Map<string, SquareNode[]> = new Map();

  // Walk through all existing DOM elements
  let element = boardElement.firstChild as PieceNode | SquareNode | undefined;

  while (element) {
    const key = element.cbKey;

    if (isPieceElement(element)) {
      const pieceAtKey = pieces.get(key);
      const motion = motions.get(key);
      const fading = fadings.get(key);
      const elementPieceId = element.cbPiece;

      // Handle drag state cleanup
      if (element.cbDragging && (!activeDrag || activeDrag.orig !== key)) {
        element.classList.remove('dragging');
        element.style.transform = ''; // Clear inline transform, CSS will position
        setPositionByKey(element, key);
        element.cbDragging = false;
      }

      // Handle fading state cleanup
      if (!fading && element.cbFading) {
        element.cbFading = false;
        element.classList.remove('fading');
      }

      if (pieceAtKey) {
        // There should be a piece at this position
        if (motion && element.cbAnimating && elementPieceId === getPieceIdentifier(pieceAtKey)) {
          // Piece is animating - apply motion offset via inline transform
          const coords = key2pos(key);
          coords[0] += motion[2];
          coords[1] += motion[3];
          element.classList.add('anim');
          translate(element, posToPixel(coords, whiteBottom));
        } else if (element.cbAnimating) {
          // Animation complete - reset to final position via data attributes
          element.cbAnimating = false;
          element.classList.remove('anim');
          element.style.transform = ''; // Clear inline transform, CSS will position
          setPositionByKey(element, key);
          if (state.addPieceZIndex) {
            element.style.zIndex = calculateZIndex(key2pos(key), whiteBottom);
          }
        }

        // Check if piece matches what should be there
        if (elementPieceId === getPieceIdentifier(pieceAtKey) && (!fading || !element.cbFading)) {
          unchangedPieces.add(key);
        } else if (fading && elementPieceId === getPieceIdentifier(fading)) {
          // This piece is fading out
          element.classList.add('fading');
          element.cbFading = true;
        } else {
          // Piece needs to be relocated
          pushToMap(relocatablePieces, elementPieceId, element);
        }
      } else {
        // No piece should be here - mark for reuse or removal
        pushToMap(relocatablePieces, elementPieceId, element);
      }
    } else if (isSquareElement(element)) {
      // Handle square highlight elements. Compare on the LOGICAL class only:
      // element.className also carries the cb-sq base class and the hidden
      // visibility class, so comparing it against the desired highlight class
      // can never match — every redraw would then orphan all existing square
      // elements and create fresh ones, leaking DOM nodes without bound.
      const squareClass = element.cbSquareClass ?? logicalSquareClass(element.className);
      if (desiredHighlights.get(key) === squareClass) {
        setVisible(element, true);
        desiredHighlights.delete(key);
      } else {
        pushToMap(availableSquareElements, squareClass, element);
      }
    }

    element = element.nextSibling as PieceNode | SquareNode | undefined;
  }

  // Create or reposition square highlight elements
  for (const [key, className] of desiredHighlights) {
    const available = availableSquareElements.get(className)?.pop();

    if (available) {
      // Reuse existing element
      available.cbKey = key;
      available.cbSquareClass = className;
      setPositionByKey(available, key);
      setVisible(available, true);
    } else {
      // Create new element
      const squareElement = createEl('div', 'cb-sq ' + className) as SquareNode;
      squareElement.cbKey = key;
      squareElement.cbSquareClass = className;
      setPositionByKey(squareElement, key);
      boardElement.insertBefore(squareElement, boardElement.firstChild);
    }
  }

  // Hide unused square elements
  for (const nodes of availableSquareElements.values()) {
    for (const node of nodes) {
      setVisible(node, false);
    }
  }

  // Create or reposition piece elements
  for (const [key, piece] of pieces) {
    const motion = motions.get(key);

    if (!unchangedPieces.has(key)) {
      const pieceId = getPieceIdentifier(piece);
      const relocatable = relocatablePieces.get(pieceId)?.pop();

      if (relocatable) {
        // Reuse existing piece element
        relocatable.cbKey = key;

        if (relocatable.cbFading) {
          relocatable.classList.remove('fading');
          relocatable.cbFading = false;
        }

        const coords = key2pos(key);
        if (state.addPieceZIndex) {
          relocatable.style.zIndex = calculateZIndex(coords, whiteBottom);
        }

        if (motion) {
          // Animating - use inline transform
          relocatable.cbAnimating = true;
          relocatable.classList.add('anim');
          coords[0] += motion[2];
          coords[1] += motion[3];
          translate(relocatable, posToPixel(coords, whiteBottom));
        } else {
          // Static - use data attributes
          relocatable.style.transform = '';
          setPositionByKey(relocatable, key);
        }
      } else {
        // Create new piece element
        const pieceElement = createEl('div', 'cb-piece') as PieceNode;
        const coords = key2pos(key);

        // Set data attributes for piece identification
        pieceElement.dataset.c = colorCode[piece.color];
        pieceElement.dataset.r = roleCode[piece.role];
        pieceElement.cbPiece = pieceId;
        pieceElement.cbKey = key;

        if (motion) {
          // Animating - use inline transform
          pieceElement.cbAnimating = true;
          pieceElement.classList.add('anim');
          coords[0] += motion[2];
          coords[1] += motion[3];
          translate(pieceElement, posToPixel(coords, whiteBottom));
        } else {
          // Static - use data attributes
          setPositionByKey(pieceElement, key);
        }

        if (state.addPieceZIndex) {
          pieceElement.style.zIndex = calculateZIndex(coords, whiteBottom);
        }

        boardElement.appendChild(pieceElement);
      }
    }
  }

  // Remove unused piece elements
  for (const nodes of relocatablePieces.values()) {
    cleanupDomNodes(state, nodes);
  }
}

// Backwards compatibility alias
export const render = syncPiecesWithDom;

/**
 * Reposition all elements after a board resize.
 * Since we use CSS percentage-based positioning via data attributes,
 * most elements don't need manual repositioning - CSS handles it.
 * Only animating pieces with inline transforms need updating.
 */
export function repositionAfterResize(state: State): void {
  const whiteBottom = isWhitePerspective(state);
  const posToPixel = computePixelPosition(state.dom.bounds());

  // Update board orientation in case it changed
  state.dom.elements.board.dataset.orientation = whiteBottom ? 'white' : 'black';

  let element = state.dom.elements.board.firstChild as PieceNode | SquareNode | undefined;

  while (element) {
    // Only reposition animating pieces that have inline transforms
    if (isPieceElement(element) && element.cbAnimating) {
      translate(element, posToPixel(key2pos(element.cbKey), whiteBottom));
    }
    element = element.nextSibling as PieceNode | SquareNode | undefined;
  }
}

// Backwards compatibility alias
export const renderResized = repositionAfterResize;

/**
 * Recalculate board dimensions and update CSS variables.
 */
export function recalculateBoardBounds(state: State): void {
  const wrapBounds = state.dom.elements.wrap.getBoundingClientRect();
  const container = state.dom.elements.container;

  // Calculate dimensions that align to device pixels for crisp rendering
  const aspectRatio = wrapBounds.height / wrapBounds.width;
  const pixelRatio = window.devicePixelRatio;
  const alignedWidth = (Math.floor((wrapBounds.width * pixelRatio) / 8) * 8) / pixelRatio;
  const alignedHeight = alignedWidth * aspectRatio;

  container.style.width = alignedWidth + 'px';
  container.style.height = alignedHeight + 'px';

  // Clear cached bounds
  state.dom.bounds.clear();

  // Update CSS variables if configured
  if (state.addDimensionsCssVarsTo) {
    state.addDimensionsCssVarsTo.style.setProperty('--chess-width', alignedWidth + 'px');
    state.addDimensionsCssVarsTo.style.setProperty('--chess-height', alignedHeight + 'px');
  }
}

// Backwards compatibility alias
export const updateBounds = recalculateBoardBounds;
