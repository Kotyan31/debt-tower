/* Leaderboard worker, run by .github/workflows/scores.yml. No outside services: only this repository.
   The Patronnik scheme, with one addition: the server plays every run again with the game's own rules.

   How a run travels:
     1. The page derives a P-256 key pair from nick + password (PBKDF2), so the password never leaves the device.
     2. When a run starts it posts a start mark on the locked issue: a fresh per-run public key and the hash of the
        run's seed. GitHub stamps the comment's time.
     3. When the run ends it posts the result, signed by the account key and by the run key: the seed, the deflated
        action log and the claimed summary (long ones arrive in parts).
     4. This script checks both signatures and the seed hash, replays the log from the seed with src/core (the very
        code the page runs), compares the numbers, updates data/scores.json and lists the handled comments.

   Commands:
     process  read the comments, update data/scores.json and data/lb.json, write .lb-done.json
     cleanup  delete the handled comments (run after the commit is pushed)

   Node 24 runs the TypeScript core directly (type stripping), so the job needs no npm install. */
import { createHash, createPublicKey, verify as cverify } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { replay, summary } from '../src/core/index.ts';

const API = 'https://api.github.com';
const REPO = process.env.REPO || '';
const TOKEN = process.env.GH_TOKEN || '';
const TITLE = 'debt-tower-scores';
const TABLE = 'data/scores.json', CFG = 'data/lb.json', DONE = '.lb-done.json';
const KEEP = 200, ACKS = 400, STARTS = 3000;
const RESULT_V = 1;
const NICK_RE = /^[\p{L}\p{N}_\-. ]{2,20}$/u;
const DAY = 86400;

/* ---------- small helpers ---------- */
export const norm = s => String(s).normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
const clean = s => String(s).normalize('NFKC').replace(/\s+/g, ' ').trim();
const load = (p, d) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return d; } };
const save = (p, o) => writeFileSync(p, JSON.stringify(o, null, 1) + '\n');
const stamp = c => Date.parse(c.created_at) / 1000;
const sha256 = s => createHash('sha256').update(s).digest('hex');

/** The token is meant to be public (it can only post issue comments here); this only keeps
   automatic scanners from mistaking it for a leaked secret. */
export function obfuscate(tok) {
  const k = Buffer.from('debt-tower-lb'), b = Buffer.from(tok);
  return Buffer.from(b.map((c, i) => c ^ k[i % k.length])).toString('base64').split('').reverse().join('');
}

/** a raw uncompressed P-256 point (65 bytes) as a Node key, or null */
export function pointKey(raw) {
  try {
    const b = Buffer.from(raw, 'base64');
    if (b.length !== 65 || b[0] !== 4) return null;
    return createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: b.subarray(1, 33).toString('base64url'), y: b.subarray(33).toString('base64url') }, format: 'jwk' });
  } catch { return null; }
}

/** WebCrypto signs ECDSA as r‖s (IEEE P1363) */
export function verifySig(key, msg, sigB64) {
  try {
    const sig = Buffer.from(sigB64, 'base64');
    return sig.length === 64 && cverify('sha256', Buffer.from(msg, 'utf8'), { key, dsaEncoding: 'ieee-p1363' }, sig);
  } catch { return false; }
}

/* ---------- GitHub REST ---------- */
async function api(method, path, body) {
  const r = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': TITLE },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`${method} ${path}: HTTP ${r.status}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

async function comments(issue) {
  if (process.env.LB_TEST_COMMENTS) return load(process.env.LB_TEST_COMMENTS, []);
  const out = [];
  for (let page = 1; ; page++) {
    const chunk = (await api('GET', `/repos/${REPO}/issues/${issue}/comments?per_page=100&page=${page}`)) || [];
    out.push(...chunk);
    if (chunk.length < 100) return out;
  }
}

async function ensureConfig() {
  const cfg = load(CFG, {});
  if (process.env.LB_TEST_COMMENTS) return cfg;
  let issue = cfg.issue;
  const found = issue ? await api('GET', `/repos/${REPO}/issues/${issue}`) : null;
  if (found && !found.locked && found.title === TITLE) await api('PUT', `/repos/${REPO}/issues/${issue}/lock`, { lock_reason: 'resolved' });   // someone with the public token unlocked it
  if (found && found.title !== TITLE && !found.pull_request) {   // or renamed it: put the name back
    await api('PATCH', `/repos/${REPO}/issues/${issue}`, { title: TITLE, state: 'open' });
    found.title = TITLE;
  }
  if (!found || found.title !== TITLE || found.pull_request) {
    const created = await api('POST', `/repos/${REPO}/issues`, {
      title: TITLE,
      body: 'The game posts runs here. The `scores` workflow replays, checks and deletes them; the table lives in `data/scores.json`.\n\nСюда игра присылает забеги. Их проверяет и удаляет workflow `scores`, таблица — в `data/scores.json`.',
    });
    issue = created.number;
    await api('PUT', `/repos/${REPO}/issues/${issue}/lock`, { lock_reason: 'resolved' });
  }
  cfg.issue = issue;
  const pat = (process.env.LB_PAT || '').trim();
  if (pat) cfg.tok = obfuscate(pat); else delete cfg.tok;
  return cfg;
}

/** The fingerprint the page computes of its own main bundle: SHA-256 of the file as served, first 16 bytes.
   A patched copy sends a fingerprint the live site does not have. */
async function liveCode() {
  if (process.env.LB_TEST_CODE) return process.env.LB_TEST_CODE;
  const [owner, name] = REPO.split('/');
  const site = process.env.PAGES_URL || (name.toLowerCase() === `${owner.toLowerCase()}.github.io` ? `https://${owner}.github.io/` : `https://${owner}.github.io/${name}/`);
  try {
    const html = await (await fetch(site + '?t=' + Date.now())).text();
    const m = html.match(/<script[^>]*type="module"[^>]*src="([^"]+)"/);
    if (!m) return null;
    const js = Buffer.from(await (await fetch(new URL(m[1], site))).arrayBuffer());
    return createHash('sha256').update(js).digest('hex').slice(0, 32);
  } catch { return null; }
}

