# Dark Fort: Moon Devils

**A fast, brutal solo dungeon-crawl on the Moon.** Pick a door, spend your air, get out alive.

A salvager goes down three depths of an abandoned moon base, kills the Vault guardian, takes the mission target, and tries to climb back out before the Oxygen runs out. A run takes about ten minutes. Most salvagers end up in the graveyard.

It's built in the tradition of *Dark Fort*, *Mörk Borg* and *Cairn*, with Lithuanian folklore in the dark: Laumė at her loom, the žaltys in the vents, Velnias dealing cards.

👉 **Play: [pouliens.github.io/Dark-Fort-RPG](https://pouliens.github.io/Dark-Fort-RPG/)**
📜 **Pen & paper rules: [reference.html](https://pouliens.github.io/Dark-Fort-RPG/reference.html)**

---

## How it plays

- **Doors are decisions.** Every room offers 2–3 doors, and each shows what's behind it: Threat, Marked elite, Salvage, Strange, Shrine, Peddler, Dark (unknown), or the Lift down.
- **Oxygen is the clock.** Every door costs air, and so does climbing out. The marker on the O2 bar shows what the escape costs right now.
- **Three pools, routed damage.** Body, Mind and Soul. If any one hits 0, you die. Each enemy hits one pool, and each suit protects one.
- **Readable combat.** Enemies telegraph Strike, Charge or Guard. You answer with Attack, Push (spend air), Brace, an Item, or Flee. Every button shows your odds.
- **Push your luck.** Miss a test by 1 and you can burn 1 O2 to force it. With the target in hand, every credit you find is doubled. Extract now, or one more room?
- **Builds from combinations.** There are 6 backgrounds, 20 strange rooms, 12 threats, 3 Vault guardians, 4 elite affixes, 30+ items, 10 relics, and 15 advancements drafted 1-of-3.
- **Meta.** Graveyard, records, and a seeded **Daily descent** with a shareable result.

See [DESIGN.md](DESIGN.md) for the design notes behind the v2 overhaul.

## Project layout

| File | What it is |
| --- | --- |
| `game-data.js` | Every table: enemies, items, events, missions, advancements. The game and the reference page both read from it. |
| `engine.js` | Pure rules engine with no DOM. Seedable RNG, JSON state, and a `beats` list describing what happened on each action. |
| `ui.js` | Rendering, animation, autosave, graveyard, daily runs and sharing. |
| `sfx.js` | Small WebAudio synth for sound effects and ambience. No samples, no network. |
| `styles.css` | The look. The accent colour changes with depth. |
| `reference.html` / `reference.js` / `reference.css` | Pen & paper rules generated from the same data, with roll buttons. |
| `icons.js` | Generated SVG icons (see below). |
| `tests/sim.js` | Headless simulation and fuzz tests: invariants, determinism, and balance guard-rails. |

## Develop

No build step. It's static files.

```bash
npm test             # syntax checks + thousands of simulated runs
npm run sim          # bigger balance report
npm run serve        # http://localhost:8000 (also reachable from your phone on the same Wi-Fi)
```

To add an icon, use its [game-icons.net](https://game-icons.net) name anywhere in the code (for example `icon('crowned-skull')`), then run `npm install && npm run icons` to regenerate `icons.js`.

The run autosaves to `localStorage` after every tap, so switching apps on a phone never loses it.

## Credits

- Icons by Lorc, Delapouite and contributors from [game-icons.net](https://game-icons.net), licensed [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
- Fonts: Pirata One, Oswald and EB Garamond, all under the SIL Open Font License (see `assets/fonts/`).
- Rules inspired by *Dark Fort* and *Mörk Borg*, via the Moon Devils variant. This is an unofficial fan project.
