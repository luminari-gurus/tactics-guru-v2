# Build and verification time: under ten minutes

Requested 2026-11-05: make ordinary Tactics Guru v2 build/PR feedback complete in
under ten minutes, cover key rules with unit tests, and reserve E2E for a minimal
set of core use cases. Deliver changes as incremental PRs. This supersedes the
older epic #199's fifteen-minute target for ordinary PR feedback.

## Evidence and scope

Starting source: `61d8814` on main. The historic full serial capture in
`docs/qa/issue-200/serial-baseline-2026-10-23/` took about 159.6 minutes and retained
failures; its unit stage took 35.17 seconds. Those are different source/selection
inputs from current main and do not establish a current speedup. At the start, default
Playwright discovery selected 1,036 cases. The default is now seven core journeys;
the explicit broad compatibility selection is 1,030 after the XP migration. Rendering/GPU tests still use one worker.

## Incremental delivery

1. **Fast PR lane.** Run every fast unit, both type scopes, root/prefix build
   integrations, a guarded production bundle and seven existing core browser
   journeys. Keep an explicit discovery contract, logs, source and timings. Run on
   the qualified self-hosted runner with its shared VM reservation. Measure actual
   setup and successful active-job duration against ten minutes; report queue time
   separately. No broad-regression removal or speedup claim in this step.
2. **Rules and fixture permutations.** Inventory browser assertions against the
   existing combat, progression, dungeon, run, save-envelope and storage units.
   Add missing positive/negative unit cases, then remove redundant per-value
   browser loops. Keep one real journey per core UI integration. Compare exact
   before/after IDs and retained assertions for each narrow PR.
3. **Rendering and device boundaries.** Retain minimal real pointer/touch,
   orientation, audio-unlock and WebKit lifecycle witnesses. Move pure geometry,
   audio-state and asset-manifest permutations into units where feasible. Keep
   browser tests for behavior that actually depends on the browser or GPU.
4. **Finalize defaults and measure.** Reassess broad configs and acceptance policy
   after coverage migration. Record successful cold/warm setup, unit/build/E2E
   durations and queue time on the selected host. Establish that routine changes
   meet the budget; address any remaining slow stages in separate PRs.

## Acceptance

- Successful automated ordinary PR job finishes in less than ten minutes including
  dependency setup, checks, bundle, E2E and artifact upload. Queue time is reported.
- Key functional and failure permutations run as unit tests; E2E lists remain
  small, intentional and guarded against automatic matrix growth.
- Gameplay, save/replay and native input/browser integration coverage remains
  traceable. No blanket retries, suppressed failures or relaxed product budgets.
- Full and extended qualification remain explicit, independently reported work.

## First successful measurement

[PR #288 CI run](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42045268094)
completed successfully on 2026-11-05 in **3 minutes 46 seconds active job time**,
including setup and upload; queue time was about two seconds. The verification
command took 206.01 seconds, including 54.33 seconds for 1,163 units and 138.64
seconds for seven browser journeys. Both build integrations and type scopes passed;
no browser skips, failures or flaky outcomes occurred. The tested merge was
`ba75248ea4a87fe6108298e447b6c8dda0ca1606` for PR head `c3765fc`, with a clean tree.

This is one successful ordinary-PR observation on the persistent qualified runner,
not a cold-cache guarantee or a comparable full-regression speedup. Raw reports
and logs are retained in the run's Actions artifact for fourteen days; a compact
[measurement receipt](../qa/fast-pr-verification/first-run.json) records timings,
identity, conditions and hashes. Local CPU checks also passed, while local browser
launches failed because required binaries were absent; Linux CI supplies browser
proof.

PR #289 adds exact active Mage restoration at seven XP boundaries, learned
ability/caster projection, no historical event replay and rejection of forged
progression fields. Its complete ordinary-PR CI passed in 3 minutes 38 seconds.

PR #290 makes the seven journeys the default for `npm test` and direct
Playwright, preserves broad diagnostics through `test:regression` and explicit
special configs, and removes the XP 60/600 browser permutations. XP 0/180 retain
the real absent/present ability gate, exact restore and UI integration on all
former profiles. Exact before/after coverage mapping and matched Chromium/WebKit
execution are recorded in `docs/qa/minimal-default-e2e/`.


## Default suite and migrated progression result

The default command now selects seven core journeys, including the public menu
New Game action. `test:regression` explicitly owns the previous broad selection;
special configs/full qualification preserve their prior cases except the twelve
redundant XP executions now covered by fast units. Exact device/test ID mapping
is in [minimal-default evidence](../qa/minimal-default-e2e/README.md).

The final default-entry PR run passed in **3 minutes 48 seconds active job time**
including setup/upload (1 minute 45 seconds queued; 5 minutes 33 seconds total).
All 1,170 units, both build integrations/type scopes and seven E2E journeys passed,
with no skips or flakes. The matched XP browser comparison passed 24 baseline
and 12 retained cases; its measured browser step decreased from 125s to 66s.
The PR contains compact, source-bound timing/coverage receipts. This verifies the
implemented ordinary build/verification path. PRs #288–#290 merged on 2026-11-05.
Broad and extended qualification remain explicit, not routine
build prerequisites.


## Readiness follow-up

A later unchanged-input run failed its first five-second battle readiness check;
the failure and GPU stall trace remain recorded. Functional core projects now
record a bounded same-browser graphics capability setup before opening the app;
product deadlines, cold-start qualification and zero retries are retained. The
repaired runs passed in **3m42s** and **4m07s** including setup/upload. The latest
run passed all 1,170 units and seven core E2E cases, with one minute queued
(5m07s total). A fresh broad-profile XP recheck passed all 12 cases without core
setup and measured a 69s phase against the 125s baseline. All four browser
workflows also preserve pending runs with the shared VM lock and `queue: max`.
Integration completed on 2026-11-05 at main `d350bb6`. Its tree exactly matches
approved #290 head `0207610`, with #289's head included in its ancestry. The
passing current-head PR runs were #288 `42057412982`, #289 `42057452222`, and
#290 `42058786520`; these are reused pre-merge results, not new main executions.

## Continued rule migration

The [browser-to-unit inventory](browser-rule-coverage.md) maps combat, progression,
dungeon/run, persistence, audio and device boundaries to their existing fast
coverage and retained browser obligations. The next additive increment covers
nine XP boundaries for the development ability-picker fixture, including its
synthetic level-two action, exact HUD choice inputs, legal missile counts,
cancellation/spent-action locks and fresh transient reconstruction. It changes
no browser selection. Fixture-loop reduction needs its own retained UI witnesses,
exact discovery comparison and matched browser timing before removal.

Cold dependency/browser setup measurement remains open; existing successful
under-ten-minute observations use persistent caches. See the inventory for the
bounded follow-up and its acceptance evidence.
