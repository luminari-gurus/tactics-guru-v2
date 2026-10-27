# Issue #164 qualification

Status: implementation is published; final regression is running. This report is
a continuation checkpoint, not a claim of PR readiness.

## Source and scope

- Issue: [#164](https://github.com/luminari-gurus/tactics-guru-v2/issues/164).
- Approved [implementation plan](../../ongoing-projects/plan.md).
- Runtime/test implementation: `af9c1b60bab2c19c1abf8f08dc26ea32e0b461f3`.
- Full regression source: `789161cc2efcb4c7dd9034b524d0e799bc27644b` (same runtime
  and tests; adds the task-local WSL bind adapter).
- Branch: `branch/issue-164-ranger-abilities`. Main's documentation-only
  `b629926` update was integrated before implementation.
- State/rules versions 3/4; run envelope 5; dungeon envelope 6. Standalone wrapper
  and RNG remain 1. Incompatible saves retain original recovery/export bytes.

The implementation uses two bounded source references, the existing command and
preview paths, origin-only Pin movement and the existing picker/feedback. It adds
no status framework, dependencies, assets, immunity catalog or new AI planner.
The old Fighter QA trace remains immutable; the automatic-stairs test now creates
its legal healed-party fixture under current rules instead of reading an obsolete
wire format as current data.

## Iteration evidence

Raw Windows receipts are in ignored `tmp/issue-164/` in this managed worktree.
They predate the final clean-source Linux run and are iteration evidence:

Fourteen compressed logs/reports and the complete desktop journey trace are
retained in [iteration/manifest.json](iteration/manifest.json), with raw and
compressed SHA-256 hashes. Their failed attempts remain failed.

- Both TypeScript scopes passed; standalone build passed all 221 content checks.
  The catalog identity snapshot was deliberately updated for the two new profiles;
  fixed authored-map fingerprints are unchanged.
- All 986 unit tests in 55 files passed. New cases cover level gates, both current
  susceptible enemies, valid/invalid sources, pure preview/cancel, replacement and
  simultaneous effects, natural rolls/misses, automatic multi-missiles, exhausted
  RNG, source/target defeat, Pin movement/AI/expiry, replay and all save routes.
- Ranger picker selection: 12/12 Chromium cases passed across desktop, Pixel
  portrait and Pixel landscape, including the retained later-ability case.
  Screenshot review confirmed readable wrapped status/inspection and usable
  controls. The narrow scroller screenshots record the actual scrolled viewport.
- Complete production HUD journey: five encounters, 338 combat commands, earned
  Ranger level 3 (205 XP), both controls used and reloaded, Mark consumed by a
  player attack roll, terminal defeat. The final state and each recorded
  continuation replay match the legal pure witness. No edited progression/save
  boundary manufactures those unlocks. Trace:
  `tmp/issue-164/ranger-journey-consumption-artifacts/`.

Failures are retained: the initial domain fixture omitted the sixth spawn;
the LOS fixture placed a living unit on blocked terrain; the first content build
caught the expected changed catalog fingerprint; the first UI journey reached
both unlocks/defeat but a missile killed the marked enemy before consumption,
so its consumption assertion failed. The legal test policy was corrected and
rerun. The initial Windows build also lacked npm on the nested script PATH;
the supported local wrapper directory fixed that environment error.

## Final regression in progress

Linux checkout: `/tmp/tactics-issue-164-20261027` in WSL Ubuntu, clean at the
recorded full-run source. Node 24.15.0, npm 12.0.2, Playwright 1.63.0,
Chromium 153.0.8010.12 and WebKit 26.6. Both engines launched successfully;
their actual Phaser boot/resize smoke tests passed (2/2).

This host rejects a loopback-specific bind on port 4173 despite no visible
listener; a wildcard bind on the same port succeeds. Two failed smoke startup
attempts are retained. The opt-in [adapter](wsl-vite-bind.cjs) changes only the
Vite CLI's listen host to `0.0.0.0`; browser URLs remain `127.0.0.1:4173`.
It does not enable server reuse or change assertions, retries or device settings.
The full process inherited `TACTICS_WSL_VITE_BIND=1` and `NODE_OPTIONS` requiring
the identical adapter in the Windows worktree through `/mnt/c/`.

Command: `npm run verify:full`, one browser worker and serial stages. The live
19-stage checkpoint and raw logs/reports are retained at:
`/tmp/tactics-issue-164-20261027/tmp/verification/full-2026-10-27T11-14-39.281Z-2506569/`.
The parent command is the unified-exec session recorded in this chat. Do not
restart it merely because observation times out; inspect that session/process and
the summary first.

The first tooling stage failed because the adapter attempted to resolve an
argument of a `node -e` subprocess as a file. Units, both type scopes and both
build integrations passed afterward; runtime browser stages continue independently.
Do not edit the adapter while this run is live (it is loaded from the Windows
worktree). After completion, guard the realpath lookup by a Vite filename check,
prove the affected tooling and actual Vite boot, and retain this failed aggregate
separately from that recovery. Do not repeat successful suites solely to obtain
a green aggregate.

The correction is isolated in ignored `tmp/issue-164/wsl-vite-bind-fixed.cjs`
without editing the adapter used by the live run. It adds a Vite-filename guard
before realpath lookup. With that candidate loaded, `test:verification` passes
10/10, `test:verification-tooling` passes 20/20 and `test:verification-batches`
passes 27/27. [Retained candidate receipts](tooling-candidate/manifest.json) bind
the module bytes and command results. Application of the same bytes and actual
Vite/engine smoke remain pending until the live browser run completes.

Current discovery: 718 default Chromium, 81 combined fixtures, 3 dev placement,
54 WebKit acceptance, 81 WebKit exploration, 25 health bars, 36 each configured
telemetry mode and 69 each explicit root-dev/prefix asset selection. The three
new default Ranger journey selections and nine fixture selections are additions;
existing test titles/projects/config filters are retained. Additional Ranger
fixture WebKit discovery uses [webkit-fixtures.config.ts](webkit-fixtures.config.ts)
and selects 12 cases without changing the default full matrix.

Completed original components are retained in
[full-run-original/completed-components.json](full-run-original/completed-components.json):
Chromium accounts for all 718 IDs, with 710 passes, five failures, three skips
and zero retries/flaky results. The three dev-only placement selections are
separately covered by the passing 3/3 dev stage. Combined fixtures pass 81/81;
WebKit acceptance passes 54/54. Remaining stages are still running.

The five Chromium failures are preserved, not yet dispositioned:

- Native movement destination clearing remains `presenting` after clock resume
  in desktop, portrait and landscape (three failures at battle-loop line 112).
- Portrait procedural-grid picking selects `(6,6)` for the hardcoded `(5,6)`
  click after resize (procedural-grids line 26).
- Landscape HTML5 audio permission/restart records no completed cue, with the
  bounded playback watchdog reporting timeout (battle-audio line 193).

A separate clean literal-base checkout at
`/tmp/tactics-issue-164-base-18a6f63`, source
`18a6f639ab6b5f5c25b9f46f65c7bcc9b733dce8`, has locked dependencies and a passing
build prepared. After the live run releases browser capacity, run only the
affected base/change cases under matching conditions to determine cause. No
pre-existing/flaky classification is claimed yet, and no assertions/timeouts or
retries have been weakened.

[Actual selection continuity](selection-continuity.json) compares the literal
pre-implementation `18a6f63` tree with the current tests. Every prior test ID and
its metadata, worker policy and effective projects is unchanged: default 715/715,
fixtures 72/72, exploration 78/78 and acceptance 54/54 retained. Added recovery
cases bring current selection to 727 default and 90 exploration; those nine
executions per matrix were added after the full-run freeze and require focused
follow-up. Compressed before/after discovery reports are linked by the summary.

Final acceptance still requires complete stage accounting, any focused failure
repairs, the additional WebKit picker run, explicit previous-format byte-preserving
browser recovery, screenshot/report retention, final source/input equivalence,
the requirement audit and PR creation. No full-regression pass, physical-device,
CI success, production deployment or comparable performance baseline is claimed.

Performance disposition must use `evaluateCapture` in
`scripts/measure-fit-evaluate.ts`, including every row's violations and repeated
slow-load disposition. Inspection confirmed that `measure:fit` exits on capture
integrity errors, while budget violations remain in the evaluator's rows; a
successful performance stage exit alone is not proof that budgets passed.
