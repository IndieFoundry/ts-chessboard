/**
 * Board interaction logic - handles piece movement, selection, and premoves.
 * Original implementation for @indiefoundry/chessboard.
 */
import type { Key, Piece, PiecesDiff, Color, Role, MoveMetadata, SetPremoveMetadata, Drop, NumberPair, Mobility } from './types';
import type { PremoveState } from './premoves';
import { pos2key, key2pos, opposite, pos2keyUnsafe, allPos, computeSquareCenter } from './squares';
import { calculatePremoves } from './premoves';
import { distanceSq, queenDir, knightDir, samePos } from '../utils/math';

/**
 * State required by board interaction functions.
 */
export interface BoardInteractionState extends PremoveState {
  orientation: Color;
  selected?: Key;
  check?: Key;
  lastMove?: Key[];
  autoCastle: boolean;
  viewOnly: boolean;
  movable: {
    free: boolean;
    color?: Color | 'both';
    dests?: Map<Key, Key[]>;
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
    customDests?: Map<Key, Key[]>;
    current?: [Key, Key];
    additionalPremoveRequirements: Mobility;
    events: {
      set?: (orig: Key, dest: Key, metadata?: SetPremoveMetadata) => void;
      unset?: () => void;
    };
  };
  predroppable: {
    enabled: boolean;
    current?: { role: Role; key: Key };
    events: {
      set?: (role: Role, key: Key) => void;
      unset?: () => void;
    };
  };
  draggable: {
    enabled: boolean;
    current?: unknown;
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
  };
  hold: {
    start: () => void;
    cancel: () => void;
    stop: () => number;
  };
  animation: {
    current?: unknown;
  };
  dom?: {
    bounds: () => DOMRectReadOnly;
  };
}

// For backwards compatibility
export type MoveState = BoardInteractionState;

/**
 * Schedule a callback to run asynchronously after the current execution.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function scheduleCallback<T extends (...args: any[]) => void>(
  fn: T | undefined,
  ...args: Parameters<T>
): void {
  if (fn) setTimeout(() => fn(...args), 1);
}

// Backwards compatibility alias
export const callUserFunction = scheduleCallback;

/**
 * Flip the board orientation.
 */
export function flipOrientation(state: BoardInteractionState): void {
  state.orientation = opposite(state.orientation);
  state.animation.current = state.draggable.current = state.selected = undefined;
}

// Backwards compatibility alias
export const toggleOrientation = flipOrientation;

/**
 * Clear all transient state (selection, premoves, last move).
 */
export function clearBoard(state: BoardInteractionState): void {
  state.lastMove = undefined;
  deselect(state);
  clearQueuedPremove(state);
  clearQueuedPredrop(state);
}

// Backwards compatibility alias
export const reset = clearBoard;

/**
 * Apply piece changes to the board.
 */
export function applyPieceChanges(state: BoardInteractionState, changes: PiecesDiff): void {
  for (const [key, piece] of changes) {
    if (piece) state.pieces.set(key, piece);
    else state.pieces.delete(key);
  }
}

// Backwards compatibility alias
export const setPieces = applyPieceChanges;

/**
 * Update the check highlight based on king position.
 */
export function updateCheckHighlight(state: BoardInteractionState, color: Color | boolean): void {
  state.check = undefined;
  if (color === true) color = state.turnColor;
  if (color) {
    for (const [k, p] of state.pieces) {
      if (p.role === 'king' && p.color === color) {
        state.check = k;
      }
    }
  }
}

// Backwards compatibility alias
export const setCheck = updateCheckHighlight;

function queuePremove(state: BoardInteractionState, orig: Key, dest: Key, meta: SetPremoveMetadata): void {
  clearQueuedPredrop(state);
  state.premovable.current = [orig, dest];
  scheduleCallback(state.premovable.events.set, orig, dest, meta);
}

/**
 * Clear any queued premove.
 */
export function clearQueuedPremove(state: BoardInteractionState): void {
  if (state.premovable.current) {
    state.premovable.current = undefined;
    scheduleCallback(state.premovable.events.unset);
  }
}

// Backwards compatibility alias
export const unsetPremove = clearQueuedPremove;

function queuePredrop(state: BoardInteractionState, role: Role, key: Key): void {
  clearQueuedPremove(state);
  state.predroppable.current = { role, key };
  scheduleCallback(state.predroppable.events.set, role, key);
}

/**
 * Clear any queued predrop.
 */
export function clearQueuedPredrop(state: BoardInteractionState): void {
  const pd = state.predroppable;
  if (pd.current) {
    pd.current = undefined;
    scheduleCallback(pd.events.unset);
  }
}

