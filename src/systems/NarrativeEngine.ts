import { NarrativeEvent, NarrativeNode, NarrativeChoice, DiceRoll } from '../data/types';
import { SurvivalSystem } from './SurvivalSystem';
import { ChoiceManager } from './ChoiceManager';
import { loadYaml } from '../utils/YamlLoader';

export class NarrativeEngine {
  private events: Map<string, NarrativeEvent> = new Map();
  private nodeMap: Map<string, NarrativeNode> = new Map();
  private currentNode: NarrativeNode | null = null;
  private currentEvent: NarrativeEvent | null = null;

  survival: SurvivalSystem;
  choices: ChoiceManager;

  constructor(survival: SurvivalSystem, choices: ChoiceManager) {
    this.survival = survival;
    this.choices = choices;
  }

  async loadEvent(url: string): Promise<NarrativeEvent> {
    const event = await loadYaml(url);
    this.registerEvent(event);
    return event;
  }

  registerEvent(event: NarrativeEvent): void {
    this.events.set(event.event, event);
    this.nodeMap.clear();
    for (const node of event.nodes) {
      this.nodeMap.set(node.id, node);
    }
  }

  startEvent(eventName: string): NarrativeNode | null {
    const event = this.events.get(eventName);
    if (!event || event.nodes.length === 0) return null;
    this.currentEvent = event;
    this.registerEvent(event); // rebuild nodeMap for this event
    this.currentNode = event.nodes[0];
    this.applyNodeEffects(this.currentNode);
    return this.currentNode;
  }

  getNode(nodeId: string): NarrativeNode | null {
    return this.nodeMap.get(nodeId) ?? null;
  }

  selectChoice(choice: NarrativeChoice): NarrativeNode | null {
    this.choices.recordChoice(choice.next);
    const nextNode = this.nodeMap.get(choice.next);
    if (!nextNode) return null;
    this.currentNode = nextNode;
    this.applyNodeEffects(nextNode);
    return nextNode;
  }

  resolveRoll(roll: DiceRoll): NarrativeNode | null {
    const statValue = this.survival.getStat(roll.stat);
    const diceRoll = Math.floor(Math.random() * 100);
    const success = (statValue + diceRoll) >= roll.dc + 50;
    const nextId = success ? roll.success : roll.failure;
    const nextNode = this.nodeMap.get(nextId);
    if (!nextNode) return null;
    this.currentNode = nextNode;
    this.applyNodeEffects(nextNode);
    return nextNode;
  }

  advanceToNext(): NarrativeNode | null {
    if (!this.currentNode?.next) return null;
    const nextNode = this.nodeMap.get(this.currentNode.next);
    if (!nextNode) return null;
    this.currentNode = nextNode;
    this.applyNodeEffects(nextNode);
    return nextNode;
  }

  private applyNodeEffects(node: NarrativeNode): void {
    if (node.effects) {
      this.survival.applyEffects(node.effects, this.choices.flags);
    }
  }

  getAvailableChoices(): NarrativeChoice[] {
    if (!this.currentNode?.choices) return [];
    return this.currentNode.choices.filter(choice => {
      if (!choice.condition) return true;
      return this.choices.evaluateCondition(choice.condition, this.survival.stats);
    });
  }

  getCurrentNode(): NarrativeNode | null {
    return this.currentNode;
  }

  isAtEnd(): boolean {
    return this.currentNode?.end === true;
  }

  hasRoll(): boolean {
    return this.currentNode?.roll !== undefined;
  }

  hasChoices(): boolean {
    return (this.currentNode?.choices?.length ?? 0) > 0;
  }

  hasAutoAdvance(): boolean {
    return this.currentNode?.next !== undefined;
  }
}
