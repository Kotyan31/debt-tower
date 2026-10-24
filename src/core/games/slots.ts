import { type GameDef, payOf } from '../types.ts';
import { weighted } from '../rng.ts';

/** 🍒 🍋 🍇 🔔 BAR 7 💎 */
export const SLOT_SYMBOLS = ['cherry', 'lemon', 'grape', 'bell', 'bar', 'seven', 'diamond'];
export const SLOT_WEIGHTS = [7, 6, 5, 4, 3, 2, 1];
/** three of a kind, by symbol */
export const SLOT_THREE = [6, 10, 15, 25, 50, 120, 400];
/** any two cherries (not three) */
export const SLOT_TWO_CHERRY = 2;
/** a single cherry */
export const SLOT_ONE_CHERRY = 0.5;

export function slotMult(r: number[]): number {
  if (r[0] === r[1] && r[1] === r[2]) return SLOT_THREE[r[0]];
  const ch = r.filter(x => x === 0).length;
  return ch === 2 ? SLOT_TWO_CHERRY : ch === 1 ? SLOT_ONE_CHERRY : 0;
}

export const slots: GameDef<{ reels: number[]; first?: number[]; mult: number }> = {
  id: 'slots',
  start(bet, _o, rng, ctx) {
    const spin = () => [0, 1, 2].map(() => weighted(SLOT_WEIGHTS, rng));
    let reels = spin(), first: number[] | undefined;
    const lucky = ctx.armed('horseshoe');   // a horseshoe re-spins a losing pull
    if (lucky && slotMult(reels) === 0) { first = reels; reels = spin(); }
    const mult = slotMult(reels);
    return { s: { reels, first, mult }, done: true, pay: payOf(bet, mult), anim: first ? 3000 : 1900 };
  },
};
