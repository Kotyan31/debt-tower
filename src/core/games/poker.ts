import { type GameDef, type Step, fail, int } from '../types.ts';
import { type Card, deck, rank, suit } from '../cards.ts';

/** Jacks or Better video poker, 8/5 table: deal five, hold any, draw once. */
export const POKER_HANDS = ['nothing', 'jacks', 'twopair', 'three', 'straight', 'flush', 'full', 'four', 'sflush', 'royal'] as const;
export const POKER_PAY = [0, 1, 2, 3, 4, 5, 8, 25, 50, 800];

export function pokerHand(cards: Card[]): number {
  const rs = cards.map(rank).sort((a, b) => a - b);
  const flush = cards.every(c => suit(c) === suit(cards[0]));
  const counts = new Map<number, number>();
  for (const r of rs) counts.set(r, (counts.get(r) || 0) + 1);
  const groups = [...counts.values()].sort((a, b) => b - a);
  const uniq = counts.size === 5;
  const wheel = uniq && rs[0] === 1 && rs[1] === 2 && rs[4] === 5;
  const broadway = uniq && rs[0] === 1 && rs[1] === 10;
  const straight = uniq && (rs[4] - rs[0] === 4 || wheel || broadway);
  if (straight && flush) return broadway ? 9 : 8;
  if (groups[0] === 4) return 7;
  if (groups[0] === 3 && groups[1] === 2) return 6;
  if (flush) return 5;
  if (straight) return 4;
  if (groups[0] === 3) return 3;
  if (groups[0] === 2 && groups[1] === 2) return 2;
  if (groups[0] === 2) { for (const [r, n] of counts) if (n === 2 && (r === 1 || r >= 11)) return 1; }
  return 0;
}

export interface PokerS { stake: number; deck: Card[]; hand: Card[]; held?: number; res?: number }

function drawCards(s: PokerS, mask: number): Step<PokerS> {
  let pos = 5;
  s.held = mask;
  s.hand = s.hand.map((c, i) => (mask & (1 << i) ? c : s.deck[pos++]));
  s.res = pokerHand(s.hand);
  s.deck = [];
  return { s, done: true, pay: s.stake * POKER_PAY[s.res], anim: 1100 };
}

export const poker: GameDef<PokerS> = {
  id: 'poker',
  start(bet, _o, rng) {
    const d = deck(rng);
    return { s: { stake: bet, deck: d.slice(0, 10), hand: d.slice(0, 5) }, anim: 900 };
  },
  act(s, a, arg) {
    if (a !== 'draw') fail('act');
    return drawCards(s, int(arg, 0, 31));
  },
  timeout(s) { return drawCards(s, 31); },
};

/** a simple hold hint: keep made hands and pairs, else four to a flush, else high cards */
export function pokerHint(hand: Card[]): number {
  if (pokerHand(hand) >= 4) return 31;
  const rs = hand.map(rank);
  const by = new Map<number, number[]>();
  rs.forEach((r, i) => by.set(r, [...(by.get(r) || []), i]));
  let mask = 0;
  for (const idx of by.values()) if (idx.length >= 2) idx.forEach(i => { mask |= 1 << i; });
  if (mask) return mask;
  const bySuit = new Map<number, number[]>();
  hand.forEach((c, i) => bySuit.set(suit(c), [...(bySuit.get(suit(c)) || []), i]));
  for (const idx of bySuit.values()) if (idx.length === 4) return idx.reduce((m, i) => m | (1 << i), 0);
  rs.forEach((r, i) => { if (r === 1 || r >= 11) mask |= 1 << i; });
  return mask;
}
