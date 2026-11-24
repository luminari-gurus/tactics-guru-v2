# Design

## Context

The existing [Shaman combat contract](../issue-166-goblin-shaman/specs/shaman-combat/spec.md) and shared support preview cover Heal Goblin for both dispatch and enemy planning. The dungeon snapshot owns ongoing combat state and the full replay retains its initial state.

## Decisions

- Store the bounded counter on each Shaman in the active snapshot. Its presence selects capped rules, including when the value is zero. Only new dungeon entry initializes it. This preserves old saves and replay start states without inferring uses from turn count.
- Validate the field in the shared battle reader. A capped roster has a count on every eligible Shaman. Dungeon transitions preserve the mode and can only spend counts. Standalone and authored-run save admission keeps its existing mode boundary.
- Apply exhaustion through the existing preview and spend through successful heal resolution. The AI already delegates both action selection and approach goals to that preview. The inspection dialog reads the same battle state.

## Compatibility

Capture a real pre-change save and replay and verify both against the final implementation. Clients from before #476 reject a capped active snapshot under their exact-shape reader. See the [handoff](../../../docs/ongoing-projects/plan.md) for proof and commands.
