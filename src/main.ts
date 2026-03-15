import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { DialogueScene } from './scenes/DialogueScene';
import { StatusScene } from './scenes/StatusScene';
import { WorldScene } from './scenes/WorldScene';
import { DeathScene } from './scenes/DeathScene';
import { ExileScene } from './scenes/ExileScene';
import { AfflictionScene } from './scenes/AfflictionScene';
import { StageScene } from './scenes/StageScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 512,
  height: 384,
  parent: document.body,
  backgroundColor: '#000000',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, DeathScene, ExileScene, AfflictionScene, DialogueScene, StageScene, StatusScene, WorldScene],
};

new Phaser.Game(config);
