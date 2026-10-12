# Issue #73 - battle autosave and resume implementation plan

Updated 2026-10-12 (Asia/Jerusalem). **Implementation authorized and in progress.**

## Live handoff

Working in the existing clean planning worktree below; the original checkout's unrelated edits remain untouched. Refreshed origin: main remains `3f37920`, branch starts at `f4c0993`, and there is no existing PR for this branch. OpenSpec apply is ready (spec-driven, initially 0/12).

Ablation: retain the existing codec, state validator, AI policy, two-slot adapter and native modal owner. One accepted-state hook and one app coordinator cover all entry points; no new serializer, tombstone, retry loop or simulation is needed. Outcome, non-goals, files and proof remain as specified below. The user authorized autonomous resolution of discovered blockers and publication of a review-ready PR; no additional planning approval is pending.

Current work: implementation and validation are complete; OpenSpec 11/12 tasks are checked, with only PR publication/readback outstanding. Runtime commit `05f2d84937ee22ca1e47c690a2f7e141614a942e` and final test additions `f92da65440b39a8b45cca7e51b61b2342563836f` are the evidence revisions. All 419 unit tests, 77 content tests, both typechecks, production build, strict OpenSpec, whitespace and 27 relative-link checks passed. The full 255-case browser suite passed with zero failed/flaky/skipped cases; the 15 affected cases passed again after final test-only additions. Runtime/build inputs did not change. Full suite was not repeated after those test-only additions. Edge 155.0.4283.45, unchanged desktop/portrait/landscape profiles, one worker, normal timeouts.

The [QA report](../qa/issue-73-battle-resume.md) maps all five acceptance criteria to proof. Its [verification record](../qa/issue-73/verification.json) lists all cases, exact revisions and bundle hashes; six inspected screenshots cover Continue/recovery in all profiles. Raw local reports remain in `tmp/issue-73/full-browser.{log,json}` and `tmp/issue-73/acceptance-recheck.{log,json}`. No tests are running. Next: commit/push evidence, create a non-draft PR targeting main with `Closes #73`, verify PR metadata and final remote parity, then record that PR here and complete task 4.3. Do not merge, deploy, tag a release, archive OpenSpec or start downstream work.

Discovered defects resolved: the shared native dialog now wraps Tab/Shift+Tab focus; enemy dispatch pauses while hidden so animation cancellation during navigation cannot accept an extra command. Recovery/reset failures preserve usable ongoing and ended sessions, with exact retained export copies. The full run covers the original regression repairs; the final targeted run adds explicit well-formed future-version rejection and failed reset from actual-control victory/defeat.
Rechecked GitHub: main remains `3f37920` and is an ancestor; no rebase or history rewrite is needed. PR #93 is still open and independently moves battle entry code from `src/main.ts` to `src/app/startBattleApp.ts`; a later merge must preserve this change's guarded restart handling when reconciling that entry code. Its map work is not included here. PR #12 deployment work remains separate. No release tag is warranted for an unmerged feature.

Local tooling: Node is on PATH. OpenSpec CLI is `C:/Users/apexw/AppData/Local/npm-cache/_npx/c37562604d2d088d/node_modules/@fission-ai/openspec/bin/openspec.js`; invoke with Node. Dependencies installed from the lockfile using `node C:/Users/apexw/AppData/Local/Temp/tactics-guru-issue-66-tools/package/bin/npm-cli.js ci --no-audit --no-fund`. npm is absent from PATH; use an ignored local wrapper for nested configured commands. No dependency version changes.

