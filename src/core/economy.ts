import type { GameId } from './types.ts';

export const START = { cash: 800, debt: 50000, tickets: 3 };
export const DAY_MS = 5 * 60 * 1000;

/** A forgiving opening, followed by a 28% daily increase in $25 steps. */
export function quotaFor(day: number): number {
  let q = 300;
  for (let i = 1; i < day; i++) q *= 1.28;
  return Math.round(q / 25) * 25;
}

export interface Floor { unlock: number; rounds: number; day: number; min: number; max: number; pool: GameId[] }

/** Four floors of the tower. A floor opens once the run's best cash reaches its mark;
   each visit seats five tables drawn from its pool. */
export const FLOORS: Floor[] = [
  { unlock: 0, rounds: 0, day: 1, min: 10, max: 500, pool: ['slots', 'duck', 'craps', 'hilo', 'coin'] },
  { unlock: 1200, rounds: 4, day: 2, min: 20, max: 2500, pool: ['blackjack', 'roulette', 'wheel', 'keno', 'slots', 'coin', 'craps'] },
  { unlock: 3000, rounds: 12, day: 3, min: 25, max: 10000, pool: ['crash', 'plinko', 'mines', 'penguin', 'hilo', 'duck', 'wheel'] },
  { unlock: 8000, rounds: 24, day: 4, min: 50, max: 50000, pool: ['dragon', 'poker', 'baccarat', 'moneywheel', 'blackjack', 'roulette', 'crash'] },
];
export const TABLES_PER_FLOOR = 5;

/** Progress is earned by playing, reaching a bankroll milestone, or surviving days. */
export function floorUnlocked(floor: number, progress: { peak: number; rounds: number; day: number }) {
  const f = FLOORS[floor];
  return progress.peak >= f.unlock || progress.rounds >= f.rounds || progress.day >= f.day;
}

/** body parts the shark will take instead of cash (or the shop for tickets) */
export const ORGANS = ['kidney', 'eye', 'liver'] as const;
export const ORGAN_SHARE = 0.3;
export const ORGAN_TICKETS = 3;

export const QUOTA_TICKETS = 2;
/** one more ticket if the cash was at least double the quota */
export const RICH_TICKET = 1;
export const FREEDOM_TICKETS = 5;
export const CHALLENGE_TICKETS = 2;
