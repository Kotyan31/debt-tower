import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { type Group, MeshStandardMaterial } from 'three';
import { diceTexture } from '../textures.ts';
import { useRound, FeltTable, Chips } from './common.tsx';
import type { Theme } from '../theme.ts';

/** box faces +x −x +y −y +z −z carry 3 4 1 6 2 5; the rotation that puts a value on top */
const UP: Record<number, [number, number, number]> = { 1: [0, 0, 0], 6: [Math.PI, 0, 0], 2: [-Math.PI / 2, 0, 0], 5: [Math.PI / 2, 0, 0], 3: [0, 0, Math.PI / 2], 4: [0, 0, -Math.PI / 2] };

export function useDiceMats() {
  return useMemo(() => [3, 4, 1, 6, 2, 5].map(n => new MeshStandardMaterial({ map: diceTexture(n), roughness: 0.4 })), []);
}

export function CrapsProp({ th }: { th: Theme }) {
  const mats = useDiceMats();
  const d1 = useRef<Group>(null), d2 = useRef<Group>(null);
  const { last, lastAt, sess, sessAt } = useRound('craps');
  useFrame(() => {
    const now = performance.now();
    const live = sess ? { s: sess.s, at: sessAt } : last ? { s: last.s, at: lastAt } : null;
    const rolls: [number, number][] = live?.s?.rolls ?? [];
    const roll = rolls[rolls.length - 1] ?? [5, 2];
    const el = live ? (now - live.at) / 1000 : 9;
    const p = Math.min(1, el / 1.2);
    [d1.current, d2.current].forEach((d, i) => {
      if (!d) return;
      const v = roll[i], up = UP[v];
      const x0 = -1.2, x1 = 0.2 + i * 0.5, z1 = -0.1 + i * 0.25;
      const e = 1 - Math.pow(1 - p, 2);
      d.position.set(x0 + (x1 - x0) * e, 0.17 + Math.abs(Math.sin(p * Math.PI * 3)) * 0.5 * (1 - p), z1);
      const spin = (1 - e) * Math.PI * (6 + i * 2);
      d.rotation.set(up[0] + spin, (i ? 0.4 : -0.3) + spin * 0.3, up[2] + spin * 0.6);
    });
  });
  const point = (sess?.s?.point as number) || 0;
  return (
    <FeltTable w={3.8} d={2.4} felt={th.felt} rim="#5a3a1e">
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.6, 32]} />
        <meshBasicMaterial color="#fff" transparent opacity={0.6} />
      </mesh>
      {point > 0 && <mesh position={[-0.9 + (point - 4) * 0.25, 0.06, -0.8]} castShadow><cylinderGeometry args={[0.14, 0.14, 0.06, 16]} /><meshStandardMaterial color="#fff" /></mesh>}
      <Chips pos={[1.3, 0, 0.7]} n={4} color={th.accent} />
      <group ref={d1}><mesh castShadow material={mats}><boxGeometry args={[0.32, 0.32, 0.32]} /></mesh></group>
      <group ref={d2}><mesh castShadow material={mats}><boxGeometry args={[0.32, 0.32, 0.32]} /></mesh></group>
    </FeltTable>
  );
}
