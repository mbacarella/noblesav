import Phaser from 'phaser';

const EXILE_TEXT =
  "The village has made its decision without words, as it makes all decisions — through silence and turned backs. No one defends you. No one speaks for you. One morning you find your belongings placed outside the longhouse. No one looks at you as you gather them. You walk into the forest because there is nowhere else to go.\n\nYou survive for eleven days. You build a fire. You set snares that catch nothing. The forest, which was beautiful when you had a village to return to, is just cold and empty and very large. On the twelfth night, the fire goes out and you cannot get it started again. Your hands shake too badly. You curl up in the leaves and wait for morning. Morning comes. You do not.";

const MARGIN = 40;

export class ExileScene extends Phaser.Scene {
  private scrollY: number = 0;
  private maxScroll: number = 0;
  private container!: Phaser.GameObjects.Container;
  private touchStartY: number = 0;
  private isTouchScrolling: boolean = false;

  constructor() {
    super({ key: 'ExileScene' });
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.scrollY = 0;

    this.cameras.main.setBackgroundColor('#000000');

    this.container = this.add.container(0, 0);

    const text = this.add.text(MARGIN, MARGIN, EXILE_TEXT, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#888888',
      wordWrap: { width: width - MARGIN * 2 },
      lineSpacing: 6,
    }).setAlpha(0);
    this.container.add(text);

    const promptY = Math.max(text.y + text.height + 40, height - 60);
    const prompt = this.add.text(width / 2, promptY, 'Press any key to try again', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#444444',
    }).setOrigin(0.5).setAlpha(0);
    this.container.add(prompt);

    const contentHeight = promptY + prompt.height + MARGIN;
    this.maxScroll = Math.max(0, contentHeight - height);

    this.tweens.add({
      targets: text,
      alpha: 1,
      duration: 3000,
    });

    this.tweens.add({
      targets: prompt,
      alpha: 1,
      duration: 1000,
      delay: 4000,
    });

    // Scroll support
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _objs: unknown[], _dx: number, deltaY: number) => {
      this.scroll(deltaY > 0 ? 30 : -30);
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.touchStartY = pointer.y;
      this.isTouchScrolling = false;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      const delta = this.touchStartY - pointer.y;
      if (Math.abs(delta) > 8) {
        this.isTouchScrolling = true;
        this.scroll(delta);
        this.touchStartY = pointer.y;
      }
    });

    this.time.delayedCall(4000, () => {
      this.input.keyboard!.on('keydown', () => {
        this.scene.start('TitleScene');
      });
      this.input.on('pointerup', () => {
        if (!this.isTouchScrolling) {
          this.scene.start('TitleScene');
        }
        this.isTouchScrolling = false;
      });
    });
  }

  private scroll(delta: number): void {
    this.scrollY = Math.max(0, Math.min(this.maxScroll, this.scrollY + delta));
    this.container.y = -this.scrollY;
  }
}
