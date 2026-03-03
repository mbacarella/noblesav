import Phaser from 'phaser';

// Placeholder world scene for Phase 2
export class WorldScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.cameras.main.setBackgroundColor('#1a2a1a');

    this.add.text(width / 2, height / 2, 'World Scene\n(Phase 2)', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#666666',
      align: 'center',
    }).setOrigin(0.5);
  }
}
