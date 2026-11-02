# Issue #263: Reliable WebKit boot after dungeon reload

Started: 2026-11-01 (Asia/Jerusalem). Status: implementation qualified; supplemental review and ordered merge in progress.

**Active follow-up branch:** `branch/verification-proof-cleanup-route`, stacked
on selector PR #266 (`branch/verify-map-disposer-coverage`). PR #266 is stacked on
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

## Supplemental review and merge closeout

The caller now authorizes comprehensive supplemental review, repair of every
substantiated review finding, and end-to-end Git management and merging of
#264 → #265 → #266 → #267. This supersedes the original unmerged handoff below.
Using OpenSpec change `issue-263-webkit-reload-boot` and the ablation skill.

**Outcome / non-goals / files / proof:** review all four exact diffs, prior
reviews and affected consumers; repair confirmed defects, publish the review,
then merge in order and prove trees, parents, issue closure and remote parity.
The only code repair is the Chromium project in the generated startup contract,
`tests/tooling/browser-diagnostics.test.mjs`. Preserve application behavior,
diagnostic helper, assertions and existing acceptance limits. No deployment,
release tag, unrelated issue work or repeated full regression is needed.

The existing P2 finding on #264 is reproduced: an override-only browser cache
causes the contract to request a missing default headless shell despite a valid
`PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Commit `d90a294` selects full Chromium and
forwards that override only to its Chromium project. Both diagnostic contracts
pass with an override-only cache on Playwright 1.63.0 and 1.64.1; the startup
contract also passes with default selection. WebKit stays independent. The
existing review thread is answered and resolved. No additional actionable code
defect was found by the supplemental review.

Fresh review independently verifies all 194 existing canonical evidence payload
hashes and the complete full-artifact SHA-256. Its actual reports account for
19 passing stages, 1,440 browser passes, twelve intentional skips, one worker,
zero retries and no missing/duplicated case IDs. The original native failures
are read back from their base64 startup attachments in the retained ZIP.
The only later code owners versus `e3e9ebf` are the already qualified selector,
cleanup fixture and now-qualified diagnostic contract. Application, helper,
ordinary specs, assets, dependencies and browser configs still match.

Merge commits preserve the dependent ancestry without rewriting published
history. Carry the contract fix through the stack; recheck live reviews, branch
rules and exact base/head before each merge, compare `merge-tree` with the
published tree and verify parent order. Retarget each remaining PR to main after
its parent merges. Remove completed branch refs only after proving ancestry;
retain the separate historical runner-diagnosis branch/worktree and raw evidence.
Update this section with the final merge commits and parity after completion.

## Original implementation handoff (before merge authorization)

Updated 2026-11-02 (Asia/Jerusalem). **Implementation, functional acceptance and
PR/Git handoff are complete; no CI, browser or download process
from this goal is live.**

Review order, with independently published chunks:

1. [PR #264](https://github.com/luminari-gurus/tactics-guru-v2/pull/264): bounded
   failure diagnostics; tested diagnostic code `495d08d`, integrated with main as
   `cdc39cf`. This PR does not close #263.
2. [PR #265](https://github.com/luminari-gurus/tactics-guru-v2/pull/265): supported
   Playwright 1.64.1 runtime repair, tested clean code `e3e9ebf`. It owns #263's
   Development/closing association.
3. [PR #266](https://github.com/luminari-gurus/tactics-guru-v2/pull/266): the
   independently found dev-selector omission, tested `c508d6e`.
4. [PR #267](https://github.com/luminari-gurus/tactics-guru-v2/pull/267): the
   independently found cleanup-fixture route error, tested `9a8e577`.

The active checkout is `branch/verification-proof-cleanup-route`. All four PRs
were verified open, non-draft and mergeable. Main is `78a3f75`; #256's menu work
is integrated. #263 remains open and assigned to `moshehbenavraham`. The original
native branch link became a closing reference on #264 when that PR opened; it
was moved to #265 so diagnostic-only merge cannot close the issue.

**Cause and minimal repair.** Ordinary qualified runs 41349975828 and
41356666822 captured native `WebKit encountered an internal error` failures for
the new document's entry/static dependencies, before application initialization.
Both old bundles contain libsoup 3.6.5; the official 1.64.1 WebKit 2370 GTK/WPE
bundles contain 3.6.6. The owning observed fault is native networking before
entry execution. Attribution to the exact upstream memory defect remains an
inference, not a native-stack or external-security-reproducer claim. The repair
changes the supported runtime and necessary device compatibility; application
rules, saves, assertions, timeouts, budgets and retries are unchanged.

**Completed proof:**

- Clean `e3e9ebf` locked install, browser preflight, content/build and both type
  scopes pass. Qualified run 41361259848 passes 90 ordinary prefix cases and
  60 traced stair repetitions, with zero skips/retries. Its inventories confirm
  fixed libsoup 3.6.6 on the actual qualified runner.
- Full run [41362013777](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41362013777),
  job 125015648051, passes all 19 configured stages at clean `e3e9ebf`.
  Artifact 13110492448 contains 585,086,035 bytes; the complete local archive
  matches API SHA-256
  `d9556fe6dd8a807940f324fbb27234579b44f9be491c3fbfebc0f6c693707865`.
  Selected ZIP entries passed CRC checks. A failed initial transfer was resumed;
  no test run was restarted or relabeled.
- Full reports prove 1,440 browser passes, zero unexpected/flaky outcomes or
  retries, and twelve intentional mode-specific skips with passing counterparts.
  WebKit exploration is 99/99, exactly 33 per profile. All twelve stair
  input/profile cases pass reload restoration, arrival and lock assertions.
  WebKit acceptance is 94/94. All 1,103 units, both type scopes, both build-header
  integration cases, root/prefix builds, fixtures, health bars, telemetry modes,
  asset modes and root restoration pass.
- The isolated 18-sample proof performance capture passes its existing evaluator
  with no capture failures or metric violations. Legacy non-gating dungeon
  code-size/WebKit frame advisories remain in QA and owner-deferred #127 work;
  this does not claim all dungeon FPS budgets or a performance improvement.
- All 18 legal extended journeys pass: nine Chromium and nine WebKit, covering
  Mage/Ranger/Fighter and all three profiles, with no failures/skips/retries.
  Two-engine real-Phaser setup smoke also passes 2/2 on `e3e9ebf`.
- Runtime before/after discovery preserves all 1,541 cases across 15 inventories.
  Six actual-browser profile probes preserve viewport/effective screen/touch/DPR.
  The new dev selector adds exactly three disposer cases with no omissions and
  fourteen other inventories unchanged; all six affected dev cases and 38
  verification contracts pass. Both diagnostic contracts and 20 timing/reporter/
  process contracts also pass.
- The corrected cleanup fixture passes both real-browser preview/dev contracts:
  rendered canvas, deliberate 20-second interruption, complete owned-process
  cleanup and fresh same-port recovery. Its original menu/canvas failures remain
  retained. `cleanup-source.json.gz` records the known build-link input: preview
  reuses clean `e3e9ebf`, all 115 build-file hashes match, and dev's dirty metadata
  flag was not consumed by these lifecycle assertions. The artifact link is now
  locally excluded; tracked tested code is unchanged.

**Source-aware reuse.** The full run really executed `e3e9ebf` with its original
three-case dev selector. The final tracked application/public files, build
configuration, package/lock files and ordinary specs are unchanged. The only
later verification owners are the selector and synthetic cleanup fixture, each
freshly qualified above. `final-source-equivalence.json.gz` and the exact skip
mapping account for that union under verification-policy.md. No later Git
build-info identity is claimed as a newly built bundle, exact-byte cache result
or new performance measurement.

All detailed source/build/browser/mode identities, hashes, raw reports, failed
and incomplete attempts, baseline comparisons and remaining limitations are in
[QA](../qa/issue-263/README.md) and its evidence manifest. This includes the
original 60-second missing-screen failure, the earlier heading-only failure,
old-runtime successful controls, traced budget failures and corrected probes.
The original archive hash is
`9f8726d2adcb007beeb6ece633d3bc6dba83b8467fb0d62de2849fba047b61dc`.

**Completed workflow:** OpenSpec `issue-263-webkit-reload-boot` is 9/9 complete.
Evidence/handoff and final PR descriptions are published. Git/remote parity,
issue ownership/closure links, clean worktrees and review readiness are verified.
Review the stack in the order above.
At this original handoff, merging was not yet authorized. The later authorization
above controls the current review/merge work. Deployment, release tagging and
OpenSpec archiving remain separate; do not close #263 before its repair merges
or repeat qualified tests for prose-only follow-ups. Preserve #257/#258 separately
unless evidence establishes their cause.

Useful local evidence is `/tmp/tactics-issue263-evidence/`; the audited full ZIP
is `full-41362013777.zip`, with extracted selected reports in `full-41362013777/`.
Current functional checkouts are `/tmp/tactics-issue263-candidate` (`e3e9ebf`)
and `/tmp/tactics-issue263-map-verification` (`9a8e577`). Both browser and transfer
exec handles are terminal. The executed audit helper is
`tmp/issue263/audit-full-candidate.py`; its result was checked against raw
summary, case attempts, skip guards, recovery/stair witnesses and performance
evaluation. Historical CI branch `branch/issue-263-runner-diagnosis` is at
`3f93ce3` in `tmp/issue263-runner-worktree`; do not redispatch it as completion
verification. Use native Git for Windows checkout/commit/worktrees and WSL
network Git from the primary repository; Windows worktree pointers are invalid
to WSL Git.

Pickup metadata: original base `a8b87c199fb2ae171a9bb72961ac7114622c4d60`,
[pickup comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/263#issuecomment-6562475276),
original native association `LB_kwDPAAAAAW6Z0HjOAQNTDQ`. The previous
[Goblin Shaman plan](issue-166-goblin-shaman-plan.md) remains byte-for-byte
preserved: raw SHA-256
`aee5f94a745a9424eb26bcec41ca2900e823152d4f4eabc93ceba975fa5b02a1`,
Git blob `0bb94476c1db94b1fc3ffcd21696e8718125bb26`; its three specific backlinks
were updated. The original pickup/acceptance plan below is historical context,
not a replacement for this current handoff.

## Selection and available work

This section records the initial 2026-11-01 pickup snapshot; current ownership,
branches and implementation status are in the handoff above.

Reviewed all **33 open issues and four open PRs**, including issue bodies,
ownership, dependencies, active branches, relevant comments and unfinished
OpenSpec performance-qualification work. REST pagination and GraphQL agree on the
issue count; GraphQL has no next page. Repository, organization and authenticated
user Projects v2 inventories each contain zero projects; no open issue has project
membership or an existing linked branch at this pickup snapshot. No additional
project draft items were exposed by those inventories. The `ready for work` label
was not an eligibility filter, and #263 has only `bug`.

**Chose #263 for immediate reliability and delivery value.** It was unassigned,
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

The following is the original planning baseline, retained with its acceptance
requirements. PR #256 has since merged into main and the artifacts have been
recovered; use the current handoff and QA for implementation state.

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
