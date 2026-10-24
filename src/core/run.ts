/* One run of the game as a pure state machine. Every player decision is an action [t, op, ...args] with t in ms since
   the run began. The page applies actions as they happen and keeps them in a log; the leaderboard server replays the
   same log from the same seed and must arrive at the same numbers. Anything the rules forbid throws.

   ops:
     f floor             take the lift to a floor
     s game bet opts     sit down at a table and bet
     a act arg           an action in the open round (hit, cash, pick…)
     u item              use or switch on an item
     x                   nothing; lets time-driven rounds settle (the crash rocket)
     e                   end the day (the timer ran out, or the player went to the shark early)
     o                   sell an organ (to the shark for cash, in the shop for tickets)
     p                   pay the shark's quota (or fail to)
     b item              buy an item in the shop
     n                   start the next day
     q                   retire: the run ends with what it has */
import { type RngState, type Rng, makeRng, seedState, shuffle } from './rng.ts';
import { type GameId, type ItemId, type Ctx, type Step, GameError, fail, int } from './types.ts';
import { GAMES } from './games/index.ts';
import { ITEM, LUCKY_BONUS, LUCKY_MS, ENERGY_MS } from './items.ts';
import {
  START, DAY_MS, FLOORS, TABLES_PER_FLOOR, ORGANS, ORGAN_SHARE, ORGAN_TICKETS, QUOTA_TICKETS, RICH_TICKET,
  FREEDOM_TICKETS, CHALLENGE_TICKETS, quotaFor,
} from './economy.ts';

export const RUN_V = 1;
/** the furthest an action may be from the run's start: a week */
const MAX_T = 7 * 86400 * 1000;

export type Op = 'f' | 's' | 'a' | 'u' | 'x' | 'e' | 'o' | 'p' | 'b' | 'n' | 'q';
export type Act = [number, Op, ...unknown[]];

export interface Session { id: GameId; s: any; stake: number; t0: number }
export interface Result { id: GameId; stake: number; pay: number; s: any; t: number; anim: number; n: number; bonus: number; saved: number }
export interface Challenge { k: 'streak' | 'mult' | 'variety'; n: number; prog: number; done: boolean }

export interface Run {
  v: number;
  seed: string;
  rng: RngState;
  /** time of the last action, count of actions */
  t: number;
  n: number;
  phase: 'day' | 'shark' | 'shop' | 'over';
  day: number;
  dayStart: number;
  dayLen: number;
  cash: number;
  debt: number;
  tickets: number;
  quota: number;
  /** paid to the shark so far, quotas met */
  paid: number;
  days: number;
  peak: number;
  /** biggest profit of a single round */
  big: number;
  wagered: number;
  rounds: number;
  floor: number;
  unlocked: number;
  tables: GameId[];
  pre: Partial<Record<GameId, unknown>>;
  inv: Partial<Record<ItemId, number>>;
  armed: Partial<Record<ItemId, number>>;
  luckyUntil: number;
  organs: number;
  game: Session | null;
  /** no table may act before this time: the last reveal is still playing */
  busy: number;
  streak: number;
  played: GameId[];
  ch: Challenge | null;
  free: boolean;
  ending: null | 'broke' | 'retired';
  last: Result | null;
  /** what happened at the last pay-up, for the screens */
  note: null | { k: 'paid' | 'organ' | 'challenge' | 'free'; v: number; t: number };
}

export const deadline = (r: Run) => r.dayStart + r.dayLen;

export function newRun(seed: string): Run {
  const r: Run = {
    v: RUN_V, seed, rng: seedState(seed), t: 0, n: 0, phase: 'shop', day: 0, dayStart: 0, dayLen: DAY_MS,
    cash: START.cash, debt: START.debt, tickets: START.tickets, quota: quotaFor(1), paid: 0, days: 0,
    peak: START.cash, big: 0, wagered: 0, rounds: 0, floor: 0, unlocked: 0, tables: [], pre: {}, inv: {}, armed: {},
    luckyUntil: 0, organs: 0, game: null, busy: 0, streak: 0, played: [], ch: null, free: false, ending: null,
    last: null, note: null,
  };
  return r;
}

function seatTables(r: Run, rng: Rng) {
  const pool = FLOORS[r.floor].pool.slice();
  r.tables = shuffle(pool, rng).slice(0, TABLES_PER_FLOOR);
  r.pre = {};
  for (const id of r.tables) { const g = GAMES[id]; if (g.prep) r.pre[id] = g.prep(rng); }
}

function newChallenge(rng: Rng): Challenge {
  const k = (['streak', 'mult', 'variety'] as const)[rng.int(3)];
  const n = k === 'streak' ? 3 + rng.int(2) : k === 'mult' ? [5, 10][rng.int(2)] : 4;
  return { k, n, prog: 0, done: false };
}

function bumpCash(r: Run) {
  if (r.cash > r.peak) r.peak = r.cash;
  while (r.unlocked < FLOORS.length - 1 && r.peak >= FLOORS[r.unlocked + 1].unlock) r.unlocked++;
}

