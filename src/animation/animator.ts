/**
 * Animation system for piece movements.
 * Original implementation for @indiefoundry/chessboard.
 */
import type { State } from '../engine/state';
import type { Key, Piece, NumberQuad, NumberPair, KHz } from '../core/types';
import { allKeys, key2pos, samePiece } from '../core/squares';
import { distanceSq } from '../utils/math';

/** Mutation function type */
export type BoardMutation<R> = (state: State) => R;

/** Animation vector: [targetX, targetY, currentX, currentY] */
export type MotionVector = NumberQuad;

/** Map of square keys to motion vectors */
export type MotionVectorMap = Map<Key, MotionVector>;

/** Map of square keys to pieces being faded out */
export type FadingPieceMap = Map<Key, Piece>;

/** Animation plan describing all active animations */
export interface TransitionPlan {
  anims: MotionVectorMap;
  fadings: FadingPieceMap;
}

/** Active animation state */
export interface ActiveTransition {
  start: DOMHighResTimeStamp;
  frequency: KHz;
  plan: TransitionPlan;
}

// Backwards compatibility type aliases
export type Mutation<A> = BoardMutation<A>;
export type AnimVector = MotionVector;
export type AnimVectors = MotionVectorMap;
export type AnimFadings = FadingPieceMap;
export type AnimPlan = TransitionPlan;
export type AnimCurrent = ActiveTransition;

/** Piece snapshot for animation calculations */
interface PieceSnapshot {
  key: Key;
  coords: NumberPair;
  piece: Piece;
}

type PieceSnapshotMap = Map<Key, PieceSnapshot>;

/**
 * Create a piece snapshot for animation calculations.
 */
function createPieceSnapshot(key: Key, piece: Piece): PieceSnapshot {
  return {
    key,
    coords: key2pos(key),
    piece,
  };
}

/**
 * Find the closest matching piece from a list.
 */
function findClosestPiece(target: PieceSnapshot, candidates: PieceSnapshot[]): PieceSnapshot | undefined {
  if (candidates.length === 0) return undefined;
  return candidates.sort((a, b) => distanceSq(target.coords, a.coords) - distanceSq(target.coords, b.coords))[0];
}

/**
 * Create an animation plan by comparing previous and current board state.
 */
function createTransitionPlan(previousPieces: Map<Key, Piece>, currentState: State): TransitionPlan {
  const anims: MotionVectorMap = new Map();
  const fadings: FadingPieceMap = new Map();
  const animatedOrigins: Key[] = [];
  const removedPieces: PieceSnapshot[] = [];
  const addedPieces: PieceSnapshot[] = [];
  const previousSnapshots: PieceSnapshotMap = new Map();

  // Build snapshot map of previous state
  for (const [key, piece] of previousPieces) {
    previousSnapshots.set(key, createPieceSnapshot(key, piece));
  }

  // Compare all squares to find additions and removals
  for (const key of allKeys) {
    const currentPiece = currentState.pieces.get(key);
    const previousSnapshot = previousSnapshots.get(key);

    if (currentPiece) {
      if (previousSnapshot) {
        // Square had a piece, now has different piece
        if (!samePiece(currentPiece, previousSnapshot.piece)) {
          removedPieces.push(previousSnapshot);
          addedPieces.push(createPieceSnapshot(key, currentPiece));
        }
      } else {
        // Square was empty, now has piece
        addedPieces.push(createPieceSnapshot(key, currentPiece));
      }
    } else if (previousSnapshot) {
      // Square had piece, now empty
      removedPieces.push(previousSnapshot);
    }
  }

  // Match added pieces with removed pieces of same type (for smooth movement)
  for (const added of addedPieces) {
    const matchingRemoved = findClosestPiece(
      added,
      removedPieces.filter(p => samePiece(added.piece, p.piece)),
    );

    if (matchingRemoved) {
      // Calculate motion vector: from old position to new position
      const deltaX = matchingRemoved.coords[0] - added.coords[0];
      const deltaY = matchingRemoved.coords[1] - added.coords[1];
      anims.set(added.key, [deltaX, deltaY, deltaX, deltaY]);
      animatedOrigins.push(matchingRemoved.key);
    }
  }

  // Pieces that were removed but not matched should fade out
  for (const removed of removedPieces) {
    if (!animatedOrigins.includes(removed.key)) {
      fadings.set(removed.key, removed.piece);
    }
  }

  return { anims, fadings };
}

/**
 * Cubic ease-in-out function for smooth animations.
 */
function cubicEaseInOut(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : (progress - 1) * (2 * progress - 2) * (2 * progress - 2) + 1;
}

/**
 * Process a single animation frame.
 */
function processAnimationFrame(state: State, timestamp: DOMHighResTimeStamp): void {
  const active = state.animation.current;

  if (active === undefined) {
    // Animation was cancelled
    if (!state.dom.destroyed) state.dom.redrawNow();
    return;
  }

  const elapsedTime = timestamp - active.start;
  const remainingProgress = 1 - elapsedTime * active.frequency;

  if (remainingProgress <= 0) {
    // Animation complete
    state.animation.current = undefined;
    state.dom.redrawNow();
  } else {
    // Update animation positions
    const easedProgress = cubicEaseInOut(remainingProgress);

    for (const motion of active.plan.anims.values()) {
      motion[2] = motion[0] * easedProgress;
      motion[3] = motion[1] * easedProgress;
    }

    // Render frame (skip SVG during animation for performance)
    state.dom.redrawNow(true);

    // Schedule next frame
    requestAnimationFrame((now = performance.now()) => processAnimationFrame(state, now));
  }
}

/**
 * Execute an animated state mutation.
 */
function runAnimatedMutation<R>(mutation: BoardMutation<R>, state: State): R {
  // Snapshot pieces before mutation
  const previousPieces = new Map(state.pieces);

  // Apply the mutation
  const result = mutation(state);

  // Create animation plan
  const plan = createTransitionPlan(previousPieces, state);

  if (plan.anims.size || plan.fadings.size) {
    const alreadyAnimating = state.animation.current?.start !== undefined;

    state.animation.current = {
      start: performance.now(),
      frequency: 1 / state.animation.duration,
      plan,
    };

    if (!alreadyAnimating) {
      processAnimationFrame(state, performance.now());
    }
  } else {
    // No animation needed, just redraw
    state.dom.redraw();
  }

  return result;
}

/**
 * Apply a mutation without animation.
 */
export function applyMutation<R>(mutation: BoardMutation<R>, state: State): R {
  const result = mutation(state);
  state.dom.redraw();
  return result;
}

// Backwards compatibility alias
export const render = applyMutation;

/**
 * Animate a state mutation if animations are enabled, otherwise apply immediately.
 */
export function animateTransition<R>(mutation: BoardMutation<R>, state: State): R {
  return state.animation.enabled ? runAnimatedMutation(mutation, state) : applyMutation(mutation, state);
}

// Backwards compatibility alias
export const anim = animateTransition;
