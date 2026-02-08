/**
 * DOM manipulation utilities
 */
import type { NumberPair, Pos, MouchEvent } from '../core/types';
import { memo } from './memo';

/**
 * Creates an HTML element with an optional class name
 */
export const createEl = (tagName: string, className?: string): HTMLElement => {
  const el = document.createElement(tagName);
  if (className) el.className = className;
  return el;
};

/**
 * Applies a CSS translate transform to an element
 */
export const translate = (el: HTMLElement, pos: NumberPair): void => {
  el.style.transform = `translate(${pos[0]}px,${pos[1]}px)`;
};

/**
 * Applies a CSS translate and scale transform to an element
 */
export const translateAndScale = (el: HTMLElement, pos: NumberPair, scale = 1): void => {
  el.style.transform = `translate(${pos[0]}px,${pos[1]}px) scale(${scale})`;
};

/**
 * Sets the visibility of an element using CSS class (no inline style)
 */
export const setVisible = (el: HTMLElement, v: boolean): void => {
  el.classList.toggle('hidden', !v);
};

/**
 * Sets element position via data attributes for CSS-based positioning
 * @param key - Square key like 'e4'
 */
export const setPositionByKey = (el: HTMLElement, key: string): void => {
  el.dataset.file = key[0];
  el.dataset.rank = key[1];
};

/**
 * Extracts the client position from a mouse or touch event
 */
export const eventPosition = (e: MouchEvent): NumberPair | undefined => {
  if (e.clientX || e.clientX === 0) return [e.clientX, e.clientY!];
  if (e.targetTouches?.[0]) return [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
  return; // touchend has no position!
};

/** Detects Firefox on Mac (for right-click handling) */
const isFireMac = memo(
  () =>
    !('ontouchstart' in window) &&
    ['macintosh', 'firefox'].every(x => navigator.userAgent.toLowerCase().includes(x)),
);

/**
 * Checks if the event was triggered by a right mouse button click.
 * Handles Firefox on Mac where ctrl+click is right-click.
 */
export const isRightButton = (e: MouchEvent): boolean => e.button === 2 && !(e.ctrlKey && isFireMac());

/**
 * Returns a function that converts a board position to pixel coordinates.
 * Takes into account board orientation (white/black at bottom).
 */
export const posToTranslate =
  (bounds: DOMRectReadOnly): ((pos: Pos, asWhite: boolean) => NumberPair) =>
  (pos, asWhite) => [
    ((asWhite ? pos[0] : 7 - pos[0]) * bounds.width) / 8,
    ((asWhite ? 7 - pos[1] : pos[1]) * bounds.height) / 8,
  ];