function makeCtx(r: Run, t: number, id: GameId): Ctx {
  return {
    t,
    pre: r.pre[id],
    take(item) {
      if (!(r.inv[item]! > 0)) fail('no item');
      if (!ITEM[item].games?.includes(id)) fail('wrong item');
      r.inv[item]! -= 1;
    },
    armed(item) {
      const left = r.armed[item];
      if (!left) return false;
      if (left <= 1) delete r.armed[item]; else r.armed[item] = left - 1;
      return true;
    },
  };
}

function resolve(r: Run, sess: Session, st: Step<any>, t: number, rng: Rng) {
  let pay = st.pay ?? 0, bonus = 0, saved = 0;
  const profit = pay - sess.stake;
  if (profit > 0 && t < r.luckyUntil) { bonus = Math.floor(profit * LUCKY_BONUS); pay += bonus; }
  if (pay < sess.stake && r.armed.insurance) {   // insurance gives back half of what was lost
    saved = Math.floor((sess.stake - pay) / 2);
    pay += saved;
    delete r.armed.insurance;
  }
  r.cash += pay;
  r.rounds++;
  const won = pay > sess.stake;
  r.streak = won ? r.streak + 1 : 0;
  if (pay - sess.stake > r.big) r.big = pay - sess.stake;
  if (!r.played.includes(sess.id)) r.played.push(sess.id);
  const ch = r.ch;
  if (ch && !ch.done) {
    if (ch.k === 'streak') ch.prog = Math.max(ch.prog, r.streak);
    else if (ch.k === 'mult' && won) ch.prog = Math.max(ch.prog, Math.floor(pay / sess.stake));
    else if (ch.k === 'variety') ch.prog = r.played.length;
    if (ch.prog >= ch.n) { ch.done = true; r.tickets += CHALLENGE_TICKETS; r.note = { k: 'challenge', v: CHALLENGE_TICKETS, t }; }
  }
  r.last = { id: sess.id, stake: sess.stake, pay, s: st.s, t, anim: st.anim, n: r.n, bonus, saved };
  r.game = null;
  const g = GAMES[sess.id];
  if (g.prep) r.pre[sess.id] = g.prep(rng);
  bumpCash(r);
}

function applyStep(r: Run, sess: Session, st: Step<any>, t: number, rng: Rng) {
  if (st.extra) {
    if (r.cash < st.extra) fail('cash');
    r.cash -= st.extra;
    sess.stake += st.extra;
    r.wagered += st.extra;
  }
  r.busy = t + Math.floor(st.anim * 0.85);
  sess.s = st.s;
  if (st.done) resolve(r, sess, st, t, rng);
}

/** time-driven endings: the crash rocket blows up (or auto-cashes) on its own */
function settle(r: Run, t: number, rng: Rng): boolean {
  const sess = r.game;
  if (!sess) return false;
  const g = GAMES[sess.id];
  const st = g.settle?.(sess.s, t);
  if (!st) return false;
  const at = Math.min(t, st.s?.end ?? t);
  applyStep(r, sess, st, at, rng);
  r.busy = Math.max(r.busy, at + Math.floor(st.anim * 0.85));
  return true;
}

