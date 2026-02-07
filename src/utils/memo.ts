/**
 * Memoization utilities for caching computed values
 */

/** A memoized function that can be cleared */
export interface Memo<A> {
  (): A;
  clear: () => void;
}

/**
 * Creates a memoized version of a function that caches its result.
 * The cached value is computed lazily on first call and reused on subsequent calls.
 * Call `.clear()` to invalidate the cache.
 */
export function memo<A>(f: () => A): Memo<A> {
  let v: A | undefined;
  const ret = (): A => {
    if (v === undefined) v = f();
    return v;
  };
  ret.clear = () => {
    v = undefined;
  };
  return ret;
}
