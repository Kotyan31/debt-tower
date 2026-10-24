import { type GameDef, type Step, fail, int, payOf } from '../types.ts';
import { shuffle } from '../rng.ts';

/** Climb the dragon's tower: each of 9 floors has tiles with eggs and dragons. Pick an egg to climb. */
export const DRAGON_LEVELS = 9;
export const DRAGON_EDGE = 0.97;
export const DRAGON_CAP = 10000;
/** tiles per floor, dragons among them */
export const DRAGON_DIFF: [number, number][] = [[4, 1], [3, 1], [2, 1], [3, 2], [4, 3]];

export interface DragonS { stake: number; diff: number; bad: boolean[][]; level: number; picks: number[]; mult: number; saved: number[]; fell?: number }

export function dragonMult(diff: number, levels: number): number {
  const [tiles, bad] = DRAGON_DIFF[diff];
  let m = DRAGON_EDGE;
  for (let i = 0; i < levels; i++) m = m * tiles / (tiles - bad);
  return Math.min(DRAGON_CAP, levels ? m : 1);
}

const cashOut = (s: DragonS): Step<DragonS> => ({ s, done: true, pay: payOf(s.stake, s.mult), anim: 800 });

export const dragon: GameDef<DragonS, { diff: number }> = {
  id: 'dragon',
  start(bet, o, rng) {
    const diff = int(o?.diff, 0, DRAGON_DIFF.length - 1);
    const [tiles, nbad] = DRAGON_DIFF[diff];
    const bad = Array.from({ length: DRAGON_LEVELS }, () => {
      const row: boolean[] = Array(tiles).fill(false);
      shuffle(Array.from({ length: tiles }, (_, i) => i), rng).slice(0, nbad).forEach(i => { row[i] = true; });
      return row;
    });
    return { s: { stake: bet, diff, bad, level: 0, picks: [], mult: 1, saved: [] }, anim: 300 };
  },
  act(s, a, arg, _rng, ctx) {
    if (a === 'cash') { if (!s.level) fail('nothing'); return cashOut(s); }
    if (a !== 'pick') fail('act');
    const col = int(arg, 0, DRAGON_DIFF[s.diff][0] - 1);
    s.picks.push(col);
    if (s.bad[s.level][col]) {
      if (!ctx.armed('cloak')) { s.fell = s.level; return { s, done: true, pay: 0, anim: 1200 }; }
      s.saved.push(s.level);   // the fireproof cloak: the dragon's breath does nothing, climb on
    }
    s.level++;
    s.mult = dragonMult(s.diff, s.level);
    if (s.level === DRAGON_LEVELS) return cashOut(s);
    return { s, anim: 400 };
  },
  timeout(s) { return s.level ? cashOut(s) : { s, done: true, pay: s.stake, anim: 0 }; },
};