// Backwards compatibility alias
export const unsetPredrop = clearQueuedPredrop;

/**
 * Handle castling when king moves to rook square.
 */
function handleCastling(state: BoardInteractionState, orig: Key, dest: Key): boolean {
  if (!state.autoCastle) return false;

  const king = state.pieces.get(orig);
  if (!king || king.role !== 'king') return false;

  const origPos = key2pos(orig);
  const destPos = key2pos(dest);
  if ((origPos[1] !== 0 && origPos[1] !== 7) || origPos[1] !== destPos[1]) return false;

  // Handle both standard (e1-g1) and rook-click (e1-h1) notation
  if (origPos[0] === 4 && !state.pieces.has(dest)) {
    if (destPos[0] === 6) dest = pos2keyUnsafe([7, destPos[1]]);
    else if (destPos[0] === 2) dest = pos2keyUnsafe([0, destPos[1]]);
  }

  const rook = state.pieces.get(dest);
  if (!rook || rook.color !== king.color || rook.role !== 'rook') return false;

  state.pieces.delete(orig);
  state.pieces.delete(dest);

  if (origPos[0] < destPos[0]) {
    // Kingside
    state.pieces.set(pos2keyUnsafe([6, destPos[1]]), king);
    state.pieces.set(pos2keyUnsafe([5, destPos[1]]), rook);
  } else {
    // Queenside
    state.pieces.set(pos2keyUnsafe([2, destPos[1]]), king);
    state.pieces.set(pos2keyUnsafe([3, destPos[1]]), rook);
  }
  return true;
}

// Backwards compatibility alias
export const tryAutoCastle = handleCastling;

/**
 * Execute a move without user validation.
 */
export function executeMove(state: BoardInteractionState, orig: Key, dest: Key): Piece | boolean {
  const origPiece = state.pieces.get(orig);
  const destPiece = state.pieces.get(dest);
  if (orig === dest || !origPiece) return false;

  const captured = destPiece && destPiece.color !== origPiece.color ? destPiece : undefined;
  if (dest === state.selected) deselect(state);

  scheduleCallback(state.events.move, orig, dest, captured);

  if (!handleCastling(state, orig, dest)) {
    state.pieces.set(dest, origPiece);
    state.pieces.delete(orig);
  }

  state.lastMove = [orig, dest];
  state.check = undefined;
  scheduleCallback(state.events.change);
  return captured || true;
}

// Backwards compatibility alias
export const baseMove = executeMove;

/**
 * Place a new piece on the board.
 */
export function placePiece(state: BoardInteractionState, piece: Piece, key: Key, force?: boolean): boolean {
  if (state.pieces.has(key)) {
    if (force) state.pieces.delete(key);
    else return false;
  }
  scheduleCallback(state.events.dropNewPiece, piece, key);
  state.pieces.set(key, piece);
  state.lastMove = [key];
  state.check = undefined;
  scheduleCallback(state.events.change);
  state.movable.dests = undefined;
  state.turnColor = opposite(state.turnColor);
  return true;
}

// Backwards compatibility alias
export const baseNewPiece = placePiece;

function executeUserMove(state: BoardInteractionState, orig: Key, dest: Key): Piece | boolean {
  const result = executeMove(state, orig, dest);
  if (result) {
    state.movable.dests = undefined;
    state.turnColor = opposite(state.turnColor);
    state.animation.current = undefined;
  }
  return result;
}

// Backwards compatibility alias
export const baseUserMove = executeUserMove;

/**
 * Attempt a user-initiated move with validation.
 */
export function attemptMove(state: BoardInteractionState, orig: Key, dest: Key): boolean {
  if (isMoveAllowed(state, orig, dest)) {
    const result = executeUserMove(state, orig, dest);
    if (result) {
      const holdTime = state.hold.stop();
      deselect(state);
      const metadata: MoveMetadata = {
        premove: false,
        ctrlKey: state.stats.ctrlKey,
        holdTime,
      };
      if (result !== true) metadata.captured = result;
      scheduleCallback(state.movable.events.after, orig, dest, metadata);
      return true;
    }
  } else if (isPremoveAllowed(state, orig, dest)) {
    queuePremove(state, orig, dest, {
      ctrlKey: state.stats.ctrlKey,
    });
    deselect(state);
    return true;
  }
  deselect(state);
  return false;
}

// Backwards compatibility alias
export const userMove = attemptMove;

/**
 * Drop a new piece onto the board.
 */
