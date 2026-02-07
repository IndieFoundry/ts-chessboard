/**
 * Premove calculation for chess
 * Calculates valid premove destinations based on piece mobility
 */
import type { Key, Pieces, Color, Mobility, MobilityContext, PosAndKey } from './types';
import { key2pos, opposite, allPosAndKey } from './squares';
import { diff, knightDir, bishopDir, rookDir, kingDirNonCastling, pawnDirAdvance } from '../utils/math';

/** Pawn mobility for premoves */
const pawn: Mobility = (ctx: MobilityContext) =>
  diff(ctx.orig.pos[0], ctx.dest.pos[0]) <= 1 &&
  (diff(ctx.orig.pos[0], ctx.dest.pos[0]) === 1
    ? ctx.dest.pos[1] === ctx.orig.pos[1] + (ctx.color === 'white' ? 1 : -1)
    : pawnDirAdvance(...ctx.orig.pos, ...ctx.dest.pos, ctx.color === 'white'));

/** Knight mobility for premoves */
const knight: Mobility = (ctx: MobilityContext) => knightDir(...ctx.orig.pos, ...ctx.dest.pos);

/** Bishop mobility for premoves */
const bishop: Mobility = (ctx: MobilityContext) => bishopDir(...ctx.orig.pos, ...ctx.dest.pos);

/** Rook mobility for premoves */
const rook: Mobility = (ctx: MobilityContext) => rookDir(...ctx.orig.pos, ...ctx.dest.pos);

/** Queen mobility for premoves */
const queen: Mobility = (ctx: MobilityContext) => bishop(ctx) || rook(ctx);

/** King mobility for premoves (includes castling) */
const king: Mobility = (ctx: MobilityContext) =>
  kingDirNonCastling(...ctx.orig.pos, ...ctx.dest.pos) ||
  (ctx.orig.pos[1] === ctx.dest.pos[1] &&
    ctx.orig.pos[1] === (ctx.color === 'white' ? 0 : 7) &&
    ((ctx.orig.pos[0] === 4 &&
      ((ctx.dest.pos[0] === 2 && ctx.rookFilesFriendlies.includes(0)) ||
        (ctx.dest.pos[0] === 6 && ctx.rookFilesFriendlies.includes(7)))) ||
      ctx.rookFilesFriendlies.includes(ctx.dest.pos[0])));

/** Mobility functions by role */
const mobilityByRole = { pawn, knight, bishop, rook, queen, king };

/**
 * State interface needed for premove calculation
 */
export interface PremoveState {
  pieces: Pieces;
  turnColor: Color;
  lastMove?: Key[];
  premovable: {
    additionalPremoveRequirements: Mobility;
  };
}

/**
 * Calculates all valid premove destinations for a piece at the given key.
 * Returns an empty array if the piece doesn't exist or it's the piece's turn.
 */
export function calculatePremoves(state: PremoveState, key: Key): Key[] {
  const pieces = state.pieces;
  const piece = pieces.get(key);
  if (!piece || piece.color === state.turnColor) return [];

  const color = piece.color;
  const friendlies = new Map([...pieces].filter(([_, p]) => p.color === color));
  const enemies = new Map([...pieces].filter(([_, p]) => p.color === opposite(color)));
  const orig: PosAndKey = { key, pos: key2pos(key) };

  const mobility: Mobility = (ctx: MobilityContext) =>
    mobilityByRole[piece.role](ctx) && state.premovable.additionalPremoveRequirements(ctx);

  const partialCtx = {
    orig,
    role: piece.role,
    allPieces: pieces,
    friendlies: friendlies,
    enemies: enemies,
    color: color,
    rookFilesFriendlies: Array.from(pieces)
      .filter(
        ([k, p]) => k[1] === (color === 'white' ? '1' : '8') && p.color === color && p.role === 'rook',
      )
      .map(([k]) => key2pos(k)[0]),
    lastMove: state.lastMove,
  };

  return allPosAndKey.filter(dest => mobility({ ...partialCtx, dest })).map(pk => pk.key);
}
