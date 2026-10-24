/* The shared leaderboard, kept in the game's own GitHub repository (the Patronnik scheme):
   - data/lb.json names a locked issue and carries a public token that can only write issue comments there;
   - when a run starts, the page posts a start mark: a fresh per-run key and the hash of the run's seed (GitHub stamps the time);
   - when it ends, the page posts the result signed with the player's account key and the run key: the seed and the whole
     action log, deflated;
   - .github/workflows/scores.yml replays the log with the game's own rules (scripts/lb.mjs), writes data/scores.json and
     deletes the comments.
   Without GitHub (localhost, a fork without the token) the table is this device's own. */
import { create } from 'zustand';
import { store, b64, unb64, hex, sha256hex } from './storage.ts';
import { type Account, getAcct, setAcct, normNick, pubOf, signStr } from './account.ts';
import { FAKE, HOME, codeReady, getCode, secureBytes } from './guard.ts';
import type { Act, Summary } from '../core/index.ts';

export const RESULT_V = 1;
const OUTBOX = 'dt-outbox';
const LOCAL = 'dt-top';
const MAX_BODY = 60000;

export interface Row { id: string; nick: string; days: number; total: number; peak: number; big: number; at: string | number; pend?: boolean }
export type Ack = 'ok' | 'low' | 'key' | 'bad' | 'bot' | 'old' | 'nostart' | 'time';
interface Cfg { issue: number; tok: string }
interface Players { [id: string]: { nick: string; key: string } }

export interface LbState {
  mode: 'loading' | 'gh' | 'local';
  rows: Row[];
  players: Players;
  acks: Record<string, Ack>;
  cfg: Cfg | null;
  acct: Account | null;
  /** sending | sent | offline | ack:<code> */
  status: string;
  pending: Outbox | null;
}

export interface RunMark { g: string; jwk: JsonWebKey }
export interface Outbox { nonce: string; sum: Summary; seed: string; log: string; t: number; g: string; gs: string; sent?: boolean }

export const useLb = create<LbState>(() => ({ mode: 'loading', rows: [], players: {}, acks: {}, cfg: null, acct: getAcct(), status: '', pending: null }));

/** "owner/repo" from a *.github.io address, or VITE_LB_REPO */
export function repoOf(): string {
  const env = (import.meta.env.VITE_LB_REPO as string | undefined) || '';
  if (env) return env;
  const h = location.hostname;
  if (!/\.github\.io$/i.test(h)) return '';
  const owner = h.split('.')[0], seg = location.pathname.split('/').filter(Boolean)[0];
  return seg && !/\.html?$/i.test(seg) ? `${owner}/${seg}` : `${owner}/${h}`;
}

const deobf = (s: string) => { const k = 'debt-tower-lb', b = atob(s.split('').reverse().join('')); let o = ''; for (let i = 0; i < b.length; i++) o += String.fromCharCode(b.charCodeAt(i) ^ k.charCodeAt(i % k.length)); return o; };

/** a file from the repository: through the API first (fresh), else raw.githubusercontent (cached a few minutes) */
async function repoFile<T>(path: string): Promise<T> {
  const repo = repoOf();
  if (!repo) throw new Error('no repo');
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, { headers: { Accept: 'application/vnd.github.raw' }, cache: 'no-store' });
    if (r.ok) return await r.json();
  } catch { /* rate limit or offline */ }
  const r = await fetch(`https://raw.githubusercontent.com/${repo}/main/${path}?t=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) throw new Error('no file');
  return r.json();
}

export const canSend = () => {
  const s = useLb.getState();
  return s.mode === 'gh' && !!s.cfg?.tok && !!s.cfg?.issue && !!crypto?.subtle && HOME && !!getCode() && !FAKE;
};

export function localTop(): Row[] {
  try { const t = JSON.parse(store.get(LOCAL) || '[]'); return Array.isArray(t) ? t : []; } catch { return []; }
}
export function localAdd(nick: string, sum: Summary) {
  const t = localTop();
  t.push({ id: String(Date.now()), nick, days: sum.days, total: sum.total, peak: sum.peak, big: sum.big, at: Date.now() });
  t.sort((a, b) => b.days - a.days || b.total - a.total);
  store.set(LOCAL, JSON.stringify(t.slice(0, 20)));
}

export async function load() {
  try {
    const j = await repoFile<{ scores: Row[]; players: Players; acks: Record<string, Ack> }>('data/scores.json');
    if (!j || !Array.isArray(j.scores)) throw new Error('bad table');
    let cfg = useLb.getState().cfg;
    if (!cfg) { try { cfg = await repoFile<Cfg>('data/lb.json'); } catch { cfg = null; } }
    useLb.setState({ mode: 'gh', rows: j.scores, players: j.players || {}, acks: j.acks || {}, cfg });
    const p = useLb.getState().pending;
    if (p && j.acks?.[p.nonce]) settle(j.acks[p.nonce]);
  } catch {
    if (useLb.getState().mode === 'loading') useLb.setState({ mode: 'local' });
  }
}

function settle(ack: Ack) {
  store.set(OUTBOX, null);
  if (ack === 'key') { setAcct(null); useLb.setState({ acct: null }); }
  useLb.setState({ pending: null, status: 'ack:' + ack });
}

async function post(body: string) {
  const s = useLb.getState();
  const r = await fetch(`https://api.github.com/repos/${repoOf()}/issues/${s.cfg!.issue}/comments`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + deobf(s.cfg!.tok), Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
}

