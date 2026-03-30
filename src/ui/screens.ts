/** Screen manager: show/hide screens by ID */

const screens = new Map<string, HTMLElement>();

export function initScreens(): void {
  document.querySelectorAll<HTMLElement>('.screen').forEach(el => {
    screens.set(el.id, el);
  });
}

export function showScreen(id: string): void {
  for (const [, el] of screens) {
    el.classList.remove('active');
  }
  const target = screens.get(id);
  if (target) {
    target.classList.add('active');
  }
}
