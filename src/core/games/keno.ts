import { type GameDef, fail, int, payOf } from '../types.ts';
import { shuffle } from '../rng.ts';

/** Pick 1–8 of 40 numbers; ten are drawn. KENO_PAY[picks][hits] is the stake multiplier. */
export const KENO_N = 40;
export const KENO_DRAW = 10;
export const KENO_PAY: number[][] = [
  [],
  [0, 3.8],
  [0, 1, 9.8],
  [0, 0.5, 2, 38],
  [0, 0, 1.5, 8, 135],
  [0, 0, 1, 4, 20, 450],
  [0, 0, 0.5, 2.5, 12, 60, 1200],
  [0, 0, 0.4, 1.8, 6.5, 25, 100, 2000],
  [0, 0, 0.5, 1.2, 4, 10, 40, 500, 10000],
];

export const keno: GameDef<{ picks: number[]; drawn: number[]; hits: number; mult: number }, { picks: number[] }> = {
  id: 'keno',
  start(bet, o, rng) {
    const picks = o?.picks;
    if (!Array.isArray(picks) || picks.length < 1 || picks.length > 8) fail('picks');
    picks.forEach(p => int(p, 1, KENO_N));
    if (new Set(picks).size !== picks.length) fail('dupes');
    const drawn = shuffle(Array.from({ length: KENO_N }, (_, i) => i + 1), rng).slice(0, KENO_DRAW);
    const hits = picks.filter(p => drawn.includes(p)).length;
    const mult = KENO_PAY[picks.length][hits];
    return { s: { picks: picks.slice(), drawn, hits, mult }, done: true, pay: payOf(bet, mult), anim: 3600 };
  },
};
