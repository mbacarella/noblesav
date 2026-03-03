import { SurvivalStats, DEFAULT_STATS, StatEffect } from '../data/types';

export class SurvivalSystem {
  stats: SurvivalStats;

  constructor() {
    this.stats = { ...DEFAULT_STATS };
  }

  applyStat(stat: string, delta: number): void {
    if (stat in this.stats) {
      const key = stat as keyof SurvivalStats;
      this.stats[key] = Math.max(0, Math.min(100, this.stats[key] + delta));
    }
  }

  applyEffects(effects: StatEffect[], flags: Set<string>): void {
    for (const effect of effects) {
      if (effect.stat && effect.delta !== undefined) {
        this.applyStat(effect.stat, effect.delta);
      }
      if (effect.set_flag) {
        flags.add(effect.set_flag);
      }
      if (effect.clear_flag) {
        flags.delete(effect.clear_flag);
      }
    }
  }

  getStat(stat: string): number {
    if (stat in this.stats) {
      return this.stats[stat as keyof SurvivalStats];
    }
    return 0;
  }

  isAlive(): boolean {
    return this.stats.health > 0;
  }

  getStatColor(stat: string): number {
    const value = this.getStat(stat);
    if (value > 60) return 0x44cc44;
    if (value > 30) return 0xcccc44;
    return 0xcc4444;
  }
}
