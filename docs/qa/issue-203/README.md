# Issue #203: browser profiles selected by behavior

Default Chromium selection changes **693 → 670**. Nine device-independent
startup/asset failure cases run completely on desktop; five explicit-viewport
layout cases keep desktop and Pixel portrait execution, removing only their
identical Pixel landscape duplicates. Assertions, titles, IDs, devices, timeouts,
retries, gameplay and performance limits are unchanged. Unclassified cases retain
all existing profiles. WebKit, touch/pointer, keyboard/focus, audio, lifecycle and
representative complete journeys remain selected.

Caller approved plan `ad1d8d7` on 2026-10-23. Literal main base:
`958bbd90546e1305aab10e370d5555a1d7c9a43a`. PR #229 owns separate audio work and
#139 owns the HUD; both were open when this implementation started.

## Exact selection proof

| Profile | Before | After |
| --- | ---: | ---: |
| Desktop | 231 | 231 |
| Pixel portrait | 231 | 222 |
| Pixel landscape | 231 | 217 |
| Total | 693 | 670 |

`selection-before.json.gz` and `selection-after.json.gz` retain all 15 discoveries,
including special configs/modes, effective device settings and stable IDs.
`coverage-map.json.gz` maps every one of the **23** removed executions to retained
complete assertions. Five layout mappings include complete equivalent effective
Pixel settings: viewport, screen, DPR, UA, touch, mobile and engine. Viewport is
set before navigation; desktop remains distinct, and native orientation/touch
cases outside this duplicate corpus stay selected.

Ongoing tooling compares actual selection with live unfiltered discovery using a
temporary discovery-only config. It rejects unexplained omissions, extras,
duplicates, wrong filters and device/metadata drift while allowing new unclassified
cases without rewriting historical captures. Real discovery proves the nine
existing batches partition all 670 IDs exactly. Separately, the four modified
browser files were checked against literal base: removing only tag details restores
them byte-for-byte. No batch rebalance or historical receipt edits were needed.

## Matched timing

One sample per revision, same macOS arm64 host, Node 26.11.0, Playwright 1.63.0,
Chromium 153.0.8010.12 and identical root production build (`build-files.json`).
Both engine launch and Phaser boot/resize qualification passed first. One worker,
zero retries; browser versions/executables are in `browser-environment.json`.
Caches/background load were not independently controlled; no other browser suite
ran concurrently on that host. This is emulation, not physical-device testing or
cold-GPU performance certification.

| Affected selection | Result | Runner wall | Summed case time |
| --- | --- | ---: | ---: |
| Before, all original profiles | 42/42 passed | 12.949 s | 11.183 s |
| After, retained profiles | 19/19 passed | 6.935 s | 5.618 s |

Observed runner reduction is **46.4% for this affected group**. Overall default
execution-count reduction is **3.3%**, not a measured full-suite speedup or a claim
that epic #199's 15-minute target is met. `timings.json` and raw `timing-*.json.gz`
retain each case/profile/result/retry/duration, command and first-test delay.
Wall minus summed durations includes server/worker/reporting costs; first-test
delay is not represented as pure server setup. The same bundle served both samples
before a later validation build.

## Full selected execution and preserved baseline failure

[Capture 40014331247](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/40014331247)
executed **all 670 selected IDs** at clean source
`5bd53985aa5f3ded04b6853e5ce718165e289094` on `unraid-tactics-01`, through nine
serial jobs, workers 1, max-parallel 1 and `tactics-browser-exclusive`. Result:
**666 passed, three expected preview skips, one failure, zero retries/flaky cases**.
The three dev-only placement executions have separate retained passing dev evidence.
All representative complete journeys and all 19 retained affected cases passed.
Each receipt's source/input/build hash, checkpoint and exact selected IDs were
verified against the prepared plan. No IDs were missing, extra or duplicated.

The failure is `battle-persistence.spec.ts`'s **default Move Continue is read-only
and confirmed movement keeps the remaining-action flow**, mobile landscape. Its
initial five-second `data-phase="player"` assertion timed out at helper line 15 /
case line 41, before interaction. The page was still loading. The spec, runtime,
assertion and device settings are unchanged by #203. Cleanup completed without
owned survivors/errors. Its raw JSON, receipt, error context and failed-job log
are retained. The aggregate remains **scope: partial, complete: false, passed:
false, baselineEligible: false**; execution of all selected IDs is not a clean
passing full regression. See `self-hosted-results.json` and raw aggregate files.

[Bounded comparison 40026132069](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/40026132069)
ran this one case once per source on the same exclusive runner, with clean root
builds, the same native profile/command, workers 1, retries 0 and tracing off:

- Literal base `958bbd9`: **failed at the same initial assertion**, before interaction.
- Capture source `5bd5398`: **passed the complete Continue/reload/move/save assertions**.

