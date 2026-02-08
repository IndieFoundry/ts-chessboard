/**
 * Legal move generation and game state for standard chess.
 * Validates positions, generates legal moves, and detects checkmate/stalemate.
 * Original implementation for @indiefoundry/chessboard.
 */

import {
  squaresBetween,
  computeBishopMoves,
  computeKingMoves,
  computeKnightMoves,
  computePawnCaptures,
  getSquareRay,
  computeRookMoves,
} from './attacks';
import { BitBoard } from './board';
import type { GameSetup } from './setup';
import { SquareMask } from './squareSet';
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
import { isDefined, kingCastleTarget, flipColor, rookCastleTarget, getRank } from './util';

const COLORS: readonly Color[] = ['white', 'black'];
const CASTLING_SIDES: readonly CastlingSide[] = ['a', 'h'];

const computeAttackers = (square: Square, attacker: Color, board: BitBoard, occupied: SquareMask): SquareMask =>
  board[attacker].intersect(
    computeRookMoves(square, occupied)
      .intersect(board.rooksAndQueens())
      .union(computeBishopMoves(square, occupied).intersect(board.bishopsAndQueens()))
      .union(computeKnightMoves(square).intersect(board.knight))
      .union(computeKingMoves(square).intersect(board.king))
      .union(computePawnCaptures(flipColor(attacker), square).intersect(board.pawn)),
  );

export class CastleRights {
  castlingRights!: SquareMask;
  rook!: ByColor<ByCastlingSide<Square | undefined>>;
  path!: ByColor<ByCastlingSide<SquareMask>>;

  private constructor() {}

  static default(): CastleRights {
    const castles = new CastleRights();
    castles.castlingRights = SquareMask.corners();
    castles.rook = {
      white: { a: 0, h: 7 },
      black: { a: 56, h: 63 },
    };
    castles.path = {
      white: { a: new SquareMask(0xe, 0), h: new SquareMask(0x60, 0) },
      black: { a: new SquareMask(0, 0x0e000000), h: new SquareMask(0, 0x60000000) },
    };
    return castles;
  }

  static empty(): CastleRights {
    const castles = new CastleRights();
    castles.castlingRights = SquareMask.empty();
    castles.rook = {
      white: { a: undefined, h: undefined },
      black: { a: undefined, h: undefined },
    };
    castles.path = {
      white: { a: SquareMask.empty(), h: SquareMask.empty() },
      black: { a: SquareMask.empty(), h: SquareMask.empty() },
    };
    return castles;
  }

  clone(): CastleRights {
    const castles = new CastleRights();
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
    const kingTo = kingCastleTarget(color, side);
    const rookTo = rookCastleTarget(color, side);
    this.castlingRights = this.castlingRights.with(rook);
    this.rook[color][side] = rook;
    this.path[color][side] = squaresBetween(rook, rookTo)
      .with(rookTo)
      .union(squaresBetween(king, kingTo).with(kingTo))
      .without(king)
      .without(rook);
  }

  static fromSetup(setup: GameSetup): CastleRights {
    const castles = CastleRights.empty();
    const rooks = setup.castlingRights.intersect(setup.board.rook);
    for (const color of COLORS) {
      const backrank = SquareMask.backrank(color);
      const king = setup.board.kingOf(color);
      if (!isDefined(king) || !backrank.has(king)) continue;
      const side = rooks.intersect(setup.board[color]).intersect(backrank);
      const aSide = side.first();
      if (isDefined(aSide) && aSide < king) castles.add(color, 'a', king, aSide);
      const hSide = side.last();
      if (isDefined(hSide) && king < hSide) castles.add(color, 'h', king, hSide);
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
    this.castlingRights = this.castlingRights.diff(SquareMask.backrank(color));
    this.rook[color].a = undefined;
    this.rook[color].h = undefined;
  }
}

export interface MoveContext {
  king: Square | undefined;
  blockers: SquareMask;
  checkers: SquareMask;
}

/**
 * A legal chess position with move generation.
 */
export class ChessPosition {
  board!: BitBoard;
  turn!: Color;
  castles!: CastleRights;
  epSquare: Square | undefined;
  halfmoves!: number;
  fullmoves!: number;

