import Phaser from 'phaser';
import yaml from 'js-yaml';
import { NarrativeEvent, NarrativeNode, NarrativeChoice } from '../data/types';
import { NarrativeEngine } from '../systems/NarrativeEngine';
import { SurvivalSystem } from '../systems/SurvivalSystem';
import { ChoiceManager } from '../systems/ChoiceManager';

const BOX_MARGIN = 16;
const BOX_PADDING = 20;
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

export class DialogueScene extends Phaser.Scene {
  private engine!: NarrativeEngine;
  private survival!: SurvivalSystem;
  private choiceManager!: ChoiceManager;
  private dialogueBox!: Phaser.GameObjects.Graphics;
  private textObject!: Phaser.GameObjects.Text;
  private choiceObjects: Phaser.GameObjects.Text[] = [];
  private cursorObject!: Phaser.GameObjects.Text;
  private selectedIndex: number = 0;
  private currentChoices: NarrativeChoice[] = [];
  private isTypewriting: boolean = false;
  private fullText: string = '';
  private typewriteTimer?: Phaser.Time.TimerEvent;
  private continuePrompt!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'DialogueScene' });
  }

  init(): void {
    this.survival = new SurvivalSystem();
    this.choiceManager = new ChoiceManager();
    this.engine = new NarrativeEngine(this.survival, this.choiceManager);
  }

  create(data: { event: string }): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.cameras.main.setBackgroundColor('#111111');

    // Draw dialogue box background
    this.dialogueBox = this.add.graphics();
    this.drawDialogueBox();

    // Main text
    const textWidth = width - BOX_MARGIN * 2 - BOX_PADDING * 2;
    TEXT_STYLE.wordWrap = { width: textWidth };
    this.textObject = this.add.text(
      BOX_MARGIN + BOX_PADDING,
      BOX_MARGIN + BOX_PADDING,
      '',
      TEXT_STYLE
    );

    // Choice cursor
    this.cursorObject = this.add.text(0, 0, '\u25b6', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffffff',
    }).setVisible(false);

    // Continue prompt
    this.continuePrompt = this.add.text(
      width - BOX_MARGIN - BOX_PADDING - 10,
      height - BOX_MARGIN - BOX_PADDING - 5,
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

    // Input
    this.input.keyboard!.on('keydown', this.handleInput, this);
    this.input.on('pointerdown', () => this.handleInput({ keyCode: 32 } as KeyboardEvent));

    // Launch status HUD
    this.scene.launch('StatusScene', { survival: this.survival });

    // Load and start the event
    this.loadAndStart(data.event);
  }

  private drawDialogueBox(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    this.dialogueBox.clear();

    // Semi-transparent dark box
    this.dialogueBox.fillStyle(0x111122, 0.92);
    this.dialogueBox.fillRoundedRect(
      BOX_MARGIN, BOX_MARGIN,
      width - BOX_MARGIN * 2, height - BOX_MARGIN * 2 - 60,
      6
    );

    // Border
    this.dialogueBox.lineStyle(1, 0x445566, 0.8);
    this.dialogueBox.strokeRoundedRect(
      BOX_MARGIN, BOX_MARGIN,
      width - BOX_MARGIN * 2, height - BOX_MARGIN * 2 - 60,
      6
    );
  }

  private async loadAndStart(eventName: string): Promise<void> {
    const yamlText = this.cache.text.get(eventName);
    if (!yamlText) {
      this.showText('Error: Could not load narrative data for "' + eventName + '".');
      return;
    }

    const event = yaml.load(yamlText) as NarrativeEvent;
    this.engine.registerEvent(event);
    const node = this.engine.startEvent(event.event);
    if (node) {
      this.presentNode(node);
    }
  }

  private presentNode(node: NarrativeNode): void {
    this.clearChoices();
    this.continuePrompt.setVisible(false);
    this.typewriteText(node.text, () => {
      if (node.roll) {
        // Auto-resolve dice roll after text finishes
        const result = this.engine.resolveRoll(node.roll);
        if (result) {
          this.time.delayedCall(800, () => this.presentNode(result));
        }
      } else if (node.choices && node.choices.length > 0) {
        this.showChoices(this.engine.getAvailableChoices());
      } else if (node.next) {
        this.continuePrompt.setVisible(true);
      } else if (node.end) {
        this.showContinueToTitle();
      } else {
        this.continuePrompt.setVisible(true);
      }
    });

    // Update HUD
    this.scene.get('StatusScene').events.emit('updateStats');
  }

  private typewriteText(text: string, onComplete: () => void): void {
    this.isTypewriting = true;
    this.fullText = text;
    this.textObject.setText('');

    let charIndex = 0;
    this.typewriteTimer = this.time.addEvent({
      delay: 25,
      repeat: text.length - 1,
      callback: () => {
        charIndex++;
        this.textObject.setText(text.substring(0, charIndex));
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
  }

  private showText(text: string): void {
    this.textObject.setText(text);
  }

  private showChoices(choices: NarrativeChoice[]): void {
    this.currentChoices = choices;
    this.selectedIndex = 0;

    const startY = this.textObject.y + this.textObject.height + 24;
    const startX = BOX_MARGIN + BOX_PADDING + 20;

    choices.forEach((choice, i) => {
      const text = this.add.text(startX, startY + i * 28, choice.text, CHOICE_STYLE)
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
    });

    this.cursorObject.setVisible(true);
    this.updateChoiceHighlight();
  }

  private clearChoices(): void {
    this.choiceObjects.forEach(obj => obj.destroy());
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

  private showContinueToTitle(): void {
    const width = this.cameras.main.width;
    const y = this.textObject.y + this.textObject.height + 30;
    this.add.text(width / 2, y, '[ End ]', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#666666',
    }).setOrigin(0.5).setInteractive().on('pointerdown', () => {
      this.scene.stop('StatusScene');
      this.scene.start('TitleScene');
    });
  }

  private handleInput(event: KeyboardEvent): void {
    const key = event.keyCode;

    // If typewriting, skip on any key
    if (this.isTypewriting) {
      this.skipTypewrite();
      // After skipping, trigger the same logic as onComplete
      const node = this.engine.getCurrentNode();
      if (node) {
        if (node.roll) {
          const result = this.engine.resolveRoll(node.roll);
          if (result) {
            this.time.delayedCall(300, () => this.presentNode(result));
          }
        } else if (node.choices && node.choices.length > 0) {
          this.showChoices(this.engine.getAvailableChoices());
        } else if (node.next) {
          this.continuePrompt.setVisible(true);
        } else if (node.end) {
          this.showContinueToTitle();
        } else {
          this.continuePrompt.setVisible(true);
        }
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

    // Continue prompt (auto-advance or just waiting)
    if (key === Phaser.Input.Keyboard.KeyCodes.ENTER || key === Phaser.Input.Keyboard.KeyCodes.SPACE) {
      const node = this.engine.getCurrentNode();
      if (node?.next) {
        const nextNode = this.engine.advanceToNext();
        if (nextNode) {
          this.presentNode(nextNode);
        }
      }
    }
  }
}
