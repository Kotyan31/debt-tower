import { type GameDef, fail } from '../types.ts';
import { type Card, draw, rank } from '../cards.ts';

/** Punto banco from an endless shoe. Player pays 1:1, banker 0.95:1, tie 8:1 (player and banker bets push on a tie). */
export const BAC_PAY = { p: 2, b: 1.95, t: 9 };
export const bacValue = (c: Card) => (rank(c) >= 10 ? 0 : rank(c));
const total = (h: Card[]) => h.reduce((a, c) => a + bacValue(c), 0) % 10;

export type BacSide = 'p' | 'b' | 't';
export interface BacS { side: BacSide; p: Card[]; b: Card[]; pt: number; bt: number; win: BacSide }

export function bacDeal(next: () => Card): Omit<BacS, 'side'> {
  const p = [next(), next()], b = [next(), next()];
  let pt = total(p), bt = total(b);
  if (pt < 8 && bt < 8) {
    let p3 = -1;
    if (pt <= 5) { const c = next(); p.push(c); p3 = bacValue(c); pt = total(p); }
    const bankerDraws = p3 < 0 ? bt <= 5
      : bt <= 2 || (bt === 3 && p3 !== 8) || (bt === 4 && p3 >= 2 && p3 <= 7) || (bt === 5 && p3 >= 4 && p3 <= 7) || (bt === 6 && (p3 === 6 || p3 === 7));
    if (bankerDraws) { b.push(next()); bt = total(b); }
  }
  return { p, b, pt, bt, win: pt > bt ? 'p' : bt > pt ? 'b' : 't' };
}

export const baccarat: GameDef<BacS, { side: BacSide }> = {
  id: 'baccarat',
  start(bet, o, rng) {
    const side = o?.side;
    if (side !== 'p' && side !== 'b' && side !== 't') return fail('side');
    const r = bacDeal(() => draw(rng));
    const pay = r.win === side ? Math.floor(bet * BAC_PAY[side]) : r.win === 't' ? bet : 0;
    return { s: { side, ...r }, done: true, pay, anim: 2400 + (r.p.length + r.b.length - 4) * 700 };
  },
};
