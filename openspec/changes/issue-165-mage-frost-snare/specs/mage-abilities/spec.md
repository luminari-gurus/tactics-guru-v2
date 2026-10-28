# Mage abilities

## Purpose

Define the Mage's earned control spell and automatic missile attack, including shared movement blocking, honest feedback and deterministic continuation.

## ADDED Requirements

### Requirement: Consolidated automatic force attack

Magic Missile SHALL consolidate Arc Bolt, unlock at level 1, cost one action, automatically hit for seeded 1d4+1 force damage per missile at Manhattan range 1–5 with LOS, and use min(5, floor((casterLevel+1)/2)) missiles. Repeated targets and living allies SHALL remain legal; different targets MUST be pairwise within three tiles. Every target and die draw MUST preflight atomically.

#### Scenario: Earned missile progression
- **WHEN** the Mage advances through levels 1–5
- **THEN** missile counts are 1, 1, 2, 2, 3 with no separate Arc Bolt unlock

#### Scenario: Ordered resolution without attack rolls
- **WHEN** missiles are assigned, including overkill or multiple targets
- **THEN** each missile draws its own d4 in assigned order without d20/save/critical, retargeting or duplicate defeat; invalid targets or exhausted RNG reject the whole cast

### Requirement: Frost Snare eligibility

Frost Snare SHALL unlock for Mage at level 3 (180 XP), cost one action and target one living hostile at range 2–4 with LOS. It MUST cause no damage, roll, RNG draw, cooldown or battle-use expenditure and MUST preserve turn/movement budgets apart from its action. Both current goblin definitions SHALL be susceptible, with no invented immunity policy.

#### Scenario: Pure preview and atomic rejection
- **WHEN** previewing or rejecting a locked, wrong-owner, spent-action, wrong-side, absent, defeated, out-of-range or blocked-LOS cast
- **THEN** HP, budgets, commands, events and RNG remain unchanged

### Requirement: One shared movement block

Pin and Snare SHALL use one movement block per target with ability/source identity. Either cast against an existing block MUST reject before spending or drawing. Ordinary movement MUST reject and reachability MUST contain only the origin; legal attacks and Wait remain available. Mark MUST remain distinct and neither effect nor Magic Missile SHALL consume it.

#### Scenario: Cross-ability duplicate
- **WHEN** Pin or Snare targets an already Pinned or Snared creature
- **THEN** the cast rejects without stacking, replacement, refresh or extension

#### Scenario: Immobilized enemy turn
- **WHEN** a blocked enemy plans its turn
- **THEN** it attacks legally in place or Waits without moving

### Requirement: Exact block lifetime

A movement block SHALL expire after its target's next accepted endTurn or immediately upon source/target defeat from any damage path. Unrelated turns, round changes, range and LOS changes MUST NOT expire it. New battles MUST start without blocks.

#### Scenario: Target boundary after resume
- **WHEN** an active Snare is restored and unrelated turns finish before the target Waits
- **THEN** the block persists until the target's accepted endTurn and emits one ability-aware expiry event

#### Scenario: Defeated source or target
- **WHEN** ordinary damage or friendly/hostile missiles defeat either participant
- **THEN** the block clears immediately and the resulting state remains valid

### Requirement: Honest reachable controls

The existing HUD/picker SHALL expose the real earned Mage skills and gates with pure previews, keyboard/pointer/native-touch selection, cancel and confirmation. Preview, inspection and accepted feedback MUST distinguish Snared by Mage from Pinned by Ranger, identify no damage/roll and exact expiry, and emit no attack cue for effect-only casts even when audio is ready.

#### Scenario: Legal production journey
- **WHEN** a production dungeon party earns 180 XP through HUD commands
- **THEN** the Mage unlocks Snare, uses it and multi-missile Magic Missile, reloads during active Snare, demonstrates blocked movement/expiry and reaches a legal terminal outcome with exact continuation replay

### Requirement: Bounded versioned continuation

Saved movement blocks MUST admit only exact sourceId/abilityId records for living opposing participants and learned Pin/Ranger or Snare/Mage ownership. Battle state 4, rules 5, run envelope 6 and dungeon envelope 7 SHALL replace the previous formats. Earlier bytes MUST remain preserved/exportable without silent migration or rewriting.

#### Scenario: Roundtrip and forgery
- **WHEN** standalone, run or dungeon state contains a legitimate active block or a malformed, unsupported, missing, dead, wrong-class or locked source
- **THEN** legitimate state roundtrips with exact events/state/RNG replay and forged state rejects

#### Scenario: Previous format recovery
- **WHEN** exact-base state-3/rules-4 battle, run-5 or dungeon-6 bytes are inspected
- **THEN** they report incompatibility and preserve the original bytes for export/recovery