  private constructor() {}

  static default(): ChessPosition {
    const pos = new ChessPosition();
    pos.board = BitBoard.default();
    pos.turn = 'white';
    pos.castles = CastleRights.default();
    pos.epSquare = undefined;
    pos.halfmoves = 0;
    pos.fullmoves = 1;
    return pos;
  }

  static fromSetup(setup: GameSetup): ChessPosition | undefined {
    const pos = new ChessPosition();
    pos.board = setup.board.clone();
    pos.turn = setup.turn;
    pos.castles = CastleRights.fromSetup(setup);
    pos.epSquare = validateEnPassant(pos, setup.epSquare);
    pos.halfmoves = setup.halfmoves;
    pos.fullmoves = setup.fullmoves;

    // Validate position
    if (pos.board.occupied.isEmpty()) return undefined;
    if (pos.board.king.size() !== 2) return undefined;
    if (!isDefined(pos.board.kingOf(pos.turn))) return undefined;

    const otherKing = pos.board.kingOf(flipColor(pos.turn));
    if (!isDefined(otherKing)) return undefined;
    if (pos.findKingAttackers(otherKing, pos.turn, pos.board.occupied).nonEmpty()) return undefined;

    if (SquareMask.backranks().intersects(pos.board.pawn)) return undefined;

    return pos;
  }

  clone(): ChessPosition {
    const pos = new ChessPosition();
    pos.board = this.board.clone();
    pos.turn = this.turn;
    pos.castles = this.castles.clone();
    pos.epSquare = this.epSquare;
    pos.halfmoves = this.halfmoves;
    pos.fullmoves = this.fullmoves;
    return pos;
  }

  toSetup(): GameSetup {
    return {
      board: this.board.clone(),
      turn: this.turn,
      castlingRights: this.castles.castlingRights,
      epSquare: this.epSquare,
      halfmoves: Math.min(this.halfmoves, 150),
      fullmoves: Math.min(Math.max(this.fullmoves, 1), 9999),
    };
  }

  findKingAttackers(square: Square, attacker: Color, occupied: SquareMask): SquareMask {
    return computeAttackers(square, attacker, this.board, occupied);
  }

  getMoveContext(): MoveContext {
    const king = this.board.kingOf(this.turn);
    if (!isDefined(king)) {
      return { king, blockers: SquareMask.empty(), checkers: SquareMask.empty() };
    }
    const snipers = computeRookMoves(king, SquareMask.empty())
      .intersect(this.board.rooksAndQueens())
      .union(computeBishopMoves(king, SquareMask.empty()).intersect(this.board.bishopsAndQueens()))
      .intersect(this.board[flipColor(this.turn)]);
    let blockers = SquareMask.empty();
    for (const sniper of snipers) {
      const b = squaresBetween(king, sniper).intersect(this.board.occupied);
      if (!b.moreThanOne()) blockers = blockers.union(b);
    }
    const checkers = this.findKingAttackers(king, flipColor(this.turn), this.board.occupied);
    return { king, blockers, checkers };
  }

  /** Get legal destination squares for a piece on `square`. */
  getLegalMoves(square: Square, ctx?: MoveContext): SquareMask {
    ctx = ctx || this.getMoveContext();
    const piece = this.board.get(square);
    if (!piece || piece.color !== this.turn) return SquareMask.empty();

    let pseudo: SquareMask;
    let legal: SquareMask | undefined;

    if (piece.role === 'pawn') {
      pseudo = computePawnCaptures(this.turn, square).intersect(this.board[flipColor(this.turn)]);
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
      if (isDefined(this.epSquare) && isEnPassantLegal(this, square, ctx)) {
        legal = SquareMask.fromSquare(this.epSquare);
      }
    } else if (piece.role === 'bishop') {
      pseudo = computeBishopMoves(square, this.board.occupied);
    } else if (piece.role === 'knight') {
      pseudo = computeKnightMoves(square);
    } else if (piece.role === 'rook') {
      pseudo = computeRookMoves(square, this.board.occupied);
    } else if (piece.role === 'queen') {
      pseudo = computeBishopMoves(square, this.board.occupied).union(computeRookMoves(square, this.board.occupied));
    } else {
      pseudo = computeKingMoves(square);
    }

    pseudo = pseudo.diff(this.board[this.turn]);

    if (isDefined(ctx.king)) {
      if (piece.role === 'king') {
        const occ = this.board.occupied.without(square);
        for (const to of pseudo) {
          if (this.findKingAttackers(to, flipColor(this.turn), occ).nonEmpty()) {
            pseudo = pseudo.without(to);
          }
        }
        return pseudo.union(getCastlingSquare(this, 'a', ctx)).union(getCastlingSquare(this, 'h', ctx));
      }

      if (ctx.checkers.nonEmpty()) {
        const checker = ctx.checkers.singleSquare();
        if (!isDefined(checker)) return SquareMask.empty();
        pseudo = pseudo.intersect(squaresBetween(checker, ctx.king).with(checker));
      }

      if (ctx.blockers.has(square)) {
        pseudo = pseudo.intersect(getSquareRay(square, ctx.king));
      }
    }

    if (legal) pseudo = pseudo.union(legal);
    return pseudo;
  }

