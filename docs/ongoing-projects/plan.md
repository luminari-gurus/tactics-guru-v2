# Issue #263: Reliable WebKit boot after dungeon reload

Started: 2026-11-01 (Asia/Jerusalem). Status: repair published; focused and full acceptance running.

**Active follow-up branch:** `branch/verify-map-disposer-coverage`, stacked on
runtime PR #265 at `1dfc3a6`. The runtime repair branch is
`branch/issue-263-patched-webkit-runtime`, stacked on diagnostic PR #264 at
`6ee7a5c`. Candidate changes pin Playwright 1.64.1 (three
packages only), retain the old effective screen behavior with `screen: undefined`
in the existing device project definitions, and preserve other branches' browser
caches during setup with `--no-remove`. Viewports, touch, DPR, project IDs, test
selection, assertions and retry/timeout limits remain part of the proof.

**Outcome / files / proof:** repair the failing Linux WebKit networking runtime
through its official stable browser package. Owners are package.json/lock and the
five existing device-bearing Playwright configs. The official candidate contains
libsoup 3.6.6 versus observed 3.6.5. First prove install/build/types, actual device
input compatibility and unchanged selection, then the same qualified prefix
without debug and the full original acceptance inventory. Keep all failed old
runtime runs. Native-memory-defect attribution remains an inference; no external
security reproducer is part of this work. Game rules, saves, hosting and arbitrary
native-library replacements are outside this candidate.

## Current implementation handoff

Updated 2026-11-02 (Asia/Jerusalem). **Native entry-resource failures are captured;
the supported runtime repair is published in stacked PR #265. Full acceptance remains open.**

