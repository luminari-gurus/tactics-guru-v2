# Proposal

## Why

Issue #166 adds the legacy Goblin Shaman as the first enemy support caster. Its
reviewed plan supplies the bounded Will-save, healing and accuracy-debuff consumer
needed by #161 without taking over that issue's broader effect work.

## What Changes

- Add validated, source-pinned Shaman stats and artwork, Basic Attack, Weakening
  Hex and Heal Goblin; enable one dungeon Forest Ruins composition while keeping
  standalone, authored-run and desert rosters unchanged.
- Share pure save/heal previews with atomic resolution and deterministic enemy AI.
- Show save chances/results, healing and Weakened duration/modifiers through the
  existing inspection, log and animation surfaces.
- **BREAKING** Advance state/rules/run/dungeon versions for bounded Weakened state
  and changed enemy decisions; retain incompatible saved bytes for export.
- Prove negative targeting, complete legal seeded battle, reload and replay;
  retain full qualification and handoff evidence under the verification policy.

## Capabilities

### New Capabilities

- `shaman-combat`: Source-backed Shaman content, saves, Weakened, healing,
  presentation and persistence contracts.

### Modified Capabilities

- `enemy-turns`: Select useful legal support abilities against ordinary attacks
  with stable ordering, legal approach movement and unchanged ordinary enemies.

## Impact

Content catalogs/assets and validators; domain combat/effects/turns/AI/admission;
run/dungeon envelopes and encounter selection; existing Phaser/DOM feedback;
unit, session and browser tests and current rule/QA documentation. No new
dependencies, generation, save migration, deployment or merge.
