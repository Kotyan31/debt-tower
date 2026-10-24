import type { GameId } from './types.ts';

export const START = { cash: 500, debt: 50000, tickets: 3 };
export const DAY_MS = 5 * 60 * 1000;

/** the loan shark's cut for a day: $1,500 on day one, ×1.45 every day after, in steps of $50 */
export function quotaFor(day: number): number {
  let q = 1500;
  for (let i = 1; i < day; i++) q *= 1.45;
  return Math.round(q / 50) * 50;
}

export interface Floor { unlock: number; min: number; max: number; pool: GameId[] }

/** Four floors of the tower. A floor opens once the run's best cash reaches its mark;
   each visit seats five tables drawn from its pool. */
export const FLOORS: Floor[] = [
  { unlock: 0, min: 10, max: 500, pool: ['slots', 'duck', 'craps', 'hilo', 'coin'] },
  { unlock: 5000, min: 100, max: 5000, pool: ['blackjack', 'roulette', 'wheel', 'keno', 'slots', 'coin', 'craps'] },
  { unlock: 25000, min: 500, max: 25000, pool: ['crash', 'plinko', 'mines', 'penguin', 'hilo', 'duck', 'wheel'] },
  { unlock: 100000, min: 2500, max: 100000, pool: ['dragon', 'poker', 'baccarat', 'moneywheel', 'blackjack', 'roulette', 'crash'] },
];
export const TABLES_PER_FLOOR = 5;

/** body parts the shark will take instead of cash (or the shop for tickets) */
export const ORGANS = ['kidney', 'eye', 'liver'] as const;
export const ORGAN_SHARE = 0.3;
export const ORGAN_TICKETS = 3;

export const QUOTA_TICKETS = 2;
/** one more ticket if the cash was at least double the quota */
export const RICH_TICKET = 1;
export const FREEDOM_TICKETS = 5;
export const CHALLENGE_TICKETS = 2;
