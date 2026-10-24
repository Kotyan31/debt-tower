import type { ReactElement } from 'react';
import type { GameId } from '../../core/index.ts';
import type { PanelProps } from '../GamePanel.tsx';
import { CoinPanel, SlotsPanel, DuckPanel, WheelPanel, PlinkoPanel, KenoPanel, BaccaratPanel } from './Simple.tsx';
import { CrapsPanel, HiloPanel, MinesPanel, PenguinPanel, DragonPanel, CrashPanel } from './Steps.tsx';
import { BlackjackPanel, PokerPanel, RoulettePanel, MoneyWheelPanel } from './Tables.tsx';

export const PANELS: Record<GameId, (p: PanelProps) => ReactElement> = {
  coin: CoinPanel, slots: SlotsPanel, duck: DuckPanel, craps: CrapsPanel, hilo: HiloPanel,
  blackjack: BlackjackPanel, roulette: RoulettePanel, wheel: WheelPanel, keno: KenoPanel,
  crash: CrashPanel, plinko: PlinkoPanel, mines: MinesPanel, penguin: PenguinPanel,
  dragon: DragonPanel, poker: PokerPanel, baccarat: BaccaratPanel, moneywheel: MoneyWheelPanel,
};