export function attemptDrop(state: BoardInteractionState, orig: Key, dest: Key, force?: boolean): void {
  const piece = state.pieces.get(orig);
  if (piece && (isDropAllowed(state, orig, dest) || force)) {
    state.pieces.delete(orig);
    placePiece(state, piece, dest, force);
    scheduleCallback(state.movable.events.afterNewPiece, piece.role, dest, {
      premove: false,
      predrop: false,
    });
  } else if (piece && isPredropAllowed(state, orig, dest)) {
    queuePredrop(state, piece.role, dest);
  } else {
    clearQueuedPremove(state);
    clearQueuedPredrop(state);
  }
  state.pieces.delete(orig);
  deselect(state);
}

// Backwards compatibility alias
export const dropNewPiece = attemptDrop;

/**
 * Handle square selection.
 */
export function handleSquareClick(state: BoardInteractionState, key: Key, force?: boolean): void {
  scheduleCallback(state.events.select, key);
  if (state.selected) {
    if (state.selected === key && !state.draggable.enabled) {
      deselect(state);
      state.hold.cancel();
      return;
    } else if ((state.selectable.enabled || force) && state.selected !== key) {
      if (attemptMove(state, state.selected, key)) {
        state.stats.dragged = false;
        return;
      }
    }
  }
  if (
    (state.selectable.enabled || state.draggable.enabled) &&
    (canPieceMove(state, key) || canPiecePremove(state, key))
  ) {
    markSelected(state, key);
    state.hold.start();
  }
}

// Backwards compatibility alias
export const selectSquare = handleSquareClick;

/**
 * Mark a square as selected.
 */
export function markSelected(state: BoardInteractionState, key: Key): void {
  state.selected = key;
  if (!canPiecePremove(state, key)) state.premovable.dests = undefined;
  else if (!state.premovable.customDests) state.premovable.dests = calculatePremoves(state, key);
}

// Backwards compatibility alias
export const setSelected = markSelected;

/**
 * Clear current selection.
 */
export function deselect(state: BoardInteractionState): void {
  state.selected = undefined;
  state.premovable.dests = undefined;
  state.hold.cancel();
}

// Backwards compatibility alias
export const unselect = deselect;

function canPieceMove(state: BoardInteractionState, orig: Key): boolean {
  const piece = state.pieces.get(orig);
  return (
    !!piece &&
    (state.movable.color === 'both' ||
      (state.movable.color === piece.color && state.turnColor === piece.color))
  );
}

// Backwards compatibility alias
export const isMovable = canPieceMove;

/**
 * Check if a move is allowed.
 */
export function isMoveAllowed(state: BoardInteractionState, orig: Key, dest: Key): boolean {
  return (
    orig !== dest &&
    canPieceMove(state, orig) &&
    (state.movable.free || !!state.movable.dests?.get(orig)?.includes(dest))
  );
}

// Backwards compatibility alias
export const canMove = isMoveAllowed;

function isDropAllowed(state: BoardInteractionState, orig: Key, dest: Key): boolean {
  const piece = state.pieces.get(orig);
  return (
    !!piece &&
    (orig === dest || !state.pieces.has(dest)) &&
    (state.movable.color === 'both' ||
      (state.movable.color === piece.color && state.turnColor === piece.color))
  );
}

// Backwards compatibility alias
export const canDrop = isDropAllowed;

function canPiecePremove(state: BoardInteractionState, orig: Key): boolean {
  const piece = state.pieces.get(orig);
  return (
    !!piece &&
    state.premovable.enabled &&
    state.movable.color === piece.color &&
    state.turnColor !== piece.color
  );
}

// Backwards compatibility alias
export const isPremovable = canPiecePremove;

function isPremoveAllowed(state: BoardInteractionState, orig: Key, dest: Key): boolean {
  return (
    orig !== dest &&
    canPiecePremove(state, orig) &&
    (state.premovable.customDests?.get(orig) ?? calculatePremoves(state, orig)).includes(dest)
  );
}

// Backwards compatibility alias
export const canPremove = isPremoveAllowed;

function isPredropAllowed(state: BoardInteractionState, orig: Key, dest: Key): boolean {
  const piece = state.pieces.get(orig);
  const destPiece = state.pieces.get(dest);
  return (
    !!piece &&
    (!destPiece || destPiece.color !== state.movable.color) &&
    state.predroppable.enabled &&
    (piece.role !== 'pawn' || (dest[1] !== '1' && dest[1] !== '8')) &&
    state.movable.color === piece.color &&
    state.turnColor !== piece.color
  );
}