/** One run = one key. The start mark carries the key's public half and the hash of the seed; GitHub's comment time
   is the proof of when the run began. The run's result must be signed with the private half and reveal the seed. */
export async function markStart(seed: string): Promise<RunMark | null> {
  await Promise.all([codeReady, loaded]);
  if (!canSend()) return null;
  try {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const raw = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
    const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
    const g = hex(secureBytes(12));
    await post(JSON.stringify({ start: { g, gk: b64(raw), sh: await sha256hex(seed) } }));
    return { g, jwk };
  } catch { return null; }
}

async function deflate(s: string): Promise<string> {
  const cs = new Blob([s]).stream().pipeThrough(new CompressionStream('deflate'));
  return b64(new Uint8Array(await new Response(cs).arrayBuffer()));
}
export async function inflate(s: string): Promise<string> {
  const ds = new Blob([unb64(s) as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Response(ds).text();
}

/** the core of a result the run key signs (the server rebuilds the same string) */
export const runCore = (o: { g: string; seed: string; log: string; sum: Summary }) =>
  JSON.stringify({ g: o.g, seed: o.seed, log: o.log, sum: o.sum });

/** a finished run: kept in the outbox until GitHub has it */
export async function submitRun(seed: string, log: Act[], sum: Summary, mark: RunMark | null) {
  const a = useLb.getState().acct;
  localAdd(a ? a.nick : '—', sum);
  if (!mark || useLb.getState().mode !== 'gh') return;
  const packed = await deflate(JSON.stringify(log));
  const ob: Outbox = { nonce: hex(secureBytes(12)), sum, seed, log: packed, t: Date.now(), g: mark.g, gs: '' };
  try {
    const key = await crypto.subtle.importKey('jwk', mark.jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    ob.gs = b64(new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(runCore(ob)))));
  } catch { return; }
  store.set(OUTBOX, JSON.stringify(ob));
  await flushOutbox();
}

export async function flushOutbox() {
  let ob: Outbox | null = null;
  try { ob = JSON.parse(store.get(OUTBOX) || 'null'); } catch { ob = null; }
  const a = useLb.getState().acct;
  if (!ob || !a || !canSend()) { if (ob) useLb.setState({ pending: ob }); return; }
  useLb.setState({ pending: ob });
  if (ob.sent) { pollAck(); return; }
  useLb.setState({ status: 'sending' });
  try {
    const p = JSON.stringify({ v: RESULT_V, nick: a.nick, nonce: ob.nonce, t: ob.t, code: getCode(), g: ob.g, gs: ob.gs, seed: ob.seed, sum: ob.sum, log: ob.log });
    const body = JSON.stringify({ p, s: await signStr(a, p), k: pubOf(a) });
    if (body.length <= MAX_BODY) await post(body);
    else {   // a long run goes in parts; the server joins them by the nonce
      const n = Math.ceil(body.length / MAX_BODY);
      for (let i = 0; i < n; i++) await post(JSON.stringify({ part: { id: ob.nonce, i, n, d: body.slice(i * MAX_BODY, (i + 1) * MAX_BODY) } }));
    }
    ob.sent = true;
    store.set(OUTBOX, JSON.stringify(ob));
    useLb.setState({ status: 'sent' });
    pollAck();
  } catch {
    useLb.setState({ status: 'offline' });
  }
}

let pollT: ReturnType<typeof setTimeout> | undefined;
function pollAck() {
  clearTimeout(pollT);
  let k = 0;
  const step = () => {
    if (!useLb.getState().pending || k++ > 12) return;
    load().finally(() => { if (useLb.getState().pending) pollT = setTimeout(step, k < 4 ? 15000 : 30000); });
  };
  pollT = setTimeout(step, 20000);
}

export type LoginErr = 'badNick' | 'taken' | 'short' | 'noCrypto';
export async function login(nick: string, pass: string, derive: (n: string, p: string) => Promise<Account>): Promise<{ ok: true; returning: boolean; nick: string } | { ok: false; err: LoginErr }> {
  try {
    const a = await derive(nick, pass), who = useLb.getState().players[normNick(nick)];
    if (who && who.key !== pubOf(a)) return { ok: false, err: 'taken' };
    if (!who && pass.length < 6) return { ok: false, err: 'short' };
    if (who?.nick) a.nick = who.nick;
    setAcct(a);
    useLb.setState({ acct: a, status: '' });
    flushOutbox();
    return { ok: true, returning: !!who, nick: a.nick };
  } catch { return { ok: false, err: 'noCrypto' }; }
}
export function logout() { setAcct(null); useLb.setState({ acct: null, status: '' }); }

let loaded: Promise<void> = Promise.resolve();
export function boot() {
  loaded = load();
  loaded.then(() => { flushOutbox(); });
  setInterval(() => { if (!document.hidden && !useLb.getState().pending) load(); }, 180000);
}
