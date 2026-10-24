import { describe, expect, it } from 'vitest';
import { rankRows, validRows, type ScoreRow } from '../src/net/leaderboard-data.ts';

const row = (id: string, days: number, total: number, peak = total): ScoreRow => ({ id, nick: id, days, total, peak, big: 10, at: 1 });
describe('leaderboard data', () => {
  it('ignores malformed local storage instead of crashing the leaderboard', () => {
    expect(validRows(null)).toEqual([]);
    expect(validRows({ scores: [] })).toEqual([]);
    expect(validRows([null, {}, row('ok', 1, 10), { ...row('bad', 1, 10), peak: NaN }])).toEqual([row('ok', 1, 10)]);
  });
  it('sorts days lexicographically without losing precision with large balances', () => {
    const rows = [row('one', 1, 1e17), row('two', 2, 10)];
    expect(rankRows(rows, 'days').map(r => r.id)).toEqual(['two', 'one']);
    expect(rows[0].id).toBe('one');
  });
  it('supports separate bankroll and best-win rankings', () => {
    const rows = [row('a', 1, 10, 100), { ...row('b', 2, 20), big: 200 }];
    expect(rankRows(rows, 'peak')[0].id).toBe('a');
    expect(rankRows(rows, 'big')[0].id).toBe('b');
  });
});
