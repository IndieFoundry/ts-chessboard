/**
 * Move execution and board logic
 */
import type { Key, Piece, PiecesDiff, Color, Role, MoveMetadata, SetPremoveMetadata, Drop, NumberPair, Mobility } from './types';
import type { PremoveState } from './premoves';
import { pos2key, key2pos, opposite, pos2keyUnsafe, allPos, computeSquareCenter } from './squares';
import { calculatePremoves } from './premoves';
import { distanceSq, queenDir, knightDir, samePos } from '../utils/math';

/**
 * State interface for move operations.
 * Defines the minimal state required by move functions, keeping this module
 * decoupled from the full engine state.
 */
export interface MoveState extends PremoveState {
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

/**
 * Calls a user callback function asynchronously.
 * Uses setTimeout to defer execution until after paint, preventing UI callbacks
 * from blocking the current render cycle.
 */
export function callUserFunction<T extends (...args: any[]) => void>(
  f: T | undefined,
  ...args: Parameters<T>
): void {
  if (f) setTimeout(() => f(...args), 1);
}

/**
 * Toggles the board orientation
 */
export function toggleOrientation(state: MoveState): void {
  state.orientation = opposite(state.orientation);
  state.animation.current = state.draggable.current = state.selected = undefined;
}

/**
 * Resets the board state
 */
export function reset(state: MoveState): void {
  state.lastMove = undefined;
  unselect(state);
  unsetPremove(state);
  unsetPredrop(state);
}

/**
 * Sets or removes pieces on the board
 */
export function setPieces(state: MoveState, pieces: PiecesDiff): void {
  for (const [key, piece] of pieces) {
    if (piece) state.pieces.set(key, piece);
    else state.pieces.delete(key);
  }
}

/**
 * Sets the check state
 */
export function setCheck(state: MoveState, color: Color | boolean): void {
  state.check = undefined;
  if (color === true) color = state.turnColor;
  if (color)
    for (const [k, p] of state.pieces) {
      if (p.role === 'king' && p.color === color) {
        state.check = k;
      }
    }
}

function setPremove(state: MoveState, orig: Key, dest: Key, meta: SetPremoveMetadata): void {
  unsetPredrop(state);
  state.premovable.current = [orig, dest];
  callUserFunction(state.premovable.events.set, orig, dest, meta);
}

/**
 * Unsets the current premove
 */
export function unsetPremove(state: MoveState): void {
  if (state.premovable.current) {
    state.premovable.current = undefined;
    callUserFunction(state.premovable.events.unset);
  }
}

function setPredrop(state: MoveState, role: Role, key: Key): void {
  unsetPremove(state);
  state.predroppable.current = { role, key };
  callUserFunction(state.predroppable.events.set, role, key);
}

/**
 * Unsets the current predrop
 */
export function unsetPredrop(state: MoveState): void {
  const pd = state.predroppable;
  if (pd.current) {
    pd.current = undefined;
    callUserFunction(pd.events.unset);
  }
}

/**
 * Attempts auto-castling when the king moves to a rook
 */
function tryAutoCastle(state: MoveState, orig: Key, dest: Key): boolean {
  if (!state.autoCastle) return false;

  const king = state.pieces.get(orig);
  if (!king || king.role !== 'king') return false;

  const origPos = key2pos(orig);
  const destPos = key2pos(dest);
  if ((origPos[1] !== 0 && origPos[1] !== 7) || origPos[1] !== destPos[1]) return false;

  if (origPos[0] === 4 && !state.pieces.has(dest)) {
    if (destPos[0] === 6) dest = pos2keyUnsafe([7, destPos[1]]);
    else if (destPos[0] === 2) dest = pos2keyUnsafe([0, destPos[1]]);
  }

  const rook = state.pieces.get(dest);
  if (!rook || rook.color !== king.color || rook.role !== 'rook') return false;

  state.pieces.delete(orig);
  state.pieces.delete(dest);

  if (origPos[0] < destPos[0]) {
    state.pieces.set(pos2keyUnsafe([6, destPos[1]]), king);
    state.pieces.set(pos2keyUnsafe([5, destPos[1]]), rook);
  } else {
    state.pieces.set(pos2keyUnsafe([2, destPos[1]]), king);
    state.pieces.set(pos2keyUnsafe([3, destPos[1]]), rook);
  }
  return true;
}

/**
 * Executes a base move (without user move validation)
 */
export function baseMove(state: MoveState, orig: Key, dest: Key): Piece | boolean {
  const origPiece = state.pieces.get(orig),
    destPiece = state.pieces.get(dest);
  if (orig === dest || !origPiece) return false;
  const captured = destPiece && destPiece.color !== origPiece.color ? destPiece : undefined;
  if (dest === state.selected) unselect(state);
  callUserFunction(state.events.move, orig, dest, captured);
  if (!tryAutoCastle(state, orig, dest)) {
    state.pieces.set(dest, origPiece);
    state.pieces.delete(orig);
  }
  state.lastMove = [orig, dest];
  state.check = undefined;
  callUserFunction(state.events.change);
  return captured || true;
}

/**
 * Places a new piece on the board
 */
export function baseNewPiece(state: MoveState, piece: Piece, key: Key, force?: boolean): boolean {
  if (state.pieces.has(key)) {
    if (force) state.pieces.delete(key);
    else return false;
  }
  callUserFunction(state.events.dropNewPiece, piece, key);
  state.pieces.set(key, piece);
  state.lastMove = [key];
  state.check = undefined;
  callUserFunction(state.events.change);
  state.movable.dests = undefined;
  state.turnColor = opposite(state.turnColor);
  return true;
}

function baseUserMove(state: MoveState, orig: Key, dest: Key): Piece | boolean {
  const result = baseMove(state, orig, dest);
  if (result) {
    state.movable.dests = undefined;
    state.turnColor = opposite(state.turnColor);
    state.animation.current = undefined;
  }
  return result;
}

/**
 * Executes a user move with validation
 */
export function userMove(state: MoveState, orig: Key, dest: Key): boolean {
  if (canMove(state, orig, dest)) {
    const result = baseUserMove(state, orig, dest);
    if (result) {
      const holdTime = state.hold.stop();
      unselect(state);
      const metadata: MoveMetadata = {
        premove: false,
        ctrlKey: state.stats.ctrlKey,
        holdTime,
      };
      if (result !== true) metadata.captured = result;
      callUserFunction(state.movable.events.after, orig, dest, metadata);
      return true;
    }
  } else if (canPremove(state, orig, dest)) {
    setPremove(state, orig, dest, {
      ctrlKey: state.stats.ctrlKey,
    });
    unselect(state);
    return true;
  }
  unselect(state);
  return false;
}

/**
 * Drops a new piece on the board
 */
export function dropNewPiece(state: MoveState, orig: Key, dest: Key, force?: boolean): void {
  const piece = state.pieces.get(orig);
  if (piece && (canDrop(state, orig, dest) || force)) {
    state.pieces.delete(orig);
    baseNewPiece(state, piece, dest, force);
    callUserFunction(state.movable.events.afterNewPiece, piece.role, dest, {
      premove: false,
      predrop: false,
    });
  } else if (piece && canPredrop(state, orig, dest)) {
    setPredrop(state, piece.role, dest);
  } else {
    unsetPremove(state);
    unsetPredrop(state);
  }
  state.pieces.delete(orig);
  unselect(state);
}

/**
 * Selects a square
 */
export function selectSquare(state: MoveState, key: Key, force?: boolean): void {
  callUserFunction(state.events.select, key);
  if (state.selected) {
    if (state.selected === key && !state.draggable.enabled) {
      unselect(state);
      state.hold.cancel();
      return;
    } else if ((state.selectable.enabled || force) && state.selected !== key) {
      if (userMove(state, state.selected, key)) {
        state.stats.dragged = false;
        return;
      }
    }
  }
  if (
    (state.selectable.enabled || state.draggable.enabled) &&
    (isMovable(state, key) || isPremovable(state, key))
  ) {
    setSelected(state, key);
    state.hold.start();
  }
}

/**
 * Sets the selected square
 */
export function setSelected(state: MoveState, key: Key): void {
  state.selected = key;
  if (!isPremovable(state, key)) state.premovable.dests = undefined;
  else if (!state.premovable.customDests) state.premovable.dests = calculatePremoves(state, key);
}

/**
 * Unselects the current square
 */
export function unselect(state: MoveState): void {
  state.selected = undefined;
  state.premovable.dests = undefined;
  state.hold.cancel();
}

function isMovable(state: MoveState, orig: Key): boolean {
  const piece = state.pieces.get(orig);
  return (
    !!piece &&
    (state.movable.color === 'both' ||
      (state.movable.color === piece.color && state.turnColor === piece.color))
  );
}

/**
 * Checks if a move is valid
 */
export const canMove = (state: MoveState, orig: Key, dest: Key): boolean =>
  orig !== dest &&
  isMovable(state, orig) &&
  (state.movable.free || !!state.movable.dests?.get(orig)?.includes(dest));

function canDrop(state: MoveState, orig: Key, dest: Key): boolean {
  const piece = state.pieces.get(orig);
  return (
    !!piece &&
    (orig === dest || !state.pieces.has(dest)) &&
    (state.movable.color === 'both' ||
      (state.movable.color === piece.color && state.turnColor === piece.color))
  );
}

function isPremovable(state: MoveState, orig: Key): boolean {
  const piece = state.pieces.get(orig);
  return (
    !!piece &&
    state.premovable.enabled &&
    state.movable.color === piece.color &&
    state.turnColor !== piece.color
  );
}

const canPremove = (state: MoveState, orig: Key, dest: Key): boolean =>
  orig !== dest &&
  isPremovable(state, orig) &&
  (state.premovable.customDests?.get(orig) ?? calculatePremoves(state, orig)).includes(dest);

function canPredrop(state: MoveState, orig: Key, dest: Key): boolean {
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

/**
 * Checks if a piece is draggable
 */
export function isDraggable(state: MoveState, orig: Key): boolean {
  const piece = state.pieces.get(orig);
  return (
    !!piece &&
    state.draggable.enabled &&
    (state.movable.color === 'both' ||
      (state.movable.color === piece.color && (state.turnColor === piece.color || state.premovable.enabled)))
  );
}

/**
 * Plays the current premove
 */
export function playPremove(state: MoveState): boolean {
  const move = state.premovable.current;
  if (!move) return false;
  const orig = move[0],
    dest = move[1];
  let success = false;
  if (canMove(state, orig, dest)) {
    const result = baseUserMove(state, orig, dest);
    if (result) {
      const metadata: MoveMetadata = { premove: true };
      if (result !== true) metadata.captured = result;
      callUserFunction(state.movable.events.after, orig, dest, metadata);
      success = true;
    }
  }
  unsetPremove(state);
  return success;
}

/**
 * Plays the current predrop
 */
export function playPredrop(state: MoveState, validate: (drop: Drop) => boolean): boolean {
  const drop = state.predroppable.current;
  let success = false;
  if (!drop) return false;
  if (validate(drop as Drop)) {
    const piece = {
      role: drop.role,
      color: state.movable.color,
    } as Piece;
    if (baseNewPiece(state, piece, drop.key)) {
      callUserFunction(state.movable.events.afterNewPiece, drop.role, drop.key, {
        premove: false,
        predrop: true,
      });
      success = true;
    }
  }
  unsetPredrop(state);
  return success;
}

/**
 * Cancels the current move
 */
export function cancelMove(state: MoveState): void {
  unsetPremove(state);
  unsetPredrop(state);
  unselect(state);
}

/**
 * Stops all moves and interactions
 */
export function stop(state: MoveState): void {
  state.movable.color = state.movable.dests = state.animation.current = undefined;
  cancelMove(state);
}

/**
 * Gets the key at a DOM position
 */
export function getKeyAtDomPos(
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

/**
 * Gets the key at a DOM position, snapped to valid piece moves
 */
export function getSnappedKeyAtDomPos(
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

/**
 * Returns true if viewing the board as white
 */
export const whitePov = (s: { orientation: Color }): boolean => s.orientation === 'white';
