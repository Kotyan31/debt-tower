import { useEffect, useState } from 'react';
import { type Card, rank, suit, RANKS, SUITS, isRed } from '../core/cards.ts';
import type { GameId, ItemId } from '../core/index.ts';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

export const ITEM_ICON: Record<ItemId, string> = {
  lucky: '🪙', energy: '🥤', insurance: '📄', lens: '🔍', detector: '📡', cloak: '🧥', boots: '🥾',
  dope: '🧪', dice: '🎲', crystal: '🔮', horseshoe: '🧲', rabbit: '🐇', sheet: '📜',
};

export const GAME_ICON: Record<GameId, string> = {
  slots: '🎰', duck: '🦆', craps: '🎲', hilo: '🃏', coin: '🪙', blackjack: '♠️', roulette: '🔴', wheel: '🎡', keno: '🔢',
  crash: '🚀', plinko: '🔻', mines: '💣', penguin: '🐧', dragon: '🐉', poker: '🎴', baccarat: '💠', moneywheel: '💰',
};

export function PlayingCard({ c, back = false, big = false, held = false, dim = false, onClick }: { c: Card; back?: boolean; big?: boolean; held?: boolean; dim?: boolean; onClick?: () => void }) {
  if (back) return <div className={'pcard back' + (big ? ' big' : '')} />;
  return (
    <div className={`pcard${isRed(c) ? ' red' : ''}${big ? ' big' : ''}${held ? ' held' : ''}${dim ? ' dim' : ''}`} onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      <span>{RANKS[rank(c)]}</span>
      <span className="s">{SUITS[suit(c)]}</span>
    </div>
  );
}

/** re-renders every ms milliseconds */
export function useTick(ms = 250) {
  const [, set] = useState(0);
  useEffect(() => { const id = setInterval(() => set(x => x + 1), ms); return () => clearInterval(id); }, [ms]);
}

/** a frame-rate tick, for things that move (the crash multiplier) */
export function useFrameTick(on: boolean) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!on) return;
    let id = 0;
    const loop = () => { set(x => x + 1); id = requestAnimationFrame(loop); };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [on]);
}
