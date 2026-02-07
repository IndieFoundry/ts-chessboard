/**
 * Chess - Legal move generation for standard chess
 * Adapted from chessops by Niklas Fiekas
 * https://github.com/niklasf/chessops
 * License: GPL-3.0
 */

import {
  between,
  bishopAttacks,
  kingAttacks,
  knightAttacks,
  pawnAttacks,
  ray,
  rookAttacks,
} from './attacks';
import { Board } from './board';
import type { Setup } from './setup';
import { SquareSet } from './squareSet';
import type {
  ByCastlingSide,
  ByColor,
  CastlingSide,
  Color,
  Move,
  NormalMove,
  Outcome,
  Piece,
  Square,
} from './types';
import { defined, kingCastlesTo, opposite, rookCastlesTo, squareRank } from './util';

const COLORS: readonly Color[] = ['white', 'black'];
const CASTLING_SIDES: readonly CastlingSide[] = ['a', 'h'];

const attacksTo = (square: Square, attacker: Color, board: Board, occupied: SquareSet): SquareSet =>
  board[attacker].intersect(
    rookAttacks(square, occupied)
      .intersect(board.rooksAndQueens())
      .union(bishopAttacks(square, occupied).intersect(board.bishopsAndQueens()))
      .union(knightAttacks(square).intersect(board.knight))
      .union(kingAttacks(square).intersect(board.king))
      .union(pawnAttacks(opposite(attacker), square).intersect(board.pawn)),
  );

export class Castles {
  castlingRights!: SquareSet;
  rook!: ByColor<ByCastlingSide<Square | undefined>>;
  path!: ByColor<ByCastlingSide<SquareSet>>;

  private constructor() {}

  static default(): Castles {
    const castles = new Castles();
    castles.castlingRights = SquareSet.corners();
    castles.rook = {
      white: { a: 0, h: 7 },
      black: { a: 56, h: 63 },
    };
    castles.path = {
      white: { a: new SquareSet(0xe, 0), h: new SquareSet(0x60, 0) },
      black: { a: new SquareSet(0, 0x0e000000), h: new SquareSet(0, 0x60000000) },
    };
    return castles;
  }

  static empty(): Castles {
    const castles = new Castles();
    castles.castlingRights = SquareSet.empty();
    castles.rook = {
      white: { a: undefined, h: undefined },
      black: { a: undefined, h: undefined },
    };
    castles.path = {
      white: { a: SquareSet.empty(), h: SquareSet.empty() },
      black: { a: SquareSet.empty(), h: SquareSet.empty() },
    };
    return castles;
  }

  clone(): Castles {
    const castles = new Castles();
    castles.castlingRights = this.castlingRights;
    castles.rook = {
      white: { a: this.rook.white.a, h: this.rook.white.h },
      black: { a: this.rook.black.a, h: this.rook.black.h },
    };
    castles.path = {
      white: { a: this.path.white.a, h: this.path.white.h },
      black: { a: this.path.black.a, h: this.path.black.h },
    };
    return castles;
  }

  private add(color: Color, side: CastlingSide, king: Square, rook: Square): void {
    const kingTo = kingCastlesTo(color, side);
    const rookTo = rookCastlesTo(color, side);
    this.castlingRights = this.castlingRights.with(rook);
    this.rook[color][side] = rook;
    this.path[color][side] = between(rook, rookTo)
      .with(rookTo)
      .union(between(king, kingTo).with(kingTo))
      .without(king)
      .without(rook);
  }

  static fromSetup(setup: Setup): Castles {
    const castles = Castles.empty();
    const rooks = setup.castlingRights.intersect(setup.board.rook);
    for (const color of COLORS) {
      const backrank = SquareSet.backrank(color);
      const king = setup.board.kingOf(color);
      if (!defined(king) || !backrank.has(king)) continue;
      const side = rooks.intersect(setup.board[color]).intersect(backrank);
      const aSide = side.first();
      if (defined(aSide) && aSide < king) castles.add(color, 'a', king, aSide);
      const hSide = side.last();
      if (defined(hSide) && king < hSide) castles.add(color, 'h', king, hSide);
    }
    return castles;
  }

  discardRook(square: Square): void {
    if (this.castlingRights.has(square)) {
      this.castlingRights = this.castlingRights.without(square);
      for (const color of COLORS) {
        for (const side of CASTLING_SIDES) {
          if (this.rook[color][side] === square) this.rook[color][side] = undefined;
        }
      }
    }
  }

  discardColor(color: Color): void {
    this.castlingRights = this.castlingRights.diff(SquareSet.backrank(color));
    this.rook[color].a = undefined;
    this.rook[color].h = undefined;
  }
}