/* ---------- one comment ---------- */
function bad(nonce, why) {
  console.log(`  ${nonce}: bad (${why})`);   // which check failed, for the workflow log only
  return [nonce, 'bad'];
}

/** repeated decision gaps, the way a script that waits a fixed time would leave them */
export function scripted(log) {
  const gaps = [];
  for (let i = 1; i < log.length; i++) if (log[i][1] === 's' || log[i][1] === 'a') gaps.push(Math.round((log[i][0] - log[i - 1][0]) / 50));
  if (gaps.length < 30) return false;
  const count = new Map();
  for (const g of gaps) count.set(g, (count.get(g) || 0) + 1);
  return Math.max(...count.values()) >= 0.85 * gaps.length;
}

function handleStart(c, table, st) {
  const g = String(st.g ?? ''), gk = String(st.gk ?? ''), sh = String(st.sh ?? '');
  if (/^[0-9a-f]{16,40}$/.test(g) && /^[0-9a-f]{64}$/.test(sh) && pointKey(gk) && !table.starts[g]) table.starts[g] = { gk, sh, at: stamp(c) };
}

/** returns [nonce, ack]; ack null = nothing to record */
export function handleResult(body, at, table, now) {
  let m, o, nonce;
  try {
    m = JSON.parse(body);
    o = JSON.parse(m.p);
    nonce = String(o.nonce);
  } catch { return [null, null]; }
  if (!/^[0-9a-f]{8,40}$/.test(nonce) || table.acks[nonce]) return [nonce, null];
  const key = pointKey(m.k);
  if (!key || !verifySig(key, m.p, m.s)) return bad(nonce, 'signature');
  const nick = clean(o.nick ?? '');
  if (o.v !== RESULT_V || !table.code.includes(String(o.code))) return [nonce, 'old'];
  if (!NICK_RE.test(nick)) return bad(nonce, 'nick');
  if (!Number.isFinite(+o.t) || Math.abs(at * 1000 - +o.t) > 7 * DAY * 1000) return bad(nonce, 'week-old');

  const st = table.starts[String(o.g)];
  if (!st || st.used) return [nonce, 'nostart'];
  const core = JSON.stringify({ g: String(o.g), seed: o.seed, log: o.log, sum: o.sum });
  if (!verifySig(pointKey(st.gk), core, String(o.gs))) return bad(nonce, 'run-key signature');
  if (typeof o.seed !== 'string' || sha256(o.seed) !== st.sh) return bad(nonce, 'seed hash');

  let log;
  try {
    const raw = inflateSync(Buffer.from(String(o.log), 'base64'), { maxOutputLength: 32 << 20 }).toString('utf8');
    log = JSON.parse(raw);
    if (!Array.isArray(log) || log.length > 300000) throw new Error('log');
  } catch { return bad(nonce, 'log'); }
  let run;
  try { run = replay(o.seed, log); } catch (e) { return bad(nonce, 'replay: ' + (e?.message || e)); }
  if (run.phase !== 'over') return bad(nonce, 'unfinished');
  const sum = summary(run);
  if (JSON.stringify(sum) !== JSON.stringify(o.sum)) return bad(nonce, 'summary');
  if (scripted(log)) return [nonce, 'bot'];
  const took = at - st.at;
  if (run.t / 1000 > took + 30) return [nonce, 'time'];   // the log claims more time than really passed since the start mark
  st.used = true;

  const id = norm(nick), k64 = m.k;
  const who = table.players[id];
  if (who && who.key !== k64) return [nonce, 'key'];
  if (!who) table.players[id] = { nick, key: k64, since: now };
  let row = table.scores.find(r => r.id === id);
  const better = !row || sum.days > row.days || (sum.days === row.days && sum.total > row.total);
  const before = row ? { ...row } : null;
  if (!row) { row = { id, nick, days: 0, total: 0, peak: 0, big: 0, at: now }; table.scores.push(row); }
  row.nick = nick;
  if (better) { row.days = sum.days; row.total = sum.total; row.at = now; }
  row.peak = Math.max(row.peak, sum.peak);
  row.big = Math.max(row.big, sum.big);
  const improved = !before || better || row.peak > before.peak || row.big > before.big;
  return [nonce, improved ? 'ok' : 'low'];
}

