import { useRef, type ReactNode } from 'react';
import { useGame } from '../../state/game.ts';
import type { GameId, Result, Session } from '../../core/index.ts';
import { cardTexture } from '../textures.ts';

/** this table's last finished round and its open one, plus when each showed up (performance.now) */
export function useRound(id: GameId) {
  const last = useGame(s => (s.run?.last?.id === id ? s.run.last : null));
  const sess = useGame(s => (s.run?.game?.id === id ? s.run.game : null));
  const seen = useRef<{ n: number; at: number }>({ n: -1, at: 0 });
  const sseen = useRef<{ key: unknown; at: number }>({ key: null, at: 0 });
  if (last && last.n !== seen.current.n) seen.current = { n: last.n, at: performance.now() };
  const skey = sess ? JSON.stringify(sess.s) : null;
  if (skey !== sseen.current.key) sseen.current = { key: skey, at: performance.now() };
  return { last: last as Result | null, lastAt: seen.current.at, sess: sess as Session | null, sessAt: sseen.current.at };
}

export const easeOut = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
export const easeInOut = (x: number) => { x = Math.min(1, Math.max(0, x)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

/** a felt-topped table */
export function FeltTable({ w = 3.6, d = 2.2, h = 0.9, felt, rim, round = false, children }: { w?: number; d?: number; h?: number; felt: string; rim: string; round?: boolean; children?: ReactNode }) {
  return (
    <group>
      <mesh position={[0, h / 2 - 0.05, 0]} castShadow receiveShadow>
        {round ? <cylinderGeometry args={[w * 0.35, w * 0.4, h - 0.1, 20]} /> : <boxGeometry args={[w * 0.8, h - 0.1, d * 0.7]} />}
        <meshStandardMaterial color="#1c1a20" />
      </mesh>
      <mesh position={[0, h, 0]} castShadow receiveShadow>
        {round ? <cylinderGeometry args={[w / 2, w / 2, 0.16, 32]} /> : <boxGeometry args={[w, 0.16, d]} />}
        <meshStandardMaterial color={rim} roughness={0.5} />
      </mesh>
      <mesh position={[0, h + 0.085, 0]} receiveShadow>
        {round ? <cylinderGeometry args={[w / 2 - 0.15, w / 2 - 0.15, 0.02, 32]} /> : <boxGeometry args={[w - 0.3, 0.02, d - 0.3]} />}
        <meshStandardMaterial color={felt} roughness={0.95} />
      </mesh>
      <group position={[0, h + 0.1, 0]}>{children}</group>
    </group>
  );
}

/** a playing card lying on the felt (or standing, with rotation) */
export function Card3D({ c, pos, rot = [-Math.PI / 2, 0, 0], s = 1, faceUp = true }: { c: number; pos: [number, number, number]; rot?: [number, number, number]; s?: number; faceUp?: boolean }) {
  return (
    <mesh position={pos} rotation={rot} scale={s} castShadow>
      <planeGeometry args={[0.5, 0.7]} />
      <meshStandardMaterial map={cardTexture(faceUp ? c : -1)} roughness={0.6} />
    </mesh>
  );
}

export function Chips({ pos, n = 3, color = '#d42a3c' }: { pos: [number, number, number]; n?: number; color?: string }) {
  return (
    <group position={pos}>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[0, 0.04 + i * 0.055, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.05, 16]} />
          <meshStandardMaterial color={i % 2 ? '#f4f1ea' : color} />
        </mesh>
      ))}
    </group>
  );
}
