# Noble Savage

A 2D RPG in the visual style of SNES-era Final Fantasy (FF6) that functions as a choose-your-own-adventure with light survival mechanics. Subverts the "noble savage" myth by putting the player through the brutal realities of pre-contact North American indigenous life. Tone is sobering realism — no editorializing, just let the player live it.

## Tech Stack

- **Runtime**: Browser (vanilla HTML/CSS/TypeScript — no framework)
- **Language**: TypeScript
- **Build**: Vite
- **Styling**: Plain CSS, SNES FF6 aesthetic (dark panels, monospace, gold accents)
- **Narrative**: YAML files in `public/narrative/`, loaded at boot via fetch, parsed with js-yaml
- **Package manager**: npm

## Commands

- `make dev` — start Vite dev server
- `make build` — production build to `dist/`
- `make publish` — build + deploy to GitHub Pages
- `npx tsc --noEmit` — type check without emitting

## Project Structure

```
src/
  main.ts                  # App bootstrap: YAML loading, screen init, debug chapter param
  ui/
    screens.ts             # Screen manager (show/hide screens by ID)
    title.ts               # Title screen, 50% infant mortality gate, mercy rule
    death.ts               # Infant death screen (12 variants)
    affliction.ts          # Non-fatal birth conditions (11 afflictions + healthy)
    dialogue.ts            # Main game: typewriter text, choices, moods, stat effects
    exile.ts               # Exile ending (standing reaches 0)
    status.ts              # HUD bar (HP, Will, Status)
  styles/
    main.css               # Base styles, SNES aesthetic, responsive, mood effects
    screens.css            # Per-screen styles
  systems/
    NarrativeEngine.ts     # YAML event loading, node traversal, rolls, random branching
    SurvivalSystem.ts      # Stat tracking (health, hunger, warmth, morale, standing, etc.)
    ChoiceManager.ts       # Flag tracking, choice history, condition evaluation
    SeasonSystem.ts        # Season rotation, seasonal stat modifiers
  data/
    types.ts               # All TypeScript interfaces, default stats
  utils/
    YamlLoader.ts          # fetch + js-yaml parsing helper
public/
  narrative/
    prologue.yaml          # Birth through age 5, two branching infant paths
    chapter1.yaml          # Childhood ages 5-12
    chapter2.yaml          # Adolescence ages 13-18
    chapter3.yaml          # Adulthood ages 19-30
    chapter4.yaml          # Elder years ages 30-40 + epilogue
    events/
      sickness.yaml        # Child fever event
```

## Narrative Data Format

YAML files define events with nodes. Key node fields:
- `text` — narrative text displayed to player
- `choices` — player choices, each with `text` and `next` (node ID)
- `effects` — stat changes and flag mutations
- `roll` — dice roll with `stat`, `dc`, `success`, `failure`
- `random` — array of node IDs, engine picks one at random
- `next` — auto-advance to another node (player presses continue)
- `next_event` — chain to another YAML event (by cache key from main.ts)
- `end` — marks end of event, shows return-to-title

Choices can have `condition` with `has_flag`, `not_flag`, `min_stat`, `max_stat`.

## Game Flow

Title → [50% death / 50% survive] → Affliction → Prologue → Chapter 1 → ... → Chapter 4/Epilogue

Mercy rule: 2+ infant deaths within 60 seconds = auto-survive next attempt.

Debug: `?chapter=chapter2` URL param skips to any chapter with simulated state.

## Chapter Outline

**Prologue: Birth (ages 0-5)** — You are born. Infant mortality odds, naming without writing, first winter in the longhouse. Randomly forks into two upbringings: raised by your mother (stable but grim) or orphaned and passed between reluctant relatives (harsher stats, self-reliance). Ends at age 5 with your first real choice.

**Chapter 1: Childhood (ages 5-12)** — Learning which plants kill you. First encounters with death: a friend drowns, a girl dies from an infected cut. Late-winter famine where the elders stop eating so the children can. A raid from a neighboring tribe over fishing rights. Social dynamics: your mother takes multiple husbands because men keep dying, casual intra-tribal violence goes unchecked, the village chief murders your aunt for embarrassing him and nothing happens. A toothache with no remedy.

**Chapter 2: Adolescence (ages 13-18)** — Rite of passage (painful, dangerous, not everyone survives). First real hunt — days of tracking, often empty-handed. Participating in a raid yourself, seeing violence up close without glory. Arranged marriage. A shaman's prophecy leads the tribe into a bad decision.

**Chapter 3: Adulthood (ages 19-30)** — Your first child is born (dangerous birth, no medical intervention). Children getting sick — the medicine man's treatments often make things worse. A famine year. Your spouse is injured and there's nothing you can do. Intertribal conflict escalates. You realize you're already considered old.

**Chapter 4: Elder Years (ages 30-40)** — Your body is breaking down: arthritis, worn teeth, old injuries. Watching your children face the same cycles. A harsh winter where the tribe can't feed everyone. Reflection — no written record, no history book, your grandchildren's grandchildren won't know your name. Death. Average life expectancy was 35-40 if you survived childhood.

**Epilogue** — Brief, factual summary. Statistics. Context. Not preachy — just: "This is what life was actually like for most humans for most of history. The 'noble savage' living in harmony with nature was invented by European philosophers who never lived it."

## Style Notes

- Tone: factual, unsentimental, no editorializing. Let the events speak.
- No emojis in narrative text
- "In the modern world: [trivial fix]" pattern for afflictions — contrast without commentary
- Statistics and context in epilogue, not throughout
