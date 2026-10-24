import type { Rng } from './rng.ts';

/** a card is 0..51: rank = c % 13 + 1 (1 = ace … 13 = king), suit = c / 13 | 0 (♠ ♥ ♦ ♣) */
export type Card = number;

export const rank = (c: Card) => (c % 13) + 1;
export const suit = (c: Card) => (c / 13) | 0;
export const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS = ['♠', '♥', '♦', '♣'];
export const isRed = (c: Card) => suit(c) === 1 || suit(c) === 2;
export const cardName = (c: Card) => RANKS[rank(c)] + SUITS[suit(c)];

/** a draw from an endless shoe */
export const draw = (rng: Rng): Card => rng.int(52);

export function deck(rng: Rng): Card[] {
  const d = Array.from({ length: 52 }, (_, i) => i);
  for (let i = 51; i > 0; i--) {
    const j = rng.int(i + 1);
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}
