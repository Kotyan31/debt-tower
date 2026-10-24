/* Games played in steps, with a cash-out. */
import { useState } from 'react';
import type { PanelProps } from '../GamePanel.tsx';
import { PlayButton, Armed } from './Simple.tsx';
import { PlayingCard, useFrameTick } from '../common.tsx';
import { fill, mult, money } from '../../i18n/index.ts';
import { payOf } from '../../core/index.ts';
import { cardName, rank } from '../../core/cards.ts';
import { type CrapsS } from '../../core/games/craps.ts';
import { type HiloS, hiChance, loChance, HILO_EDGE, HILO_SKIPS } from '../../core/games/hilo.ts';
import { type MinesS, minesMult, MINES_TILES } from '../../core/games/mines.ts';
import { type PenguinS, penguinMult, PENGUIN_LANES } from '../../core/games/penguin.ts';
import { type DragonS, dragonMult, DRAGON_DIFF, DRAGON_LEVELS } from '../../core/games/dragon.ts';
import { type CrashS, crashMult, CRASH_COUNTDOWN } from '../../core/games/crash.ts';
import { useGame } from '../../state/game.ts';
import { sfx } from '../../audio/sfx.ts';

const DIE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

function CashOut({ p, m, stake }: { p: PanelProps; m: number; stake: number }) {
  return <button className="btn go big wide" disabled={p.busy} onClick={() => { p.act('cash'); sfx('coin'); }}>{p.t.bet.cash} · {money(payOf(stake, m))}</button>;
}

export function CrapsPanel(p: PanelProps) {
  const s = (p.sess?.s ?? (p.last && p.revealed ? p.last.s : null)) as CrapsS | null;
  const roll = s?.rolls[s.rolls.length - 1];
  return (
    <div className="col">
      {roll && <div className="dice">{DIE[roll[0]]}{DIE[roll[1]]}<span className="gold" style={{ fontSize: 28, alignSelf: 'center' }}>{roll[0] + roll[1]}</span></div>}
      <div className="muted" style={{ textAlign: 'center' }}>{p.sess && s?.point ? fill(p.t.g.point, { n: s.point }) : p.t.g.comeOut}</div>
      <Armed p={p} item="dice" />
      {p.sess
        ? <button className="btn primary big wide" disabled={p.busy} onClick={() => { p.act('roll'); sfx('dice'); }}>🎲 {p.t.g.roll}</button>
        : <PlayButton p={p} label={'🎲 ' + p.t.g.roll} onClick={() => { p.start(); sfx('dice'); }} />}
    </div>
  );
}

export function HiloPanel(p: PanelProps) {
  const s = (p.sess?.s ?? (p.last && p.revealed ? p.last.s : null)) as HiloS | null;
  if (!p.sess) return (
    <div className="col">
      {s && <div className="row" style={{ justifyContent: 'center' }}>{s.hist.slice(-5).map((c, i) => <PlayingCard key={i} c={c} dim />)}<PlayingCard c={s.cur} big /></div>}
      <PlayButton p={p} label="🃏" onClick={() => { p.start(); sfx('card'); }} />
    </div>
  );
  const ss = s!;
  const hp = hiChance(ss.cur), lp = loChance(ss.cur);
  const lens = (p.run.inv.lens ?? 0) > 0;
  return (
    <div className="col">
      <div className="row" style={{ justifyContent: 'center' }}>
        {ss.hist.slice(-3).map((c, i) => <PlayingCard key={i} c={c} dim />)}
        <PlayingCard c={ss.cur} big />
      </div>
      {ss.peek && <div className="gold" style={{ textAlign: 'center' }}>🔍 {fill(p.t.g.nextCard, { c: cardName(ss.next) })}</div>}
      <div className="kv"><span className="muted">{fill(p.t.g.mult, { x: ss.mult.toFixed(2) })}</span><span>{ss.steps}✓</span></div>
      <div className="opts">
        <button className="btn primary" disabled={p.busy || rank(ss.cur) === 1} onClick={() => { p.act('hi'); sfx('card'); }}>▲ {p.t.g.hi}<br />{mult(ss.mult * HILO_EDGE / hp)} · {Math.round(hp * 100)}%</button>
        <button className="btn primary" disabled={p.busy || rank(ss.cur) === 13} onClick={() => { p.act('lo'); sfx('card'); }}>▼ {p.t.g.lo}<br />{mult(ss.mult * HILO_EDGE / lp)} · {Math.round(lp * 100)}%</button>
      </div>
      <div className="opts">
        <button className="btn sm" disabled={p.busy || ss.skips >= HILO_SKIPS} onClick={() => { p.act('skip'); sfx('card'); }}>⤼ {p.t.g.skip} ({HILO_SKIPS - ss.skips})</button>
        {lens && !ss.peek && <button className="btn sm" disabled={p.busy} onClick={() => p.act('peek')}>🔍 {p.t.g.peek} ({p.run.inv.lens})</button>}
      </div>
      {ss.steps > 0 && <CashOut p={p} m={ss.mult} stake={ss.stake} />}
    </div>
  );
}

