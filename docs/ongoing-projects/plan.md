# Issue #221: diagnose and repair four desktop browser timeouts

Date: 2026-10-22 (Asia/Jerusalem). Status: planning complete; implementation has not started.

- Issue: [#221](https://github.com/luminari-gurus/tactics-guru-v2/issues/221).
- Owner: `moshehbenavraham`; [kickoff comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/221#issuecomment-6336358452).
- Base: `main` at `251db945569e3f1ac957caa091e9fa9eec11a034`.
- Work branch: [branch/issue-221-desktop-timeouts](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-221-desktop-timeouts), created from that base and natively linked in the issue's Development section.
- Related work: [#199](https://github.com/luminari-gurus/tactics-guru-v2/issues/199), [#200 / PR #209](https://github.com/luminari-gurus/tactics-guru-v2/pull/209). These are coordination references, not additional issues claimed by this branch.
- Previous root plan: [issue-159-biome-encounters-plan.md](issue-159-biome-encounters-plan.md), preserved byte-for-byte with historical status/evidence intact.

## Outcome

Disposition all four reported desktop failures with source-bound evidence, repair their demonstrated causes, and retain the assertions that protect gameplay, saves, camera geometry, animation, reduced motion and lifecycle behavior. The four cases must pass on the selected qualified capacity without blanket retries, timeout inflation, skipped coverage or weakened assertions. A passing focused repair does not complete #200's baseline or replace its interrupted full run.

This task currently authorizes selection, assignment, planning and branch publication. Application/test implementation, browser execution, PR delivery and integration follow a subsequent implementation request. No new approval procedure or planning framework is needed for this bounded investigation.

## Why this task

Reviewed all **44 open issues**, their bodies, labels and assignees, all **five open PRs**, remote branches, native blocked-by and Development relationships, and the current default branch. The GraphQL inventory returned 44 issues with no next page; repository metadata counted 49 open issues/PRs combined. Repository and organization Projects V2 inventories both returned zero, and the issues had no project memberships. Selection included issues without `ready for work`; #221 had only `bug`, no assignee, no linked branch and no implementation PR.

The priority judgment is to remove an observed P1 verification obstruction before adding more gameplay scope. #221 is one of the explicit missing-baseline follow-ups in #199/#200. A trustworthy #200 baseline is a stated prerequisite of #203, #204, #205 and #208. This repair removes one obstruction; #219 integration, #220 collector readiness and deliberate missing-coverage capture remain separate obligations.

The complete backlog disposition at selection was:

- Already owned or in flight: #85 release operations, #123 / PR #139 HUD, #128 telemetry, #161 effects, #162 ability picker, #200 / draft PR #209 timing, #207 / PR #210 browser setup and #219 / PR #222 cleanup belong to `dubstylee`. PR #12 is the separately held deployment alternative. Do not claim, relabel, integrate or duplicate that work. PR #210 records successful self-hosted qualification, but its setup/diagnostic tooling remains unmerged.
- Available independent or bounded alternatives: #153 menu, #155 enemy movement, #160 HP/XP/level progression, #172 consumables/revival, #176 records, #177 tactical planning/undo, #179 log export, #181 presentation conveniences, #183 rules docs, #184 generator profiles, #187 direct confirmation, #195 compass, #218 Guarded badge and #220 collector readiness. #160 is the strongest gameplay alternative: #159 is now closed with its encounter foundation merged, and progression supports later class/reward work. #221 takes priority now because it addresses observed P1 failures that impair verification across those changes. #220 is also useful but is P2 and independent. Small UI tasks offer less downstream verification value.
- Still dependent or requiring bounded design: #163–#169, #171 and #173 require unfinished effect/unlock/content contracts; #174 needs functioning upgrade consumers and reward/currency decisions; #175 needs #174. #170 is an epic that explicitly requires bounded biome issues before coding. #178, #182 and #185 retain explicit adoption/rules decisions; #180 needs the Settings destination and music policy. #203/#204/#205/#208 still depend on incomplete #200. #199 remains the coordinating epic rather than one implementation patch.

Native dependency data recorded only #155 blocked by already-closed #154. Other dependencies above come from issue bodies and actual merged/in-flight work; absence of a native blocker is not evidence that an issue is ready. No global readiness relabeling is part of this request.

## Source findings and uncertainties

The original [failed capture](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39700595665) tested `73d34dba1620174837cf15a93812d393abe690aa` on Ubuntu 24.04, Node 24.21.0 and Playwright 1.63.0. Its [retained artifact](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39700595665/artifacts/12396082054) is reported with 30-day retention. Recover it and verify its provenance during implementation; planning has not downloaded or independently revalidated its raw traces/logs. The issue/PR reports retain four 30-second case failures, a one-hour Chromium cutoff at test-start marker 257/687, and unknown later outcomes. None is a clean regression result.

Direct comparison of that capture commit with the selected base shows **no differences in `src/`, `tests/helpers/`, the two affected test files, `playwright.config.ts` or `package-lock.json`**. Package scripts and other verification work have changed. This establishes relevant source equality, not matching host performance, a new reproduction or root-cause attribution.

- [battle-board.spec.ts](../../tests/battle-board.spec.ts): the hover case checks pure previews, prepared commands, save bytes, keyboard/native target transitions, then destructive restart and restored player phase/object count. `confirmRestart` waits for the replacement seed, not for all initial enemy presentations to finish. The camera case retains zoom/pan across selections and several real Wait/end-turn actions, waiting for accepted command count and player phase. A long cumulative workflow, a blocked control and a stuck presentation require different fixes; do not infer one from the aggregate timeout.
- [battle-animations.spec.ts](../../tests/battle-animations.spec.ts): `boundary()` searches legal session commands across bounded seeds; `boot()` encodes the accepted boundary, installs the clock and resumes through real save controls. `bobFrame()` reads the full rendered report and checks every unit's sprite/health anchors. The two cases repeatedly advance a controlled clock while exercising targeting, inspection, media changes, actor changes, visibility and restart. The restart case already resumes live frames and verifies the replacement seed before pausing again; adding that same fix again would not diagnose the report.
- [BattleScene.ts](../../src/phaser/BattleScene.ts): `present()` awaits `BoardRenderer.animate().done`, acknowledges the session token, refreshes and pumps legal enemies. Player availability additionally requires live scene/first render readiness. Visibility cancellation and shutdown have separate cleanup paths; shutdown deletes diagnostic datasets. A missing report may indicate replacement/readiness, CPU starvation or an earlier test deadline rather than a broken bob loop.
- [BoardRenderer.ts](../../src/phaser/BoardRenderer.ts): bob placement is view-only and gated by idle/player state, reduced motion and presentation. Its UPDATE handler parses/updates/serializes the rendered diagnostic report each frame. Animation completion/cancellation is guarded and resolves a promise. These are measurement targets, not proven causes or authorization for a diagnostics rewrite.
- [BattleSession.ts](../../src/app/BattleSession.ts): commands resolve and persist before presentation; generation tokens guard `finishPresentation`, and disposal invalidates old callbacks. Preserve command count, RNG, save and replay semantics throughout.
- [startRunApp.ts](../../src/app/startRunApp.ts) and [startDungeonApp.ts](../../src/app/startDungeonApp.ts) instantiate the same scene. A runtime repair can therefore affect standalone, run and dungeon routes even though the reported cases enter standalone battles.

## Non-goals

Do not change combat rules, seeds, content, save formats, action UX (#187), status badges (#218), animation speed or product performance budgets. Do not fold in #219 process cleanup, #220 preview startup, #203 matrix reduction, #204 recovery-fixture refactoring, #205 audio work or #208 CI sharding. Do not run another hour-long baseline to get cleaner numbers, provision infrastructure, merge another PR, deploy, enable telemetry or touch player data. No physical-device requirement applies; Playwright/browser-device emulation is sufficient under AGENTS.md.

## Ablation decisions

- **Keep** all four named cases and their real user boundaries. Removing any leaves an explicit observed failure undispositioned.
- **Keep** a focused exact-base/current comparison and retained raw failures. Passing on a different host alone cannot establish regression cause or erase the hosted observation.
- **Simplify** diagnosis to phase timings and existing reports/traces. Measure fixture construction, boot/Continue, action completion, restart identity and bob sampling separately before changing code. Retain useful failure diagnostics outside Playwright cleanup; use temporary instrumentation first rather than adding a permanent profiler.
- **Simplify** repairs to existing local helpers or the demonstrated scene/renderer defect. Reuse legal session commands and save codecs; never inject arbitrary state. If a cumulative case needs independent scenarios, each must preserve its own equivalent setup and assertions, with a mapping of every original obligation and unchanged per-operation bounds. Splitting only to evade the deadline is not sufficient evidence.
- **Investigate** clock scheduling, fixture CPU cost, report serialization and cancellation independently. The observed timeout location does not decide which layer to edit. Optimize only measured work; no speculative cache, new fallback, generic fixture framework or alternate diagnostics subsystem.
- **Drop** OpenSpec setup and extra proposal/design files: this investigation has an existing acceptance contract and unresolved empirical causes, not an architectural/product decision that another artifact resolves. Keep this single implementation plan and the eventual focused QA evidence.
- **Drop** automatic full-matrix reruns for isolated test repairs. Escalate only when changed shared behavior or unbounded consumer reach meets the verification policy's full-regression trigger; retain all explicit issue gates.

## Files

Planning changes are only this file and the preserved previous plan. Expected implementation files are the affected cases/local helpers in `tests/battle-board.spec.ts` and `tests/battle-animations.spec.ts`, plus `docs/qa/issue-221-desktop-timeouts.md` and compact source-bound evidence as needed. Extend existing units only for a demonstrated uncovered behavior.

`src/phaser/BattleScene.ts`, `src/phaser/BoardRenderer.ts` or `tests/helpers/battlePolicy.ts` are **conditional**: touch them only after reproduction identifies their defect and enumerate their callers before qualification. `src/app/BattleSession.ts` is an authority boundary to preserve, not a planned rewrite. A task-specific self-hosted verification workflow is justified only if necessary to execute this focused proof on approved capacity; reuse an existing safe dispatch route when available. No package/lockfile/global config/matrix change is currently planned.

## Implementation sequence

1. Refresh the selected issue/branch, base/head, active PR overlap and the qualified runner state. Recover the original four failures and relevant source/build metadata before the artifact expires. Record unavailable artifacts explicitly. Use one otherwise idle qualified self-hosted browser host with `workers: 1` and zero retries; do not assume the historical hosted exception authorizes new hosted runs. PR #210 records qualification of `unraid-tactics-01` with labels `[self-hosted, tactics-browser]`; recheck the actual account/browser environment before executing. Do not assume its unmerged scripts exist on this branch.
2. Discover and run only the four exact desktop cases below against an identified clean main build. Preserve all successes/failures and per-phase durations. Use a separate focused diagnostic run with trace if needed; record instrumentation overhead separately. Compare the same case at the literal relevant base under matching conditions before attributing a regression; the original capture remains a different host class. If isolated execution passes, investigate the smallest evidenced preceding workload/resource condition, rather than declaring a fix or rerunning the entire baseline.
3. Classify each case: genuine presentation/readiness failure, fixture/setup cost, diagnostic read cost, or cumulative test work. Trace accepted token completion and new-scene identity; check that clocks stay live during asynchronous startup and controlled sampling resumes only after readiness. Measure legal fixture search and report/driver work separately. Retain state/save/camera/anchor assertions even if phase boundaries change.
4. Apply the smallest repair justified by that evidence. Show before/after failure or measured causal improvement under matching conditions. Keep all original obligations and operation bounds; no retries, increased timeout limits, disabled checks, forced clicks masking unavailable controls or reduced animation behavior. A non-reproduction is an explicit outcome needing evidence, not permission to invent a repair.
5. Qualify the repaired cases and affected consumers under the scope rules below. Tie final receipts to exact source/test/helper/config/lockfile hashes, source/build identity, Node/browser executable/version, OS/CPU/RAM, workers/retries, server mode, command, timing, outcome counts and retained artifact hashes. Reuse prior CPU/telemetry evidence only after checking the inputs relevant to each claimed obligation.
6. Publish one focused PR for #221 with the cause, repair, acceptance mapping, commands/results and retained limits. Link #199/#200 for coordination; do not close them. Use `Closes #221` only when all four dispositions and the required affected proof are complete; otherwise keep the issue open and state the gap. Keep #200's interrupted capture and missing suites explicit.

## Proof and verification scope

Follow [verification-policy.md](../verification-policy.md). These are implementation commands, not tests already run by this planning task. Run from the repository root with locked dependencies and cleared unrelated mode/telemetry overrides.

Initial discovery must select exactly four desktop cases:

```sh
npx --no-install playwright test tests/battle-board.spec.ts tests/battle-animations.spec.ts --project=desktop --grep '(hovered origins show only ability reach without changing selection, pending commands or saves|selection labels retain the zoomed and panned camera without gameplay commands|active bob: targets, cancel, inspection, camera and live reduced motion preserve authoritative state|active bob: presentation, actor change, hidden page and restart restore anchors without duplicate loops)$' --list
```

After a successful `npm run build`, run that exact selection without `--list`, with `--retries=0`, `--workers=1`, line/JSON reporting and a unique output path. Set `PLAYWRIGHT_JSON_OUTPUT_FILE` to a distinct retained receipt path. Use `--trace=retain-on-failure` for focused diagnostics where useful; do not compare traced timings as untraced baseline measurements. Preserve outputs outside disposable `test-results/` before another invocation. A failed build blocks preview evidence; never serve stale `dist`.

- **Iteration:** the four desktop reproductions and the narrowest regression proving a changed cause. Preserve existing case/expectation/operation limits. Map every assertion if restructuring a case.
- **Local test repair only:** discover the touched cases on all three configured Chromium profiles and execute those affected desktop/portrait/landscape cases, followed by the relevant neighboring hover/camera/animation/restart consumers. No automatic WebKit/full-unit/full-matrix rerun for a local test-only edit. Explain any engine/mode exclusion from the actual consumers.
- **Shared test helper:** enumerate every importer and affected mode/profile. Run the changed consumers; shared harness/selection changes require the full regression of affected coverage per policy. Prefer keeping a genuinely case-local fix local.
- **Scene/renderer runtime repair:** run affected units, both TypeScript scopes and the production build (`npm run build` includes content validation and both scopes). Cover hover/camera, motion/anchors, presentation/restart/visibility, exact save/replay and input locks; include desktop keyboard/focus, touch portrait/landscape and WebKit lifecycle/geometry as affected. Exercise standalone, short-run and dungeon entry/restart plus a complete legal journey for affected routes. Default WebKit acceptance does not select the two reported files; discover exact targeted coverage with a minimal temporary WebKit config only if needed, preserving the WebKit engine and required profiles.
- **Escalation:** cross-route lifecycle/save/turn/RNG changes or unbounded shared reach require the policy's complete applicable regression inventory. Reuse unchanged valid evidence instead of repeating it. Document the concrete trigger before broadening. Performance capture is required only for a changed performance behavior/material budget risk or explicit gate; keep such captures exclusive and #220 collector failures visible.

Acceptance accounting:

- All four failures have an explicit reproduced/repaired or evidence-backed disposition, with old/current results kept distinct.
- The hover case retains preview purity, selected/pending state, exact save bytes, keyboard/native targets and post-restart state/object cleanup.
- The camera case retains transformed geometry through selection and real accepted Wait/actor transitions, without incidental commands.
- The first bob case retains sprite/health anchors, targeting/cancel/inspection, camera, live reduced motion, state/save purity and stable object count.
- The second bob case retains presentation pause/resume, actor changes, hidden-page state/save invariance and repeated real restart without duplicate loops or stale reports.
- No blanket retries, timeout increases, weakened budgets/assertions or missing-profile claims; final relevant inputs are identified, and any incomplete proof leaves #221 open.

## Planning validation

Planning checks completed: all relative source links resolve; the documented Playwright discovery selects exactly four desktop cases in two files (no browser/server execution); the preserved plan has the original SHA-256 `b504e7ea2e6979ac6892bd36fab2bf88d23e21e9da5a9c4fa40424491eb0f5b4` and normalized Git blob `947a6cb6a14afff756652fa3b29619ee27abba64`. Locked dependencies were installed with lifecycle scripts disabled for discovery only; this is not build or runtime qualification. Publication also verifies `git diff --check`, documentation-only scope, clean local state, local/remote commit parity and native issue-to-branch linkage. No application build, browser execution, gameplay acceptance or full-baseline repair is claimed by the planning commit.
