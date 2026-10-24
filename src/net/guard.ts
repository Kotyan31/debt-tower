/* Anti-tamper, carried over from Patronnik. It runs first, before the game's own modules.
   - The built-ins the leaderboard signing goes through are frozen and their global names made read-only, so a console
     script cannot swap crypto.subtle or JSON afterwards. Object/Function/Array prototypes are only checked, not frozen:
     freezing them breaks libraries that assign .constructor or .toString on their own objects.
   - Hooks installed before the page even loaded are caught by the native-code check (FAKE): the game plays on,
     but nothing goes to the shared table.
   - HOME: the shared table takes results only from the real page, not from a frame or a copy elsewhere.
   - CODE: SHA-256 of the main bundle as served. The server computes the same from the live site, so a patched copy
     sends a fingerprint it does not know. */

const W = window as unknown as Record<string, any>;

function native(f: unknown): boolean {
  try { return typeof f === 'function' && /\[native code\]\s*\}\s*$/.test(Function.prototype.toString.call(f)); } catch { return false; }
}

const NATIVE_OK = (() => {
  let ok = true;
  [Array.prototype.forEach, Array.prototype.map, Array.from, Object.freeze, Object.defineProperty, Function.prototype.toString,
    JSON.stringify, JSON.parse, Math.random, Date.now].forEach(f => { if (!native(f)) ok = false; });
  const seen = new Set<unknown>();
  const freeze = (o: unknown) => { if (!o || (typeof o !== 'object' && typeof o !== 'function') || seen.has(o)) return; seen.add(o); try { Object.freeze(o); } catch { /* exotic */ } };
  const names = ['Math', 'JSON', 'Reflect', 'Crypto', 'SubtleCrypto', 'CryptoKey', 'TextEncoder', 'TextDecoder', 'Uint8Array', 'Uint32Array', 'ArrayBuffer', 'DataView',
    'CompressionStream', 'DecompressionStream', 'Response', 'Blob'];
  for (const n of names) {
    const v = W[n];
    if (v == null) continue;
    if (typeof v === 'function' && !native(v)) ok = false;
    try { Object.defineProperty(W, n, { value: v, writable: false, configurable: false }); } catch { /* already locked */ }
    freeze(v);
    if (typeof v === 'function') freeze(v.prototype);
  }
  for (const n of ['Object', 'Array', 'Function', 'Promise', 'fetch']) {
    const v = W[n];
    if (typeof v === 'function' && !native(v)) ok = false;
    try { Object.defineProperty(W, n, { value: v, writable: false, configurable: false }); } catch { /* already locked */ }
  }
  try {
    if (W.crypto) {
      if (!native(W.crypto.getRandomValues) || (W.crypto.subtle && !native(W.crypto.subtle.sign))) ok = false;
      freeze(W.crypto); if (W.crypto.subtle) freeze(W.crypto.subtle);
    }
  } catch { /* no crypto */ }
  return ok;
})();

export const FAKE = !NATIVE_OK;

export const HOME = window.top === window.self && (
  (location.protocol === 'https:' && /\.github\.io$/i.test(location.hostname)) ||
  /^(localhost|127\.0\.0\.1)$/.test(location.hostname));

let code: string | null = null;
export const getCode = () => code;
export const codeReady: Promise<string | null> = (async () => {
  try {
    const el = document.querySelector('script[type="module"][src]') as HTMLScriptElement | null;
    if (!el) return null;
    const buf = await (await fetch(el.src, { cache: 'force-cache' })).arrayBuffer();
    const d = new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
    code = Array.from(d.slice(0, 16), x => x.toString(16).padStart(2, '0')).join('');
  } catch { code = null; }
  return code;
})();

/** randomness for seeds and nonces: the browser's crypto generator, taken once at load */
const gv = crypto.getRandomValues.bind(crypto);
export const secureBytes = (n: number) => gv(new Uint8Array(n));