export function MinesPanel(p: PanelProps) {
  const [n, setN] = useState(3);
  const s = (p.sess?.s ?? (p.last && p.revealed ? p.last.s : null)) as MinesS | null;
  const live = !!p.sess;
  const det = (p.run.inv.detector ?? 0) > 0;
  return (
    <div className="col">
      {!live && (
        <div className="col" style={{ gap: 4 }}>
          <div className="kv"><span>{fill(p.t.g.minesN, { n })}</span><span className="muted small">1 → {mult(minesMult(n, 1))} · 3 → {mult(minesMult(n, 3))}</span></div>
          <input type="range" min={1} max={24} value={n} onChange={e => setN(+e.target.value)} />
        </div>
      )}
      <div className="grid5">
        {Array.from({ length: MINES_TILES }, (_, i) => {
          const open = s?.open.includes(i), flag = s?.flags.includes(i), boom = s?.boom === i, mine = s && !live && s.mine[i];
          return (
            <button key={i} className={'tile' + (boom ? ' boom' : mine ? ' mine' : open ? ' open' : flag ? ' flag' : '')}
              disabled={!live || p.busy || open || flag}
              onClick={() => { p.act('pick', i); sfx('tick'); }}>
              {boom || mine ? '💣' : open ? '💎' : flag ? '🚩' : ''}
            </button>
          );
        })}
      </div>
      {live && s && (
        <>
          <div className="kv"><span className="muted">{fill(p.t.g.mult, { x: s.mult.toFixed(2) })}</span><span className="muted">{fill(p.t.g.next, { x: minesMult(s.n, s.open.length + 1).toFixed(2) })}</span></div>
          {det && <button className="btn sm" disabled={p.busy} onClick={() => p.act('detect')}>📡 {p.t.g.detector} ({p.run.inv.detector})</button>}
          {s.open.length > 0 && <CashOut p={p} m={s.mult} stake={s.stake} />}
        </>
      )}
      {!live && <PlayButton p={p} label="💣" onClick={() => p.start({ mines: n })} />}
    </div>
  );
}

export function PenguinPanel(p: PanelProps) {
  const [diff, setDiff] = useState(1);
  const s = (p.sess?.s ?? (p.last && p.revealed ? p.last.s : null)) as PenguinS | null;
  const live = !!p.sess;
  const d = live && s ? s.diff : diff;
  return (
    <div className="col">
      {!live && <div className="opts">{p.t.g.diff.map((x, i) => <button key={i} className={'btn sm' + (diff === i ? ' sel' : '')} onClick={() => setDiff(i)}>{x}</button>)}</div>}
      <div className="lanes">
        {Array.from({ length: PENGUIN_LANES }, (_, i) => {
          const lane = s?.lane ?? 0;
          const cls = s?.hit && !live && i === lane ? 'hit' : i < lane ? 'done' : i === lane && live ? 'cur' : '';
          return <i key={i} className={cls} title={mult(penguinMult(d, i + 1))}>{s?.saved.includes(i + 1) ? '🥾' : ''}</i>;
        })}
      </div>
      <div className="muted small">{[1, 3, 5, 10, 15].map(k => `${k}→${mult(penguinMult(d, k))}`).join(' · ')}</div>
      <Armed p={p} item="boots" />
      {live && s ? (
        <>
          <div className="kv"><span>{fill(p.t.g.lane, { n: s.lane })}</span><span className="muted">{fill(p.t.g.next, { x: penguinMult(s.diff, s.lane + 1).toFixed(2) })}</span></div>
          <button className="btn primary big wide" disabled={p.busy} onClick={() => { p.act('go'); sfx('step'); }}>🐧 {p.t.g.go}</button>
          {s.lane > 0 && <CashOut p={p} m={s.mult} stake={s.stake} />}
        </>
      ) : <PlayButton p={p} label="🐧" onClick={() => p.start({ diff })} />}
    </div>
  );
}

