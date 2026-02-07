/**
 * Animation system for piece movements
 */
import type { State } from '../engine/state';
import type { Key, Piece, NumberQuad, NumberPair, KHz } from '../core/types';
import { allKeys, key2pos, samePiece } from '../core/squares';
import { distanceSq } from '../utils/math';

/** Mutation function type */
export type Mutation<A> = (state: State) => A;

/** Animation vector: [goalX, goalY, currentX, currentY] */
export type AnimVector = NumberQuad;

/** Map of keys to animation vectors */
export type AnimVectors = Map<Key, AnimVector>;

/** Map of keys to fading pieces */
export type AnimFadings = Map<Key, Piece>;

/** Animation plan containing all animations */
export interface AnimPlan {
  anims: AnimVectors;
  fadings: AnimFadings;
}

/** Current animation state */
export interface AnimCurrent {
  start: DOMHighResTimeStamp;
  frequency: KHz;
  plan: AnimPlan;
}

/**
 * Animates a state mutation if animations are enabled
 */
export const anim = <A>(mutation: Mutation<A>, state: State): A =>
  state.animation.enabled ? animate(mutation, state) : render(mutation, state);

/**
 * Renders a state mutation without animation
 */
export function render<A>(mutation: Mutation<A>, state: State): A {
  const result = mutation(state);
  state.dom.redraw();
  return result;
}

interface AnimPiece {
  key: Key;
  pos: NumberPair;
  piece: Piece;
}
type AnimPieces = Map<Key, AnimPiece>;

const makePiece = (key: Key, piece: Piece): AnimPiece => ({
  key: key,
  pos: key2pos(key),
  piece: piece,
});

const closer = (piece: AnimPiece, pieces: AnimPiece[]): AnimPiece | undefined =>
  pieces.sort((p1, p2) => distanceSq(piece.pos, p1.pos) - distanceSq(piece.pos, p2.pos))[0];

function computePlan(prevPieces: Map<Key, Piece>, current: State): AnimPlan {
  const anims: AnimVectors = new Map(),
    animedOrigs: Key[] = [],
    fadings: AnimFadings = new Map(),
    missings: AnimPiece[] = [],
    news: AnimPiece[] = [],
    prePieces: AnimPieces = new Map();
  let curP: Piece | undefined, preP: AnimPiece | undefined, vector: NumberPair;
  for (const [k, p] of prevPieces) {
    prePieces.set(k, makePiece(k, p));
  }
  for (const key of allKeys) {
    curP = current.pieces.get(key);
    preP = prePieces.get(key);
    if (curP) {
      if (preP) {
        if (!samePiece(curP, preP.piece)) {
          missings.push(preP);
          news.push(makePiece(key, curP));
        }
      } else news.push(makePiece(key, curP));
    } else if (preP) missings.push(preP);
  }
  for (const newP of news) {
    preP = closer(
      newP,
      missings.filter(p => samePiece(newP.piece, p.piece)),
    );
    if (preP) {
      vector = [preP.pos[0] - newP.pos[0], preP.pos[1] - newP.pos[1]];
      anims.set(newP.key, vector.concat(vector) as AnimVector);
      animedOrigs.push(preP.key);
    }
  }
  for (const p of missings) {
    if (!animedOrigs.includes(p.key)) fadings.set(p.key, p.piece);
  }

  return {
    anims: anims,
    fadings: fadings,
  };
}

function step(state: State, now: DOMHighResTimeStamp): void {
  const cur = state.animation.current;
  if (cur === undefined) {
    // animation was canceled :(
    if (!state.dom.destroyed) state.dom.redrawNow();
    return;
  }
  const rest = 1 - (now - cur.start) * cur.frequency;
  if (rest <= 0) {
    state.animation.current = undefined;
    state.dom.redrawNow();
  } else {
    const ease = easing(rest);
    for (const cfg of cur.plan.anims.values()) {
      cfg[2] = cfg[0] * ease;
      cfg[3] = cfg[1] * ease;
    }
    state.dom.redrawNow(true); // optimisation: don't render SVG changes during animations
    requestAnimationFrame((now = performance.now()) => step(state, now));
  }
}

function animate<A>(mutation: Mutation<A>, state: State): A {
  // clone state before mutating it
  const prevPieces: Map<Key, Piece> = new Map(state.pieces);

  const result = mutation(state);
  const plan = computePlan(prevPieces, state);
  if (plan.anims.size || plan.fadings.size) {
    const alreadyRunning = state.animation.current && state.animation.current.start;
    state.animation.current = {
      start: performance.now(),
      frequency: 1 / state.animation.duration,
      plan: plan,
    };
    if (!alreadyRunning) step(state, performance.now());
  } else {
    // don't animate, just render right away
    state.dom.redraw();
  }
  return result;
}

/** Easing function: ease-in-out cubic */
const easing = (t: number): number => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1);
