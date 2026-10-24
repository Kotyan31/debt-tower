import { useEffect, useRef, useState, type ReactElement } from 'react';
import { useGame } from '../state/game.ts';
import { useT, money, fill, type Dict } from '../i18n/index.ts';
import { FLOORS, type GameId, type Run, type Result, type Session } from '../core/index.ts';
import { PLINKO_FALL } from '../core/games/plinko.ts';
import { sfx } from '../audio/sfx.ts';
import { GAME_ICON, useTick } from './common.tsx';
import { PANELS } from './panels/index.tsx';

export interface PanelProps {
  id: GameId;
  run: Run;
  sess: Session | null;
  last: Result | null;
  /** the last round's result has finished rolling on screen */
  revealed: boolean;
  bet: number;
  busy: boolean;
  t: Dict;
  start(opts?: unknown, bet?: number): boolean;
  act(a: string, arg?: unknown): boolean;
}

const bets: Partial<Record<GameId, number>> = {};

/** stays visible this long after the reveal */
const revealOf = (r: Result) => (r.id === 'plinko' ? PLINKO_FALL : r.anim);

export function GamePanel({ id }: { id: GameId }) {
  const t = useT();
  const g = useGame();
  const run = g.run!;
  useTick(150);
  const fl = FLOORS[run.floor];
  const sess = run.game?.id === id ? run.game : null;
  const last = run.last?.id === id ? run.last : null;
  const lastAt = useRef<{ n: number; at: number }>({ n: -1, at: 0 });
  if (last && last.n !== lastAt.current.n) lastAt.current = { n: last.n, at: performance.now() };
  const revealed = !!last && performance.now() >= lastAt.current.at + revealOf(last);
  const [bet, setBetRaw] = useState(() => {
    const prev = bets[id];
    return Math.max(fl.min, Math.min(fl.max, prev ?? Math.max(fl.min, Math.floor(run.cash / 20 / fl.min) * fl.min)));
  });
  const maxBet = Math.min(fl.max, Math.max(fl.min, run.cash));
  const setBet = (n: number) => { const v = Math.max(fl.min, Math.min(maxBet, Math.floor(n) || fl.min)); bets[id] = v; setBetRaw(v); };
  useEffect(() => { if (!sess && bet > maxBet) setBet(maxBet); }, [bet, maxBet, !!sess]);
  const busy = g.now() < run.busy || g.holds.some(h => h.until > performance.now());
  const others = run.game && run.game.id !== id;

  // win and loss sounds land when the reveal does
  const sounded = useRef(-1);
  useEffect(() => {
    if (!last || !revealed || sounded.current === last.n) return;
    sounded.current = last.n;
    if (last.pay > last.stake) sfx(last.pay >= last.stake * 10 ? 'big' : 'win');
    else if (last.pay < last.stake) sfx('lose');
  });

  const close = () => { if (!sess) { useGame.getState().set({ table: null }); sfx('click'); } };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !useGame.getState().modal) close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const props: PanelProps = {
    id, run, sess, last, revealed, bet, busy, t,
    start(opts, b) { const ok = useGame.getState().act('s', id, b ?? bet, opts ?? {}); if (ok) sfx('chip'); return ok; },
    act(a, arg) { const ok = useGame.getState().act('a', a, arg ?? 0); if (ok) sfx('click'); return ok; },
  };
  const Panel = PANELS[id] as (p: PanelProps) => ReactElement;
  const showResult = last && revealed && !sess && performance.now() - lastAt.current.at < revealOf(last) + 6000;
  const net = last ? last.pay - last.stake : 0;
  const needsBet = !sess && id !== 'roulette' && id !== 'moneywheel';

  return (
    <aside className="panel glass">
      <div className="panel-head">
        <span style={{ fontSize: 24 }}>{GAME_ICON[id]}</span>
        <h2>{t.games[id]}</h2>
        <button className="x" onClick={close} disabled={!!sess} title={t.bet.close}>✕</button>
      </div>
      <div className="table-meta"><span>{t.hud.floor} {run.floor + 1} · {t.floors[run.floor]}</span><b className="gold num">{money(g.shownCash())}</b></div>
      <div className="panel-body">
        <p className="rules">{t.rules[id]}</p>
        {!sess && busy && <div className="small muted" role="status">{t.bet.revealing}</div>}
        {others ? <p className="bad">{t.bet.busy}</p> : <Panel {...props} />}
        {showResult && (
          <div className={'result ' + (net > 0 ? 'win' : net < 0 ? 'lose' : 'push')}>
            {net > 0 ? fill(t.bet.win, { x: money(last!.pay) }) : net < 0 ? (last!.pay > 0 ? fill(t.bet.back, { x: money(last!.pay) }) : t.bet.lose) : t.bet.push}
            {(last!.bonus > 0 || last!.saved > 0) && <span className="sub">{last!.bonus > 0 ? fill(t.bet.bonus, { x: money(last!.bonus) }) : fill(t.bet.saved, { x: money(last!.saved) })}</span>}
          </div>
        )}
      </div>
      {needsBet && (
        <div className="panel-foot">
          <BetBar bet={bet} setBet={setBet} min={fl.min} max={maxBet} t={t} />
          {run.cash < fl.min && <div className="bad small">{t.bet.noCash}</div>}
        </div>
      )}
    </aside>
  );
}

export function BetBar({ bet, setBet, min, max, t }: { bet: number; setBet(n: number): void; min: number; max: number; t: Dict }) {
  const [text, setText] = useState(String(bet));
  useEffect(() => { setText(String(bet)); }, [bet]);
  return (
    <div className="col" style={{ gap: 6 }}>
      <div className="betbar">
        <button className="btn sm" onClick={() => { setBet(min); sfx('chip'); }}>{t.bet.min}</button>
        <button className="btn sm" onClick={() => { setBet(bet / 2); sfx('chip'); }}>{t.bet.half}</button>
        <input className="field num" inputMode="numeric" value={text} aria-label={t.bet.bet}
          onChange={e => setText(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={() => { const v = Math.max(min, Math.min(max, Math.floor(+text) || min)); setText(String(v)); setBet(v); }}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
        <button className="btn sm" onClick={() => { setBet(Math.min(max, bet * 2)); sfx('chip'); }}>{t.bet.double}</button>
        <button className="btn sm" onClick={() => { setBet(max); sfx('chip'); }}>{t.bet.max}</button>
      </div>
      <div className="limits"><span>{t.bet.bet}: {money(min)} – {money(max)}</span></div>
    </div>
  );
}
