import { describe, expect, it } from 'vitest';
import { findPath, type Point } from '../src/scene/navigation.ts';
import { TABLE_SLOTS, SPAWN } from '../src/scene/world.ts';

function checkRoute(from: Point, route: Point[]) {
  expect(route.length).toBeGreaterThan(0);
  let prev = from;
  for (const p of route) {
    expect(Math.abs(p.x)).toBeLessThanOrEqual(11.3);
    expect(Math.abs(p.z)).toBeLessThanOrEqual(8.3);
    for (let step = 0; step <= 100; step++) {
      const x = prev.x + (p.x - prev.x) * step / 100, z = prev.z + (p.z - prev.z) * step / 100;
      for (const [tx, tz] of TABLE_SLOTS) expect(Math.hypot(x - tx, z - tz)).toBeGreaterThanOrEqual(2.44 - 1e-7);
    }
    prev = p;
  }
}

describe('click-to-walk navigation', () => {
  it('walks around a table instead of getting stuck against it', () => {
    const from = { x: -10, z: -3.6 }, to = { x: -2, z: -3.6 };
    const path = findPath(from, to, TABLE_SLOTS);
    expect(path.length).toBeGreaterThan(1);
    expect(path.at(-1)).toEqual(to);
    checkRoute(from, path);
  });

  it('reaches every table from the entrance and from every other table', () => {
    const points = [{ x: SPAWN[0], z: SPAWN[1] }, ...TABLE_SLOTS.map(([x, z]) => ({ x, z: z + 2.7 }))];
    for (const from of points) for (const to of points) checkRoute(from, findPath(from, to, TABLE_SLOTS));
  });

  it('redirects floor clicks inside a table to a safe spot', () => {
    const from = { x: SPAWN[0], z: SPAWN[1] };
    for (const [x, z] of TABLE_SLOTS) checkRoute(from, findPath(from, { x, z }, TABLE_SLOTS));
  });
});
