/**
 * Public API for the chessboard
 */
import type { State } from './state';
import type { Config } from './config';
import type { Key, FEN, Piece, PiecesDiff, Drop, NumberPair, Redraw, Unbind, MouchEvent } from '../core/types';
import type { DrawShape } from '../interactions/draw-handler';
import * as moves from '../core/moves';
import { writeFen } from '../core/position';
import { configure, applyAnimation } from './config';
import { anim, render } from '../animation/animator';
import { cancel as dragCancel, dragNewPiece } from '../interactions/drag-handler';
import { explosion } from '../effects/explosion';

/**
 * The public API exposed by the chessboard
 */
export interface Api {
  /** Reconfigure the instance. Board will be animated if animations are enabled. */
  set(config: Config): void;

  /** Read board state; write at your own risks. */
  state: State;

  /** Get the position as a FEN string (only contains pieces, no flags) */
  getFen(): FEN;

  /** Change the view angle */
  toggleOrientation(): void;

  /** Perform a move programmatically */
  move(orig: Key, dest: Key): void;

  /** Add and/or remove arbitrary pieces on the board */
  setPieces(pieces: PiecesDiff): void;

  /** Click a square programmatically */
  selectSquare(key: Key | null, force?: boolean): void;

  /** Put a new piece on the board */
  newPiece(piece: Piece, key: Key): void;

  /** Play the current premove, if any; returns true if premove was played */
  playPremove(): boolean;

  /** Cancel the current premove, if any */
  cancelPremove(): void;

  /** Play the current predrop, if any; returns true if premove was played */
  playPredrop(validate: (drop: Drop) => boolean): boolean;

  /** Cancel the current predrop, if any */
  cancelPredrop(): void;

  /** Cancel the current move being made */
  cancelMove(): void;

  /** Cancel current move and prevent further ones */
  stop(): void;

  /** Make squares explode (atomic chess) */
  explode(keys: Key[]): void;

  /** Programmatically draw user shapes */
  setShapes(shapes: DrawShape[]): void;

  /** Programmatically draw auto shapes */
  setAutoShapes(shapes: DrawShape[]): void;

  /** Square name at this DOM position (like "e4") */
  getKeyAtDomPos(pos: NumberPair): Key | undefined;

  /** Only useful when CSS changes the board width/height ratio (for 3D) */
  redrawAll: Redraw;

  /** For crazyhouse and board editors */
  dragNewPiece(piece: Piece, event: MouchEvent, force?: boolean): void;

  /** Unbinds all events (important for document-wide events like scroll and mousemove) */
  destroy: Unbind;
}

/**
 * Creates the public API from the state
 */
export function start(state: State, redrawAll: Redraw): Api {
  function toggleOrientation(): void {
    moves.toggleOrientation(state);
    redrawAll();
  }

  return {
    set(config): void {
      if (config.orientation && config.orientation !== state.orientation) toggleOrientation();
      applyAnimation(state, config);
      (config.fen ? anim : render)(state => configure(state, config), state);
    },

    state,

    getFen: () => writeFen(state.pieces),

    toggleOrientation,

    setPieces(pieces): void {
      anim(state => moves.setPieces(state, pieces), state);
    },

    selectSquare(key, force): void {
      if (key) anim(state => moves.selectSquare(state, key, force), state);
      else if (state.selected) {
        moves.unselect(state);
        state.dom.redraw();
      }
    },

    move(orig, dest): void {
      anim(state => moves.baseMove(state, orig, dest), state);
    },

    newPiece(piece, key): void {
      anim(state => moves.baseNewPiece(state, piece, key), state);
    },

    playPremove(): boolean {
      if (state.premovable.current) {
        if (anim(state => moves.playPremove(state), state)) return true;
        state.dom.redraw();
      }
      return false;
    },

    playPredrop(validate): boolean {
      if (state.predroppable.current) {
        const result = moves.playPredrop(state, validate);
        state.dom.redraw();
        return result;
      }
      return false;
    },

    cancelPremove(): void {
      render(state => moves.unsetPremove(state), state);
    },

    cancelPredrop(): void {
      render(state => moves.unsetPredrop(state), state);
    },

    cancelMove(): void {
      render(state => {
        moves.cancelMove(state);
        dragCancel(state);
      }, state);
    },

    stop(): void {
      render(state => {
        moves.stop(state);
        dragCancel(state);
      }, state);
    },

    explode(keys: Key[]): void {
      explosion(state, keys);
    },

    setAutoShapes(shapes: DrawShape[]): void {
      render(state => (state.drawable.autoShapes = shapes), state);
    },

    setShapes(shapes: DrawShape[]): void {
      render(state => (state.drawable.shapes = shapes.slice()), state);
    },

    getKeyAtDomPos(pos): Key | undefined {
      return moves.getKeyAtDomPos(pos, moves.whitePov(state), state.dom.bounds());
    },

    redrawAll,

    dragNewPiece(piece, event, force): void {
      dragNewPiece(state, piece, event, force);
    },

    destroy(): void {
      moves.stop(state);
      state.dom.unbind && state.dom.unbind();
      state.dom.destroyed = true;
    },
  };
}
