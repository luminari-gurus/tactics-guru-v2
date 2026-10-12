# Issue #72: guarded battle storage verification

Status: focused verification complete; full configured validation pending. Date: 2026-10-12. Branch: `branch/issue-72-battle-storage`. Implementation uses the [approved plan](../ongoing-projects/issue-72-battle-storage/plan.md), [API contract](../battle-storage.md) and OpenSpec `issue-72-battle-storage`.

## Scope and source

The user authorized implementation after the six-file planning commit `d602d82`. Documentation-only main `5d83514` was merged as `736ffa7` without conflicts. The adapter uses the unchanged #69 codec and existing accepted-boundary fixtures. No live session/UI storage wiring, gameplay changes, dependency upgrade or deployment is part of #72.

Host: Windows, Node `v24.19.0`; configured browser checks will use installed Microsoft Edge `155.0.4283.45`, one worker, desktop/Pixel 7 portrait/915x412 landscape. Mobile profiles are emulation. Local physical capability is Android only; no physical-device check is required or claimed for this child.

The host lacks npm on PATH. An ignored `tmp/tools/npm.cmd` invokes the existing npm CLI with the bundled Node executable, and its directory is prepended to PATH. This runs the repository scripts unchanged, including nested build/preview scripts. No package or lockfile edit is needed; `npm ci --no-audit --no-fund` installed the locked dependencies.

## Focused proof

`npm run test:unit -- tests/unit/battleStorage.test.ts tests/unit/saveEnvelope.test.ts tests/unit/domainBoundary.test.ts`: 85 passed. `npm run typecheck`: both project and DOM-free domain builds passed. The first focused run passed 83 tests but its subsequent typecheck exposed a tuple-union `indexOf` type error in the new test; replacing it with `findIndex` corrected the test typing. Two further API-boundary tests increased focused coverage to 85; the final focused run and typechecks pass.

Coverage uses the real codec/catalog and observable storage effects:

- All 16 missing/valid/invalid/unreadable primary/backup combinations, primary precedence, valid backup fallback and zero mutation on load.
- Every codec failure category, version mismatch and oversized text retained exactly in either slot; invalid input is rejected before storage acquisition.
- Fresh write preflight, preservation of invalid primary/backup, existing-primary, primary-only, backup-only and empty-store write cases. Each write can fail; each between-operation snapshot is loaded independently to model interruption without relying on a rollback path.
- Acquisition/read/write/remove failures, quota/security/unknown errors, property accessors, default browser-provider method receivers, no-window/unavailable storage and namespace restrictions.
- Explicit single-slot removal, expected-absence idempotence, stale inspection, raw retention on failures and partial two-slot removal without a false reset-success claim.
- Shared player/enemy/guarded/ended/maximum-command fixtures, exact decoded state, next RNG, enemy plan and next command result, plus frozen caller state/catalog through failures.

## Limits

Injected storage effects prove the adapter policy under the documented single-writer/per-operation assumptions. They do not certify native browser disk durability, eviction behavior, live autosave/resume, cross-tab serialization or physical lifecycle. #73/#74 and parents #58/#57 remain open. Full browser checks protect existing game behavior; they cannot make an unused adapter into live persistence.
