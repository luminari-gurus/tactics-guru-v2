# Issue #205: reduce repeated full-battle audio equivalence testing

Date: 2026-10-23 (Asia/Jerusalem). Status: implementation authorized and started.
The caller requested end-to-end implementation, OpenSpec tracking, proportional
verification and review-ready publication. No merge or deployment is authorized.

## Current continuation state

- Working from planning commit `34b7c72`, on the requested branch; refreshed
  `origin/main` remains `b749ba4`. PR #228 remains separate and unchanged.
- Using OpenSpec change `issue-205-audio-equivalence` (spec-driven, skip_specs:
  true): [tasks](../../openspec/changes/issue-205-audio-equivalence/tasks.md).
  The caller's explicit OpenSpec request supersedes the earlier no-ledger decision.
- Original 54 audio selections confirmed. Chromium 153.0.8010.12 and WebKit 26.6
  launch preflight passed locally under WSL/Node 24.15.0. Local qualification is
  distinct from the registered `unraid-tactics-01` CI runner; no CI dispatched.
- Locked Linux dependencies installed; build passed 221 content checks, both
  type scopes and production bundling. Two-engine Phaser smoke passed 2/2;
  original audio units passed. Preserve the two initial setup-failure logs.
- Original browser baseline passed 54/54, including landscape: 780,826 ms runner,
  797,196 ms wrapper wall; zero retries/skips/failures. Bundle unchanged. Only
  the two non-executed unit files changed during that capture; browser inputs
  were frozen. The raw receipt includes before/after hashes.
- The mapper-only seeded loop is consolidated into the real-adapter fake-host
  tests for both outcome seeds. Audio units pass 29/29; session/save compatibility
  and both TypeScript scopes pass. Per-file audio unit cost added about 486 ms.
- First unit proof chunk is ready for commit/push/review. Next: replace browser
  repetitions, run targeted new cases, then final affected audio/WebKit/consumer
  qualification and comparison. No app/shared-helper/config changes. Raw receipts:
  `tmp/verification/issue-205/`; durable mapping/results will live in
  `docs/qa/issue-205-audio-equivalence.md`.

