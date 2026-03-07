import Phaser from 'phaser';
import { resetSeenDeaths } from './DeathScene';

// Track infant deaths across scene restarts via module-level state
let recentDeaths: number[] = [];

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.cameras.main.setBackgroundColor('#0a0a0a');

    // Title
    this.add.text(width / 2, height / 3, 'NOBLE SAVAGE', {
      fontFamily: 'monospace',
      fontSize: '32px',
      color: '#c8b080',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height / 3 + 45, 'Survival is not given', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#888888',
    }).setOrigin(0.5);

    // Prompt
    const prompt = this.add.text(width / 2, height * 0.7, 'Press any key to begin', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#666666',
    }).setOrigin(0.5);

    // Blink effect
    this.tweens.add({
      targets: prompt,
      alpha: 0.2,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // Any key starts the game — but you probably won't make it
    const startGame = () => {
      this.input.keyboard!.removeAllListeners();
      this.input.removeAllListeners();

      // Mercy rule: 2+ deaths in the last 60 seconds = you survive
      const now = Date.now();
      recentDeaths = recentDeaths.filter(t => now - t < 60_000);
      const mercyGranted = recentDeaths.length >= 2;

      if (!mercyGranted && Math.random() < 0.5) {
        recentDeaths.push(now);
        this.scene.start('DeathScene');
      } else {
        recentDeaths = [];
        resetSeenDeaths();
        this.scene.start('AfflictionScene');
      }
    };

    this.input.keyboard!.on('keydown', startGame);
    this.input.on('pointerdown', startGame);
  }
}
