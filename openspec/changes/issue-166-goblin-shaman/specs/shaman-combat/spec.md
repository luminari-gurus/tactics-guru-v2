## Purpose

Provide source-backed Goblin Shaman support combat with consistent legal targeting,
deterministic saves and healing, visible feedback and exact saved continuation.

## ADDED Requirements

### Requirement: Validated Shaman content and bounded placement
The system SHALL validate the Shaman's stats, source-pinned assets and three abilities. Dungeon Forest Ruins SHALL replace grunt spawn 6 with one Shaman while preserving other spawn identities and coordinates. Standalone, authored-run and desert rosters SHALL remain unchanged.

#### Scenario: Source-backed actor
- **WHEN** the Shaman catalog is admitted
- **THEN** its baseline HP/move/jump/accuracy/AC/power/Dexterity/Will are 10/4/1/3/11/2/1/3, with Basic Attack, Weakening Hex and Heal Goblin and bounded image provenance/exports

#### Scenario: Deterministic encounter
- **WHEN** equivalent dungeon seeds select Forest Ruins
- **THEN** the same legal composition is selected without changing map-selection RNG, including all supported living-party subsets

### Requirement: Exact Will save and Weakened
Weakening Hex SHALL target a living hostile at Manhattan range 2–4 with clear LOS. After complete preflight it SHALL draw one d20; d20 plus target Will at least 10 plus projected caster power saves, with no automatic natural outcomes. Failure SHALL apply accuracy −2 once through the target's next accepted turn end.

#### Scenario: All save faces and projection
- **WHEN** any of the twenty faces resolves against projected caster and target stats
- **THEN** the displayed chance and result match the exact arithmetic, equality saves and natural 1/20 obey the same arithmetic

#### Scenario: Refresh, expiry and defeat
- **WHEN** Hex fails against an already Weakened target
- **THEN** its one source is refreshed/replaced without stacking; a saved cast preserves an existing effect, target turn end expires it, and source or target defeat clears it

#### Scenario: Modifier isolation and immunity
- **WHEN** a target is Weakened or has validated weakened/debuff immunity
- **THEN** only attack accuracy changes, combines once with Guarded/Mark, and leaves automatic Magic Missile, Will, AC and movement unchanged; an immune Hex rejects atomically before spending or RNG

### Requirement: Bounded allied goblin healing
Heal Goblin SHALL heal a same-side living injured grunt, archer or Shaman at range 1–4 with clear LOS by min(4, missing projected HP), using one action and no RNG, extra cooldown or use pool. It SHALL reject self, full-health, dead, hostile and ineligible targets atomically.

#### Scenario: Partial and capped healing
- **WHEN** an eligible ally has missing HP
- **THEN** healing applies four or the smaller missing amount without reviving, exceeding max HP or consuming a Second Wind use

#### Scenario: Invalid cast
- **WHEN** range, LOS, ally filter, target, ownership, action or state validation fails for either support ability
- **THEN** state, events, command/action budgets and RNG remain unchanged

### Requirement: Honest feedback and exact continuation
The system SHALL expose support ability ranges, save chances/results and Weakened source/modifier/expiry in existing feedback. Active status SHALL survive reload/replay and reset at a new battle. Previous formats SHALL retain exportable incompatible bytes; healing SHALL not relax hero-entry HP admission.

#### Scenario: Real seeded battle
- **WHEN** the player enters the production dungeon Shaman composition through ordinary controls
- **THEN** useful Hex and ally healing, active Weakened reload, expiry and a legal terminal outcome are reachable, with accepted commands/events/RNG reproducing exact continuation on Chromium and WebKit desktop/portrait/landscape

#### Scenario: Forged or incompatible save
- **WHEN** a status references an invalid/dead/friendly/non-Shaman source, or saved versions are incompatible
- **THEN** admission rejects without silent migration/reset and original recovery bytes remain exportable
