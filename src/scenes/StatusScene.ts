import Phaser from 'phaser';
import { SurvivalSystem } from '../systems/SurvivalSystem';

const STATS_DISPLAY = [
  { key: 'health', label: 'HP' },
  { key: 'morale', label: 'Will' },
  { key: 'standing', label: 'Rank' },
];

const BAR_WIDTH = 30;
const BAR_HEIGHT = 4;
const RIGHT_MARGIN = 8;
const TOP_MARGIN = 6;
const ROW_HEIGHT = 14;

export class StatusScene extends Phaser.Scene {
  private survival!: SurvivalSystem;
  private graphics!: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'StatusScene' });
  }

  init(data: { survival: SurvivalSystem }): void {
    this.survival = data.survival;
  }

  create(): void {
    const width = this.cameras.main.width;
    this.graphics = this.add.graphics();

    STATS_DISPLAY.forEach((stat, i) => {
      const y = TOP_MARGIN + i * ROW_HEIGHT;
      const label = this.add.text(
        width - RIGHT_MARGIN - BAR_WIDTH - 4, y,
        stat.label,
        { fontFamily: 'monospace', fontSize: '8px', color: '#777777' }
      ).setOrigin(1, 0);
      this.labels.push(label);
    });

    this.drawBars();

    this.events.on('updateStats', this.drawBars, this);
    const dialogueScene = this.scene.get('DialogueScene');
    if (dialogueScene) {
      dialogueScene.events?.on('updateStats', this.drawBars, this);
    }
  }

  private drawBars(): void {
    if (!this.graphics) return;

    const width = this.cameras.main.width;
    this.graphics.clear();

    // Semi-transparent background panel
    const panelW = 80;
    const panelH = STATS_DISPLAY.length * ROW_HEIGHT + TOP_MARGIN + 2;
    this.graphics.fillStyle(0x000000, 0.35);
    this.graphics.fillRoundedRect(width - panelW - 4, 2, panelW + 2, panelH, 3);

    STATS_DISPLAY.forEach((stat, i) => {
      const y = TOP_MARGIN + i * ROW_HEIGHT + 2;
      const barX = width - RIGHT_MARGIN - BAR_WIDTH;
      const value = this.survival.getStat(stat.key);
      const fillWidth = (value / 100) * BAR_WIDTH;
      const color = this.survival.getStatColor(stat.key);

      // Background
      this.graphics.fillStyle(0x333333, 0.8);
      this.graphics.fillRect(barX, y, BAR_WIDTH, BAR_HEIGHT);

      // Fill
      this.graphics.fillStyle(color, 1);
      this.graphics.fillRect(barX, y, fillWidth, BAR_HEIGHT);
    });
  }
}
