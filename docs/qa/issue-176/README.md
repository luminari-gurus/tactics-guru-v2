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

## Increment 2 — authored recording (qualification pending)

Based on ready PR #359 at `7d73d35`. Focused local checks pass 43 units across
RunHistory, RunItemSession, runBattle and record model/storage, plus both type scopes.
New checks include exact terminal Continue, a staged valid victory continuation
(explicitly not earned-play proof), real accepted defeat, pending receipt before
replacement, accepted/canceled/stale/partial/racing replacement, interrupted intent
reconciliation and unavailable history that does not block the new game.

Browser discovery retains existing IDs and selects 27 Chromium + 18 WebKit cases:
records/menu/replacement; complete legal run outcomes and legal defeat; valid and
unavailable-storage isolation across all direct/diagnostic entries, now including
records keys and Q*bert. All five original storage-condition variants remain
configured. Browser execution is pending; task 2.2 remains unchecked.

Initial standard run [42826784671](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42826784671)
failed one of 1,269 units: the new terminal-Continue unit synthesized an entire
full-health defeat and exceeded the unchanged 5,000ms per-unit budget under the
full parallel unit load. Dependent build/browser stages did not run. Its report
is retained under `tmp/issue-176/run-42826784671/`; this failed run remains failed.
The unit now uses an explicitly staged, validated terminal snapshot and a distinct
valid backup. The real full-health/legal defeat still runs in existing browser
witnesses. No timeout, gameplay rule or assertion was relaxed.
The history observer was also simplified to notify only on a visible status
change, preserving active controls during successful receipt writes. Runs
42827503310 was canceled while queued for this runtime repair. Run 42826784471
finished before cancellation: it passed all 25 menu cases and 10/12 Chromium
run/isolation cases, but the two desktop isolation sweeps exceeded their unchanged
30-second case budget. WebKit outcome/isolation was blocked by that stage failure.
Adding Q*bert to the already long multi-route sweep caused the scope to outgrow
the budget. Q*bert is now a separate case group using the same complete storage
audit, all five existing conditions, real turn/restart, reload and menu checks.
Original journey case IDs/assertions and all deadlines remain. The focused
selection is now 33 Chromium + 22 WebKit cases. Runs 42828913970 and the superseded
queued capture are canceled for this test repair; failures/incomplete runs remain
retained rather than relabeled as passing. Fresh qualification is required.

## Increment 3 — dungeon recording (qualification pending)

Based on authored PR #360 at `9a2c326`, in its isolated dungeon worktree. The
dungeon owner records accepted defeat/terminal Continue and confirmed replacement
through the existing root-menu handoff and in-flow controls. No active-save format
or combat/RNG changes. Local focused checks pass 123 units across dungeon,
RunItemSession, runBattle, RunHistory and model/storage, plus both type scopes.

New session checks verify staged terminal admission and exact save bytes,
continued descent without a record, reviewed old identity versus a placeholder,
stale/partial reset, null-storage gating, history denial and an exploration race.
Staged unit fixtures are not earned-play proof.

Final browser discovery selects 73 cases: 21 Chromium + 14 WebKit menu cases;
24 Chromium cases for full legal dungeon defeat, full first floor/descent/return,
actual BFCache and testing isolation; six WebKit dungeon and eight WebKit isolation
cases. Unchanged authored long journeys are qualified separately on PR #360's
relevant inputs. No case timeout/retry change or hosted fallback is added.
Browser execution and final issue acceptance remain unverified until recorded.

A new real-owner failure regression initially failed: startup rendering re-inspects
the dungeon save, so a preparatory history-warning notification invalidated its
own reviewed replacement token. Preparatory status now updates quietly; the
existing save owner makes its decision before rendering that warning. The same
unit passes without changing deadlines, and the unavailable-history browser case
now drives two real root-menu New Games, verifying accepted new identity, saved
bytes and visible history failure. This is a required nonfatal-history repair.
