# WebKit dungeon reload boot investigation (#263)

Updated 2026-11-02 (Asia/Jerusalem). **Native entry-resource failure is captured;
runtime repair PR #265 is published. Complete acceptance remains open.**
The current handoff is [plan.md](../../ongoing-projects/plan.md); tracked work is
[OpenSpec tasks](../../../openspec/changes/issue-263-webkit-reload-boot/tasks.md).

## Original failure

- [Run 41320149918](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41320149918),
  runtime `9b543cbafecf1cce48f966ff1d8998a46a7ae32d`.
- Artifact `full-verify-41320149918-1`, ID `13093858052`, 590,452,011 bytes.
  Recovered in WSL `/tmp/tactics-issue263-evidence/`; archive SHA-256
  `9f8726d2adcb007beeb6ece633d3bc6dba83b8467fb0d62de2849fba047b61dc`.
- The recovered job log confirms browser qualification (Chromium 153.0.8010.12,
  WebKit 26.6), a failed WebKit exploration stage and passing other stages.
  [Original report](original-webkit.json.gz), [log](original-webkit.log.gz),
  [aggregate](original-summary.json.gz), [job log](original-job.log.gz),
  [browser environment](original-browser-environment.json) and
  [error context](original-error-context.md) are preserved, with hashes in
  [evidence-manifest.json](evidence-manifest.json). Selected ZIP entries were
  extracted with CRC validation. The archive contains no WebKit failure trace.
- The report confirms **98 passed / one failed**, no retries: desktop WASD,
  64.025 seconds, missing `#dungeon-screen` at the 60-second boot assertion.
  Stack: `dungeon-exploration.spec.ts:124` → `load` at line 92 → Continue helper
  line 10. This is a later locked-stair fixture load after successful round-trip
  travel. The [arrival screenshot](original-arrival-before-failure.png) was taken
  **before** that failure; it is not a screenshot of the stalled page.
  The error context confirms the original HTML Loading shell. No underlying
  request/exception evidence was captured, so the cause remains unknown.
  The original full run remains failed; no passing replacement is claimed.

## Local exact-runtime diagnosis

Isolated WSL checkout `/tmp/tactics-issue263-failing` is pinned to `9b543cb`.
`npm ci`, `npm run build` and `npm run check:browsers` passed. Runtime source is
unchanged; diagnostic hooks were appended to the existing exploration test and
a temporary config enables retained failure traces/screenshots. They install
request/error listeners and bounded shell/mount/readiness sampling before
navigation. Existing test bodies, assertions and timeouts are unchanged.

- Five desktop-WebKit WASD repetitions passed in 27.2 seconds, no retries/skips.
- All four stair inputs on desktop/portrait/landscape WebKit, five repetitions
  each, passed **60/60 in 4.9 minutes**, no retries/skips.
- Some passing cases record an `items` module request cancelled by navigation.
  This confirms navigation can interrupt unfinished imports, but cancellation
  alone is not sufficient evidence of the stall: those cases recovered normally.
- A bounded 300-pair goto/reload probe passed in **2.1 minutes**, with no retries.
  Its first invocation selected zero tests because the temporary exploration
  config did not include the probe filename; the corrected config includes it.
  That setup failure is retained as `reload-probe-no-selection.log` locally.

Local logs, reports, hashes and browser qualification receipt are under
`/tmp/tactics-issue263-evidence/`. Portable reports are preserved as
`local-wasd.json.gz`, `local-stairs.json.gz`, `local-reload-probe.json.gz` and
their associated logs/manifest. Local passes do not reproduce the bug, attribute it to
runner load, or satisfy #263's causal/full-verification acceptance.

## Current interpretation

The issue's pre-mount observation still leaves entry/module fetching/evaluation,
CSS preload completion, initialization and browser lifecycle as hypotheses.
Do not change a timeout, add retries or claim an engine defect on this evidence.
No application behavior or production telemetry setting has changed.

## Diagnostic chunk

