import { type GameDef, type Step, type Ctx, fail } from '../types.ts';
import type { Rng } from '../rng.ts';

/** Street craps, pass line: 7 or 11 on the come-out wins, 2 3 12 lose, anything else becomes the point;
   then roll until the point (win) or a 7 (lose). Pays 1:1. */
export interface CrapsS { point: number; rolls: [number, number][]; saved?: number }

const ANIM = 1500;

function roll(rng: Rng): [number, number] { return [1 + rng.int(6), 1 + rng.int(6)]; }

function outcome(s: CrapsS, d: [number, number]): 'win' | 'lose' | 'on' {
  const sum = d[0] + d[1];
  if (!s.point) return sum === 7 || sum === 11 ? 'win' : sum === 2 || sum === 3 || sum === 12 ? 'lose' : 'on';
  return sum === s.point ? 'win' : sum === 7 ? 'lose' : 'on';
}

function throwDice(s: CrapsS, rng: Rng, ctx: Ctx, stake: number): Step<CrapsS> {
  let d = roll(rng), r = outcome(s, d);
  if (r === 'lose' && ctx.armed('dice')) {   // loaded dice: a losing throw is thrown again
    s.rolls.push(d);
    s.saved = s.rolls.length;
    d = roll(rng);
    r = outcome(s, d);
  }
  s.rolls.push(d);
  if (r === 'on') { if (!s.point) s.point = d[0] + d[1]; return { s, anim: ANIM }; }
  return { s, done: true, pay: r === 'win' ? stake * 2 : 0, anim: ANIM };
}

export const craps: GameDef<CrapsS & { stake: number }> = {
  id: 'craps',
  start(bet, _o, rng, ctx) {
    const s = { point: 0, rolls: [], stake: bet };
    return throwDice(s, rng, ctx, bet) as Step<CrapsS & { stake: number }>;
  },
  act(s, a, _arg, rng, ctx) {
    if (a !== 'roll') fail('act');
    return throwDice(s, rng, ctx, s.stake) as Step<CrapsS & { stake: number }>;
  },
  timeout(s, _t, rng, ctx) {
    for (;;) {
      const st = throwDice(s, rng, ctx, s.stake);
      if (st.done) return st as Step<CrapsS & { stake: number }>;
    }
  },
};
