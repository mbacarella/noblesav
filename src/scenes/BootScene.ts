import Phaser from 'phaser';

// Plausible state to simulate having played through prior chapters.
// Each entry lists stats and flags a player would likely have at that point.
const CHAPTER_DEBUG_STATE: Record<string, { stats: Record<string, number>; flags: string[] }> = {
  prologue: {
    stats: {},
    flags: [],
  },
  chapter1: {
    stats: { health: 70, hunger: 65, warmth: 65, morale: 50, standing: 45 },
    flags: ['survived_infancy', 'longhouse_child'],
  },
  chapter2: {
    stats: { health: 55, hunger: 50, warmth: 50, morale: 40, standing: 40 },
    flags: [
      'survived_infancy', 'longhouse_child', 'prologue_complete',
      'knows_hemlock', 'witnessed_infection_death', 'survived_raid',
      'aunt_murdered', 'knows_powerlessness', 'chapter1_complete',
    ],
  },
  chapter3: {
    stats: { health: 45, hunger: 45, warmth: 45, morale: 35, standing: 45 },
    flags: [
      'survived_infancy', 'longhouse_child', 'prologue_complete',
      'knows_hemlock', 'witnessed_infection_death', 'survived_raid',
      'aunt_murdered', 'knows_powerlessness', 'chapter1_complete',
      'rite_complete', 'first_kill', 'married', 'wife_pregnant',
      'raided_flint_people', 'survived_bad_prophecy', 'chapter2_complete',
    ],
  },
  chapter4: {
    stats: { health: 35, hunger: 40, warmth: 40, morale: 30, standing: 50, children: 2 },
    flags: [
      'survived_infancy', 'longhouse_child', 'prologue_complete',
      'knows_hemlock', 'witnessed_infection_death', 'survived_raid',
      'aunt_murdered', 'knows_powerlessness', 'chapter1_complete',
      'rite_complete', 'first_kill', 'married', 'wife_pregnant',
      'raided_flint_people', 'survived_bad_prophecy', 'chapter2_complete',
      'has_child', 'lost_child', 'chapter3_complete',
    ],
  },
};

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 15, 320, 30);

    const loadingText = this.add.text(width / 2, height / 2 - 40, 'Loading...', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#cccccc',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xcccccc, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 10, 300 * value, 20);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Load narrative YAML files as text
    this.load.text('prologue', 'narrative/prologue.yaml');
    this.load.text('chapter1', 'narrative/chapter1.yaml');
    this.load.text('chapter2', 'narrative/chapter2.yaml');
    this.load.text('chapter3', 'narrative/chapter3.yaml');
    this.load.text('chapter4', 'narrative/chapter4.yaml');
    this.load.text('sickness', 'narrative/events/sickness.yaml');
  }

  create(): void {
    const params = new URLSearchParams(window.location.search);
    const chapter = params.get('chapter');

    if (chapter && CHAPTER_DEBUG_STATE[chapter]) {
      const state = CHAPTER_DEBUG_STATE[chapter];
      console.log(`[DEBUG] Skipping to ${chapter} with simulated state`);
      this.scene.start('DialogueScene', {
        event: chapter,
        debugStats: state.stats,
        debugFlags: state.flags,
      });
    } else {
      this.scene.start('TitleScene');
    }
  }
}
