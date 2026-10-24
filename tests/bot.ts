import { newRun, tryApply, deadline, FLOORS, type Act, type Run, type GameId } from '../src/core/index.ts';

/** a careless bot: walks the tower and bets at random, the way a page would log it */
export function botRun(seed: string, salt: number): { run: Run; log: Act[] } {
  let r = newRun(seed);
  const log: Act[] = [];
  let t = 0, x = salt;
  const rnd = (n: number) => { x = (x * 1103515245 + 12345) % 2147483648; return x % n; };
  const go = (a: Act) => { const next = tryApply(r, a); if (next) { r = next; log.push(a); } return !!next; };
  go([t, 'b', 'lucky']);
  go([t, 'n']);
  for (let step = 0; step < 4000 && r.phase !== 'over'; step++) {
    t += 300 + rnd(2500);
    if (r.phase === 'shop') { if (r.day >= 6) { go([t, 'q']); break; } go([t, 'b', 'insurance']); go([t, 'u', 'insurance']); go([t, 'n']); continue; }
    if (r.phase === 'shark') { if (r.cash < r.quota && r.organs < 3) go([t, 'o']); else go([t, 'p']); continue; }
    if (t > deadline(r)) { go([t, 'e']); continue; }
    if (r.game) {
      const id = r.game.id;
      const acts: Record<string, [string, unknown][]> = {
        craps: [['roll', 0]], hilo: [['hi', 0], ['lo', 0], ['cash', 0]], blackjack: [['hit', 0], ['stand', 0], ['double', 0]],
        crash: [['cash', 0]], mines: [['pick', rnd(25)], ['cash', 0]], penguin: [['go', 0], ['cash', 0]],
        dragon: [['pick', rnd(2)], ['cash', 0]], poker: [['draw', rnd(32)]],
      };
      const [a, arg] = acts[id][rnd(acts[id].length)];
      if (!go([t, 'a', a, arg])) go([t, 'x']);
      continue;
    }
    if (r.unlocked > r.floor && rnd(3) === 0) { go([t, 'f', r.unlocked]); continue; }
    if (rnd(40) === 0) { go([t, 'e']); continue; }
    const id = r.tables[rnd(r.tables.length)] as GameId, fl = FLOORS[r.floor];
    const bet = Math.min(fl.max, Math.max(fl.min, Math.floor(r.cash / (2 + rnd(4)))));
    const opts: Record<string, unknown> = {
      coin: { side: rnd(2) }, duck: { pick: rnd(5) }, wheel: { risk: rnd(3) }, keno: { picks: [1, 7, 13, 22, 38].slice(0, 1 + rnd(5)) },
      roulette: { bets: [['red', 0, bet]] }, crash: { auto: 1.5 + rnd(3) }, plinko: { risk: rnd(3) }, mines: { mines: 1 + rnd(5) },
      penguin: { diff: rnd(4) }, dragon: { diff: rnd(3) }, baccarat: { side: 'pbt'[rnd(3)] }, moneywheel: { bets: [[1, bet]] },
    };
    go([t, 's', id, bet, opts[id] ?? {}]);
  }
  return { run: r, log };
}