export interface Context {
  king: Square | undefined;
  blockers: SquareSet;
  checkers: SquareSet;
}

/**
 * A legal chess position.
 */
export class Chess {
  board!: Board;
  turn!: Color;
  castles!: Castles;
  epSquare: Square | undefined;
  halfmoves!: number;
  fullmoves!: number;

  private constructor() {}

  static default(): Chess {
    const pos = new Chess();
    pos.board = Board.default();
    pos.turn = 'white';
    pos.castles = Castles.default();
    pos.epSquare = undefined;
    pos.halfmoves = 0;
    pos.fullmoves = 1;
    return pos;
  }

  static fromSetup(setup: Setup): Chess | undefined {
    const pos = new Chess();
    pos.board = setup.board.clone();
    pos.turn = setup.turn;
    pos.castles = Castles.fromSetup(setup);
    pos.epSquare = validEpSquare(pos, setup.epSquare);
    pos.halfmoves = setup.halfmoves;
    pos.fullmoves = setup.fullmoves;

    // Validate position
    if (pos.board.occupied.isEmpty()) return undefined;
    if (pos.board.king.size() !== 2) return undefined;
    if (!defined(pos.board.kingOf(pos.turn))) return undefined;

    const otherKing = pos.board.kingOf(opposite(pos.turn));
    if (!defined(otherKing)) return undefined;
    if (pos.kingAttackers(otherKing, pos.turn, pos.board.occupied).nonEmpty()) return undefined;

    if (SquareSet.backranks().intersects(pos.board.pawn)) return undefined;

    return pos;
  }

  clone(): Chess {
    const pos = new Chess();
    pos.board = this.board.clone();
    pos.turn = this.turn;
    pos.castles = this.castles.clone();
    pos.epSquare = this.epSquare;
    pos.halfmoves = this.halfmoves;
    pos.fullmoves = this.fullmoves;
    return pos;
  }

  toSetup(): Setup {
    return {
      board: this.board.clone(),
      turn: this.turn,
      castlingRights: this.castles.castlingRights,
      epSquare: this.epSquare,
      halfmoves: Math.min(this.halfmoves, 150),
      fullmoves: Math.min(Math.max(this.fullmoves, 1), 9999),
    };
  }

  kingAttackers(square: Square, attacker: Color, occupied: SquareSet): SquareSet {
    return attacksTo(square, attacker, this.board, occupied);
  }

  ctx(): Context {
    const king = this.board.kingOf(this.turn);
    if (!defined(king)) {
      return { king, blockers: SquareSet.empty(), checkers: SquareSet.empty() };
    }
    const snipers = rookAttacks(king, SquareSet.empty())
      .intersect(this.board.rooksAndQueens())
      .union(bishopAttacks(king, SquareSet.empty()).intersect(this.board.bishopsAndQueens()))
      .intersect(this.board[opposite(this.turn)]);
    let blockers = SquareSet.empty();
    for (const sniper of snipers) {
      const b = between(king, sniper).intersect(this.board.occupied);
      if (!b.moreThanOne()) blockers = blockers.union(b);
    }
    const checkers = this.kingAttackers(king, opposite(this.turn), this.board.occupied);
    return { king, blockers, checkers };
  }

  /** Get legal destination squares for a piece on `square`. */
  dests(square: Square, ctx?: Context): SquareSet {
    ctx = ctx || this.ctx();
    const piece = this.board.get(square);
    if (!piece || piece.color !== this.turn) return SquareSet.empty();

    let pseudo: SquareSet;
    let legal: SquareSet | undefined;

    if (piece.role === 'pawn') {
      pseudo = pawnAttacks(this.turn, square).intersect(this.board[opposite(this.turn)]);
      const delta = this.turn === 'white' ? 8 : -8;
      const step = square + delta;
      if (0 <= step && step < 64 && !this.board.occupied.has(step)) {
        pseudo = pseudo.with(step);
        const canDoubleStep = this.turn === 'white' ? square < 16 : square >= 64 - 16;
        const doubleStep = step + delta;
        if (canDoubleStep && !this.board.occupied.has(doubleStep)) {
          pseudo = pseudo.with(doubleStep);
        }
      }
      if (defined(this.epSquare) && canCaptureEp(this, square, ctx)) {
        legal = SquareSet.fromSquare(this.epSquare);
      }
    } else if (piece.role === 'bishop') {
      pseudo = bishopAttacks(square, this.board.occupied);
    } else if (piece.role === 'knight') {
      pseudo = knightAttacks(square);
    } else if (piece.role === 'rook') {
      pseudo = rookAttacks(square, this.board.occupied);
    } else if (piece.role === 'queen') {
      pseudo = bishopAttacks(square, this.board.occupied).union(rookAttacks(square, this.board.occupied));
    } else {
      pseudo = kingAttacks(square);
    }

    pseudo = pseudo.diff(this.board[this.turn]);

    if (defined(ctx.king)) {
      if (piece.role === 'king') {
        const occ = this.board.occupied.without(square);
        for (const to of pseudo) {
          if (this.kingAttackers(to, opposite(this.turn), occ).nonEmpty()) {
            pseudo = pseudo.without(to);
          }
        }
        return pseudo.union(castlingDest(this, 'a', ctx)).union(castlingDest(this, 'h', ctx));
      }

      if (ctx.checkers.nonEmpty()) {
        const checker = ctx.checkers.singleSquare();
        if (!defined(checker)) return SquareSet.empty();
        pseudo = pseudo.intersect(between(checker, ctx.king).with(checker));
      }

      if (ctx.blockers.has(square)) {
        pseudo = pseudo.intersect(ray(square, ctx.king));
      }
    }

    if (legal) pseudo = pseudo.union(legal);
    return pseudo;
  }

