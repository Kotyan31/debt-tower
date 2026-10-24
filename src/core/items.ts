import type { GameId, ItemId } from './types.ts';

/** How an item works:
   timed   — switched on from the HUD, lasts a while (lucky coin)
   instant — used up at once (energy drink)
   armed   — switched on, waits for the moment it applies, with a number of charges
   action  — spent from a game's own panel (the lens in HiLo) */
export interface ItemDef { id: ItemId; cost: number; kind: 'timed' | 'instant' | 'armed' | 'action'; charges?: number; games?: GameId[] }

export const ITEMS: ItemDef[] = [
  { id: 'lucky', cost: 3, kind: 'timed' },
  { id: 'energy', cost: 2, kind: 'instant' },
  { id: 'insurance', cost: 2, kind: 'armed', charges: 1 },
  { id: 'lens', cost: 2, kind: 'action', games: ['hilo', 'blackjack'] },
  { id: 'detector', cost: 2, kind: 'action', games: ['mines'] },
  { id: 'cloak', cost: 3, kind: 'armed', charges: 1, games: ['dragon'] },
  { id: 'boots', cost: 3, kind: 'armed', charges: 1, games: ['penguin'] },
  { id: 'dope', cost: 2, kind: 'action', games: ['duck'] },
  { id: 'dice', cost: 2, kind: 'armed', charges: 1, games: ['craps'] },
  { id: 'crystal', cost: 2, kind: 'action', games: ['crash'] },
  { id: 'horseshoe', cost: 3, kind: 'armed', charges: 5, games: ['slots'] },
  { id: 'rabbit', cost: 2, kind: 'armed', charges: 10, games: ['roulette'] },
  { id: 'sheet', cost: 1, kind: 'armed', charges: 5, games: ['blackjack'] },
];

export const ITEM: Record<ItemId, ItemDef> = Object.fromEntries(ITEMS.map(i => [i.id, i])) as Record<ItemId, ItemDef>;

export const LUCKY_MS = 60000;
export const LUCKY_BONUS = 0.1;
export const ENERGY_MS = 30000;
