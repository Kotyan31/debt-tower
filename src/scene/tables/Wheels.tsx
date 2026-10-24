import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';
import { useRound, easeOut, FeltTable, Chips } from './common.tsx';
import { wheelTexture } from '../textures.ts';
import type { Theme } from '../theme.ts';
import { WHEEL_ORDER, RED } from '../../core/games/roulette.ts';
import { WHEELS } from '../../core/games/wheel.ts';
import { MW_SEGMENTS } from '../../core/games/moneywheel.ts';

const TAU = Math.PI * 2;

/** world angle (in the x-z plane, from +x toward +z) of pocket i on a flat wheel turned by theta */
const pocketAngle = (i: number, n: number, theta: number) => (i / n) * TAU - Math.PI / 2 - theta;

export function RouletteProp({ th }: { th: Theme }) {
  const tex = useMemo(() => wheelTexture('roulette', WHEEL_ORDER.map(String), WHEEL_ORDER.map(n => (n === 0 ? '#1f8a4a' : RED.has(n) ? '#c8102e' : '#16161c'))), []);
  const wheel = useRef<Group>(null), ball = useRef<Mesh>(null);
  const { last, lastAt } = useRound('roulette');
  const spin = useRef({ theta: 0, lastT: performance.now() });
  useFrame(() => {
    const now = performance.now(), dt = (now - spin.current.lastT) / 1000;
    spin.current.lastT = now;
    const s = last?.s as { r: number } | undefined;
    const el = s ? (now - lastAt) / 1000 : 99;
    const speed = el < 6 ? 0.25 + 2.2 * Math.max(0, 1 - el / 6) : 0.25;
    spin.current.theta += speed * dt;
    const theta = spin.current.theta;
    if (wheel.current) wheel.current.rotation.y = theta;
    const b = ball.current;
    if (!b) return;
    if (!s) { b.visible = false; return; }
    b.visible = true;
    const idx = WHEEL_ORDER.indexOf(s.r);
    const target = pocketAngle(idx, 37, theta);
    const p = Math.min(1, el / 5.4);
    const ang = target - (1 - easeOut(p)) * TAU * 7;
    const rad = 0.98 - 0.26 * Math.min(1, Math.max(0, (p - 0.55) / 0.4));
    const hop = p > 0.55 && p < 0.95 ? Math.abs(Math.sin(p * 40)) * 0.06 * (1 - p) : 0;
    b.position.set(Math.cos(ang) * rad, 0.2 + hop, Math.sin(ang) * rad);
  });
  return (
    <FeltTable w={3.8} d={2.4} felt={th.felt} rim="#3a2416">
      <group position={[-0.6, 0, 0]}>
        <mesh position={[0, 0.05, 0]} castShadow><cylinderGeometry args={[1.12, 1.12, 0.14, 40]} /><meshStandardMaterial color="#4a2a14" roughness={0.4} /></mesh>
        <group ref={wheel} position={[0, 0.13, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.92, 64]} /><meshStandardMaterial map={tex} roughness={0.35} /></mesh>
          <mesh position={[0, 0.08, 0]}><coneGeometry args={[0.16, 0.18, 8]} /><meshStandardMaterial color="#ffcb52" metalness={0.8} roughness={0.25} /></mesh>
        </group>
        <mesh position={[0, 0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.92, 1.1, 48]} /><meshStandardMaterial color="#6a3a1c" /></mesh>
        <mesh ref={ball} castShadow><sphereGeometry args={[0.06, 12, 10]} /><meshBasicMaterial color="#ffffff" toneMapped={false} /></mesh>
      </group>
      <group position={[1.15, 0.02, 0]}>
        {Array.from({ length: 12 }, (_, r) => Array.from({ length: 3 }, (_, c) => {
          const n = r * 3 + c + 1;
          return <mesh key={n} position={[(c - 1) * 0.3, 0, (r - 5.5) * 0.15]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.27, 0.13]} /><meshStandardMaterial color={RED.has(n) ? '#c8102e' : '#16161c'} /></mesh>;
        }))}
      </group>
      <Chips pos={[1.2, 0, 0.3]} n={2} color={th.accent} />
    </FeltTable>
  );
}

