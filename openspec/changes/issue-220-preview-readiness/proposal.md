# Proposal

## Why

The local performance collector can reject usable preview output because its readiness gate parses formatted stdout. Its HTTP attempts and process cleanup are not fully bounded or awaited. Issue #220 requires reliable owned readiness and a retained isolated capture.

## What Changes

- Replace the stdout gate with a private Vite worker's awaited bind acknowledgement and bounded live-child HTTP checks.
- Retain bounded startup diagnostics and await graceful or forced cleanup of the exact owned child on success, failure and catchable interruption.
- Preserve remote mode, build/source provenance, port 4174, profiles and budgets; add focused lifecycle contracts and one production capture.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `battle-performance-evidence`: Require bounded owned preview startup and cleanup for local collection.

## Impact

Only `scripts/measure-fit.ts`, a private preview helper, focused tests and continuation/QA records. `verify-full.mjs` consumes the unchanged command; PR #209 remains independent. No application, dependency, browser configuration, full-regression, merge or production change. Detailed acceptance and ablation decisions remain in [the plan](../../../docs/ongoing-projects/plan.md).
