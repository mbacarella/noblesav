import { showScreen } from './screens';
import { showTitle } from './title';

const DEATHS = [
  "You are stillborn. The umbilical cord was wrapped around your neck. Your mother will grieve, but not for long — she has three living children who need her. Your body is buried without a name.",
  "You survive birth but die within hours. Your lungs never fully open. You gasp, and then you stop. Your mother holds you until your grandmother takes you away.",
  "You live for eleven days. A fever takes you on a cold night. You are too small to fight it. Your father carves no marker. There is nothing to carve it on.",
  "You are born healthy, but your mother dies from the birth. Without her milk, you weaken over two weeks. A wet nurse tries, but her own child needs the milk more. You fade quietly.",
  "You make it to four months. Dysentery. There is no clean water, no medicine, no rehydration. You die over the course of three terrible days. Your older sister, who is six, does not understand where you went.",
  "You choke on your first solid food at seven months. No one knows what to do. It takes less than four minutes.",
  "You are born in late autumn. The winter is the worst in memory. The longhouse cannot stay warm enough. You develop pneumonia at two months. The rattling in your tiny chest stops on the coldest night of the year.",
  "You live to fourteen months — long enough to take your first steps, long enough for your mother to believe you might make it. Then a cut on your foot from a sharp stone. Infection. No antibiotics exist anywhere on earth. It takes a week.",
  "You are one of twins. Neither of you survives the first winter. There is not enough milk for two.",
  "You are born during a raid. The stress causes your mother to hemorrhage. The medicine man cannot stop the bleeding. She dies. You survive three days without milk before following her.",
  "You live to age three. You are bright, curious, already speaking in full sentences. You eat berries from a bush near the river. They are not the right berries. There is no poison control. There is no stomach pump. Your mother watches and can do nothing.",
  "You drown in a shallow creek at age two. You wandered twenty feet from your mother while she was grinding corn. It took less than a minute. The water was six inches deep.",
];

const seenDeaths = new Set<number>();

export function resetSeenDeaths(): void {
  seenDeaths.clear();
}

export function showDeath(): void {
  showScreen('screen-death');

  // Pick from unseen deaths; reset if all seen
  const unseen = DEATHS.map((_, i) => i).filter(i => !seenDeaths.has(i));
  if (unseen.length === 0) seenDeaths.clear();
  const pool = unseen.length > 0 ? unseen : DEATHS.map((_, i) => i);
  const deathIndex = pool[Math.floor(Math.random() * pool.length)];
  seenDeaths.add(deathIndex);

  const textEl = document.getElementById('death-text')!;
  const promptEl = document.getElementById('death-prompt')!;
  textEl.textContent = DEATHS[deathIndex];

  // Reset animations by re-triggering reflow
  textEl.style.animation = 'none';
  promptEl.style.animation = 'none';
  void textEl.offsetHeight;
  textEl.style.animation = '';
  promptEl.style.animation = '';

  let skipped = false;
  let readyTimeout: ReturnType<typeof setTimeout>;

  const skipOrProceed = () => {
    if (!skipped) {
      skipped = true;
      textEl.style.animation = 'none';
      textEl.style.opacity = '1';
      promptEl.style.animation = 'none';
      promptEl.style.opacity = '1';
      clearTimeout(readyTimeout);
    } else {
      cleanup();
      showTitle();
    }
  };

  readyTimeout = setTimeout(() => {
    skipped = true;
  }, 4000);

  document.addEventListener('keydown', skipOrProceed);
  document.getElementById('screen-death')!.addEventListener('click', skipOrProceed);

  function cleanup() {
    document.removeEventListener('keydown', skipOrProceed);
    document.getElementById('screen-death')!.removeEventListener('click', skipOrProceed);
    clearTimeout(readyTimeout);
  }
}
