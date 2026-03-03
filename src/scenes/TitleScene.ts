import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Dark background
    this.cameras.main.setBackgroundColor('#0a0a0a');

    // Title
    this.add.text(width / 2, height / 3, 'NOBLE SAVAGE', {
      fontFamily: 'monospace',
      fontSize: '32px',
      color: '#c8b080',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height / 3 + 45, 'A life before contact', {
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

    // Any key starts the game
    this.input.keyboard!.on('keydown', () => {
      this.scene.start('DialogueScene', { event: 'prologue' });
    });

    this.input.on('pointerdown', () => {
      this.scene.start('DialogueScene', { event: 'prologue' });
    });
  }
}