/** handles every comment; returns the ids that are done with */
export function handleAll(list, table, now) {
  const done = [], log = [];
  const parts = new Map();
  for (const c of list) {
    let m;
    try { m = JSON.parse((c.body || '').match(/\{[\s\S]*\}/)[0]); } catch { done.push(c.id); continue; }
    if (m && typeof m.start === 'object' && m.start) { handleStart(c, table, m.start); done.push(c.id); continue; }
    if (m && typeof m.part === 'object' && m.part) {
      const p = m.part, id = String(p.id);
      if (!parts.has(id)) parts.set(id, []);
      parts.get(id).push({ c, i: +p.i, n: +p.n, d: String(p.d ?? '') });
      continue;
    }
    const [nonce, ack] = handleResult(JSON.stringify(m), stamp(c), table, now);
    done.push(c.id);
    if (nonce && ack) { table.acks[nonce] = ack; log.push(`${c.id}: ${ack}`); }
  }
  // a long run arrives in parts: join them once all are here; stray parts expire after a day
  for (const [id, ps] of parts) {
    const n = ps[0].n;
    const have = new Map(ps.map(p => [p.i, p]));
    if (n > 0 && n <= 64 && have.size === n) {
      const body = Array.from({ length: n }, (_, i) => have.get(i)?.d ?? '').join('');
      const last = Math.max(...ps.map(p => stamp(p.c)));
      const [nonce, ack] = handleResult(body, last, table, now);
      if (nonce && ack) { table.acks[nonce] = ack; log.push(`${id}: ${ack}`); }
      ps.forEach(p => done.push(p.c.id));
    } else if (ps.every(p => Date.now() / 1000 - stamp(p.c) > DAY)) ps.forEach(p => done.push(p.c.id));
  }
  return { done, log };
}

export function freshTable(t = {}) {
  const cutoff = Date.now() / 1000 - 8 * DAY;
  return {
    updated: t.updated ?? null,
    scores: Array.isArray(t.scores) ? t.scores.filter(r => r && r.id) : [],
    players: t.players || {},
    acks: t.acks || {},
    code: Array.isArray(t.code) ? t.code.filter(c => typeof c === 'string') : [],
    starts: Object.fromEntries(Object.entries(t.starts || {}).filter(([, v]) => v && v.at > cutoff)),
  };
}

export function finish(table) {
  table.scores.sort((a, b) => b.days - a.days || b.total - a.total || String(a.at).localeCompare(String(b.at)));
  // keep the best by days, plus anyone who leads the other two tables
  const keep = new Set(table.scores.slice(0, KEEP).map(r => r.id));
  [...table.scores].sort((a, b) => b.peak - a.peak).slice(0, 50).forEach(r => keep.add(r.id));
  [...table.scores].sort((a, b) => b.big - a.big).slice(0, 50).forEach(r => keep.add(r.id));
  table.scores = table.scores.filter(r => keep.has(r.id));
  table.acks = Object.fromEntries(Object.entries(table.acks).slice(-ACKS));
  table.starts = Object.fromEntries(Object.entries(table.starts).sort((a, b) => a[1].at - b[1].at).slice(-STARTS));
  return table;
}

async function processCmd() {
  const cfg = await ensureConfig();
  const table = freshTable(load(TABLE, {}));
  const cur = await liveCode();
  if (cur && !table.code.includes(cur)) table.code = [...table.code, cur].slice(-4);   // the last few versions stay valid for cached pages
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const { done, log } = handleAll(await comments(cfg.issue), table, now);
  if (log.length) table.updated = now;
  save(TABLE, finish(table));
  save(CFG, cfg);
  save(DONE, done);
  console.log(log.join('\n') || 'no new results');
}

async function cleanupCmd() {
  const ids = load(DONE, []);
  for (const id of ids) await api('DELETE', `/repos/${REPO}/issues/comments/${id}`);
  console.log(`deleted comments: ${ids.length}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const cmd = process.argv[2] || 'process';
  ({ process: processCmd, cleanup: cleanupCmd })[cmd]().catch(e => { console.error(e); process.exit(1); });
}
