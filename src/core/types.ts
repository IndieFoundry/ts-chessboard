/**
 * Core type definitions for the chessboard
 */

/** Board colors */
export type Color = (typeof colors)[number];

/** Chess piece roles */
export type Role = (typeof roles)[number];

/** Board files (columns) a-h */
export type File = (typeof files)[number];

/** Board ranks (rows) 1-8 */
export type Rank = (typeof ranks)[number];

/** Square key like 'e4' or 'a0' for off-board pieces */
export type Key = 'a0' | `${File}${Rank}`;

/** FEN string representing a position */
export type FEN = string;

/** Board position as [file, rank] indices (0-7) */
export type Pos = [number, number];

/** Position with its key */
export interface PosAndKey {
  pos: Pos;
  key: Key;
}

/** A chess piece */
export interface Piece {
  role: Role;
  color: Color;
  promoted?: boolean;
}

/** A piece drop (for crazyhouse/bughouse) */
export interface Drop {
  role: Role;
  key: Key;
}

/** Map of squares to pieces */
export type Pieces = Map<Key, Piece>;

/** Diff of pieces: undefined means remove */
export type PiecesDiff = Map<Key, Piece | undefined>;

/** Pair of keys (e.g., for a move) */
export type KeyPair = [Key, Key];

/** Pair of numbers (e.g., for pixel coordinates) */
export type NumberPair = [number, number];

/** Four numbers (e.g., for animation vectors) */
export type NumberQuad = [number, number, number, number];

/** Rectangle bounds */
export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Map of origin squares to valid destination squares */
export type Dests = Map<Key, Key[]>;

/** DOM elements used by the board */
export interface Elements {
  board: HTMLElement;
  wrap: HTMLElement;
  container: HTMLElement;
  ghost?: HTMLElement;
  shapes?: SVGElement;
  custom?: SVGElement;
  shapesBelow?: SVGElement;
  customBelow?: SVGElement;
  autoPieces?: HTMLElement;
}

/** DOM state */
export interface Dom {
  elements: Elements;
  bounds: Memo<DOMRectReadOnly>;
  redraw: () => void;
  redrawNow: (skipSvg?: boolean) => void;
  unbind?: Unbind;
  destroyed?: boolean;
}

/** Explosion animation state (for atomic chess) */
export interface Exploding {
  stage: number;
  keys: readonly Key[];
}

/** Metadata about a move */
export interface MoveMetadata {
  premove: boolean;
  ctrlKey?: boolean;
  holdTime?: number;
  captured?: Piece;
  predrop?: boolean;
}

/** Metadata about a premove being set */
export interface SetPremoveMetadata {
  ctrlKey?: boolean;
}

/** Combined mouse and touch event type */
export type MouchEvent = Event & Partial<MouseEvent & TouchEvent>;

/** HTML element with a board key attached */
export interface KeyedNode extends HTMLElement {
  cbKey: Key;
}

/** Piece DOM element */
export interface PieceNode extends KeyedNode {
  tagName: 'PIECE';
  cbPiece: string;
  cbAnimating?: boolean;
  cbFading?: boolean;
  cbDragging?: boolean;
  cbScale?: number;
}

/** Square DOM element */
export interface SquareNode extends KeyedNode {
  tagName: 'SQUARE';
}

/** Memoized function interface */
export interface Memo<A> {
  (): A;
  clear: () => void;
}

/** Timer interface */
export interface Timer {
  start: () => void;
  cancel: () => void;
  stop: () => number;
}

/** Redraw callback */
export type Redraw = () => void;

/** Unbind callback */
export type Unbind = () => void;

/** Time in milliseconds */
export type Milliseconds = number;

/** Frequency in kilohertz */
export type KHz = number;

/** Available colors */
export const colors = ['white', 'black'] as const;

/** Available piece roles */
export const roles = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'] as const;

/** Board files */
export const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

/** Board ranks */
export const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

/** Position of rank coordinates */
export type RanksPosition = 'left' | 'right';

/** Brush colors for drawing */
export type BrushColor = 'green' | 'red' | 'blue' | 'yellow';

/** Map of squares to CSS classes */
export type SquareClasses = Map<Key, string>;

/** Directional check function type */
export type DirectionalCheck = (x1: number, y1: number, x2: number, y2: number) => boolean;

/** Context for mobility/premove calculations */
export type MobilityContext = {
  orig: PosAndKey;
  dest: PosAndKey;
  role: Role;
  allPieces: Pieces;
  friendlies: Pieces;
  enemies: Pieces;
  color: Color;
  rookFilesFriendlies: number[];
  lastMove: Key[] | undefined;
};

/** Mobility function for premove validation */
export type Mobility = (ctx: MobilityContext) => boolean;
