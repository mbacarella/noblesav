import Phaser from 'phaser';
import yaml from 'js-yaml';
import { NarrativeEvent, NarrativeNode, NarrativeChoice, SceneCharacter, CharacterMove } from '../data/types';
import { NarrativeEngine } from '../systems/NarrativeEngine';
import { SurvivalSystem } from '../systems/SurvivalSystem';
import { ChoiceManager } from '../systems/ChoiceManager';

const BOX_MARGIN = 16;
const BOX_PADDING = 20;
const HUD_HEIGHT = 10;
const TITLE_HEIGHT = 20;

const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '15px',
  color: '#e0dcc8',
  wordWrap: { width: 0 }, // set dynamically
  lineSpacing: 6,
};

const CHOICE_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'monospace',
  fontSize: '14px',
  color: '#c8b080',
  lineSpacing: 4,
};

const CHOICE_HOVER_STYLE = { color: '#ffffff' };
const CHOICE_NORMAL_STYLE = { color: '#c8b080' };

const CHAPTER_NAMES: Record<string, string> = {
  prologue: 'Prologue: Birth',
  chapter1: 'Chapter 1: Childhood',
  chapter2: 'Chapter 2: Adolescence',
  chapter3: 'Chapter 3: Adulthood',
  chapter4: 'Chapter 4: Elder Years',
};

// Default colors
const DEFAULT_BG_COLOR = 0x111111;
const DEFAULT_TEXT_COLOR = '#e0dcc8';
const DEFAULT_BORDER_COLOR = 0x445566;

// Mood palettes
const MOOD_COLORS = {
  beauty: { bg: 0x0a1a0a, text: '#ffffff', border: 0x4a6a2a },
  spirit: { bg: 0x150a1a, text: '#d8c8e8', border: 0x6a4a8a },
};

// Beauty gradient: green top → blue bottom, with two phases to cycle between
const BEAUTY_TINT_A = { tl: 0xb0e8a0, tr: 0xa0e0b0, bl: 0x90c0e0, br: 0xa0b8e8 };
const BEAUTY_TINT_B = { tl: 0xa0e0c0, tr: 0xb0e8b0, bl: 0x80b0f0, br: 0x90c8e0 };

export class DialogueScene extends Phaser.Scene {
  private engine!: NarrativeEngine;
  private survival!: SurvivalSystem;
  private choiceManager!: ChoiceManager;
  private dialogueBox!: Phaser.GameObjects.Graphics;
  private contentContainer!: Phaser.GameObjects.Container;
  private textObject!: Phaser.GameObjects.Text;
  private choiceObjects: Phaser.GameObjects.Text[] = [];
  private cursorObject!: Phaser.GameObjects.Text;
  private selectedIndex: number = 0;
  private currentChoices: NarrativeChoice[] = [];
  private isTypewriting: boolean = false;
  private fullText: string = '';
  private typewriteTimer?: Phaser.Time.TimerEvent;
  private continuePrompt!: Phaser.GameObjects.Text;
  private scrollY: number = 0;
  private maxScroll: number = 0;
  private visibleHeight: number = 0;
  private scrollIndicator!: Phaser.GameObjects.Text;
  private chapterLabel!: Phaser.GameObjects.Text;
  private touchStartY: number = 0;
  private isTouchScrolling: boolean = false;
  private currentMood?: 'beauty' | 'spirit';
  private currentBorderColor: number = DEFAULT_BORDER_COLOR;
  private borderShimmerTween?: Phaser.Tweens.Tween;
  private textWaveTween?: Phaser.Tweens.Tween;
  private beautyTintTween?: Phaser.Tweens.Tween;
  private stageMode: boolean = false;
  private pages: string[] = [];
  private currentPage: number = 0;
  private isPaginating: boolean = false;
  private paginationCallback?: () => void;
  private maskShape!: Phaser.GameObjects.Graphics;
  private boxTop!: number;
  private boxHeight!: number;

  constructor() {
    super({ key: 'DialogueScene' });
  }

  init(): void {
    this.survival = new SurvivalSystem();
    this.choiceManager = new ChoiceManager();
    this.engine = new NarrativeEngine(this.survival, this.choiceManager);
    this.stageMode = false;
    this.isPaginating = false;
    this.pages = [];
    this.currentPage = 0;
  }

