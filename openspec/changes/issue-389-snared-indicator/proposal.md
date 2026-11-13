# Proposal

## Why

Frost Snare restricts movement but its board feedback disappears after casting.
Players need to recognize the affected enemy throughout the effect's lifetime (#389).

## What Changes

- Add a persistent snowflake badge using Guarded's existing board treatment.
- Derive it from the presented active effect, including expiry, defeat and resume.
- Verify readable desktop/mobile geometry and the real cast/save lifecycle.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `battle-controls`: persistent, state-derived Snared feedback on the board.

## Impact

Production scope is `src/phaser/BoardRenderer.ts`; reuse existing effects, scene
ownership, vector drawing, placement and diagnostics. Extend existing dungeon and
ability-picker browser tests and signature-ability docs. No dependency, domain,
storage, asset or deployment changes. One focused PR completes all issue criteria.
