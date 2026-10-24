/* Keno, Crash and Plinko: the machines with screens and falling things. */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, SRGBColorSpace, type Group, type Mesh, type MeshBasicMaterial, type InstancedMesh, Object3D } from 'three';
import { useRound } from './common.tsx';
import type { Theme } from '../theme.ts';
import { KENO_N } from '../../core/games/keno.ts';
import { crashMult, crashTime, CRASH_COUNTDOWN, type CrashS } from '../../core/games/crash.ts';
import { PLINKO, PLINKO_ROWS, PLINKO_FALL } from '../../core/games/plinko.ts';
import { useGame } from '../../state/game.ts';

/* ---------- keno: a lit board of 40 numbers ---------- */
function kenoCanvas() {
  const c = document.createElement('canvas');
  c.width = 800; c.height = 500;
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return { c, t };
}

export function KenoProp({ th }: { th: Theme }) {
  const board = useMemo(kenoCanvas, []);
  const { last, lastAt } = useRound('keno');
  const drawn = useRef(-2);
  useFrame(() => {
    const s = last?.s as { picks: number[]; drawn: number[] } | undefined;
    const shown = s ? Math.min(10, Math.floor((performance.now() - lastAt) / 330)) : 0;
    const key = s ? last!.n * 100 + shown : -1;
    if (key === drawn.current) return;
    drawn.current = key;
    const g = board.c.getContext('2d')!;
    g.fillStyle = '#0b0f22'; g.fillRect(0, 0, 800, 500);
    const out = new Set(s ? s.drawn.slice(0, shown) : []), mine = new Set(s?.picks ?? []);
    for (let i = 0; i < KENO_N; i++) {
      const n = i + 1, x = (i % 8) * 100 + 8, y = Math.floor(i / 8) * 100 + 8;
      const hit = out.has(n) && mine.has(n);
      g.fillStyle = hit ? '#ffcb52' : out.has(n) ? '#2ee6ff' : mine.has(n) ? '#3a2a5a' : '#1a2040';
      g.fillRect(x, y, 84, 84);
      if (mine.has(n)) { g.strokeStyle = '#ff2bd6'; g.lineWidth = 6; g.strokeRect(x + 3, y + 3, 78, 78); }
      g.fillStyle = out.has(n) ? '#0b0f22' : '#cdd3f0';
      g.font = '44px "Russo One", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(n), x + 42, y + 46);
    }
    board.t.needsUpdate = true;
  });
  return (
    <group rotation={[0, Math.PI / 4, 0]}>
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow><boxGeometry args={[2.8, 1.8, 0.8]} /><meshStandardMaterial color={th.base} /></mesh>
      <mesh position={[0, 2.1, 0]} castShadow><boxGeometry args={[2.8, 1.9, 0.3]} /><meshStandardMaterial color="#1c1a20" /></mesh>
      <mesh position={[0, 2.1, 0.16]}><planeGeometry args={[2.6, 1.62]} /><meshBasicMaterial map={board.t} toneMapped={false} /></mesh>
      <mesh position={[0, 3.12, 0]}><boxGeometry args={[2.9, 0.14, 0.34]} /><meshBasicMaterial color={th.trim} toneMapped={false} /></mesh>
    </group>
  );
}

