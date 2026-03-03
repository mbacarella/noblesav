import { ChoiceCondition, SurvivalStats } from '../data/types';

export class ChoiceManager {
  flags: Set<string> = new Set();
  history: string[] = [];

  setFlag(flag: string): void {
    this.flags.add(flag);
  }

  clearFlag(flag: string): void {
    this.flags.delete(flag);
  }

  hasFlag(flag: string): boolean {
    return this.flags.has(flag);
  }

  recordChoice(choiceId: string): void {
    this.history.push(choiceId);
  }

  evaluateCondition(condition: ChoiceCondition, stats: SurvivalStats): boolean {
    if (condition.has_flag && !this.flags.has(condition.has_flag)) {
      return false;
    }
    if (condition.not_flag && this.flags.has(condition.not_flag)) {
      return false;
    }
    if (condition.min_stat) {
      const value = stats[condition.min_stat.stat as keyof SurvivalStats];
      if (value < condition.min_stat.value) return false;
    }
    if (condition.max_stat) {
      const value = stats[condition.max_stat.stat as keyof SurvivalStats];
      if (value > condition.max_stat.value) return false;
    }
    return true;
  }
}
