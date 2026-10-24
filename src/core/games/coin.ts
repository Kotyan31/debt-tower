import { type GameDef, int } from '../types.ts';

export const COIN_PAY = 1.94;

/** heads (0) or tails (1); the view shows the side that landed */
export const coin: GameDef<{ side: number; r: number }, { side: number }> = {
  id: 'coin',
  start(bet, o, rng) {
    const side = int(o?.side, 0, 1);
    const r = rng.int(2);
    return { s: { side, r }, done: true, pay: r === side ? Math.floor(bet * COIN_PAY) : 0, anim: 1300 };
  },
};
