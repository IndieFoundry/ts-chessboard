/**
 * Immutable 64-bit set for representing chess squares using native BigInt.
 * Provides efficient bitboard operations for chess position manipulation.
 * @indiefoundry/chessboard - Original implementation using BigInt.
 */

import type { Color, Square } from './types';

// Constants for bit operations
const ZERO = 0n;
const ONE = 1n;
const FULL_MASK = (1n << 64n) - 1n;
const LO_MASK = 0xFFFFFFFFn;

/**
 * An immutable bitboard representing a set of squares.
 * Uses BigInt internally for 64-bit operations.
 */
export class SquareMask implements Iterable<Square> {
  readonly lo: number;
  readonly hi: number;
  private readonly bits: bigint;

  constructor(lo: number, hi: number) {
    this.lo = lo | 0;
    this.hi = hi | 0;
    // Convert two 32-bit signed integers to a 64-bit unsigned bigint
    this.bits = (BigInt(this.hi >>> 0) << 32n) | BigInt(this.lo >>> 0);
  }

  private static fromBigInt(bits: bigint): SquareMask {
    const masked = bits & FULL_MASK;
    const lo = Number(masked & LO_MASK) | 0;
    const hi = Number((masked >> 32n) & LO_MASK) | 0;
    return new SquareMask(lo, hi);
  }

  static fromSquare(square: Square): SquareMask {
    return SquareMask.fromBigInt(ONE << BigInt(square));
  }

  static fromRank(rank: number): SquareMask {
    return SquareMask.fromBigInt(0xFFn << BigInt(8 * rank));
  }

  static fromFile(file: number): SquareMask {
    return SquareMask.fromBigInt(0x0101010101010101n << BigInt(file));
  }

  static empty(): SquareMask {
    return new SquareMask(0, 0);
  }

  static full(): SquareMask {
    return new SquareMask(-1, -1);
  }

  static corners(): SquareMask {
    // a1, h1, a8, h8 = squares 0, 7, 56, 63
    return SquareMask.fromBigInt(0x8100000000000081n);
  }

  static center(): SquareMask {
    // d4, e4, d5, e5 = squares 27, 28, 35, 36
    return SquareMask.fromBigInt(0x0000001818000000n);
  }

  static backranks(): SquareMask {
    // Rank 1 and rank 8
    return SquareMask.fromBigInt(0xFF000000000000FFn);
  }

  static backrank(color: Color): SquareMask {
    return color === 'white'
      ? SquareMask.fromBigInt(0xFFn)
      : SquareMask.fromBigInt(0xFF00000000000000n);
  }

  static lightSquares(): SquareMask {
    return SquareMask.fromBigInt(0x55AA55AA55AA55AAn);
  }

  static darkSquares(): SquareMask {
    return SquareMask.fromBigInt(0xAA55AA55AA55AA55n);
  }

  complement(): SquareMask {
    return SquareMask.fromBigInt(~this.bits);
  }

  xor(other: SquareMask): SquareMask {
    return SquareMask.fromBigInt(this.bits ^ other.bits);
  }

  union(other: SquareMask): SquareMask {
    return SquareMask.fromBigInt(this.bits | other.bits);
  }

  intersect(other: SquareMask): SquareMask {
    return SquareMask.fromBigInt(this.bits & other.bits);
  }

  diff(other: SquareMask): SquareMask {
    return SquareMask.fromBigInt(this.bits & ~other.bits);
  }

  intersects(other: SquareMask): boolean {
    return (this.bits & other.bits) !== ZERO;
  }

  isDisjoint(other: SquareMask): boolean {
    return (this.bits & other.bits) === ZERO;
  }

  supersetOf(other: SquareMask): boolean {
    return (other.bits & ~this.bits) === ZERO;
  }

  subsetOf(other: SquareMask): boolean {
    return (this.bits & ~other.bits) === ZERO;
  }

  shr64(shift: number): SquareMask {
    if (shift >= 64) return SquareMask.empty();
    if (shift <= 0) return this;
    return SquareMask.fromBigInt(this.bits >> BigInt(shift));
  }

  shl64(shift: number): SquareMask {
    if (shift >= 64) return SquareMask.empty();
    if (shift <= 0) return this;
    return SquareMask.fromBigInt(this.bits << BigInt(shift));
  }

  bswap64(): SquareMask {
    // Reverse bytes in the 64-bit value
    let x = this.bits;
    x = ((x >> 8n) & 0x00FF00FF00FF00FFn) | ((x & 0x00FF00FF00FF00FFn) << 8n);
    x = ((x >> 16n) & 0x0000FFFF0000FFFFn) | ((x & 0x0000FFFF0000FFFFn) << 16n);
    x = (x >> 32n) | (x << 32n);
    return SquareMask.fromBigInt(x);
  }

  rbit64(): SquareMask {
    // Reverse all 64 bits
    let x = this.bits;
    x = ((x >> 1n) & 0x5555555555555555n) | ((x & 0x5555555555555555n) << 1n);
    x = ((x >> 2n) & 0x3333333333333333n) | ((x & 0x3333333333333333n) << 2n);
    x = ((x >> 4n) & 0x0F0F0F0F0F0F0F0Fn) | ((x & 0x0F0F0F0F0F0F0F0Fn) << 4n);
    x = ((x >> 8n) & 0x00FF00FF00FF00FFn) | ((x & 0x00FF00FF00FF00FFn) << 8n);
    x = ((x >> 16n) & 0x0000FFFF0000FFFFn) | ((x & 0x0000FFFF0000FFFFn) << 16n);
    x = (x >> 32n) | (x << 32n);
    return SquareMask.fromBigInt(x);
  }

