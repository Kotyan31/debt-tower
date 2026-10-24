import type { GameDef, GameId } from '../types.ts';
import { slots } from './slots.ts';
import { duck } from './duck.ts';
import { craps } from './craps.ts';
import { hilo } from './hilo.ts';
import { coin } from './coin.ts';
import { blackjack } from './blackjack.ts';
import { roulette } from './roulette.ts';
import { wheel } from './wheel.ts';
import { keno } from './keno.ts';
import { crash } from './crash.ts';
import { plinko } from './plinko.ts';
import { mines } from './mines.ts';
import { penguin } from './penguin.ts';
import { dragon } from './dragon.ts';
import { poker } from './poker.ts';
import { baccarat } from './baccarat.ts';
import { moneywheel } from './moneywheel.ts';

export const GAMES: Record<GameId, GameDef> = {
  slots, duck, craps, hilo, coin,
  blackjack, roulette, wheel, keno,
  crash, plinko, mines, penguin,
  dragon, poker, baccarat, moneywheel,
};

export const GAME_IDS = Object.keys(GAMES) as GameId[];
