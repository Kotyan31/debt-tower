import { useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Vector3, type Mesh } from 'three';
import { LIFT_POS, world } from './world.ts';
import { ROOM_D } from './theme.ts';
import type { Theme } from './theme.ts';
import { signTexture } from './textures.ts';
import { useGame } from '../state/game.ts';

export function Lift({ th, floor, label }: { th: Theme; floor: number; label: string }) {
  const doorL = useRef<Mesh>(null), doorR = useRef<Mesh>(null);
  const sign = useMemo(() => signTexture(label + ' ' + (floor + 1), th.accent), [label, floor, th]);
  const near = useGame(s => s.near?.k === 'lift');
  useFrame((_, dt) => {
    const open = near || useGame.getState().liftOpen;
    for (const [d, side] of [[doorL.current, -1], [doorR.current, 1]] as const) {
      if (!d) continue;
      const want = side * (open ? 1.05 : 0.5);
      d.position.x += (want - d.position.x) * Math.min(1, dt * 6);
    }
  });
  const onClick = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (useGame.getState().table) return;
    world.target = new Vector3(LIFT_POS[0], 0, LIFT_POS[1] + 1.4);
    world.goal = { k: 'lift' };
  };
  return (
    <group position={[LIFT_POS[0], 0, -ROOM_D + 0.02]} onPointerDown={onClick}>
      <mesh position={[0, 1.6, 0.01]}><planeGeometry args={[2.3, 3.2]} /><meshStandardMaterial color="#0a0a10" /></mesh>
      <mesh ref={doorL} position={[-0.5, 1.5, 0.05]} castShadow><boxGeometry args={[1, 3, 0.06]} /><meshStandardMaterial color="#b9bcc6" metalness={0.85} roughness={0.25} /></mesh>
      <mesh ref={doorR} position={[0.5, 1.5, 0.05]} castShadow><boxGeometry args={[1, 3, 0.06]} /><meshStandardMaterial color="#b9bcc6" metalness={0.85} roughness={0.25} /></mesh>
      <mesh position={[0, 3.15, 0.08]}><boxGeometry args={[2.5, 0.14, 0.12]} /><meshStandardMaterial color={th.trim} metalness={0.6} roughness={0.3} /></mesh>
      <mesh position={[-1.25, 1.55, 0.08]}><boxGeometry args={[0.14, 3.2, 0.12]} /><meshStandardMaterial color={th.trim} metalness={0.6} roughness={0.3} /></mesh>
      <mesh position={[1.25, 1.55, 0.08]}><boxGeometry args={[0.14, 3.2, 0.12]} /><meshStandardMaterial color={th.trim} metalness={0.6} roughness={0.3} /></mesh>
      <mesh position={[0, 3.65, 0.06]}><planeGeometry args={[2.6, 0.65]} /><meshBasicMaterial map={sign} transparent toneMapped={false} /></mesh>
      <mesh position={[1.55, 1.3, 0.08]}><boxGeometry args={[0.2, 0.36, 0.06]} /><meshStandardMaterial color="#222" /></mesh>
      <mesh position={[1.55, 1.38, 0.12]}><circleGeometry args={[0.05, 12]} /><meshBasicMaterial color={near ? '#ffcb52' : '#777'} toneMapped={false} /></mesh>
      <mesh position={[0, 0.012, 1.3]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.2, 1.6]} /><meshBasicMaterial color={near ? th.trim : th.accent} transparent opacity={near ? 0.35 : 0.12} toneMapped={false} /></mesh>
    </group>
  );
}
