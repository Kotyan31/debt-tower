import { Vector3 } from 'three';
import type { GameId } from '../core/index.ts';

/** Where the five tables of a floor stand, and the lift. Fixed slots; which game sits at a slot changes per visit. */
export const TABLE_SLOTS: [number, number][] = [[-6, -3.6], [1, -4.6], [7.4, -1.6], [-4.6, 4], [4.4, 4.4]];
export const TABLE_RADIUS = 2.1;
export const LIFT_POS: [number, number] = [-8.6, -8.4];
export const SPAWN: [number, number] = [-8.6, -6.2];
export const NEAR_DIST = 3.1;

/** mutable, per-frame state of the walker; kept out of React so moving does not re-render anything */
export const world = {
  pos: new Vector3(SPAWN[0], 0, SPAWN[1]),
  heading: Math.PI * 0.75,
  target: null as Vector3 | null,
  /** a table (or the lift) to open on arrival, after a click on it */
  goal: null as null | { k: 'table'; id: GameId } | { k: 'lift' },
  keys: new Set<string>(),
  moving: false,
  stick: { x: 0, y: 0 },
};

export function slotOf(tables: GameId[], id: GameId): [number, number] | null {
  const i = tables.indexOf(id);
  return i >= 0 ? TABLE_SLOTS[i] : null;
}

/** screen-up on the isometric camera is world (-1, 0, -1) */
export const ISO_UP = new Vector3(-1, 0, -1).normalize();
export const ISO_RIGHT = new Vector3(1, 0, -1).normalize();
