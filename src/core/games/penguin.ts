import { type GameDef, type Step, fail, int, payOf } from '../types.ts';

/** The penguin crosses a road lane by lane. Each lane hides a chance of a truck; every crossed lane
   multiplies the stake by 0.97 / (1 − risk)^lanes. Turn back (cash out) any time. */
export const PENGUIN_LANES = 15;
export const PENGUIN_RISK = [0.06, 0.12, 0.2, 0.35];
export const PENGUIN_EDGE = 0.97;

export interface PenguinS { stake: number; diff: number; lane: number; mult: number; saved: number[]; hit?: boolean }

export function penguinMult(diff: number, lanes: number): number {
  let surv = 1;
  for (let i = 0; i < lanes; i++) surv *= 1 - PENGUIN_RISK[diff];
  return lanes ? PENGUIN_EDGE / surv : 1;
}

const cashOut = (s: PenguinS): Step<PenguinS> => ({ s, done: true, pay: payOf(s.stake, s.mult), anim: 700 });

export const penguin: GameDef<PenguinS, { diff: number }> = {
  id: 'penguin',
  start(bet, o) {
    const diff = int(o?.diff, 0, PENGUIN_RISK.length - 1);
    return { s: { stake: bet, diff, lane: 0, mult: 1, saved: [] }, anim: 300 };
  },
  act(s, a, _arg, rng, ctx) {
    if (a === 'cash') { if (!s.lane) fail('nothing'); return cashOut(s); }
    if (a !== 'go') fail('act');
    const truck = rng.next() < PENGUIN_RISK[s.diff];
    if (truck) {
      if (!ctx.armed('boots')) { s.hit = true; return { s, done: true, pay: 0, anim: 1200 }; }
      s.saved.push(s.lane + 1);   // ice boots: the penguin slides out from under the truck
    }
    s.lane++;
    s.mult = penguinMult(s.diff, s.lane);
    if (s.lane === PENGUIN_LANES) return cashOut(s);
    return { s, anim: truck ? 900 : 450 };
  },
  timeout(s) { return s.lane ? cashOut(s) : { s, done: true, pay: s.stake, anim: 0 }; },
};
