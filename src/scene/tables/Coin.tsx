import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { type Group, MeshStandardMaterial } from 'three';
import { coinTexture } from '../textures.ts';
import { useRound, easeOut } from './common.tsx';
import type { Theme } from '../theme.ts';

export function CoinProp({ th }: { th: Theme }) {
  const coin = useRef<Group>(null);
  const mats = useMemo(() => [
    new MeshStandardMaterial({ color: '#c99520', metalness: 0.8, roughness: 0.3 }),
    new MeshStandardMaterial({ map: coinTexture(0), metalness: 0.5, roughness: 0.35 }),
    new MeshStandardMaterial({ map: coinTexture(1), metalness: 0.5, roughness: 0.35 }),
  ], []);
  const { last, lastAt } = useRound('coin');
  useFrame(() => {
    const c = coin.current;
    if (!c) return;
    const s = last?.s as { r: number } | undefined;
    const now = performance.now();
    if (!s) { c.position.y = 1.25 + Math.sin(now / 500) * 0.05; c.rotation.set(0.3, now / 1500, 0); return; }
    const p = Math.min(1, (now - lastAt) / 1250);
    const fin = s.r === 0 ? 0 : Math.PI;
    c.position.y = 1.08 + Math.sin(Math.PI * p) * 1.8;
    c.rotation.set(fin + (1 - easeOut(p)) * Math.PI * 12, 0, 0);
  });
  return (
    <group>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow><cylinderGeometry args={[0.7, 0.9, 1, 8]} /><meshStandardMaterial color={th.base} /></mesh>
      <mesh position={[0, 1.02, 0]} receiveShadow><cylinderGeometry args={[0.85, 0.85, 0.06, 24]} /><meshStandardMaterial color={th.felt} /></mesh>
      <mesh position={[0, 1.06, 0]}><torusGeometry args={[0.85, 0.03, 6, 32]} /><meshBasicMaterial color={th.trim} toneMapped={false} /></mesh>
      <group ref={coin} position={[0, 1.2, 0]}>
        <mesh castShadow material={mats}><cylinderGeometry args={[0.5, 0.5, 0.08, 32]} /></mesh>
      </group>
    </group>
  );
}
