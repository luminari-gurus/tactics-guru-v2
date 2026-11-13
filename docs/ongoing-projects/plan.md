# Issue #389 — Persistent Snared indicator

Date: 2026-11-13 (Asia/Jerusalem).
Issue: [#389](https://github.com/luminari-gurus/tactics-guru-v2/issues/389).
Owner: [@moshehbenavraham](https://github.com/moshehbenavraham).
Branch: [`branch/issue-389-snared-indicator`](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-389-snared-indicator).
Base: `origin/main`, `6a03f37cf51d1e46a72fc6c49ca2421a0836c2e6`.
Status: implementation authorized and in progress; OpenSpec change
`issue-389-snared-indicator` tracks implementation and verification.

The caller authorized implementation, autonomous repairs, verification, commits,
pushes and a focused labeled review-ready PR on this branch.
The previous `plan.md` is preserved as
[issue-270-run-statistics-plan.md](issue-270-run-statistics-plan.md).

## Selection and availability

Reviewed all **35 open issues** without a readiness-label filter, both open PRs
(#12 and #237, both drafts), remote branches, relevant discussions, current main,
and GitHub dependency/sub-issue/project relationships. Paginated REST inventory
and GraphQL agreed on 35 issues; GraphQL reported `hasNextPage: false`. No attached
repository Projects or issue Project items were returned. GitHub Issues is the
repository's work tracker; do not use Beads.

Selected #389 for a missing tactical cue with explicit, directly testable
acceptance criteria and an existing implementation path. The foundations are
already merged: #165 / PR #250 supplies Frost Snare, and #218 / PR #241 supplies
the Guarded badge. Both issues are closed. No active PR, linked development
branch, assignment or matching remote branch covered #389 when claimed.
Added `ready for work`, refreshed the backlog, assigned the authenticated caller,
and posted [the pickup comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/389#issuecomment-6859556436).

No evidenced downstream dependency distinguishes the available small fixes.
#389 wins on actionable combat feedback and confidence in a complete small
delivery. #376 is also a strong candidate: #372 is closed and its layout is on
main, but floor progress is less immediate than visibility of an active combat
restriction. #366 is another bounded candidate; its comment broadens the wrap
report to Guarded Strike as well as Magic Missile. It ranks behind the missing
status cue. Neither alternative was assigned or relabeled.

The rest of the scan was accounted for as follows; readiness labels alone did
not settle eligibility:

- #85, #128, #161, #200, #208, #258 and #306 are assigned to @dubstylee. Several
  retain operational, capacity or original-failure-attribution work; preserve
  their ownership. #199 is the coordination epic, not an unclaimed implementation
  slice.
- #167–#169 and #171 need the remaining effect/damage/stack contracts tracked by
  #161; #170 needs a bounded biome pack; #173–#175 retain acquisition, reward or
  exploration-contract decisions. Parent/epic references alone were not treated
  as blockers.
- #178–#182, #185, #262, #287, #301, #313 and #320 retain presentation, product,
  persistence-policy or balance choices. Some already carry readiness labels;
  those labels were left unchanged.
- #261 already has merged functional work in PR #370 and retains an explicit
  WebKit performance acceptance failure. #268 has an existing investigation
  branch and an unidentified intermittent trigger. Neither is a fresh feature
  implementation slot.
- #299 and #308 are mixed QA lists with overlap and behavior decisions, rather
  than one verified remaining fix. #318 needs reproduction and diagnosis: current
  preview and HUD use `combatStats`, and attack preview also applies deliberate
  height/Guarded/Mark modifiers. Source inspection alone does not prove or dismiss
  the reported duplicate penalty.

## Outcome

Show a persistent, noninteractive Snared badge beside each living enemy currently
affected by Frost Snare. Use the Guarded badge's visual weight, placement, minimum
readable size, contrast and depth treatment, with a distinct vector snowflake
symbol so shape conveys the difference without color or hover.

The badge must persist after transient cast feedback and across unrelated turns,
follow its unit/camera, disappear on accepted target-turn expiry or source/target
defeat, and appear immediately on saved-battle resume. Preserve readable HP,
selection and target cues on desktop and mobile portrait/landscape. Retain the
existing accessible Snared inspection/status text.

## Current path and ablation

[BoardRenderer.ts](../../src/phaser/BoardRenderer.ts) already owns Guarded graphics,
snapshot-driven visibility, placement during presentation/camera updates, and
`data-battle-report` geometry used by browser checks. Its `present` method respects
the animated snapshot, so badge updates must follow the same presentation boundary.
[effects.ts](../../src/domain/effects.ts) already validates a living Mage source via
`movementBlockSource`. [turns.ts](../../src/domain/turns.ts) and combat defeat cleanup
already remove the movement block. Existing saves preserve it. The shared renderer
serves standalone, authored-run and dungeon battles.

Apply [ablation](../../.agents/skills/ablation/SKILL.md):

- **Keep** state-derived Frost Snare recognition: require
  `movementBlock.abilityId === 'ability:frost_snare'` and a valid
  `movementBlockSource(unit, snapshot.units)`. Pinning Shot must not receive a
  Snared badge. Do not depend on transient events or a separate timer.
- **Simplify** rendering by extending the current Guarded annotation path. Share
  only the local placement/reporting code needed by these two real indicators;
  preserve Guarded appearance and semantics. Reuse the existing board bounds,
  scale, depth, camera updates and scene ownership.
- **Drop** a generic status registry, new renderer/DOM overlay, asset downloads,
  new dependencies, preference controls, save fields, migrations and effect-rule
  rewrites. None is needed to meet this issue.
- **Keep** browser lifecycle and geometry witnesses: domain tests already prove
  Snare's rules, but cannot prove its persistent on-board visibility or overlap.

Non-goals: other status badges, Pinning Shot presentation, balance changes, new
abilities, general UI cleanup, analytics, deployment and issue #161 completion.
This is a localized presentation change. The caller subsequently requested
OpenSpec implementation; the change artifacts mirror this scope and acceptance
mapping without introducing new architecture.

## Files and implementation steps

1. Extend `src/phaser/BoardRenderer.ts` with the vector Snared indicator. Derive
   visibility from each presented snapshot and reuse Guarded's annotation anchor,
   readable scale, foreground depth and clipping. Extend existing diagnostics with
   the badge visibility/geometry needed by browser assertions. Cover refresh,
   movement presentation, pan/zoom, resize, restart and scene disposal through the
   existing paths; add no per-frame rule work.
2. Extend `tests/dungeon.spec.ts` and its existing
   `tests/helpers/dungeonFixtures.ts` fixtures only as needed. Reuse
   `stagedMageAbility` for the real HUD cast and saved active reload, then add
   bounded legal-command witnesses for unrelated turns, target expiry and source
   and target defeat. Mark staged XP/positions accurately; do not claim earned
   progression from those fixtures. A rejected/cancelled cast and a Pin-only state
   must leave the Snared badge hidden.
3. Extend the existing `tests/ability-picker.spec.ts` real Frost Snare witness for
   cast feedback and keyboard/touch behavior, and retain
   `tests/guarded-effects.spec.ts` as the regression for the reused annotation
   geometry across standalone/run/dungeon consumers. Avoid new test infrastructure
   or a new suite/config. Add assertions to `tests/unit/abilities.test.ts` or
   `tests/unit/boardPresentation.test.ts` only if a new pure decision is introduced
   and not already covered; do not duplicate existing lifecycle-rule coverage.
4. Update `docs/signature-abilities.md` with the persistent visual cue and actual
   verified behavior. Record final source/build identities, commands, screenshots,
   results, failures/skips and limitations in the plan/PR evidence.

Expected production change: `src/phaser/BoardRenderer.ts` only. Inspect
`src/phaser/BattleScene.ts` and `src/ui/hud.ts` as consumers; change them only if an
actual integration gap blocks an acceptance criterion. Domain, storage, package
and workflow files are not expected to change.

## Proof and acceptance mapping

- **AC1 — persistent recognizable badge:** real HUD cast shows the snowflake on
  the correct target, other units stay unmarked, and the marker remains after
  feedback settles. Capture and visually inspect screenshots without relying
  solely on diagnostic JSON.
- **AC2 — attached and readable:** check unrelated turns, pan/zoom, viewport
  resize, clipping, minimum CSS size, depth and separation from HP/selection/target
  cues. Cover desktop keyboard and native emulated touch in portrait and landscape,
  including a narrow viewport. Preserve Guarded's existing witnesses.
- **AC3 — authoritative lifecycle/resume:** advance legal commands to target
  endTurn, source defeat and target defeat; assert exact badge removal. Reload an
  active Snare save and assert immediate visibility, identical accepted state/RNG
  and save slots, with no replayed activation. Restart leaves no stale badge.
- **AC4 — browser verification:** exercise these paths on Chromium desktop/Pixel
  portrait/landscape and the existing WebKit dungeon profiles. Use existing units
  for unchanged rule boundaries, production preview for saved resume, and the dev
  fixture only for its actual picker/interaction contract.

Use [verification-policy.md](../verification-policy.md), UI/layout/input scope
plus the affected saved-battle resume path. All three shared renderer consumers
need a witness. Run the standard PR lane once final relevant inputs are frozen;
retain its complete legal standalone/run/dungeon core journeys. Also run the
existing complete authored battle/run checks below for affected presentation.
No save-format/admission or gameplay-rule change is planned, so a full storage or
full-regression matrix is not justified. Broaden only for a concrete failure or
new affected consumer.

Commands (discover `--list` before browser execution; new cases use the title
prefix `Snared badge`):

```sh
npm run test:unit -- tests/unit/abilities.test.ts tests/unit/boardPresentation.test.ts
npm run verify:pr
npm run test:regression -- tests/dungeon.spec.ts tests/guarded-effects.spec.ts -g 'Snared badge|staged Mage ability:frost_snare|Guarded|guarded'
npm run test:browser -- -c playwright.exploration.config.ts tests/dungeon.spec.ts -g 'Snared badge|staged Mage ability:frost_snare' --diagnostics
npm run test:fixtures -- tests/ability-picker.spec.ts -g 'Mage real Frost Snare'
npm run test:regression -- tests/battle-loop.spec.ts tests/run-progression.spec.ts -g 'complete legal authored battle|legal run outcomes'
git diff --check
```

`verify:pr` includes all fast units, both TypeScript scopes, both build integrations,
the production bundle and seven core browser journeys. Reuse valid unchanged
results only with source/build/input provenance; preserve failed or incomplete
attempts. Keep browser execution serial with one worker, no new retries or relaxed
assertions/budgets. Browser CI uses the qualified self-hosted runner, with no
automatic GitHub-hosted fallback.

Planning validation on the stated base: source/consumer inspection and existing
Playwright discovery succeeded (42 selected Chromium cases across four affected
files, six staged Mage WebKit cases, six real Mage picker cases). These are
discovery counts, not runtime passes. No application/browser acceptance is claimed
by this planning commit. Validate final exact selection after adding badge cases.

Available physical platform declared in the caller checkout: Android
(`CAN_TEST_MOBILE=android`); access is not proof of testing. Required physical
platforms: none. Playwright browser/device emulation satisfies the caller's
standing acceptance instruction. No physical-device testing is claimed.

## Delivery, estimate and open questions

One focused implementation PR should complete all four issue criteria; a stacked
feature series is unnecessary for this bounded change. The planning commit uses
`Refs #389`. Keep the issue open through implementation and verification; use
`Closes #389` only on the completed, validated implementation PR. If an unforeseen
integration problem needs another increment, record its remaining criteria and
dependencies on the issue and use `Refs #389` for the partial PR.

Estimate for me after implementation is authorized: **2–3 hours** of active agent
work: about 30–45 minutes rendering/integration, 60–90 minutes browser witnesses and
verification, and 20–30 minutes evidence/PR preparation. CI queue, review, and
unexpected runner failures are additional elapsed time. This is an estimate, not
a test result or delivery guarantee.

No blocking unanswered product questions. The concrete visual choice is the
snowflake at the existing Guarded anchor; responsive validation may adjust its
strokes within that treatment. The remaining technical uncertainty is whether
extreme zoom/short viewports require a small local anchor adjustment; existing
badge geometry tests and screenshots will decide it during implementation.

## Implementation handoff — 2026-11-13

- Production renderer and picker assertions implemented. Local Guarded placement
  and diagnostics are shared by two graphics maps; visibility uses the presented
  Frost Snare state and existing living-source helper. No rules, saves, assets or
  dependencies changed. OpenSpec: `issue-389-snared-indicator` (spec-driven).
- Added bounded dungeon witnesses (15 selected cases per Chromium/WebKit config).
  XP, positions and defeat-fixture HP are staged; cast, intervening commands and
  defeats are legal. No earned-progression claim. Still to execute and inspect.
- Runtime: WSL Ubuntu, Node 24.15.0, lockfile Playwright 1.64.1. Initial Windows
  launcher/native-binding mismatch repaired by `npm ci` from the unchanged lockfile
  (49 packages audited, zero advisories). Optional PostHog CLI postinstall remained
  blocked by npm policy; telemetry CLI is outside this change's verification.
- Installed missing matching Chromium 1248 with the local Playwright CLI.
  `npm run check:browsers` now passes Chromium 156.0.8078.4 and WebKit 27.2:
  `verification-receipts/browser-environment/run-10Qjmh/environment.json`.
  Initial missing-Chromium setup failure is retained as `run-QGrfJ5`.
- `npm run test:unit -- tests/unit/abilities.test.ts tests/unit/boardPresentation.test.ts`:
  54 passed. Both type scopes passed. Strict OpenSpec validation passed.
- Picker command: `npm run test:browser -- -c playwright.fixtures.config.ts
  tests/ability-picker.spec.ts -g 'Mage real Frost Snare'`. Receipt `run-KPUQ62`
  retained desktop boot-readiness and portrait audio-readiness failures, with
  landscape passing. Focused diagnostic rerun `run-mbUJ5N` passed desktop and
  portrait, preserving all assertions (2/2); it does not erase the first failures.
- Standard `npm run verify:pr` passed in 253.4 seconds: tooling, 1,363 units,
  both type scopes, two root/prefix build integration tests, production bundle,
  and all seven core browser journeys (no failures, retries or skips).
  Receipt: `verification-receipts/pr/1794590838870-1702551/summary.json`.
  This ran on planning HEAD `3c3f443c` plus the implementation diff. Its initial
  dirty listing includes platform line-ending noise; aligning repository-local
  `core.autocrlf=true` with Windows Git removes that noise without source changes.
  New dungeon test-only edits after its unit stage do not affect those covered
  core journeys or production build; their own focused execution is still pending.
- Next: execute the focused dungeon + Guarded and WebKit selections, inspect screenshots, run complete
  authored battle/run witnesses, audit final source/build identity, then publish
  the focused labeled PR. Browser execution stays serial, one worker, zero retries.
- Desktop Snared iteration `run-xYWEjD`: cast/resume/unrelated-turn/expiry and
  camera/narrow-layout/restart cases passed, with narrow screenshot reviewed.
  Three new test cases failed: defeat tests sampled before the lazy engine
  finished loading, and Pin exclusion lacked a `readDungeon` import. Repaired
  those test paths (wait for the real scene with bounded RAF advancement; import
  the existing admission helper). Production source/build unchanged. Focused
  diagnostic rerun `run-C1swy9` passed all three cases; original failures retained.
- Final Chromium Snared coverage is complete: the two unchanged passing desktop
  cases in `run-xYWEjD`, three repaired desktop cases in `run-C1swy9`, and all ten
  portrait/landscape cases in `run-0BPxOH`. Zero retries or skips. Both type scopes
  passed again after the last test edit. Desktop, 320×568, 568×320, Pixel portrait,
  resumed and source-defeat screenshots were visually inspected. WebKit's 15
  cases are running in `run-nC2bny`; shared Guarded and complete legal authored
  battle/run regressions remain to execute.
