# Hero progression delta

## Purpose

Provide bounded, deterministic hero advancement that survives encounter transitions and gives players consistent HP, learned actions and level feedback.

## ADDED Requirements

### Requirement: Bounded canonical progression
Heroes SHALL have validated level 1–5, cumulative XP 0–600, derived max HP and learned implemented abilities. Thresholds SHALL be 0/60/180/360/600. Max HP SHALL equal level-1 HP plus (level−1) times Fighter 6, Ranger 5 or Mage 4. Level and learned state SHALL agree with XP and definitions.

#### Scenario: Multi-level and capped award
- **WHEN** a living hero receives an award crossing several thresholds or exceeding 600 total XP
- **THEN** all crossed levels are applied once, XP saturates at 600, and further awards cannot increase level or HP

#### Scenario: Reject forged progression
- **WHEN** unknown data contains fractional, negative, oversized or inconsistent XP/level/HP/learned state
- **THEN** the state is rejected without mutation or RNG consumption

### Requirement: Exactly-once eligible victory awards
Accepted victories SHALL award living participants 30/55/70/90 XP for normal/elite/vault/boss encounters. Short-run encounters SHALL be normal/normal/boss. Defeated heroes and losses SHALL receive none. Crossing a level SHALL heal the living hero to new max HP. Awards SHALL occur once at battle completion, including final encounters.

#### Scenario: Repeated completion and restoration
- **WHEN** a completion callback repeats, a completed floor is revisited, a reward is claimed, or a completed boundary reloads
- **THEN** XP is not awarded again and battle RNG is unchanged

#### Scenario: Defeated party member
- **WHEN** surviving heroes win while another hero has zero HP
- **THEN** only survivors gain XP, zero HP remains zero, and no revival occurs

#### Scenario: Ordinary and terminal victories
- **WHEN** a short-run final victory or dungeon guardian victory completes
- **THEN** its boss award is applied despite having no following reward screen

### Requirement: Shared projection and learned actions
The system SHALL project progression before equipment from immutable baseline definitions, with unchanged non-HP level stats. Existing signatures SHALL remain available at level 1. Implemented class abilities SHALL use validated required levels and shared learned-state authority. Mage caster level SHALL equal hero level while preserving approved Magic Missile range, dice and missile-count rules.

#### Scenario: Repeated battle construction
- **WHEN** a progressed, equipped hero is reconstructed, inspected, resumed or replayed repeatedly
- **THEN** HP/abilities/caster level and equipment contributions remain identical without accumulating modifiers, and Guarded retains its existing behavior

#### Scenario: Ability boundary
- **WHEN** a hero crosses the required level of an implemented class ability
- **THEN** it becomes learned and selectable through the existing picker and authoritative command checks, while lower-level commands remain rejected

#### Scenario: Mage levels
- **WHEN** a Mage at levels 1, 3 or 5 uses Magic Missile
- **THEN** the existing formula yields 1, 2 or 3 missiles with existing per-missile rolled damage and no extra action

### Requirement: Progress persistence and safe incompatibility
Progression-bearing run and dungeon saves SHALL retain canonical XP, level, HP and learned state through encounter/floor travel, reload and terminal states. Invalid or older incompatible saves SHALL preserve original bytes and expose existing recovery/export controls. New runs SHALL start at level 1 with zero XP. Standalone battles SHALL retain level-1 behavior.

#### Scenario: Resume progressed battle
- **WHEN** a progressed hero resumes an active battle or its accepted-command record is replayed
- **THEN** the same projected catalog, state, events and RNG result are obtained without awarding or healing again

#### Scenario: Pre-progression save
- **WHEN** an older run/dungeon save is inspected
- **THEN** the UI identifies incompatibility, retains recovery/export, and does not overwrite it with a fresh game or fabricate historical XP

### Requirement: Understandable progression feedback
Players SHALL see each hero's level, XP toward the next level or cap, learned actions and max HP in run/dungeon party and inspection views. Accepted level-up feedback SHALL explain HP/healing and newly learned implemented actions. These views SHALL remain accessible on desktop and mobile portrait/landscape.

#### Scenario: Award feedback and reload
- **WHEN** a hero levels up and the player reloads or proceeds to the next encounter
- **THEN** stable party/inspection values agree with saved progression, while reload does not replay an award or activation
