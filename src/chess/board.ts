/**
 * Board representation storing piece positions using bitboards.
 * Each piece type and color has its own SquareMask for efficient operations.
 * Original implementation for @indiefoundry/chessboard.
 */

import { SquareMask } from './squareSet';
import type { ByColor, ByRole, Color, Piece, Role, Square } from './types';

const COLORS_ARRAY: readonly Color[] = ['white', 'black'];
const ROLES_ARRAY: readonly Role[] = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];

/**
 * Bitboard-based piece positions on a chessboard.
 */
export class BitBoard implements Iterable<[Square, Piece]>, ByRole<SquareMask>, ByColor<SquareMask> {
  /** All occupied squares. */
  occupied!: SquareMask;
  /** Promoted pieces (for variants like Crazyhouse). */
  promoted!: SquareMask;

  white!: SquareMask;
  black!: SquareMask;

  pawn!: SquareMask;
  knight!: SquareMask;
  bishop!: SquareMask;
  rook!: SquareMask;
  queen!: SquareMask;
  king!: SquareMask;

  private constructor() {}

  static default(): BitBoard {
    const board = new BitBoard();
    board.reset();
    return board;
  }

  /** Resets all pieces to the default starting position for standard chess. */
  reset(): void {
    this.occupied = new SquareMask(0xffff, 0xffff_0000);
    this.promoted = SquareMask.empty();
    this.white = new SquareMask(0xffff, 0);
    this.black = new SquareMask(0, 0xffff_0000);
    this.pawn = new SquareMask(0xff00, 0x00ff_0000);
    this.knight = new SquareMask(0x42, 0x4200_0000);
    this.bishop = new SquareMask(0x24, 0x2400_0000);
    this.rook = new SquareMask(0x81, 0x8100_0000);
    this.queen = new SquareMask(0x8, 0x0800_0000);
    this.king = new SquareMask(0x10, 0x1000_0000);
  }

  static empty(): BitBoard {
    const board = new BitBoard();
    board.clear();
    return board;
  }

  clear(): void {
    this.occupied = SquareMask.empty();
    this.promoted = SquareMask.empty();
    for (const color of COLORS_ARRAY) this[color] = SquareMask.empty();
    for (const role of ROLES_ARRAY) this[role] = SquareMask.empty();
  }

  clone(): BitBoard {
    const board = new BitBoard();
    board.occupied = this.occupied;
    board.promoted = this.promoted;
    for (const color of COLORS_ARRAY) board[color] = this[color];
    for (const role of ROLES_ARRAY) board[role] = this[role];
    return board;
  }

  getColor(square: Square): Color | undefined {
    if (this.white.has(square)) return 'white';
    if (this.black.has(square)) return 'black';
    return;
  }

  getRole(square: Square): Role | undefined {
    for (const role of ROLES_ARRAY) {
      if (this[role].has(square)) return role;
    }
    return;
  }

  get(square: Square): Piece | undefined {
    const color = this.getColor(square);
    if (!color) return;
    const role = this.getRole(square)!;
    const promoted = this.promoted.has(square);
    return { color, role, promoted };
  }

  /** Removes and returns the piece from the given `square`, if any. */
  take(square: Square): Piece | undefined {
    const piece = this.get(square);
    if (piece) {
      this.occupied = this.occupied.without(square);
      this[piece.color] = this[piece.color].without(square);
      this[piece.role] = this[piece.role].without(square);
      if (piece.promoted) this.promoted = this.promoted.without(square);
    }
    return piece;
  }

  /** Put `piece` onto `square`, potentially replacing an existing piece. */
  set(square: Square, piece: Piece): Piece | undefined {
    const old = this.take(square);
    this.occupied = this.occupied.with(square);
    this[piece.color] = this[piece.color].with(square);
    this[piece.role] = this[piece.role].with(square);
    if (piece.promoted) this.promoted = this.promoted.with(square);
    return old;
  }

  has(square: Square): boolean {
    return this.occupied.has(square);
  }

  *[Symbol.iterator](): Iterator<[Square, Piece]> {
    for (const square of this.occupied) {
      yield [square, this.get(square)!];
    }
  }

  pieces(color: Color, role: Role): SquareMask {
    return this[color].intersect(this[role]);
  }

  rooksAndQueens(): SquareMask {
    return this.rook.union(this.queen);
  }

  bishopsAndQueens(): SquareMask {
    return this.bishop.union(this.queen);
  }

  /** Finds the unique king of the given `color`, if any. */
  kingOf(color: Color): Square | undefined {
    return this.pieces(color, 'king').singleSquare();
  }
}

// Backwards compatibility alias
export const Board = BitBoard;
