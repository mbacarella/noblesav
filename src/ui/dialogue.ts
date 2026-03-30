import yaml from 'js-yaml';
import { NarrativeEvent, NarrativeNode, NarrativeChoice, SurvivalStats } from '../data/types';
import { NarrativeEngine } from '../systems/NarrativeEngine';
import { SurvivalSystem } from '../systems/SurvivalSystem';
import { ChoiceManager } from '../systems/ChoiceManager';
import { showScreen } from './screens';
import { showExile } from './exile';
import { showTitle } from './title';
import { initStatus, updateStatus } from './status';
import { initStage, showStage, updateStage, moveCharacters, clearStage } from './stage';

const CHAPTER_NAMES: Record<string, string> = {
  prologue: 'Prologue: Birth',
  chapter1: 'Chapter 1: Childhood',
  chapter2: 'Chapter 2: Adolescence',
  chapter3: 'Chapter 3: Adulthood',
  chapter4: 'Chapter 4: Elder Years',
};

let engine: NarrativeEngine;
let survival: SurvivalSystem;
let choiceManager: ChoiceManager;
let yamlCache: Map<string, string>;

// DOM elements
let dialogueScreen: HTMLElement;
let textEl: HTMLElement;
let choicesEl: HTMLElement;
let continueEl: HTMLElement;
let chapterEl: HTMLElement;
let dialogueBox: HTMLElement;

// Typewriter state
let typewriteInterval: ReturnType<typeof setInterval> | undefined;
let isTypewriting = false;
let fullPageText = '';

// Current state
let currentChoices: NarrativeChoice[] = [];
let selectedIndex = 0;
let currentMood: string | undefined;

// Input cleanup
let keyHandler: ((e: KeyboardEvent) => void) | undefined;

export function setYamlCache(cache: Map<string, string>): void {
  yamlCache = cache;
}

export function showDialogue(
  eventName: string,
  affliction?: { effects: Partial<SurvivalStats>; flags: string[] },
  debugStats?: Record<string, number>,
  debugFlags?: string[],
): void {
  showScreen('screen-dialogue');

  // Init systems
  survival = new SurvivalSystem();
  choiceManager = new ChoiceManager();
  engine = new NarrativeEngine(survival, choiceManager);

  // Grab DOM refs
  dialogueScreen = document.getElementById('screen-dialogue')!;
  textEl = document.getElementById('dialogue-text')!;
  choicesEl = document.getElementById('dialogue-choices')!;
  continueEl = document.getElementById('dialogue-continue')!;
  chapterEl = document.getElementById('dialogue-chapter')!;
  dialogueBox = document.getElementById('dialogue-box')!;

  // Apply affliction
  if (affliction) {
    for (const [stat, delta] of Object.entries(affliction.effects)) {
      survival.applyStat(stat, delta as number);
    }
    for (const flag of affliction.flags) {
      choiceManager.setFlag(flag);
    }
  }

  // Apply debug state
  if (debugStats) {
    for (const [stat, value] of Object.entries(debugStats)) {
      const current = survival.getStat(stat);
      survival.applyStat(stat, value - current);
    }
  }
  if (debugFlags) {
    for (const flag of debugFlags) {
      choiceManager.setFlag(flag);
    }
  }

  // Init status HUD and stage
  initStatus(survival);
  initStage();

  // Set up input
  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  keyHandler = handleInput;
  document.addEventListener('keydown', keyHandler);

  // Tap/click on the dialogue box to advance
  dialogueBox.addEventListener('click', onBoxClick);

  // Load and start
  loadAndStart(eventName);
}

function cleanupDialogue(): void {
  if (keyHandler) {
    document.removeEventListener('keydown', keyHandler);
    keyHandler = undefined;
  }
  dialogueBox.removeEventListener('click', onBoxClick);
  stopTypewrite();
}

function onBoxClick(): void {
  // Simulate space press
  handleInput(new KeyboardEvent('keydown', { key: ' ', code: 'Space' }));
}

function loadAndStart(eventName: string): void {
  const yamlText = yamlCache.get(eventName);
  if (!yamlText) {
    textEl.textContent = `Error: Could not load narrative data for "${eventName}".`;
    return;
  }

  const event = yaml.load(yamlText) as NarrativeEvent;
  engine.registerEvent(event);
  chapterEl.textContent = CHAPTER_NAMES[eventName] ?? eventName;
  const node = engine.startEvent(event.event);
  if (node) {
    presentNode(node);
  }
}

