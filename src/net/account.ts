/* Nick + password → a P-256 key pair (PBKDF2), as in Patronnik. The password never leaves the device: the server keeps
   only the public key, registered by the first signed result for a nick ("trust on first use"). */
import { store, hex, unhex, b64, b64u } from './storage.ts';

export interface Account { nick: string; d: string; x: string; y: string }

const SALT = 'debt-tower|';
const KEY = 'dt-acct';

export const normNick = (s: string) => s.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
export const cleanNick = (s: string) => s.normalize('NFKC').replace(/\s+/g, ' ').trim();
export const NICK_RE = /^[\p{L}\p{N}_\-. ]{2,20}$/u;

/* --- P-256 by hand, only to turn the password-derived secret into a public key (WebCrypto signs) --- */
const EC = {
  p: 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn,
  n: 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n,
  g: [0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296n, 0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5n] as [bigint, bigint],
};
type Pt = [bigint, bigint] | null;
const bm = (a: bigint, m: bigint) => ((a % m) + m) % m;
function binv(a: bigint, m: bigint) { let r0 = bm(a, m), r1 = m, s0 = 1n, s1 = 0n; while (r1) { const q = r0 / r1; [r0, r1] = [r1, r0 - q * r1]; [s0, s1] = [s1, s0 - q * s1]; } return bm(s0, m); }
function padd(P: Pt, Q: Pt): Pt {
  const p = EC.p;
  if (!P) return Q;
  if (!Q) return P;
  let l: bigint;
  if (P[0] === Q[0]) { if (bm(P[1] + Q[1], p) === 0n) return null; l = bm((3n * P[0] * P[0] - 3n) * binv(2n * P[1], p), p); }
  else l = bm((Q[1] - P[1]) * binv(Q[0] - P[0], p), p);
  const x = bm(l * l - P[0] - Q[0], p);
  return [x, bm(l * (P[0] - x) - P[1], p)];
}
function pmul(k: bigint, P: Pt): Pt { let R: Pt = null; while (k > 0n) { if (k & 1n) R = padd(R, P); P = padd(P, P); k >>= 1n; } return R; }
const h32 = (x: bigint) => x.toString(16).padStart(64, '0');

export async function deriveAcct(nick: string, pass: string): Promise<Account> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(SALT + normNick(nick)), iterations: 150000 }, base, 256));
  const d = bm(BigInt('0x' + hex(bits)), EC.n - 1n) + 1n, Q = pmul(d, EC.g)!;
  return { nick: cleanNick(nick), d: h32(d), x: h32(Q[0]), y: h32(Q[1]) };
}

export const pubOf = (a: Account) => b64(new Uint8Array([4, ...unhex(a.x), ...unhex(a.y)]));

export async function signStr(a: Account, str: string): Promise<string> {
  const key = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', d: b64u(unhex(a.d)), x: b64u(unhex(a.x)), y: b64u(unhex(a.y)), ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  return b64(new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(str))));
}

export function getAcct(): Account | null {
  try { const a = JSON.parse(store.get(KEY) || 'null'); return a && a.d && a.nick ? a : null; } catch { return null; }
}
export const setAcct = (a: Account | null) => store.set(KEY, a ? JSON.stringify(a) : null);
