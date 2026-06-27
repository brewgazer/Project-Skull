# PROJECT SKULL

An original, dark-humored side-scrolling action brawler inspired by the energy
of early-2000s Flash games — built from scratch with **Phaser 3** and **Vite**.
Everything here is original: the art is generated as pixel art at runtime and
all audio is synthesized with the Web Audio API, so the repository ships **zero
binary assets** and contains **no copyrighted content**.

> You play a small, skull-masked figure in an oversized hoodie carving a path
> through derelict offices, factories and worse. Fast, stylish, gory, replayable.

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm run preview  # preview the production build
```

Modern desktop browser recommended. Renders at a native **320×180** and scales
up with crisp pixel-perfect filtering.

## Controls

| Action | Keys |
| --- | --- |
| Move | `A` / `D` or `←` / `→` |
| Jump | `W` / `↑` / `Space` |
| Attack (hold to rev chainsaw) | `J` / `X` |
| Heavy / Execute | `K` / `C` |
| Dash (i-frames) | `Shift` / `L` |
| Pause | `Esc` / `P` |

All keys are rebindable in **Settings**.

---

## What's implemented

- **Engine systems** (all reusable, in `src/systems/`): input + rebinding,
  camera effects (shake / hit-stop / slow-mo / flash / zoom), object pooling,
  particles, combo, score + ranking, save/load, and a synthesized audio engine
  with dynamic combat-reactive music and a continuous chainsaw.
- **Combat framework**: data-driven weapons (`src/data/weapons.js`) supporting
  continuous grinders (chainsaw) and timed swings with sweet-spot windows
  (bat), knockback, executions, and full game feel.
- **Enemy AI**: one data-driven `Enemy` entity with chaser / rusher / bruiser /
  boss behaviors, telegraphed attacks, aggro gating, and a charging mini-boss.
- **Player controller**: coyote time, jump buffering, variable jump height,
  dash i-frames, 3-heart health, infinite checkpoint retries.
- **UI/UX**: animated main menu, level select, accessibility settings, in-game
  HUD (hearts / score / combo meter / weapon / boss bar / objectives), pause,
  and an animated results + letter-rank screen.
- **Levels**:
  - **Level 1 — Chainsaw Rampage**: destruction, escalating enemies,
    explosive environmental kills, checkpoints, and the Foreman mini-boss.
  - **Level 2 — Door Defense**: 8-wave survival brawler showcasing the bat's
    sweet-spot timing and the wave system.
- **Accessibility**: master/music/SFX volume, screen-shake toggle, blood
  intensity, colorblind mode, full key rebinding.

## Project structure

```
src/
  config.js            global constants, palette, scene/texture keys
  main.js              Phaser bootstrap + scene registration
  assets/              procedural art (TextureFactory, CharacterArtist, Assets)
  systems/             reusable engine systems
  entities/            Player, Enemy, Destructible
  scenes/              Boot, MainMenu, Settings, LevelSelect, HUD, Pause,
                       LevelComplete, BaseLevelScene, Level1, Level2
  ui/                  Menu widget
  data/                weapons, enemies, character schemes
  utils/               math + shared event names
qa/                    headless Playwright smoke test
```

## Extending to the remaining levels

The architecture is built so Levels 3–9 + the final boss slot directly into the
existing framework: subclass `BaseLevelScene`, lay out content in `buildLevel()`,
add new enemy archetypes to `src/data/enemies.js` and new weapons to
`src/data/weapons.js`. The mechanics described in the design doc (conveyors,
saw blades, crushers, power outages, elevators, trains, etc.) are authored as
hazard groups + per-level logic in `onLevelUpdate()`.

## QA

A headless Playwright smoke test boots the game, plays through combat, and
asserts there are no runtime errors:

```bash
npm run dev          # in one terminal
node qa/gameplay.mjs # in another
```

## License

MIT. All art and audio are original and generated procedurally.
