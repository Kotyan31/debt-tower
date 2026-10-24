// the guard must run before anything else touches the built-ins
import './net/guard.ts';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App.tsx';
import { startClock, useGame } from './state/game.ts';
import { boot } from './net/leaderboard.ts';
import { useSettings } from './state/settings.ts';
import './ui/styles.css';

document.documentElement.lang = useSettings.getState().lang;
startClock();
// offline checks only: ?debug on localhost exposes the stores
if (/[?&]debug/.test(location.search) && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
  (window as unknown as Record<string, unknown>).__dt = useGame;
}
boot();
createRoot(document.getElementById('root')!).render(<App />);
