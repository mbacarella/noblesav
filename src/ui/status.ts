import { SurvivalSystem } from '../systems/SurvivalSystem';

const STATS_DISPLAY = [
  { key: 'health', label: 'HP' },
  { key: 'morale', label: 'Will' },
  { key: 'standing', label: 'Status' },
];

let hudEl: HTMLElement;
let survival: SurvivalSystem;

export function initStatus(sys: SurvivalSystem): void {
  survival = sys;
  hudEl = document.getElementById('status-hud')!;
  renderBars();
}

export function updateStatus(): void {
  renderBars();
}

function renderBars(): void {
  hudEl.innerHTML = '';
  for (const stat of STATS_DISPLAY) {
    const value = survival.getStat(stat.key);
    const color = colorForValue(value);

    const item = document.createElement('div');
    item.className = 'stat-item';

    const label = document.createElement('span');
    label.className = 'stat-label';
    label.textContent = stat.label;

    const barBg = document.createElement('div');
    barBg.className = 'stat-bar-bg';

    const barFill = document.createElement('div');
    barFill.className = 'stat-bar-fill';
    barFill.style.width = `${value}%`;
    barFill.style.backgroundColor = color;

    barBg.appendChild(barFill);
    item.appendChild(label);
    item.appendChild(barBg);
    hudEl.appendChild(item);
  }
}

function colorForValue(value: number): string {
  if (value > 60) return '#44cc44';
  if (value > 30) return '#cccc44';
  return '#cc4444';
}