  /** Get all legal destinations as a Map from square to destinations. */
  allDests(ctx?: Context): Map<Square, SquareSet> {
    ctx = ctx || this.ctx();
    const d = new Map<Square, SquareSet>();
    for (const square of this.board[this.turn]) {
      const sq = this.dests(square, ctx);
      if (sq.nonEmpty()) d.set(square, sq);
    }
    return d;
  }

  /** Check if there are any legal moves. */
  hasDests(ctx?: Context): boolean {
    ctx = ctx || this.ctx();
    for (const square of this.board[this.turn]) {
      if (this.dests(square, ctx).nonEmpty()) return true;
    }
    return false;
  }

  /** Check if the move is legal. */
  isLegal(move: Move, ctx?: Context): boolean {
    if ('role' in move) return false; // No drops in standard chess
    if (move.promotion === 'pawn' || move.promotion === 'king') return false;
    if (!!move.promotion !== (this.board.pawn.has(move.from) && SquareSet.backranks().has(move.to))) return false;
    const dests = this.dests(move.from, ctx);
    return dests.has(move.to) || dests.has(normalizeMove(this, move).to);
  }

  /** Check if the side to move is in check. */
  isCheck(): boolean {
    const king = this.board.kingOf(this.turn);
    return defined(king) && this.kingAttackers(king, opposite(this.turn), this.board.occupied).nonEmpty();
  }

  /** Check if the game is over (checkmate, stalemate, or insufficient material). */
  isEnd(ctx?: Context): boolean {
    return this.isInsufficientMaterial() || !this.hasDests(ctx);
  }

  /** Check if the side to move is checkmated. */
  isCheckmate(ctx?: Context): boolean {
    ctx = ctx || this.ctx();
    return ctx.checkers.nonEmpty() && !this.hasDests(ctx);
  }

  /** Check if the position is stalemate. */
  isStalemate(ctx?: Context): boolean {
    ctx = ctx || this.ctx();
    return ctx.checkers.isEmpty() && !this.hasDests(ctx);
  }

  /** Check for insufficient mating material. */
  isInsufficientMaterial(): boolean {
    return COLORS.every(color => this.hasInsufficientMaterial(color));
  }

  hasInsufficientMaterial(color: Color): boolean {
    if (this.board[color].intersect(this.board.pawn.union(this.board.rooksAndQueens())).nonEmpty()) return false;
    if (this.board[color].intersects(this.board.knight)) {
      return (
        this.board[color].size() <= 2 &&
        this.board[opposite(color)].diff(this.board.king).diff(this.board.queen).isEmpty()
      );
    }
    if (this.board[color].intersects(this.board.bishop)) {
      const sameColor =
        !this.board.bishop.intersects(SquareSet.darkSquares()) ||
        !this.board.bishop.intersects(SquareSet.lightSquares());
      return sameColor && this.board.pawn.isEmpty() && this.board.knight.isEmpty();
    }
    return true;
  }

  /** Get the game outcome, if any. */
  outcome(ctx?: Context): Outcome | undefined {
    ctx = ctx || this.ctx();
    if (this.isCheckmate(ctx)) return { winner: opposite(this.turn) };
    if (this.isInsufficientMaterial() || this.isStalemate(ctx)) return { winner: undefined };
    return;
  }

