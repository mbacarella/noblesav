import Phaser from 'phaser';

const EXILE_TEXT =
  "The village has made its decision without words, as it makes all decisions — through silence and turned backs. No one defends you. No one speaks for you. One morning you find your belongings placed outside the longhouse. No one looks at you as you gather them. You walk into the forest because there is nowhere else to go.\n\nYou survive for eleven days. You build a fire. You set snares that catch nothing. The forest, which was beautiful when you had a village to return to, is just cold and empty and very large. On the twelfth night, the fire goes out and you cannot get it started again. Your hands shake too badly. You curl up in the leaves and wait for morning. Morning comes. You do not.";

export class ExileScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ExileScene' });
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.cameras.main.setBackgroundColor('#000000');

    const text = this.add.text(width / 2, height / 2 - 30, EXILE_TEXT, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#888888',
      wordWrap: { width: width - 80 },
      lineSpacing: 6,
      align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: text,
      alpha: 1,
      duration: 3000,
    });

    const prompt = this.add.text(width / 2, height - 60, 'Press any key to try again', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#444444',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: prompt,
      alpha: 1,
      duration: 1000,
      delay: 4000,
    });

    this.time.delayedCall(4000, () => {
      this.input.keyboard!.on('keydown', () => {
        this.scene.start('TitleScene');
      });
      this.input.on('pointerdown', () => {
        this.scene.start('TitleScene');
      });
    });
  }
}
