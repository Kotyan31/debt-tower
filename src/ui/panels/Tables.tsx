/* Blackjack, video poker, roulette and the money wheel. */
import { useState } from 'react';
import type { PanelProps } from '../GamePanel.tsx';
import { PlayButton, Armed } from './Simple.tsx';
import { PlayingCard } from '../common.tsx';
import { fill, mult, money } from '../../i18n/index.ts';
import { FLOORS } from '../../core/index.ts';
import { type BjS, handValue, bjHint } from '../../core/games/blackjack.ts';
import { type PokerS, POKER_PAY, POKER_HANDS, pokerHint } from '../../core/games/poker.ts';
import { type RouletteBet, RED, betWins } from '../../core/games/roulette.ts';
import { MW_KINDS, type MwBet } from '../../core/games/moneywheel.ts';
import { sfx } from '../../audio/sfx.ts';

export function BlackjackPanel(p: PanelProps) {
  const s = (p.sess?.s ?? (p.last && p.revealed ? p.last.s : null)) as BjS | null;
  const live = !!p.sess;
  const lens = (p.run.inv.lens ?? 0) > 0;
  const hint = live && s?.hint ? bjHint(s) : null;
  const hideHole = live && !s?.peek;
  const dv = s ? (hideHole ? handValue([s.d[0]]).v : handValue(s.d).v) : 0;
  return (
    <div className="col">
      {s && (
        <>
          <div className="hand-label"><span>{p.t.g.dealer}</span><b>{dv}</b></div>
          <div className="cards">{s.d.map((c, i) => <PlayingCard key={i} c={c} back={i === 1 && hideHole} />)}</div>
          <div className="hand-label"><span>{p.t.g.you}</span><b>{handValue(s.p).v}</b></div>
          <div className="cards">{s.p.map((c, i) => <PlayingCard key={i} c={c} />)}</div>
          {!live && s.res && <div className="gold" style={{ textAlign: 'center', fontFamily: 'var(--head)' }}>{p.t.g.bj[s.res]}</div>}
        </>
      )}
      {hint && <div className="small good">📜 {fill(p.t.g.hint, { m: p.t.g[hint === 'double' ? 'dbl' : hint] })}</div>}
      <Armed p={p} item="sheet" />
      {live && s ? (
        <>
          <div className="opts">
            <button className="btn primary" disabled={p.busy} onClick={() => { p.act('hit'); sfx('card'); }}>{p.t.g.hit}</button>
            <button className="btn primary" disabled={p.busy} onClick={() => { p.act('stand'); sfx('card'); }}>{p.t.g.stand}</button>
            <button className="btn" disabled={p.busy || s.p.length !== 2 || p.run.cash < s.stake} onClick={() => { p.act('double'); sfx('chip'); }}>{p.t.g.dbl}</button>
          </div>
          {lens && !s.peek && <button className="btn sm" disabled={p.busy} onClick={() => p.act('peek')}>🔍 {p.t.g.peek} ({p.run.inv.lens})</button>}
        </>
      ) : <PlayButton p={p} label={p.t.g.deal} onClick={() => { p.start(); sfx('card'); }} />}
    </div>
  );
}

export function PokerPanel(p: PanelProps) {
  const s = (p.sess?.s ?? (p.last && p.revealed ? p.last.s : null)) as PokerS | null;
  const live = !!p.sess;
  const [held, setHeld] = useState(0);
  const toggle = (i: number) => { if (live) { setHeld(h => h ^ (1 << i)); sfx('tick'); } };
  return (
    <div className="col">
      <div className="cards" style={{ justifyContent: 'center' }}>
        {(s?.hand ?? []).map((c, i) => <PlayingCard key={i + ':' + c} c={c} held={live ? !!(held & (1 << i)) : !!s && s.held != null && !!(s.held & (1 << i))} onClick={() => toggle(i)} />)}
      </div>
      {live && <div className="muted small" style={{ textAlign: 'center' }}>{p.t.g.held}: {[0, 1, 2, 3, 4].filter(i => held & (1 << i)).length} · <button className="link" onClick={() => setHeld(pokerHint(s!.hand))}>💡</button></div>}
      {!live && s?.res != null && <div className="gold" style={{ textAlign: 'center', fontFamily: 'var(--head)' }}>{p.t.g.hands[POKER_HANDS[s.res]]}</div>}
      <div className="paytable">
        {POKER_PAY.map((m, i) => (m ? [<span key={'a' + i} className={!live && s?.res === i ? 'on' : ''}>{p.t.g.hands[POKER_HANDS[i]]}</span>, <span key={'b' + i} className="num">{mult(m)}</span>] : null)).reverse()}
      </div>
      {live
        ? <button className="btn primary big wide" disabled={p.busy} onClick={() => { p.act('draw', held); setHeld(0); sfx('card'); }}>{p.t.g.draw}</button>
        : <PlayButton p={p} label={p.t.g.deal} onClick={() => { setHeld(0); p.start(); sfx('card'); }} />}
    </div>
  );
}