  /** Get all legal destinations as a Map from square to destinations. */
  getAllLegalMoves(ctx?: MoveContext): Map<Square, SquareMask> {
    ctx = ctx || this.getMoveContext();
    const d = new Map<Square, SquareMask>();
    for (const square of this.board[this.turn]) {
      const sq = this.getLegalMoves(square, ctx);
      if (sq.nonEmpty()) d.set(square, sq);
    }
    return d;
  }

  /** Check if there are any legal moves. */
  hasLegalMoves(ctx?: MoveContext): boolean {
    ctx = ctx || this.getMoveContext();
    for (const square of this.board[this.turn]) {
      if (this.getLegalMoves(square, ctx).nonEmpty()) return true;
    }
    return false;
  }

  /** Check if the move is legal. */
  isLegal(move: Move, ctx?: MoveContext): boolean {
    if ('role' in move) return false; // No drops in standard chess
    if (move.promotion === 'pawn' || move.promotion === 'king') return false;
    if (!!move.promotion !== (this.board.pawn.has(move.from) && SquareMask.backranks().has(move.to))) return false;
    const dests = this.getLegalMoves(move.from, ctx);
    return dests.has(move.to) || dests.has(normalizeCastling(this, move).to);
  }

  /** Check if the side to move is in check. */
  isCheck(): boolean {
    const king = this.board.kingOf(this.turn);
    return isDefined(king) && this.findKingAttackers(king, flipColor(this.turn), this.board.occupied).nonEmpty();
  }

  /** Check if the game is over (checkmate, stalemate, or insufficient material). */
  isEnd(ctx?: MoveContext): boolean {
    return this.isInsufficientMaterial() || !this.hasLegalMoves(ctx);
  }

  /** Check if the side to move is checkmated. */
  isCheckmate(ctx?: MoveContext): boolean {
    ctx = ctx || this.getMoveContext();
    return ctx.checkers.nonEmpty() && !this.hasLegalMoves(ctx);
  }

