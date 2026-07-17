/**
 * DOM structure creation for the board
 */
import type { HeadlessState } from '../engine/state';
import type { Elements, Color } from '../core/types';
import { colors, files, ranks } from '../core/types';
import { opposite } from '../core/squares';
import { createEl, setVisible } from '../utils/dom';
import { createElement as createSVG, setAttributes, createDefs } from './svg/shapes';

/**
 * Renders the board DOM structure
 *
 * DOM hierarchy:
 * .cb-wrap (root element)
 *   .cb-layer
 *     .cb-grid
 *     svg.cb-arrows
 *       defs
 *       g
 *     svg.cb-markers
 *       g
 *     .cb-hints
 *     .cb-labels.rows
 *     .cb-labels.cols
 *     .cb-phantom
 */
export function renderWrap(element: HTMLElement, s: HeadlessState): Elements {
  // Clear all children safely
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }

  // ensure the cb-wrap class is set
  element.classList.add('cb-wrap');

  for (const c of colors) element.classList.toggle('view-' + c, s.orientation === c);
  element.classList.toggle('interactive', !s.viewOnly);

  const container = createEl('div', 'cb-layer');
  element.appendChild(container);

  const board = createEl('div', 'cb-grid');
  container.appendChild(board);

  let shapesBelow: SVGElement | undefined;
  let shapes: SVGElement | undefined;
  let customBelow: SVGElement | undefined;
  let custom: SVGElement | undefined;
  let autoPieces: HTMLElement | undefined;

  if (s.drawable.visible) {
    [shapesBelow, shapes] = ['cb-arrows-below', 'cb-arrows'].map(cls => svgContainer(cls, true));
    [customBelow, custom] = ['cb-markers-below', 'cb-markers'].map(cls => svgContainer(cls, false));

    autoPieces = createEl('div', 'cb-hints');

    container.appendChild(shapesBelow);
    container.appendChild(customBelow);
    container.appendChild(shapes);
    container.appendChild(custom);
    container.appendChild(autoPieces);
  }

  if (s.coordinates) {
    const orientClass = s.orientation === 'black' ? ' flip' : '';
    const ranksPositionClass = s.ranksPosition === 'left' ? ' left' : '';

    if (s.coordinatesOnSquares) {
      const rankN: (i: number) => number = s.orientation === 'white' ? i => i + 1 : i => 8 - i;
      files.forEach((f, i) =>
        container.appendChild(
          renderCoords(
            ranks.map(r => f + r),
            'cb-labels on-squares file' + rankN(i) + orientClass + ranksPositionClass,
            i % 2 === 0 ? 'black' : 'white',
          ),
        ),
      );
    } else {
      // lt/dk must contrast the square under each label. Ranks sit on the
      // rightmost column (h-file for white view, a-file for black view): the
      // bottom-right corner square is always light, so the first rendered rank
      // ('1', at the bottom for white / top for black via .flip) lands on a
      // light square for white view and a dark one for black view. Files sit
      // on the bottom rank, whose leftmost square is always dark: 'a' (first
      // rendered, visually right for black via .flip) lands on dark for white
      // view and light for black view.
      container.appendChild(
        renderCoords(
          ranks,
          'cb-labels rows' + orientClass + ranksPositionClass,
          opposite(s.orientation),
        ),
      );
      container.appendChild(renderCoords(files, 'cb-labels cols' + orientClass, s.orientation));
    }
  }

  let ghost: HTMLElement | undefined;
  if (!s.viewOnly && s.draggable.enabled && s.draggable.showGhost) {
    ghost = createEl('div', 'cb-phantom');
    setVisible(ghost, false);
    // Append INSIDE .cb-grid (board), not .cb-layer (container): the phantom's
    // orientation-flip CSS is scoped `.cb-grid[data-orientation="black"]
    // .cb-phantom{...}`, so a ghost that is a sibling of .cb-grid never gets
    // flipped and renders at the 180°-mirrored square on a black-oriented
    // board (e.g. b8 shows at g1). As a child of .cb-grid the rules match.
    board.appendChild(ghost);
  }

  return { board, container, wrap: element, ghost, shapes, shapesBelow, custom, customBelow, autoPieces };
}

function svgContainer(cls: string, isShapes: boolean) {
  const svg = setAttributes(createSVG('svg'), {
    class: cls,
    viewBox: isShapes ? '-4 -4 8 8' : '-3.5 -3.5 8 8',
    preserveAspectRatio: 'xMidYMid slice',
  });
  if (isShapes) svg.appendChild(createDefs());
  svg.appendChild(createSVG('g'));
  return svg;
}

function renderCoords(elems: readonly string[], className: string, firstColor: Color): HTMLElement {
  const el = createEl('div', className);
  let f: HTMLElement;
  elems.forEach((elem, i) => {
    const light = i % 2 === (firstColor === 'white' ? 0 : 1);
    f = createEl('span', light ? 'lt' : 'dk');
    f.textContent = elem;
    el.appendChild(f);
  });
  return el;
}
