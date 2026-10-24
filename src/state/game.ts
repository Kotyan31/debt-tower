import { create } from 'zustand';
import { type Run, type Act, type Op, type GameId, newRun, tryApply, replay, summary, deadline, GAMES, RUN_V } from '../core/index.ts';
import { PLINKO_FALL } from '../core/games/plinko.ts';
import { store, hex } from '../net/storage.ts';
import { secureBytes } from '../net/guard.ts';
import { type RunMark, markStart, submitRun } from '../net/leaderboard.ts';
import { sfx } from '../audio/sfx.ts';
import { world, SPAWN } from '../scene/world.ts';
import { dictNow, fill } from '../i18n/index.ts';

const SAVE = 'dt-run';

interface Saved { rules: number; seed: string; epoch: number; log: Act[]; mark: RunMark | null; submitted: boolean }
/** money that is already in the run but still rolling on screen */
interface Hold { v: number; until: number }
export type Modal = null | 'leaders' | 'settings' | 'help' | 'confirmNew' | 'confirmEnd' | 'confirmRetire';
export type Near = null | { k: 'table'; id: GameId } | { k: 'lift' };

export interface GameState {
  screen: 'menu' | 'play';
  run: Run | null;
  seed: string;
  epoch: number;
  log: Act[];
  mark: RunMark | null;
  submitted: boolean;
  /** the table the player sits at */
  table: GameId | null;
  liftOpen: boolean;
  near: Near;
  holds: Hold[];
  modal: Modal;
  toast: { text: string; at: number; kind: 'good' | 'bad' | 'info' } | null;
  now(): number;
  act(op: Op, ...args: unknown[]): boolean;
  newGame(): void;
  resume(): boolean;
  hasSave(): boolean;
  toMenu(): void;
  set(p: Partial<GameState>): void;
  shownCash(): number;
}

function persist(s: GameState) {
  if (!s.run) return;
  const saved: Saved = { rules: RUN_V, seed: s.seed, epoch: s.epoch, log: s.log, mark: s.mark, submitted: s.submitted };
  store.set(SAVE, JSON.stringify(saved));
}

function readSave(): Saved | null {
  try { const j = JSON.parse(store.get(SAVE) || 'null'); return j?.rules === RUN_V && j.seed && Array.isArray(j.log) ? j : null; } catch { return null; }
}

export function hasLegacySave() {
  try { const s = JSON.parse(store.get(SAVE) || 'null'); return !!s?.seed && !s.submitted && s.rules !== RUN_V; } catch { return false; }
}

/** how long a round's result keeps rolling on screen */
const revealMs = (id: GameId, anim: number) => (id === 'plinko' ? PLINKO_FALL : anim);

function resetWalker() {
  world.pos.set(SPAWN[0], 0, SPAWN[1]);
  world.target = null;
  world.goal = null;
  world.path = [];
  world.keys.clear();
  world.stick = { x: 0, y: 0 };
}

export const useGame = create<GameState>((set, get) => ({
  screen: 'menu',
  run: null,
  seed: '',
  epoch: 0,
  log: [],
  mark: null,
  submitted: false,
  table: null,
  liftOpen: false,
  near: null,
  holds: [],
  modal: null,
  toast: null,

  now() {
    const s = get();
    return Math.max(s.run ? s.run.t : 0, Date.now() - s.epoch);
  },

  act(op, ...args) {
    const s = get();
    if (!s.run || s.screen !== 'play') return false;
    if (op === 's' && s.holds.some(h => h.until > performance.now())) return false;
    const a: Act = [s.now(), op, ...args];
    const before = s.run;
    const next = tryApply(before, a);
    if (!next) return false;
    const holds = s.holds.filter(h => h.until > performance.now());
    if (next.last && next.last.n === before.n) {   // this action ended a round
      holds.push({ v: next.last.pay, until: performance.now() + revealMs(next.last.id, next.last.anim) });
    }
    set({ run: next, log: [...s.log, a], holds });
    if (next.note?.k === 'challenge' && next.note.t !== before.note?.t) sfx('ticket');
    if (next.unlocked > before.unlocked) {
      const at = Date.now();
      set({ toast: { text: fill(dictNow().hud.floorOpened, { n: next.unlocked + 1, name: dictNow().floors[next.unlocked] }), at, kind: 'good' } });
      setTimeout(() => { if (get().toast?.at === at) set({ toast: null }); }, 3200);
      sfx('lift');
    }
    if (next.floor !== before.floor || (next.phase === 'day' && before.phase !== 'day')) resetWalker();
    if (next.phase === 'over' && !get().submitted) {
      set({ submitted: true, table: null, liftOpen: false });
      submitRun(get().seed, get().log, summary(next), get().mark);
    }
    if (next.phase !== before.phase) set({ table: null, liftOpen: false, modal: null, holds: [] });
    persist(get());
    return true;
  },

  newGame() {
    const seed = hex(secureBytes(16));
    resetWalker();
    set({ screen: 'play', run: newRun(seed), seed, epoch: Date.now(), log: [], mark: null, submitted: false, table: null, liftOpen: false, near: null, holds: [], modal: null, toast: null });
    persist(get());
    markStart(seed).then(mark => { if (get().seed === seed) { set({ mark }); persist(get()); } });
  },

  hasSave() {
    const sv = readSave();
    return !!sv && !sv.submitted;
  },

  resume() {
    const sv = readSave();
    if (!sv || sv.submitted) return false;
    try {
      const run = replay(sv.seed, sv.log);
      if (run.phase === 'over' || !Number.isFinite(sv.epoch)) throw new Error('save');
      resetWalker();
      set({ screen: 'play', run, seed: sv.seed, epoch: sv.epoch, log: sv.log, mark: sv.mark, submitted: sv.submitted, table: run.game?.id ?? null, liftOpen: false, near: null, holds: [], modal: null });
      return true;
    } catch {
      store.set(SAVE, null);
      return false;
    }
  },

  toMenu() { resetWalker(); set({ screen: 'menu', table: null, liftOpen: false, near: null, modal: null }); },

  set(p) { set(p); },

  shownCash() {
    const s = get();
    if (!s.run) return 0;
    const t = performance.now();
    return Math.max(0, s.run.cash - s.holds.reduce((a, h) => a + (h.until > t ? h.v : 0), 0));
  },
}));

/** the bell, and the crash rocket ending on its own */
export function startClock() {
  return setInterval(() => {
    const g = useGame.getState(), r = g.run;
    if (!r || g.screen !== 'play' || r.phase !== 'day') return;
    const now = g.now();
    if (now >= deadline(r)) { g.act('e'); sfx('bell'); return; }
    const sess = r.game;
    if (sess && GAMES[sess.id].settle && GAMES[sess.id].settle!(structuredClone(sess.s), now)) g.act('x');
  }, 100);
}
