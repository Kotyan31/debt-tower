import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { type Group, Vector3 } from 'three';
import { world, TABLE_SLOTS, TABLE_RADIUS, LIFT_POS, NEAR_DIST, ISO_UP, ISO_RIGHT } from './world.ts';
import { ROOM_W, ROOM_D } from './theme.ts';
import { useGame, type Near } from '../state/game.ts';
import { sfx } from '../audio/sfx.ts';

const SPEED = 6.2;
const tmp = new Vector3();
const dir = new Vector3();

const sameNear = (a: Near, b: Near) => (a === b) || (!!a && !!b && a.k === b.k && (a.k === 'lift' || (b.k === 'table' && a.id === b.id)));

export function Player({ color }: { color: string }) {
  const root = useRef<Group>(null);
  const legL = useRef<Group>(null), legR = useRef<Group>(null), armL = useRef<Group>(null), armR = useRef<Group>(null), body = useRef<Group>(null);
  const phase = useRef(0), stepT = useRef(0);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    const g = useGame.getState();
    const run = g.run;
    const frozen = !run || run.phase !== 'day' || !!g.table || g.liftOpen || !!g.modal || g.screen !== 'play';
    dir.set(0, 0, 0);
    if (!frozen) {
      const k = world.keys;
      const up = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) + -world.stick.y;
      const right = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) + world.stick.x;
      if (up || right) {
        dir.addScaledVector(ISO_UP, up).addScaledVector(ISO_RIGHT, right);
        if (dir.lengthSq() > 1) dir.normalize();
        world.target = null;
        world.path = [];
        world.goal = null;
      } else if (world.target) {
        tmp.copy(world.target).sub(world.pos);
        tmp.y = 0;
        const d = tmp.length();
        if (d < 0.2) {
          world.pos.copy(world.target);
          world.target = world.path.shift() ?? null;
          if (world.target) return;
          const goal = world.goal;
          world.goal = null;
          if (goal?.k === 'table') { g.set({ table: goal.id }); sfx('chip'); }
          else if (goal?.k === 'lift') { g.set({ liftOpen: true }); sfx('lift'); }
        } else dir.copy(tmp).divideScalar(d).multiplyScalar(Math.min(1, d * 2));
      }
    }
    const moving = dir.lengthSq() > 0.001;
    world.moving = moving;
    if (moving) {
      world.pos.addScaledVector(dir, SPEED * dt);
      const want = Math.atan2(dir.x, dir.z);
      let dh = want - world.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      world.heading += dh * Math.min(1, dt * 14);
    }
    // tables are solid; the room has walls
    const n = run?.tables.length ?? 0;
    for (let i = 0; i < n; i++) {
      const [x, z] = TABLE_SLOTS[i];
      tmp.set(world.pos.x - x, 0, world.pos.z - z);
      const d = tmp.length(), min = TABLE_RADIUS + 0.35;
      if (d < min && d > 0.0001) world.pos.addScaledVector(tmp.divideScalar(d), min - d);
    }
    world.pos.x = Math.max(-ROOM_W + 0.7, Math.min(ROOM_W - 0.7, world.pos.x));
    world.pos.z = Math.max(-ROOM_D + 0.7, Math.min(ROOM_D - 0.7, world.pos.z));

    // what the player stands next to
    let near: Near = null, best = NEAR_DIST;
    for (let i = 0; i < n; i++) {
      const [x, z] = TABLE_SLOTS[i];
      const d = Math.hypot(world.pos.x - x, world.pos.z - z);
      if (d < best) { best = d; near = { k: 'table', id: run!.tables[i] }; }
    }
    if (Math.hypot(world.pos.x - LIFT_POS[0], world.pos.z - LIFT_POS[1]) < 2.4) near = { k: 'lift' };
    if (!sameNear(near, g.near)) g.set({ near });

    // walk cycle
    const r = root.current;
    if (!r) return;
    r.position.copy(world.pos);
    r.rotation.y = world.heading;
    phase.current += dt * (moving ? 11 : 0);
    const sw = moving ? Math.sin(phase.current) * 0.7 : 0;
    const lerp = (cur: number, to: number) => cur + (to - cur) * Math.min(1, dt * 12);
    if (legL.current) legL.current.rotation.x = lerp(legL.current.rotation.x, sw);
    if (legR.current) legR.current.rotation.x = lerp(legR.current.rotation.x, -sw);
    if (armL.current) armL.current.rotation.x = lerp(armL.current.rotation.x, -sw * 0.8);
    if (armR.current) armR.current.rotation.x = lerp(armR.current.rotation.x, sw * 0.8);
    if (body.current) body.current.position.y = moving ? Math.abs(Math.cos(phase.current)) * 0.08 : Math.sin(performance.now() / 600) * 0.02;
    if (moving) { stepT.current += dt; if (stepT.current > 0.29) { stepT.current = 0; sfx('step'); } }
  });

  return (
    <group ref={root}>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 16]} />
        <meshBasicMaterial color="#000" transparent opacity={0.25} />
      </mesh>
      <group ref={body}>
        <group ref={legL} position={[-0.17, 0.75, 0]}>
          <mesh position={[0, -0.36, 0]} castShadow><boxGeometry args={[0.22, 0.75, 0.24]} /><meshStandardMaterial color="#20222b" /></mesh>
        </group>
        <group ref={legR} position={[0.17, 0.75, 0]}>
          <mesh position={[0, -0.36, 0]} castShadow><boxGeometry args={[0.22, 0.75, 0.24]} /><meshStandardMaterial color="#20222b" /></mesh>
        </group>
        <mesh position={[0, 1.12, 0]} castShadow><boxGeometry args={[0.62, 0.8, 0.36]} /><meshStandardMaterial color={color} flatShading /></mesh>
        <mesh position={[0, 1.42, 0.19]}><boxGeometry args={[0.16, 0.22, 0.02]} /><meshStandardMaterial color="#f2f2f2" /></mesh>
        <mesh position={[0, 1.36, 0.2]}><boxGeometry args={[0.07, 0.2, 0.02]} /><meshStandardMaterial color="#d42a3c" /></mesh>
        <group ref={armL} position={[-0.42, 1.45, 0]}>
          <mesh position={[0, -0.32, 0]} castShadow><boxGeometry args={[0.18, 0.66, 0.2]} /><meshStandardMaterial color={color} flatShading /></mesh>
          <mesh position={[0, -0.7, 0]}><boxGeometry args={[0.16, 0.14, 0.16]} /><meshStandardMaterial color="#f0c39a" /></mesh>
        </group>
        <group ref={armR} position={[0.42, 1.45, 0]}>
          <mesh position={[0, -0.32, 0]} castShadow><boxGeometry args={[0.18, 0.66, 0.2]} /><meshStandardMaterial color={color} flatShading /></mesh>
          <mesh position={[0, -0.7, 0]}><boxGeometry args={[0.16, 0.14, 0.16]} /><meshStandardMaterial color="#f0c39a" /></mesh>
        </group>
        <mesh position={[0, 1.82, 0]} castShadow><boxGeometry args={[0.46, 0.46, 0.44]} /><meshStandardMaterial color="#f0c39a" flatShading /></mesh>
        <mesh position={[-0.1, 1.86, 0.225]}><boxGeometry args={[0.07, 0.07, 0.01]} /><meshBasicMaterial color="#111" /></mesh>
        <mesh position={[0.1, 1.86, 0.225]}><boxGeometry args={[0.07, 0.07, 0.01]} /><meshBasicMaterial color="#111" /></mesh>
        <mesh position={[0, 2.1, 0]} castShadow><cylinderGeometry args={[0.36, 0.36, 0.06, 12]} /><meshStandardMaterial color="#1b1b24" /></mesh>
        <mesh position={[0, 2.25, 0]} castShadow><cylinderGeometry args={[0.22, 0.24, 0.3, 12]} /><meshStandardMaterial color="#1b1b24" /></mesh>
        <mesh position={[0, 2.13, 0]}><cylinderGeometry args={[0.245, 0.245, 0.06, 12]} /><meshStandardMaterial color="#d42a3c" /></mesh>
      </group>
    </group>
  );
}