function presentNode(node: NarrativeNode): void {
  clearChoices();
  hideContinue();
  stopTypewrite();

  // Apply mood
  applyMood(node.mood);

  // Exile check
  if (survival.getStat('standing') <= 0) {
    cleanupDialogue();
    showExile();
    return;
  }

  // Update stats display
  updateStatus();

  // Stage updates
  if (node.clear_stage) {
    clearStage();
  }

  const hasVisualData = !!(node.scene || node.characters);
  if (hasVisualData) {
    showStage();
    updateStage({
      scene: node.scene,
      characters: node.characters,
      hide_characters: node.hide_characters,
    });
  } else if (node.hide_characters) {
    updateStage({ hide_characters: node.hide_characters });
  }

  // Get available choices for this node
  const availableChoices = (node.choices && node.choices.length > 0)
    ? engine.getAvailableChoices()
    : [];

  const onTextDone = () => {
    if (node.roll) {
      showContinue();
    } else if (node.random && node.random.length > 0) {
      showContinue();
    } else if (availableChoices.length > 0) {
      showChoices(availableChoices);
    } else if (node.next_event) {
      showContinue();
    } else if (node.next) {
      showContinue();
    } else if (node.end) {
      showEndPrompt();
    }
  };

  const startText = () => typewriteText(node.text, onTextDone);

  // Character movement before text
  if (node.move && node.move.length > 0) {
    moveCharacters(node.move, startText);
  } else {
    startText();
  }
}

function typewriteText(text: string, onComplete: () => void): void {
  stopTypewrite();
  fullPageText = text;
  textEl.textContent = '';
  isTypewriting = true;

  let charIndex = 0;
  typewriteInterval = setInterval(() => {
    charIndex++;
    textEl.textContent = text.substring(0, charIndex);
    if (charIndex >= text.length) {
      stopTypewrite();
      onComplete();
    }
  }, 12);

  // Store callback for skip
  (typewriteText as any)._onComplete = onComplete;
}

function stopTypewrite(): void {
  if (typewriteInterval !== undefined) {
    clearInterval(typewriteInterval);
    typewriteInterval = undefined;
  }
  isTypewriting = false;
}

function skipTypewrite(): void {
  stopTypewrite();
  textEl.textContent = fullPageText;
}

function showChoices(choices: NarrativeChoice[]): void {
  currentChoices = choices;
  selectedIndex = 0;
  choicesEl.innerHTML = '';
  choicesEl.classList.add('visible');

  choices.forEach((choice, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = choice.text;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedIndex = i;
      confirmChoice();
    });
    btn.addEventListener('mouseenter', () => {
      selectedIndex = i;
      updateChoiceHighlight();
    });
    choicesEl.appendChild(btn);
  });

  updateChoiceHighlight();
}

function clearChoices(): void {
  currentChoices = [];
  choicesEl.innerHTML = '';
  choicesEl.classList.remove('visible');
}

function updateChoiceHighlight(): void {
  const buttons = choicesEl.querySelectorAll('.choice-btn');
  buttons.forEach((btn, i) => {
    if (i === selectedIndex) {
      btn.classList.add('selected');
    } else {
      btn.classList.remove('selected');
    }
  });
}

function confirmChoice(): void {
  if (currentChoices.length === 0) return;
  const choice = currentChoices[selectedIndex];
  const nextNode = engine.selectChoice(choice);
  if (nextNode) {
    presentNode(nextNode);
  }
}

function showContinue(): void {
  continueEl.classList.add('visible');
}

function hideContinue(): void {
  continueEl.classList.remove('visible');
}

function showEndPrompt(): void {
  // Show an "[ End ]" button as a choice
  currentChoices = [];
  choicesEl.innerHTML = '';
  choicesEl.classList.add('visible');

  const btn = document.createElement('button');
  btn.className = 'choice-btn';
  btn.textContent = '[ End ]';
  btn.style.textAlign = 'center';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    cleanupDialogue();
    showTitle();
  });
  choicesEl.appendChild(btn);
}

function applyMood(mood?: 'beauty' | 'spirit'): void {
  // Remove old mood
  if (currentMood) {
    dialogueScreen.classList.remove(`mood-${currentMood}`);
  }
  currentMood = mood;
  if (mood) {
    dialogueScreen.classList.add(`mood-${mood}`);
  }
}

function handleInput(event: KeyboardEvent): void {
  const key = event.key;

  // If typewriting, skip to end
  if (isTypewriting) {
    skipTypewrite();
    const onComplete = (typewriteText as any)._onComplete;
    if (onComplete) onComplete();
    return;
  }

  // If choices are shown, navigate them
  if (currentChoices.length > 0) {
    if (key === 'ArrowUp' || key === 'w' || key === 'W') {
      selectedIndex = Math.max(0, selectedIndex - 1);
      updateChoiceHighlight();
      event.preventDefault();
    } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
      selectedIndex = Math.min(currentChoices.length - 1, selectedIndex + 1);
      updateChoiceHighlight();
      event.preventDefault();
    } else if (key === 'Enter' || key === ' ') {
      confirmChoice();
      event.preventDefault();
    }
    return;
  }

  // Continue prompt — advance
  if (key === 'Enter' || key === ' ') {
    event.preventDefault();
    const node = engine.getCurrentNode();
    if (node?.roll) {
      const result = engine.resolveRoll(node.roll);
      if (result) presentNode(result);
    } else if (node?.random && node.random.length > 0) {
      const result = engine.resolveRandom();
      if (result) presentNode(result);
    } else if (node?.next_event) {
      loadAndStart(node.next_event);
    } else if (node?.next) {
      const nextNode = engine.advanceToNext();
      if (nextNode) presentNode(nextNode);
    }
  }
}
