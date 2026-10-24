import { useEffect, useRef } from 'react';
import { useGame } from '../state/game.ts';
import { useT, money, fill } from '../i18n/index.ts';
import { deadline, ITEMS, ITEM, FLOORS, type ItemId } from '../core/index.ts';
import { ITEM_ICON, GAME_ICON, useTick } from './common.tsx';
import { sfx } from '../audio/sfx.ts';
import { world, visitTable } from '../scene/world.ts';

const fmtTime = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

export function Hud() {
  const t = useT();
  const g = useGame();
  useTick(200);
  const run = g.run!;
  const now = g.now();
  const left = deadline(run) - now;
  const cash = g.shownCash();
  const qp = Math.min(1, cash / run.quota);
  const low = left < 30000;
  const alarmed = useRef(-1);
  useEffect(() => {
    const s = Math.ceil(left / 1000);
    if (low && s > 0 && s <= 10 && alarmed.current !== s) { alarmed.current = s; sfx('alarm'); }
  });
  const usable = ITEMS.filter(i => i.kind !== 'action' && (run.inv[i.id] ?? 0) > 0 || run.armed[i.id]);
  const use = (id: ItemId) => { if (g.act('u', id)) sfx('buy'); };
  const ch = run.ch;
  return (
    <>
      <div className={'hud' + (g.table ? ' at-table' : '')}>
        <div className={'chip glass timer' + (low ? ' low' : '')}><span className="k">{fill(t.hud.day, { n: run.day })}</span><span className="v num">{fmtTime(left)}</span><div className="day-track"><i style={{ width: `${Math.max(0, left / run.dayLen) * 100}%` }} /></div></div>
        <div className="chip glass"><span className="k">{t.hud.cash}</span><span className="v num gold">{money(cash, undefined, true)}</span></div>
        <div className="chip glass quota">
          <span className="k">{t.hud.quota} · {money(run.quota, undefined, true)}</span>
          <div className={'bar' + (qp >= 1 ? ' ok' : '')} role="progressbar" aria-label={t.hud.quota} aria-valuemin={0} aria-valuemax={run.quota} aria-valuenow={Math.min(cash, run.quota)}><i style={{ width: qp * 100 + '%' }} /></div>
          <span className={'quota-status' + (qp >= 1 ? ' good' : '')}>{qp >= 1 ? '✓ ' + t.hud.ready : fill(t.hud.shortfall, { x: money(run.quota - cash) })}</span>
        </div>
        <div className="chip glass hud-debt"><span className="k">{t.hud.debt}</span><span className="v num">{money(run.debt, undefined, true)}</span></div>
        <div className="chip glass hud-tix"><span className="k">{t.hud.tickets}</span><span className="v num">🎟 {run.tickets}</span></div>
        <div className="hud-right">
          <button className="btn sm" disabled={!!run.game || g.holds.some(h => h.until > performance.now())} onClick={() => g.set({ modal: 'confirmEnd' })} aria-label={t.hud.endDay} title={run.game ? t.bet.busy : t.hud.endDay}>🦈<span className="hide-sm"> {t.hud.endDay}</span></button>
          <button className="btn sm" onClick={() => g.set({ modal: 'settings' })} aria-label={t.settings.title}>⚙</button>
        </div>
      </div>
      {!g.table && !g.liftOpen && <div className="floor-dock glass">
        <div className="floor-dock-head"><span className="floor-badge">{run.floor + 1}</span><div><b>{t.floors[run.floor]}</b><span>{run.unlocked < FLOORS.length - 1 ? fill(t.hud.roundProgress, { a: Math.min(run.rounds, FLOORS[run.unlocked + 1].rounds), b: FLOORS[run.unlocked + 1].rounds }) : t.hud.topFloor}</span></div></div>
        <div className="floor-passes" aria-label={t.lift.title}>{FLOORS.map((f, i) => <button key={i} className={(i <= run.unlocked ? 'available ' : '') + (i === run.floor ? 'current' : '')} aria-label={`${t.hud.floor} ${i + 1}: ${t.floors[i]}`} title={i <= run.unlocked ? t.floors[i] : fill(t.lift.unlockWays, { r: f.rounds, x: money(f.unlock), d: f.day })} disabled={i > run.unlocked} onClick={() => g.set({ liftOpen: true })}>{i + 1}<small>{i <= run.unlocked ? '✓' : f.rounds}</small></button>)}</div>
        <nav aria-label={t.hud.tables}>{run.tables.map(id => <button key={id} className={'table-link' + (g.near?.k === 'table' && g.near.id === id ? ' near' : '')} onClick={() => visitTable(run.tables, id)}><span aria-hidden="true">{GAME_ICON[id]}</span><span>{t.games[id]}</span></button>)}</nav>
      </div>}
      {ch && !g.table && (
        <div className="challenge glass">
          {ch.done ? '✅' : '🎯'} <b>{fill(t.challenge[ch.k], { n: ch.n })}</b>{!ch.done && ch.k !== 'mult' ? ` · ${Math.min(ch.prog, ch.n)}/${ch.n}` : ''} · +2 🎟
          {run.luckyUntil > now && <div className="good">🪙 {fill(t.hud.lucky, { s: Math.ceil((run.luckyUntil - now) / 1000) })}</div>}
        </div>
      )}
      {g.toast && <div key={g.toast.at} className="toast glass">{g.toast.text}</div>}
      {!g.table && usable.length > 0 && (
        <div className="items-bar">
          {usable.map(i => {
            const on = !!run.armed[i.id];
            return (
              <button key={i.id} className={'item-btn' + (on ? ' on' : '')} disabled={on} title={`${t.items[i.id][0]} — ${t.items[i.id][1]}`} onClick={() => use(i.id)}>
                {ITEM_ICON[i.id]}<span className="n">{on ? (ITEM[i.id].charges ?? 1) > 1 ? run.armed[i.id] : '✓' : run.inv[i.id]}</span>
              </button>
            );
          })}
        </div>
      )}
      {!g.table && !g.liftOpen && g.near && (
        <div className="prompt glass">
          <span>{g.near.k === 'lift' ? '🛗 ' + t.hud.lift : t.games[g.near.id]}</span>
          <button className="btn primary sm" onClick={() => openNear()}>{g.near.k === 'lift' ? t.hud.lift : t.hud.play} {!touch && <kbd>E</kbd>}</button>
        </div>
      )}
      {!g.table && !g.near && <div className="hint glass">{touch ? t.hud.moveTouch : t.hud.move}</div>}
    </>
  );
}

export function openNear() {
  const g = useGame.getState();
  if (!g.near || g.table || g.liftOpen || g.modal || g.run?.phase !== 'day') return;
  world.target = null;
  world.path = [];
  world.goal = null;
  if (g.near.k === 'lift') { g.set({ liftOpen: true }); sfx('lift'); }
  else { g.set({ table: g.near.id }); sfx('chip'); }
}
