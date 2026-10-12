# Proposal

## Why

The merged codec and guarded storage adapter do not yet save or resume a playable battle. [Issue #73](https://github.com/luminari-gurus/tactics-guru-v2/issues/73), under [#58](https://github.com/luminari-gurus/tactics-guru-v2/issues/58), connects those accepted contracts to the session and controls, supplying prerequisites for #74, #79 and #80.

## What Changes

- Hydrate a session only from a fully validated snapshot, preserving committed state, next RNG and enemy continuation without historical presentation.
- Save each accepted player/enemy command before its presentation, with visible nonfatal failures and preserved recovery bytes.
- Add accessible Continue, New battle, backup recovery, raw export and explicitly confirmed reset through the existing DOM/modal ownership model.
- Route all battle restart paths through guarded invalidation. Transition to a fresh seed only after both old slots are confirmed absent; failed invalidation retains the current session and presents retry/recovery.
- Distinguish complete fresh-session replay from resumed-session diagnostics: a restored snapshot is not a seed-created replay initial state.

## Capabilities

### New Capabilities

- `battle-persistence`: Live autosave, validated continuation, recovery controls and safe persistent battle replacement, composing the existing codec/storage contracts.

### Modified Capabilities

- `battle-session`: Define resumed-session recording and make fresh restart conditional on successful old-save invalidation.
- `battle-controls`: Make restart an accessible request during presentation while allowing a persistence failure to prevent a destructive transition.

## Impact

Primary boundaries: `src/app/BattleSession.ts`, a focused app-level persistence coordinator, `src/phaser/BattleScene.ts`, `src/phaser/start.ts`, `src/main.ts`, `src/ui/dialogs.ts`, `src/ui/hud.ts`, and related HTML/styles. Reuse `src/domain/saveEnvelope.ts`, `src/persistence/battleStorage.ts`, deterministic dispatch and `tests/helpers/saveFixtures.ts`; introduce no alternate serializer, storage namespace or simulation. Extend session/unit tests and real-control browser coverage, then run configured checks.

Base: `main` at `3f3792025f29716c977cbdebff9d1c94b750ec3c`. Planned branch: `branch/issue-73-battle-resume`; owner: `moshehbenavraham`. Prerequisites #69 and #72 are merged. #57 remains a release gate; #74 owns physical persistence certification. Android access is available locally; #73 requires no physical iOS acceptance. Exclude run/reward integration, legacy imports, multi-tab transactions, dependency upgrades, deployment, physical certification and closing parent epics. Implementation was authorized on 2026-10-12; the task checklist and active handoff record delivery progress.