`tests/helpers/startupDiagnostics.ts` observes the existing exploration cases
before navigation and attaches evidence only on unexpected failure. It records
bounded request completion/failure, safe exception categories, shell/mount/ready
samples, stylesheet availability and completed script/link timings. It does not
intercept requests, read storage, change test waits/retries or enable telemetry.
Only build-owned filenames survive URL filtering; arbitrary messages, hosts,
query/hash and save data are excluded. A two-engine synthetic contract deliberately
fails four cases to check attached evidence, redaction and saturation caps.

This is diagnosis support, not the causal repair. Final #263 acceptance is pending.

Final diagnostic-helper qualification (local WSL, one worker, zero retries/skips):

- Main-runtime build/content/both types passed; final helper typecheck passed.
- Exact before/after discovery retained all 54 test IDs/titles per engine.
- Final privacy contract passed on Chromium and WebKit: four deliberate assertion
  failures verify attachments, same-origin filenames, private-message/URL/save
  exclusion and event saturation. This is one passing Node contract, not four
  successful application journeys.
- Final-helper Chromium exploration **54/54 passed** in 3.5 minutes.
- Final-helper WebKit exploration **54/54 passed**, split into 42 non-stair cases
  (3.3 minutes) and 12 stair cases (38.7 seconds). All three device profiles ran.
  Earlier 54/54 Chromium and 12/12 WebKit positive runs preceded final filtering
  and remain separate historical evidence.

[Source identity](diagnostic-source.json) records base `f16cd5a`, dirty diagnostic
test overlay matching code commit `495d08d`, relevant file/build hashes, runtime,
browser versions and mode overrides. App, assets, dependencies and build/config
inputs are unchanged by this test-only chunk. The served build identifies the
actual tested base/dirty state; it is not claimed to be a clean build of the final
documentation commit. Raw reports/logs/discovery are gzip-preserved and listed in
the evidence manifest; hashes bind canonical committed payload bytes.

Commands: `npm run build`; `npx tsc --noEmit` after final helper filtering;
`node --test --test-name-pattern='dungeon startup evidence' tests/tooling/browser-diagnostics.test.mjs`;
`npx --no-install playwright test tests/dungeon-exploration.spec.ts --retries=0`;
and the WebKit exploration config with complementary `-g` / `--grep-invert`
`stairs travel once per entry` filters. Discovery used `--list --reporter=json`.

## Qualified-runner diagnosis

[Run 41343197332](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41343197332)
was cancelled while pending; the API confirms **zero jobs executed**. Another
owner's pending run 41344487694 must not be replaced by resubmission while the
existing exclusive full capture 41337233629 is still active.
Temporary branch `branch/issue-263-runner-diagnosis`, commit `508f1b6`, carries only
the manual job addition beyond diagnostic code `495d08d`; it is separate from the
review branch. It checks out exact failed runtime `9b543cb`, overlays the helper
and its one import without changing original test bodies, records input hashes,
builds and runs the diagnostic contract, then original WebKit exploration order
and five stair repetitions with retained failure traces. Commit `4d4fd5b` now
keeps the first, complete exploration order in ordinary untraced mode so its
embedded startup-budget check has canonical measurement conditions; stair repeats
still retain traces. One worker/zero retries
and the shared exclusive lock remain. Two failures stop this **diagnostic** run
early; such a partial attempt cannot satisfy acceptance. No original failed run
is relabeled, and the cancelled attempt supplies no passing evidence.

## Main integration and traced-budget comparison

#256 merged to main `78a3f75` during diagnosis. Our branch integrated it cleanly
as `cdc39cf`; the helper and its contract/dependencies are unchanged. On this
combined source a traced WebKit exploration attempt had **53 passes / one failed
250-floor startup-budget case**, 3421ms against unchanged 2500ms. Its new startup
attachment shows boot ready at 384ms, styles loaded and no request/page error;
this is a different failure from #263's missing screen. The trace/report remain
under `/tmp/tactics-issue263-evidence/integrated-webkit*`.