// Backwards compatibility alias
export const canPredrop = isPredropAllowed;

/**
 * Check if a piece can be dragged.
 */
export function canDrag(state: BoardInteractionState, orig: Key): boolean {
  const piece = state.pieces.get(orig);
  return (
    !!piece &&
    state.draggable.enabled &&
    (state.movable.color === 'both' ||
      (state.movable.color === piece.color && (state.turnColor === piece.color || state.premovable.enabled)))
  );
}

// Backwards compatibility alias
export const isDraggable = canDrag;

/**
 * Execute queued premove if valid.
 */
export function executePremove(state: BoardInteractionState): boolean {
  const move = state.premovable.current;
  if (!move) return false;

  const [orig, dest] = move;
  let success = false;

  if (isMoveAllowed(state, orig, dest)) {
    const result = executeUserMove(state, orig, dest);
    if (result) {
      const metadata: MoveMetadata = { premove: true };
      if (result !== true) metadata.captured = result;
      scheduleCallback(state.movable.events.after, orig, dest, metadata);
      success = true;
    }
  }
  clearQueuedPremove(state);
  return success;
}

// Backwards compatibility alias
export const playPremove = executePremove;

/**
 * Execute queued predrop if valid.
 */
export function executePredrop(state: BoardInteractionState, validate: (drop: Drop) => boolean): boolean {
  const drop = state.predroppable.current;
  if (!drop) return false;

  let success = false;
  if (validate(drop as Drop)) {
    const piece = {
      role: drop.role,
      color: state.movable.color,
    } as Piece;
    if (placePiece(state, piece, drop.key)) {
      scheduleCallback(state.movable.events.afterNewPiece, drop.role, drop.key, {
        premove: false,
        predrop: true,
      });
      success = true;
    }
  }
  clearQueuedPredrop(state);
  return success;
}

// Backwards compatibility alias
export const playPredrop = executePredrop;

/**
 * Cancel current move interaction.
 */
export function abortMove(state: BoardInteractionState): void {
  clearQueuedPremove(state);
  clearQueuedPredrop(state);
  deselect(state);
}

// Backwards compatibility alias
export const cancelMove = abortMove;

/**
 * Stop all interactions.
 */
export function stopInteractions(state: BoardInteractionState): void {
  state.movable.color = state.movable.dests = state.animation.current = undefined;
  abortMove(state);
}

// Backwards compatibility alias
export const stop = stopInteractions;

/**
 * Get the board key at a DOM position.
 */
export function keyAtPosition(
  pos: NumberPair,
  asWhite: boolean,
  bounds: DOMRectReadOnly,
): Key | undefined {
  let file = Math.floor((8 * (pos[0] - bounds.left)) / bounds.width);
  if (!asWhite) file = 7 - file;
  let rank = 7 - Math.floor((8 * (pos[1] - bounds.top)) / bounds.height);
  if (!asWhite) rank = 7 - rank;
  return file >= 0 && file < 8 && rank >= 0 && rank < 8 ? pos2key([file, rank]) : undefined;
}

// Backwards compatibility alias
export const getKeyAtDomPos = keyAtPosition;

/**
 * Get the board key at a position, snapped to valid moves.
 */
export function keyAtPositionSnapped(
  orig: Key,
  pos: NumberPair,
  asWhite: boolean,
  bounds: DOMRectReadOnly,
): Key | undefined {
  const origPos = key2pos(orig);
  const validSnapPos = allPos.filter(
    pos2 =>
      samePos(origPos, pos2) ||
      queenDir(origPos[0], origPos[1], pos2[0], pos2[1]) ||
      knightDir(origPos[0], origPos[1], pos2[0], pos2[1]),
  );
  const validSnapCenters = validSnapPos.map(pos2 =>
    computeSquareCenter(pos2keyUnsafe(pos2), asWhite, bounds),
  );
  const validSnapDistances = validSnapCenters.map(pos2 => distanceSq(pos, pos2));
  const [, closestSnapIndex] = validSnapDistances.reduce(
    (a, b, index) => (a[0] < b ? a : [b, index]),
    [validSnapDistances[0], 0],
  );
  return pos2key(validSnapPos[closestSnapIndex]);
}

// Backwards compatibility alias
export const getSnappedKeyAtDomPos = keyAtPositionSnapped;

/**
 * Check if viewing as white.
 */
export function isWhitePerspective(s: { orientation: Color }): boolean {
  return s.orientation === 'white';
}

// Backwards compatibility alias
export const whitePov = isWhitePerspective;
