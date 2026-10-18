# Proposal

## Why

PR #131's reviewed runtime has three verified save-recovery defects: explicitly unsaved play can overwrite newly readable saves, dialog exits leave a stale Continue binding, and starting after deleting both slots republishes the old active run.

## What Changes

- Keep explicitly unsaved play from writing until a reviewed Continue or replacement succeeds.
- Refresh startup controls after cancellation, Escape and export, with visible recovery for rejected Continue.
- Construct a fresh identity/next seed after deletion of previously loaded saves while retaining seed 13 on the first launch.

## Capabilities

### Modified Capabilities

- `authored-run`: extend the existing in-flight capability from `issue-80-run-progression` with explicit unsaved ownership and startup recovery scenarios. Its earlier requirements remain intact.

## Impact

Only the run controller/startup path, their existing unit/browser tests and OpenSpec/QA evidence change. No save-format, combat, design-guide, dependency or production configuration changes. Carry this focused repair into the dependent performance stack without copying the design-guide changes.
