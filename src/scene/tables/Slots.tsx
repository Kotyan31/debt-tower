import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Texture } from 'three';
import { reelTexture, slotMarqueeTexture } from '../textures.ts';
import { useRound } from './common.tsx';
import type { Theme } from '../theme.ts';
import { createReelTexture, reelFrame, reelOffset, type SlotSpin } from '../slotReels.ts';
import { useReducedMotion } from '../../ui/common.tsx';

function Reel({ x, tex }: { x: number; tex: Texture }) {
  return (
    <mesh position={[x, 0, 0]}>
      <planeGeometry args={[0.44, 0.64]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

export function SlotsProp({ th }: { th: Theme }) {
  const texs = useMemo(() => [0, 1, 2].map(() => createReelTexture(reelTexture())), []);
  useEffect(() => () => texs.forEach(t => t.dispose()), [texs]);
  const { last, lastAt } = useRound('slots');
  const reduced = useReducedMotion();
  const lamp = useRef<import('three').MeshBasicMaterial>(null);
  useFrame(() => {
    const now = performance.now();
    const s = last?.s as SlotSpin | undefined;
    for (let j = 0; j < 3; j++) {
      const frame = reelFrame(s ?? null, reduced ? last?.anim ?? 1900 : now - lastAt, last?.anim ?? 1900, j);
      texs[j].offset.y = reelOffset(frame.position);
    }
    if (lamp.current) {
      const won = s && s.mult > 0 && now - lastAt >= last!.anim;
      lamp.current.color.set(won && (reduced || Math.floor(now / 150) % 2) ? '#ffffff' : '#e8ce9a');
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
        <meshStandardMaterial color="#242337" metalness={0.4} roughness={0.35} />
      </mesh>
      <mesh position={[0, 2.75, 0.405]}>
        <planeGeometry args={[1.78, 0.3]} />
        <meshBasicMaterial ref={lamp} map={slotMarqueeTexture()} toneMapped={false} />
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