- Issue: [#205](https://github.com/luminari-gurus/tactics-guru-v2/issues/205), P1.
- Owner: `moshehbenavraham`; [kickoff comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/205#issuecomment-6362068879).
- Base: `main` at `b749ba40f358cf6fa0e8e9acb96f535c6362e938`.
- Work branch: [branch/issue-205-audio-equivalence](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-205-audio-equivalence),
  published from that base and natively linked in the issue's Development section.
- Coordination: [#199](https://github.com/luminari-gurus/tactics-guru-v2/issues/199)
  is the parent; [#200](https://github.com/luminari-gurus/tactics-guru-v2/issues/200)
  supplies partial timing evidence and stays open. [#208 / PR #228](https://github.com/luminari-gurus/tactics-guru-v2/pull/228)
  owns serial execution packaging separately.
- Previous root plan: [issue-220-preview-readiness-plan.md](issue-220-preview-readiness-plan.md),
  preserved byte-for-byte. Its historical PR/status statements remain historical;
  PRs #209, #224 and #225 have now merged. Its OpenSpec proposal links to that archive.

## Outcome

Reduce repeated browser work in `tests/battle-audio.spec.ts` while preserving every
existing gameplay-equivalence, cue-delivery, permission, failure, lifecycle and
save/replay obligation. Prove deterministic sound-on/off equivalence for both
original legal win/loss seeds at the session/audio boundary. Retain complete
audible browser win/loss journeys and focused real-browser comparisons. Measure
the affected workload before/after on matching qualified capacity, including the
currently incomplete landscape baseline. Report actual gains and remaining costs.

## Selection from the complete backlog

Reviewed all **41 open issue bodies**, labels, assignees, native blocked-by links,
Development links and project memberships; all **three open PRs**; and all **seven
remote branches**. The issue inventory has `hasNextPage: false`. Repository,
organization and authenticated-user Projects V2 inventories each contain zero
projects, so there are no accessible project-only draft work-items to select.
Relevant issue comments were checked. No readiness labels were changed.

#205 has no `ready for work` label, but its current body explicitly permits bounded
work from #200's completed per-case evidence. #201 is closed/integrated. The parent
epic and the incomplete monolithic baseline are not prerequisites to starting.
It was unassigned, had no comments or linked branch and had no competing PR when
claimed. Assignment and kickoff were read back. The selection considers all work,
not just labeled issues.

The source-bound [#200 investigation](../qa/issue-200/chromium-timeout-investigation.md)
records **611.3 seconds across 37 completed audio cases**, the second-largest file
cost, including a **161.8-second** passed desktop sound-on/off case. These are
historical measurements from a failed/incomplete aggregate, not fresh timings.
Current source still performs two full UI battles per outcome seed per Chromium
profile. This gives #205 a concrete reduction to test without changing the matrix
or conflicting with #208's job packaging.

Every open issue is accounted for:

- **Selected:** #205, bounded P1 audio-equivalence work with measured cost.
- **Owned:** #85 release operations, #123 / PR #139 HUD, #128 telemetry, #161
  effects, #162 ability picker, #200 timing/baseline and #219 cleanup are assigned
  to `dubstylee`. Some implementation is already on main; an open tracker does
  not mean its work should be duplicated or its acceptance is complete.
- **In flight:** #208 is unassigned but already covered by `dubstylee`'s PR #228.
  PR #12 is a separately held deployment alternative. Neither is available to claim.
- **Available alternatives:** #153 menu, #155 enemy movement, #160 progression,
  #172 combat items/revival, #176 records, #177 planning/undo, #179 log export,
  #181 presentation conveniences, #183 rules docs, #184 generators, #187 direct
  confirmation, #218 Guarded badge and #227 dungeon markers. #155's native #154
  blocker is closed. #160 is the strongest gameplay foundation but has broader
  save/projection implications. #218/#227 are useful bounded UI work with less
  measured feedback-loop impact.
- **Other actionable P1 verification work:** #203 matrix selection and #204 legal
  run fixtures now permit focused starts from partial #200 evidence. #203 changes
  shared coverage selection and needs a wider coverage audit; #204's measured
  file cost is 472.2 seconds. #205 has a larger observed file cost and narrower
  ownership than matrix redesign. None requires a successful repeat monolith
  just to begin planning.
- **Dependent or awaiting settled contracts:** #163-#169, #171, #173-#175 and
  #185 retain progression/effect/content or reward/currency requirements. Existing
  primitives do not by themselves finish their issue-specific acceptance.
- **Coordination epics:** #170 requires bounded biome-pack issues; #199 coordinates
  separate verification tasks. Neither is one implementation patch.
- **Adoption/destination decisions:** #178 rotation, #180 music/Settings and #182
  editor/practice retain explicit design choices and lower priority.

## Source findings and affected consumers

- [battle-audio.spec.ts](../../tests/battle-audio.spec.ts) currently discovers
  **18 cases per default project, 54 selections total**. Its final two cases run
  seeds 1/loss and 2/win twice, muted then enabled: **12 full UI battles** across
  desktop, portrait and landscape. They compare final session objects, replay
  state, zero muted playback, committed cues and required win-seed abilities.
- [battleCues.test.ts](../../tests/unit/battleCues.test.ts) already covers cue
  mapping, criticals, grouping, truncation and a paired legal **seed-2 victory**
  session loop. That loop calls the pure cue mapper, not the `BattleAudio`
  adapter, and does not cover the seed-1 defeat pair. Extend this boundary rather
  than presenting its current result as exhaustive adapter proof.
- [battleAudio.test.ts](../../tests/unit/battleAudio.test.ts) has an existing
  fake-host fixture for the real adapter, including muted/duplicate tokens,
  ordering, unlock refusal/timeouts, media failures, visibility, late callbacks
  and disposal. It can accept legal `BattleSession` presentation batches without
  loading Phaser or creating a new general test harness.
- [BattleSession](../../src/app/BattleSession.ts) resolves and freezes state/events
  before presentation, records commands and uses a token to acknowledge it.
  [BattleScene](../../src/phaser/BattleScene.ts) passes accepted events to audio
  before animation; animation completion acknowledges the session independently.
  [BattleAudio](../../src/phaser/BattleAudio.ts) has no command-dispatch callback.
  These observations support the proposed split; browser integration still needs
  real gesture/playback proof.
- [saveEnvelope.ts](../../src/domain/saveEnvelope.ts) canonically encodes accepted
  state. Compare encoded bytes, replay/events and command/RNG state at the legal
  checkpoints rather than inventing snapshots or adding production test hooks.
- [battlePolicy.ts](../../tests/helpers/battlePolicy.ts) and
  [playerPolicy.ts](../../tests/helpers/playerPolicy.ts) supply existing legal
  choices and real-control execution. Reuse them. Avoid invoking the entire
  [saveFixtures()](../../tests/helpers/saveFixtures.ts) corpus for a short audio
  checkpoint: it also constructs a 10,000-command maximum fixture.
- [Default config](../../playwright.config.ts) uses three Chromium profiles and
  one worker. Full current discovery is **693 selections**, distinct from the
  historical 687. [WebKit acceptance](../../playwright.device-acceptance.config.ts)
  selects **four audio executions**: gesture/focus/restart and interruption checks
  on iPhone portrait and landscape. The complete audio outcome tests are not in
  that WebKit grep. Preserve its existing selection; do not broaden it by accident.
- Standalone, run and dungeon all use the shared scene/audio implementation.
  This plan changes tests only. Existing run audio/reset and battle persistence
  consumers remain acceptance coverage; touching a shared helper would expand
  the required verification to all of that helper's consumers.

The six inspected audio/session/policy files are unchanged between historical
source `6f20a3d6a8087e40777cccb6ee7c2cf4a09ece89` and this plan's base. This supports
using that report to identify cost, not claiming identical full build or host
conditions. Raw artifact availability and the remaining relevant inputs must be
verified before reusing any runtime result for acceptance.

## Non-goals

No application, gameplay, RNG, save-format, animation, audio-media, dependency,
timeout, retry, worker or performance-budget changes. No device/profile reduction,
shared coverage framework, generic fixture API, new workflow, runner provisioning
or #208 packaging changes. Do not refactor run recovery under #204, alter the
confirmation UX under #187, complete #200, merge or deploy during this task.

No physical devices are required. The caller checkout declares Android access;
that is availability, not testing. Playwright emulation satisfies AGENTS.md.

## Ablation decisions

- **Keep** deterministic comparison at every accepted command for both original
  seeds and their established outcomes. Removing a seed loses win/loss coverage;
  comparing only the final state loses event/order and transient-state failures.
- **Simplify** exhaustive sound-on/off work to existing session/cue/adapter unit
  tests. Cover frozen event batches, token suppression and late callbacks using
  the existing adapter fixture; label its fake backend honestly.
- **Keep** complete audible seed-1 loss and seed-2 win journeys on all three
  current Chromium profiles, with real controls, committed cues, replay checks
  and all approved win-seed abilities. No profile reduction belongs to #205.
- **Replace** each full muted-browser repetition with short paired legal-command
  comparisons using real sound controls. They must prove enabled/muted browser
  integration leaves session and save bytes identical while playback differs.
  Retain preview/cancel purity and no historical playback on Continue.
- **Keep** every existing non-outcome audio case and the four selected WebKit
  checks: fake-backend units cannot establish playback/permission behavior.
- **Drop** a new fixture framework, broad seed sweep, 10,000-command fixture
  generation, configuration changes and another monolithic baseline. None is
  required by the identified invariant. Add a small legal checkpoint helper only
  if a retained assertion cannot be reached cheaply through existing controls.
- **Keep** this file as the continuation reference and a short OpenSpec ledger
  requested by the caller. Existing behavior is the contract; skip spec deltas
  for this test-only refactor rather than inventing product requirements.

## Files

Expected implementation changes:

- `tests/battle-audio.spec.ts`: retain complete audible outcomes; replace only
  repeated muted full battles with short paired integration checks.
- `tests/unit/battleCues.test.ts`: cover both original outcome seeds and compare
  all accepted state/events/commands, replay and canonical save bytes.
- `tests/unit/battleAudio.test.ts`: exercise the real adapter with legal accepted
  batches using its existing fake host; prove presentation cannot change the
  paired session/save/replay results or resurrect suppressed batches.
- `docs/qa/issue-205-audio-equivalence.md` (create during implementation): concise
  old-assertion-to-retained-proof mapping, source/build identities, timings and
  retained result/artifact hashes. Update this plan with actual progress.

Read-only consumers include `tests/helpers/battlePolicy.ts`,
`tests/helpers/playerPolicy.ts`, `tests/helpers/saveFixtures.ts`,
`tests/battle-persistence.spec.ts`, `tests/run-progression.spec.ts`, both Playwright
configs and all production sources. Prefer file-local test changes; a helper
extraction needs an actual second caller and an explicit consumer audit.

## Implementation sequence and proof

1. **Freeze the comparison scope.** Refresh main, #205 and PR #228. Inventory
   current audio IDs and map every assertion in both paired outcome tests to
   its retained unit or browser owner, including all cues, win/loss, each approved
   ability, replay, muted suppression and session equality. Preserve all other
   audio IDs and the four WebKit selections. Obtain the original raw receipts if
   reusing their per-case data; otherwise capture a focused base result.
2. **Capture the focused before result.** On qualified, otherwise idle self-hosted
   capacity, run this file on all three existing profiles against the exact base
   and its production build. This fills missing landscape evidence. Reuse a
   completed profile only after checking artifact availability and relevant
   inputs/conditions; the historical aggregate remains failed/incomplete.
   Preserve durations, counts, skips/retries, failures and setup overhead.
3. **Strengthen existing unit boundaries.** Drive both original seeded legal
   battles through `prepare/confirm`, `nextEnemy` and `finishPresentation`.
   Compare each accepted batch and resulting state, command log, RNG, events,
   canonical save bytes and decoded/replayed continuation. Invoke the real audio
   adapter with enabled/muted fake backends; settle callbacks and prove they
   cannot affect gameplay. Retain existing suppression/disposal contracts.
4. **Remove only redundant browser work.** Keep one complete audible win and loss
   per profile, exact cue/ability/error and replay assertions included. Add short
   enabled-versus-muted legal-command comparisons from equal states through
   actual HUD controls; compare resulting session and saved bytes. Existing
   sound-control/Continue tests retain cancellation and no-old-cue behavior.
   If an invariant lacks equivalent proof, keep its browser execution.
5. **Qualify final affected inputs.** Run the unit files below, both TypeScript
   scopes and one production build. Execute all audio cases on all three default
   profiles and all four selected WebKit cases. Discover the full default matrix
   before/after to prove unrelated IDs did not change. Bind retained persistence
   and run/lifecycle results to unchanged inputs; run the relevant cases below
   where receipts are unavailable or invalidated.
6. **Compare and deliver one focused PR.** Use the same host, browser/runtime,
   worker/retry settings, server/base mode and cache/load conditions. Report total
   affected wall/test/setup time, added unit cost, per-profile counts and any
   failures. Reduced complete-battle count is a design expectation, not a claimed
   50% wall-time gain. Coordinate changed IDs with #208's discovery/aggregation;
   do not rewrite its manifest or workflow here. Leave #199/#200 open.

Commands for implementation (from the repository root):

```sh
npm run test:unit -- tests/unit/battleCues.test.ts tests/unit/battleAudio.test.ts tests/unit/battleSession.test.ts tests/unit/saveEnvelope.test.ts
npm run build
npx --no-install playwright test tests/battle-audio.spec.ts --list
npx --no-install playwright test tests/battle-audio.spec.ts
npx --no-install playwright test -c playwright.device-acceptance.config.ts tests/battle-audio.spec.ts --list
npx --no-install playwright test -c playwright.device-acceptance.config.ts tests/battle-audio.spec.ts
npx --no-install playwright test --list --reporter=json
git diff --check
```

Save before/after JSON results and command/environment receipts in distinct ignored
`tmp/verification/issue-205/<base-or-head>/` directories, with a durable QA receipt
and artifact hashes. Use existing reporters; do not introduce timing infrastructure.
`npm run build` already runs content validation and both TypeScript scopes.

Existing persistence/route consumers, when fresh execution is required:

```sh
npx --no-install playwright test tests/battle-persistence.spec.ts --grep 'startup is read-only|reload during legal'
npx --no-install playwright test tests/run-progression.spec.ts --grep 'accepted player presentation reload|run preparation and dialogs'
```

Verify each final filter with `--list` first. Preserve all currently selected
projects/modes. If a shared helper changes, inventory and execute its affected
consumers, including WebKit owners, instead of assuming these filters suffice.

Follow [verification-policy.md](../verification-policy.md): this bounded test-only
change requires full execution of the changed audio coverage, not an unrelated
complete game baseline. Broaden only for concrete shared reach. No fresh
`measure:fit`, telemetry matrix or full `verify:full` run is justified while
production, shared helpers and config remain unchanged. Reuse is conditional on
available receipts and relevant input equivalence; a missing receipt is missing
proof, and focused passes do not erase historical failed captures.

## Planning validation and handoff

Read-only discovery on the recorded base found 54 default audio selections,
four WebKit audio selections and 693 complete default selections, with no discovery
errors. The two documented persistence/run filters select nine and six executions,
respectively. All 33 relative links across the planning files resolve; the prior
plan's archived Git blob is unchanged (`d1c1c66f13046d1691ab6363be268e3bc524cdda`),
and `git diff --check` passes. No browsers, app build or implementation tests were
executed for planning. Commit/push only this plan, the preserved prior plan and
its corrected inbound proposal link. Final readback must confirm issue
assignment/comment, native Development linkage, remote commit/plan identity,
clean checkout and `0 0` tracking parity.

The paragraph above records the completed planning-only pass. The later caller
instruction now authorizes implementation and affected baseline execution; track
actual completion and remaining acceptance in Current continuation state above.
