/**
 * Configuration handling for the chessboard
 */
import type { FEN, Color, Key, Dests, SquareClasses, Role, MoveMetadata, SetPremoveMetadata, Piece, Elements, Mobility } from '../core/types';
import type { HeadlessState } from './state';
import { setCheck, setSelected } from '../core/moves';
import { parseFen } from '../core/position';
import type { DrawShape, DrawBrushes } from '../interactions/draw-handler';

/**
 * Configuration options for the chessboard.
 *
 * @example
 * ```tsx
 * <Chessboard
 *   fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
 *   orientation="white"
 *   movable={{
 *     free: false,
 *     dests: legalMoves,
 *     events: { after: handleMove }
 *   }}
 * />
 * ```
 */
export interface Config {
  /** FEN string representing the board position (pieces only, not full FEN) */
  fen?: FEN;

  /** Board orientation: 'white' shows white pieces at bottom */
  orientation?: Color;

  /** Whose turn it is to move */
  turnColor?: Color;

  /** Highlight the king in check. Pass Color to specify which king, true for current turn */
  check?: Color | boolean;

  /** Squares to highlight as the last move [from, to] */
  lastMove?: Key[];

  /** Currently selected square */
  selected?: Key;

  /** Show rank and file coordinates around the board */
  coordinates?: boolean;

  /** Show coordinates on each square instead of around the board */
  coordinatesOnSquares?: boolean;

  /** Position of rank coordinates: 'left' or 'right' */
  ranksPosition?: 'left' | 'right';

  /** Automatically handle castling when king moves to rook square */
  autoCastle?: boolean;

  /** Disable all user interactions (for analysis/viewing) */
  viewOnly?: boolean;

  /** Disable right-click context menu on the board */
  disableContextMenu?: boolean;

  /** Add z-index to pieces based on position (useful for 3D boards) */
  addPieceZIndex?: boolean;

  /** Element to add CSS variables for board dimensions */
  addDimensionsCssVarsTo?: HTMLElement;

  /** Block touch scroll when interacting with the board */
  blockTouchScroll?: boolean;

  /** Radius in pixels to ignore touch events (prevents accidental moves) */
  touchIgnoreRadius?: number;

  /** Trust all events, including synthetic ones (for testing) */
  trustAllEvents?: boolean;

  /** Visual highlighting options */
  highlight?: {
    /** Highlight the last move squares */
    lastMove?: boolean;
    /** Highlight the king when in check */
    check?: boolean;
    /** Custom square highlighting (Map of Key to CSS class) */
    custom?: SquareClasses;
  };

  /** Animation settings */
  animation?: {
    /** Enable piece movement animations */
    enabled?: boolean;
    /** Animation duration in milliseconds */
    duration?: number;
  };

  /** Move interaction settings */
  movable?: {
    /** Allow free movement (ignore dests validation) */
    free?: boolean;
    /** Which color can move: 'white', 'black', 'both', or undefined for none */
    color?: Color | 'both';
    /** Legal move destinations (Map of origin square to destination squares) */
    dests?: Dests;
    /** Show legal move destination dots */
    showDests?: boolean;
    /** Move event callbacks */
    events?: {
      /** Called after a move is made */
      after?: (orig: Key, dest: Key, metadata: MoveMetadata) => void;
      /** Called after a new piece is placed (crazyhouse) */
      afterNewPiece?: (role: Role, key: Key, metadata: MoveMetadata) => void;
    };
    /** Allow castling by moving king to rook (vs king two squares) */
    rookCastle?: boolean;
  };

  /** Premove settings (moves made before your turn) */
  premovable?: {
    /** Enable premoves */
    enabled?: boolean;
    /** Show premove destination dots */
    showDests?: boolean;
    /** Allow castling as premove */
    castle?: boolean;
    /** Valid premove destinations for selected piece */
    dests?: Key[];
    /** Custom premove destinations (overrides calculated ones) */
    customDests?: Dests;
    /** Additional validation for premoves */
    additionalPremoveRequirements?: Mobility;
    /** Premove event callbacks */
    events?: {
      /** Called when a premove is set */
      set?: (orig: Key, dest: Key, metadata?: SetPremoveMetadata) => void;
      /** Called when a premove is unset */
      unset?: () => void;
    };
  };

  /** Predrop settings (for crazyhouse variant) */
  predroppable?: {
    /** Enable predrops */
    enabled?: boolean;
    /** Predrop event callbacks */
    events?: {
      /** Called when a predrop is set */
      set?: (role: Role, key: Key) => void;
      /** Called when a predrop is unset */
      unset?: () => void;
    };
  };

