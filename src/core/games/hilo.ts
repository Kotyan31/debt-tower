import { type GameDef, type Step, fail, payOf } from '../types.ts';
import { type Card, draw, rank } from '../cards.ts';

/** Guess whether the next card is higher-or-same or lower-or-same; every right guess multiplies the stake
   by 0.99 / chance. Cash out any time after the first right guess. */
export const HILO_EDGE = 0.99;
export const HILO_SKIPS = 3;
export const HILO_CAP = 1000;

export interface HiloS { stake: number; cur: Card; next: Card; mult: number; steps: number; skips: number; peek: boolean; hist: Card[]; lost?: boolean }

export const hiChance = (c: Card) => (14 - rank(c)) / 13;
export const loChance = (c: Card) => rank(c) / 13;

const cashOut = (s: HiloS): Step<HiloS> => ({ s, done: true, pay: payOf(s.stake, s.mult), anim: 600 });

export const hilo: GameDef<HiloS> = {
  id: 'hilo',
  start(bet, _o, rng) {
    return { s: { stake: bet, cur: draw(rng), next: draw(rng), mult: 1, steps: 0, skips: 0, peek: false, hist: [] }, anim: 500 };
  },
  act(s, a, _arg, rng, ctx) {
    if (a === 'cash') { if (!s.steps) fail('nothing'); return cashOut(s); }
    if (a === 'peek') { if (s.peek) fail('peeked'); ctx.take('lens'); s.peek = true; return { s, anim: 300 }; }
    if (a === 'skip') {
      if (s.skips >= HILO_SKIPS) fail('skips');
      s.skips++; s.hist.push(s.cur); s.cur = s.next; s.next = draw(rng); s.peek = false;
      return { s, anim: 450 };
    }
    if (a !== 'hi' && a !== 'lo') fail('act');
    const p = a === 'hi' ? hiChance(s.cur) : loChance(s.cur);
    const ok = a === 'hi' ? rank(s.next) >= rank(s.cur) : rank(s.next) <= rank(s.cur);
    s.hist.push(s.cur); s.cur = s.next; s.next = draw(rng); s.peek = false;
    if (!ok) { s.lost = true; return { s, done: true, pay: 0, anim: 700 }; }
    s.mult = Math.min(HILO_CAP, s.mult * (HILO_EDGE / p));
    s.steps++;
    return { s, anim: 500 };
  },
  timeout(s) { return s.steps ? cashOut(s) : { s, done: true, pay: s.stake, anim: 0 }; },
};
