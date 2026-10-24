import { useMemo, type ReactElement } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { GameId } from '../core/index.ts';
import type { Theme } from './theme.ts';
import { signTexture } from './textures.ts';
import { visitTable } from './world.ts';
import { useGame } from '../state/game.ts';
import { SlotsProp } from './tables/Slots.tsx';
import { CoinProp } from './tables/Coin.tsx';
import { DuckProp } from './tables/Duck.tsx';
import { CrapsProp } from './tables/Craps.tsx';
import { BlackjackProp, BaccaratProp, HiloProp, PokerProp } from './tables/Cards.tsx';
import { RouletteProp, WheelProp, MoneyWheelProp } from './tables/Wheels.tsx';
import { KenoProp, CrashProp, PlinkoProp } from './tables/Arcade.tsx';
import { MinesProp, PenguinProp, DragonProp } from './tables/Grid.tsx';

const PROPS: Record<GameId, (p: { th: Theme }) => ReactElement> = {
  slots: SlotsProp, coin: CoinProp, duck: DuckProp, craps: CrapsProp, hilo: HiloProp,
  blackjack: BlackjackProp, roulette: RouletteProp, wheel: WheelProp, keno: KenoProp,
  crash: CrashProp, plinko: PlinkoProp, mines: MinesProp, penguin: PenguinProp,
  dragon: DragonProp, poker: PokerProp, baccarat: BaccaratProp, moneywheel: MoneyWheelProp,
};

/** props that face the room at an angle look better turned toward the camera */
const FACE: Partial<Record<GameId, number>> = { slots: Math.PI / 4, poker: Math.PI / 4 };
/** signs float above the tall machines */
const SIGN_Y: Partial<Record<GameId, number>> = { dragon: 4.9, wheel: 4.2, moneywheel: 4.8, plinko: 4.1, keno: 3.9, crash: 3.9 };

export function Table({ id, pos, th, label }: { id: GameId; pos: [number, number]; th: Theme; label: string }) {
  const Prop = PROPS[id];
  const sign = useMemo(() => signTexture(label, th.trim), [label, th]);
  const near = useGame(s => s.near?.k === 'table' && s.near.id === id);
  const seated = useGame(s => s.table === id);
  const onClick = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const g = useGame.getState();
    if (g.screen !== 'play' || g.table || g.modal || g.liftOpen || g.run?.phase !== 'day') return;
    visitTable(g.run.tables, id);
  };
  return (
    <group position={[pos[0], 0, pos[1]]} onPointerDown={onClick}>
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.05, 2.15, 48]} />
        <meshBasicMaterial color={near || seated ? th.trim : th.accent} transparent opacity={near || seated ? 0.95 : 0.25} toneMapped={false} />
      </mesh>
      <group rotation={[0, FACE[id] ?? 0, 0]}><Prop th={th} /></group>
      <mesh position={[0, SIGN_Y[id] ?? 3.6, 0]} rotation={[0, Math.PI / 4, 0]}>
        <planeGeometry args={[3.2, 0.8]} />
        <meshBasicMaterial map={sign} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
