# Issue #263: Reliable WebKit boot after dungeon reload

Started: 2026-11-01 (Asia/Jerusalem). Status: implementation active; evidence recovery and causal diagnosis.

## Current implementation handoff

- User authorized implementation, autonomous issue resolution, commits/pushes and
  focused review-ready PRs on 2026-11-01. No merge, deployment or release tag is
  requested. Use OpenSpec change `issue-263-webkit-reload-boot` (spec-driven).
- Initial refresh: worktree clean at planning commit `25fca08`; main still
  `a8b87c1`, PR #256 open at `c2e3c56`, #263 open and assigned to us.
- Exact failed artifact recovery (session `54966`), destination
  WSL `/tmp/tactics-issue263-evidence/original-41320149918.zip` **completed**:
  590,452,011 bytes, SHA-256
  `9f8726d2adcb007beeb6ece633d3bc6dba83b8467fb0d62de2849fba047b61dc`.
  Selected CRC-validated reports/error context and the pre-failure screenshot are
  preserved in `docs/qa/issue-263/` with an evidence manifest; no original trace
  or request/exception ledger exists. Task 1.1 is complete.
- Isolated exact-failure checkout/build (session `19248`) completed at WSL
  `/tmp/tactics-issue263-failing`, source `9b543cb`. Install/build logs are in
  `/tmp/tactics-issue263-evidence/`. Native Git remains authoritative for commits
  in the Windows checkout; use authenticated WSL Git for network operations.
- The qualified `unraid-tactics-01` runner is online but was busy at refresh.
  Do not interrupt another owner's job or run concurrent browser jobs there.
- Cause remains unknown. No runtime behavior, test assertion or timeout changed.
  The OpenSpec proposal/spec/design/tasks capture the existing acceptance before
  diagnosis. Use `openspec instructions apply --change issue-263-webkit-reload-boot
  --json` for live task locations and progress.
- OpenSpec artifacts validated and pushed in `f16cd5a`; apply is ready, **0/6**
  tasks complete. [Current QA record](../qa/issue-263/README.md) retains progress.
- Local exact-runtime build/browser qualification passed. Diagnostic-only tests:
  desktop WASD **5/5** (27.2s), all 12 WebKit stair/input/profile combinations
  repeated five times **60/60** (4.9m), no retries/skips. These passes do not
  reproduce the reported failure. Some passing navigations cancelled an unfinished
  `items` module request, so cancellation is observed but not established as cause.
- Bounded 300-pair goto/reload probe **passed** (2.1m). Its initial zero-test config
  mistake is retained separately. No blanket retry/application change was introduced.
- Original failure is a later locked-stair fixture load (`tests/dungeon-exploration.spec.ts:124`),
  after successful round-trip travel. The missing screen is confirmed, cause unknown.
- First independent chunk adds bounded pre-navigation failure diagnostics to the
  existing exploration tests; it does not fix boot or change test selection.
  A synthetic two-engine privacy/bounds contract and local main-source real stairs
  qualification are active in session `89668`. Main-source diagnostic checkout is
  `/tmp/tactics-issue263-main`; its lockfile matches the exact-failure checkout.
  OpenSpec now separates diagnostic publication (1.3) from the causal witness.
- Initial diagnostic main-source qualification: build/content/both types pass;
  exact selection unchanged (54 cases per engine); WebKit stairs 12/12 and
  Chromium exploration 54/54 pass. Final privacy contract/typecheck pass after
  filtering was tightened; complete final-helper positive checks remain active
  in session `70802` (42 WebKit non-stair cases), then finish both matrices.
- Final-helper checks have now completed: Chromium exploration **54/54**, WebKit
  **42 non-stair + 12 stair = 54/54**, zero retries/skips; final privacy contract
  and typecheck pass. Inputs/reports are in the QA manifest and
  `docs/qa/issue-263/diagnostic-source.json`. No runtime/build/dependency input
  changes occurred. The diagnostic code is committed/pushed at **`495d08d`**.
- Exact-runtime qualified-runner diagnosis is **pending**, run **41343197332**
  ([Actions](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41343197332)),
  temporary branch `branch/issue-263-runner-diagnosis` at `508f1b6`. It shares the
  exclusive lock behind existing full run 41337233629. Re-poll those actual run
  IDs; do not restart a live queued job or interrupt another owner's capture.
  The temporary CI branch is separate from this implementation/review branch.

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
