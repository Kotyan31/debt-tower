import { type GameDef, int, fail } from '../types.ts';
import { weighted } from '../rng.ts';

export const DUCKS = 5;
export const DUCK_EDGE = 0.95;

export interface DuckPre { w: number[]; odds: number[] }

/** this race's form: each duck's chance and the odds it pays */
export function duckForm(rng: { next(): number }): DuckPre {
  const w = Array.from({ length: DUCKS }, () => { const x = rng.next(); return 0.4 + x * x * 3; });
  let sum = 0;
  for (const x of w) sum += x;
  const odds = w.map(x => Math.max(1.1, Math.floor((DUCK_EDGE * sum / x) * 10) / 10));
  return { w, odds };
}

export const duck: GameDef<{ pick: number; win: number; odds: number[]; doped: boolean }, { pick: number; dope?: boolean }> = {
  id: 'duck',
  prep: rng => duckForm(rng),
  start(bet, o, rng, ctx) {
    const pre = ctx.pre as DuckPre;
    if (!pre) fail('pre');
    const pick = int(o?.pick, 0, DUCKS - 1);
    const doped = !!o?.dope;
    if (doped) ctx.take('dope');
    const w = pre.w.map((x, i) => (doped && i === pick ? x * 1.6 : x));   // a doped duck runs faster, its odds stay
    const win = weighted(w, rng);
    return { s: { pick, win, odds: pre.odds, doped }, done: true, pay: win === pick ? Math.floor(bet * pre.odds[pick]) : 0, anim: 7000 };
  },
};
