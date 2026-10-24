import { type GameDef, int, payOf } from '../types.ts';

/** 12 rows of pegs; the ball bounces left or right on each and lands in one of 13 slots. */
export const PLINKO_ROWS = 12;
export const PLINKO: number[][] = [
  [10, 3, 1.6, 1.4, 1.1, 1, 0.4, 1, 1.1, 1.4, 1.6, 3, 10],
  [33, 11, 4, 2, 1.1, 0.6, 0.2, 0.6, 1.1, 2, 4, 11, 33],
  [130, 23, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 23, 130],
];
/** a ball falls this long; another one can follow sooner */
export const PLINKO_FALL = 2600;

export const plinko: GameDef<{ risk: number; path: number[]; slot: number; mult: number }, { risk: number }> = {
  id: 'plinko',
  start(bet, o, rng) {
    const risk = int(o?.risk, 0, 2);
    const path = Array.from({ length: PLINKO_ROWS }, () => rng.int(2));
    const slot = path.reduce((a, b) => a + b, 0), mult = PLINKO[risk][slot];
    return { s: { risk, path, slot, mult }, done: true, pay: payOf(bet, mult), anim: 350 };
  },
};
