import { SurvivalStats } from '../data/types';
import { showScreen } from './screens';
import { showDialogue } from './dialogue';

interface Affliction {
  name: string;
  modern: string;
  text: string;
  effects: Partial<SurvivalStats>;
  flags: string[];
}

const AFFLICTIONS: Affliction[] = [
  {
    name: 'Clubfoot',
    modern: 'Correctable with a simple brace worn for a few months.',
    text: "You are born with one foot twisted inward. You will never run properly. You will limp for the rest of your life. The other children will be faster than you — when hunting, when fleeing, always.",
    effects: { health: -20 },
    flags: ['clubfoot'],
  },
  {
    name: 'Cleft palate',
    modern: 'A routine surgery performed within the first year of life.',
    text: "You are born with a split in the roof of your mouth. Nursing is a struggle — milk comes through your nose, you choke and gag. You are malnourished for your first two years. The gap never closes. You will speak with difficulty your whole life, and some will take it as a sign of spiritual disfavor.",
    effects: { health: -15, standing: -10 },
    flags: ['cleft_palate'],
  },
  {
    name: 'Severe ear infection',
    modern: 'A course of amoxicillin. Ten days.',
    text: "At eight months, fluid builds in your inner ear. The pain is extraordinary — you scream for days. The infection spreads. By the time it resolves on its own, the damage is done. You are deaf in your left ear. You will never hear someone approaching from that side.",
    effects: { health: -10 },
    flags: ['partial_deaf'],
  },
  {
    name: 'Rickets',
    modern: 'Vitamin D supplements. Pennies per dose.',
    text: "The long winters without sunlight leave your bones soft. Your legs bow outward as you begin to walk. Your bones ache in the cold — which is most of the year. You are shorter and weaker than the other children. You will always be.",
    effects: { health: -15, warmth: -10 },
    flags: ['rickets'],
  },
  {
    name: 'Lazy eye',
    modern: 'An eye patch worn for a few hours a day during childhood.',
    text: "Your left eye drifts outward and never learns to focus. You have no depth perception. Throwing a spear, threading a bone needle, judging the distance to a branch above a river — everything that requires two working eyes is harder for you. The medicine man says a spirit is looking out of you sideways.",
    effects: { standing: -5 },
    flags: ['lazy_eye'],
  },
  {
    name: 'Chronic middle ear disease',
    modern: 'Ear tubes. A fifteen-minute outpatient procedure.',
    text: "Infections come again and again through your first three years. Foul-smelling fluid drains from your ear. Your hearing dulls to a muffled hum on one side, then the other. By the time you are four, you struggle to hear speech unless you are looking directly at the speaker. You miss warnings. You miss calls. You miss everything said behind your back.",
    effects: { health: -10, standing: -5 },
    flags: ['hearing_loss'],
  },
  {
    name: 'Untreated hernia',
    modern: 'Routine surgery. Same-day discharge.',
    text: "A bulge appears in your groin at age two. It hurts when you run, when you lift, when you strain. Your mother pushes it back in with her fingers. It comes back. It will always come back. You learn to live with a dull, constant pain that sharpens without warning. Heavy labor — which is all labor here — is agony.",
    effects: { health: -15 },
    flags: ['hernia'],
  },
  {
    name: 'Neonatal jaundice',
    modern: 'Phototherapy. A special light for a day or two.',
    text: "You turn yellow within hours of birth. Your mother does not know what it means. No one does. The bilirubin builds in your blood and crosses into your brain. You survive, but something is different. Your movements are stiff and clumsy. You are slow where others are quick. The damage is permanent and invisible — locked inside a brain that almost developed normally.",
    effects: { health: -20, standing: -10 },
    flags: ['jaundice_damage'],
  },
  {
    name: 'Crossed eyes',
    modern: 'Corrective lenses or a brief outpatient surgery.',
    text: "Both of your eyes turn inward. The world is a blurred, doubled mess. You learn to tilt your head to see, to squint and guess at distances. Some in the tribe think you have spirit-sight. Most just think you are strange.",
    effects: { standing: -10 },
    flags: ['crossed_eyes'],
  },
  {
    name: 'Febrile seizures',
    modern: 'Fever management with ibuprofen or acetaminophen.',
    text: "Your first high fever at ten months triggers a seizure. Your body goes rigid, your eyes roll back, you convulse in your mother's arms. She thinks you are dying. She thinks a spirit has entered you. The medicine man burns herbs over your body and cuts marks into your scalp. The seizures come back with every fever for the next three years. Each time, your mother holds you and waits for it to stop. Each time, she is not sure it will.",
    effects: { health: -10, morale: -10 },
    flags: ['seizures'],
  },
  {
    name: 'Hip dysplasia',
    modern: 'A Pavlik harness worn for six to twelve weeks.',
    text: "Your hip socket is too shallow. The joint slips and grinds. You learn to walk late, and when you do, it hurts. By the time you are an adult, the cartilage will be gone and the bone will grind on bone. You will walk like an old person before you are twenty.",
    effects: { health: -20 },
    flags: ['hip_dysplasia'],
  },
  {
    name: 'No afflictions',
    modern: 'This was the exception, not the rule.',
    text: "You are born healthy. No deformities, no infections, no complications. Don't get comfortable. The world has not run out of ways to break you.",
    effects: {},
    flags: ['born_healthy'],
  },
];

function rollAffliction(): Affliction {
  const roll = Math.random();
  if (roll < 0.15) {
    return AFFLICTIONS[AFFLICTIONS.length - 1];
  }
  const index = Math.floor(Math.random() * (AFFLICTIONS.length - 1));
  return AFFLICTIONS[index];
}

export function showAffliction(): void {
  showScreen('screen-affliction');

  const affliction = rollAffliction();

  const survivedEl = document.getElementById('affliction-survived')!;
  const nameEl = document.getElementById('affliction-name')!;
  const descEl = document.getElementById('affliction-desc')!;
  const modernEl = document.getElementById('affliction-modern')!;
  const promptEl = document.getElementById('affliction-prompt')!;

  nameEl.textContent = affliction.name.toUpperCase();
  descEl.textContent = affliction.text;
  modernEl.textContent = affliction.modern ? `In the modern world: ${affliction.modern}` : '';

  // Reset animations
  const els = [survivedEl, nameEl, descEl, modernEl, promptEl];
  for (const el of els) {
    el.style.animation = 'none';
    el.style.opacity = '0';
    void el.offsetHeight;
    el.style.animation = '';
  }

  let skipped = false;
  let readyTimeout: ReturnType<typeof setTimeout>;

  const skipOrProceed = () => {
    if (!skipped) {
      skipped = true;
      for (const el of els) {
        el.style.animation = 'none';
        el.style.opacity = '1';
      }
      clearTimeout(readyTimeout);
    } else {
      cleanup();
      showDialogue('prologue', {
        effects: affliction.effects,
        flags: affliction.flags,
      });
    }
  };

  readyTimeout = setTimeout(() => {
    skipped = true;
  }, 6000);

  document.addEventListener('keydown', skipOrProceed);
  document.getElementById('screen-affliction')!.addEventListener('click', skipOrProceed);

  function cleanup() {
    document.removeEventListener('keydown', skipOrProceed);
    document.getElementById('screen-affliction')!.removeEventListener('click', skipOrProceed);
    clearTimeout(readyTimeout);
  }
}