/* ---------- crash: a rocket on a pad ---------- */
export function CrashProp({ th }: { th: Theme }) {
  const rocket = useRef<Group>(null), flame = useRef<Mesh>(null), blast = useRef<Mesh>(null), screen = useRef<MeshBasicMaterial>(null);
  const label = useMemo(() => { const c = document.createElement('canvas'); c.width = 512; c.height = 192; const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return { c, t, last: '' }; }, []);
  const { last, sess } = useRound('crash');
  useFrame(() => {
    const r = rocket.current;
    if (!r) return;
    const g = useGame.getState(), now = g.now();
    const s = (sess?.s ?? (last?.s && g.now() - (last.s as CrashS).t0 < 60000 ? last.s : null)) as CrashS | null;
    let m = 1, flying = false, boomAt = 0, text = 'x1.00', color = '#cdd3f0';
    if (s) {
      const fl = now - s.t0 - CRASH_COUNTDOWN;
      const end = s.end ?? Infinity;
      if (sess) {
        if (fl < 0) text = Math.ceil(-fl / 1000) + '…';
        else { m = Math.min(s.crash, crashMult(fl)); flying = true; text = '×' + m.toFixed(2); color = '#7ee081'; }
      } else {
        const crashAt = s.t0 + CRASH_COUNTDOWN + crashTime(s.crash);
        const t = Math.min(now, crashAt);
        m = Math.min(s.crash, crashMult(Math.max(0, t - s.t0 - CRASH_COUNTDOWN)));
        flying = now < crashAt;
        if (!flying) boomAt = crashAt;
        text = s.out ? '×' + s.out.toFixed(2) + ' ✓' : '×' + s.crash.toFixed(2);
        color = s.out ? '#ffcb52' : '#ff4d6d';
        if (end < crashAt && flying) text = '×' + s.out!.toFixed(2) + ' ✓';
      }
    }
    const back = boomAt && now - boomAt > 2500;   // a fresh rocket stands on the pad again
    const h = (flying || boomAt) && !back ? Math.min(4.2, Math.sqrt(m - 1) * 2) : 0;
    r.position.set(Math.sin(now / 90) * 0.02 * (flying ? 1 : 0), 0.55 + h, 0);
    r.visible = !(boomAt && now - boomAt > 100) || !!back;
    if (flame.current) { flame.current.visible = flying; flame.current.scale.set(1, 0.8 + Math.random() * 0.6, 1); }
    if (blast.current) {
      const p = boomAt ? (now - boomAt) / 700 : 2;
      blast.current.visible = p < 1;
      blast.current.position.y = 0.9 + h;
      blast.current.scale.setScalar(0.2 + p * 1.6);
      (blast.current.material as MeshBasicMaterial).opacity = 1 - p;
    }
    if (text + color !== label.last) {
      label.last = text + color;
      const c2 = label.c.getContext('2d')!;
      c2.fillStyle = '#05060f'; c2.fillRect(0, 0, 512, 192);
      c2.fillStyle = color; c2.font = '110px "Russo One", sans-serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle';
      c2.fillText(text, 256, 100);
      label.t.needsUpdate = true;
    }
    if (screen.current) screen.current.map = label.t;
  });
  return (
    <group>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow><cylinderGeometry args={[1.1, 1.3, 0.5, 8]} /><meshStandardMaterial color={th.base} /></mesh>
      <mesh position={[0, 0.52, 0]}><cylinderGeometry args={[0.7, 0.7, 0.04, 24]} /><meshBasicMaterial color={th.accent} toneMapped={false} /></mesh>
      <group ref={rocket}>
        <mesh position={[0, 0.6, 0]} castShadow><cylinderGeometry args={[0.22, 0.26, 0.9, 12]} /><meshStandardMaterial color="#eeeeee" metalness={0.3} roughness={0.4} /></mesh>
        <mesh position={[0, 1.25, 0]} castShadow><coneGeometry args={[0.22, 0.42, 12]} /><meshStandardMaterial color="#ff2b4a" /></mesh>
        <mesh position={[0, 0.75, 0.2]}><circleGeometry args={[0.08, 12]} /><meshStandardMaterial color="#3fb6ff" emissive="#3fb6ff" emissiveIntensity={0.6} /></mesh>
        {[0, 1, 2].map(i => <mesh key={i} position={[Math.cos(i * 2.09) * 0.27, 0.25, Math.sin(i * 2.09) * 0.27]} rotation={[0, -i * 2.09, 0]} castShadow><boxGeometry args={[0.04, 0.34, 0.2]} /><meshStandardMaterial color="#ff2b4a" /></mesh>)}
        <mesh ref={flame} position={[0, -0.05, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.16, 0.5, 10]} /><meshBasicMaterial color="#ffb020" toneMapped={false} /></mesh>
      </group>
      <mesh ref={blast} visible={false}><sphereGeometry args={[0.6, 14, 10]} /><meshBasicMaterial color="#ff7a20" transparent toneMapped={false} /></mesh>
      <group position={[-1.2, 0, -0.9]} rotation={[0, Math.PI / 4, 0]}>
        <mesh position={[0, 1.2, 0]} castShadow><boxGeometry args={[0.12, 2.4, 0.12]} /><meshStandardMaterial color="#2a2a33" /></mesh>
        <mesh position={[0, 2.3, 0.08]}><planeGeometry args={[1.5, 0.56]} /><meshBasicMaterial ref={screen} toneMapped={false} /></mesh>
      </group>
    </group>
  );
}