A clean **literal-main `78a3f75`** checkout without the fixture reproduced the
same assertion on one of three traced focused landscape-WebKit repetitions
(3757ms), with two passes. Three matching ordinary/untraced repetitions passed.
This does not attribute #263 to trace overhead or prove an exclusive cause of
the budget variance; it establishes that this budget failure also occurs on the
base under the diagnostic flags. Qualification now uses the unchanged canonical
untraced mode and retains the failed traced attempts separately. No limit or
assertion was relaxed. Combined-source ordinary qualification **passed 54/54
WebKit (3.6m) and 54/54 Chromium (3.4m)**, zero retries/skips, at clean tested
commit `cdc39cf`. [Integrated source/build identity](integrated-source.json),
`integrated-*-standard.json.gz` and associated logs preserve the exact inputs.
Current-tree discovery still matches the original 54 IDs/titles per engine.
No application/build/config/dependency input differs from literal main in this
diagnostic PR. The unchanged privacy contract remains valid independently of
the main integration. OpenSpec task 1.3 is complete; cause/fix/full acceptance
are still pending.

## Additional bounded checks

The original failed-run and local exact-runtime build logs have the same **28
generated JS/CSS asset filenames**. This is consistent output naming, not a
comparison of original served bytes (the original bundle itself is unavailable
in that artifact).

A local desktop-WebKit probe inserted the already-loaded production dungeon
stylesheet 2,000 times. Its corrected post-dispatch check observed **zero
synchronous load events, zero missing late listeners and zero timeouts**. This
does not reproduce #263 or rule out cross-document/network-cache behavior.
The first probe incorrectly checked after an awaited promise but before the
remaining event listener ran; it reported a false late-listener miss. Corrected
checks recorded 2,000 such early checkpoints followed by successful listeners.
Both the invalid first probe and corrected result are retained as `css-event-probe*`
reports/logs, with no application change inferred from either.

Parsing all 22 exact-runtime generated JS chunks with Node's native module parser
(without evaluating them) found no static import cycles, no chunk importing the
entry, and no top-level await in the dungeon route's static dependency closure.
All static dependencies were local and present. The entry and standalone battle
entry do contain top-level await; the latter is outside the dungeon closure.
`exact-runtime-module-graph.json.gz` preserves this graph. This narrows the
source-level wait-cycle hypothesis; it does not establish a browser/import or
initialization cause.

## Qualified failure witness and runtime repair candidate — 2026-11-02

Ordinary, injection-free application tests reproduced the reported failure on
the qualified runner:

- [41349975828](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41349975828)
  at CI branch `8298aea`: 36 passed, two failed, 16 not run after the declared
  diagnostic stop. Portrait compass reproduced the 60-second missing-screen
  failure at the same later fixture load; landscape marker reload also failed.
- [41356666822](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41356666822)
  at `a6a1323`: the focused original prefix selected 90 cases; 68 passed, two
  failed, 20 did not run. Both failures were missing-screen stalls in landscape
  stairs at `dungeon-exploration.spec.ts:124`, with the original 60-second wait.
- Both show prior-page module cancellations followed by failure of the **new
  document's entry script and static dependencies**, before application code.
  The native reason is **`WebKit encountered an internal error`**. The document
  completes and accepts diagnostic evaluation; its entry never runs. No requests
  remain pending and its script/link resource timings are empty. This separates
  the fault from Phaser READY and save admission. Context reuse, remote browser
  attachment and PWDEBUG flags were all absent.