- Issue: [#73 - Integrate command-boundary autosave and battle resume controls](https://github.com/luminari-gurus/tactics-guru-v2/issues/73), under [#58](https://github.com/luminari-gurus/tactics-guru-v2/issues/58).
- Owner: `moshehbenavraham`; [kickoff comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/73#issuecomment-6128412106).
- Branch: [`branch/issue-73-battle-resume`](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-73-battle-resume).
- Base: `main` at `3f3792025f29716c977cbdebff9d1c94b750ec3c`.
- Worktree: `C:/Users/apexw/.codex/worktrees/issue-73-resume-plan/Tactics-Guru`.
- OpenSpec: [proposal](../../openspec/changes/issue-73-battle-resume/proposal.md), [design and acceptance mapping](../../openspec/changes/issue-73-battle-resume/design.md), [implementation tasks](../../openspec/changes/issue-73-battle-resume/tasks.md), [persistence specification](../../openspec/changes/issue-73-battle-resume/specs/battle-persistence/spec.md), [session delta](../../openspec/changes/issue-73-battle-resume/specs/battle-session/spec.md), [controls delta](../../openspec/changes/issue-73-battle-resume/specs/battle-controls/spec.md).

## Selection and prerequisites

The [complete backlog disposition](issue-73-battle-resume/backlog-review.md) covers 22 open issues and two open PRs, including bodies, ownership, labels, dependency summaries, linked branches and merged prerequisites. #73 outranks the other eligible ready work (#88 art templates and #92 asset-base paths) because it supplies #74 persistence certification, #79 reward persistence and #80 run integration, with a transitive path to #81. Completion will remove one prerequisite from those children; it will not satisfy their other gates.

#69's codec merged in PR #70 as `ea58370`; #72's storage adapter merged in PR #91 as `3e7bf08600c59a09a0f9c37f3c81c7c07b3a6954`. Both are completed and present on the base. No active work covered #73 at claim. The issue was promoted to `ready for work`, assigned and commented after rechecking it. Private project-only drafts remain uninspected because the credential lacks `read:project`.

Local physical capability: `CAN_TEST_MOBILE=android`; no physical iOS. #73 requires automated browser integration, not physical iOS certification. #64/#66 remain excluded; #74 retains physical persistence/lifecycle acceptance and #57 remains a release gate. Emulated Pixel 7 browser coverage will not be described as hardware evidence.

## Intended behavior

1. On startup, inspect existing storage without modifying it. If both slots are absent, keep normal fresh-battle startup. If a compatible snapshot exists, offer Continue/New battle. Identify a backup as recovery with possible progress loss. Invalid or unreadable data produces recovery/retry controls without silently replacing it.
2. Continue creates a validated session at the committed boundary. Restore state, next legal command, RNG and enemy continuation; rebuild board/HUD without historical animations, sounds, previews or callbacks. Ended saves stay ended. Fresh-session replay remains complete; resumed diagnostics identify missing pre-save history instead of fabricating a replay.
3. Attempt autosave immediately after every accepted player/enemy command, before presentation. Previews/rejections/cancellation do not save. Storage failures retain playable in-memory progress, visible unsaved status and recovery bytes.
4. Provide accessible recovery, exact-data export, explicit removal/reset, Continue and New battle. Preserve native focus/input capture, 44 CSS pixel targets, touch/mouse/keyboard parity and short-landscape usability.
5. All restart paths share one guarded replacement flow. Confirm destructive intent, remove the unchanged inspected backup then primary, and verify both absent before committing a fresh session/seed. On any failure, retain the current session/seed and recovery copies, report incomplete reset and offer retry/cancel. Once invalidation succeeds, even a failed first save can leave only new data or no data. Never claim that two separate removals are a storage transaction.

The deliberate trade-off is that storage denial can block replacement, or initial startup when previous save state is unknown. An existing battle can continue. This avoids a successful-looking restart whose old save returns on reload. The guarantee assumes the existing adapter's single writer and individually atomic calls; it does not promise multi-tab serialization or permanent retention.

## Implementation sequence and files

1. **Session hydration and diagnostics.** Add the validated factory and explicit continuation diagnostics in `src/app/BattleSession.ts`; extend `tests/unit/battleSession.test.ts` with existing save fixtures. Reuse current validators, state flags and AI. Update `docs/battle-save-format.md` to explain resumed history.
2. **Persistence coordinator and accepted-state hook.** Add a small app-owned coordinator (proposed `src/app/BattlePersistence.ts`) around `src/persistence/battleStorage.ts`; connect one accepted-command callback. Unit-test startup/recovery/failure/replace behavior in `tests/unit/battlePersistence.test.ts`. Preserve the codec and two-key adapter contracts; no additional serializer or framework. Update `docs/battle-storage.md` with exact fallback and limits.
3. **Scene and controls.** Integrate `src/phaser/BattleScene.ts`, `src/phaser/start.ts`, `src/main.ts`, existing `src/ui/dialogs.ts`/`hud.ts`, `index.html` and `src/style.css` as needed. Defer gameplay until startup choice, make all restart entry points use the gate, preserve one Phaser game/canvas and clean shutdown. Use current modal/focus/gesture handling and sound preference.
4. **Browser integration and evidence.** Add `tests/battle-persistence.spec.ts`, reusing legal-action helpers from `tests/battle-loop.spec.ts` and existing clock control. Adjust typed diagnostics helpers for resumed replay unavailability while retaining existing fresh-game regressions. Publish actual acceptance evidence in `docs/qa/issue-73-battle-resume.md` and keep this plan current.

The [OpenSpec checklist](../../openspec/changes/issue-73-battle-resume/tasks.md) keeps focused tests and documentation beside each implementation step; consult its current checkboxes and the live handoff above.

## Acceptance and verification

- **Criterion 1 - hydration:** compare restored and uninterrupted state, actual next command/events, RNG and enemy decisions across accepted boundaries. Include seed 2/command 29, ongoing/ended, Guarded, malformed input and command-limit cases. Verify no historical cues and no fake full replay.
- **Criterion 2 - autosave:** prove exactly one save attempt per accepted boundary before presentation and none for preview/rejection/acknowledgement. Inject storage and callback failure; accepted state/RNG and play must survive.
- **Criterion 3 - controls and recovery:** browser keyboard/touch/mouse tests, focus and click-through checks, portrait/landscape sizing, backup selection, invalid/future/oversized saves, read denial, lossless raw export and explicitly confirmed removal. Preserve unrelated keys and original data on refusal.
- **Criterion 4 - safe fresh battle:** fault-inject every reset read/remove/reinspection and initial fresh-save operation. No transition or seed increment on incomplete invalidation. After success, reload selects only new data or no save. Include changed-value checks, double request, cancel, seed wrap and all restart entry points.
- **Criterion 5 - real-control lifecycle:** legally reach player/enemy presentation, reload during it, Continue and compare with an uninterrupted control. Complete legal victory/defeat, continue ended states, recover backup and restart repeatedly. Assert no duplicated commands/audio/listeners, usable focus/status and one canvas. Injected failure fixtures are not full-battle completion evidence.

Required implementation checks: focused regressions, `npm run test:unit`, `npm run validate:content`, `npm run typecheck` (both TypeScript configurations), `npm run build`, `npm test`, `openspec validate issue-73-battle-resume --strict`, and `git diff --check`. Record exact revisions, browser versions, profile counts and failures; no claimed clean full suite from partial reruns. Existing configured browser profiles are desktop and emulated Pixel 7 portrait/landscape.

## Boundaries and handoff

No combat/RNG/content/save identity changes, run/reward model, legacy importer, dependency upgrade, production operation or physical certification. PR #93's map work and #92's asset-base defect stay separate; recheck shared entry files before implementation. #57/#58/#74 remain open. A later implementation PR may close #73 only when all its own acceptance criteria are evidenced.

The [prior storage merge handoff](https://github.com/luminari-gurus/tactics-guru-v2/blob/5c8b912722c4ed25cfb4ff9acfaa8cbba442782b/docs/ongoing-projects/plan.md) and [completed storage plan](issue-72-battle-storage/plan.md) remain available. This active plan supersedes only the earlier next-session pointer. The original checkout's unrelated workflow/environment/AGENTS edits and Android-certification draft are preserved.

## Original planning validation (historical)

Planning commit `f4c0993` passed strict OpenSpec validation and all 12 relative links across eight Markdown files. At that point all 12 implementation tasks were unchecked and no game tests had run. The branch was natively linked to #73. The live handoff and QA report above supersede that planning-only status.
