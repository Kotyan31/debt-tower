import { describe, it, expect } from 'vitest';
import { makeRng, seedState, type Ctx, type GameDef } from '../src/core/index.ts';
import { GAMES } from '../src/core/games/index.ts';
import { SLOT_WEIGHTS, slotMult } from '../src/core/games/slots.ts';
import { KENO_PAY, KENO_N, KENO_DRAW } from '../src/core/games/keno.ts';
import { PLINKO, PLINKO_ROWS } from '../src/core/games/plinko.ts';
import { WHEELS } from '../src/core/games/wheel.ts';
import { MW_SEGMENTS, MW_KINDS } from '../src/core/games/moneywheel.ts';
import { pokerHand } from '../src/core/games/poker.ts';
import { bjHint } from '../src/core/games/blackjack.ts';
import { crashMult, crashTime } from '../src/core/games/crash.ts';

const C = (n: number, k: number) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; };
const ctx = (pre?: unknown, t = 0): Ctx => ({ t, pre, take() {}, armed: () => false });

describe('exact return-to-player of the fixed tables', () => {
  it('slots', () => {
    const tot = SLOT_WEIGHTS.reduce((a, b) => a + b, 0);
    let rtp = 0;
    for (let a = 0; a < 7; a++) for (let b = 0; b < 7; b++) for (let c = 0; c < 7; c++)
      rtp += (SLOT_WEIGHTS[a] * SLOT_WEIGHTS[b] * SLOT_WEIGHTS[c]) / tot ** 3 * slotMult([a, b, c]);
    expect(rtp).toBeGreaterThan(0.93); expect(rtp).toBeLessThan(0.98);
  });
  it('keno', () => {
    for (let k = 1; k <= 8; k++) {
      let rtp = 0;
      for (let h = 0; h <= k; h++) rtp += (C(KENO_DRAW, h) * C(KENO_N - KENO_DRAW, k - h)) / C(KENO_N, k) * KENO_PAY[k][h];
      expect(rtp, `keno ${k}`).toBeGreaterThan(0.93); expect(rtp, `keno ${k}`).toBeLessThan(0.98);
    }
  });
  it('plinko', () => {
    for (const row of PLINKO) {
      let rtp = 0;
      row.forEach((m, k) => { rtp += C(PLINKO_ROWS, k) / 2 ** PLINKO_ROWS * m; });
      expect(rtp).toBeGreaterThan(0.95); expect(rtp).toBeLessThan(0.98);
    }
  });
  it('wheel', () => {
    for (const w of WHEELS) { const rtp = w.reduce((a, b) => a + b, 0) / w.length; expect(rtp).toBeGreaterThan(0.95); expect(rtp).toBeLessThan(0.98); }
  });
  it('money wheel', () => {
    expect(MW_SEGMENTS.length).toBe(60);
    for (const k of MW_KINDS) { const rtp = MW_SEGMENTS.filter(x => x === k).length * (k + 1) / 60; expect(rtp).toBeGreaterThan(0.84); expect(rtp).toBeLessThan(0.98); }
  });
});

/** plays a game many times with a fixed simple strategy, returns paid / staked */
function simulate(g: GameDef, rounds: number, opts: unknown, strategy: (s: any) => [string, unknown]): number {
  const rng = makeRng(seedState('0123456789abcdef0123456789abcdef'));
  let staked = 0, paid = 0;
  for (let i = 0; i < rounds; i++) {
    const pre = g.prep?.(rng);
    let st = g.start(100, opts, rng, ctx(pre));
    staked += 100;
    let guard = 0;
    while (!st.done) {
      const [a, arg] = strategy(st.s);
      st = g.act!(st.s, a, arg, rng, ctx(pre));
      if (st.extra) staked += st.extra;
      if (++guard > 100) throw new Error('loop');
    }
    paid += st.pay!;
  }
  return paid / staked;
}

describe('simulated return-to-player', () => {
  const N = 200000;
  const near = (x: number, lo: number, hi: number) => { expect(x).toBeGreaterThan(lo); expect(x).toBeLessThan(hi); };
  it('coin', () => near(simulate(GAMES.coin, N, { side: 0 }, () => ['', 0]), 0.95, 0.99));
  it('duck', () => near(simulate(GAMES.duck, N, { pick: 2 }, () => ['', 0]), 0.9, 0.98));
  it('craps', () => near(simulate(GAMES.craps, N, {}, () => ['roll', 0]), 0.97, 1.0));
  it('hilo (3 guesses on the likelier side)', () => near(simulate(GAMES.hilo, N, {}, s => s.steps >= 3 ? ['cash', 0] : [((s.cur % 13) + 1) <= 7 ? 'hi' : 'lo', 0]), 0.95, 0.99));
  it('blackjack (basic strategy)', () => near(simulate(GAMES.blackjack, N, {}, s => [bjHint(s), 0]), 0.96, 1.01));
  it('roulette', () => near(simulate(GAMES.roulette, N, { bets: [['red', 0, 100]] }, () => ['', 0]), 0.96, 0.99));
  it('mines (3 mines, 4 picks)', () => near(simulate(GAMES.mines, N, { mines: 3 }, s => s.open.length >= 4 ? ['cash', 0] : ['pick', [...Array(25).keys()].find(i => !s.open.includes(i))]), 0.95, 0.99));
  it('penguin (medium, 5 lanes)', () => near(simulate(GAMES.penguin, N, { diff: 1 }, s => s.lane >= 5 ? ['cash', 0] : ['go', 0]), 0.95, 0.99));
  it('dragon (easy, 4 floors)', () => near(simulate(GAMES.dragon, N, { diff: 0 }, s => s.level >= 4 ? ['cash', 0] : ['pick', 0]), 0.95, 0.99));
  it('baccarat banker', () => near(simulate(GAMES.baccarat, N, { side: 'b' }, () => ['', 0]), 0.97, 1.0));
  it('baccarat player', () => near(simulate(GAMES.baccarat, N, { side: 'p' }, () => ['', 0]), 0.97, 1.0));
});

describe('rules', () => {
  it('poker hands', () => {
    const c = (r: number, s: number) => s * 13 + r - 1;
    expect(pokerHand([c(1, 0), c(13, 0), c(12, 0), c(11, 0), c(10, 0)])).toBe(9);
    expect(pokerHand([c(1, 0), c(2, 1), c(3, 0), c(4, 0), c(5, 0)])).toBe(4);
    expect(pokerHand([c(11, 0), c(11, 1), c(3, 0), c(4, 2), c(9, 0)])).toBe(1);
    expect(pokerHand([c(10, 0), c(10, 1), c(3, 0), c(4, 2), c(9, 0)])).toBe(0);
    expect(pokerHand([c(7, 0), c(7, 1), c(7, 2), c(4, 2), c(4, 0)])).toBe(6);
  });
  it('crash curve inverts', () => {
    for (const m of [1.01, 1.5, 2, 5, 10, 50, 100]) {
      const ms = crashTime(m);
      expect(crashMult(ms)).toBeGreaterThanOrEqual(m - 1e-9);
      expect(crashMult(ms - 2)).toBeLessThan(m);
    }
  });
});
