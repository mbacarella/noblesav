import { Season } from '../data/types';
import { SurvivalSystem } from './SurvivalSystem';

const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export class SeasonSystem {
  currentSeason: Season = 'spring';
  year: number = 1;
  private seasonIndex: number = 0;

  advance(): void {
    this.seasonIndex = (this.seasonIndex + 1) % 4;
    this.currentSeason = SEASON_ORDER[this.seasonIndex];
    if (this.seasonIndex === 0) {
      this.year++;
    }
  }

  applySeasonalEffects(survival: SurvivalSystem): void {
    switch (this.currentSeason) {
      case 'winter':
        survival.applyStat('warmth', -15);
        survival.applyStat('hunger', -10);
        break;
      case 'spring':
        survival.applyStat('warmth', 5);
        survival.applyStat('hunger', 5);
        survival.applyStat('morale', 5);
        break;
      case 'summer':
        survival.applyStat('warmth', 10);
        survival.applyStat('hunger', 10);
        break;
      case 'autumn':
        survival.applyStat('hunger', 5);
        survival.applyStat('warmth', -5);
        break;
    }
  }

  getSeasonColor(): number {
    switch (this.currentSeason) {
      case 'spring': return 0x44aa44;
      case 'summer': return 0x88cc44;
      case 'autumn': return 0xcc8844;
      case 'winter': return 0xaaaacc;
    }
  }
}