  /** Drag and drop settings */
  draggable?: {
    /** Enable drag and drop */
    enabled?: boolean;
    /** Minimum drag distance in pixels to start dragging */
    distance?: number;
    /** Automatically adjust drag distance based on board size */
    autoDistance?: boolean;
    /** Show ghost piece while dragging */
    showGhost?: boolean;
    /** Delete piece when dropped off board */
    deleteOnDropOff?: boolean;
  };

  /** Click-to-select settings */
  selectable?: {
    /** Enable click-to-select moves */
    enabled?: boolean;
  };

  /** Board event callbacks */
  events?: {
    /** Called after any board change */
    change?: () => void;
    /** Called after a move (includes captured piece if any) */
    move?: (orig: Key, dest: Key, capturedPiece?: Piece) => void;
    /** Called after a new piece is dropped */
    dropNewPiece?: (piece: Piece, key: Key) => void;
    /** Called when a square is selected */
    select?: (key: Key) => void;
    /** Called after DOM elements are inserted */
    insert?: (elements: Elements) => void;
  };

  /** Drawing annotation settings (arrows, circles) */
  drawable?: {
    /** Enable drawing mode (right-click drag) */
    enabled?: boolean;
    /** Show drawn shapes */
    visible?: boolean;
    /** Snap arrow endpoints to valid move squares */
    defaultSnapToValidMove?: boolean;
    /** Erase shapes when clicking a movable piece */
    eraseOnMovablePieceClick?: boolean;
    /** User-drawn shapes */
    shapes?: DrawShape[];
    /** Programmatically set shapes (e.g., engine analysis) */
    autoShapes?: DrawShape[];
    /** Custom brush colors for drawing */
    brushes?: DrawBrushes;
    /** Called when user shapes change */
    onChange?: (shapes: DrawShape[]) => void;
  };
}

/**
 * Applies animation configuration
 */
export function applyAnimation(state: HeadlessState, config: Config): void {
  if (config.animation) {
    deepMerge(state.animation, config.animation);
    // no need for such short animations
    if ((state.animation.duration || 0) < 70) state.animation.enabled = false;
  }
}

/**
 * Applies configuration to state
 */
export function configure(state: HeadlessState, config: Config): void {
  // don't merge destinations and autoShapes. Just override.
  if (config.movable?.dests) state.movable.dests = undefined;
  if (config.drawable?.autoShapes) state.drawable.autoShapes = [];

  deepMerge(state, config);

  // if a fen was provided, replace the pieces
  if (config.fen) {
    state.pieces = parseFen(config.fen);
    state.drawable.shapes = config.drawable?.shapes || [];
  }

  // apply config values that could be undefined yet meaningful
  if ('check' in config) setCheck(state, config.check || false);
  if ('lastMove' in config && !config.lastMove) state.lastMove = undefined;
  // in case of ZH drop last move, there's a single square.
  // if the previous last move had two squares,
  // the merge algorithm will incorrectly keep the second square.
  else if (config.lastMove) state.lastMove = config.lastMove;

  // fix move/premove dests
  if (state.selected) setSelected(state, state.selected);

  applyAnimation(state, config);

  if (!state.movable.rookCastle && state.movable.dests) {
    const rank = state.movable.color === 'white' ? '1' : '8',
      kingStartPos = ('e' + rank) as Key,
      dests = state.movable.dests.get(kingStartPos),
      king = state.pieces.get(kingStartPos);
    if (!dests || !king || king.role !== 'king') return;
    state.movable.dests.set(
      kingStartPos,
      dests.filter(
        d =>
          !(d === 'a' + rank && dests.includes(('c' + rank) as Key)) &&
          !(d === 'h' + rank && dests.includes(('g' + rank) as Key)),
      ),
    );
  }
}

function deepMerge(base: any, extend: any): void {
  for (const key in extend) {
    if (key === '__proto__' || key === 'constructor' || !Object.prototype.hasOwnProperty.call(extend, key))
      continue;
    if (
      Object.prototype.hasOwnProperty.call(base, key) &&
      isPlainObject(base[key]) &&
      isPlainObject(extend[key])
    )
      deepMerge(base[key], extend[key]);
    else base[key] = extend[key];
  }
}

function isPlainObject(o: unknown): boolean {
  if (typeof o !== 'object' || o === null) return false;
  const proto = Object.getPrototypeOf(o);
  return proto === Object.prototype || proto === null;
}
