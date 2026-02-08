/**
 * Immutable 64-bit set for representing chess squares.
 * Uses two 32-bit integers (lo/hi) since JavaScript lacks native 64-bit integers.
 * Original implementation for @indiefoundry/chessboard.
 */

import type { Color, Square } from './types';

const countBits32 = (n: number): number => {
  n = n - ((n >>> 1) & 0x5555_5555);
  n = (n & 0x3333_3333) + ((n >>> 2) & 0x3333_3333);
  return Math.imul((n + (n >>> 4)) & 0x0f0f_0f0f, 0x0101_0101) >> 24;
};

const reverseBytes32 = (n: number): number => {
  n = ((n >>> 8) & 0x00ff_00ff) | ((n & 0x00ff_00ff) << 8);
  return ((n >>> 16) & 0xffff) | ((n & 0xffff) << 16);
};

const reverseBits32 = (n: number): number => {
  n = ((n >>> 1) & 0x5555_5555) | ((n & 0x5555_5555) << 1);
  n = ((n >>> 2) & 0x3333_3333) | ((n & 0x3333_3333) << 2);
  n = ((n >>> 4) & 0x0f0f_0f0f) | ((n & 0x0f0f_0f0f) << 4);
  return reverseBytes32(n);
};

/**
 * An immutable bitboard representing a set of squares.
 */
export class SquareMask implements Iterable<Square> {
  readonly lo: number;
  readonly hi: number;

  constructor(lo: number, hi: number) {
    this.lo = lo | 0;
    this.hi = hi | 0;
  }

  static fromSquare(square: Square): SquareMask {
    return square >= 32 ? new SquareMask(0, 1 << (square - 32)) : new SquareMask(1 << square, 0);
  }

  static fromRank(rank: number): SquareMask {
    return new SquareMask(0xff, 0).shl64(8 * rank);
  }

  static fromFile(file: number): SquareMask {
    return new SquareMask(0x0101_0101 << file, 0x0101_0101 << file);
  }

  static empty(): SquareMask {
    return new SquareMask(0, 0);
  }

  static full(): SquareMask {
    return new SquareMask(0xffff_ffff, 0xffff_ffff);
  }

  static corners(): SquareMask {
    return new SquareMask(0x81, 0x8100_0000);
  }

  static center(): SquareMask {
    return new SquareMask(0x1800_0000, 0x18);
  }

  static backranks(): SquareMask {
    return new SquareMask(0xff, 0xff00_0000);
  }

  static backrank(color: Color): SquareMask {
    return color === 'white' ? new SquareMask(0xff, 0) : new SquareMask(0, 0xff00_0000);
  }

  static lightSquares(): SquareMask {
    return new SquareMask(0x55aa_55aa, 0x55aa_55aa);
  }

  static darkSquares(): SquareMask {
    return new SquareMask(0xaa55_aa55, 0xaa55_aa55);
  }

  complement(): SquareMask {
    return new SquareMask(~this.lo, ~this.hi);
  }

  xor(other: SquareMask): SquareMask {
    return new SquareMask(this.lo ^ other.lo, this.hi ^ other.hi);
  }

  union(other: SquareMask): SquareMask {
    return new SquareMask(this.lo | other.lo, this.hi | other.hi);
  }

  intersect(other: SquareMask): SquareMask {
    return new SquareMask(this.lo & other.lo, this.hi & other.hi);
  }

  diff(other: SquareMask): SquareMask {
    return new SquareMask(this.lo & ~other.lo, this.hi & ~other.hi);
  }

  intersects(other: SquareMask): boolean {
    return this.intersect(other).nonEmpty();
  }

  isDisjoint(other: SquareMask): boolean {
    return this.intersect(other).isEmpty();
  }

  supersetOf(other: SquareMask): boolean {
    return other.diff(this).isEmpty();
  }

  subsetOf(other: SquareMask): boolean {
    return this.diff(other).isEmpty();
  }

  shr64(shift: number): SquareMask {
    if (shift >= 64) return SquareMask.empty();
    if (shift >= 32) return new SquareMask(this.hi >>> (shift - 32), 0);
    if (shift > 0) return new SquareMask((this.lo >>> shift) ^ (this.hi << (32 - shift)), this.hi >>> shift);
    return this;
  }

