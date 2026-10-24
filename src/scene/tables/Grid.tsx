/* Mines, Penguin Cross and Dragon Tower: step-by-step games with a board. */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';
import { useRound, FeltTable } from './common.tsx';
import type { Theme } from '../theme.ts';
import { PENGUIN_LANES } from '../../core/games/penguin.ts';
import { DRAGON_DIFF, DRAGON_LEVELS } from '../../core/games/dragon.ts';

function useBoard<T>(id: 'mines' | 'penguin' | 'dragon') {
  const { last, lastAt, sess, sessAt } = useRound(id);
  const recent = last && performance.now() - lastAt < 45000;
  return { s: (sess?.s ?? (recent ? last!.s : null)) as T | null, live: !!sess, at: sess ? sessAt : lastAt, n: last?.n ?? -1 };
}

/* ---------- mines ---------- */
export function MinesProp({ th }: { th: Theme }) {
  const { s, live } = useBoard<{ mine: boolean[]; open: number[]; flags: number[]; boom?: number }>('mines');
  const ended = !!s && !live;
  return (
    <FeltTable w={3.2} d={3.2} felt="#13234d" rim="#2a2a33">
      {Array.from({ length: 25 }, (_, i) => {
        const x = ((i % 5) - 2) * 0.52, z = (Math.floor(i / 5) - 2) * 0.52;
        const open = s?.open.includes(i), mine = s?.mine[i], flag = s?.flags.includes(i), boom = s?.boom === i;
        const showMine = (ended && mine) || boom;
        return (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, open || showMine ? 0.02 : 0.07, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.46, open || showMine ? 0.04 : 0.14, 0.46]} />
              <meshStandardMaterial color={boom ? '#ff2b4a' : open ? '#1a2a50' : flag ? '#5a2030' : '#3a4a80'} />
            </mesh>
            {open && <mesh position={[0, 0.2, 0]} castShadow><octahedronGeometry args={[0.13, 0]} /><meshStandardMaterial color="#38f2a0" emissive="#38f2a0" emissiveIntensity={0.7} flatShading /></mesh>}
            {showMine && <mesh position={[0, 0.16, 0]} castShadow><icosahedronGeometry args={[0.13, 0]} /><meshStandardMaterial color="#111" flatShading /></mesh>}
            {flag && !showMine && <mesh position={[0, 0.3, 0]}><coneGeometry args={[0.07, 0.2, 4]} /><meshBasicMaterial color="#ff2b4a" toneMapped={false} /></mesh>}
          </group>
        );
      })}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.42, 1.46, 4, 1, Math.PI / 4]} /><meshBasicMaterial color={th.trim} toneMapped={false} /></mesh>
    </FeltTable>
  );
}

/* ---------- penguin cross ---------- */
const LANE_W = 0.22;
function Truck({ lane, phase, color }: { lane: number; phase: number; color: string }) {
  const g = useRef<Group>(null);
  useFrame(() => {
    if (!g.current) return;
    const t = ((performance.now() / 1000 + phase) % 3) / 3;
    g.current.position.set((lane - PENGUIN_LANES / 2) * LANE_W + LANE_W / 2, 0.08, -1.4 + t * 2.8);
  });
  return (
    <group ref={g}>
      <mesh castShadow><boxGeometry args={[0.16, 0.14, 0.34]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0, 0.06, 0.12]}><boxGeometry args={[0.15, 0.1, 0.1]} /><meshStandardMaterial color="#cfe8ff" /></mesh>
    </group>
  );
}

export function PenguinProp({ th }: { th: Theme }) {
  const { s, live, at } = useBoard<{ lane: number; hit?: boolean; saved: number[] }>('penguin');
  const peng = useRef<Group>(null), smash = useRef<Mesh>(null);
  const prev = useRef(0);
  useFrame(() => {
    const p = peng.current;
    if (!p) return;
    const now = performance.now();
    const lane = s?.lane ?? 0;
    const target = lane - 0.5;
    const t = Math.min(1, (now - at) / 380);
    const from = prev.current;
    const cur = t >= 1 ? target : from + (target - from) * t;
    if (t >= 1) prev.current = target;
    p.position.set(cur * LANE_W - (PENGUIN_LANES / 2) * LANE_W + 0.0, 0.02 + Math.sin(Math.min(1, t) * Math.PI) * 0.15, 0);
    const squash = s?.hit && !live;
    p.scale.set(1, squash ? 0.25 : 1, 1);
    if (smash.current) { smash.current.visible = !!squash; smash.current.position.x = p.position.x + LANE_W; }
  });
  return (
    <FeltTable w={3.9} d={3.0} felt="#3a3d46" rim="#22242a">
      <mesh position={[-(PENGUIN_LANES / 2) * LANE_W - 0.25, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.5, 2.8]} /><meshStandardMaterial color="#e8f4ff" /></mesh>
      <mesh position={[(PENGUIN_LANES / 2) * LANE_W + 0.25, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.5, 2.8]} /><meshStandardMaterial color="#e8f4ff" /></mesh>
      {Array.from({ length: PENGUIN_LANES - 1 }, (_, i) => (
        <mesh key={i} position={[(i + 1 - PENGUIN_LANES / 2) * LANE_W, 0.013, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.02, 2.8]} /><meshBasicMaterial color={i === (s?.lane ?? 0) - 1 ? th.trim : '#f0f0f0'} transparent opacity={0.6} toneMapped={false} /></mesh>
      ))}
      {[1, 4, 6, 9, 12, 14].map((l, i) => <Truck key={l} lane={l} phase={i * 0.73} color={['#ff4d6d', '#3fb6ff', '#ffcb52'][i % 3]} />)}
      <group ref={peng} scale={1.6}>
        <mesh position={[0, 0.17, 0]} scale={[1, 1.3, 1]} castShadow><sphereGeometry args={[0.1, 10, 8]} /><meshStandardMaterial color="#1b1b24" /></mesh>
        <mesh position={[0, 0.16, 0.05]} scale={[0.8, 1.1, 0.6]}><sphereGeometry args={[0.09, 10, 8]} /><meshStandardMaterial color="#fff" /></mesh>
        <mesh position={[0, 0.33, 0]} castShadow><sphereGeometry args={[0.075, 10, 8]} /><meshStandardMaterial color="#1b1b24" /></mesh>
        <mesh position={[0, 0.32, 0.075]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.025, 0.06, 6]} /><meshStandardMaterial color="#ff9a1c" /></mesh>
        <mesh position={[0, 0.02, 0.04]}><boxGeometry args={[0.12, 0.02, 0.08]} /><meshStandardMaterial color="#ff9a1c" /></mesh>
      </group>
      <mesh ref={smash} position={[0, 0.1, 0.05]} visible={false} castShadow><boxGeometry args={[0.18, 0.18, 0.38]} /><meshStandardMaterial color="#ff4d6d" /></mesh>
    </FeltTable>
  );
}

