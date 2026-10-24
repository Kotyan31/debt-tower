import { useMemo, useState } from 'react';
import { useGame } from '../state/game.ts';
import { useT, money, fill } from '../i18n/index.ts';
import { FLOORS, ITEMS, ORGANS, ORGAN_SHARE, ORGAN_TICKETS, quotaFor, type ItemId } from '../core/index.ts';
import { ITEM_ICON, GAME_ICON } from './common.tsx';
import { sfx } from '../audio/sfx.ts';
import { Account } from './Account.tsx';
import { useLb, canSend } from '../net/leaderboard.ts';
import { FAKE, HOME } from '../net/guard.ts';

/* ---------- lift ---------- */
export function LiftMenu() {
  const t = useT();
  const g = useGame();
  const run = g.run!;
  const go = (f: number) => { if (g.act('f', f)) { sfx('lift'); g.set({ liftOpen: false }); } };
  return (
    <div className="modal-wrap" onClick={() => g.set({ liftOpen: false })}>
      <div className="modal glass" onClick={e => e.stopPropagation()}>
        <h2>🛗 {t.lift.title}</h2>
        <div className="floors">
          {FLOORS.map((fl, i) => i).reverse().map(i => {
            const fl = FLOORS[i], open = i <= run.unlocked, here = i === run.floor;
            return (
              <button key={i} className={'floor-btn' + (here ? ' here' : '')} disabled={!open || here || !!run.game} onClick={() => go(i)}>
                <span className="n">{open ? i + 1 : '🔒'}</span>
                <span>
                  <b>{t.floors[i]}</b>{here ? <span className="muted small"> · {t.lift.here}</span> : null}
                  <br /><span className="small muted">{open ? fill(t.lift.limits, { a: money(fl.min), b: money(fl.max) }) : fill(t.lift.opensAt, { x: money(fl.unlock) })}</span>
                  <br /><span className="small">{fl.pool.map(id => GAME_ICON[id]).join(' ')}</span>
                </span>
              </button>
            );
          })}
        </div>
        <button className="btn" onClick={() => g.set({ liftOpen: false })}>{t.lift.close}</button>
      </div>
    </div>
  );
}

/* ---------- the shark at the end of the day ---------- */
export function Shark() {
  const t = useT();
  const g = useGame();
  const run = g.run!;
  const line = useMemo(() => t.shark.lines[run.day % t.shark.lines.length], [run.day, t]);
  const can = run.cash >= run.quota;
  const organ = run.organs < ORGANS.length ? t.organs[run.organs] : null;
  const organCash = Math.ceil((run.quota * ORGAN_SHARE) / 10) * 10;
  return (
    <div className="screen">
      <div className="screen-card glass">
        <h2>🦈 {t.shark.title}</h2>
        <div className="shark">
          <div className="shark-face">🦈</div>
          <div className="col">
            <div className="speech">«{line}»</div>
            <div className="kv"><span>{fill(t.shark.due, { n: run.day, x: money(run.quota) })}</span></div>
            <div className="kv"><span className={can ? 'good' : 'bad'}>{fill(t.shark.have, { x: money(run.cash) })}</span></div>
            {run.debt > 0 && can && <div className="muted small">{fill(t.shark.left, { x: money(Math.max(0, run.debt - run.quota)) })}</div>}
          </div>
        </div>
        <div className="col">
          {can && <button className="btn primary big" onClick={() => { g.act('p'); sfx('coin'); }}>{fill(t.shark.pay, { x: money(run.quota) })}</button>}
          {!can && organ && <button className="btn danger" onClick={() => { g.act('o'); sfx('lose'); }}>🫀 {fill(t.shark.organ, { o: organ, x: money(organCash) })}</button>}
          {!can && <button className="btn" onClick={() => { g.act('p'); sfx('shark'); }}>{t.shark.cant}</button>}
        </div>
      </div>
    </div>
  );
}