  /** Check if the position is stalemate. */
  isStalemate(ctx?: MoveContext): boolean {
    ctx = ctx || this.getMoveContext();
    return ctx.checkers.isEmpty() && !this.hasLegalMoves(ctx);
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
        this.board[flipColor(color)].diff(this.board.king).diff(this.board.queen).isEmpty()
      );
    }
    if (this.board[color].intersects(this.board.bishop)) {
      const sameColor =
        !this.board.bishop.intersects(SquareMask.darkSquares()) ||
        !this.board.bishop.intersects(SquareMask.lightSquares());
      return sameColor && this.board.pawn.isEmpty() && this.board.knight.isEmpty();
    }
    return true;
  }

  /** Get the game outcome, if any. */
  getOutcome(ctx?: MoveContext): Outcome | undefined {
    ctx = ctx || this.getMoveContext();
    if (this.isCheckmate(ctx)) return { winner: flipColor(this.turn) };
    if (this.isInsufficientMaterial() || this.isStalemate(ctx)) return { winner: undefined };
    return;
  }

  /** Play a move, mutating the position. Returns the captured piece if any. */
  playMove(move: Move): Piece | undefined {
    const turn = this.turn;
    const epSquare = this.epSquare;
    const castling = getCastlingSide(this, move);

    this.epSquare = undefined;
    this.halfmoves += 1;
    if (turn === 'black') this.fullmoves += 1;
    this.turn = flipColor(turn);

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
        if (isDefined(rookFrom)) {
          const rook = this.board.take(rookFrom);
          this.board.set(kingCastleTarget(turn, castling), piece);
          if (rook) this.board.set(rookCastleTarget(turn, castling), rook);
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

  // Backwards compatibility aliases
  kingAttackers = this.findKingAttackers;
  ctx = this.getMoveContext;
  dests = this.getLegalMoves;
  allDests = this.getAllLegalMoves;
  hasDests = this.hasLegalMoves;
  outcome = this.getOutcome;
  play = this.playMove;
}

const validateEnPassant = (pos: ChessPosition, square: Square | undefined): Square | undefined => {
  if (!isDefined(square)) return;
  const epRank = pos.turn === 'white' ? 5 : 2;
  const forward = pos.turn === 'white' ? 8 : -8;
  if (getRank(square) !== epRank) return;
  if (pos.board.occupied.has(square + forward)) return;
  const pawn = square - forward;
  if (!pos.board.pawn.has(pawn) || !pos.board[flipColor(pos.turn)].has(pawn)) return;
  return square;
};

const isEnPassantLegal = (pos: ChessPosition, pawnFrom: Square, ctx: MoveContext): boolean => {
  if (!isDefined(pos.epSquare)) return false;
  if (!computePawnCaptures(pos.turn, pawnFrom).has(pos.epSquare)) return false;
  if (!isDefined(ctx.king)) return true;
  const delta = pos.turn === 'white' ? 8 : -8;
  const captured = pos.epSquare - delta;
  return pos
    .findKingAttackers(
      ctx.king,
      flipColor(pos.turn),
      pos.board.occupied.toggle(pawnFrom).toggle(captured).with(pos.epSquare),
    )
    .without(captured)
    .isEmpty();
};

const getCastlingSquare = (pos: ChessPosition, side: CastlingSide, ctx: MoveContext): SquareMask => {
  if (!isDefined(ctx.king) || ctx.checkers.nonEmpty()) return SquareMask.empty();
  const rook = pos.castles.rook[pos.turn][side];
  if (!isDefined(rook)) return SquareMask.empty();
  if (pos.castles.path[pos.turn][side].intersects(pos.board.occupied)) return SquareMask.empty();

  const kingTo = kingCastleTarget(pos.turn, side);
  const kingPath = squaresBetween(ctx.king, kingTo);
  const occ = pos.board.occupied.without(ctx.king);
  for (const sq of kingPath) {
    if (pos.findKingAttackers(sq, flipColor(pos.turn), occ).nonEmpty()) return SquareMask.empty();
  }

  const rookTo = rookCastleTarget(pos.turn, side);
  const after = pos.board.occupied.toggle(ctx.king).toggle(rook).toggle(rookTo);
  if (pos.findKingAttackers(kingTo, flipColor(pos.turn), after).nonEmpty()) return SquareMask.empty();

  return SquareMask.fromSquare(rook);
};

export const getCastlingSide = (pos: ChessPosition, move: Move): CastlingSide | undefined => {
  if ('role' in move) return;
  const delta = move.to - move.from;
  if (Math.abs(delta) !== 2 && !pos.board[pos.turn].has(move.to)) return;
  if (!pos.board.king.has(move.from)) return;
  return delta > 0 ? 'h' : 'a';
};

export const normalizeCastling = (pos: ChessPosition, move: Move): Move => {
  const side = getCastlingSide(pos, move);
  if (!side) return move;
  const rookFrom = pos.castles.rook[pos.turn][side];
  return {
    from: (move as NormalMove).from,
    to: isDefined(rookFrom) ? rookFrom : move.to,
  };
};

// Backwards compatibility aliases
export const Castles = CastleRights;
export const Chess = ChessPosition;
export type Context = MoveContext;
export const castlingSide = getCastlingSide;
export const normalizeMove = normalizeCastling;
