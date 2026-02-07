/**
 * Main controller - initializes and manages the chessboard
 */
import type { Api } from './api';
import type { Config } from './config';
import type { HeadlessState, State } from './state';
import { start } from './api';
import { configure } from './config';
import { defaults } from './state';
import { renderWrap } from '../rendering/board-dom';
import { render, renderResized, updateBounds } from '../rendering/pieces-renderer';
import { renderSvg } from '../rendering/svg/shapes';
import * as autoPieces from '../rendering/svg/auto-pieces';
import * as events from '../interactions/events';
import { memo } from '../utils/memo';

/**
 * Alternative initialization using an options object
 */
export function initModule({ el, config }: { el: HTMLElement; config?: Config }): Api {
  return createBoard(el, config);
}

/**
 * Creates a new chessboard instance
 *
 * @param element - The container element to mount the board in
 * @param config - Optional configuration options
 * @returns The API for controlling the board
 */
export function createBoard(element: HTMLElement, config?: Config): Api {
  const maybeState: State | HeadlessState = defaults();

  configure(maybeState, config || {});

  function redrawAll(): State {
    const prevUnbind = 'dom' in maybeState ? maybeState.dom.unbind : undefined;

    // compute bounds from existing board element if possible
    // this allows non-square boards from CSS to be handled (for 3D)
    const elements = renderWrap(element, maybeState),
      bounds = memo(() => elements.board.getBoundingClientRect()),
      redrawNow = (skipSvg?: boolean): void => {
        render(state);
        if (elements.autoPieces) autoPieces.render(state, elements.autoPieces);
        if (!skipSvg && elements.shapes) renderSvg(state, elements);
      },
      onResize = (): void => {
        updateBounds(state);
        renderResized(state);
        if (elements.autoPieces) autoPieces.renderResized(state);
      };

    const state = maybeState as State;
    state.dom = {
      elements,
      bounds,
      redraw: debounceRedraw(redrawNow),
      redrawNow,
      unbind: prevUnbind,
    };
    state.drawable.prevSvgHash = '';
    updateBounds(state);
    redrawNow(false);
    events.bindBoard(state, onResize);
    if (!prevUnbind) state.dom.unbind = events.bindDocument(state, onResize);
    state.events.insert && state.events.insert(elements);
    return state;
  }

  return start(redrawAll(), redrawAll);
}

/**
 * Debounces redraw calls using requestAnimationFrame
 */
function debounceRedraw(redrawNow: (skipSvg?: boolean) => void): () => void {
  let redrawing = false;
  return () => {
    if (redrawing) return;
    redrawing = true;
    requestAnimationFrame(() => {
      redrawNow();
      redrawing = false;
    });
  };
}
