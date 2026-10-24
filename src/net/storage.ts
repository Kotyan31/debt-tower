/** localStorage that never throws (private windows, blocked site data) */
export const store = {
  get(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string | null) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* storage off */ } },
};

export const hex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
export const unhex = (h: string) => Uint8Array.from(h.match(/../g) || [], x => parseInt(x, 16));
export const b64 = (b: Uint8Array) => { let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
export const unb64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
export const b64u = (b: Uint8Array) => b64(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const randHex = (bytes: number) => hex(crypto.getRandomValues(new Uint8Array(bytes)));
export async function sha256hex(s: string | Uint8Array): Promise<string> {
  const data = typeof s === 'string' ? new TextEncoder().encode(s) : s;
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', data as BufferSource)));
}
