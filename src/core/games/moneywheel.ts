import { type GameDef, fail, int } from '../types.ts';

/** The big money wheel: 60 segments marked 1, 3, 5, 10, 25 and 50. Bet on any of them; a hit pays k:1. */
export const MW_KINDS = [1, 3, 5, 10, 25, 50];
const COUNT: Record<number, number> = { 50: 1, 25: 2, 10: 5, 5: 9, 3: 14 };
const OFFSET: Record<number, number> = { 50: 0, 25: 15, 10: 6, 5: 3, 3: 2 };

/** segment layout: every kind spread around the rim, the rest are 1s */
export const MW_SEGMENTS: number[] = (() => {
  const out: number[] = Array(60).fill(1);
  for (const k of [50, 25, 10, 5, 3]) {
    for (let i = 0; i < COUNT[k]; i++) {
      let at = Math.floor((i * 60) / COUNT[k] + OFFSET[k]) % 60;
      while (out[at] !== 1) at = (at + 1) % 60;
      out[at] = k;
    }
  }
  return out;
})();

export type MwBet = [kind: number, amount: number];

function check(bet: number, bets: MwBet[]): MwBet[] {
  if (!Array.isArray(bets) || !bets.length || bets.length > MW_KINDS.length) fail('bets');
  let sum = 0;
  const seen = new Set<number>();
  for (const b of bets) {
    if (!Array.isArray(b) || !MW_KINDS.includes(b[0]) || seen.has(b[0])) fail('kind');
    seen.add(b[0]);
    sum += int(b[1], 1, 1e12, 'amount');
  }
  if (sum !== bet) fail('sum');
  return bets;
}

export const moneywheel: GameDef<{ i: number; k: number; bets: MwBet[] }, { bets: MwBet[] }> = {
  id: 'moneywheel',
  stake(bet, o) { check(bet, o?.bets); return bet; },
  start(bet, o, rng) {
    const bets = check(bet, o?.bets);
    const i = rng.int(MW_SEGMENTS.length), k = MW_SEGMENTS[i];
    let pay = 0;
    for (const [kind, amt] of bets) if (kind === k) pay += amt * (k + 1);
    return { s: { i, k, bets }, done: true, pay, anim: 5600 };
  },
};