/* ---------- plinko: an upright board of pegs ---------- */
const PEG_DX = 0.22, ROW_DY = 0.2, TOP = 2.95;
const SLOT_COLORS = (m: number) => (m >= 10 ? '#ff2b4a' : m >= 3 ? '#ff9a3c' : m >= 1 ? '#ffcb52' : '#7ee081');

export function PlinkoProp({ th }: { th: Theme }) {
  const pegRef = useRef<InstancedMesh>(null);
  const balls = useRef<{ path: number[]; at: number }[]>([]);
  const ballMeshes = useRef<(Mesh | null)[]>([]);
  const seen = useRef(-1);
  const { last, lastAt } = useRound('plinko');
  const risk = (last?.s as { risk: number } | undefined)?.risk ?? 1;
  if (last && last.n !== seen.current) { seen.current = last.n; balls.current.push({ path: (last.s as { path: number[] }).path, at: lastAt }); }
  useFrame(() => {
    const im = pegRef.current;
    if (im && !im.userData.done) {
      const o = new Object3D();
      let k = 0;
      for (let r = 0; r < PLINKO_ROWS; r++) for (let j = 0; j < r + 3; j++) { o.position.set((j - (r + 2) / 2) * PEG_DX, TOP - r * ROW_DY, 0); o.updateMatrix(); im.setMatrixAt(k++, o.matrix); }
      im.instanceMatrix.needsUpdate = true;
      im.userData.done = true;
    }
    const now = performance.now();
    balls.current = balls.current.filter(b => now - b.at < PLINKO_FALL + 600);
    for (let i = 0; i < 8; i++) {
      const m = ballMeshes.current[i], b = balls.current[balls.current.length - 1 - i];
      if (!m) continue;
      if (!b) { m.visible = false; continue; }
      m.visible = true;
      const t = Math.min(1, (now - b.at) / PLINKO_FALL) * (PLINKO_ROWS + 1);
      const r = Math.min(PLINKO_ROWS, Math.floor(t)), f = t - r;
      let x = 0;
      for (let k = 0; k < r; k++) x += b.path[k] ? 0.5 : -0.5;
      const nx = r < PLINKO_ROWS ? x + (b.path[r] ? 0.5 : -0.5) : x;
      m.position.set((x + (nx - x) * f) * PEG_DX, TOP + 0.2 - (r + f) * ROW_DY + Math.sin(f * Math.PI) * 0.06, 0.06);
    }
  });
  const mults = PLINKO[risk];
  return (
    <group rotation={[0, Math.PI / 4, 0]}>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow><boxGeometry args={[3.4, 0.4, 1.2]} /><meshStandardMaterial color={th.base} /></mesh>
      <mesh position={[0, 1.8, -0.1]} castShadow><boxGeometry args={[3.3, 3.2, 0.12]} /><meshStandardMaterial color="#141832" /></mesh>
      <instancedMesh ref={pegRef} args={[undefined, undefined, (PLINKO_ROWS * (PLINKO_ROWS + 5)) / 2]}>
        <sphereGeometry args={[0.035, 8, 6]} />
        <meshBasicMaterial color="#e8ecff" toneMapped={false} />
      </instancedMesh>
      {mults.map((m, i) => (
        <mesh key={i} position={[(i - PLINKO_ROWS / 2) * PEG_DX, TOP - PLINKO_ROWS * ROW_DY - 0.05, 0.02]}>
          <boxGeometry args={[PEG_DX * 0.9, 0.14, 0.06]} />
          <meshBasicMaterial color={SLOT_COLORS(m)} toneMapped={false} />
        </mesh>
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} ref={m => { ballMeshes.current[i] = m; }} visible={false}><sphereGeometry args={[0.06, 12, 10]} /><meshBasicMaterial color="#ff2bd6" toneMapped={false} /></mesh>
      ))}
    </group>
  );
}
