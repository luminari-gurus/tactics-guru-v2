# Proposal

## Why

[#58](https://github.com/luminari-gurus/tactics-guru-v2/issues/58) needs a bounded save contract before storage and resume integration can be implemented coherently. Its explicitly permitted schema investigation can reuse the merged deterministic domain without physical iOS access.

## What Changes

- Compare snapshot and accepted-command replay representations on deterministic normal and maximum-bound fixtures; retain measurements and choose one.
- Define independent save-format identity/version, rules/content/RNG compatibility, bounded payload and canonical integrity digest.
- Add a pure encoder/decoder prototype with non-destructive rejection and deterministic continuation fixtures, unused by live game UI.
- Document the storage/session/UI/device acceptance left in #58; do not claim full save/resume completion.

## Capabilities

### New Capabilities

- `battle-save-envelope`: a bounded serialized battle contract with compatible-version validation, corruption detection and deterministic state reconstruction.

### Modified Capabilities

None. The main spec inventory is empty.

## Impact

Expected implementation: `src/domain/saveEnvelope.ts`, focused unit fixtures, a small comparison harness, format documentation and raw measurement evidence. Reuse existing validators, hashing and replay. No new dependency, runtime storage, live session restore, UI, deployment or device certification.

Issue: [#69](https://github.com/luminari-gurus/tactics-guru-v2/issues/69), a native child of #58, assigned to `moshehbenavraham`. Base: main `e955e9d9f182a76f057ea69057c7a1ac6c0bd682`. Branch: `work/issue-69-save-envelope`. See [plan](../../../docs/ongoing-projects/battle-save-envelope/plan.md) and [issue acceptance](../../../docs/ongoing-projects/battle-save-envelope/issue.md). The user authorized implementation on 2026-10-11; see tasks for verified progress.
