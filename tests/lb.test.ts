import { describe, it, expect } from 'vitest';
import { createHash, generateKeyPairSync, sign as csign } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { tryApply, summary, replay, RUN_V, type Act, type Run } from '../src/core/index.ts';
// @ts-expect-error plain JS module without types
import { handleAll, freshTable, finish } from '../scripts/lb.mjs';
import { botRun } from './bot.ts';

const CODE = 'c0de'.repeat(8);

function keyPair() {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const raw = publicKey.export({ format: 'jwk' });
  const pub = Buffer.concat([Buffer.from([4]), Buffer.from(raw.x!, 'base64url'), Buffer.from(raw.y!, 'base64url')]).toString('base64');
  const signB64 = (s: string) => csign('sha256', Buffer.from(s), { key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64');
  return { pub, sign: signB64 };
}

/** plays a bot run to its end, the way the page would */
function finished(seed: string, salt: number): { run: Run; log: Act[] } {
  let { run, log } = botRun(seed, salt);
  let t = run.t;
  for (let i = 0; i < 10 && run.phase !== 'over'; i++) {
    t += 1000;
    const op = run.phase === 'day' ? 'e' : run.phase === 'shark' ? 'p' : 'q';
    const a: Act = [t, op];
    const next = tryApply(run, a);
    if (!next) break;
    run = next; log = [...log, a];
  }
  return { run, log };
}

let cid = 1;
function comments(o: { seed: string; log: Act[]; run: Run; nick?: string; acct?: ReturnType<typeof keyPair>; tamper?: (p: any) => void; took?: number }) {
  const acct = o.acct ?? keyPair(), runKey = keyPair();
  const g = (cid++).toString(16).padStart(24, 'a'), t0 = Date.parse('2026-10-01T10:00:00Z');
  const start = { id: cid++, created_at: new Date(t0).toISOString(), body: JSON.stringify({ start: { g, gk: runKey.pub, sh: createHash('sha256').update(o.seed).digest('hex') } }) };
  const sum = summary(o.run);
  const log = deflateSync(Buffer.from(JSON.stringify(o.log))).toString('base64');
  const gs = runKey.sign(JSON.stringify({ g, seed: o.seed, log, sum }));
  const took = o.took ?? o.run.t + 30000;
  const p: any = { v: 1, rules: RUN_V, nick: o.nick ?? 'Tester', nonce: 'f'.repeat(8) + (cid++).toString(16).padStart(8, '0'), t: t0 + took, code: CODE, g, gs, seed: o.seed, sum, log };
  o.tamper?.(p);
  const ps = JSON.stringify(p);
  const result = { id: cid++, created_at: new Date(t0 + took).toISOString(), body: JSON.stringify({ p: ps, s: acct.sign(ps), k: acct.pub }) };
  return { list: [start, result], nonce: p.nonce, acct };
}

const table = () => freshTable({ code: [CODE] });

describe('leaderboard worker', () => {
  const seed = '5e'.repeat(16);
  const honest = finished(seed, 3);

  it('takes an honest run and registers the nick', () => {
    const t = table();
    const c = comments({ seed, ...honest });
    const { done } = handleAll(c.list, t, '2026-10-01T11:00:00Z');
    expect(done.length).toBe(2);
    expect(t.acks[c.nonce]).toBe('ok');
    expect(t.players.tester.key).toBe(c.acct.pub);
    expect(finish(t).scores[0]).toMatchObject({ id: 'tester', days: honest.run.days, peak: honest.run.peak });
  });

  it('rejects a claimed summary the log does not produce', () => {
    const t = table();
    const c = comments({ seed, ...honest, tamper: p => { p.sum = { ...p.sum, days: p.sum.days + 5 }; } });
    handleAll(c.list, t, 'now');
    expect(t.acks[c.nonce]).toBe('bad');   // the run-key signature no longer covers it
    expect(t.scores.length).toBe(0);
  });

  it('rejects a log replayed with another seed', () => {
    const t = table();
    const c = comments({ seed: '77'.repeat(16), ...honest, run: honest.run });
    handleAll(c.list, t, 'now');
    expect(t.acks[c.nonce]).toBe('bad');
  });

  it('rejects a result sent sooner than the run takes', () => {
    const t = table();
    const log = honest.log.map(([time, ...rest]) => [time + 60000, ...rest] as Act);
    const c = comments({ seed, log, run: replay(seed, log), took: 1000 });
    handleAll(c.list, t, 'now');
    expect(t.acks[c.nonce]).toBe('time');
  });

  it('turns away an old page version and a nick held by another password', () => {
    const t = table();
    const old = comments({ seed, ...honest, tamper: p => { p.code = 'f'.repeat(32); } });
    handleAll(old.list, t, 'now');
    expect(t.acks[old.nonce]).toBe('old');

    const first = comments({ seed, ...honest, nick: 'Kotyan' });
    handleAll(first.list, t, 'now');
    expect(t.acks[first.nonce]).toBe('ok');
    const thief = comments({ seed: '9a'.repeat(16), ...finished('9a'.repeat(16), 5), nick: 'kotyan' });
    handleAll(thief.list, t, 'now');
    expect(t.acks[thief.nonce]).toBe('key');
  });

  it('joins a long run sent in parts', () => {
    const t = table();
    const c = comments({ seed, ...honest });
    const result = c.list[1];
    const body = result.body, n = 3, size = Math.ceil(body.length / n);
    const nonce = JSON.parse(JSON.parse(body).p).nonce;
    const parts = Array.from({ length: n }, (_, i) => ({ id: 900 + i, created_at: result.created_at, body: JSON.stringify({ part: { id: nonce, i, n, d: body.slice(i * size, (i + 1) * size) } }) }));
    const { done } = handleAll([c.list[0], parts[2], parts[0], parts[1]], t, 'now');
    expect(t.acks[c.nonce]).toBe('ok');
    expect(done).toEqual(expect.arrayContaining([900, 901, 902]));
  });
});
