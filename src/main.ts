import { initScreens } from './ui/screens';
import { showTitle } from './ui/title';
import { showDialogue, setYamlCache } from './ui/dialogue';

// Debug state for chapter skipping via ?chapter= URL param
const CHAPTER_DEBUG_STATE: Record<string, { stats: Record<string, number>; flags: string[] }> = {
  prologue: {
    stats: {},
    flags: [],
  },
  chapter1: {
    stats: { health: 70, hunger: 65, warmth: 65, morale: 50, standing: 45 },
    flags: ['survived_infancy', 'longhouse_child'],
  },
  chapter2: {
    stats: { health: 55, hunger: 50, warmth: 50, morale: 40, standing: 40 },
    flags: [
      'survived_infancy', 'longhouse_child', 'prologue_complete',
      'knows_hemlock', 'witnessed_infection_death', 'survived_raid',
      'aunt_murdered', 'knows_powerlessness', 'chapter1_complete',
    ],
  },
  chapter3: {
    stats: { health: 45, hunger: 45, warmth: 45, morale: 35, standing: 45 },
    flags: [
      'survived_infancy', 'longhouse_child', 'prologue_complete',
      'knows_hemlock', 'witnessed_infection_death', 'survived_raid',
      'aunt_murdered', 'knows_powerlessness', 'chapter1_complete',
      'rite_complete', 'first_kill', 'married', 'wife_pregnant',
      'raided_flint_people', 'survived_bad_prophecy', 'chapter2_complete',
    ],
  },
  chapter4: {
    stats: { health: 35, hunger: 40, warmth: 40, morale: 30, standing: 50, children: 2 },
    flags: [
      'survived_infancy', 'longhouse_child', 'prologue_complete',
      'knows_hemlock', 'witnessed_infection_death', 'survived_raid',
      'aunt_murdered', 'knows_powerlessness', 'chapter1_complete',
      'rite_complete', 'first_kill', 'married', 'wife_pregnant',
      'raided_flint_people', 'survived_bad_prophecy', 'chapter2_complete',
      'has_child', 'lost_child', 'chapter3_complete',
    ],
  },
};

// YAML files to load
const YAML_FILES: Record<string, string> = {
  prologue: 'narrative/prologue.yaml',
  chapter1: 'narrative/chapter1.yaml',
  chapter2: 'narrative/chapter2.yaml',
  chapter3: 'narrative/chapter3.yaml',
  chapter4: 'narrative/chapter4.yaml',
  sickness: 'narrative/events/sickness.yaml',
};

async function boot(): Promise<void> {
  const loadingBar = document.getElementById('loading-bar')!;
  const yamlCache = new Map<string, string>();

  // Load all YAML files
  const entries = Object.entries(YAML_FILES);
  let loaded = 0;

  await Promise.all(
    entries.map(async ([key, path]) => {
      const resp = await fetch(path);
      const text = await resp.text();
      yamlCache.set(key, text);
      loaded++;
      loadingBar.style.width = `${(loaded / entries.length) * 100}%`;
    })
  );

  // Pass cache to dialogue module
  setYamlCache(yamlCache);

  // Init screen manager
  initScreens();

  // Check for debug chapter skip
  const params = new URLSearchParams(window.location.search);
  const chapter = params.get('chapter');

  if (chapter && CHAPTER_DEBUG_STATE[chapter]) {
    const state = CHAPTER_DEBUG_STATE[chapter];
    console.log(`[DEBUG] Skipping to ${chapter} with simulated state`);
    showDialogue(chapter, undefined, state.stats, state.flags);
  } else {
    showTitle();
  }
}

boot();
