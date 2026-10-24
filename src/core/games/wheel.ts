import { type GameDef, int, payOf } from '../types.ts';

/** Wheel of fortune: 20 segments, the stake is multiplied by the one that stops under the pointer.
   Three wheels: calm, spicy, insane. */
export const WHEELS: number[][] = [
  [1.2, 1.2, 0, 1.2, 1.2, 1.3, 1.2, 0, 1.2, 1.2, 1.2, 1.2, 0, 1.2, 1.2, 1.2, 1.2, 0, 1.2, 1.2],
  [1.5, 0, 1.9, 0, 1.5, 0, 2, 0, 1.5, 0, 4, 0, 1.5, 0, 1.9, 0, 1.5, 0, 2, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 19.3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

export const wheel: GameDef<{ risk: number; i: number; mult: number }, { risk: number }> = {
  id: 'wheel',
  start(bet, o, rng) {
    const risk = int(o?.risk, 0, 2);
    const segs = WHEELS[risk], i = rng.int(segs.length), mult = segs[i];
    return { s: { risk, i, mult }, done: true, pay: payOf(bet, mult), anim: 4800 };
  },
};
