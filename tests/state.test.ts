import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const saved = vi.hoisted(() => new Map<string, string>());
vi.mock('../src/net/storage.ts', () => ({
  store: { get: (key: string) => saved.get(key) ?? null, set: (key: string, value: string | null) => value === null ? saved.delete(key) : saved.set(key, value) },
  hex: () => '11'.repeat(16),
}));
vi.mock('../src/net/guard.ts', () => ({ secureBytes: () => new Uint8Array(16) }));
vi.mock('../src/net/leaderboard.ts', () => ({ markStart: async () => null, submitRun: vi.fn() }));
vi.mock('../src/audio/sfx.ts', () => ({ sfx: vi.fn() }));

import { useGame } from '../src/state/game.ts';
import { world, SPAWN } from '../src/scene/world.ts';
import { DAY_MS, replay, summary } from '../src/core/index.ts';

const initial = useGame.getState();
beforeEach(() => {
  saved.clear();
  useGame.setState(initial, true);
  vi.useFakeTimers({ toFake: ['Date', 'performance'] });
  vi.setSystemTime(1000000);
});
afterEach(() => vi.useRealTimers());

function startDay() {
  useGame.getState().newGame();
  expect(useGame.getState().act('n')).toBe(true);
}

describe('saved games and round transitions', () => {
  it('reopens an unfinished table when continuing a saved run', () => {
    startDay();
    expect(useGame.getState().act('s', 'hilo', 10, {})).toBe(true);
    useGame.getState().toMenu();
    expect(useGame.getState().resume()).toBe(true);
    expect(useGame.getState().table).toBe('hilo');
    expect(useGame.getState().run?.game?.id).toBe('hilo');
  });

  it('waits for a payout reveal before accepting another bet', () => {
    startDay();
    expect(useGame.getState().act('s', 'coin', 10, { side: 0 })).toBe(true);
    const r = useGame.getState().run!;
    vi.advanceTimersByTime(r.busy + 1);
    expect(useGame.getState().act('s', 'coin', 10, { side: 0 })).toBe(false);
    vi.advanceTimersByTime(r.last!.anim);
    expect(useGame.getState().act('s', 'coin', 10, { side: 0 })).toBe(true);
  });

  it('dismisses a confirmation when the day ends', () => {
    startDay();
    useGame.getState().set({ modal: 'confirmEnd' });
    vi.advanceTimersByTime(DAY_MS);
    expect(useGame.getState().act('e')).toBe(true);
    expect(useGame.getState().modal).toBeNull();
    expect(useGame.getState().run?.phase).toBe('shark');
    expect(summary(replay(useGame.getState().seed, useGame.getState().log))).toEqual(summary(useGame.getState().run!));
  });

  it('resets movement and spawns at the entrance on a new run', () => {
    world.pos.set(10, 0, 8);
    world.keys.add('KeyW');
    world.stick = { x: 1, y: 1 };
    world.goal = { k: 'lift' };
    startDay();
    expect([world.pos.x, world.pos.z]).toEqual(SPAWN);
    expect(world.keys.size).toBe(0);
    expect(world.stick).toEqual({ x: 0, y: 0 });
    expect(world.goal).toBeNull();
  });

  it('refuses actions from the main menu', () => {
    startDay();
    useGame.getState().toMenu();
    expect(useGame.getState().act('s', 'coin', 10, { side: 0 })).toBe(false);
  });
});
