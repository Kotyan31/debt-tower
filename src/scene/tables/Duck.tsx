import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { useRound } from './common.tsx';
import type { Theme } from '../theme.ts';
import { DUCKS } from '../../core/games/duck.ts';

export const DUCK_COLORS = ['#ff4d6d', '#3fb6ff', '#ffcb52', '#7ee081', '#c77dff'];
const LEN = 3.4, START = -LEN / 2 + 0.25, FINISH = LEN / 2 - 0.25, RACE = 6.2;

/** a deterministic wobble per race, so a re-render does not reshuffle the field */
const hash = (a: number, b: number) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };

function Duck({ color, dRef }: { color: string; dRef: (g: Group | null) => void }) {
  return (
    <group ref={dRef}>
      <mesh position={[0, 0.12, 0]} scale={[1.3, 0.8, 1]} castShadow><sphereGeometry args={[0.13, 10, 8]} /><meshStandardMaterial color="#ffe14d" flatShading /></mesh>
      <mesh position={[0.12, 0.27, 0]} castShadow><sphereGeometry args={[0.08, 10, 8]} /><meshStandardMaterial color="#ffe14d" flatShading /></mesh>
      <mesh position={[0.21, 0.26, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.035, 0.08, 6]} /><meshStandardMaterial color="#ff8a1c" /></mesh>
      <mesh position={[0.15, 0.3, 0.06]}><sphereGeometry args={[0.015, 6, 6]} /><meshBasicMaterial color="#111" /></mesh>
      <mesh position={[0.15, 0.3, -0.06]}><sphereGeometry args={[0.015, 6, 6]} /><meshBasicMaterial color="#111" /></mesh>
      <mesh position={[-0.02, 0.2, 0]}><torusGeometry args={[0.1, 0.018, 4, 12]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
    </group>
  );
}

export function DuckProp({ th }: { th: Theme }) {
  const ducks = useRef<(Group | null)[]>([]);
  const { last, lastAt } = useRound('duck');
  useFrame(() => {
    const now = performance.now();
    const s = last?.s as { win: number } | undefined;
    const el = s ? (now - lastAt) / 1000 : -1;
    for (let i = 0; i < DUCKS; i++) {
      const d = ducks.current[i];
      if (!d) continue;
      let x = START;
      if (s && el >= 0) {
        const place = i === s.win ? 0 : 1 + ((i + (last!.n % 4)) % 4);
        const T = RACE - 0.6 + (place === 0 ? 0 : 0.15 + place * 0.18 + hash(i, last!.n) * 0.1);
        const p = Math.min(1, el / T);
        // everyone surges and stalls at their own rhythm, the winner's line arrives first
        const wob = Math.sin(p * Math.PI * (2 + hash(i, last!.n + 1) * 3)) * 0.07 * (1 - p) * Math.sin(p * Math.PI);
        x = START + (FINISH - START) * (p * p * (3 - 2 * p) * 0.25 + p * 0.75 + wob);
        if (el > RACE + 2.5) x = START + (FINISH - START) * Math.max(0, 1 - (el - RACE - 2.5) / 1.2);
        x = Math.min(FINISH + 0.1, x);
      }
      d.position.set(x, 1.0 + Math.sin(now / 180 + i) * 0.02, -0.72 + i * 0.36);
      d.rotation.z = Math.sin(now / 120 + i * 2) * 0.08;
    }
  });
  return (
    <group>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow><boxGeometry args={[LEN + 0.3, 0.9, 2.2]} /><meshStandardMaterial color={th.base} /></mesh>
      {Array.from({ length: DUCKS }, (_, i) => (
        <group key={i}>
          <mesh position={[0, 0.92, -0.72 + i * 0.36]}><boxGeometry args={[LEN, 0.04, 0.3]} /><meshStandardMaterial color="#2b8bd6" roughness={0.2} metalness={0.1} transparent opacity={0.9} /></mesh>
          <mesh position={[START - 0.2, 0.95, -0.72 + i * 0.36]}><boxGeometry args={[0.12, 0.06, 0.3]} /><meshBasicMaterial color={DUCK_COLORS[i]} toneMapped={false} /></mesh>
        </group>
      ))}
      <mesh position={[FINISH + 0.05, 0.96, 0]}><boxGeometry args={[0.06, 0.04, 1.8]} /><meshBasicMaterial color="#fff" toneMapped={false} /></mesh>
      <mesh position={[FINISH + 0.05, 1.5, -1.0]}><cylinderGeometry args={[0.03, 0.03, 1.1, 6]} /><meshStandardMaterial color="#ddd" /></mesh>
      <mesh position={[FINISH + 0.25, 1.9, -1.0]}><boxGeometry args={[0.4, 0.25, 0.02]} /><meshBasicMaterial color={th.trim} toneMapped={false} /></mesh>
      {Array.from({ length: DUCKS }, (_, i) => <Duck key={i} color={DUCK_COLORS[i]} dRef={g => { ducks.current[i] = g; }} />)}
    </group>
  );
}
