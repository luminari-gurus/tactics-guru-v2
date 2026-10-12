# Issue #72: guarded battle storage verification

Status: [PR #91](https://github.com/luminari-gurus/tactics-guru-v2/pull/91) merged into main as `3e7bf08600c59a09a0f9c37f3c81c7c07b3a6954`; #72 completed. Date: 2026-10-12. Implementation branch: `branch/issue-72-battle-storage`. Implementation uses the [approved plan](../ongoing-projects/issue-72-battle-storage/plan.md), [API contract](../battle-storage.md) and OpenSpec `issue-72-battle-storage`.

## Merge verification — 2026-10-12

The conflict-free merge preserves all five PR commits and exactly matches reviewed head `6124ecb55e6ccbb584832602feefbd078bdcbfba` (tree `543bbd98e219c7543b083c19baa9d3845bd0513e`). Fresh unit checks 372/372, content checks 77/77, both typechecks, production build, strict OpenSpec and whitespace checks passed. With npm absent from PATH, equivalent installed Vitest/TypeScript/Vite CLI entrypoints ran directly through Node; an ignored node_modules junction reused the implementation worktree's dependencies. No dependency/configuration change was made. The existing chunk-size warning remains.

The retained 225-case browser run below was verified to contain 225 unique first-attempt passing cases; all five source blob identities match the merged head, and all differences since its tested commit are documentation/evidence. Browsers were not rerun in this merge session. The exact-head [adversarial review](https://github.com/luminari-gurus/tactics-guru-v2/pull/91#issuecomment-6127561576) reported no substantiated findings. See the [merge record](issue-72/merge-validation.json) and [next-session handoff](../ongoing-projects/plan.md). No live persistence, physical certification or deployed-main check was performed.

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

## Configured verification

Committed implementation: `df1159f`. `npm run test:unit`: 372 passed across 28 files, including 56 new adapter tests. `npm run validate:content`: 77 passed. `npm run build` ran both typechecks and produced the preview build successfully from that clean commit. The existing Vite large-chunk warning remains; no new runtime import wires this adapter into the shipped battle entrypoint.

`npm test -- --reporter=line,json`: **225/225 passed in 12.3 minutes**, with 75 desktop, 75 portrait and 75 landscape cases, zero skips, zero unexpected results, zero flaky results and no suite errors. Every case passed on its first attempt. The repository configuration, normal timeouts and one worker were retained. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` selected installed Edge; no configuration or expectation was weakened. The [retained validation record](issue-72/validation.json) contains source commit/blob identities and every browser case/result. Final documentation-only commits do not change the tested source, tests, package lock or browser configuration.

Strict OpenSpec and diff whitespace validation passed. All relative links in the changed Markdown resolve. The existing Vite chunk-size and Playwright NO_COLOR/FORCE_COLOR warnings are nonfatal and unchanged in scope. Application checks were run locally; no remote CI, deployment or physical-device result is inferred.

## Issue acceptance mapping

1. Accepted bounded codec and validated primary/backup: implemented by adapter inspection and save preflight; the 16-case selection matrix, codec rejection cases and shared continuation fixtures prove the adapter boundary. The pure codec is unchanged.
2. Interrupted-write ordering and last validated save: existing-primary, primary-only, backup-only and first-save cases exercise every write failure and each between-operation snapshot. No invalid primary is copied over backup; failed backup preservation prevents primary replacement.
3. Guarded nonfatal storage: acquisition, property/method access and every read/write/remove return typed failures. Frozen caller state/catalog and deterministic continuation remain unchanged. Later UI status rendering is #73.
4. Namespaced keys and raw preservation: only the two fixed keys are used; unknown removal slots are rejected before access. Exact invalid/oversized/incompatible text remains in place and accessible via inspection. Explicit removal retains prior text on errors and detects stale values.
5. Failure/recovery tests and limits: the API guide specifies precedence, ordering, partial reset, origin/private-mode/quota/eviction and concurrency limits. Focused checks and the configured checks above provide the bounded evidence; physical acceptance remains outside this child.

## Limits

Injected storage effects prove the adapter policy under the documented single-writer/per-operation assumptions. They do not certify native browser disk durability, eviction behavior, live autosave/resume, cross-tab serialization or physical lifecycle. #73/#74 and parents #58/#57 remain open. Full browser checks protect existing game behavior; they cannot make an unused adapter into live persistence.
