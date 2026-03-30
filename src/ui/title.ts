import { showScreen } from './screens';
import { showDeath, resetSeenDeaths } from './death';
import { showAffliction } from './affliction';

let recentDeaths: number[] = [];

export function showTitle(): void {
  showScreen('screen-title');

  const handler = () => {
    cleanup();

    // Mercy rule: 2+ deaths in the last 60 seconds = you survive
    const now = Date.now();
    recentDeaths = recentDeaths.filter(t => now - t < 60_000);
    const mercyGranted = recentDeaths.length >= 2;

    if (!mercyGranted && Math.random() < 0.5) {
      recentDeaths.push(now);
      showDeath();
    } else {
      recentDeaths = [];
      resetSeenDeaths();
      showAffliction();
    }
  };

  const onKey = () => handler();
  const onClick = () => handler();

  document.addEventListener('keydown', onKey);
  document.getElementById('screen-title')!.addEventListener('click', onClick);

  function cleanup() {
    document.removeEventListener('keydown', onKey);
    document.getElementById('screen-title')!.removeEventListener('click', onClick);
  }
}
