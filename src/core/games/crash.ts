import { type GameDef, type Step, fail, payOf } from '../types.ts';

/** The rocket climbs and blows up at a point drawn at launch: P(crash ≥ m) = 0.97 / m.
   The multiplier follows a polynomial of flight time, so client and server compute it exactly alike. */
export const CRASH_EDGE = 0.97;
export const CRASH_CAP = 100;
export const CRASH_COUNTDOWN = 1200;
const A = 0.0095, B = 0.06;

/** multiplier after ms of flight */
export const crashMult = (ms: number) => { const s = ms / 1000; return 1 + B * s + A * s * s; };
/** ms of flight until the multiplier reaches m */
export const crashTime = (m: number) => Math.ceil(((-B + Math.sqrt(B * B + 4 * A * (m - 1))) / (2 * A)) * 1000);
const floor2 = (x: number) => Math.floor(x * 100 + 1e-9) / 100;

export interface CrashS { stake: number; t0: number; crash: number; auto: number; out?: number; hint?: boolean; end?: number }

const flight = (s: CrashS, t: number) => t - s.t0 - CRASH_COUNTDOWN;

export const crash: GameDef<CrashS, { auto?: number }> = {
  id: 'crash',
  start(bet, o, rng, ctx) {
    const auto = o?.auto == null ? 0 : o.auto;
    if (typeof auto !== 'number' || (auto !== 0 && (auto < 1.01 || auto > CRASH_CAP))) fail('auto');
    const u = rng.next();
    const crash = Math.max(1, Math.min(CRASH_CAP, floor2(CRASH_EDGE / (1 - u))));
    return { s: { stake: bet, t0: ctx.t, crash, auto: floor2(auto) }, anim: 0 };
  },
  settle(s, t) {
    if (s.auto && s.auto < s.crash && flight(s, t) >= crashTime(s.auto)) { s.out = s.auto; s.end = s.t0 + CRASH_COUNTDOWN + crashTime(s.auto); return { s, done: true, pay: payOf(s.stake, s.auto), anim: 900 }; }
    if (flight(s, t) >= crashTime(s.crash)) { s.end = s.t0 + CRASH_COUNTDOWN + crashTime(s.crash); return { s, done: true, pay: 0, anim: 1300 }; }
    return null;
  },
  act(s, a, _arg, _rng, ctx): Step<CrashS> {
    if (a === 'crystal') { if (s.hint) fail('used'); ctx.take('crystal'); s.hint = true; return { s, anim: 0 }; }
    if (a !== 'cash') fail('act');
    const f = flight(s, ctx.t);
    if (f < 0) fail('not yet');
    const m = floor2(crashMult(f));
    if (m >= s.crash) { s.end = ctx.t; return { s, done: true, pay: 0, anim: 1300 }; }
    s.out = m; s.end = ctx.t;
    return { s, done: true, pay: payOf(s.stake, m), anim: 900 };
  },
  timeout(s, t) {
    const f = Math.max(0, flight(s, t)), m = floor2(crashMult(f));
    s.out = m < s.crash ? m : undefined; s.end = t;
    return { s, done: true, pay: s.out ? payOf(s.stake, s.out) : 0, anim: 0 };
  },
};
