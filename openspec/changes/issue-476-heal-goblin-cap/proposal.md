# Proposal

## Why

Repeated Heal Goblin casts can undo player progress for many turns in a floor-one Elite battle (#418). Issue #476 gives players a finite budget they can see and plan around.

## What Changes

- Each Shaman in a newly entered dungeon battle has two successful casts. Inspection shows that unit’s remaining count.
- The shared action preview excludes exhausted healing. A successful cast spends one use along with its usual action.
- Save/Continue and replay preserve the active battle’s healing rule and counts. Pre-change records retain unlimited healing.

## Capabilities

### New Capabilities

- dungeon-shaman-healing covers per-battle counters and backward-compatible continuation for dungeon Shamans.

## Impact

Dungeon battle entry, battle state validation, support actions, enemy inspection, save admission, and focused compatibility and legal-battle verification.
