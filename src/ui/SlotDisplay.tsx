import type { CSSProperties } from 'react';
import type { PanelProps } from './GamePanel.tsx';
import { useFrameTick, useReducedMotion } from './common.tsx';
import { useRound } from '../scene/tables/common.tsx';
import { reelImageUrl } from '../scene/textures.ts';
import { REEL_SYMBOLS, reelFrame, reelStripPosition, type SlotSpin } from '../scene/slotReels.ts';
import { fill, money } from '../i18n/index.ts';

export function SlotSymbol({ symbol }: { symbol: number }) {
  return <span className="slot-symbol" style={{ backgroundImage: `url(${reelImageUrl()})`, backgroundPosition: `50% ${symbol / (REEL_SYMBOLS - 1) * 100}%` }} />;
}

export function SlotDisplay({ p }: { p: PanelProps }) {
  const { lastAt } = useRound('slots');
  const reduced = useReducedMotion();
  const spinning = !!p.last && !p.revealed;
  useFrameTick(spinning && !reduced);
  const spin = (p.last?.s ?? null) as SlotSpin | null;
  const duration = p.last?.anim ?? 1900;
  const elapsed = reduced ? duration : performance.now() - lastAt;
  const frames = [0, 1, 2].map(i => reelFrame(spin, elapsed, duration, i));
  const result = p.revealed && spin;
  const won = !!result && p.last!.pay > p.last!.stake;
  const triple = !!result && spin.reels.every(s => s === spin.reels[0]);
  const names = frames.map(f => p.t.g.slotSymbols[f.symbol]);
  const label = spinning ? p.t.g.slotSpinning : names.join(', ');
  return <div className={'slot-machine' + (won ? ' won' : '')}>
    <div className="slot-machine-top"><span aria-hidden="true">✦</span><span>{p.t.games.slots}</span><span aria-hidden="true">✦</span></div>
    <div className="slot-reels" role="img" aria-label={label}>
      {frames.map((frame, i) => {
        const win = result && (triple || spin.reels[i] === 0);
        return <div key={i} className={'slot-reel' + (!frame.stopped && !reduced ? ' spinning' : '') + (win ? ' hit' : '')}>
          <div className="slot-reel-strip" aria-hidden="true" style={{ '--reel-step': reelStripPosition(frame.position) } as CSSProperties}>
            {Array.from({ length: REEL_SYMBOLS * 3 }, (_, n) => <SlotSymbol key={n} symbol={n % REEL_SYMBOLS} />)}
          </div>
        </div>;
      })}
    </div>
    <div className="slot-machine-status" role="status">
      {spinning ? frames[0].respin ? p.t.g.slotRespin : p.t.g.slotSpinning : result
        ? <><span>{names.join(' · ')}</span><b className={won ? 'good' : 'muted'}>{fill(p.t.g.slotReturned, { x: money(p.last!.pay) })}</b></>
        : p.t.g.slotReady}
    </div>
  </div>;
}
