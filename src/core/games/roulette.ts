import { type GameDef, fail, int } from '../types.ts';

/** European single-zero roulette. One bet per board position: [kind, value, amount]. */
export const ROULETTE_MAX_BETS = 49;
export type RouletteBet = [kind: 'n' | 'red' | 'black' | 'odd' | 'even' | 'low' | 'high' | 'dz' | 'col', value: number, amount: number];

export const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
/** the pockets in wheel order */
export const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

export function betWins(b: RouletteBet, r: number): number {
  const [k, v, amt] = b;
  if (k === 'n') return r === v ? amt * 36 : 0;
  if (r === 0) return 0;
  switch (k) {
    case 'red': return RED.has(r) ? amt * 2 : 0;
    case 'black': return !RED.has(r) ? amt * 2 : 0;
    case 'odd': return r % 2 === 1 ? amt * 2 : 0;
    case 'even': return r % 2 === 0 ? amt * 2 : 0;
    case 'low': return r <= 18 ? amt * 2 : 0;
    case 'high': return r >= 19 ? amt * 2 : 0;
    case 'dz': return ((r - 1) / 12 | 0) === v ? amt * 3 : 0;
    case 'col': return (r - 1) % 3 === v ? amt * 3 : 0;
  }
  return 0;
}

function check(bet: number, bets: RouletteBet[]): RouletteBet[] {
  if (!Array.isArray(bets) || !bets.length || bets.length > ROULETTE_MAX_BETS) fail('bets');
  let sum = 0;
  for (const b of bets) {
    if (!Array.isArray(b) || b.length !== 3) fail('bet');
    const [k, v, amt] = b;
    int(amt, 1, 1e12, 'amount');
    if (k === 'n') int(v, 0, 36);
    else if (k === 'dz' || k === 'col') int(v, 0, 2);
    else if (!['red', 'black', 'odd', 'even', 'low', 'high'].includes(k)) fail('kind');
    sum += amt;
  }
  if (sum !== bet) fail('sum');
  return bets;
}

export const roulette: GameDef<{ r: number; bets: RouletteBet[]; saved: boolean }, { bets: RouletteBet[] }> = {
  id: 'roulette',
  stake(bet, o) { check(bet, o?.bets); return bet; },
  start(bet, o, rng, ctx) {
    const bets = check(bet, o?.bets);
    const r = rng.int(37);
    let pay = 0;
    for (const b of bets) pay += betWins(b, r);
    const rabbit = ctx.armed('rabbit');   // a rabbit's foot: on zero the whole stake comes back
    const saved = rabbit && r === 0 && pay < bet;
    if (saved) pay = bet;
    return { s: { r, bets, saved }, done: true, pay, anim: 6000 };
  },
};