  create(data: {
    event: string;
    affliction?: { effects: Record<string, number>; flags: string[] };
    debugStats?: Record<string, number>;
    debugFlags?: string[];
  }): void {
    // Apply birth affliction penalties
    if (data.affliction) {
      for (const [stat, delta] of Object.entries(data.affliction.effects)) {
        this.survival.applyStat(stat, delta);
      }
      for (const flag of data.affliction.flags) {
        this.choiceManager.setFlag(flag);
      }
    }

    // Apply debug state for chapter skipping
    if (data.debugStats) {
      for (const [stat, value] of Object.entries(data.debugStats)) {
        const current = this.survival.getStat(stat);
        this.survival.applyStat(stat, value - current);
      }
    }
    if (data.debugFlags) {
      for (const flag of data.debugFlags) {
        this.choiceManager.setFlag(flag);
      }
    }

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.cameras.main.setBackgroundColor('#111111');

    // Title bar — clickable restart with confirmation
    const titleText = this.add.text(BOX_MARGIN + 6, 4, 'NOBLE SAVAGE', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#776655',
    }).setDepth(50).setInteractive({ useHandCursor: true })
      .on('pointerover', () => titleText.setColor('#aa9988'))
      .on('pointerout', () => titleText.setColor('#776655'))
      .on('pointerdown', () => this.showConfirmRestart());

    // Chapter label
    this.chapterLabel = this.add.text(BOX_MARGIN + 6, 16, CHAPTER_NAMES[data.event] ?? '', {
      fontFamily: 'monospace',
      fontSize: '8px',
      color: '#666655',
    }).setDepth(50);

    // Compute visible area
    this.boxTop = BOX_MARGIN + TITLE_HEIGHT;
    const boxBottom = height - BOX_MARGIN - HUD_HEIGHT;
    this.boxHeight = boxBottom - this.boxTop;
    this.visibleHeight = this.boxHeight - BOX_PADDING * 2;

    // Draw dialogue box background
    this.dialogueBox = this.add.graphics();
    this.drawDialogueBox();

    // Content container — holds text + choices, gets scrolled
    this.contentContainer = this.add.container(
      BOX_MARGIN + BOX_PADDING,
      this.boxTop + BOX_PADDING
    );

    // Mask to clip content to the dialogue box
    this.maskShape = this.make.graphics({ x: 0, y: 0 });
    this.maskShape.fillStyle(0xffffff);
    this.maskShape.fillRect(
      BOX_MARGIN, this.boxTop,
      width - BOX_MARGIN * 2, this.boxHeight
    );
    const mask = this.maskShape.createGeometryMask();
    this.contentContainer.setMask(mask);

    // Main text (positioned within container at 0,0)
    const textWidth = width - BOX_MARGIN * 2 - BOX_PADDING * 2;
    TEXT_STYLE.wordWrap = { width: textWidth };
    this.textObject = this.scene.scene.add.text(0, 0, '', TEXT_STYLE);
    this.contentContainer.add(this.textObject);

