import { describe, it, expect } from 'vitest';
import { newRun, tryApply, replay, summary, DAY_MS, type Run } from '../src/core/index.ts';
import { botRun } from './bot.ts';

describe('run', () => {
  it('replays to the same numbers', () => {
    for (let i = 0; i < 20; i++) {
      const seed = (i.toString(16).padStart(2, '0')).repeat(16);
      const { run, log } = botRun(seed, i + 1);
      expect(log.length).toBeGreaterThan(5);
      const again = replay(seed, JSON.parse(JSON.stringify(log)));
      expect(summary(again)).toEqual(summary(run));
      expect(again.cash).toBe(run.cash);
    }
  });

  it('a different seed gives a different run', () => {
    let differ = 0;
    for (let i = 0; i < 10; i++) {
      const seed = (i + 0x30).toString(16).repeat(16), { run, log } = botRun(seed, 99 + i);
      let other: Run | null = null;
      try { other = replay('cd'.repeat(16), log); } catch { other = null; }
      if (!other || JSON.stringify(summary(other)) !== JSON.stringify(summary(run))) differ++;
    }
    expect(differ).toBeGreaterThanOrEqual(8);
  });

  it('refuses what the rules forbid', () => {
    let r = newRun('11'.repeat(16));
    expect(tryApply(r, [0, 's', 'slots', 10, {}])).toBeNull();        // the day has not begun
    r = tryApply(r, [0, 'n'])!;
    const table = r.tables[0];
    expect(tryApply(r, [10, 's', table, 5, {}])).toBeNull();           // under the floor's minimum
    expect(tryApply(r, [10, 's', table, 501, {}])).toBeNull();         // over its maximum
    expect(tryApply(r, [10, 's', 'poker', 10, {}])).toBeNull();        // a table not on this floor
    expect(tryApply(r, [10, 'f', 3])).toBeNull();                      // a locked floor
    expect(tryApply(r, [DAY_MS + 5, 's', 'coin', 10, { side: 0 }])).toBeNull();   // after the bell
    const coin = tryApply(r, [10, 's', 'coin', 10, { side: 0 }]);
    if (r.tables.includes('coin')) {
      expect(coin).not.toBeNull();
      expect(tryApply(coin!, [20, 's', 'coin', 10, { side: 0 }])).toBeNull();     // still flipping
      expect(tryApply(coin!, [5, 'x'])).toBeNull();                               // time going backwards
    }
  });

  it('pays the shark and ends a broke run', () => {
    let r = newRun('22'.repeat(16));
    r = tryApply(r, [0, 'n'])!;
    r = tryApply(r, [1000, 'e'])!;
    expect(r.phase).toBe('shark');
    r.cash = r.quota - 1;
    r = tryApply(r, [1100, 'p'])!;
    expect(r.phase).toBe('over');
    expect(r.ending).toBe('broke');
  });
});
