export type Point = { x: number; z: number };
const CLEARANCE = 2.46;
const RING = 2.57;
const inside = (p: Point) => Math.abs(p.x) <= 11.3 && Math.abs(p.z) <= 8.3;
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);

/** Visibility graph around the five solid tables; no frame-dependent path choices. */
export function findPath(from: Point, destination: Point, tables: readonly (readonly [number, number])[]): Point[] {
  const to = { x: Math.max(-11.3, Math.min(11.3, destination.x)), z: Math.max(-8.3, Math.min(8.3, destination.z)) };
  for (const [x, z] of tables) {
    const d = Math.hypot(to.x - x, to.z - z);
    if (d < RING) {
      const dx = d ? (to.x - x) / d : 1, dz = d ? (to.z - z) / d : 0;
      to.x = x + dx * RING; to.z = z + dz * RING;
    }
  }
  const clear = (a: Point, b: Point) => tables.every(([x, z]) => {
    const dx = b.x - a.x, dz = b.z - a.z, len = dx * dx + dz * dz;
    const t = len ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / len)) : 0;
    return Math.hypot(a.x + dx * t - x, a.z + dz * t - z) >= CLEARANCE - 0.02;
  });
  if (clear(from, to)) return [to];
  const nodes: Point[] = [from, to];
  for (const [x, z] of tables) for (let i = 0; i < 16; i++) {
    const angle = i * Math.PI / 8;
    const p = { x: x + Math.cos(angle) * RING, z: z + Math.sin(angle) * RING };
    if (inside(p) && clear(p, p)) nodes.push(p);
  }
  const costs = nodes.map(() => Infinity), previous = nodes.map(() => -1), visited = new Set<number>();
  costs[0] = 0;
  while (visited.size < nodes.length) {
    let at = -1;
    for (let i = 0; i < nodes.length; i++) if (!visited.has(i) && (at < 0 || costs[i] < costs[at])) at = i;
    if (at < 0 || !Number.isFinite(costs[at])) return [];
    if (at === 1) {
      const route: Point[] = [];
      for (let i = 1; i !== 0; i = previous[i]) route.unshift(nodes[i]);
      return route;
    }
    visited.add(at);
    for (let i = 0; i < nodes.length; i++) {
      if (visited.has(i)) continue;
      const cost = costs[at] + distance(nodes[at], nodes[i]);
      if (cost < costs[i] && clear(nodes[at], nodes[i])) { costs[i] = cost; previous[i] = at; }
    }
  }
  return [];
}