  minus64(other: SquareMask): SquareMask {
    return SquareMask.fromBigInt(this.bits - other.bits);
  }

  equals(other: SquareMask): boolean {
    return this.bits === other.bits;
  }

  size(): number {
    // Population count using parallel bit counting
    let x = this.bits;
    x = x - ((x >> 1n) & 0x5555555555555555n);
    x = (x & 0x3333333333333333n) + ((x >> 2n) & 0x3333333333333333n);
    x = (x + (x >> 4n)) & 0x0F0F0F0F0F0F0F0Fn;
    // Mask to 64 bits before shift to handle BigInt overflow
    x = ((x * 0x0101010101010101n) & FULL_MASK) >> 56n;
    return Number(x);
  }

  isEmpty(): boolean {
    return this.bits === ZERO;
  }

  nonEmpty(): boolean {
    return this.bits !== ZERO;
  }

  has(square: Square): boolean {
    return (this.bits & (ONE << BigInt(square))) !== ZERO;
  }

  set(square: Square, on: boolean): SquareMask {
    return on ? this.with(square) : this.without(square);
  }

  with(square: Square): SquareMask {
    return SquareMask.fromBigInt(this.bits | (ONE << BigInt(square)));
  }

  without(square: Square): SquareMask {
    return SquareMask.fromBigInt(this.bits & ~(ONE << BigInt(square)));
  }

  toggle(square: Square): SquareMask {
    return SquareMask.fromBigInt(this.bits ^ (ONE << BigInt(square)));
  }

  last(): Square | undefined {
    if (this.bits === ZERO) return undefined;
    // Find position of highest set bit
    let n = 63;
    let x = this.bits;
    if ((x & 0xFFFFFFFF00000000n) === ZERO) { n -= 32; x <<= 32n; }
    if ((x & 0xFFFF000000000000n) === ZERO) { n -= 16; x <<= 16n; }
    if ((x & 0xFF00000000000000n) === ZERO) { n -= 8; x <<= 8n; }
    if ((x & 0xF000000000000000n) === ZERO) { n -= 4; x <<= 4n; }
    if ((x & 0xC000000000000000n) === ZERO) { n -= 2; x <<= 2n; }
    if ((x & 0x8000000000000000n) === ZERO) { n -= 1; }
    return n;
  }

  first(): Square | undefined {
    if (this.bits === ZERO) return undefined;
    // Find position of lowest set bit using trailing zeros count
    const isolated = this.bits & (-this.bits);
    let n = 0;
    if ((isolated & 0x00000000FFFFFFFFn) === ZERO) n += 32;
    if ((isolated & 0x0000FFFF0000FFFFn) === ZERO) n += 16;
    if ((isolated & 0x00FF00FF00FF00FFn) === ZERO) n += 8;
    if ((isolated & 0x0F0F0F0F0F0F0F0Fn) === ZERO) n += 4;
    if ((isolated & 0x3333333333333333n) === ZERO) n += 2;
    if ((isolated & 0x5555555555555555n) === ZERO) n += 1;
    return n;
  }

  withoutFirst(): SquareMask {
    return SquareMask.fromBigInt(this.bits & (this.bits - ONE));
  }

  moreThanOne(): boolean {
    return (this.bits & (this.bits - ONE)) !== ZERO;
  }

  singleSquare(): Square | undefined {
    return this.moreThanOne() ? undefined : this.last();
  }

  *[Symbol.iterator](): Iterator<Square> {
    let bits = this.bits;
    while (bits !== ZERO) {
      const isolated = bits & (-bits);
      // Count trailing zeros to find the square
      let n = 0;
      if ((isolated & 0x00000000FFFFFFFFn) === ZERO) n += 32;
      if ((isolated & 0x0000FFFF0000FFFFn) === ZERO) n += 16;
      if ((isolated & 0x00FF00FF00FF00FFn) === ZERO) n += 8;
      if ((isolated & 0x0F0F0F0F0F0F0F0Fn) === ZERO) n += 4;
      if ((isolated & 0x3333333333333333n) === ZERO) n += 2;
      if ((isolated & 0x5555555555555555n) === ZERO) n += 1;
      yield n;
      bits &= bits - ONE;
    }
  }

  *reversed(): Iterable<Square> {
    let bits = this.bits;
    while (bits !== ZERO) {
      // Find highest set bit
      let n = 63;
      let x = bits;
      if ((x & 0xFFFFFFFF00000000n) === ZERO) { n -= 32; x <<= 32n; }
      if ((x & 0xFFFF000000000000n) === ZERO) { n -= 16; x <<= 16n; }
      if ((x & 0xFF00000000000000n) === ZERO) { n -= 8; x <<= 8n; }
      if ((x & 0xF000000000000000n) === ZERO) { n -= 4; x <<= 4n; }
      if ((x & 0xC000000000000000n) === ZERO) { n -= 2; x <<= 2n; }
      if ((x & 0x8000000000000000n) === ZERO) { n -= 1; }
      yield n;
      bits &= ~(ONE << BigInt(n));
    }
  }
}

// Backwards compatibility alias
export const SquareSet = SquareMask;
