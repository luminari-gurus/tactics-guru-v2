# Issue #164 qualification

Status: implementation is published; the original full regression is complete
and failed. Bounded failure diagnosis and final added gates are in progress;
this report does not yet claim PR readiness.

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

## Original full regression

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

Command: `npm run verify:full`, one browser worker and serial stages. The completed
19-stage attempt and raw logs/reports are retained at:
`/tmp/tactics-issue-164-20261027/tmp/verification/full-2026-10-27T11-14-39.281Z-2506569/`.
The parent command finished with exit 1: 17 stages passed, tooling and Chromium
failed. [The complete original manifest](full-run-original/manifest.json) retains
all stage logs/reports and before/after source identity. Input hashes are unchanged.
All 1,241 browser executions are accounted for: 1,227 passes, five failures and
nine declared mode skips, with zero retries/flaky results. The six Ranger journeys
each prove five encounters/338 commands, both earned actions, reload/consumption,
terminal defeat and exact continuation replay. Their traces and screenshots are
retained under `full-run-original/journeys/` and portrait/landscape WebKit images
have been visually reviewed.

The first tooling stage failed because the adapter attempted to resolve an
argument of a `node -e` subprocess as a file. Units, both type scopes and both
build integrations passed afterward; all independent stages completed. The
adapter was not edited during that run. Only after its terminal exit was the
Vite-filename guard applied; the original failed aggregate remains separate from
that recovery. Successful unaffected suites will not be repeated for a green aggregate.

The correction is isolated in ignored `tmp/issue-164/wsl-vite-bind-fixed.cjs`
without editing the adapter used by the live run. It adds a Vite-filename guard
before realpath lookup. With that candidate loaded, `test:verification` passes
10/10, `test:verification-tooling` passes 20/20 and `test:verification-batches`
passes 27/27. [Retained candidate receipts](tooling-candidate/manifest.json) bind
the module bytes and command results. The same bytes are now applied and hash-
verified; actual Vite/engine smoke with the final source remains pending.

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
WebKit acceptance passes 54/54; the complete manifest above also retains the later
passed stages. Performance evaluation passes 18/18 with no integrity failures,
budget violations or slow-load warnings.

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
build prepared. Pristine matched focused runs reproduce the native-clearing
failure in all three profiles in both base and change. Procedural portrait and
landscape HTML5 cases each pass once in both trees; their original failures remain
unattributed pending bounded diagnosis. Setup-only attempts (missing npm on a
non-login shell PATH and overly anchored grep filters selecting zero cases) are
retained separately. Corrected discovery proves exactly 3 + 1 + 1 selected cases.
No assertions/timeouts or retries have been weakened.

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
