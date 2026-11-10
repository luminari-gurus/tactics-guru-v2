# Issue #176 verification

Issue: [#176](https://github.com/luminari-gurus/tactics-guru-v2/issues/176).
Plan: [implementation and continuation](../../ongoing-projects/plan.md).
Base: `491f92a080d8577aca882c3e48ddaf910cf30369`; planning commit `0f1c2e9`.

## Increment 1 — model, storage and menu

Implemented and verified in [PR #359](https://github.com/luminari-gurus/tactics-guru-v2/pull/359).
No automatic journey recording exists yet and no full-issue completion is claimed.

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

## Self-hosted qualification

Head `35cb55dc9e50d4aaade5ee7bfd3ec098c3bf2248`, clean tested merge
`c241544dcf4d09519a42117a641c2f2613ef9977`. The merge runtime/test/config tree equals
the head tree; the handoff update changes documentation/task status only.

- [PR verification 42824142789](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42824142789): all six stages passed, 1,257 units with none pending/failed, both type scopes, both build integrations, production bundle and **7/7 core journeys**, zero skips/retries/flakes.
- [Records qualification 42824143064](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42824143064): **12 Chromium + 8 WebKit passed**, zero skips/retries/flakes. Node 24.22.2 on qualified `unraid-tactics-02`, workers 1. The focused browser phases took 16.72s and 17.60s.
- Desktop/Pixel portrait/landscape recovery screenshots inspected: readable wrapping, no horizontal clipping, accessible vertically scrolling dialog. Real keyboard/touch export, restore/reset and exact active-save preservation passed. WebKit portrait/landscape passed the same functional checks.
- [Portable receipt](increment-1.json) retains source/input identity, stages, exact case IDs/attempts and raw-report SHA-256. Full source/browser/environment reports and images were downloaded under ignored `tmp/issue-176/run-<run-id>/`; original workflow artifacts have 14-day retention.

Tasks 1.1–1.4 are complete. Authored-run and dungeon lifecycle, route-history
isolation, replacements and complete legal outcomes belong to the next two
increments, with all original issue gates retained. No physical-device,
performance recertification, merge or production operation is claimed.