  shl64(shift: number): SquareMask {
    if (shift >= 64) return SquareMask.empty();
    if (shift >= 32) return new SquareMask(0, this.lo << (shift - 32));
    if (shift > 0) return new SquareMask(this.lo << shift, (this.hi << shift) ^ (this.lo >>> (32 - shift)));
    return this;
  }

  bswap64(): SquareMask {
    return new SquareMask(reverseBytes32(this.hi), reverseBytes32(this.lo));
  }

  rbit64(): SquareMask {
    return new SquareMask(reverseBits32(this.hi), reverseBits32(this.lo));
  }

  minus64(other: SquareMask): SquareMask {
    const lo = this.lo - other.lo;
    const c = ((lo & other.lo & 1) + (other.lo >>> 1) + (lo >>> 1)) >>> 31;
    return new SquareMask(lo, this.hi - (other.hi + c));
  }

  equals(other: SquareMask): boolean {
    return this.lo === other.lo && this.hi === other.hi;
  }

  size(): number {
    return countBits32(this.lo) + countBits32(this.hi);
  }

  isEmpty(): boolean {
    return this.lo === 0 && this.hi === 0;
  }

  nonEmpty(): boolean {
    return this.lo !== 0 || this.hi !== 0;
  }

  has(square: Square): boolean {
    return (square >= 32 ? this.hi & (1 << (square - 32)) : this.lo & (1 << square)) !== 0;
  }

  set(square: Square, on: boolean): SquareMask {
    return on ? this.with(square) : this.without(square);
  }

  with(square: Square): SquareMask {
    return square >= 32
      ? new SquareMask(this.lo, this.hi | (1 << (square - 32)))
      : new SquareMask(this.lo | (1 << square), this.hi);
  }

  without(square: Square): SquareMask {
    return square >= 32
      ? new SquareMask(this.lo, this.hi & ~(1 << (square - 32)))
      : new SquareMask(this.lo & ~(1 << square), this.hi);
  }

  toggle(square: Square): SquareMask {
    return square >= 32
      ? new SquareMask(this.lo, this.hi ^ (1 << (square - 32)))
      : new SquareMask(this.lo ^ (1 << square), this.hi);
  }

  last(): Square | undefined {
    if (this.hi !== 0) return 63 - Math.clz32(this.hi);
    if (this.lo !== 0) return 31 - Math.clz32(this.lo);
    return;
  }

  first(): Square | undefined {
    if (this.lo !== 0) return 31 - Math.clz32(this.lo & -this.lo);
    if (this.hi !== 0) return 63 - Math.clz32(this.hi & -this.hi);
    return;
  }

  withoutFirst(): SquareMask {
    if (this.lo !== 0) return new SquareMask(this.lo & (this.lo - 1), this.hi);
    return new SquareMask(0, this.hi & (this.hi - 1));
  }

  moreThanOne(): boolean {
    return (this.hi !== 0 && this.lo !== 0) || (this.lo & (this.lo - 1)) !== 0 || (this.hi & (this.hi - 1)) !== 0;
  }

  singleSquare(): Square | undefined {
    return this.moreThanOne() ? undefined : this.last();
  }

  *[Symbol.iterator](): Iterator<Square> {
    let lo = this.lo;
    let hi = this.hi;
    while (lo !== 0) {
      const idx = 31 - Math.clz32(lo & -lo);
      lo ^= 1 << idx;
      yield idx;
    }
    while (hi !== 0) {
      const idx = 31 - Math.clz32(hi & -hi);
      hi ^= 1 << idx;
      yield 32 + idx;
    }
  }

  *reversed(): Iterable<Square> {
    let lo = this.lo;
    let hi = this.hi;
    while (hi !== 0) {
      const idx = 31 - Math.clz32(hi);
      hi ^= 1 << idx;
      yield 32 + idx;
    }
    while (lo !== 0) {
      const idx = 31 - Math.clz32(lo);
      lo ^= 1 << idx;
      yield idx;
    }
  }
}

// Backwards compatibility alias
export const SquareSet = SquareMask;