**Live continuation checkpoint:** candidate source **`e3e9ebf`** is clean and
published in [PR #265](https://github.com/luminari-gurus/tactics-guru-v2/pull/265),
base diagnostic PR #264. Candidate focused run **41361259848**, CI source
`3f93ce3`, completed **90/90 ordinary prefix cases and 60/60 traced stair
repetitions**, with zero failures/skips/retries. Its verified artifact is
`13105454118`, SHA-256
`75fd3bb2c4794b095f4a28557a041c6ead514627827268c76083cd6fda16b051`;
both qualified GTK/WPE libraries contain libsoup 3.6.6. Full acceptance
**41362013777**, job **125015648051**, is now running against
`branch/issue-263-patched-webkit-runtime` at `e3e9ebf`, using the existing
`issue-200-baseline.yml` full-verify job, original limits and shared exclusive
self-hosted concurrency group. Observe these exact run IDs; do not duplicate or
cancel them because an observation call times out.

Clean-candidate locked installation, browser preflight, build/content/both type
scopes pass. Both browser-diagnostic contracts, all 38 selection/batch/full
orchestrator contracts and 20 timing/reporter/process contracts pass. Fifteen before/after selection inventories retain
all **1,541 test IDs and metadata**. Actual Chromium and WebKit probes on all six
profiles preserve viewport, effective screen, DPR and touch; only the browser
version/user-agent intentionally changes. Canonical local outputs are under
`/tmp/tactics-issue263-evidence/` with `candidate-*`, `runtime-*-selection.json`,
`runtime-selection-comparison.json` and `device-compatibility.json` names.

**Other live work:** local clean-candidate extended journeys run serially in
`/tmp/tactics-issue263-candidate` with isolated official browser cache
`PLAYWRIGHT_BROWSERS_PATH=/tmp/tactics-issue263-runtime-inspect/browsers`.
Exec session **98824** runs Chromium's nine cases, then WebKit's nine cases;
`/tmp/tactics-issue263-evidence/candidate-extended/{chromium,webkit}.log` and
matching `.exit` files identify terminal outcomes. The first four Chromium cases
have progressed to **9/9 passed, exit 0**; the same live pipeline has started the
nine WebKit journeys. Do not start another local browser/server
while that process is active. After it finishes, retain both complete JSON
reports from its printed `verification-receipts/browser-runs/run-*` directories,
then run the existing `tests/tooling/verification-browser.test.mjs` cleanup
contract against the candidate runtime (preview/dev), serially. All other
local contracts are terminal and passed. Pending CI acceptance is run
**41362013777**, job **125015648051**; never poll the completed focused run as live.

**Development-link audit:** GitHub replaced the original native branch link with
a closing reference to diagnostic PR #264 when that PR opened. On 2026-11-02 the
issue sidebar association was moved to repair PR #265, preventing a diagnostic-only
merge from closing #263. GraphQL readback confirms #264 has no closing issue,
#265 closes #263, both PRs are open/non-draft/mergeable, and #263 remains open and
assigned to `moshehbenavraham`. The branch-to-PR conversion is expected GitHub
behavior ([GitHub documentation](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-a-branch-for-an-issue));
the current Development link now follows the actual repair branch.

**Separate verification omission:** the aggregate's `placement-dev` filter runs
the controlled-placement case but omits the existing dev-only direct map-disposer
case, which is skipped in production preview. Fix this selector separately,
stacked on the runtime repair: retain the stage ID, add the existing title to its
grep, prove exactly three added profile cases with no omissions elsewhere, run
the six affected dev cases and existing verification contracts, then publish a
focused PR. No application, assertion, timeout, budget or routine profile change
is needed. Account for this extra dev coverage alongside the unchanged #263 full
run; never claim that the earlier run executed the later selector.

Follow-up source **`c508d6e`** is published on `branch/verify-map-disposer-coverage`.
Clean WSL checkout `/tmp/tactics-issue263-map-verification` uses the candidate's
unchanged 1.64.1 dependency tree through an ignored node_modules symlink.
All 38 selection/batch/orchestration contracts passed. Discovery records
`map-verification-selection.json` and `map-verification-comparison.json` prove
exactly three added dev disposer cases, all three prior placement cases retained,
and 14 other inventories unchanged. These reports/logs are under
`/tmp/tactics-issue263-evidence/`. After live session 98824 finishes, run the six
cases in this checkout with `PLAYWRIGHT_SERVER_MODE=dev` and the existing isolated
browser-cache variable. Then retain the proof and open its focused PR with base
`branch/issue-263-patched-webkit-runtime`. The browser cleanup contract recorded
above still needs execution. No local browser job should overlap session 98824.

The repair stays limited to the supported browser runtime and required device
compatibility. No application fallback, retries, save changes or custom native
library replacement is needed for the evidenced pre-application network fault.
The diagnostic PR remains independently reviewable. Do not close #263 or claim a
complete fix until the focused artifacts and complete full-run gate are audited.

**2026-11-02 continuation:** qualified ordinary runs **41349975828** and
**41356666822** reproduced the missing-screen stall. Their bounded attachments
show prior-load cancellations followed by native **`WebKit encountered an internal
error`** failures for the new document's entry/static dependencies. Application
initialization never starts. Reuse/remote-browser/PWDEBUG flags are false. The
runtime repair candidate is **Playwright 1.64.1**, whose inspected official WebKit
2370 bundle contains fixed libsoup 3.6.6; old local and qualified bundles contain
3.6.5. The specific upstream native defect is a supported inference, not a claim
that a security reproducer was executed. See the new QA section for archive hashes,
reports and exact failed/passed/incomplete counts.

The old-runtime debug run **41358705036** completed successfully (90 prefix + 60
traced cases). Earlier cancelled/pending/live notes below are historical; the
current candidate/full run handles are recorded above. The temporary CI branch
advanced from `f30e65e` to **`3f93ce3`** to pin candidate `e3e9ebf` and record its
active WebKit executable. Additional local transfer/cancellation controls and both
54-case exact-runtime observer/control selections passed without reproducing the
host fault. The next work is to audit the qualified candidate artifacts and full
acceptance, preserve final-source evidence, and finish the review handoff.

- Diagnostic PR [#264](https://github.com/luminari-gurus/tactics-guru-v2/pull/264)
  is open and non-draft. Main advanced when #256 merged to `78a3f75`; integrated
  cleanly and pushed as **`cdc39cf`**. This PR adds bounded test failure evidence;
  it changes no application, asset, dependency, build or browser configuration.
- OpenSpec change `issue-263-webkit-reload-boot` is **4/8 complete**: original
  evidence recovery (1.1), causal pre-application native request-failure witness
  (1.2), diagnostic publication (1.3), and the supported runtime repair with the
  retained before/after stair regression witness (2.1). Repair integration proof
  (2.2), full acceptance (3.1), final project handoff (3.2), and the separately
  found dev-selector omission (3.3) remain open. Use live `openspec instructions apply`
  for exact task locations before changing checkboxes.
- Final diagnostic code `495d08d` is unchanged by main integration. On clean
  **`cdc39cf`**, build/content/both types passed; ordinary root-preview exploration
  passed **54/54 WebKit and 54/54 Chromium**, one worker, no retries/skips.
  Both matrices preserve the original selected IDs/titles. The byte-unchanged
  two-engine privacy/bounds contract and final helper typecheck also pass.
  [QA](../qa/issue-263/README.md), manifests and `integrated-source.json` retain
  source/build/browser/mode identities and all earlier attempts.
- A traced combined-tree attempt had 53 WebKit passes and one 250-floor budget
  failure (3421ms vs unchanged 2500ms). Its attachment shows boot ready at 384ms,
  styles loaded and no request/page error: a different symptom from #263.
  **Literal main `78a3f75`** reproduced the same assertion on one of three traced
  repetitions (3757ms); all three ordinary repetitions passed. Keep both failed
  traced attempts separately; no limit/assertion was relaxed and neither failure
  establishes #263's cause.
- Original archive: WSL `/tmp/tactics-issue263-evidence/original-41320149918.zip`,
  590,452,011 bytes, SHA-256
  `9f8726d2adcb007beeb6ece633d3bc6dba83b8467fb0d62de2849fba047b61dc`.
  Selected CRC-validated reports, error context and pre-failure screenshot are
  committed under `docs/qa/issue-263/`. Original failure: missing screen for 60s
  during a later locked-stair fixture load, after successful round-trip travel.
  The artifact has no failure trace or request/exception ledger.
- Local exact-runtime checkout `/tmp/tactics-issue263-failing` is pinned to
  `9b543cb`. Original build/browser checks passed; desktop WASD 5/5, all stair
  inputs/profiles repeated five times 60/60, and 300 goto/reload pairs passed.
  Some passing navigations cancelled an unfinished `items` module request;
  cancellation is observed but not sufficient to establish the stall.
- A corrected bounded cached-stylesheet probe found no synchronous/missing load
  events in 2,000 insertions. Its first event-checkpoint mistake and correction
  are retained in QA. Original/local exact-runtime build logs have matching sets
  of 28 generated JS/CSS names, without an original served-byte comparison.
- The native module parser inspected all 22 exact-runtime JS chunks without
  evaluation: no static import cycle, no dependency importing the entry, and
  no top-level await in the dungeon route's static closure. The graph is retained
  in QA. Loading/native import or synchronous initialization still need actual
  failure evidence; no source-level wait-cycle repair is justified by this graph.
- Other checkouts: `/tmp/tactics-issue263-main` (older diagnostic qualification),
  `/tmp/tactics-issue263-integrated` (clean tested `cdc39cf`), and
  `/tmp/tactics-issue263-current-base` (literal `78a3f75` comparison). Common logs,
  reports and traces are under `/tmp/tactics-issue263-evidence/`. All local checks
  above are terminal; do not poll old exec handles as live.
- Runner attempt **41343197332 was cancelled while pending, zero jobs executed**.
  It supplies no evidence. At last read, another owner's full capture
  **41337233629** was in progress and browser setup **41344487694** was pending.
  Recheck those specific runs and the queue; submit ours only when it will not
  replace another pending request. A live queued/running job is a verified wait,
  not a reason to restart it.
- Temporary CI branch `branch/issue-263-runner-diagnosis` is pushed at **`4d4fd5b`**,
  separate from #264. Its native worktree is `tmp/issue263-runner-worktree`.
  Dispatch existing `browser-setup.yml` on that branch when the queue permits.
  It checks out exact failed runtime `9b543cb`, overlays only the observer/one test
  import, records hashes and builds, then runs original WebKit exploration order
  **untraced** (preserving the embedded budget check) followed by five stair
  repetitions with failure traces. One worker, zero retries, exclusive lock and
  a two-failure diagnostic stop are explicit; partial runs cannot satisfy final
  acceptance. Never introduce a hosted fallback or interrupt another owner's job.
- Use native Git for checkout/commit/worktrees. Authenticated WSL network Git works
  from the primary checkout; Windows worktree `.git` pointers cannot be read by
  WSL Git. Push the CI branch from the primary repository using its explicit ref.
- Next: refresh runner/PR/main state, resubmit the bounded diagnosis when safe,
  recover any failure attachment/trace and identify the owning boot cause.
  Stack a focused repair PR on #264 when ready. Preserve #257/#258 separately
  unless evidence connects their causes. Then fulfill the original full-run gate.
  User authorization includes implementation, fixes, commits/pushes and focused
  review-ready PRs; it does not request merging, deployment or a release tag.

- Issue: [#263](https://github.com/luminari-gurus/tactics-guru-v2/issues/263).
- Assignee: `moshehbenavraham`, verified through the connected GitHub account and CLI.
- [Pickup comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/263#issuecomment-6562475276).
- Base: fetched `origin/main`, `a8b87c199fb2ae171a9bb72961ac7114622c4d60`.
- Work branch: [branch/issue-263-webkit-reload-boot](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-263-webkit-reload-boot),
  created from the base above using GitHub's native linked-branch operation for
  #263. Development association: `LB_kwDPAAAAAW6Z0HjOAQNTDQ`.
- Related work: [#153 / PR #256](https://github.com/luminari-gurus/tactics-guru-v2/pull/256),
  [#257](https://github.com/luminari-gurus/tactics-guru-v2/issues/257), and
  [#258](https://github.com/luminari-gurus/tactics-guru-v2/issues/258).
  Their owners and remaining acceptance stay with those trackers.
- Previous root plan: [Goblin Shaman #166](issue-166-goblin-shaman-plan.md),
  preserved byte-for-byte; SHA-256
  `aee5f94a745a9424eb26bcec41ca2900e823152d4f4eabc93ceba975fa5b02a1`,
  Git blob `0bb94476c1db94b1fc3ffcd21696e8718125bb26`.
  Its three specific backlinks are updated; general current-project links still
  point here.

## Selection and available work

Reviewed all **33 open issues and four open PRs**, including issue bodies,
ownership, dependencies, active branches, relevant comments and unfinished
OpenSpec performance-qualification work. REST pagination and GraphQL agree on the
issue count; GraphQL has no next page. Repository, organization and authenticated
user Projects v2 inventories each contain zero projects; no open issue has project
membership or an existing linked branch at this pickup snapshot. No additional
project draft items were exposed by those inventories. The `ready for work` label
was not an eligibility filter, and #263 has only `bug`.

**Choose #263 for immediate reliability and delivery value.** It is unassigned,
has a concrete recurring failure across WebKit desktop/portrait/landscape, and
blocks acceptance of the main-menu work. A reported 60-second stall survived an
existing readiness mitigation. Diagnosing it now also improves the quality of
future save/lifecycle verification. This is a priority judgment, not a claim that
the issue has a P1 label or that its cause is already known.

The rest of the backlog was considered as follows:

- #257 and #258 are the closest alternatives: older runner-readiness and route
  module-load failures. Their original reports lack the decisive underlying
  exception/request evidence. Compare symptoms during #263, but do not assume a
  shared cause or silently expand this issue into all startup failures.
- #167 is the strongest next high-priority combat feature; #168/#169 follow with
  charge/stacking or typed-damage/Graveyard policy. #170 is an epic and #171 needs
  hazard-ordering coordination. They remain useful after the current boot blocker.
- #172/#173/#174/#175 have real gameplay value but still need bounded item,
  acquisition, reward or currency decisions. #176 needs record-boundary policy;
  #184 needs generation-equivalence/determinism decisions. #261/#262 need visibility
  or visual-treatment decisions. #185 explicitly defers implementation until its
  class-stat mapping is resolved. None outranks the observed reliability defect now.
- #178/#179/#180/#181/#182 are independent lower-priority presentation, history,
  audio or developer-tool work. Their readiness labels do not establish greater
  urgency than a failing boot/continuation path.
- #85/#128/#153/#161/#162/#200/#208/#219/#254 already belong to `dubstylee`.
  #153 has PR #256 and #254 has PR #260. #208 is blocked on isolated runner
  capacity; #200 is baseline acceptance, not unclaimed tooling implementation.
  #161/#162 are incremental/umbrella work with delivered consumers. Preserve those
  owners and their actual open criteria, including any stale bookkeeping.
- #259 is explicitly blocked by #153/#256 and changes persistence policy; taking
  it now would mix a separate behavior change into unresolved menu integration.
  #199 is the DevOps epic, with child work already implemented or separately owned.
  Outstanding #127 OpenSpec performance qualification is retained as existing work,
  rather than used to launch another unrelated performance campaign.
- PR #237 is a separate design-only combat UI draft. PR #12 is an unselected
  release/SSH draft with explicit operator boundaries. Neither is a new pickup.

## Evidence and implementation boundary

The issue reports [run 41320149918](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41320149918)
at **`9b543cbafecf1cce48f966ff1d8998a46a7ae32d`**, with a desktop-WebKit `wasd`
stairs reload timeout after 60 seconds, 98 passing exploration cases and the
other 18 stages passing. Earlier portrait/landscape failures are recorded on the
issue. The Actions API confirms this exact run SHA, failed conclusion and an
unexpired `full-verify-41320149918-1` artifact (ID `13093858052`, about 590 MB).
Detailed failure claims above come from the issue; this planning pass has not
downloaded/reanalyzed the full artifact or reproduced the failure.

Read the exact failing revision and the current PR #256 branch before diagnosis;
the inspected current PR head is `c2e3c56f9752789bc77bf05946d4852c83d6cbc0`.
Main does not yet contain its `whenGameReady`, `data-boot` or shared Continue wait.
Use isolated diagnostic checkouts of the failing revision, literal main and the
integration candidate. Keep this branch based on main; do not import the whole
menu PR or change another owner's branch. If the defect needs menu-only code,
record that dependency and carry the smallest repair through reviewable integration.
Recheck those refs at implementation time because both PRs are active.

The traced boot path is `index.html`'s module entry → static entry imports and
route selection in `src/main.ts` → dynamic `startDungeonApp` import and its static
dependencies → session/screen construction → Phaser startup → saved continuation.
`startDungeonApp.ts` imports `BattleScene` and `phaser/start.ts`, whose static graph
imports Phaser and other scenes. A missing dungeon screen narrows the observation
to before its append; it does **not** identify a specific import, engine bug,
network failure, clock issue or save defect. The main catch handles rejected
imports, while a promise that never settles may leave the original Loading shell.
Dungeon telemetry is intentionally disabled, and `reportFailure` without a bound
sink is insufficient evidence capture for this case.

**Outcome:** identify and fix the cause of WebKit's post-reload boot stall; retain
saved progress and normal recovery; pass WebKit exploration in a complete
full-verification run across all three WebKit profiles, as #263 requires.

**Non-goals:** menu design, testing-route save isolation (#259), enemy behavior,
combat/content changes, save-format migration, new telemetry collection, a new
boot framework, dependency upgrades without a demonstrated cause, or deployment.

## Ablation: smallest complete approach

- Keep browser-side failure evidence installed before navigation: failed requests,
  HTTP failures, page/console errors, boot milestones and a bounded shell snapshot.
  Install it outside the suspect route graph where necessary; late diagnostics
  inside a module that never executes cannot distinguish this failure.
- Reuse existing Playwright attachments, tracing, diagnostics/build identity and
  verification receipts. Record only bounded allowlisted paths/status/timing and
  sanitized errors; do not attach arbitrary storage, full URLs with query secrets,
  save payloads or unrestricted console dumps. Synthetic-save hashes can prove
  retention without exposing player data. Add runtime diagnostics only if the
  reproduced failure demonstrates a persistent consumer for them.
- Retain the current recovery message and save-preservation contract. Select the
  code fix from evidence: network/module evaluation, initialization lifecycle,
  engine readiness or a test-clock interaction remain hypotheses. If it is a
  harness defect, repair that cause and prove production reload still works.
- Drop timeout increases, automatic reload/import retries, skipped assertions,
  profile removal, duplicate startup paths, global telemetry enablement and general
  performance cleanup as proposed solutions. They do not establish root cause.
- Keep full qualification because #263 explicitly requires it. Use focused cases
  during diagnosis; one successful repetition or an old passing full run cannot
  establish this issue's acceptance.

**Files:** likely owners are `src/main.ts`, `src/app/startDungeonApp.ts`,
`src/phaser/start.ts`, `tests/dungeon-exploration.spec.ts` and
`tests/helpers/dungeonTraversal.ts`. Inspect `src/app/startBattleApp.ts`,
`src/app/startRunApp.ts`, `src/phaser/BattleScene.ts`, `src/diagnostics/browser.ts`,
`index.html` and `vite.config.ts` as transitive consumers or diagnostic seams;
edit only owners justified by the identified cause. Extend existing boot,
loading/lifecycle and relevant unit tests rather than adding a parallel harness.
Record resulting evidence under `docs/qa/issue-263/README.md` during implementation;
update owning boot/lifecycle documentation and this plan with the actual result.

## Implementation sequence and proof

1. **Preserve and diagnose.** Recover the original artifact, failing trace/report,
   test identity and screenshot before runs expire. Record source/build/browser,
   runner, base path/server mode, cache, worker/retry settings and host conditions.
   Attach bounded diagnostics before the first navigation and preserve every failed
   attempt. Distinguish entry-script fetch, module evaluation/route import, dungeon
   mount, Phaser READY and Continue/save admission. Check clock state across reload
   without presuming it caused this failure. Compare exact failing source and
   literal main under matching conditions where attribution is needed.
2. **Reproduce and fix the owning cause.** Start with desktop-WebKit `wasd` and
   portrait `compass`, then all four stair inputs on all three WebKit profiles.
   Use one worker, no retries and a recorded finite repeat count (initially five
   per affected case), with cold contexts and warm/repeated reloads. If repeats
   pass without capturing the cause, retain the uncertainty and refine the
   specific diagnostic boundary; do not mark the issue fixed. Add a causal
   regression witness and apply the smallest evidenced fix. Preserve original
   assertions and input, save, RNG and floor-travel semantics.
3. **Prove continuation and shared consumers.** Verify saved dungeon Continue,
   stair descent/ascent and inert arrival, exact reload state, corrupt/unavailable
   save recovery and a legal battle continuation. Trace any changed shared entry,
   engine or lifecycle code through standalone battle, run, proof, map and menu
   consumers. Check root/prefix and preview/dev where the changed boundary is used.
   Include hidden-page/BFCache/audio initialization when lifecycle ownership changes.
   Injected request failures prove recovery, not reproduction of the original bug.
4. **Qualify and hand off.** Run the full inventory on the final integration
   candidate; require the complete WebKit exploration matrix without post-reload
   boot timeouts. Retain all prior failures, skips and incomplete runs separately.
   Publish a focused implementation PR with cause, regression proof, integration
   dependency, source-bound results and limitations. Use `Closes #263` only when
   both issue criteria hold. Cross-reference #257/#258 only to the extent evidence
   establishes a relationship; their separate acceptance is not waived.

## Verification commands and acceptance

Planning/publication is **documentation-only** under
[verification-policy.md](../verification-policy.md): validate links, paths,
commands/config selection, archive bytes, diff scope, assignment, native branch
association and local/remote commit parity. No runtime fix or browser execution
is claimed by this plan commit.

Focused implementation commands, from a supported Node/npm environment:

```sh
npm ci
npm run build
npx --no-install playwright test -c playwright.exploration.config.ts tests/dungeon-exploration.spec.ts --project=desktop-webkit -g 'stairs travel once per entry with wasd' --repeat-each=5 --retries=0
npx --no-install playwright test -c playwright.exploration.config.ts tests/dungeon-exploration.spec.ts -g 'stairs travel once per entry' --retries=0
npx --no-install playwright test tests/dungeon-exploration.spec.ts tests/dungeon-lifecycle.spec.ts tests/dungeon.spec.ts --retries=0
npm run verify:full -- --list
```

Discover each selection with `--list` before execution and record exact test IDs.
Add only the existing consumer-specific checks the diagnosed patch needs; select
unit owners after identifying the cause. Both TypeScript scopes/content validation
are included in `npm run build`. Preserve build-input identity and separate
preview/dev, root/prefix and configured telemetry results.

**Final tier: full regression**, required explicitly by #263 and potentially by
the shared startup/lifecycle seam. `npm run verify:full` accounts for all 19 stages;
the current source also has separate extended dungeon journeys via
`npm run test:extended` and `npm run test:extended:webkit`. Account for those
consumers when a shared boot change reaches them. On self-hosted Actions use the
existing `issue-200-baseline.yml` `capture` workflow and complete serial receipt
ledger where appropriate, with exact source/build identity and all stages present.
Do not substitute a partial green rerun for the issue's complete full-run gate.
Re-inventory selection against the final integrated source.

Keep `[self-hosted, tactics-browser]`, `tactics-browser-exclusive`, one browser
worker and serial GPU/performance use. No automatic GitHub-hosted fallback.
Playwright desktop and emulated portrait/landscape satisfy device acceptance under
AGENTS.md; physical hardware is not required or claimed. Preserve useful prior
evidence only when its relevant inputs are unchanged and provenance is available.

## Planning validation

Planning validation: full-stage discovery lists 19 stages; direct installed
Playwright CLI discovery selects five repetitions of the desktop-WebKit `wasd`
case, all 12 WebKit stairs cases, and 99 Chromium cases across the three named
dungeon files. These checks discover selection without starting servers or
browsers; they do not reproduce the defect or qualify runtime behavior. Archive
SHA-256 and Git blob match the previous root plan. Local-link/path validation,
`git diff --check` and final branch/assignment/remote readback complete publication.

## Estimate for my implementation

**6–10 hours of my elapsed working time after implementation starts**: roughly
2–4 hours to recover evidence/reproduce/isolate the cause, 1–2 hours for the repair
and causal regression, and 3–4 hours for focused integration checks, full serial
qualification and evidence/PR handoff (some work overlaps). The latest reported
full capture itself occupied about 2 hours 24 minutes, so qualification is a
material part of this estimate.

Allow **12–16 hours** if the intermittent stall needs a new causal witness,
menu integration moves substantially, or an engine-level repair is required.
Runner queue/offline waits, external review, merge and deployment are excluded.
This is my execution estimate, not a human engineer estimate or a guaranteed
deadline. Until a causal witness exists, the diagnostic portion is uncertain.
