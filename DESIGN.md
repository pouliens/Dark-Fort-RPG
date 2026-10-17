# Dark Fort: Moon Devils — Design Notes

This is the reasoning behind the v2 overhaul: what wasn't working, the
principles used to fix it, and how the new rules fit together.

## Review of v1: why it felt clunky and boring

**Clunky**

- Each roll put up a full-screen dice overlay that blocked input for about
  1.8 s. A single room could show three of them.
- The character sheet was nine equal-weight cells. Oxygen, the thing that
  actually kills you, looked the same as the "advancements" counter.
- Seven panels competed for space: tracker, text, doors, actions, inventory,
  records and log. On a phone, the button you needed was often below the fold.
- Icons and sounds came from third-party CDNs. When a font failed to load,
  every icon showed up as its raw name ("favorite", "expand_more").
- Many items said "ready when a rule calls for it" and never did anything.
  About a third of the item text had no effect in the game.
- Reloading the page (which phones do whenever you switch apps) lost the run.

**Boring**

- Six room types, and four of them played out without a decision.
- A run had no shape. The target turned up on a random room after the sixth,
  so runs either dragged or ended suddenly.
- Shops sold the entire catalogue every time. Nothing was scarce, so nothing
  was exciting.
- Most item and enemy "specials" were hidden flavour. Fights against
  different enemies felt the same.
- Auto-explore and auto-battle existed. That's usually a sign the manual loop
  isn't worth playing.

## Principles

1. **Every tap is a decision or a payoff.** No confirm dialogs and no "continue"
   screens between rooms. The outcome of a room shows on the same screen as the
   next set of doors.
2. **Telegraph, then let the player bet.** Doors show what kind of room lies
   behind them, enemies show their next move, and test buttons show the odds.
   Randomness is the opponent. The player shouldn't have to guess hidden rules.
3. **One clock.** Oxygen pays for every room and every push. The tension
   between diving deeper and getting out is the whole game.
4. **Rules live on the thing.** Every item, enemy trait, relic and advancement
   does exactly what its text says, and the text sits on the button or card.
5. **Short, spiky runs.** Three depths, a boss, an escape. About 10 minutes
   from start to death or extraction. Death is quick and goes in the Graveyard
   (Mörk Borg). Then you go again.
6. **Variety from combinations.** There are 6 backgrounds, 20 events, 15
   enemies, 3 bosses, 4 elite affixes, 30+ items, 10 relics and 15 drafted
   advancements. Builds come out of how these combine.
7. **Phone first.** Choices sit in the thumb zone. Status is readable at a
   glance. The run autosaves after every action, and the game works offline.

## The loop

```
Pick background (1 of 3) ─► Depth 1 ─► Depth 2 ─► Depth 3 ─► Vault boss ─► Target
                              ▲  doors → room → doors …           │
                              └──── Extract (any time) ◄──────────┘
```

- **Doors.** Each room offers 2–3 doors, and each door shows its category:
  *Threat*, *Marked* (elite), *Salvage*, *Strange*, *Shrine*, *Peddler*,
  *Dark* (unknown, +1 XP) or *Lift* (go deeper). The exact contents are
  rolled in advance, so a scanner or relic can reveal them.
- **Depths.** After 3 rooms on a depth a Lift may appear. After 5 rooms it is
  guaranteed. Depth 3 ends at the Vault, where a boss guards the mission
  target.
- **Greed.** Once you hold the target, every credit you find is doubled. The
  mission twist keeps pressing on you meanwhile. Extract now, or one more room?
- **Extraction.** You climb one depth at a time. Each climb costs 2 O2 and
  needs a d6 roll of 4 or more, with modifiers. A failed roll draws from the
  complication table, and one result is a fight. You can also abort and
  extract without the target: you survive, but there's no payout.

## Core rules

- **Pools:** Body, Mind, Soul. If any of them reaches 0, you die. **Oxygen**
  is the clock. When it runs out, those costs are paid in Body.
- **Tests:** roll a d6 and meet or beat a target set by the tested pool's
  *current* value: 13+ → 2, 9–12 → 3, 5–8 → 4, 1–4 → 5. Wounds make you worse
  at everything. If a test misses by exactly 1, you may **push** it with
  1 Oxygen.
- **Combat:** the enemy telegraphs **Strike**, **Charge** (+2 damage, but
  easier to hit) or **Guard** (half damage, soaks 2 of yours). You answer
  with **Attack**, **Push** (1 O2: +1 to hit, +2 damage, breaks a guard),
  **Brace** (blocks a Strike, turns a Charge into 1 damage), an **Item**, or
  **Flee** (take a hit and go back to pick another door). A natural 6 is a
  crit (+2 damage). A natural 1 always misses.
- **Routed damage:** every enemy hits one pool. Each suit protects a different
  pool, so the suit you wear is a real choice.
- **Pack:** 8 slots. Each item over the limit makes every room cost +1 O2.
- **Advancement:** XP from rooms, kills and events. When the bar fills you
  draft 1 of 3 advancements.

## Meta

- **Graveyard:** every dead or retired character, with cause, depth and score.
- **Records:** small achievements that persist between runs.
- **Daily Descent:** a seeded run that's the same for everyone that day, with a
  shareable result line.
