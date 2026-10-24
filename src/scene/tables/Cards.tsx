import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { useRound, FeltTable, Chips } from './common.tsx';
import { cardTexture } from '../textures.ts';
import type { Theme } from '../theme.ts';

const SHOE: [number, number, number] = [1.4, 0.1, -0.7];

/** a card that slides out of the shoe when it first appears; flips when it turns face up */
function DealtCard({ c, to, delay = 0, faceUp = true, standing = false }: { c: number; to: [number, number, number]; delay?: number; faceUp?: boolean; standing?: boolean }) {
  const g = useRef<Group>(null);
  const born = useRef(performance.now());
  const flip = useRef({ up: faceUp, at: 0 });
  if (flip.current.up !== faceUp) flip.current = { up: faceUp, at: performance.now() };
  useFrame(() => {
    const m = g.current;
    if (!m) return;
    const now = performance.now();
    const p = Math.min(1, Math.max(0, (now - born.current - delay) / 320));
    const e = 1 - Math.pow(1 - p, 3);
    m.visible = now - born.current >= delay;
    m.position.set(SHOE[0] + (to[0] - SHOE[0]) * e, to[1] + Math.sin(p * Math.PI) * 0.25, SHOE[2] + (to[2] - SHOE[2]) * e);
    const fp = Math.min(1, (now - flip.current.at) / 300);
    const face = faceUp ? (flip.current.at ? Math.PI * (1 - fp) : 0) : Math.PI;
    if (standing) m.rotation.set(0, face, 0);
    else m.rotation.set(-Math.PI / 2 + face, 0, 0.06 * Math.sin(c));
  });
  return (
    <group ref={g} visible={false}>
      <mesh castShadow>
        <planeGeometry args={[0.5, 0.7]} />
        <meshStandardMaterial map={cardTexture(c)} />
      </mesh>
      <mesh rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.5, 0.7]} />
        <meshStandardMaterial map={cardTexture(-1)} />
      </mesh>
    </group>
  );
}

function Shoe() {
  return (
    <group position={[SHOE[0], 0.12, SHOE[2]]} rotation={[0, -0.4, 0]}>
      <mesh castShadow><boxGeometry args={[0.6, 0.24, 0.8]} /><meshStandardMaterial color="#222" /></mesh>
      <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.5, 0.7]} /><meshStandardMaterial map={cardTexture(-1)} /></mesh>
    </group>
  );
}

/** cards of the open round, or of the last one */
function useHand(id: 'blackjack' | 'baccarat' | 'hilo' | 'poker') {
  const { last, lastAt, sess } = useRound(id);
  return { s: (sess?.s ?? (last && performance.now() - lastAt < 60000 ? last.s : null)) as any, live: !!sess, key: sess ? 'live' : last ? `l${last.n}` : 'none' };
}

export function BlackjackProp({ th }: { th: Theme }) {
  const { s, live, key } = useHand('blackjack');
  return (
    <FeltTable w={3.8} d={2.4} felt={th.felt} rim="#3a2416">
      <Shoe />
      <Chips pos={[-1.3, 0, 0.6]} n={5} />
      <group key={key}>
        {s?.d?.map((c: number, i: number) => (
          <DealtCard key={'d' + i} c={c} to={[-0.5 + i * 0.36, 0.02 + i * 0.002, -0.55]} delay={i < 2 ? i * 260 + 130 : 700 + (i - 2) * 550} faceUp={i !== 1 || !live || s.peek} />
        ))}
        {s?.p?.map((c: number, i: number) => (
          <DealtCard key={'p' + i} c={c} to={[-0.5 + i * 0.36, 0.02 + i * 0.002, 0.45]} delay={i < 2 ? i * 260 : 0} />
        ))}
      </group>
    </FeltTable>
  );
}

export function BaccaratProp({ th }: { th: Theme }) {
  const { s, key } = useHand('baccarat');
  return (
    <FeltTable w={3.8} d={2.4} felt="#1d4f7a" rim="#3a2416">
      <Shoe />
      <Chips pos={[-1.4, 0, 0.7]} n={3} color="#ffcb52" />
      <group key={key}>
        {s?.p?.map((c: number, i: number) => <DealtCard key={'p' + i} c={c} to={[-1.0 + i * 0.36, 0.02, 0]} delay={i < 2 ? i * 500 : 2200} />)}
        {s?.b?.map((c: number, i: number) => <DealtCard key={'b' + i} c={c} to={[0.4 + i * 0.36, 0.02, 0]} delay={i < 2 ? 250 + i * 500 : 2200 + (s.p.length > 2 ? 700 : 0)} />)}
      </group>
    </FeltTable>
  );
}

export function HiloProp({ th }: { th: Theme }) {
  const { s, key } = useHand('hilo');
  const hist: number[] = s?.hist?.slice(-4) ?? [];
  return (
    <FeltTable w={3.4} d={2.2} felt={th.felt} rim="#2a2a33">
      <Shoe />
      <group key={key}>
        {hist.map((c, i) => <DealtCard key={`h${(s.hist.length - hist.length) + i}`} c={c} to={[-1.2 + i * 0.3, 0.02 + i * 0.003, 0.5]} />)}
      </group>
      {s && <group position={[-0.1, 0.55, -0.3]}><DealtCard key={`cur${s.hist.length}`} c={s.cur} to={[0, 0.4, 0]} standing /></group>}
      <mesh position={[-0.1, 0.25, -0.35]} castShadow><boxGeometry args={[0.8, 0.5, 0.15]} /><meshStandardMaterial color="#2a2a33" /></mesh>
    </FeltTable>
  );
}

export function PokerProp({ th }: { th: Theme }) {
  const { s, key } = useHand('poker');
  return (
    <group>
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow><boxGeometry args={[2.4, 2.4, 1.1]} /><meshStandardMaterial color="#1f2a5a" metalness={0.3} roughness={0.4} /></mesh>
      <mesh position={[0, 2.5, -0.1]}><boxGeometry args={[2.5, 0.3, 0.9]} /><meshBasicMaterial color={th.trim} toneMapped={false} /></mesh>
      <mesh position={[0, 1.65, 0.555]}><planeGeometry args={[2.1, 1.1]} /><meshBasicMaterial color="#0b1a3a" toneMapped={false} /></mesh>
      <group position={[0, 1.65, 0.57]} key={key}>
        {(s?.hand ?? [-1, -1, -1, -1, -1]).map((c: number, i: number) => (
          <mesh key={i + ':' + c} position={[-0.8 + i * 0.4, 0.05, 0]}>
            <planeGeometry args={[0.36, 0.5]} />
            <meshBasicMaterial map={cardTexture(c)} toneMapped={false} />
          </mesh>
        ))}
        {s && s.held != null && s.res > 0 && <mesh position={[0, -0.42, 0.01]}><planeGeometry args={[1.6, 0.1]} /><meshBasicMaterial color="#ffcb52" toneMapped={false} /></mesh>}
      </group>
      <mesh position={[0, 0.95, 0.72]} rotation={[-0.5, 0, 0]}><boxGeometry args={[2.1, 0.08, 0.4]} /><meshStandardMaterial color="#222" /></mesh>
      {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[-0.8 + i * 0.4, 1.0, 0.8]} rotation={[-0.5, 0, 0]}><boxGeometry args={[0.28, 0.06, 0.14]} /><meshBasicMaterial color="#ffcb52" toneMapped={false} /></mesh>)}
    </group>
  );
}