The captured native reason is a component-level witness, not proof of a specific
native memory defect. [An upstream report](https://github.com/microsoft/playwright/issues/42803)
describes a Linux WebKit networking failure in bundled libsoup 3.6.5, fixed
upstream in 3.6.6. Our local 1.63.0 and qualified-runner binary inventories both
contain 3.6.5. An isolated **official stable Playwright 1.64.1** installation
contains WebKit 2370 with libsoup **3.6.6** in both GTK/WPE bundles. This is a
supported repair candidate; no external security reproducer was run.

[41358705036](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41358705036)
at `f30e65e` enabled browser-process logging and recorded component identities.
It passed all 90 prefix cases and 60 traced stair repetitions on the old runtime.
Its successful run does not erase the two captured failures or establish a fix.
No allocator/network-process crash was observed in that successful log, and
cgroup memory counters were unavailable. The component-specific attribution
remains an inference to verify with the repaired runtime.

Additional local controls passed: 54/54 exact-runtime exploration cases with the
observer and 54/54 without early page script injection; 40/40 actual JS-transfer
interruptions; 10/10 actual CSS-transfer interruptions plus ten CSS controls that
waited for completion; and 20/20 reloads after engine-script transfer. These
preserved the synthetic save. They narrow simple cancellation explanations but
do not reproduce the qualified-host fault or constitute repair acceptance.

Repair scope: pin the stable package that ships the fixed networking component,
preserve existing device geometry/touch behavior across its screen-option change,
then compare the original prefix on the same qualified runner without debug,
retries, longer waits or application changes. Retain the full issue gate.

## Published runtime repair and compatibility evidence

[PR #265](https://github.com/luminari-gurus/tactics-guru-v2/pull/265) is stacked on
diagnostic PR #264. Clean tested source is **`e3e9ebf11aff78d395f65df6c3f74cded6733e83`**.
Its changes are limited to the three Playwright packages, browser-cache-preserving
setup and the five existing device-bearing configurations. Playwright 1.64 starts
forwarding descriptor screen options; `screen: undefined` preserves the previous
effective viewport-based screen. Viewports, touch, DPR, profiles, test selection,
assertions, budgets, timeouts and retries are unchanged. No application or save
source changes belong to this repair. Compared with original failed source
`9b543cb`, main already includes later menu/dungeon UI fixes; these are integration
inputs, not attributed to the runtime patch.

Clean-candidate local proof:

- Locked installation, browser preflight and the production build passed,
  including 223 content assertions and both TypeScript scopes.
- Both browser diagnostic contracts passed. All 38 selection, batch and full
  orchestration contracts and 20 timing/reporter/process contracts passed with
  no skipped/cancelled tests.
- Before/after discovery preserves all **1,541 cases across 15 inventories**,
  including exact IDs, assertion metadata, filters, workers and retry policy.
  The deliberate differences are browser user-agent version and descriptor
  screen metadata; six actual-browser probes establish unchanged effective
  viewport/screen/touch/DPR for all Chromium and WebKit exploration profiles.

`candidate-source.json.gz` binds clean source inputs and local served build
hashes. `runtime-*-selection.json.gz`, `runtime-selection-comparison.json.gz`,
`device-compatibility.json.gz` and `candidate-*.log.gz` retain portable receipts;
canonical payload hashes are in the evidence manifest. These are local proof,
separate from the qualified runner results.

Qualified candidate run [41361259848](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41361259848)
pins `e3e9ebf` using temporary CI source `3f93ce3`. It passed **90/90 ordinary
prefix cases in 413.1 seconds and 60/60 traced stair repetitions in 403.4 seconds**,
one worker and zero retries/skips/flaky results. Both qualified GTK/WPE inventories
confirm libsoup 3.6.6 before and after execution. Verified artifact `13105454118`
contains 14,856,756 bytes, SHA-256
`75fd3bb2c4794b095f4a28557a041c6ead514627827268c76083cd6fda16b051`.
Portable reports, input identities, component inventories and job log are retained
as `run-41361259848-*` and `candidate-41361259848.log.gz` in the manifest.
This supports the supported-runtime repair at the observed native networking
boundary; it does not establish the exact upstream native memory-defect stack.
Required full acceptance
[41362013777](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41362013777)
is running at the same candidate source using the existing full-verification
job, original limits and shared exclusive self-hosted lock. That in-progress
attempt is not claimed as complete acceptance. Observe its handle without
duplicating or cancelling work on an observation timeout.

The current Development association is repair PR #265. GitHub had converted the
original linked branch into a closing reference on diagnostic PR #264 when it
opened; that reference was moved in the issue sidebar. GraphQL readback confirms
only #265 closes #263, #264 has no closing issue, both PRs remain open/non-draft
and mergeable, and the issue remains open/assigned. This metadata correction
prevents diagnostic-only merge from prematurely closing the work item.