/** a big upright wheel facing the camera, with a pointer on top */
function UprightWheel({ id, segs, labels, colors, radius, standH, ink = '#fff' }: { id: 'wheel' | 'moneywheel'; segs: number; labels: string[]; colors: string[]; radius: number; standH: number; ink?: string }) {
  const tex = useMemo(() => wheelTexture(id + labels.join(','), labels, colors, ink), [id, labels, colors, ink]);
  const disc = useRef<Group>(null);
  const { last, lastAt } = useRound(id);
  const st = useRef({ from: 0, to: 0, n: -1 });
  useFrame(() => {
    const d = disc.current;
    if (!d) return;
    const now = performance.now();
    const s = last?.s as { i: number } | undefined;
    if (s && last!.n !== st.current.n) {
      const cur = d.rotation.z;
      const want = (s.i / segs) * TAU;
      let to = want + Math.ceil((cur - want) / TAU + 4) * TAU;
      if (to - cur < TAU * 4) to += TAU;
      st.current = { from: cur, to, n: last!.n };
    }
    if (!s) { d.rotation.z = Math.sin(now / 2000) * 0.05; return; }
    const p = Math.min(1, (now - lastAt) / ((id === 'wheel' ? 4600 : 5400)));
    d.rotation.z = st.current.from + (st.current.to - st.current.from) * easeOut(p);
  });
  return (
    <group rotation={[0, Math.PI / 4, 0]}>
      <mesh position={[0, (standH + radius) / 2, -0.25]} castShadow><boxGeometry args={[0.5, standH + radius, 0.3]} /><meshStandardMaterial color="#2a2a33" /></mesh>
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow><boxGeometry args={[radius * 2.2, 0.2, 1.4]} /><meshStandardMaterial color="#1c1a20" /></mesh>
      <group position={[0, standH + radius + 0.15, 0.05]}>
        <mesh position={[0, 0, -0.08]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[radius + 0.12, radius + 0.12, 0.12, 48]} /><meshStandardMaterial color="#ffcb52" metalness={0.7} roughness={0.3} /></mesh>
        <group ref={disc}>
          <mesh><circleGeometry args={[radius, 64]} /><meshStandardMaterial map={tex} roughness={0.5} /></mesh>
        </group>
        <mesh position={[0, radius + 0.12, 0.08]} rotation={[0, 0, Math.PI]}><coneGeometry args={[0.13, 0.32, 4]} /><meshBasicMaterial color="#ff2b4a" toneMapped={false} /></mesh>
        <mesh position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.14, 0.14, 0.08, 16]} /><meshStandardMaterial color="#ffcb52" metalness={0.8} /></mesh>
      </group>
    </group>
  );
}

const WHEEL_COLORS = ['#ff4d6d', '#3fb6ff', '#ffcb52', '#7ee081', '#c77dff', '#ff9a3c'];

export function WheelProp() {
  const { last } = useRound('wheel');
  const risk = (last?.s as { risk: number } | undefined)?.risk ?? 1;
  const labels = useMemo(() => WHEELS[risk].map(m => (m ? '×' + m : '0')), [risk]);
  const colors = useMemo(() => WHEELS[risk].map((m, i) => (m === 0 ? '#2a2a36' : WHEEL_COLORS[i % WHEEL_COLORS.length])), [risk]);
  return <UprightWheel id="wheel" segs={20} labels={labels} colors={colors} radius={1.15} standH={1.0} />;
}

const MW_COLOR: Record<number, string> = { 1: '#e8e0c8', 3: '#3fb6ff', 5: '#7ee081', 10: '#c77dff', 25: '#ff9a3c', 50: '#ff2b4a' };
export function MoneyWheelProp() {
  const labels = useMemo(() => MW_SEGMENTS.map(String), []);
  const colors = useMemo(() => MW_SEGMENTS.map(k => MW_COLOR[k]), []);
  return <UprightWheel id="moneywheel" segs={60} labels={labels} colors={colors} radius={1.45} standH={0.9} ink="#1b1b24" />;
}