    // Choice cursor (in container)
    this.cursorObject = this.scene.scene.add.text(0, 0, '\u25b6', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffffff',
    }).setVisible(false);
    this.contentContainer.add(this.cursorObject);

    // Continue prompt (fixed position, outside container)
    this.continuePrompt = this.add.text(
      width - BOX_MARGIN - BOX_PADDING - 10,
      this.boxTop + this.boxHeight - 5,
      '\u25bc',
      { fontFamily: 'monospace', fontSize: '14px', color: '#666666' }
    ).setOrigin(1, 1).setVisible(false);

    this.tweens.add({
      targets: this.continuePrompt,
      alpha: 0.2,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Scroll indicator (fixed, top-right of box)
    this.scrollIndicator = this.add.text(
      width - BOX_MARGIN - BOX_PADDING - 10,
      this.boxTop + 8,
      '\u25b2',
      { fontFamily: 'monospace', fontSize: '12px', color: '#444444' }
    ).setOrigin(1, 0).setVisible(false);

    // Input
    this.input.keyboard!.on('keydown', this.handleInput, this);

    // Mouse wheel scrolling
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: unknown[], _deltaX: number, deltaY: number) => {
      this.scroll(deltaY > 0 ? 30 : -30);
    });

    // Touch / click: track drag for scrolling, tap for advance
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

    this.input.on('pointerup', () => {
      if (!this.isTouchScrolling) {
        // It was a tap, not a drag — advance text
        this.handleInput({ keyCode: 32 } as KeyboardEvent);
      }
      this.isTouchScrolling = false;
    });

    // Launch status HUD
    this.scene.launch('StatusScene', { survival: this.survival });

    // Load and start the event
    this.loadAndStart(data.event);
  }

  private drawDialogueBox(): void {
    const width = this.cameras.main.width;
    this.dialogueBox.clear();

    const alpha = this.stageMode ? 0.82 : 0.92;
    this.dialogueBox.fillStyle(0x111122, alpha);
    this.dialogueBox.fillRoundedRect(
      BOX_MARGIN, this.boxTop,
      width - BOX_MARGIN * 2, this.boxHeight,
      6
    );

    this.dialogueBox.lineStyle(1, this.currentBorderColor, 0.8);
    this.dialogueBox.strokeRoundedRect(
      BOX_MARGIN, this.boxTop,
      width - BOX_MARGIN * 2, this.boxHeight,
      6
    );
  }

  private applyMood(mood: 'beauty' | 'spirit'): void {
    if (this.currentMood === mood) return;
    this.currentMood = mood;
    const colors = MOOD_COLORS[mood];

    // Background color tween — skip in stage mode to keep transparency
    if (!this.stageMode) {
      const cam = this.cameras.main;
      const startR = (DEFAULT_BG_COLOR >> 16) & 0xff;
      const startG = (DEFAULT_BG_COLOR >> 8) & 0xff;
      const startB = DEFAULT_BG_COLOR & 0xff;
      const endR = (colors.bg >> 16) & 0xff;
      const endG = (colors.bg >> 8) & 0xff;
      const endB = colors.bg & 0xff;

      this.tweens.addCounter({
        from: 0, to: 100, duration: 1500, ease: 'Sine.easeInOut',
        onUpdate: (tween) => {
          const t = tween.getValue()! / 100;
          const r = Math.round(startR + (endR - startR) * t);
          const g = Math.round(startG + (endG - startG) * t);
          const b = Math.round(startB + (endB - startB) * t);
          cam.setBackgroundColor((r << 16) | (g << 8) | b);
        },
      });
    }

    // Text color + gradient tint for beauty
    this.textObject.setColor(colors.text);
    if (this.beautyTintTween) { this.beautyTintTween.destroy(); this.beautyTintTween = undefined; }
    if (mood === 'beauty') {
      this.textObject.setTint(BEAUTY_TINT_A.tl, BEAUTY_TINT_A.tr, BEAUTY_TINT_B.bl, BEAUTY_TINT_B.br);
      this.beautyTintTween = this.tweens.addCounter({
        from: 0, to: 100, duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        onUpdate: (tween) => {
          const t = tween.getValue()! / 100;
          const lerp = (a: number, b: number) => {
            const rA = (a >> 16) & 0xff, gA = (a >> 8) & 0xff, bA = a & 0xff;
            const rB = (b >> 16) & 0xff, gB = (b >> 8) & 0xff, bB = b & 0xff;
            const r = Math.round(rA + (rB - rA) * t);
            const g = Math.round(gA + (gB - gA) * t);
            const bl = Math.round(bA + (bB - bA) * t);
            return (r << 16) | (g << 8) | bl;
          };
          this.textObject.setTint(
            lerp(BEAUTY_TINT_A.tl, BEAUTY_TINT_B.tl),
            lerp(BEAUTY_TINT_A.tr, BEAUTY_TINT_B.tr),
            lerp(BEAUTY_TINT_A.bl, BEAUTY_TINT_B.bl),
            lerp(BEAUTY_TINT_A.br, BEAUTY_TINT_B.br),
          );
        },
      });
    } else {
      this.textObject.clearTint();
    }

    // Border shimmer
    this.currentBorderColor = colors.border;
    this.drawDialogueBox();
    if (this.borderShimmerTween) this.borderShimmerTween.destroy();
    this.borderShimmerTween = this.tweens.addCounter({
      from: 0, to: 100, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const t = tween.getValue()! / 100;
        const alpha = 0.5 + 0.5 * t;
        this.dialogueBox.clear();
        const width = this.cameras.main.width;
        const fillAlpha = this.stageMode ? 0.82 : 0.92;
        this.dialogueBox.fillStyle(0x111122, fillAlpha);
        this.dialogueBox.fillRoundedRect(BOX_MARGIN, this.boxTop, width - BOX_MARGIN * 2, this.boxHeight, 6);
        this.dialogueBox.lineStyle(1, colors.border, alpha);
        this.dialogueBox.strokeRoundedRect(BOX_MARGIN, this.boxTop, width - BOX_MARGIN * 2, this.boxHeight, 6);
      },
    });

    // Spirit: wavy text
    if (this.textWaveTween) { this.textWaveTween.destroy(); this.textWaveTween = undefined; }
    if (mood === 'spirit') {
      const baseY = this.textObject.y;
      this.textWaveTween = this.tweens.add({
        targets: this.textObject,
        y: baseY - 2,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private clearMood(): void {
    if (!this.currentMood) return;
    this.currentMood = undefined;

    // Tween background back — skip in stage mode to keep transparency
    if (!this.stageMode) {
      const cam = this.cameras.main;
      const currentBg = cam.backgroundColor;
      const startR = currentBg.red, startG = currentBg.green, startB = currentBg.blue;
      const endR = (DEFAULT_BG_COLOR >> 16) & 0xff;
      const endG = (DEFAULT_BG_COLOR >> 8) & 0xff;
      const endB = DEFAULT_BG_COLOR & 0xff;

      this.tweens.addCounter({
        from: 0, to: 100, duration: 1000, ease: 'Sine.easeInOut',
        onUpdate: (tween) => {
          const t = tween.getValue()! / 100;
          const r = Math.round(startR + (endR - startR) * t);
          const g = Math.round(startG + (endG - startG) * t);
          const b = Math.round(startB + (endB - startB) * t);
          cam.setBackgroundColor((r << 16) | (g << 8) | b);
        },
      });
    }

    // Reset text color and tint
    this.textObject.setColor(DEFAULT_TEXT_COLOR);
    this.textObject.clearTint();
    if (this.beautyTintTween) { this.beautyTintTween.destroy(); this.beautyTintTween = undefined; }

    // Stop border shimmer
    if (this.borderShimmerTween) { this.borderShimmerTween.destroy(); this.borderShimmerTween = undefined; }
    this.currentBorderColor = DEFAULT_BORDER_COLOR;
    this.drawDialogueBox();

    // Stop wavy text
    if (this.textWaveTween) {
      this.textWaveTween.destroy();
      this.textWaveTween = undefined;
      this.textObject.y = 0;
    }
  }

  private launchStage(initialData?: { scene?: string; characters?: SceneCharacter[] }): void {
    if (this.stageMode) return;
    this.stageMode = true;

    // Make DialogueScene camera transparent so StageScene shows through
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');

    // Reposition dialogue box below stage area
    const STAGE_BOTTOM = 140;
    const STAGE_BOX_HEIGHT = 230;
    this.boxTop = STAGE_BOTTOM;
    this.boxHeight = STAGE_BOX_HEIGHT;
    this.visibleHeight = this.boxHeight - BOX_PADDING * 2;

    // Rebuild content container position
    this.contentContainer.y = this.boxTop + BOX_PADDING;

    // Rebuild mask
    const width = this.cameras.main.width;
    this.maskShape.clear();
    this.maskShape.fillStyle(0xffffff);
    this.maskShape.fillRect(BOX_MARGIN, this.boxTop, width - BOX_MARGIN * 2, this.boxHeight);

    // Update continue prompt position
    this.continuePrompt.setPosition(
      width - BOX_MARGIN - BOX_PADDING - 10,
      this.boxTop + this.boxHeight - 5
    );

    // Update scroll indicator position
    this.scrollIndicator.setPosition(
      width - BOX_MARGIN - BOX_PADDING - 10,
      this.boxTop + 8
    );

    this.drawDialogueBox();

    // Launch StageScene behind this scene, passing initial data
    this.scene.launch('StageScene', initialData);
    this.scene.bringToTop('DialogueScene');
    this.scene.bringToTop('StatusScene');
  }

  private paginateText(text: string): string[] {
    // Measure how many lines fit in the visible area
    const lineHeight = 15 + 6; // fontSize + lineSpacing
    const linesPerPage = Math.floor(this.visibleHeight / lineHeight);
    if (linesPerPage <= 0) return [text];

    // Use a temporary text to get wrapped lines
    const textWidth = this.cameras.main.width - BOX_MARGIN * 2 - BOX_PADDING * 2;
    const tempText = this.add.text(0, 0, text, {
      ...TEXT_STYLE,
      wordWrap: { width: textWidth },
    }).setVisible(false);

    const wrappedLines = tempText.getWrappedText(text);
    tempText.destroy();

    if (wrappedLines.length <= linesPerPage) return [text];

    const pages: string[] = [];
    for (let i = 0; i < wrappedLines.length; i += linesPerPage) {
      pages.push(wrappedLines.slice(i, i + linesPerPage).join('\n'));
    }
    return pages;
  }

  private showPage(pageIndex: number): void {
    this.textObject.setText(this.pages[pageIndex]);
    this.resetScroll();
  }

  private advancePage(): boolean {
    if (this.currentPage < this.pages.length - 1) {
      this.currentPage++;
      this.showPage(this.currentPage);
      // Show continue prompt if more pages remain
      this.continuePrompt.setVisible(this.currentPage < this.pages.length - 1);
      if (this.currentPage >= this.pages.length - 1 && this.paginationCallback) {
        this.paginationCallback();
        this.paginationCallback = undefined;
        this.isPaginating = false;
      }
      return true;
    }
    return false;
  }

  private updateScroll(): void {
    const contentHeight = this.getContentHeight();
    this.maxScroll = Math.max(0, contentHeight - this.visibleHeight);
    this.scrollY = Math.min(this.scrollY, this.maxScroll);
    this.scrollY = Math.max(0, this.scrollY);
    this.contentContainer.y = (this.boxTop + BOX_PADDING) - this.scrollY;
    this.scrollIndicator.setVisible(this.scrollY > 0);
  }

  private scroll(delta: number): void {
    this.scrollY += delta;
    this.updateScroll();
  }

  private scrollToBottom(): void {
    this.scrollY = this.maxScroll;
    this.updateScroll();
  }

  private resetScroll(): void {
    this.scrollY = 0;
    this.updateScroll();
  }

  private getContentHeight(): number {
    let bottom = this.textObject.height;
    for (const choice of this.choiceObjects) {
      const choiceBottom = choice.y + choice.height;
      if (choiceBottom > bottom) bottom = choiceBottom;
    }
    return bottom;
  }

  private autoScrollDuringTypewrite(): void {
    const contentHeight = this.textObject.height;
    if (contentHeight > this.visibleHeight) {
      this.scrollY = contentHeight - this.visibleHeight;
      this.updateScroll();
    }
  }

  private async loadAndStart(eventName: string): Promise<void> {
    const yamlText = this.cache.text.get(eventName);
    if (!yamlText) {
      this.showText('Error: Could not load narrative data for "' + eventName + '".');
      return;
    }

    const event = yaml.load(yamlText) as NarrativeEvent;
    this.engine.registerEvent(event);
    this.chapterLabel.setText(CHAPTER_NAMES[eventName] ?? eventName);
    const node = this.engine.startEvent(event.event);
    if (node) {
      this.presentNode(node);
    }
  }

  private presentNode(node: NarrativeNode): void {
    this.clearChoices();
    this.continuePrompt.setVisible(false);
    this.resetScroll();
    this.isPaginating = false;
    this.paginationCallback = undefined;
    this.pages = [];
    this.currentPage = 0;

    // Apply or clear mood
    if (node.mood) {
      this.applyMood(node.mood);
    } else {
      this.clearMood();
    }

    // Exile: if standing has hit 0, the village casts you out
    if (this.survival.getStat('standing') <= 0) {
      this.scene.stop('StatusScene');
      this.scene.stop('StageScene');
      this.scene.start('ExileScene');
      return;
    }

    // Stage events
    if (node.clear_stage) {
      this.events.emit('stageClear');
    }

    const hasVisualData = !!(node.scene || node.characters);
    if (hasVisualData) {
      const stageData = {
        scene: node.scene,
        characters: node.characters,
        hide_characters: node.hide_characters,
      };
      const wasAlreadyStaged = this.stageMode;
      this.launchStage(stageData);
      // Emit only if stage was already running (first launch gets data via param)
      if (wasAlreadyStaged) {
        this.events.emit('stageUpdate', stageData);
      }
    } else if (node.hide_characters) {
      this.events.emit('stageUpdate', { hide_characters: node.hide_characters });
    }

    // Handle movement tweens before text
    const startText = () => {
      const onTextComplete = () => {
        if (node.roll) {
          const result = this.engine.resolveRoll(node.roll);
          if (result) {
            this.time.delayedCall(800, () => this.presentNode(result));
          }
        } else if (node.random && node.random.length > 0) {
          const result = this.engine.resolveRandom();
          if (result) {
            this.time.delayedCall(800, () => this.presentNode(result));
          }
        } else if (node.choices && node.choices.length > 0) {
          this.showChoices(this.engine.getAvailableChoices());
        } else if (node.next_event) {
          this.continuePrompt.setVisible(true);
        } else if (node.next) {
          this.continuePrompt.setVisible(true);
        } else if (node.end) {
          this.showContinueToTitle();
        }
      };

      // In stage mode, paginate long text
      if (this.stageMode) {
        this.pages = this.paginateText(node.text);
        if (this.pages.length > 1) {
          this.currentPage = 0;
          this.isPaginating = true;
          this.paginationCallback = onTextComplete;
          this.typewriteText(this.pages[0], () => {
            this.continuePrompt.setVisible(true);
          });
        } else {
          this.typewriteText(node.text, onTextComplete);
        }
      } else {
        this.typewriteText(node.text, onTextComplete);
      }
    };

    if (node.move && node.move.length > 0 && this.stageMode) {
      this.events.emit('stageMove', {
        moves: node.move,
        callback: startText,
      });
    } else {
      startText();
    }

    this.scene.get('StatusScene').events.emit('updateStats');
  }

  private typewriteText(text: string, onComplete: () => void): void {
    this.isTypewriting = true;
    this.fullText = text;
    this.textObject.setText('');

    let charIndex = 0;
    this.typewriteTimer = this.time.addEvent({
      delay: 12,
      repeat: text.length - 1,
      callback: () => {
        charIndex++;
        this.textObject.setText(text.substring(0, charIndex));
        this.autoScrollDuringTypewrite();
        if (charIndex >= text.length) {
          this.isTypewriting = false;
          onComplete();
        }
      },
    });
  }

  private skipTypewrite(): void {
    if (this.typewriteTimer) {
      this.typewriteTimer.destroy();
    }
    this.textObject.setText(this.fullText);
    this.isTypewriting = false;
    this.scrollToBottom();
  }

  private showText(text: string): void {
    this.textObject.setText(text);
  }

  private showChoices(choices: NarrativeChoice[]): void {
    this.currentChoices = choices;
    this.selectedIndex = 0;

    const startY = this.textObject.height + 24;
    const startX = 20;

    choices.forEach((choice, i) => {
      const text = this.scene.scene.add.text(startX, startY + i * 28, choice.text, CHOICE_STYLE)
        .setInteractive()
        .on('pointerover', () => {
          this.selectedIndex = i;
          this.updateChoiceHighlight();
        })
        .on('pointerdown', () => {
          this.selectedIndex = i;
          this.confirmChoice();
        });
      this.choiceObjects.push(text);
      this.contentContainer.add(text);
    });

    this.contentContainer.add(this.cursorObject);
    this.cursorObject.setVisible(true);
    this.updateChoiceHighlight();
    this.scrollToBottom();
  }

  private clearChoices(): void {
    this.choiceObjects.forEach(obj => {
      this.contentContainer.remove(obj);
      obj.destroy();
    });
    this.choiceObjects = [];
    this.currentChoices = [];
    this.cursorObject.setVisible(false);
  }

  private updateChoiceHighlight(): void {
    this.choiceObjects.forEach((obj, i) => {
      if (i === this.selectedIndex) {
        obj.setStyle(CHOICE_HOVER_STYLE);
        this.cursorObject.setPosition(obj.x - 18, obj.y);
      } else {
        obj.setStyle(CHOICE_NORMAL_STYLE);
      }
    });
  }

  private confirmChoice(): void {
    if (this.currentChoices.length === 0) return;
    const choice = this.currentChoices[this.selectedIndex];
    const nextNode = this.engine.selectChoice(choice);
    if (nextNode) {
      this.presentNode(nextNode);
    }
  }

  private showConfirmRestart(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);
    overlay.setDepth(100);

    // Modal box
    const modalW = 220;
    const modalH = 80;
    const modalX = (width - modalW) / 2;
    const modalY = (height - modalH) / 2;
    const modal = this.add.graphics().setDepth(101);
    modal.fillStyle(0x111122, 1);
    modal.fillRoundedRect(modalX, modalY, modalW, modalH, 6);
    modal.lineStyle(1, 0x445566, 0.8);
    modal.strokeRoundedRect(modalX, modalY, modalW, modalH, 6);

    const question = this.add.text(width / 2, modalY + 22, 'Start over?', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#c8b080',
    }).setOrigin(0.5).setDepth(102);

    const yesBtn = this.add.text(width / 2 - 40, modalY + 52, 'Yes', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#888888',
    }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true })
      .on('pointerover', () => yesBtn.setColor('#ffffff'))
      .on('pointerout', () => yesBtn.setColor('#888888'))
      .on('pointerdown', () => {
        this.scene.stop('StatusScene');
        this.scene.stop('StageScene');
        this.scene.start('TitleScene');
      });

    const noBtn = this.add.text(width / 2 + 40, modalY + 52, 'No', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#888888',
    }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true })
      .on('pointerover', () => noBtn.setColor('#ffffff'))
      .on('pointerout', () => noBtn.setColor('#888888'))
      .on('pointerdown', () => {
        overlay.destroy();
        modal.destroy();
        question.destroy();
        yesBtn.destroy();
        noBtn.destroy();
      });
  }

  private showContinueToTitle(): void {
    const y = this.textObject.height + 30;
    const endText = this.scene.scene.add.text(
      (this.cameras.main.width - BOX_MARGIN * 2 - BOX_PADDING * 2) / 2,
      y, '[ End ]', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#666666',
      }
    ).setOrigin(0.5).setInteractive().on('pointerdown', () => {
      this.scene.stop('StatusScene');
      this.scene.stop('StageScene');
      this.scene.start('TitleScene');
    });
    this.contentContainer.add(endText);
    this.scrollToBottom();
  }

  private resolveAfterSkip(node: NarrativeNode): void {
    if (node.roll) {
      const result = this.engine.resolveRoll(node.roll);
      if (result) {
        this.time.delayedCall(300, () => this.presentNode(result));
      }
    } else if (node.random && node.random.length > 0) {
      const result = this.engine.resolveRandom();
      if (result) {
        this.time.delayedCall(300, () => this.presentNode(result));
      }
    } else if (node.choices && node.choices.length > 0) {
      this.showChoices(this.engine.getAvailableChoices());
    } else if (node.next_event) {
      this.continuePrompt.setVisible(true);
    } else if (node.next) {
      this.continuePrompt.setVisible(true);
    } else if (node.end) {
      this.showContinueToTitle();
    }
  }

  private handleInput(event: KeyboardEvent): void {
    const key = event.keyCode;

    // If typewriting, skip on any key
    if (this.isTypewriting) {
      this.skipTypewrite();
      const node = this.engine.getCurrentNode();
      if (node) {
        this.resolveAfterSkip(node);
      }
      return;
    }

    // If choices are shown
    if (this.currentChoices.length > 0) {
      if (key === Phaser.Input.Keyboard.KeyCodes.UP || key === Phaser.Input.Keyboard.KeyCodes.W) {
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.updateChoiceHighlight();
      } else if (key === Phaser.Input.Keyboard.KeyCodes.DOWN || key === Phaser.Input.Keyboard.KeyCodes.S) {
        this.selectedIndex = Math.min(this.currentChoices.length - 1, this.selectedIndex + 1);
        this.updateChoiceHighlight();
      } else if (key === Phaser.Input.Keyboard.KeyCodes.ENTER || key === Phaser.Input.Keyboard.KeyCodes.SPACE) {
        this.confirmChoice();
      }
      return;
    }

    // Pagination: advance to next page if paginating
    if (this.isPaginating) {
      if (key === Phaser.Input.Keyboard.KeyCodes.ENTER || key === Phaser.Input.Keyboard.KeyCodes.SPACE) {
        this.advancePage();
      }
      return;
    }

    // Continue prompt (auto-advance, chain event, or just waiting)
    if (key === Phaser.Input.Keyboard.KeyCodes.ENTER || key === Phaser.Input.Keyboard.KeyCodes.SPACE) {
      const node = this.engine.getCurrentNode();
      if (node?.next_event) {
        this.loadAndStart(node.next_event);
      } else if (node?.next) {
        const nextNode = this.engine.advanceToNext();
        if (nextNode) {
          this.presentNode(nextNode);
        }
      }
    }
  }
}
