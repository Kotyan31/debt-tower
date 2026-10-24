import { RepeatWrapping, type Texture } from 'three';
import { SLOT_SYMBOLS } from '../core/games/slots.ts';

export const REEL_SYMBOLS = SLOT_SYMBOLS.length;
export const REEL_REPEAT = 1.12 / REEL_SYMBOLS;
export interface SlotSpin { reels: number[]; first?: number[]; mult: number }

const wrap = (x: number, n = 1) => ((x % n) + n) % n;
export const reelOffset = (position: number) => wrap(1 - (position + 0.5) / REEL_SYMBOLS - REEL_REPEAT / 2);

/** Each reel owns its UV transform; repeating is essential for the last symbol. */
export function createReelTexture(source: Texture): Texture {
  const texture = source.clone();
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(1, REEL_REPEAT);
  texture.offset.y = reelOffset(5);
  texture.needsUpdate = true;
  return texture;
}

/** The 3D machine and readable panel use the same stops and re-spin timing. */
export function reelFrame(spin: SlotSpin | null, elapsed: number, duration: number, reel: number) {
  if (!spin) return { position: 5, symbol: 5, stopped: true, respin: false };
  const time = Math.max(0, elapsed);
  const stageLength = duration / (spin.first ? 2 : 1);
  const respin = !!spin.first && time >= stageLength;
  const symbols = spin.first && !respin ? spin.first : spin.reels;
  const stageTime = time - (respin ? stageLength : 0);
  const stop = stageLength * (0.56 + reel * 0.16);
  const progress = Math.min(1, stageTime / stop);
  const symbol = symbols[reel];
  const position = symbol + Math.pow(1 - progress, 3) * REEL_SYMBOLS * (3 + reel);
  return { position, symbol, stopped: progress >= 1, respin };
}

export const reelStripPosition = (position: number) => REEL_SYMBOLS + wrap(position, REEL_SYMBOLS);
