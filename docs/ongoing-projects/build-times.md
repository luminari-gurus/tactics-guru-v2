# Build and verification time: under ten minutes

Requested 2026-11-05: make ordinary Tactics Guru v2 build/PR feedback complete in
under ten minutes, cover key rules with unit tests, and reserve E2E for a minimal
set of core use cases. Deliver changes as incremental PRs. This supersedes the
older epic #199's fifteen-minute target for ordinary PR feedback.

## Evidence and scope

Starting source: `61d8814` on main. The historic full serial capture in
`docs/qa/issue-200/serial-baseline-2026-10-23/` took about 159.6 minutes and retained
failures; its unit stage took 35.17 seconds. Those are different source/selection
inputs from current main and do not establish a current speedup. Current default
Playwright discovery selects 1,036 cases. Rendering/GPU tests still use one worker.

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

The first lane's measurement and CI link will be recorded here after execution.
