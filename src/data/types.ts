export interface NarrativeChoice {
  text: string;
  next: string;
  condition?: ChoiceCondition;
}

export interface ChoiceCondition {
  has_flag?: string;
  not_flag?: string;
  min_stat?: { stat: string; value: number };
  max_stat?: { stat: string; value: number };
}

export interface StatEffect {
  stat?: string;
  delta?: number;
  set_flag?: string;
  clear_flag?: string;
}

export interface DiceRoll {
  stat: string;
  dc: number;
  success: string;
  failure: string;
}

export interface SceneCharacter {
  id: string;
  sprite: string;       // sprite key or color for procedural
  x: number;
  y: number;
  facing?: 'left' | 'right';
}

export interface CharacterMove {
  id: string;
  to_x: number;
  to_y: number;
  speed?: number;        // px/sec, default 60
  facing?: 'left' | 'right';
}

export interface NarrativeNode {
  id: string;
  text: string;
  effects?: StatEffect[];
  choices?: NarrativeChoice[];
  roll?: DiceRoll;
  random?: string[]; // randomly pick one of these node IDs
  mood?: 'beauty' | 'spirit'; // visual mood overlay
  next?: string; // auto-advance to next node
  next_event?: string; // chain to another event YAML (by cache key)
  end?: boolean; // marks end of this event/chapter
  scene?: string;                  // background key: "longhouse", "forest", "river"
  characters?: SceneCharacter[];   // set who's on screen (replaces previous)
  move?: CharacterMove[];          // tween characters before text
  hide_characters?: string[];      // remove specific characters by id
  clear_stage?: boolean;           // clear everything
}

export interface EventTrigger {
  season?: string;
  has_flag?: string;
  not_flag?: string;
  min_stat?: { stat: string; value: number };
  random_chance?: number;
  chapter?: number;
}

export interface NarrativeEvent {
  event: string;
  trigger?: EventTrigger;
  nodes: NarrativeNode[];
}

export interface SurvivalStats {
  health: number;
  hunger: number;
  warmth: number;
  morale: number;
  standing: number;
  children: number;
  age: number;
  child_health: number;
}

export const DEFAULT_STATS: SurvivalStats = {
  health: 80,
  hunger: 70,
  warmth: 70,
  morale: 60,
  standing: 50,
  children: 0,
  age: 0,
  child_health: 50,
};

export interface GameState {
  stats: SurvivalStats;
  flags: Set<string>;
  currentChapter: number;
  season: Season;
  year: number;
  choiceHistory: string[];
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
