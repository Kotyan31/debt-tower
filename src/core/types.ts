import type { Rng } from './rng.ts';

export type GameId =
  | 'slots' | 'duck' | 'craps' | 'hilo' | 'coin'
  | 'blackjack' | 'roulette' | 'wheel' | 'keno'
  | 'crash' | 'plinko' | 'mines' | 'penguin'
  | 'dragon' | 'poker' | 'baccarat' | 'moneywheel';

export type ItemId =
  | 'lucky' | 'energy' | 'insurance' | 'lens' | 'detector' | 'cloak' | 'boots'
  | 'dope' | 'dice' | 'crystal' | 'horseshoe' | 'rabbit' | 'sheet';

/** what a game may ask of the run while it plays */
export interface Ctx {
  t: number;
  /** spends one item from the inventory; throws if there is none */
  take(id: ItemId): void;
  /** true when an armed item applies now; uses up one of its charges */
  armed(id: ItemId): boolean;
  /** the table's public pre-round data, shown before the bet (duck odds) */
  pre: unknown;
}

export interface Step<S> {
  s: S;
  done?: boolean;
  /** gross amount returned to the player when the round is done (0 = lost) */
  pay?: number;
  /** more stake taken now (a blackjack double) */
  extra?: number;
  /** how long the reveal plays on screen, ms: the next action at any table must wait for it */
  anim: number;
}

export interface GameDef<S = any, O = any> {
  id: GameId;
  /** the stake for these options, or an error; the default is the bet itself */
  stake?(bet: number, o: O): number;
  start(bet: number, o: O, rng: Rng, ctx: Ctx): Step<S>;
  act?(s: S, a: string, arg: unknown, rng: Rng, ctx: Ctx): Step<S>;
  /** time-driven endings (the crash rocket), checked before every action */
  settle?(s: S, t: number): Step<S> | null;
  /** the day ran out while this round was open */
  timeout?(s: S, t: number, rng: Rng, ctx: Ctx): Step<S>;
  /** public data for the next round, drawn when the table appears and after each round */
  prep?(rng: Rng): unknown;
}

export class GameError extends Error {}
export const fail = (why: string): never => { throw new GameError(why); };
export const int = (x: unknown, lo: number, hi: number, why = 'arg'): number =>
  typeof x === 'number' && Number.isInteger(x) && x >= lo && x <= hi ? x : fail(why);
/** winnings are whole dollars, rounded down */
export const payOf = (stake: number, mult: number) => Math.floor(stake * mult + 1e-7);