/* ---------- the night: shop and next day ---------- */
export function Shop() {
  const t = useT();
  const g = useGame();
  const run = g.run!;
  const next = run.day + 1;
  const q = run.debt > 0 ? Math.min(run.debt, quotaFor(next)) : quotaFor(next);
  const buy = (id: ItemId) => { if (g.act('b', id)) sfx('buy'); };
  const arm = (id: ItemId) => { if (g.act('u', id)) sfx('buy'); };
  const note = run.note;
  const organ = run.organs < ORGANS.length ? t.organs[run.organs] : null;
  return (
    <div className="screen">
      <div className="screen-card glass">
        <div className="row wrap">
          <h2 className="grow">🌙 {run.day === 0 ? t.shop.first : fill(t.shop.title, { n: next })}</h2>
          <span className="gold num" style={{ fontFamily: 'var(--head)', fontSize: 20 }}>{money(run.cash)} · 🎟 {run.tickets}</span>
        </div>
        {run.day === 0 && <div className="speech">🦈 {t.shop.brief}</div>}
        {note?.k === 'paid' && <div className="good">{fill(t.shop.paid, { n: note.v })}</div>}
        {note?.k === 'free' && <div className="gold" style={{ fontFamily: 'var(--head)', fontSize: 18 }}>🎉 {fill(t.shop.free, { n: note.v })}</div>}
        <div className="row wrap muted"><span className="grow">{fill(t.shop.nextQuota, { x: money(q) })}</span><span>{t.hud.debt}: {money(run.debt)}</span></div>
        <h3>{t.shop.items}</h3>
        <div className="shop-grid">
          {ITEMS.map(it => {
            const own = run.inv[it.id] ?? 0, armed = run.armed[it.id];
            return (
              <div key={it.id} className="shop-item">
                <div className="row"><span className="ic">{ITEM_ICON[it.id]}</span><h3 className="grow">{t.items[it.id][0]}</h3>{own > 0 && <span className="small muted">{fill(t.items.owned, { n: own })}</span>}</div>
                <p>{t.items[it.id][1]}</p>
                {it.games && <p className="small">{t.items.where}: {it.games.map(id => GAME_ICON[id] + ' ' + t.games[id]).join(', ')}</p>}
                <div className="row">
                  <button className="btn sm grow" disabled={run.tickets < it.cost} onClick={() => buy(it.id)}>{fill(t.items.buy, { n: it.cost })}</button>
                  {it.kind === 'armed' && own > 0 && !armed && <button className="btn sm" onClick={() => arm(it.id)}>{t.items.use}</button>}
                  {armed && <span className="small good">✓ {t.hud.armed}</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="row wrap sticky-foot">
          {organ
            ? <button className="btn sm danger" onClick={() => { if (g.act('o')) sfx('ticket'); }}>🫀 {fill(t.shop.organ, { o: organ, n: ORGAN_TICKETS })}</button>
            : <span className="small muted">{t.shop.organNone}</span>}
          <span className="grow" />
          {run.day > 0 && <button className="btn" onClick={() => g.set({ modal: 'confirmRetire' })}>🏖 {t.shop.retire}</button>}
          <button className="btn primary big" onClick={() => { g.act('n'); sfx('bell'); }}>{fill(t.shop.start, { n: next })}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- the end ---------- */
export function Over() {
  const t = useT();
  const g = useGame();
  const run = g.run!;
  return (
    <div className="screen">
      <div className="screen-card glass">
        <h2>{run.ending === 'broke' ? '💀 ' + t.over.broke : '🏖 ' + t.over.retired}</h2>
        <div className="stats">
          <Stat k={t.over.days} v={String(run.days)} />
          <Stat k={t.over.total} v={money(run.paid + run.cash)} />
          <Stat k={t.over.peak} v={money(run.peak)} />
          <Stat k={t.over.big} v={money(run.big)} />
          <Stat k={t.over.rounds} v={String(run.rounds)} />
          {run.free && <Stat k={t.over.free} v="✅" />}
        </div>
        <LbStatus />
        <Account compact />
        <div className="row wrap">
          <button className="btn" onClick={() => g.set({ modal: 'leaders' })}>🏆 {t.menu.leaders}</button>
          <span className="grow" />
          <button className="btn" onClick={() => g.toMenu()}>{t.over.menu}</button>
          <button className="btn primary big" onClick={() => g.newGame()}>{t.over.again}</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return <div className="stat"><div className="k">{k}</div><div className="v num">{v}</div></div>;
}


export function LbStatus() {
  const t = useT();
  const lb = useLb();
  const mark = useGame(s => s.mark);
  let text = '';
  if (lb.status.startsWith('ack:')) text = t.lb.ack[lb.status.slice(4) as keyof typeof t.lb.ack] ?? '';
  else if (lb.status === 'sending') text = t.lb.sending;
  else if (lb.status === 'sent') text = t.lb.sent;
  else if (lb.status === 'offline') text = t.lb.offline;
  else if (lb.mode === 'gh') {
    if (FAKE) text = t.lb.fake;
    else if (!HOME) text = t.lb.notHome;
    else if (!canSend()) text = t.lb.sendOff;
    else if (!mark) text = t.lb.nostartRun;
    else if (!lb.acct) text = t.lb.loginHint;
  } else text = t.lb.local;
  return text ? <div className="small muted">{text}</div> : null;
}

/* ---------- leaderboard ---------- */
export function Leaders() {
  const t = useT();
  const lb = useLb();
  const [tab, setTab] = useState<'days' | 'peak' | 'big'>('days');
  const myId = lb.acct ? lb.acct.nick.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase() : null;
  const rows = useMemo(() => {
    const src = lb.mode === 'gh' ? lb.rows.slice() : (JSON.parse(localStorage.getItem('dt-top') || '[]') as typeof lb.rows);
    const key = (r: (typeof src)[number]) => (tab === 'days' ? r.days * 1e15 + r.total : tab === 'peak' ? r.peak : r.big);
    return src.sort((a, b) => key(b) - key(a)).slice(0, 100);
  }, [lb.rows, lb.mode, tab]);
  const close = () => useGame.getState().set({ modal: null });
  return (
    <div className="modal-wrap" onClick={close}>
      <div className="modal glass" onClick={e => e.stopPropagation()}>
        <h2>🏆 {t.lb.title}</h2>
        <div className="tabs">
          {(['days', 'peak', 'big'] as const).map(k => <button key={k} className={'btn sm grow' + (tab === k ? ' sel' : '')} onClick={() => setTab(k)}>{t.lb[k]}</button>)}
        </div>
        {rows.length ? (
          <ol className="lb-list">
            {rows.map((r, i) => (
              <li key={r.id + i} className={(lb.mode === 'gh' && r.id === myId ? 'me' : '') + (r.pend ? ' pend' : '')}>
                <span className="rk">{String(i + 1).padStart(2, '0')}</span>
                <span className="nm">{r.nick}{lb.mode === 'gh' && r.id === myId ? <span className="muted small"> · {t.lb.you}</span> : null}</span>
                <span className="sc num">{tab === 'days' ? `${r.days} · ${money(r.total, undefined, true)}` : money(tab === 'peak' ? r.peak : r.big, undefined, true)}</span>
              </li>
            ))}
          </ol>
        ) : <p className="muted">{t.lb.empty}</p>}
        <div className="small muted">{lb.mode === 'gh' ? (canSend() ? t.lb.shared : t.lb.sendOff) : t.lb.local}</div>
        <Account compact />
        <button className="btn" onClick={close}>{t.lb.close}</button>
      </div>
    </div>
  );
}
