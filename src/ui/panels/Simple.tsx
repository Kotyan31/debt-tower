/* One-shot games: one bet, one reveal. */
import { useState } from 'react';
import type { PanelProps } from '../GamePanel.tsx';
import { fill, mult, money } from '../../i18n/index.ts';
import { SLOT_THREE, SLOT_TWO_CHERRY, SLOT_ONE_CHERRY } from '../../core/games/slots.ts';
import { DUCK_COLORS } from '../../scene/tables/Duck.tsx';
import type { DuckPre } from '../../core/games/duck.ts';
import { WHEELS } from '../../core/games/wheel.ts';
import { PLINKO } from '../../core/games/plinko.ts';
import { KENO_N, KENO_PAY } from '../../core/games/keno.ts';
import { BAC_PAY, type BacS, type BacSide } from '../../core/games/baccarat.ts';
import { PlayingCard } from '../common.tsx';
import { sfx } from '../../audio/sfx.ts';
import { SlotDisplay, SlotSymbol } from '../SlotDisplay.tsx';

export function PlayButton({ p, label, onClick, disabled }: { p: PanelProps; label?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button className="btn primary big wide" disabled={disabled || p.busy || !!p.sess || p.bet > p.run.cash} onClick={onClick}>
      {label ?? p.t.bet.go} · {money(p.bet)}
    </button>
  );
}

export function Armed({ p, item }: { p: PanelProps; item: 'horseshoe' | 'rabbit' | 'sheet' | 'cloak' | 'boots' | 'dice' | 'insurance' }) {
  const n = p.run.armed[item];
  if (!n) return null;
  return <div className="small good">✓ {p.t.items[item][0]} — {p.t.hud.armed}{n > 1 ? ` (${n})` : ''}</div>;
}

export function CoinPanel(p: PanelProps) {
  const r = p.last && p.revealed ? (p.last.s as { r: number }).r : null;
  return (
    <div className="col">
      <div className="big-mult gold">×1.94</div>
      {r != null && <div className="muted" style={{ textAlign: 'center' }}>{r === 0 ? '🦅 ' + p.t.g.heads : '$ ' + p.t.g.tails}</div>}
      <div className="opts">
        <button className="btn primary big" disabled={p.busy || p.bet > p.run.cash} onClick={() => { p.start({ side: 0 }); sfx('coin'); }}>🦅 {p.t.g.heads}</button>
        <button className="btn primary big" disabled={p.busy || p.bet > p.run.cash} onClick={() => { p.start({ side: 1 }); sfx('coin'); }}>$ {p.t.g.tails}</button>
      </div>
    </div>
  );
}

export function SlotsPanel(p: PanelProps) {
  const s = p.last && p.revealed ? (p.last.s as { reels: number[]; mult: number }) : null;
  return (
    <div className="col">
      <SlotDisplay p={p} />
      <Armed p={p} item="horseshoe" />
      <details className="slot-payouts">
        <summary>{p.t.g.slotPaytable}<span className="gold">{mult(SLOT_THREE.at(-1)!)}</span></summary>
        <div className="paytable slot-paytable">
          {SLOT_THREE.map((m, i) => [<span key={'a' + i} className={'slot-pay-symbols' + (s && s.reels.every(r => r === i) ? ' on' : '')} aria-label={`${p.t.g.slotSymbols[i]} ×3`}><SlotSymbol symbol={i} /><SlotSymbol symbol={i} /><SlotSymbol symbol={i} /></span>, <span key={'b' + i}>{mult(m)}</span>]).reverse()}
          <span className="slot-pay-symbols" aria-label={`${p.t.g.slotSymbols[0]} ×2`}><SlotSymbol symbol={0} /><SlotSymbol symbol={0} /></span><span>{mult(SLOT_TWO_CHERRY)}</span>
          <span className="slot-pay-symbols" aria-label={p.t.g.slotSymbols[0]}><SlotSymbol symbol={0} /></span><span>{mult(SLOT_ONE_CHERRY)}</span>
        </div>
      </details>
    </div>
  );
}

export function DuckPanel(p: PanelProps) {
  const pre = p.run.pre.duck as DuckPre | undefined;
  const [pick, setPick] = useState(0);
  const [dope, setDope] = useState(false);
  const has = (p.run.inv.dope ?? 0) > 0;
  const res = p.last && p.revealed ? (p.last.s as { win: number; pick: number }) : null;
  return (
    <div className="col">
      <div className="ducks">
        {(p.last && !p.revealed ? (p.last.s as { odds: number[] }).odds : pre?.odds)?.map((o, i) => (
          <button key={i} className={'duck-row' + (pick === i ? ' sel' : '')} onClick={() => { setPick(i); sfx('quack'); }}>
            <span className="dot" style={{ background: DUCK_COLORS[i] }} />
            <span>{p.t.g.duckNames[i]} {res?.win === i ? '🏆' : ''}</span>
            <b className="num gold">{mult(o)}</b>
          </button>
        ))}
      </div>
      {has && <label className="row small"><input type="checkbox" checked={dope} onChange={e => setDope(e.target.checked)} /> 🧪 {p.t.g.dope} ({p.run.inv.dope})</label>}
      <PlayButton p={p} label="🦆" onClick={() => { p.start({ pick, dope: dope && has }); setDope(false); }} />
    </div>
  );
}

