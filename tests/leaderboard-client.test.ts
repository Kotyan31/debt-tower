import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const saved = vi.hoisted(() => new Map<string, string>());
vi.mock('../src/net/storage.ts', () => ({
  store: { get: (k: string) => saved.get(k) ?? null, set: (k: string, v: string | null) => v == null ? saved.delete(k) : saved.set(k, v) },
  b64: () => '', unb64: () => new Uint8Array(), hex: () => '', sha256hex: async () => '',
}));
vi.mock('../src/net/account.ts', () => ({ getAcct: () => null, setAcct() {}, normNick: (s: string) => s.toLowerCase(), pubOf: () => 'key', signStr: async () => 'sig' }));
vi.mock('../src/net/guard.ts', () => ({ FAKE: false, HOME: true, codeReady: Promise.resolve('code'), getCode: () => 'code', secureBytes: () => new Uint8Array(12) }));
vi.mock('../src/i18n/index.ts', () => ({ dictNow: () => ({ lb: { guest: 'Guest' } }) }));
import { localAdd, localTop, load, useLb, submitRun } from '../src/net/leaderboard.ts';

const sum = { days: 1, total: 500, peak: 800, big: 50, rounds: 4, ending: 'retired' as const, free: false };
beforeEach(() => {
  saved.clear();
  vi.stubGlobal('location', { hostname: 'kotyan31.github.io', pathname: '/debt-tower/' });
  useLb.setState({ mode: 'loading', rows: [], localRows: [], cfg: null, acct: null, status: '', pending: null });
});
afterEach(() => vi.unstubAllGlobals());

describe('leaderboard client regressions', () => {
  it('keeps local scores visible while the shared table is connected', () => {
    useLb.setState({ mode: 'gh' });
    localAdd('Tester', sum, 'run-1');
    expect(useLb.getState().localRows).toHaveLength(1);
    expect(useLb.getState().localRows[0].nick).toBe('Tester');
  });
  it('does not duplicate a result retried after a late start mark', () => {
    localAdd('Tester', sum, 'same-run'); localAdd('Tester', sum, 'same-run');
    expect(localTop()).toHaveLength(1);
  });
  it('saves a guest result without a server configuration', async () => {
    await submitRun('seed', [], sum, null);
    expect(localTop()[0].nick).toBe('Guest');
    expect(useLb.getState().status).toBe('local');
  });
  it('refreshes missing submission configuration after the owner adds a token', async () => {
    useLb.setState({ cfg: { issue: 1, tok: '' } });
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, json: async () => url.includes('scores.json') ? { scores: [], players: {}, acks: {} } : { issue: 1, tok: 'configured' } })));
    await load();
    expect(useLb.getState().cfg?.tok).toBe('configured');
    expect(useLb.getState().mode).toBe('gh');
  });
  it('retains local records when GitHub is offline', async () => {
    localAdd('Tester', sum, 'offline-run');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    await load();
    expect(useLb.getState().mode).toBe('local');
    expect(useLb.getState().localRows).toHaveLength(1);
  });
});
