# Minimal default E2E and progression migration

The ordinary `npm test`/Playwright entry point now selects the same seven core
journeys as PR verification. The public menu New Game witness replaces the
diagnostic proof-scene resize case in this core list; setup and broad configs
still retain that diagnostic case. Before this change it selected 1,036 Chromium cases.
`test:regression` explicitly selects the historical broad compatibility matrix;
`verify:full` and each specialty config now import that matrix explicitly.

## Functional ownership

| Key behavior | Fast unit coverage | Routine browser witness |
| --- | --- | --- |
| Combat, abilities, AI, turns, RNG and replay | `combat`, `abilities`, `abilityValidation`, `ai`, `turns`, `rng`, `battleSession`, `movementUndo`, `tacticalPlan` | Complete winning battle through real controls; replay and outcome reload |
| Run state, rewards, inventory and persistence | `run`, `runBattle`, `RunItemSession`, `items`, `itemCommands`, `rewards`, `runStorage`, `runSaveEnvelope` | Run undo, active reload, terminal outcome, terminal reload and fresh restart |
| Dungeon generation, exploration, progression and saves | `dungeon`, `dungeonBattle`, `dungeonEncounters`, `exploration`, `progression`, `dungeonProgressionBoundary`, `menuSaves` | Public menu New Game, dungeon startup, keyboard action, exact active resume on Chromium and WebKit |
| Input, geometry and display state | `input`, `picking`, `radialGesture`, `radialLabels`, `combatControls`, `healthBar`, `boardPresentation` | Real Pixel board touch, modal capture and suspend/resume; real production startup |
| Content, assets, audio state and telemetry | Content/inventory/export tests, `audioState`, `battleAudio`, `battleCues`, `telemetry`; root/prefix real build integrations | Production boot and controlled missing-engine error; rendering/audio/telemetry specialty configs remain explicit compatibility tools |

Unit names in the table refer to `tests/unit/<name>.test.ts`. This assigns key
functional ownership; it does not claim every historical browser assertion is
unit-equivalent. The small routine gate intentionally covers core integrations;
additional browser-sensitive diagnostics remain available by explicit selection.
New browser cases do not automatically multiply routine PR work.

## Exact selection proof

The [coverage map](coverage-map.json) compares base `637ab92` discovery with this
candidate. Every retained test ID, test metadata and device setting in every
explicit full/special mode is unchanged. The only removed broad executions are
Mage XP 60 and XP 600, three Chromium and three WebKit profiles each (12 total).
All other special mode selections remain identical. The broad Chromium selection
is 1,030; the broad WebKit exploration selection is 123. The core default is seven.

`dungeonProgressionBoundary.test.ts` covers XP 0/59/60/179/180/360/600: canonical
HP/level, exact active turn/state, learned ability and caster projection, stable
save encoding, no historical events/replay, and rejection of forged projections.
The remaining XP 0/180 browser witnesses straddle the Frost Snare learning gate
and keep the original UI, save/reload and caster assertions on every prior profile.
No retained assertions, product performance limits, retries or case timeouts changed.

Verification before publication: 15 core/orchestration contracts, 30 real
selection/batching contracts and both TypeScript scopes passed. The initial default-entry CI run passed in 4 minutes 21 seconds including setup
and upload. [Pre-qualification public-menu core CI](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42048854431)
passed in **3 minutes 48 seconds**, including setup and upload: all 1,170 units,
both build integrations/types, bundle, 15 core/tooling contracts and all seven
E2E journeys passed. Queue time was 1 minute 45 seconds, for 5 minutes 33 seconds
from trigger to completion. The [core timing receipt](core-timings.json) records
tested merge/source identity, counts, per-stage timings, conditions and raw hashes.
This result describes its tested source; the later failed run and qualified
recovery below remain separate evidence.
Local process/reporter contracts passed 17 tests, with three Linux-only cleanup
checks explicitly skipped on macOS. Their underlying cleanup implementation did
not change; qualified Linux jobs retain their actual cleanup results.

## Bounded matched execution

