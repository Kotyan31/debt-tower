import { type GameDef, type Step, fail } from '../types.ts';
import { type Card, draw, rank } from '../cards.ts';
import type { Rng } from '../rng.ts';

/** Endless shoe, dealer stands on soft 17 and checks for blackjack, blackjack pays 3:2,
   double on the first two cards, no splits. */
export interface BjS { stake: number; p: Card[]; d: Card[]; doubled: boolean; peek: boolean; hint: boolean; res?: 'bj' | 'win' | 'push' | 'lose' | 'bust' | 'dbj' }

export function handValue(cards: Card[]): { v: number; soft: boolean } {
  let v = 0, aces = 0;
  for (const c of cards) { const r = rank(c); if (r === 1) { aces++; v += 11; } else v += Math.min(10, r); }
  while (v > 21 && aces) { v -= 10; aces--; }
  return { v, soft: aces > 0 };
}
const isBj = (h: Card[]) => h.length === 2 && handValue(h).v === 21;

function dealerPlays(s: BjS, rng: Rng): Step<BjS> {
  let drawn = 0;
  while (handValue(s.d).v < 17) { s.d.push(draw(rng)); drawn++; }
  const p = handValue(s.p).v, d = handValue(s.d).v, stake = s.stake * (s.doubled ? 2 : 1);
  s.res = d > 21 || p > d ? 'win' : p === d ? 'push' : 'lose';
  return { s, done: true, pay: s.res === 'win' ? stake * 2 : s.res === 'push' ? stake : 0, anim: 700 + drawn * 550 };
}

export const blackjack: GameDef<BjS> = {
  id: 'blackjack',
  start(bet, _o, rng, ctx) {
    const p1 = draw(rng), d1 = draw(rng), p2 = draw(rng), d2 = draw(rng);
    const s: BjS = { stake: bet, p: [p1, p2], d: [d1, d2], doubled: false, peek: false, hint: false };
    const pb = isBj(s.p), db = isBj(s.d);
    if (pb || db) {
      s.res = pb && db ? 'push' : pb ? 'bj' : 'dbj';
      return { s, done: true, pay: s.res === 'push' ? bet : s.res === 'bj' ? Math.floor(bet * 2.5) : 0, anim: 1600 };
    }
    s.hint = ctx.armed('sheet');   // the cheat sheet: one of its hands
    return { s, anim: 1400 };
  },
  act(s, a, _arg, rng, ctx) {
    if (a === 'peek') { if (s.peek) fail('peeked'); ctx.take('lens'); s.peek = true; return { s, anim: 300 }; }
    if (a === 'hit') {
      s.p.push(draw(rng));
      const v = handValue(s.p).v;
      if (v > 21) { s.res = 'bust'; return { s, done: true, pay: 0, anim: 800 }; }
      if (v === 21) { const st = dealerPlays(s, rng); st.anim += 450; return st; }
      return { s, anim: 450 };
    }
    if (a === 'stand') return dealerPlays(s, rng);
    if (a === 'double') {
      if (s.p.length !== 2) fail('double');
      s.doubled = true;
      s.p.push(draw(rng));
      if (handValue(s.p).v > 21) { s.res = 'bust'; return { s, done: true, pay: 0, extra: s.stake, anim: 900 }; }
      const st = dealerPlays(s, rng);
      return { ...st, extra: s.stake, anim: st.anim + 450 };
    }
    return fail('act');
  },
  timeout(s, _t, rng) { return dealerPlays(s, rng); },
};

/** basic strategy for the cheat sheet (endless shoe, S17, no split) */
export function bjHint(s: BjS): 'hit' | 'stand' | 'double' {
  const { v, soft } = handValue(s.p);
  const r0 = rank(s.d[0]), up = r0 === 1 ? 11 : Math.min(10, r0);
  const two = s.p.length === 2;
  if (soft) {
    if (v >= 19) return 'stand';
    if (v === 18) return up >= 9 ? 'hit' : two && up >= 3 && up <= 6 ? 'double' : 'stand';
    if (two && ((v >= 15 && up >= 4 && up <= 6) || (v >= 13 && up >= 5 && up <= 6) || (v === 17 && up === 3))) return 'double';
    return 'hit';
  }
  if (v >= 17) return 'stand';
  if (v >= 13) return up <= 6 ? 'stand' : 'hit';
  if (v === 12) return up >= 4 && up <= 6 ? 'stand' : 'hit';
  if (two && v === 11) return 'double';
  if (two && v === 10 && up <= 9) return 'double';
  if (two && v === 9 && up >= 3 && up <= 6) return 'double';
  return 'hit';
}
