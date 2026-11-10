# Issue #176 verification

Issue: [#176](https://github.com/luminari-gurus/tactics-guru-v2/issues/176).
Plan: [implementation and continuation](../../ongoing-projects/plan.md).
Base: `491f92a080d8577aca882c3e48ddaf910cf30369`; planning commit `0f1c2e9`.

## Increment 1 — model, storage and menu

Implemented and locally checked; browser qualification is pending. No automatic
journey recording exists yet and no full-issue completion is claimed.

Local Windows x64 / Node 24.22.1, using the existing platform-specific install:

- `node node_modules/vitest/vitest.mjs run tests/unit/runRecords.test.ts tests/unit/runRecordsStorage.test.ts tests/unit/menuSaves.test.ts`: **21 passed**.
- `node node_modules/typescript/bin/tsc --noEmit`: passed.
- `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.domain.json`: passed.
- Explicit discovery of the three new records cases: 9 Chromium and 6 WebKit
  selections. Qualification additionally includes the existing read-only menu,
  artwork/loading, Settings and dialog-focus witness (three Chromium/two WebKit).
- `git diff --check`: passed.

The initial unit iteration retained one failed test assumption: Node 24's navigator
already exposes Web Locks. Missing browser-lock coverage now explicitly stubs
navigator instead of depending on the host. One staged terminal fixture's union
discriminator was corrected for the root typecheck. Focused reruns pass.
Windows npm shell wrappers are unavailable in the current runtime, and this
node_modules tree contains Windows native TypeScript packages; direct Node entry
points supply the local checks. Authoritative build/PR/browser verification runs
on the qualified Linux self-hosted VM with its own locked install.

## Evidence still required

Standard `verify:pr` plus the scoped records workflow, source-bound reports and
screenshots, and visual review of desktop/touch portrait/landscape. Tasks 1.3/1.4
are unchecked until this evidence passes. Authored-run and dungeon lifecycle,
route-history isolation, replacements and complete legal outcomes belong to the
next two increments, with all original issue gates retained. No physical-device,
performance recertification, merge or production operation is claimed.
