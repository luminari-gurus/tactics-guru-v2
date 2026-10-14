# Proposal

## Why

On main `d2a1a61`, Move → target → Review → Escape leaves keyboard focus on BODY. The dialog restores focus to Review before the cancellation callback disables it. This was reproduced while designing #108 and violates the existing usable-focus-return contract.

## What Changes

- Restore focus after synchronous dialog callbacks settle; use the existing Restart fallback when the original invoker is disabled or gone.
- Preserve focus inside a replacement modal opened by the callback.
- Extend existing battle-loop and persistence browser assertions; keep this fix independent of design PR #112 and runtime redesign #111.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `battle-controls`: clarify usable focus after callbacks disable an invoker or open a replacement modal.

## Impact

`src/ui/dialogs.ts`, existing `tests/battle-loop.spec.ts` and `tests/battle-persistence.spec.ts`, OpenSpec and focused QA evidence. No combat, persistence, animation, art, dependencies, HUD redesign or deployment change. User authorization explicitly includes autonomous repair of issues found during #108.