`startup-comparison.json` records the matching case ID/error location and **167
matching runtime/asset/case/dependency hashes** across base, candidate and final
source. Raw source identities, build inventories, conditions and observations are
retained in the comparison JSONs and `base-comparison-receipts.tar.gz`. This
reproduces the startup failure on literal main; it does not identify its root
cause, fix startup reliability or erase the failed capture. The passing focused
observation is separate evidence, not a retry-qualified full-suite pass.

## Other qualification and evidence reuse

Self-hosted preparation passed **935 units**, both TypeScript scopes, **two real
root/prefix build integrations** and the ordinary production bundle. Final tooling
qualification at `3197945cdcf79e2788d2271ac3f328ea9d3d577d` passed **20 timing/process,
27 selection/batch, 10 full-runner and one diagnostics contract**, both engine
Phaser smoke cases, both type scopes/build with 221 content checks, and two real
preview/dev timeout-and-recovery contracts. Deliberate interruptions remain
interruptions, not gameplay passes. Full receipts and the workflow log are retained
in `final-tooling-receipts.tar.gz` and `comparison-workflow.log.gz`.

Fresh root-dev, prefix-preview and prefix-dev asset runs passed **201 cases** with
**six expected dev resource-hint skips**, no failures/retries. Their raw reports and
prefix/restored-root build logs are retained; root preview assets ran in the
selected default capture. Existing large-bundle warnings remain.

`coverage-ledger.json` maps **266 unchanged special-mode selections** to original
source-bound results from run 39952038146: fixtures 57, placement-dev 3, WebKit
acceptance 52, WebKit exploration 57, health bars 25 and production/development
telemetry 36 each. All IDs match current discovery. The only runtime difference
from that old capture is proof-only audio cleanup; these consumers use battle,
run, map, dungeon and fixture routes. Four changed run-recovery WebKit executions
instead reuse #204's committed passing report; **170 relevant input hashes match**.
Configured production/development telemetry have separate original raw reports;
the ordinary artifact hash is not used as configured telemetry build proof.

The old #200 full capture remains failed. Its dirty 18-sample performance capture
is preserved separately from the clean historical 18-sample recovery at `5a161da`.
#203 changes no runtime, performance collector/evaluator inputs or measure:fit
selection. No fresh performance or byte-identical later bundle claim is made.
Original artifact links/retention and exact hashes/conditions are in the ledger and
original summaries; committed compressed reports survive Actions expiry.

## Source identity, commands and acceptance

`final-inputs.json` has the **same complete relevant input hash** as final self-hosted
tooling qualification. Relative to capture `5bd5398`, later implementation changed
only discovery-control tooling/tests and evidence; all 15 actual selections/use
settings stayed exact. Browser specs/config, runtime/assets/dependencies and full
unit/build inputs are unchanged. Later evidence/task commits and restoration of
temporary workflow eligibility do not invalidate those inputs. These reports state
their actual tested commits; they are not claimed to execute a later documentation
commit. Tested ordinary bundles are clean and separately identified.

```sh
npm run build
npm run check:browsers
npm run test:browser-smoke
npx --no-install playwright test tests/assets.spec.ts tests/boot.spec.ts tests/engine-fit.spec.ts tests/layout.spec.ts -g 'failed canonical|a proof image|a proof asset|missing engine chunk|shows loading before|shell initially displays|controls stay' --reporter=json
node scripts/verification-selection.mjs capture tmp/selection.json
node scripts/verification-selection.mjs compare tmp/before.json tmp/after.json tmp/coverage-map.json
npm run test:verification-batches
npm run test:verification
npm run test:verification-tooling
npm run typecheck
# Exact-base comparison selector, once on each pinned source:
npx --no-install playwright test tests/battle-persistence.spec.ts --project=mobile-landscape -g 'default Move Continue is read-only and confirmed movement keeps the remaining-action flow$' --workers=1 --retries=0 --reporter=json
```

The approved selection/count/mapping gates, device-sensitive and WebKit retention,
representative journey execution and comparable timing gates are verified. The
unrelated startup failure is reproduced on literal base and remains explicitly
unresolved; no assertion, timeout, retry or product budget was relaxed to deliver
this change. No deployment, runner provisioning or physical-device claim is made.

Temporary exact-branch permission and comparison mode/job enabled manual evidence
collection, then the workflow was restored byte-for-byte to base. Its executed
snapshot remains in `comparison-workflow.yml.gz`; no CI workflow change ships.
Setup corrections are preserved: a nonexistent compatibility config in the first
discovery attempt, CLI grep flags not overriding project filters in the first live
control, a rejected job-level `runner.temp` expression, and an over-anchored
comparison selector caught by `--list` before browser execution. Corrected contracts
passed. Superseded queued qualification runs had no executed jobs; the rejected
workflow had no browser execution. None is confused with the real baseline timeout.

Use `gzip -dc <report>.json.gz` or `tar -xzf <receipts>.tar.gz` to inspect raw data.
`evidence-sha256.json` binds the delivered evidence files.
