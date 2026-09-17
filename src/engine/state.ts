/**
 * Board state management
 */
import type { Pieces, Color, Key, Dom, Exploding, Timer, MoveMetadata, SetPremoveMetadata, Role, Piece, Dests, SquareClasses, Mobility } from '../core/types';
import { parseFen, INITIAL_FEN } from '../core/position';
import { createTimer } from '../utils/timer';
import type { AnimCurrent } from '../animation/animator';
import type { DragCurrent } from '../interactions/drag-handler';
import type { Drawable } from '../interactions/draw-handler';

/**
 * Headless state without DOM binding
 */
export interface HeadlessState {
  pieces: Pieces;
  orientation: Color;
  turnColor: Color;
  check?: Key;
  lastMove?: Key[];
  selected?: Key;
  coordinates: boolean;
  coordinatesOnSquares: boolean;
  ranksPosition: 'left' | 'right';
  autoCastle: boolean;
  viewOnly: boolean;
  disableContextMenu: boolean;
  addPieceZIndex: boolean;
  addDimensionsCssVarsTo?: HTMLElement;
  blockTouchScroll: boolean;
  touchIgnoreRadius: number;
  pieceKey: boolean;
  trustAllEvents?: boolean;
  highlight: {
    lastMove: boolean;
    check: boolean;
    custom?: SquareClasses;
  };
  animation: {
    enabled: boolean;
    duration: number;
    current?: AnimCurrent;
  };
  movable: {
    free: boolean;
    color?: Color | 'both';
    dests?: Dests;
    showDests: boolean;
    events: {
      after?: (orig: Key, dest: Key, metadata: MoveMetadata) => void;
      afterNewPiece?: (role: Role, key: Key, metadata: MoveMetadata) => void;
    };
    rookCastle: boolean;
  };
  premovable: {
    enabled: boolean;
    showDests: boolean;
    castle: boolean;
    dests?: Key[];
    customDests?: Dests;
    current?: [Key, Key];
    additionalPremoveRequirements: Mobility;
    events: {
      set?: (orig: Key, dest: Key, metadata?: SetPremoveMetadata) => void;
      unset?: () => void;
    };
  };
  predroppable: {
    enabled: boolean;
    current?: {
      role: Role;
      key: Key;
    };
    events: {
      set?: (role: Role, key: Key) => void;
      unset?: () => void;
    };
  };
  draggable: {
    enabled: boolean;
    distance: number;
    autoDistance: boolean;
    showGhost: boolean;
    deleteOnDropOff: boolean;
    current?: DragCurrent;
  };
  dropmode: {
    active: boolean;
    piece?: Piece;
  };
  selectable: {
    enabled: boolean;
  };
  stats: {
    dragged: boolean;
    ctrlKey?: boolean;
  };
  events: {
    change?: () => void;
    move?: (orig: Key, dest: Key, capturedPiece?: Piece) => void;
    dropNewPiece?: (piece: Piece, key: Key) => void;
    select?: (key: Key) => void;
    insert?: (elements: any) => void;
  };
  drawable: Drawable;
  exploding?: Exploding;
  hold: Timer;
}

/**
 * Full state with DOM binding
 */
export interface State extends HeadlessState {
  dom: Dom;
}

/**
 * Creates the default state
 */
export function defaults(): HeadlessState {
  return {
    pieces: parseFen(INITIAL_FEN),
    orientation: 'white',
    turnColor: 'white',
    coordinates: true,
    coordinatesOnSquares: false,
    ranksPosition: 'right',
    autoCastle: true,
    viewOnly: false,
    disableContextMenu: false,
    addPieceZIndex: false,
    blockTouchScroll: false,
    touchIgnoreRadius: 1,
    pieceKey: false,
    trustAllEvents: false,
    highlight: {
      lastMove: true,
      check: true,
    },
    animation: {
      enabled: true,
      duration: 200,
    },
    movable: {
      free: true,
      color: 'both',
      showDests: true,
      events: {},
      rookCastle: true,
    },
    premovable: {
      enabled: true,
      showDests: true,
      castle: true,
      additionalPremoveRequirements: _ => true,
      events: {},
    },
    predroppable: {
      enabled: false,
      events: {},
    },
    draggable: {
      enabled: true,
      distance: 3,
      autoDistance: true,
      showGhost: true,
      deleteOnDropOff: false,
    },
    dropmode: {
      active: false,
    },
    selectable: {
      enabled: true,
    },
    stats: {
      dragged: !('ontouchstart' in window),
    },
    events: {},
    drawable: {
      enabled: true,
      visible: true,
      defaultSnapToValidMove: true,
      eraseOnClick: true,
      eraseOnMovablePieceClick: true,
      shapes: [],
      autoShapes: [],
      brushes: {
        green: { key: 'g', color: '#15781B', opacity: 1, lineWidth: 10 },
        red: { key: 'r', color: '#882020', opacity: 1, lineWidth: 10 },
        blue: { key: 'b', color: '#003088', opacity: 1, lineWidth: 10 },
        yellow: { key: 'y', color: '#e68f00', opacity: 1, lineWidth: 10 },
        paleBlue: { key: 'pb', color: '#003088', opacity: 0.4, lineWidth: 15 },
        paleGreen: { key: 'pg', color: '#15781B', opacity: 0.4, lineWidth: 15 },
        paleRed: { key: 'pr', color: '#882020', opacity: 0.4, lineWidth: 15 },
        paleGrey: {
          key: 'pgr',
          color: '#4a4a4a',
          opacity: 0.35,
          lineWidth: 15,
        },
        purple: { key: 'purple', color: '#68217a', opacity: 0.65, lineWidth: 10 },
        pink: { key: 'pink', color: '#ee2080', opacity: 0.5, lineWidth: 10 },
        white: { key: 'white', color: 'white', opacity: 1, lineWidth: 10 },
        paleWhite: { key: 'pwhite', color: 'white', opacity: 0.6, lineWidth: 10 },
      },
      prevSvgHash: '',
    },
    hold: createTimer(),
  };
}
