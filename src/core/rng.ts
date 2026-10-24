/* Deterministic randomness for everything that decides money. The run keeps the generator's four words in its state,
   so the client and the leaderboard server, replaying the same action log from the same seed, draw the same numbers.
   Only +, |, ^, >>>, Math.imul and division are used here and in the games: those are exact in every JS engine
   (unlike Math.exp/pow/sin), so a replay never drifts by one ulp. */

export type RngState = [number, number, number, number];

export interface Rng {
  /** float in [0, 1) */
  next(): number;
  /** integer in [0, n) */
  int(n: number): number;
  state(): RngState;
}

export function seedState(seedHex: string): RngState {
  if (!/^[0-9a-f]{32}$/.test(seedHex)) throw new Error('seed');
  const w = [0, 1, 2, 3].map(i => parseInt(seedHex.slice(i * 8, i * 8 + 8), 16) | 0) as RngState;
  const r = makeRng(w);
  for (let i = 0; i < 20; i++) r.next();   // sfc32 needs a few rounds to mix a raw seed
  return r.state();
}

/** sfc32 by Chris Doty-Humphrey */
export function makeRng(st: RngState): Rng {
  let [a, b, c, d] = st;
  const u32 = () => {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return t >>> 0;
  };
  return {
    next: () => u32() / 4294967296,
    int: n => Math.floor((u32() / 4294967296) * n),
    state: () => [a, b, c, d],
  };
}

export function shuffle<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** index drawn with the given (positive) weights */
export function weighted(ws: number[], rng: Rng): number {
  let sum = 0;
  for (const w of ws) sum += w;
  let x = rng.next() * sum;
  for (let i = 0; i < ws.length; i++) {
    x -= ws[i];
    if (x < 0) return i;
  }
  return ws.length - 1;
}
