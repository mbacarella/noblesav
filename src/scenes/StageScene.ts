import Phaser from 'phaser';
import { SceneCharacter, CharacterMove } from '../data/types';

const STAGE_HEIGHT = 140;
const STAGE_WIDTH = 512;

const SPRITE_W = 16;
const SPRITE_H = 24;

// Procedural background palettes: [sky/top color, ground/bottom color, accent color]
const BG_PALETTES: Record<string, { top: number; bottom: number; accent: number }> = {
  longhouse: { top: 0x3a2a1a, bottom: 0x2a1a0a, accent: 0x5a3a1a },
  forest:    { top: 0x1a3a1a, bottom: 0x0a2a0a, accent: 0x2a5a2a },
  river:     { top: 0x4a7090, bottom: 0x1a4a5a, accent: 0x3a90c0 },
  village:   { top: 0x6a5a3a, bottom: 0x3a2a1a, accent: 0x8a7a5a },
  field:     { top: 0x5a8a3a, bottom: 0x3a6a2a, accent: 0x8aaa4a },
  night:     { top: 0x0a0a1a, bottom: 0x050510, accent: 0x1a1a3a },
};

// Sprite color palette by key
const SPRITE_COLORS: Record<string, number> = {
  mother:      0xc08060,
  grandmother: 0x908070,
  elder:       0x908070,
  player:      0xa07050,
  child:       0xb08060,
  warrior:     0x806040,
  aunt:        0xb07050,
  default:     0x906040,
};

export class StageScene extends Phaser.Scene {
  private characters: Map<string, Phaser.GameObjects.Container> = new Map();
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private currentBg?: string;

  constructor() {
    super({ key: 'StageScene' });
  }

