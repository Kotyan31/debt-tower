import { useMemo } from 'react';
import { type Theme, ROOM_W, ROOM_D } from './theme.ts';
import { floorTexture, wallTexture, signTexture, clubPosterTexture } from './textures.ts';
import { useT } from '../i18n/index.ts';
import { walkTo } from './world.ts';
import { useGame } from '../state/game.ts';
import type { ThreeEvent } from '@react-three/fiber';

const H = 6;

function Neon({ pos, size, color }: { pos: [number, number, number]; size: [number, number, number]; color: string }) {
  return (
    <mesh position={pos}>
      <boxGeometry args={size} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function Plant({ pos, s = 1 }: { pos: [number, number]; s?: number }) {
  return (
    <group position={[pos[0], 0, pos[1]]} scale={s}>
      <mesh position={[0, 0.35, 0]} castShadow><cylinderGeometry args={[0.35, 0.28, 0.7, 8]} /><meshStandardMaterial color="#7a4a2a" flatShading /></mesh>
      <mesh position={[0, 1.15, 0]} castShadow><icosahedronGeometry args={[0.6, 0]} /><meshStandardMaterial color="#2f8a4a" flatShading /></mesh>
      <mesh position={[0.25, 1.6, 0.1]} castShadow><icosahedronGeometry args={[0.38, 0]} /><meshStandardMaterial color="#3aa25a" flatShading /></mesh>
    </group>
  );
}

function Lamp({ pos, color }: { pos: [number, number]; color: string }) {
  return (
    <group position={[pos[0], 0, pos[1]]}>
      <mesh position={[0, 1.8, 0]} castShadow><cylinderGeometry args={[0.07, 0.1, 3.6, 6]} /><meshStandardMaterial color="#22252c" /></mesh>
      <mesh position={[0, 3.7, 0]}><sphereGeometry args={[0.28, 10, 8]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
      <pointLight position={[0, 3.4, 0]} color={color} intensity={14} distance={9} decay={1.6} />
    </group>
  );
}

function Decor({ floor, th }: { floor: number; th: Theme }) {
  if (floor === 0) return (
    <group>
      <Lamp pos={[-10.6, 7.2]} color={th.light} />
      <Lamp pos={[10.6, -7.8]} color={th.light} />
      {[[-10.8, 1.5], [-10.6, 2.4]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.55, z]} castShadow><cylinderGeometry args={[0.4, 0.36, 1.1, 10]} /><meshStandardMaterial color={i ? '#4a6a4a' : '#5a5f6a'} flatShading /></mesh>
      ))}
      {[[10.4, 7.6, 0], [10.4, 6.5, 0.4], [9.4, 7.7, 0.2]].map(([x, z, r], i) => (
        <mesh key={i} position={[x, 0.45, z]} rotation={[0, r, 0]} castShadow><boxGeometry args={[0.9, 0.9, 0.9]} /><meshStandardMaterial color="#8a6a3a" flatShading /></mesh>
      ))}
    </group>
  );
  if (floor === 1) return (
    <group>
      <Plant pos={[-10.8, 8]} /><Plant pos={[10.8, -8.2]} /><Plant pos={[-10.8, -1]} s={0.8} />
      {[[-10.5, 5.2], [10.2, 1]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, i ? -Math.PI / 2 : Math.PI / 2, 0]}>
          <mesh position={[0, 0.35, 0]} castShadow><boxGeometry args={[2.4, 0.7, 0.9]} /><meshStandardMaterial color="#7a1626" /></mesh>
          <mesh position={[0, 0.85, -0.38]} castShadow><boxGeometry args={[2.4, 0.9, 0.2]} /><meshStandardMaterial color="#7a1626" /></mesh>
        </group>
      ))}
      <group position={[-9.6, 5.1, -6.6]} scale={0.7}>
        <mesh><torusGeometry args={[1.4, 0.06, 6, 24]} /><meshStandardMaterial color={th.trim} metalness={0.8} roughness={0.3} /></mesh>
        <pointLight color={th.light} intensity={18} distance={14} decay={1.4} />
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} position={[Math.cos(i * 0.785) * 1.4, -0.3, Math.sin(i * 0.785) * 1.4]}><octahedronGeometry args={[0.16, 0]} /><meshBasicMaterial color="#fff6d8" toneMapped={false} /></mesh>
        ))}
      </group>
    </group>
  );
  if (floor === 2) return (
    <group>
      {[[-10.8, 7.8], [10.8, -8.2], [10.8, 7.8]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 2, 0]}><cylinderGeometry args={[0.3, 0.3, 4, 6]} /><meshStandardMaterial color="#0b0d1c" /></mesh>
          <Neon pos={[0, 2, 0]} size={[0.66, 3.6, 0.08]} color={i % 2 ? th.accent : th.trim} />
        </group>
      ))}
      {Array.from({ length: 5 }, (_, i) => <Neon key={i} pos={[-ROOM_W + 0.05 + i * 0.002, 0.02, -6 + i * 3.4]} size={[0.06, 0.02, 2]} color={th.accent} />)}
    </group>
  );
  return (
    <group>
      {[[-10.6, 7.6], [10.6, -8.2], [-10.6, -2], [3, -8.4]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 3, 0]} castShadow><cylinderGeometry args={[0.38, 0.45, 6, 12]} /><meshStandardMaterial color="#f6f1e6" roughness={0.4} /></mesh>
          <mesh position={[0, 0.15, 0]}><boxGeometry args={[1, 0.3, 1]} /><meshStandardMaterial color={th.trim} metalness={0.7} roughness={0.3} /></mesh>
        </group>
      ))}
      <Plant pos={[10.6, 7.6]} s={1.2} /><Plant pos={[-10.6, 3]} s={1.1} />
    </group>
  );
}

