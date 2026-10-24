import { type GameDef, type Step, fail, int, payOf } from '../types.ts';
import { shuffle } from '../rng.ts';

/** 5×5 tiles with 1–24 mines. Each safe tile multiplies the stake; a mine takes it. */
export const MINES_TILES = 25;
export const MINES_EDGE = 0.97;

export interface MinesS { stake: number; n: number; mine: boolean[]; open: number[]; flags: number[]; mult: number; boom?: number }

export function minesMult(n: number, opened: number): number {
  let m = MINES_EDGE;
  for (let i = 0; i < opened; i++) m = m * (MINES_TILES - i) / (MINES_TILES - n - i);
  return m;
}

const cashOut = (s: MinesS): Step<MinesS> => ({ s, done: true, pay: payOf(s.stake, s.mult), anim: 700 });

export const mines: GameDef<MinesS, { mines: number }> = {
  id: 'mines',
  start(bet, o, rng) {
    const n = int(o?.mines, 1, 24);
    const order = shuffle(Array.from({ length: MINES_TILES }, (_, i) => i), rng);
    const mine = Array(MINES_TILES).fill(false);
    for (let i = 0; i < n; i++) mine[order[i]] = true;
    return { s: { stake: bet, n, mine, open: [], flags: [], mult: 1 }, anim: 300 };
  },
  act(s, a, arg, rng, ctx) {
    if (a === 'cash') { if (!s.open.length) fail('nothing'); return cashOut(s); }
    if (a === 'detect') {   // the mine detector marks one hidden mine
      const hidden = s.mine.map((m, i) => (m && !s.flags.includes(i) ? i : -1)).filter(i => i >= 0);
      if (!hidden.length) fail('none');
      ctx.take('detector');
      s.flags.push(hidden[rng.int(hidden.length)]);
      return { s, anim: 400 };
    }
    if (a !== 'pick') fail('act');
    const i = int(arg, 0, MINES_TILES - 1);
    if (s.open.includes(i) || s.flags.includes(i)) fail('open');
    if (s.mine[i]) { s.boom = i; return { s, done: true, pay: 0, anim: 1100 }; }
    s.open.push(i);
    s.mult = minesMult(s.n, s.open.length);
    if (s.open.length === MINES_TILES - s.n) return cashOut(s);
    return { s, anim: 250 };
  },
  timeout(s) { return s.open.length ? cashOut(s) : { s, done: true, pay: s.stake, anim: 0 }; },
};
