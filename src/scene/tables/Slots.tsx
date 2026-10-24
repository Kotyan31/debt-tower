import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Texture } from 'three';
import { reelTexture } from '../textures.ts';
import { useRound, easeOut } from './common.tsx';
import type { Theme } from '../theme.ts';

const N = 7, WIN = 1.6, REP = WIN / N;
/** texture offset that centres symbol i in the window */
const offsetOf = (i: number) => 1 - (i + 0.5) / N - REP / 2;

function Reel({ x, tex }: { x: number; tex: Texture }) {
  return (
    <mesh position={[x, 0, 0]}>
      <planeGeometry args={[0.42, 0.62]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

export function SlotsProp({ th }: { th: Theme }) {
  const texs = useMemo(() => [0, 1, 2].map(() => { const t = reelTexture().clone(); t.needsUpdate = true; t.repeat.set(1, REP); t.offset.y = offsetOf(5); return t; }), []);
  const { last, lastAt } = useRound('slots');
  const lamp = useRef<import('three').MeshBasicMaterial>(null);
  useFrame(() => {
    const now = performance.now();
    const s = last?.s as { reels: number[]; first?: number[]; mult: number } | undefined;
    for (let j = 0; j < 3; j++) {
      let pos: number;
      if (!s) pos = offsetOf(5);
      else {
        const el = (now - lastAt) / 1000;
        const spins = s.first ? [s.first, s.reels] : [s.reels];
        const per = 1.9;
        const k = Math.min(spins.length - 1, Math.floor(el / per));
        const p = Math.min(1, (el - k * per) / (0.75 + j * 0.38));
        const fin = offsetOf(spins[k][j]);
        pos = fin + (1 - easeOut(p)) * (3 + j);
      }
      texs[j].offset.y = ((pos % 1) + 1) % 1;
    }
    if (lamp.current) {
      const won = s && s.mult > 0 && now - lastAt > (s.first ? 3000 : 1900);
      lamp.current.color.set(won && Math.floor(now / 150) % 2 ? '#ffffff' : th.trim);
    }
  });
  return (
    <group>
      <mesh position={[0, 1.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 2.6, 1.2]} />
        <meshStandardMaterial color="#b3203a" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.75, -0.1]} castShadow>
        <boxGeometry args={[1.9, 0.35, 1.0]} />
        <meshBasicMaterial ref={lamp} color={th.trim} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.75, 0.605]}>
        <planeGeometry args={[1.5, 0.82]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <group position={[0, 1.75, 0.61]}>
        <Reel x={-0.46} tex={texs[0]} /><Reel x={0} tex={texs[1]} /><Reel x={0.46} tex={texs[2]} />
        <mesh position={[0, 0, 0.005]}><planeGeometry args={[1.4, 0.03]} /><meshBasicMaterial color="#d42a3c" transparent opacity={0.6} /></mesh>
      </group>
      <mesh position={[0, 1.0, 0.75]} rotation={[-0.5, 0, 0]} castShadow>
        <boxGeometry args={[1.6, 0.1, 0.5]} />
        <meshStandardMaterial color="#2a2a33" />
      </mesh>
      <group position={[1.0, 1.6, 0.2]}>
        <mesh position={[0, -0.2, 0]}><cylinderGeometry args={[0.04, 0.04, 0.8, 8]} /><meshStandardMaterial color="#ccc" metalness={0.8} roughness={0.2} /></mesh>
        <mesh position={[0, 0.25, 0]}><sphereGeometry args={[0.12, 12, 10]} /><meshStandardMaterial color="#d42a3c" /></mesh>
      </group>
    </group>
  );
}
