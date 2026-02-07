/**
 * Timer utilities for measuring elapsed time
 */

/** A simple timer for measuring elapsed time */
export interface Timer {
  start: () => void;
  cancel: () => void;
  stop: () => number;
}

/**
 * Creates a timer for measuring elapsed time.
 * - `start()`: begins timing
 * - `cancel()`: cancels timing without returning a value
 * - `stop()`: stops timing and returns elapsed milliseconds (0 if not started)
 */
export function createTimer(): Timer {
  let startAt: number | undefined;
  return {
    start() {
      startAt = performance.now();
    },
    cancel() {
      startAt = undefined;
    },
    stop() {
      if (!startAt) return 0;
      const time = performance.now() - startAt;
      startAt = undefined;
      return time;
    },
  };
}