/** applies one action to the run, in place; throws GameError if the rules do not allow it */
export function apply(r: Run, a: Act): void {
  if (!Array.isArray(a) || a.length < 2) fail('shape');
  const [t, op] = a;
  int(t, r.t, MAX_T, 'time');
  if (r.phase === 'over') fail('over');
  const rng = makeRng(r.rng);
  const keep = () => { r.rng = rng.state(); r.t = t; r.n++; };

  switch (op) {
    case 'x': {
      if (r.phase === 'day') settle(r, Math.min(t, deadline(r)), rng);
      return keep();
    }
    case 'e': {
      if (r.phase !== 'day') fail('phase');
      const end = Math.min(t, deadline(r));
      settle(r, end, rng);
      if (r.game) {
        const sess = r.game, g = GAMES[sess.id];
        const st = g.timeout ? g.timeout(sess.s, end, rng, makeCtx(r, end, sess.id)) : { s: sess.s, done: true, pay: 0, anim: 0 };
        applyStep(r, sess, { ...st, done: true }, end, rng);
      }
      r.phase = 'shark';
      r.note = null;
      return keep();
    }
    case 'n': {
      if (r.phase !== 'shop') fail('phase');
      r.day++;
      r.quota = r.debt > 0 ? Math.min(r.debt, quotaFor(r.day)) : quotaFor(r.day);
      r.dayStart = t;
      r.dayLen = DAY_MS;
      r.phase = 'day';
      r.streak = 0;
      r.played = [];
      r.ch = newChallenge(rng);
      r.busy = t;
      r.note = null;
      seatTables(r, rng);
      return keep();
    }
    case 'p': {
      if (r.phase !== 'shark') fail('phase');
      if (r.cash < r.quota) { r.phase = 'over'; r.ending = 'broke'; return keep(); }
      const rich = r.cash >= r.quota * 2;
      r.cash -= r.quota;
      r.paid += r.quota;
      r.days++;
      r.tickets += QUOTA_TICKETS + (rich ? RICH_TICKET : 0);
      r.note = { k: 'paid', v: QUOTA_TICKETS + (rich ? RICH_TICKET : 0), t };
      if (r.debt > 0) {
        r.debt = Math.max(0, r.debt - r.quota);
        if (r.debt === 0) { r.free = true; r.tickets += FREEDOM_TICKETS; r.note = { k: 'free', v: FREEDOM_TICKETS, t }; }
      }
      r.phase = 'shop';
      return keep();
    }
    case 'o': {
      if (r.phase !== 'shark' && r.phase !== 'shop') fail('phase');
      if (r.organs >= ORGANS.length) fail('no organs');
      r.organs++;
      if (r.phase === 'shark') {
        const v = Math.ceil((r.quota * ORGAN_SHARE) / 10) * 10;
        r.cash += v;
        r.note = { k: 'organ', v, t };
        bumpCash(r);
      } else {
        r.tickets += ORGAN_TICKETS;
        r.note = { k: 'organ', v: ORGAN_TICKETS, t };
      }
      return keep();
    }
    case 'b': {
      if (r.phase !== 'shop') fail('phase');
      const id = a[2] as ItemId, def = ITEM[id];
      if (!def) fail('item');
      if (r.tickets < def.cost) fail('tickets');
      r.tickets -= def.cost;
      r.inv[id] = (r.inv[id] || 0) + 1;
      return keep();
    }
    case 'q': {
      if (r.phase !== 'shop' || r.day === 0) fail('phase');
      r.phase = 'over';
      r.ending = 'retired';
      return keep();
    }
    case 'u': {
      const id = a[2] as ItemId, def = ITEM[id];
      if (!def || def.kind === 'action') fail('item');
      if (!(r.inv[id]! > 0)) fail('no item');
      if (def.kind === 'armed') {
        if (r.phase !== 'day' && r.phase !== 'shop') fail('phase');
        if (r.armed[id]) fail('armed');
        r.armed[id] = def.charges || 1;
      } else {
        if (r.phase !== 'day' || t > deadline(r)) fail('phase');
        if (id === 'lucky') r.luckyUntil = Math.max(r.luckyUntil, t) + LUCKY_MS;
        if (id === 'energy') r.dayLen += ENERGY_MS;
      }
      r.inv[id]! -= 1;
      return keep();
    }
  }

  // the rest happens on the casino floor, before the bell
  if (r.phase !== 'day') fail('phase');
  if (t > deadline(r)) fail('late');
  const settled = settle(r, t, rng);

  if (op === 'f') {
    if (r.game) fail('playing');
    const f = int(a[2], 0, FLOORS.length - 1);
    if (f > r.unlocked || f === r.floor) fail('floor');
    r.floor = f;
    seatTables(r, rng);
    return keep();
  }

  if (op === 's') {
    if (r.game) fail('playing');
    if (t < r.busy) fail('busy');
    const id = a[2] as GameId, g = GAMES[id];
    if (!g || !r.tables.includes(id)) fail('table');
    const fl = FLOORS[r.floor];
    const bet = int(a[3], 1, 1e12, 'bet');
    const o = (a[4] ?? {}) as any;
    const stake = g.stake ? g.stake(bet, o) : bet;
    if (!Number.isSafeInteger(stake) || stake < fl.min || stake > fl.max) fail('limits');
    if (stake > r.cash) fail('cash');
    r.cash -= stake;
    r.wagered += stake;
    const sess: Session = { id, s: null, stake, t0: t };
    r.game = sess;
    const st = g.start(bet, o, rng, makeCtx(r, t, id));
    applyStep(r, sess, st, t, rng);
    return keep();
  }

  if (op === 'a') {
    if (!r.game) { if (settled) return keep(); fail('no game'); }   // a click that came just after the rocket blew up
    if (t < r.busy) fail('busy');
    const sess = r.game!, g = GAMES[sess.id];
    if (!g.act) fail('act');
    const st = g.act!(sess.s, String(a[2]), a[3], rng, makeCtx(r, t, sess.id));
    applyStep(r, sess, st, t, rng);
    return keep();
  }

  fail('op');
}

/** the page's own copy of apply: returns the new run, or null (and leaves the old one untouched) if the action is refused */
export function tryApply(r: Run, a: Act): Run | null {
  const next = structuredClone(r);
  try { apply(next, a); return next; } catch (e) { if (e instanceof GameError) return null; throw e; }
}

export interface Summary { days: number; total: number; peak: number; big: number; rounds: number; ending: Run['ending']; free: boolean }
export const summary = (r: Run): Summary => ({ days: r.days, total: r.paid + r.cash, peak: r.peak, big: r.big, rounds: r.rounds, ending: r.ending, free: r.free });

/** the server's check: play the whole log again from the seed */
export function replay(seed: string, log: Act[]): Run {
  const r = newRun(seed);
  for (const a of log) apply(r, a);
  return r;
}