export function DragonPanel(p: PanelProps) {
  const [diff, setDiff] = useState(1);
  const s = (p.sess?.s ?? (p.last && p.revealed ? p.last.s : null)) as DragonS | null;
  const live = !!p.sess;
  const d = live && s ? s.diff : diff;
  const tiles = DRAGON_DIFF[d][0];
  return (
    <div className="col">
      {!live && <div className="opts">{p.t.g.dragonDiff.map((x, i) => <button key={i} className={'btn sm' + (diff === i ? ' sel' : '')} onClick={() => setDiff(i)}>{x}</button>)}</div>}
      <div className="tower">
        {Array.from({ length: DRAGON_LEVELS }, (_, lv) => (
          <div key={lv} className={'lv' + (live && s?.level === lv ? ' cur' : '')} style={{ gridTemplateColumns: `52px repeat(${tiles}, 1fr)` }}>
            <span className="small muted num" style={{ alignSelf: 'center' }}>{mult(dragonMult(d, lv + 1))}</span>
            {Array.from({ length: tiles }, (_, c) => {
              const picked = s && s.picks[lv] === c && lv < s.picks.length;
              const bad = s?.bad[lv]?.[c];
              const show = picked || (s && !live && bad);
              return (
                <button key={c} className={'tile' + (show ? (bad ? ' boom' : ' open') : '')}
                  disabled={!live || p.busy || s?.level !== lv}
                  onClick={() => { p.act('pick', c); sfx('tick'); }}>
                  {show ? (bad ? (s?.saved.includes(lv) ? '🧥' : '🐉') : '🥚') : ''}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <Armed p={p} item="cloak" />
      {live && s ? (s.level > 0 && <CashOut p={p} m={s.mult} stake={s.stake} />) : <PlayButton p={p} label="🐉" onClick={() => p.start({ diff })} />}
    </div>
  );
}

export function CrashPanel(p: PanelProps) {
  const [auto, setAuto] = useState('2');
  const live = !!p.sess;
  useFrameTick(live);
  const s = (p.sess?.s ?? (p.last && p.revealed ? p.last.s : null)) as CrashS | null;
  const now = useGame.getState().now();
  const crystal = (p.run.inv.crystal ?? 0) > 0;
  let big = '×1.00', cls = '';
  if (live && s) {
    const f = now - s.t0 - CRASH_COUNTDOWN;
    big = f < 0 ? (Math.ceil(-f / 1000)).toString() : mult(Math.min(s.crash, crashMult(f)));
    cls = 'good';
  } else if (s) { big = s.out ? mult(s.out) : mult(s.crash); cls = s.out ? 'gold' : 'bad'; }
  const m = live && s ? Math.max(1, crashMult(Math.max(0, now - s.t0 - CRASH_COUNTDOWN))) : 1;
  const autoV = parseFloat(auto.replace(',', '.'));
  return (
    <div className="col">
      <div className={'big-mult ' + cls}>{big}</div>
      {s && !live && <div className="muted" style={{ textAlign: 'center' }}>{s.out ? fill(p.t.g.out, { x: s.out.toFixed(2) }) : fill(p.t.g.boom, { x: s.crash.toFixed(2) })}</div>}
      {live && s?.hint && <div className="gold small" style={{ textAlign: 'center' }}>🔮 {s.crash >= 2 ? p.t.g.crystalYes : p.t.g.crystalNo}</div>}
      {live && s ? (
        <>
          {crystal && !s.hint && <button className="btn sm" onClick={() => p.act('crystal')}>🔮 {p.t.g.crystal} ({p.run.inv.crystal})</button>}
          <button className="btn go big wide" disabled={now < s.t0 + CRASH_COUNTDOWN} onClick={() => { p.act('cash'); sfx('coin'); }}>{p.t.bet.cash} · {money(payOf(s.stake, Math.floor(m * 100) / 100))}</button>
          {s.auto > 0 && <div className="muted small" style={{ textAlign: 'center' }}>{p.t.g.auto}: {mult(s.auto)}</div>}
        </>
      ) : (
        <>
          <label className="row small"><span className="grow">{p.t.g.auto}</span><input className="field" style={{ width: 90 }} value={auto} onChange={e => setAuto(e.target.value)} placeholder={p.t.g.off} /></label>
          <PlayButton p={p} label="🚀" onClick={() => p.start(autoV >= 1.01 ? { auto: Math.min(100, autoV) } : {})} />
        </>
      )}
    </div>
  );
}