  create(data?: { scene?: string; characters?: SceneCharacter[] }): void {
    this.cameras.main.setViewport(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    this.bgGraphics = this.add.graphics();
    this.characters.clear();
    this.currentBg = undefined;

    // Listen for events from DialogueScene
    const dialogue = this.scene.get('DialogueScene');
    dialogue.events.on('stageUpdate', this.handleStageUpdate, this);
    dialogue.events.on('stageMove', this.handleStageMove, this);
    dialogue.events.on('stageClear', this.handleStageClear, this);

    // Apply initial data passed via launch()
    if (data && (data.scene || data.characters)) {
      this.handleStageUpdate(data);
    }
  }

  private drawBackground(key: string): void {
    if (this.currentBg === key) return;
    this.currentBg = key;

    const palette = BG_PALETTES[key] ?? BG_PALETTES.forest;
    this.bgGraphics.clear();

    // Sky gradient (top half) — draw horizontal bands
    const midY = STAGE_HEIGHT * 0.6;
    const topR = (palette.top >> 16) & 0xff;
    const topG = (palette.top >> 8) & 0xff;
    const topB = palette.top & 0xff;
    const botR = (palette.bottom >> 16) & 0xff;
    const botG = (palette.bottom >> 8) & 0xff;
    const botB = palette.bottom & 0xff;

    const bandH = 4;
    for (let y = 0; y < STAGE_HEIGHT; y += bandH) {
      const t = y / STAGE_HEIGHT;
      const r = Math.round(topR + (botR - topR) * t);
      const g = Math.round(topG + (botG - topG) * t);
      const b = Math.round(topB + (botB - topB) * t);
      this.bgGraphics.fillStyle((r << 16) | (g << 8) | b, 1);
      this.bgGraphics.fillRect(0, y, STAGE_WIDTH, bandH);
    }

    // Ground line
    this.bgGraphics.lineStyle(2, palette.accent, 0.6);
    this.bgGraphics.strokeLineShape(
      new Phaser.Geom.Line(0, midY, STAGE_WIDTH, midY)
    );

    // Scene-specific accents
    if (key === 'longhouse') {
      // Roof triangle
      this.bgGraphics.fillStyle(palette.accent, 0.4);
      this.bgGraphics.fillTriangle(100, midY - 60, 400, midY - 60, 250, midY - 120);
      // Walls
      this.bgGraphics.fillStyle(palette.accent, 0.3);
      this.bgGraphics.fillRect(100, midY - 60, 300, 60);
      // Fire glow
      this.bgGraphics.fillStyle(0xcc6622, 0.15);
      this.bgGraphics.fillCircle(250, midY - 20, 30);
    } else if (key === 'forest') {
      // Simple tree shapes
      for (const tx of [80, 180, 320, 420]) {
        this.bgGraphics.fillStyle(palette.accent, 0.5);
        this.bgGraphics.fillTriangle(tx - 30, midY, tx + 30, midY, tx, midY - 70);
        this.bgGraphics.fillTriangle(tx - 22, midY - 40, tx + 22, midY - 40, tx, midY - 90);
        // Trunk
        this.bgGraphics.fillStyle(0x3a2a1a, 0.5);
        this.bgGraphics.fillRect(tx - 4, midY, 8, 20);
      }
    } else if (key === 'river') {
      // Wavy water lines
      this.bgGraphics.lineStyle(2, palette.accent, 0.4);
      for (let wy = midY + 10; wy < STAGE_HEIGHT - 20; wy += 15) {
        const points: Phaser.Math.Vector2[] = [];
        for (let wx = 0; wx <= STAGE_WIDTH; wx += 20) {
          points.push(new Phaser.Math.Vector2(wx, wy + Math.sin(wx * 0.03) * 5));
        }
        this.bgGraphics.strokePoints(points, false);
      }
      // Bank
      this.bgGraphics.fillStyle(0x4a3a2a, 0.4);
      this.bgGraphics.fillRect(0, midY - 5, STAGE_WIDTH, 10);
    } else if (key === 'village') {
      // Small hut shapes
      for (const hx of [120, 280, 400]) {
        this.bgGraphics.fillStyle(palette.accent, 0.35);
        this.bgGraphics.fillRect(hx - 20, midY - 30, 40, 30);
        this.bgGraphics.fillTriangle(hx - 25, midY - 30, hx + 25, midY - 30, hx, midY - 55);
      }
    } else if (key === 'field') {
      // Rows of crops
      this.bgGraphics.lineStyle(1, palette.accent, 0.3);
      for (let fy = midY + 10; fy < STAGE_HEIGHT - 10; fy += 12) {
        this.bgGraphics.strokeLineShape(
          new Phaser.Geom.Line(40, fy, STAGE_WIDTH - 40, fy)
        );
      }
    } else if (key === 'night') {
      // Stars
      for (let i = 0; i < 30; i++) {
        const sx = Phaser.Math.Between(10, STAGE_WIDTH - 10);
        const sy = Phaser.Math.Between(5, midY - 10);
        this.bgGraphics.fillStyle(0xffffff, Math.random() * 0.5 + 0.2);
        this.bgGraphics.fillRect(sx, sy, 1, 1);
      }
    }
  }

  private createCharacterSprite(char: SceneCharacter): Phaser.GameObjects.Container {
    const color = SPRITE_COLORS[char.sprite] ?? SPRITE_COLORS.default;
    const container = this.add.container(char.x, char.y);

    // Head
    const head = this.add.graphics();
    head.fillStyle(color, 1);
    head.fillCircle(0, -SPRITE_H + 6, 5);
    container.add(head);

    // Body
    const body = this.add.graphics();
    body.fillStyle(color, 0.85);
    body.fillRect(-4, -SPRITE_H + 12, 8, 10);
    container.add(body);

    // Legs
    const legs = this.add.graphics();
    legs.fillStyle(color, 0.7);
    legs.fillRect(-4, -SPRITE_H + 22, 3, 6);
    legs.fillRect(1, -SPRITE_H + 22, 3, 6);
    container.add(legs);

    // Flip for facing
    if (char.facing === 'left') {
      container.setScale(-1, 1);
    }

    return container;
  }

  private handleStageUpdate(data: { scene?: string; characters?: SceneCharacter[]; hide_characters?: string[] }): void {
    if (data.scene) {
      this.drawBackground(data.scene);
    }

    if (data.hide_characters) {
      for (const id of data.hide_characters) {
        const existing = this.characters.get(id);
        if (existing) {
          existing.destroy();
          this.characters.delete(id);
        }
      }
    }

    if (data.characters) {
      // Replace all characters
      for (const [, container] of this.characters) {
        container.destroy();
      }
      this.characters.clear();

      for (const char of data.characters) {
        const sprite = this.createCharacterSprite(char);
        this.characters.set(char.id, sprite);
      }
    }
  }

  private handleStageMove(data: { moves: CharacterMove[]; callback: () => void }): void {
    const { moves, callback } = data;
    if (moves.length === 0) {
      callback();
      return;
    }

    let completed = 0;
    const total = moves.length;

    for (const move of moves) {
      const container = this.characters.get(move.id);
      if (!container) {
        completed++;
        if (completed >= total) callback();
        continue;
      }

      // Update facing
      if (move.facing) {
        container.setScale(move.facing === 'left' ? -1 : 1, 1);
      } else {
        // Auto-face based on direction
        if (move.to_x < container.x) {
          container.setScale(-1, 1);
        } else if (move.to_x > container.x) {
          container.setScale(1, 1);
        }
      }

      const speed = move.speed ?? 60;
      const dist = Phaser.Math.Distance.Between(container.x, container.y, move.to_x, move.to_y);
      const duration = (dist / speed) * 1000;

      this.tweens.add({
        targets: container,
        x: move.to_x,
        y: move.to_y,
        duration,
        ease: 'Linear',
        onComplete: () => {
          completed++;
          if (completed >= total) callback();
        },
      });
    }
  }

  private handleStageClear(): void {
    for (const [, container] of this.characters) {
      container.destroy();
    }
    this.characters.clear();
    this.bgGraphics.clear();
    this.currentBg = undefined;
  }
}