export function Room({ floor, th, name }: { floor: number; th: Theme; name: string }) {
  const t = useT();
  const ft = useMemo(() => floorTexture(th.tile, th.floorA, th.floorB), [th]);
  const wt = useMemo(() => wallTexture(th.wallKind, th.wall), [th]);
  const sign = useMemo(() => signTexture(name, th.trim), [name, th]);
  const poster = useMemo(() => clubPosterTexture(floor, name, t.scene.mottos[floor]), [floor, name, t]);
  const onFloor = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const g = useGame.getState();
    if (g.screen !== 'play' || g.table || g.modal || g.liftOpen || g.run?.phase !== 'day') return;
    walkTo(e.point.x, e.point.z, null, g.run.tables.length);
  };
  const metal = th.tile === 'marble';
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onPointerDown={onFloor}>
        <planeGeometry args={[ROOM_W * 2, ROOM_D * 2]} />
        <meshStandardMaterial map={ft} roughness={metal ? 0.5 : 0.85} metalness={metal ? 0.1 : 0} />
      </mesh>
      {/* the outer ground, so the room does not float in the void */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshBasicMaterial color={th.bg} />
      </mesh>
      <mesh position={[-ROOM_W, H / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM_D * 2, H]} />
        <meshStandardMaterial map={wt} roughness={0.9} />
      </mesh>
      <mesh position={[0, H / 2, -ROOM_D]} receiveShadow>
        <planeGeometry args={[ROOM_W * 2, H]} />
        <meshStandardMaterial map={wt} roughness={0.9} />
      </mesh>
      <Neon pos={[-ROOM_W + 0.06, H - 0.3, 0]} size={[0.08, 0.08, ROOM_D * 2]} color={th.trim} />
      <Neon pos={[0, H - 0.3, -ROOM_D + 0.06]} size={[ROOM_W * 2, 0.08, 0.08]} color={th.trim} />
      <Neon pos={[-ROOM_W + 0.06, 0.12, 0]} size={[0.06, 0.06, ROOM_D * 2]} color={th.accent} />
      <Neon pos={[0, 0.12, -ROOM_D + 0.06]} size={[ROOM_W * 2, 0.06, 0.06]} color={th.accent} />
      <mesh position={[2.5, 4.3, -ROOM_D + 0.08]}>
        <planeGeometry args={[8, 2]} />
        <meshBasicMaterial map={sign} transparent toneMapped={false} />
      </mesh>
      <mesh position={[8.4, 2.9, -ROOM_D + 0.09]} rotation={[0, 0, -0.04]}>
        <planeGeometry args={[2.1, 2.6]} /><meshStandardMaterial map={poster} roughness={0.95} />
      </mesh>
      {/* An inlaid club seal and brass route from the lift, flush with the floor. */}
      <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.45, 1.5, 64]} /><meshBasicMaterial color={th.trim} transparent opacity={0.4} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
        <planeGeometry args={[1.3, 1.3]} /><meshBasicMaterial color={th.trim} transparent opacity={0.08} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[-8.4 + i * 0.65, 0.019, -6.9]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.3, 0.05]} /><meshBasicMaterial color={th.trim} transparent opacity={0.6} /></mesh>)}
      <Decor floor={floor} th={th} />
    </group>
  );
}
