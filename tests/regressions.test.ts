import { describe, expect, it } from 'vitest';
import { newRun, tryApply, DAY_MS, deadline, makeRng, seedState, type Ctx } from '../src/core/index.ts';
import { crash, CRASH_COUNTDOWN, crashTime } from '../src/core/games/crash.ts';
import { roulette, type RouletteBet } from '../src/core/games/roulette.ts';

const ctx: Ctx = { t: 0, pre: undefined, take() {}, armed: () => false };

describe('gameplay regressions', () => {
  it('does not settle a rocket beyond the day deadline', () => {
    const r = tryApply(newRun('33'.repeat(16)), [0, 'n'])!;
    r.game = { id: 'crash', stake: 100, t0: DAY_MS - CRASH_COUNTDOWN - crashTime(2), s: { stake: 100, t0: DAY_MS - CRASH_COUNTDOWN - crashTime(2), crash: 10, auto: 5 } };
    const lateTick = tryApply(r, [DAY_MS + 60000, 'x'])!;
    expect(lateTick.game).not.toBeNull();
    const ended = tryApply(lateTick, [DAY_MS + 60001, 'e'])!;
    const direct = tryApply(r, [DAY_MS, 'e'])!;
    expect(ended.cash).toBe(direct.cash);
    expect(ended.last?.s.out).toBe(direct.last?.s.out);
    expect(ended.last?.t).toBe(deadline(r));
  });

  it('rejects NaN and infinite auto cash-out values', () => {
    for (const auto of [NaN, Infinity, -Infinity]) expect(() => crash.start(100, { auto }, makeRng(seedState('44'.repeat(16))), ctx)).toThrow();
  });

  it('accepts all 49 roulette board positions in one spin', () => {
    const bets: RouletteBet[] = Array.from({ length: 37 }, (_, n) => ['n', n, 10]);
    for (const k of ['red', 'black', 'odd', 'even', 'low', 'high'] as const) bets.push([k, 0, 10]);
    for (const k of ['dz', 'col'] as const) for (let n = 0; n < 3; n++) bets.push([k, n, 10]);
    expect(bets).toHaveLength(49);
    const result = roulette.start(490, { bets }, makeRng(seedState('55'.repeat(16))), ctx);
    expect(result.done).toBe(true);
    expect(Number.isFinite(result.pay)).toBe(true);
  });

  it('refused actions preserve the run and random generator', () => {
    const r = tryApply(newRun('66'.repeat(16)), [0, 'n'])!;
    const before = structuredClone(r);
    expect(tryApply(r, [1, 's', 'coin', 1000, { side: 0 }])).toBeNull();
    expect(r).toEqual(before);
  });
});
