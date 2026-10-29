# Proposal

## Why

Issue #165 needs a reachable level-3 Mage control spell and an explicit Arc Bolt adaptation. The existing Ranger movement block supplies the lifecycle, but its source and saved state are Ranger-specific.

## What Changes

- Consolidate Arc Bolt into the approved level-1 Magic Missile; preserve damage, range, count, spread and friendly targeting.
- Add level-3 Frost Snare, range 2–4, one hostile target, no damage or roll, through one shared Pin/Snare movement block.
- Reject duplicate movement blocks, expire on the target's accepted endTurn or source/target defeat, and retain useful in-place enemy attacks/Wait.
- Expose pure previews, gates, source-aware status and accepted feedback through the existing picker and HUD.
- **BREAKING**: replace pinnedBy with bounded sourceId/abilityId state; advance battle/rules/run/dungeon versions and retain earlier save bytes for recovery.

## Capabilities

### New Capabilities

- `mage-abilities`: Mage adaptation, shared immobilization integration, earned unlocks, continuation and feedback.

### Modified Capabilities

None. Existing general control/session contracts remain in force.

## Impact

Content definitions and validation, pure domain effects/combat/state/turns, save envelopes, HUD/presentation, existing unit/browser fixtures and rule documentation. No new dependency, assets, migration or effect framework. The detailed acceptance mapping and source-grounded file sequence remain in docs/ongoing-projects/plan.md.