const WCOL = ['#ff4d6d', '#3fb6ff', '#ffcb52', '#7ee081', '#c77dff', '#ff9a3c'];
export function WheelPanel(p: PanelProps) {
  const [risk, setRisk] = useState(1);
  const res = p.last && p.revealed ? (p.last.s as { mult: number }) : null;
  return (
    <div className="col">
      <div className="opts">{p.t.g.risk.map((r, i) => <button key={i} className={'btn sm' + (risk === i ? ' sel' : '')} onClick={() => setRisk(i)}>{r}</button>)}</div>
      <div className="segs">{WHEELS[risk].map((m, i) => <i key={i} style={{ background: m ? WCOL[i % WCOL.length] : '#2a2a36' }} title={'×' + m} />)}</div>
      <div className="muted small">{[...new Set(WHEELS[risk])].sort((a, b) => a - b).map(m => mult(m)).join(' · ')}</div>
      {res && <div className="big-mult gold">{mult(res.mult)}</div>}
      <PlayButton p={p} label="🎡" onClick={() => p.start({ risk })} />
    </div>
  );
}

export function PlinkoPanel(p: PanelProps) {
  const [risk, setRisk] = useState(1);
  return (
    <div className="col">
      <div className="opts">{p.t.g.risk.map((r, i) => <button key={i} className={'btn sm' + (risk === i ? ' sel' : '')} onClick={() => setRisk(i)}>{r}</button>)}</div>
      <div className="row" style={{ gap: 2 }}>
        {PLINKO[risk].map((m, i) => <span key={i} className="grow small num" style={{ textAlign: 'center', padding: '4px 0', borderRadius: 4, background: m >= 10 ? '#ff2b4a' : m >= 3 ? '#ff9a3c' : m >= 1 ? '#ffcb52' : '#7ee081', color: '#111', fontSize: 10 }}>{m}</span>)}
      </div>
      <PlayButton p={p} label="🔻" onClick={() => p.start({ risk })} />
    </div>
  );
}

export function KenoPanel(p: PanelProps) {
  const [picks, setPicks] = useState<number[]>([3, 11, 19, 27]);
  const res = p.last && p.revealed ? (p.last.s as { picks: number[]; drawn: number[]; hits: number }) : null;
  const toggle = (n: number) => { setPicks(ps => ps.includes(n) ? ps.filter(x => x !== n) : ps.length >= 8 ? ps : [...ps, n]); sfx('tick'); };
  const random = () => { const all = Array.from({ length: KENO_N }, (_, i) => i + 1); const k = picks.length || 5; const out: number[] = []; while (out.length < k) { const v = all.splice(Math.floor(Math.random() * all.length), 1)[0]; out.push(v); } setPicks(out); };
  const pays = KENO_PAY[picks.length] || [];
  return (
    <div className="col">
      <div className="kgrid">
        {Array.from({ length: KENO_N }, (_, i) => {
          const n = i + 1, pick = picks.includes(n), drawn = res?.drawn.includes(n);
          return <button key={n} className={'kn' + (drawn && pick ? ' hit' : drawn ? ' drawn' : pick ? ' pick' : '')} onClick={() => toggle(n)}>{n}</button>;
        })}
      </div>
      <div className="row"><span className="muted small grow">{fill(p.t.g.picks, { n: picks.length })}{res ? ' · ' + fill(p.t.g.hits, { n: res.hits }) : ''}</span><button className="btn sm" onClick={random}>🎲 {p.t.g.random}</button></div>
      {picks.length > 0 && <div className="muted small">{pays.map((m, h) => (m ? `${h}→${mult(m)}` : null)).filter(Boolean).join(' · ')}</div>}
      <PlayButton p={p} label="🔢" disabled={!picks.length} onClick={() => p.start({ picks })} />
    </div>
  );
}

export function BaccaratPanel(p: PanelProps) {
  const [side, setSide] = useState<BacSide>('p');
  const s = p.last && p.revealed ? (p.last.s as BacS) : null;
  const sides: [BacSide, string, number][] = [['p', p.t.g.player, BAC_PAY.p], ['b', p.t.g.banker, BAC_PAY.b], ['t', p.t.g.tie, BAC_PAY.t]];
  return (
    <div className="col">
      <div className="opts">{sides.map(([k, name, m]) => <button key={k} className={'btn' + (side === k ? ' sel' : '')} onClick={() => setSide(k)}>{name} <span className="muted small">{mult(m)}</span></button>)}</div>
      {s && (
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="grow col" style={{ gap: 4 }}><div className="hand-label"><span>{p.t.g.player}</span><b>{s.pt}</b></div><div className="cards">{s.p.map((c, i) => <PlayingCard key={i} c={c} />)}</div></div>
          <div className="grow col" style={{ gap: 4 }}><div className="hand-label"><span>{p.t.g.banker}</span><b>{s.bt}</b></div><div className="cards">{s.b.map((c, i) => <PlayingCard key={i} c={c} />)}</div></div>
        </div>
      )}
      <PlayButton p={p} label={p.t.g.deal} onClick={() => p.start({ side })} />
    </div>
  );
}
