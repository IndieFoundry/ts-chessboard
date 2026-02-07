/**
 * Configuration handling for the chessboard
 */
import type { FEN, Color, Key, Dests, SquareClasses, Role, MoveMetadata, SetPremoveMetadata, Piece, Elements, Mobility } from '../core/types';
import type { HeadlessState } from './state';
import { setCheck, setSelected } from '../core/moves';
import { parseFen } from '../core/position';
import type { DrawShape, DrawBrushes } from '../interactions/draw-handler';

/**
 * Configuration options for the chessboard
 */
export interface Config {
  fen?: FEN;
  orientation?: Color;
  turnColor?: Color;
  check?: Color | boolean;
  lastMove?: Key[];
  selected?: Key;
  coordinates?: boolean;
  coordinatesOnSquares?: boolean;
  ranksPosition?: 'left' | 'right';
  autoCastle?: boolean;
  viewOnly?: boolean;
  disableContextMenu?: boolean;
  addPieceZIndex?: boolean;
  addDimensionsCssVarsTo?: HTMLElement;
  blockTouchScroll?: boolean;
  touchIgnoreRadius?: number;
  trustAllEvents?: boolean;
  highlight?: {
    lastMove?: boolean;
    check?: boolean;
    custom?: SquareClasses;
  };
  animation?: {
    enabled?: boolean;
    duration?: number;
  };
  movable?: {
    free?: boolean;
    color?: Color | 'both';
    dests?: Dests;
    showDests?: boolean;
    events?: {
      after?: (orig: Key, dest: Key, metadata: MoveMetadata) => void;
      afterNewPiece?: (role: Role, key: Key, metadata: MoveMetadata) => void;
    };
    rookCastle?: boolean;
  };
  premovable?: {
    enabled?: boolean;
    showDests?: boolean;
    castle?: boolean;
    dests?: Key[];
    customDests?: Dests;
    additionalPremoveRequirements?: Mobility;
    events?: {
      set?: (orig: Key, dest: Key, metadata?: SetPremoveMetadata) => void;
      unset?: () => void;
    };
  };
  predroppable?: {
    enabled?: boolean;
    events?: {
      set?: (role: Role, key: Key) => void;
      unset?: () => void;
    };
  };
  draggable?: {
    enabled?: boolean;
    distance?: number;
    autoDistance?: boolean;
    showGhost?: boolean;
    deleteOnDropOff?: boolean;
  };
  selectable?: {
    enabled?: boolean;
  };
  events?: {
    change?: () => void;
    move?: (orig: Key, dest: Key, capturedPiece?: Piece) => void;
    dropNewPiece?: (piece: Piece, key: Key) => void;
    select?: (key: Key) => void;
    insert?: (elements: Elements) => void;
  };
  drawable?: {
    enabled?: boolean;
    visible?: boolean;
    defaultSnapToValidMove?: boolean;
    eraseOnMovablePieceClick?: boolean;
    shapes?: DrawShape[];
    autoShapes?: DrawShape[];
    brushes?: DrawBrushes;
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
  if ('check' in config) setCheck(state as any, config.check || false);
  if ('lastMove' in config && !config.lastMove) state.lastMove = undefined;
  // in case of ZH drop last move, there's a single square.
  // if the previous last move had two squares,
  // the merge algorithm will incorrectly keep the second square.
  else if (config.lastMove) state.lastMove = config.lastMove;

  // fix move/premove dests
  if (state.selected) setSelected(state as any, state.selected);

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
