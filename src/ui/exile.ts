import { showScreen } from './screens';
import { showTitle } from './title';

const EXILE_TEXT =
  "The village has made its decision without words, as it makes all decisions — through silence and turned backs. No one defends you. No one speaks for you. One morning you find your belongings placed outside the longhouse. No one looks at you as you gather them. You walk into the forest because there is nowhere else to go.\n\nYou survive for eleven days. You build a fire. You set snares that catch nothing. The forest, which was beautiful when you had a village to return to, is just cold and empty and very large. On the twelfth night, the fire goes out and you cannot get it started again. Your hands shake too badly. You curl up in the leaves and wait for morning. Morning comes. You do not.";

export function showExile(): void {
  showScreen('screen-exile');

  const textEl = document.getElementById('exile-text')!;
  const promptEl = document.getElementById('exile-prompt')!;
  textEl.textContent = EXILE_TEXT;

  // Reset animations
  textEl.style.animation = 'none';
  promptEl.style.animation = 'none';
  void textEl.offsetHeight;
  textEl.style.animation = '';
  promptEl.style.animation = '';

  let ready = false;
  const readyTimeout = setTimeout(() => { ready = true; }, 4000);

  const handler = () => {
    if (!ready) return;
    cleanup();
    showTitle();
  };

  document.addEventListener('keydown', handler);
  document.getElementById('screen-exile')!.addEventListener('click', handler);

  function cleanup() {
    document.removeEventListener('keydown', handler);
    document.getElementById('screen-exile')!.removeEventListener('click', handler);
    clearTimeout(readyTimeout);
  }
}
