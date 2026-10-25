# Proposal

## Why

Fighter progression unlocks no new actions after Guarded Strike. Issue #163 requires the approved level-2 Second Wind and level-3 Taunt through combat, accessible controls and persistent encounters.

## What Changes

- Add validated self-heal and hostile Taunt profiles, canonical unlocks, atomic action/use spending and target-turn expiry.
- Enforce forced offensive targeting in previews, resolution and deterministic enemy planning.
- Expose healing, remaining use, source and expiry in the existing picker, inspection and event feedback.
- **BREAKING**: version battle/rules and run/dungeon saves; preserve incompatible bytes through existing recovery. Admit bounded healing above encounter-entry HP.
- Preserve direct HUD confirmation, Guarded shield/−2 attack/+2 AC and Magic Missile behavior.

## Capabilities

### New Capabilities

- `fighter-abilities`: progression-gated Second Wind and Taunt, lifecycle, feedback and durable encounter behavior.

### Modified Capabilities

None. Existing session, controls and enemy-turn requirements remain intact; the new capability specifies their additional Fighter behavior.

## Impact

Content validation; pure combat/state/turn/AI rules; session previews; shared Phaser/DOM feedback; run/dungeon save admission and identities; existing unit and browser consumers. No dependencies, assets, engine changes, deployment or merge.
