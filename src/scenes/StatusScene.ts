import Phaser from 'phaser';
import { SurvivalSystem } from '../systems/SurvivalSystem';

const STATS_DISPLAY = [
  { key: 'health', label: 'HP' },
  { key: 'hunger', label: 'Food' },
  { key: 'warmth', label: 'Warm' },
  { key: 'morale', label: 'Will' },
  { key: 'standing', label: 'Rank' },
];

const BAR_WIDTH = 50;
const BAR_HEIGHT = 8;

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
    const height = this.cameras.main.height;
    const barY = height - 50;

    this.graphics = this.add.graphics();

    // Background bar
    this.graphics.fillStyle(0x111122, 0.9);
    this.graphics.fillRect(0, barY - 6, width, 56);
    this.graphics.lineStyle(1, 0x445566, 0.6);
    this.graphics.strokeRect(0, barY - 6, width, 56);

    const spacing = width / (STATS_DISPLAY.length + 1);

    STATS_DISPLAY.forEach((stat, i) => {
      const x = spacing * (i + 1) - BAR_WIDTH / 2;
      const label = this.add.text(x + BAR_WIDTH / 2, barY, stat.label, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#888888',
      }).setOrigin(0.5, 0);
      this.labels.push(label);
    });

    this.drawBars();

    // Listen for updates
    this.events.on('updateStats', this.drawBars, this);
    // Also accept from parent scene
    const dialogueScene = this.scene.get('DialogueScene');
    if (dialogueScene) {
      dialogueScene.events?.on('updateStats', this.drawBars, this);
    }
  }

  private drawBars(): void {
    if (!this.graphics) return;

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const barY = height - 50 + 16;
    const spacing = width / (STATS_DISPLAY.length + 1);

    // Clear only bar area (redraw bars)
    this.graphics.fillStyle(0x111122, 0.9);
    this.graphics.fillRect(0, barY - 2, width, BAR_HEIGHT + 14);

    STATS_DISPLAY.forEach((stat, i) => {
      const x = spacing * (i + 1) - BAR_WIDTH / 2;
      const value = this.survival.getStat(stat.key);
      const fillWidth = (value / 100) * BAR_WIDTH;
      const color = this.survival.getStatColor(stat.key);

      // Background
      this.graphics.fillStyle(0x333333, 1);
      this.graphics.fillRect(x, barY, BAR_WIDTH, BAR_HEIGHT);

      // Fill
      this.graphics.fillStyle(color, 1);
      this.graphics.fillRect(x, barY, fillWidth, BAR_HEIGHT);

      // Value text
      if (this.labels[i]) {
        // Update or create value text below bar
      }
    });
  }
}