The existing manual `Browser setup smoke` workflow now accepts `suite=progression`
and an optional exact `source_ref`. Run both baseline `637ab92` and candidate on
the same qualified VM; keep caches, browser lockfile and worker/retry policy
consistent and record limitations. The workflow executes only the XP browser
cases in Chromium and WebKit, retaining durable JSON and failure traces. Its
ordinary setup/boot qualification remains the default `suite=setup` behavior.

### Matched result

[Baseline run](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42048414716)
at `637ab92` passed all 24 XP cases; [candidate run](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42048483145)
at `96b14aa` passed all 12 retained cases. Both ran sequentially on
`unraid-tactics-02`, Node 24.22.2, with identical lockfile hash, browser toolchain,
one worker and zero retries. No XP failures, skips or flaky outcomes occurred.

The measured browser step fell from **125s to 66s (47.2%)**; summed Playwright
report durations fell from **122.89s to 63.33s (48.47%)**. These are observed bounds
for this subset on persistent caches with host load not independently controlled;
they do not establish a whole-regression speedup. Setup/build/diagnostics remain
separate. [Compact timing receipts](progression-timings.json) retain source,
counts, report hashes, commands' step walls and measurement limitations. Raw logs,
JSON and traces remain in the two workflow artifacts for seven days.

The diagnostics harness deliberately creates a failing fake-browser fixture to
verify failure receipts survive ordinary cleanup, then checks recovery. Its
intentional control reports are retained separately from passing XP results.

Between `96b14aa` and `63607ef`, the measured XP inputs stayed unchanged. The
later fixture change is covered by the post-helper recheck below.


## Preserved final-head startup failure and recovery scope

The next evidence-only head run [42050203033](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42050203033)
failed the first complete-battle case at its unchanged five-second player-ready
assertion. The other six browser cases, all units, types and builds passed. The
[compact failure receipt](initial-startup-failure.json) retains the failure and
trace hash; the raw trace remains in that run's fourteen-day artifact. Trace
warnings include GPU `ReadPixels` stalls during first startup. This observation
is not proof of sole cause, nor a new product performance conclusion.

Core functional profiles now qualify a real green pixel in the same browser
process, once per browser instance, before opening an app page. Setup uses an
isolated temporary context, a fifteen-second pixel deadline and durable
`graphics-setup.json` receipts. No app cache or storage is warmed. The existing
readiness assertions, retries and product budgets stay unchanged; setup time is
included in the five-minute browser phase and eight-minute command budget.
Cold player startup remains an explicit performance concern, not certified by
these functional journeys. This follows the existing audio-suite setup boundary.
Broad regression profiles yield their original contexts without graphics setup.

The shared VM reservation also now uses `queue: max` in all four browser
workflows. This fixes issue `tg-build-cv0`: default single-pending behavior can
cancel an older queued PR/manual check when another arrives. Queue guards cover
all workflows and reject missing/single queue settings. See the official
[GitHub concurrency contract](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).


### Qualified recovery and final source

[Core recovery 42051973913](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42051973913)
passed in **3m42s**, including setup and upload. Its [graphics receipts](graphics-recovery.json)
record successful green pixels in the actual desktop, touch and WebKit browsers.
The latest [core check 42052446383](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42052446383)
at head `8f9f6ea` passed in **4m07s active** plus **1m queued** (5m07s total):
all 1,170 units, two build integrations, both type scopes, 16 fast tooling guards
and seven journeys passed with no skips, failures or retries. Its
[compact receipt](latest-core-check.json) retains per-stage and graphics data.
These passing recoveries do not relabel the earlier failed run as passing.

[Post-helper XP recheck 42052722995](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42052722995)
passed all 12 retained XP cases on VM02, with **zero core graphics receipts**,
verifying that the broad profile path does not run the new qualification. Its
browser step took **69s** versus the source-bound baseline's 125s (44.8% observed
reduction); the earlier 66s result remains a separate source/observation. See
[recheck receipts](regression-helper-recheck.json). A preceding checkout-only
attempt used an abbreviated SHA and ran no application tests; the successful
retry uses the full commit SHA and does not hide that setup failure.

The final evidence commit changes documentation only. Functional evidence is
reused from `8f9f6ea` with unchanged application, helper, selection, dependency,
asset and build inputs; automatic final-head checks are separately visible on
PR #290. No merge is performed without the pending caller decision.
