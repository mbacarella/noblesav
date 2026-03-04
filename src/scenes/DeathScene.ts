import Phaser from 'phaser';

const DEATHS = [
  "You are stillborn. The umbilical cord was wrapped around your neck. Your mother will grieve, but not for long — she has three living children who need her. Your body is buried without a name.",
  "You survive birth but die within hours. Your lungs never fully open. You gasp, and then you stop. Your mother holds you until your grandmother takes you away.",
  "You live for eleven days. A fever takes you on a cold night. You are too small to fight it. Your father carves no marker. There is nothing to carve it on.",
  "You are born healthy, but your mother dies from the birth. Without her milk, you weaken over two weeks. A wet nurse tries, but her own child needs the milk more. You fade quietly.",
  "You make it to four months. Dysentery. There is no clean water, no medicine, no rehydration. You die over the course of three terrible days. Your older sister, who is six, does not understand where you went.",
  "You choke on your first solid food at seven months. No one knows what to do. It takes less than four minutes.",
  "You are born in late autumn. The winter is the worst in memory. The longhouse cannot stay warm enough. You develop pneumonia at two months. The rattling in your tiny chest stops on the coldest night of the year.",
  "You live to fourteen months — long enough to take your first steps, long enough for your mother to believe you might make it. Then a cut on your foot from a sharp stone. Infection. No antibiotics exist anywhere on earth. It takes a week.",
  "You are one of twins. Neither of you survives the first winter. There is not enough milk for two.",
  "You are born during a raid. The stress causes your mother to hemorrhage. The medicine man cannot stop the bleeding. She dies. You survive three days without milk before following her.",
  "You live to age three. You are bright, curious, already speaking in full sentences. You eat berries from a bush near the river. They are not the right berries. There is no poison control. There is no stomach pump. Your mother watches and can do nothing.",
  "You drown in a shallow creek at age two. You wandered twenty feet from your mother while she was grinding corn. It took less than a minute. The water was six inches deep.",
];

export class DeathScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DeathScene' });
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.cameras.main.setBackgroundColor('#000000');

    const death = DEATHS[Math.floor(Math.random() * DEATHS.length)];

    const text = this.add.text(width / 2, height / 2 - 30, death, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#888888',
      wordWrap: { width: width - 80 },
      lineSpacing: 6,
      align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    // Fade in slowly
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

    // After delay, allow restart
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
