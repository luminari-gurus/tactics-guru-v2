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

The next additive unit-coverage PR covers exact active Mage restoration at seven
XP boundaries, learned ability/caster projection, no historical event replay and
rejection of forged progression fields. The browser parameter loop remains until
its smaller UI witness and affected-profile measurement are separately qualified.
