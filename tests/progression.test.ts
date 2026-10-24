import { describe, expect, it } from 'vitest';
import { newRun, tryApply, FLOORS, quotaFor, replay, summary, floorUnlocked, type Act } from '../src/core/index.ts';

describe('accessible tower progression', () => {
  it('opens every floor through ordinary minimum bets without a big win', () => {
    const seed = 'ab'.repeat(16), log: Act[] = [[0, 'n']];
    let r = tryApply(newRun(seed), log[0])!;
    for (let round = 1; round <= 24; round++) {
      const a: Act = [round * 4000, 's', 'coin', 10, { side: 0 }];
      r = tryApply(r, a)!; log.push(a);
      expect(r).not.toBeNull();
      if (round === 4) expect(r.unlocked).toBeGreaterThanOrEqual(1);
      if (round === 12) expect(r.unlocked).toBeGreaterThanOrEqual(2);
    }
    expect(r.unlocked).toBe(3);
    expect(r.cash).toBeGreaterThanOrEqual(800 - 24 * 10);
    expect(summary(replay(seed, log))).toEqual(summary(r));
  });

  it('opens floors on survival or bankroll milestones too', () => {
    for (let i = 1; i < 4; i++) {
      const f = FLOORS[i];
      expect(floorUnlocked(i, { peak: 0, rounds: f.rounds, day: 1 })).toBe(true);
      expect(floorUnlocked(i, { peak: f.unlock, rounds: 0, day: 1 })).toBe(true);
      expect(floorUnlocked(i, { peak: 0, rounds: 0, day: f.day })).toBe(true);
      expect(floorUnlocked(i, { peak: 0, rounds: f.rounds - 1, day: 1 })).toBe(false);
    }
  });

  it('always seats each upper floor’s four signature games', () => {
    for (let seed = 0; seed < 25; seed++) for (let floor = 1; floor < 4; floor++) {
      const r = tryApply(newRun(seed.toString(16).padStart(2, '0').repeat(16)), [0, 'n'])!;
      r.unlocked = 3;
      const next = tryApply(r, [1, 'f', floor])!;
      expect(next.tables).toHaveLength(5);
      expect(new Set(next.tables).size).toBe(5);
      expect(next.tables).toEqual(expect.arrayContaining(FLOORS[floor].pool.slice(0, 4)));
    }
  });

  it('leaves a playable bankroll after the first quota', () => {
    let r = tryApply(newRun('aa'.repeat(16)), [0, 'n'])!;
    r = tryApply(r, [1, 'e'])!;
    r = tryApply(r, [2, 'p'])!;
    expect(r.cash).toBe(500);
    expect(r.phase).toBe('shop');
    expect(quotaFor(1)).toBe(300);
    expect(quotaFor(2)).toBe(375);
    expect(FLOORS.every(f => f.min <= 50)).toBe(true);
  });
});
