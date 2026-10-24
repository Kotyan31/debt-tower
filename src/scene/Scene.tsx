import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Vector3, type OrthographicCamera } from 'three';
import { THEMES } from './theme.ts';
import { Room } from './Room.tsx';
import { Player } from './Player.tsx';
import { Lift } from './Lift.tsx';
import { Table } from './Table.tsx';
import { TABLE_SLOTS, world, slotOf } from './world.ts';
import { useGame } from '../state/game.ts';
import { useSettings } from '../state/settings.ts';
import { useT } from '../i18n/index.ts';
import { panelInset } from '../ui/layout.ts';
import type { GameId } from '../core/index.ts';

const OFFSET = new Vector3(1, 1.25, 1).normalize().multiplyScalar(60);
const MENU_TABLES: GameId[] = ['slots', 'duck', 'roulette', 'crash', 'blackjack'];

function CameraRig() {
  const { size, camera } = useThree();
  const look = useRef(new Vector3(0, 0, 0));
  const right = useRef(new Vector3()), up = useRef(new Vector3());
  useFrame((_, dt) => {
    const g = useGame.getState();
    const cam = camera as OrthographicCamera;
    const base = Math.min(size.width / (size.width < 700 ? 15 : 24), size.height / 15);
    let want: Vector3, zoom: number;
    const seat = g.table && g.run ? slotOf(g.run.tables, g.table) : null;
    if (g.screen !== 'play' || !g.run) {
      const t = performance.now() / 9000;
      want = new Vector3(Math.sin(t) * 2, 0, Math.cos(t) * 1.5);
      zoom = base * 1.05;
    } else if (seat) {
      want = new Vector3(seat[0], 1.3, seat[1]);
      zoom = base * (size.width < 700 ? 1.75 : 2.25);
      const inset = panelInset(size.width, size.height);
      right.current.setFromMatrixColumn(cam.matrixWorld, 0);
      up.current.setFromMatrixColumn(cam.matrixWorld, 1);
      want.addScaledVector(right.current, inset.right / 2 / zoom);
      want.addScaledVector(up.current, -inset.bottom / 2 / zoom);
    } else if (g.run.phase !== 'day') {
      want = new Vector3(0, 0, 0);
      zoom = base;
    } else {
      want = new Vector3(world.pos.x * 0.75, 0.8, world.pos.z * 0.75);
      zoom = base * (size.width < 700 ? 1.45 : 1.3);
    }
    const k = Math.min(1, dt * 4);
    look.current.lerp(want, k);
    cam.zoom += (zoom - cam.zoom) * k;
    cam.position.copy(look.current).add(OFFSET);
    cam.lookAt(look.current);
    cam.updateProjectionMatrix();
  });
  return null;
}

function World() {
  const t = useT();
  const floor = useGame(s => (s.screen === 'play' && s.run ? s.run.floor : 0));
  const tables = useGame(s => (s.screen === 'play' && s.run?.tables.length ? s.run.tables : MENU_TABLES));
  const playing = useGame(s => s.screen === 'play' && !!s.run && s.run.phase === 'day');
  const th = THEMES[floor];
  return (
    <>
      <color attach="background" args={[th.bg]} />
      <hemisphereLight args={[th.light, th.ambient, 1.2]} />
      <ambientLight intensity={0.3} />
      <directionalLight
        castShadow position={[9, 18, 7]} intensity={1.7} color={th.light}
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}
        shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16} shadow-camera-near={1} shadow-camera-far={60}
      />
      <pointLight position={[-6, 4, 4]} color={th.accent} intensity={20} distance={14} decay={1.5} />
      <pointLight position={[6, 4, -5]} color={th.trim} intensity={20} distance={14} decay={1.5} />
      <Room floor={floor} th={th} name={t.floors[floor]} />
      <Lift th={th} floor={floor} label={t.hud.lift} />
      {tables.map((id, i) => <Table key={floor + ':' + id} id={id} pos={TABLE_SLOTS[i]} th={th} label={t.games[id]} />)}
      {playing && <Player color="#2f6bff" />}
      <CameraRig />
    </>
  );
}

export function Scene() {
  const gfx = useSettings(s => s.gfx);
  const hi = gfx === 'high';
  return (
    <Canvas
      orthographic shadows={hi} dpr={hi ? [1, 2] : [1, 1.25]}
      camera={{ position: [40, 50, 40], zoom: 40, near: -200, far: 400 }}
      gl={{ antialias: !hi, powerPreference: 'high-performance' }}
      onContextMenu={e => e.preventDefault()}
    >
      <World />
      {hi && (
        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur intensity={0.45} luminanceThreshold={0.95} luminanceSmoothing={0.2} />
          <Vignette eskil={false} offset={0.25} darkness={0.55} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
