import { describe, expect, it } from 'vitest';
import { Texture, RepeatWrapping, Vector2 } from 'three';
import { createReelTexture, REEL_REPEAT, REEL_SYMBOLS, reelFrame, reelOffset, reelStripPosition } from '../src/scene/slotReels.ts';

describe('slot reel presentation', () => {
  it('shows every symbol at the center of the 3D reel, including the wrapping diamond', () => {
    const texture = createReelTexture(new Texture());
    expect(texture.wrapT).toBe(RepeatWrapping);
    for (let symbol = 0; symbol < REEL_SYMBOLS; symbol++) {
      texture.offset.y = reelOffset(symbol);
      texture.updateMatrix();
      const uv = texture.transformUv(new Vector2(0.5, 0.5));
      expect(uv.y * REEL_SYMBOLS).toBeCloseTo(symbol + 0.5);
      // A full symbol cell fits inside the window, including its outer padding.
      expect(REEL_REPEAT * REEL_SYMBOLS).toBeGreaterThan(92 / 128);
    }
  });

  it('owns independent texture offsets without altering the shared strip', () => {
    const source = new Texture();
    const a = createReelTexture(source), b = createReelTexture(source);
    a.offset.y = reelOffset(6);
    expect(a.offset.y).not.toBe(b.offset.y);
    expect(source.repeat.y).toBe(1);
    expect(source.offset.y).toBe(0);
    expect(b.repeat.y).toBe(REEL_REPEAT);
  });

  it('finishes all three reels on the exact result before the payout reveal', () => {
    for (let symbol = 0; symbol < REEL_SYMBOLS; symbol++) {
      const spin = { reels: [symbol, (symbol + 1) % 7, (symbol + 2) % 7], mult: 0 };
      for (let reel = 0; reel < 3; reel++) {
        expect(reelFrame(spin, 0, 1900, reel).stopped).toBe(false);
        const frame = reelFrame(spin, 1900, 1900, reel);
        expect(frame.stopped).toBe(true);
        expect(frame.position).toBe(spin.reels[reel]);
        expect(reelStripPosition(frame.position)).toBe(REEL_SYMBOLS + spin.reels[reel]);
      }
    }
  });

  it('completes the horseshoe re-spin inside its 3000ms reveal', () => {
    const spin = { first: [1, 3, 5], reels: [6, 6, 6], mult: 400 };
    for (let reel = 0; reel < 3; reel++) {
      expect(reelFrame(spin, 1499, 3000, reel)).toMatchObject({ stopped: true, symbol: spin.first[reel], respin: false });
      expect(reelFrame(spin, 1500, 3000, reel)).toMatchObject({ stopped: false, respin: true });
      expect(reelFrame(spin, 3000, 3000, reel)).toMatchObject({ stopped: true, symbol: 6, position: 6, respin: true });
    }
  });

  it('never produces an empty cell at a wrap boundary during either spin', () => {
    const spin = { first: [6, 0, 5], reels: [6, 6, 6], mult: 400 };
    for (let time = 0; time <= 3000; time += 7) for (let reel = 0; reel < 3; reel++) {
      const frame = reelFrame(spin, time, 3000, reel);
      const position = reelStripPosition(frame.position);
      expect(position).toBeGreaterThanOrEqual(REEL_SYMBOLS);
      expect(position).toBeLessThan(REEL_SYMBOLS * 2);
      expect(Number.isFinite(reelOffset(frame.position))).toBe(true);
    }
  });
});