/** chips placed on a board: one chip = the bet in the bet bar */
function useChips<K extends string | number>() {
  const [chips, setChips] = useState<Map<K, number>>(new Map());
  const add = (k: K, amt: number) => { setChips(m => { const n = new Map(m); n.set(k, (n.get(k) || 0) + amt); return n; }); sfx('chip'); };
  const total = [...chips.values()].reduce((a, b) => a + b, 0);
  return { chips, add, clear: () => setChips(new Map()), total };
}

function ChipBar({ p, total, onClear, onGo, label, chip, setChip }: { p: PanelProps; total: number; onClear(): void; onGo(): void; label: string; chip: number; setChip(n: number): void }) {
  const fl = FLOORS[p.run.floor];
  const sizes = [fl.min, fl.min * 2, fl.min * 5, fl.min * 10, fl.min * 25].filter(v => v <= fl.max);
  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="opts">{sizes.map(v => <button key={v} className={'btn sm' + (chip === v ? ' sel' : '')} onClick={() => setChip(v)}>{money(v, undefined, true)}</button>)}</div>
      <div className="row"><span className="muted small grow">{fill(p.t.g.chips, { x: money(total) })}</span><button className="btn sm" onClick={onClear} disabled={!total}>{p.t.g.clear}</button></div>
      <button className="btn primary big wide" disabled={p.busy || !total || total > p.run.cash || total < fl.min || total > fl.max} onClick={onGo}>{label} · {money(total)}</button>
    </div>
  );
}

export function RoulettePanel(p: PanelProps) {
  const fl = FLOORS[p.run.floor];
  const [chip, setChip] = useState(fl.min);
  const { chips, add, clear, total } = useChips<string>();
  const res = p.last && p.revealed ? (p.last.s as { r: number; bets: RouletteBet[] }) : null;
  const cell = (key: string, label: string, cls: string, span?: number) => (
    <button key={key} className={`rcell ${cls}${res && betWins([key.split(':')[0] as RouletteBet[0], +key.split(':')[1], 1], res.r) && key.startsWith('n:') ? ' win' : ''}`}
      style={span ? { gridColumn: `span ${span}` } : undefined} onClick={() => add(key, chip)}>
      {label}{chips.get(key) ? <span className="dot">{money(chips.get(key)!, undefined, true)}</span> : null}
    </button>
  );
  const go = () => {
    const bets: RouletteBet[] = [...chips.entries()].map(([k, amt]) => { const [kind, v] = k.split(':'); return [kind as RouletteBet[0], +v, amt]; });
    if (p.start({ bets }, total)) sfx('tick');
  };
  return (
    <div className="col">
      {res && <div className="big-mult" style={{ color: res.r === 0 ? 'var(--green)' : RED.has(res.r) ? 'var(--red)' : 'var(--text)' }}>{res.r}</div>}
      <div className="rboard">
        <button className="rcell green" style={{ gridRow: 'span 3' }} onClick={() => add('n:0', chip)}>0{chips.get('n:0') ? <span className="dot">{money(chips.get('n:0')!, undefined, true)}</span> : null}</button>
        {[3, 2, 1].map(row => Array.from({ length: 12 }, (_, c) => { const n = c * 3 + row; return cell('n:' + n, String(n), RED.has(n) ? 'red' : 'black'); }))}
      </div>
      <div className="rboard" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {[0, 1, 2].map(d => cell('dz:' + d, fill(p.t.g.dz, { n: d + 1 }), 'out', 2))}
        {cell('low:0', p.t.g.low, 'out')}{cell('even:0', p.t.g.even, 'out')}{cell('red:0', '♦', 'red')}{cell('black:0', '♠', 'black')}{cell('odd:0', p.t.g.odd, 'out')}{cell('high:0', p.t.g.high, 'out')}
      </div>
      <Armed p={p} item="rabbit" />
      <ChipBar p={p} total={total} onClear={clear} onGo={go} label="🔴" chip={chip} setChip={setChip} />
    </div>
  );
}

const MW_COLOR: Record<number, string> = { 1: '#e8e0c8', 3: '#3fb6ff', 5: '#7ee081', 10: '#c77dff', 25: '#ff9a3c', 50: '#ff2b4a' };
export function MoneyWheelPanel(p: PanelProps) {
  const fl = FLOORS[p.run.floor];
  const [chip, setChip] = useState(fl.min);
  const { chips, add, clear, total } = useChips<number>();
  const res = p.last && p.revealed ? (p.last.s as { k: number }) : null;
  const go = () => { const bets: MwBet[] = [...chips.entries()].map(([k, a]) => [k, a]); p.start({ bets }, total); };
  return (
    <div className="col">
      {res && <div className="big-mult" style={{ color: MW_COLOR[res.k] }}>{res.k}</div>}
      <div className="mwbets">
        {MW_KINDS.map(k => (
          <button key={k} className="mwbet" style={{ background: MW_COLOR[k], outline: res?.k === k ? '3px solid #fff' : undefined }} onClick={() => add(k, chip)}>
            {k}<small>{k}:1{chips.get(k) ? ' · ' + money(chips.get(k)!, undefined, true) : ''}</small>
          </button>
        ))}
      </div>
      <ChipBar p={p} total={total} onClear={clear} onGo={go} label="💰" chip={chip} setChip={setChip} />
    </div>
  );
}

export { PlayButton };