  /** Play a move, mutating the position. Returns the captured piece if any. */
  play(move: Move): Piece | undefined {
    const turn = this.turn;
    const epSquare = this.epSquare;
    const castling = castlingSide(this, move);

    this.epSquare = undefined;
    this.halfmoves += 1;
    if (turn === 'black') this.fullmoves += 1;
    this.turn = opposite(turn);

    if ('role' in move) {
      // Drop move - not used in standard chess
      return undefined;
    }

    const piece = this.board.take(move.from);
    if (!piece) return undefined;

    let captured: Piece | undefined;
    let epCapture: Piece | undefined;

    if (piece.role === 'pawn') {
      this.halfmoves = 0;
      if (move.to === epSquare) {
        epCapture = this.board.take(move.to + (turn === 'white' ? -8 : 8));
      }
      const delta = move.from - move.to;
      if (Math.abs(delta) === 16 && 8 <= move.from && move.from <= 55) {
        this.epSquare = (move.from + move.to) >> 1;
      }
      if (move.promotion) {
        piece.role = move.promotion;
      }
    } else if (piece.role === 'rook') {
      this.castles.discardRook(move.from);
    } else if (piece.role === 'king') {
      if (castling) {
        const rookFrom = this.castles.rook[turn][castling];
        if (defined(rookFrom)) {
          const rook = this.board.take(rookFrom);
          this.board.set(kingCastlesTo(turn, castling), piece);
          if (rook) this.board.set(rookCastlesTo(turn, castling), rook);
        }
      }
      this.castles.discardColor(turn);
    }

    if (!castling) {
      captured = this.board.set(move.to, piece) || epCapture;
      if (captured) {
        this.halfmoves = 0;
        if (captured.role === 'rook') this.castles.discardRook(move.to);
      }
    }

    return captured;
  }
}

const validEpSquare = (pos: Chess, square: Square | undefined): Square | undefined => {
  if (!defined(square)) return;
  const epRank = pos.turn === 'white' ? 5 : 2;
  const forward = pos.turn === 'white' ? 8 : -8;
  if (squareRank(square) !== epRank) return;
  if (pos.board.occupied.has(square + forward)) return;
  const pawn = square - forward;
  if (!pos.board.pawn.has(pawn) || !pos.board[opposite(pos.turn)].has(pawn)) return;
  return square;
};

const canCaptureEp = (pos: Chess, pawnFrom: Square, ctx: Context): boolean => {
  if (!defined(pos.epSquare)) return false;
  if (!pawnAttacks(pos.turn, pawnFrom).has(pos.epSquare)) return false;
  if (!defined(ctx.king)) return true;
  const delta = pos.turn === 'white' ? 8 : -8;
  const captured = pos.epSquare - delta;
  return pos
    .kingAttackers(
      ctx.king,
      opposite(pos.turn),
      pos.board.occupied.toggle(pawnFrom).toggle(captured).with(pos.epSquare),
    )
    .without(captured)
    .isEmpty();
};

const castlingDest = (pos: Chess, side: CastlingSide, ctx: Context): SquareSet => {
  if (!defined(ctx.king) || ctx.checkers.nonEmpty()) return SquareSet.empty();
  const rook = pos.castles.rook[pos.turn][side];
  if (!defined(rook)) return SquareSet.empty();
  if (pos.castles.path[pos.turn][side].intersects(pos.board.occupied)) return SquareSet.empty();

  const kingTo = kingCastlesTo(pos.turn, side);
  const kingPath = between(ctx.king, kingTo);
  const occ = pos.board.occupied.without(ctx.king);
  for (const sq of kingPath) {
    if (pos.kingAttackers(sq, opposite(pos.turn), occ).nonEmpty()) return SquareSet.empty();
  }

  const rookTo = rookCastlesTo(pos.turn, side);
  const after = pos.board.occupied.toggle(ctx.king).toggle(rook).toggle(rookTo);
  if (pos.kingAttackers(kingTo, opposite(pos.turn), after).nonEmpty()) return SquareSet.empty();

  return SquareSet.fromSquare(rook);
};

export const castlingSide = (pos: Chess, move: Move): CastlingSide | undefined => {
  if ('role' in move) return;
  const delta = move.to - move.from;
  if (Math.abs(delta) !== 2 && !pos.board[pos.turn].has(move.to)) return;
  if (!pos.board.king.has(move.from)) return;
  return delta > 0 ? 'h' : 'a';
};

export const normalizeMove = (pos: Chess, move: Move): Move => {
  const side = castlingSide(pos, move);
  if (!side) return move;
  const rookFrom = pos.castles.rook[pos.turn][side];
  return {
    from: (move as NormalMove).from,
    to: defined(rookFrom) ? rookFrom : move.to,
  };
};