/* ---------- dragon tower ---------- */
export function DragonProp({ th }: { th: Theme }) {
  const { s, live } = useBoard<{ diff: number; bad: boolean[][]; level: number; picks: number[]; fell?: number }>('dragon');
  const diff = s?.diff ?? 1, tiles = DRAGON_DIFF[diff][0];
  const ended = !!s && !live;
  const head = useRef<Group>(null), fire = useRef<Mesh>(null);
  useFrame(() => {
    const now = performance.now();
    if (head.current) head.current.rotation.y = Math.sin(now / 900) * 0.25;
    if (fire.current) { fire.current.visible = ended && s?.fell != null; fire.current.scale.set(1, 0.8 + Math.random() * 0.5, 1); }
  });
  const W = 0.36;
  return (
    <group rotation={[0, Math.PI / 4, 0]}>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow><boxGeometry args={[2.4, 0.4, 1.4]} /><meshStandardMaterial color={th.base} /></mesh>
      <mesh position={[0, 1.9, -0.15]} castShadow><boxGeometry args={[tiles * W + 0.4, 3.2, 0.2]} /><meshStandardMaterial color="#241818" flatShading /></mesh>
      {Array.from({ length: DRAGON_LEVELS }, (_, lv) => Array.from({ length: tiles }, (_, c) => {
        const picked = s && s.picks[lv] === c && lv <= (s.fell ?? s.level - 1);
        const bad = s?.bad[lv]?.[c];
        const reveal = ended && bad;
        const here = live && lv === s!.level;
        const color = picked ? (bad ? '#ff2b4a' : '#f4f1ea') : reveal ? '#7a1a20' : here ? th.trim : lv < (s?.level ?? 0) ? '#8a6a50' : '#5a4038';
        return (
          <mesh key={lv + ':' + c} position={[(c - (tiles - 1) / 2) * W, 0.6 + lv * 0.32, 0]} castShadow>
            <boxGeometry args={[W * 0.86, 0.26, 0.16]} />
            <meshStandardMaterial color={color} emissive={here ? th.trim : '#000'} emissiveIntensity={here ? 0.3 : 0} />
          </mesh>
        );
      }))}
      <group ref={head} position={[0, 3.75, 0]}>
        <mesh castShadow><boxGeometry args={[0.7, 0.5, 0.6]} /><meshStandardMaterial color="#2f8a4a" flatShading /></mesh>
        <mesh position={[0, -0.08, 0.42]} castShadow><boxGeometry args={[0.5, 0.3, 0.4]} /><meshStandardMaterial color="#2f8a4a" flatShading /></mesh>
        <mesh position={[-0.2, 0.12, 0.31]}><sphereGeometry args={[0.06, 8, 6]} /><meshBasicMaterial color="#ffcb52" toneMapped={false} /></mesh>
        <mesh position={[0.2, 0.12, 0.31]}><sphereGeometry args={[0.06, 8, 6]} /><meshBasicMaterial color="#ffcb52" toneMapped={false} /></mesh>
        <mesh position={[-0.22, 0.38, -0.1]} rotation={[-0.4, 0, 0.3]}><coneGeometry args={[0.07, 0.3, 6]} /><meshStandardMaterial color="#f4f1ea" /></mesh>
        <mesh position={[0.22, 0.38, -0.1]} rotation={[-0.4, 0, -0.3]}><coneGeometry args={[0.07, 0.3, 6]} /><meshStandardMaterial color="#f4f1ea" /></mesh>
        <mesh ref={fire} position={[0, -0.3, 0.9]} rotation={[Math.PI / 2 + 0.6, 0, 0]} visible={false}><coneGeometry args={[0.25, 0.9, 10]} /><meshBasicMaterial color="#ff7a20" toneMapped={false} /></mesh>
      </group>
    </group>
  );
}
