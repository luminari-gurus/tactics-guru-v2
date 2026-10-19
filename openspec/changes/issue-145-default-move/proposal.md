# Default Move selection

## Why

New player turns show movement range but require an extra Move click before choosing a destination. Issue #145 requests a once-per-turn UI default that preserves explicit choices and confirmation.

## What Changes

- Select Move on the first usable player decision of each turn when existing movement rules permit it.
- Preserve explicit selections, full cancellation and post-action clearing within that turn.
- Prove standalone, run, restart and Continue behavior through existing browser tests.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `battle-controls`: initialize the action once per player turn without executing gameplay.

## Impact

The shared BattleScene owns initialization. Existing HUD, domain rules, persistence and replay remain authoritative. No new dependencies, assets or save fields. The detailed acceptance map and handoff remain in `docs/ongoing-projects/plan.md`.
