import { useEffect, useRef, useState } from 'react';
import { Scene } from '../scene/Scene.tsx';
import { useGame } from '../state/game.ts';
import { useSettings } from '../state/settings.ts';
import { useT, type Lang } from '../i18n/index.ts';
import { Hud, openNear } from './Hud.tsx';
import { GamePanel } from './GamePanel.tsx';
import { LiftMenu, Shark, Shop, Over, Leaders } from './Screens.tsx';
import { Account } from './Account.tsx';
import { world } from '../scene/world.ts';
import { sfx, unlockAudio } from '../audio/sfx.ts';

function Menu() {
  const t = useT();
  const g = useGame();
  const has = g.hasSave();
  return (
    <div className="menu">
      <div className="menu-card glass">
        <div className="logo">{t.title}<small>CASINO · TOWER</small></div>
        <p className="tagline">{t.tagline}</p>
        <div className="menu-btns">
          {has && <button className="btn primary big" onClick={() => { unlockAudio(); g.resume(); sfx('lift'); }}>▶ {t.menu.continue}</button>}
          <button className={'btn big' + (has ? '' : ' primary')} onClick={() => { unlockAudio(); if (has) g.set({ modal: 'confirmNew' }); else { g.newGame(); sfx('lift'); } }}>🎲 {t.menu.newRun}</button>
          <div className="row">
            <button className="btn grow" onClick={() => g.set({ modal: 'leaders' })}>🏆 {t.menu.leaders}</button>
            <button className="btn grow" onClick={() => g.set({ modal: 'help' })}>❔ {t.menu.help}</button>
            <button className="btn" onClick={() => g.set({ modal: 'settings' })} aria-label={t.menu.settings}>⚙</button>
          </div>
        </div>
        <Account />
        <div className="menu-foot"><span>{t.credits}</span><LangSwitch /></div>
      </div>
    </div>
  );
}

function LangSwitch() {
  const lang = useSettings(s => s.lang), set = useSettings(s => s.set);
  return (
    <span className="row" style={{ gap: 4 }}>
      {(['ru', 'en'] as Lang[]).map(l => <button key={l} className={'btn sm' + (lang === l ? ' sel' : '')} style={{ minHeight: 28, padding: '2px 8px' }} onClick={() => set({ lang: l })}>{l.toUpperCase()}</button>)}
    </span>
  );
}

function Settings() {
  const t = useT();
  const s = useSettings();
  const close = () => useGame.getState().set({ modal: null });
  return (
    <div className="modal-wrap" onClick={close}>
      <div className="modal glass" onClick={e => e.stopPropagation()}>
        <h2>⚙ {t.settings.title}</h2>
        <div className="kv"><span>{t.settings.lang}</span><LangSwitch /></div>
        <label className="col" style={{ gap: 4 }}><span>{t.settings.volume}</span><input type="range" min={0} max={1} step={0.05} value={s.volume} onChange={e => s.set({ volume: +e.target.value })} onPointerUp={() => sfx('chip')} /></label>
        <div className="kv"><span>{t.settings.graphics}</span>
          <span className="row" style={{ gap: 4 }}>{(['high', 'low'] as const).map(k => <button key={k} className={'btn sm' + (s.gfx === k ? ' sel' : '')} onClick={() => s.set({ gfx: k })}>{t.settings[k]}</button>)}</span>
        </div>
        {useGame.getState().screen === 'play' && <button className="btn" onClick={() => { useGame.getState().toMenu(); }}>{t.hud.menu}</button>}
        <p className="small muted">{t.hud.pause}</p>
        <button className="btn primary" onClick={close}>{t.settings.close}</button>
      </div>
    </div>
  );
}

function Help() {
  const t = useT();
  const close = () => useGame.getState().set({ modal: null });
  return (
    <div className="modal-wrap" onClick={close}>
      <div className="modal glass" onClick={e => e.stopPropagation()}>
        <h2>❔ {t.help.title}</h2>
        {t.help.body.map((p, i) => <p key={i} style={{ margin: 0, lineHeight: 1.45 }}>{p}</p>)}
        <button className="btn primary" onClick={close}>{t.help.close}</button>
      </div>
    </div>
  );
}

function Confirm({ text, yes, onYes }: { text: string; yes: string; onYes(): void }) {
  const t = useT();
  const close = () => useGame.getState().set({ modal: null });
  return (
    <div className="modal-wrap" onClick={close}>
      <div className="modal glass" onClick={e => e.stopPropagation()}>
        <p style={{ margin: 0, fontSize: 17 }}>{text}</p>
        <div className="row"><button className="btn grow" onClick={close}>{t.menu.no}</button><button className="btn primary grow" onClick={() => { close(); onYes(); }}>{yes}</button></div>
      </div>
    </div>
  );
}

/** a thumb stick for phones */
function Stick() {
  const ref = useRef<HTMLDivElement>(null), knob = useRef<HTMLElement>(null);
  const id = useRef<number | null>(null);
  const move = (e: React.PointerEvent) => {
    if (id.current !== e.pointerId || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    world.stick = { x, y };
    if (knob.current) knob.current.style.transform = `translate(${x * 34}px, ${y * 34}px)`;
  };
  const end = () => { id.current = null; world.stick = { x: 0, y: 0 }; if (knob.current) knob.current.style.transform = ''; };
  return (
    <div ref={ref} className="stick" onPointerDown={e => { id.current = e.pointerId; (e.target as HTMLElement).setPointerCapture(e.pointerId); move(e); }} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <i ref={knob} />
    </div>
  );
}

const touch = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

export function App() {
  const t = useT();
  const g = useGame();
  const run = g.run;
  const [, force] = useState(0);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      world.keys.add(e.code);
      if (e.code === 'KeyE' || (e.code === 'Enter' && !useGame.getState().table)) openNear();
      if (e.code === 'Escape') { const s = useGame.getState(); if (s.liftOpen) s.set({ liftOpen: false }); else if (s.modal) s.set({ modal: null }); }
    };
    const up = (e: KeyboardEvent) => world.keys.delete(e.code);
    const blur = () => world.keys.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    const vis = () => force(x => x + 1);
    document.addEventListener('visibilitychange', vis);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', vis); };
  }, []);
  const playing = g.screen === 'play' && run;
  return (
    <div className="app" onPointerDown={unlockAudio}>
      <div className="stage"><Scene /></div>
      <div className="ui">
        {!playing && <Menu />}
        {playing && run.phase === 'day' && <Hud />}
        {playing && run.phase === 'day' && touch && !g.table && !g.liftOpen && <Stick />}
        {playing && run.phase === 'day' && g.table && <GamePanel key={g.table} id={g.table} />}
        {playing && run.phase === 'day' && g.liftOpen && <LiftMenu />}
        {playing && run.phase === 'shark' && <Shark />}
        {playing && run.phase === 'shop' && <Shop />}
        {playing && run.phase === 'over' && <Over />}
        {g.modal === 'leaders' && <Leaders />}
        {g.modal === 'settings' && <Settings />}
        {g.modal === 'help' && <Help />}
        {g.modal === 'confirmNew' && <Confirm text={t.menu.abandon} yes={t.menu.yes} onYes={() => { g.newGame(); sfx('lift'); }} />}
        {g.modal === 'confirmEnd' && <Confirm text={t.hud.endDayAsk} yes={t.hud.endDay} onYes={() => { if (useGame.getState().run?.game) return; g.act('e'); sfx('shark'); }} />}
        {g.modal === 'confirmRetire' && <Confirm text={t.shop.retireAsk} yes={t.shop.retire} onYes={() => g.act('q')} />}
      </div>
    </div>
  );
}
