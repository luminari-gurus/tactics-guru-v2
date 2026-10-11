# Issue #66: investigate intermittent iPhone Safari restart failure

## Task and publication

- Issue: [#66](https://github.com/luminari-gurus/tactics-guru-v2/issues/66).
- Assignee: `moshehbenavraham`.
- Claim: [we're on it](https://github.com/luminari-gurus/tactics-guru-v2/issues/66#issuecomment-6110480823).
- Published branch: [`work/issue-66-safari-restart`](https://github.com/luminari-gurus/tactics-guru-v2/tree/work/issue-66-safari-restart), linked through #66's native Development relationship.
- Base: `origin/main` at `a74bb5e1e68b24bdf0bf49ff3e6726bde6fb146a`.
- OpenSpec change: [`issue-66-safari-restart`](../../../openspec/changes/issue-66-safari-restart/).
- Status: implementation plan prepared on 2026-10-11; application changes, new tests and physical testing have not started. Implementation requires a subsequent instruction approving this plan.

## Backlog review and selection

The complete repository open-issue REST listing returned eight issues on one page (100-item page size), including bodies, labels, assignments, comment counts and dependency summaries. All eight had no comments before this task's claim. Open PR enumeration returned two PRs, #12 and #67. Remote branches, #66's native linked branches and explicit dependency endpoints were also checked. #66 had no linked branch or native dependency. Written prerequisites still matter even where GitHub's native dependency count is zero.

- **Choose [#66](https://github.com/luminari-gurus/tactics-guru-v2/issues/66):** a scoped P1 investigation with explicit acceptance criteria, an existing `ready for work` label, no assignee before this claim, no active implementation branch/PR, and merged supporting restart tests. Resolving or explicitly disposing of this report advances the remaining [#57](https://github.com/luminari-gurus/tactics-guru-v2/issues/57) acceptance work and informs [#64](https://github.com/luminari-gurus/tactics-guru-v2/issues/64) certification. Physical validation is a delivery requirement, not a prerequisite to starting diagnosis.
- **[#65](https://github.com/luminari-gurus/tactics-guru-v2/issues/65):** ready label present, but assigned to `dubstylee` and implemented by open [PR #67](https://github.com/luminari-gurus/tactics-guru-v2/pull/67). Do not duplicate or claim it.
- **[#68](https://github.com/luminari-gurus/tactics-guru-v2/issues/68):** a well-scoped optional experiment, but its cached-texture baseline is in unmerged #67. Leave unready until that prerequisite is on main.
- **[#64](https://github.com/luminari-gurus/tactics-guru-v2/issues/64):** audio is now merged, but the complete physical-device/browser matrix and selected integrated build are not available as verified evidence here. Keep its readiness label unchanged; this session cannot certify hardware.
- **[#57](https://github.com/luminari-gurus/tactics-guru-v2/issues/57):** parent acceptance tracker with existing children, not a single ready implementation task.
- **[#58](https://github.com/luminari-gurus/tactics-guru-v2/issues/58):** safe-resume epic; schema investigation can start, but the issue explicitly requires scoped children and forbids marking the parent ready.
- **[#59](https://github.com/luminari-gurus/tactics-guru-v2/issues/59) and [#60](https://github.com/luminari-gurus/tactics-guru-v2/issues/60):** unsplit epics with unresolved RunState/reward decisions and safe-resume dependencies. Do not select or promote their parents.

No issue required an evidence-backed readiness promotion. Existing labels and other people's assignments remain intact. #66 wins on current P1 acceptance impact and concrete scope; no speculative downstream implementation dependency is claimed.

The public repository Projects page reports no linked projects. Authenticated Projects enumeration requires the unavailable `read:project` scope, so private project-only drafts are outside the verified inventory. The eight repository issues and two open PRs were fully enumerated. [#1](https://github.com/luminari-gurus/tactics-guru-v2/issues/1) is already closed; stale issue-body statements do not reopen it or prove completion of still-open #57/#64/#65/#66.

## Outcome and evidence boundary

Investigate the reported failure after a legal defeat on iPhone 16 Pro, iOS 27.0.1, Safari version unknown: Restart battle displayed an error and required a reload, while the next defeat/restart succeeded. The last reported preview was `https://15a9d5a6.tactics-guru-v2.pages.dev`; the actual failure URL, orientation and exact error remain unconfirmed.

The outcome is either a reproduced, narrowly fixed lifecycle defect with retained regression and physical evidence, or a precise unreproduced disposition retaining the original failure, successful retry and remaining checks. A successful automated run alone cannot close the hardware acceptance criterion.

## Current code and prior work

- [`src/ui/dialogs.ts`](../../../src/ui/dialogs.ts): the outcome button closes the native dialog, resets input, invokes the shared restart callback and then restores focus.
- [`src/main.ts`](../../../src/main.ts): one application-owned toolbar listener sets loading before calling restart. Its synchronous catch and global error/rejection handlers replace the original exception with generic player-facing messages. This is an observed evidence gap, not a diagnosed cause.
- [`src/phaser/start.ts`](../../../src/phaser/start.ts): the callback invokes `scene.scene.restart()` on the existing Phaser scene/game. Audio recovery ownership is installed once per game.
- [`src/phaser/BattleScene.ts`](../../../src/phaser/BattleScene.ts): per-run `live`/`ready` guards, async presentation, POST_RENDER readiness, input/resize/visibility listeners and shutdown cleanup. Cleanup disposes session/audio, cancels animation and removes UI/listeners.
- [`src/phaser/BoardRenderer.ts`](../../../src/phaser/BoardRenderer.ts): animation cancellation calls its completion path, including a redraw. #67 adds a destroyed-root guard because its image-based renderer exposed a reproducible shutdown regression. That separate evidence is relevant, but does not establish the historical Safari cause on main.
- [`src/phaser/contentLoading.ts`](../../../src/phaser/contentLoading.ts), [`src/phaser/BattleAudio.ts`](../../../src/phaser/BattleAudio.ts) and [`src/app/BattleSession.ts`](../../../src/app/BattleSession.ts): existing bounded loading, audio teardown and generation/token guards must be preserved.
- [`tests/battle-loop.spec.ts`](../../../tests/battle-loop.spec.ts) already completes legal seed-1 defeat and seed-2 victory and restarts directly from the outcome dialog, checks readiness/one canvas/page errors, and covers restarts during presentation. [`tests/helpers/battlePolicy.ts`](../../../tests/helpers/battlePolicy.ts) drives actual controls; reuse it.
- [PR #61](https://github.com/luminari-gurus/tactics-guru-v2/pull/61) and audio [PR #63](https://github.com/luminari-gurus/tactics-guru-v2/pull/63) are merged and their merge commits are ancestors of this base. Existing [QA evidence](../../qa/issue-11-battle.md) and the [audio handoff](../plan.md) remain intact.

## Implementation sequence

1. **Pin and reproduce.** Refresh main and #67 before implementation; record source/served commit and any integration change. Start on merged main, never silently import #67. Retain the original report. Use the existing legal battle policy to exercise defeat and victory followed immediately by the outcome-dialog restart, and compare the toolbar path. Capture the first failure before retrying. Record exact error/stack, device/OS/Safari version, seed/replay, orientation, URL/build, cache state, sound state, visibility/focus history and timing relative to scene readiness/presentation. Mark unavailable values explicitly.
2. **Make failure evidence accessible only where needed.** First use browser page-error/console/trace capture and the existing `fitDiagnostics` build/run snapshot. If physical reproduction loses the cause behind the generic error, add a small bounded in-memory failure record to existing diagnostics and a way to copy it from the existing error/report surface on mobile. Preserve the player-facing error. Capture the original ErrorEvent/rejection/synchronous exception with run/build/phase context; avoid raw storage, credentials, remote telemetry, persistent logs or a general logging framework. Add only tests that exercise the exposed diagnostic behavior.
3. **Trace lifecycle ownership.** Check dialog close/focus ordering, restart reentry/readiness, Phaser shutdown ordering, animation cancellation and promise continuation, POST_RENDER readiness, resize callbacks, loader completion and audio callbacks. Reproduce targeted timing with the existing controlled-clock patterns where possible. Compare the teardown guard already in #67; distinguish that known regression from this report and coordinate any overlapping fix.
4. **Fix a confirmed cause.** Before changing behavior, retain a meaningful failing regression through the real restart path. Apply the smallest ownership/cancellation/error-handling correction proven by that test. Preserve new-seed behavior, deterministic replay/RNG, accepted-command boundaries, sound preference and input semantics. Do not add broad retries or suppress exceptions to manufacture success. If no cause is established, retain useful evidence capture and document the unreproduced status instead of guessing a fix.
5. **Verify and publish evidence.** Repeat legal defeat/victory restarts in the configured desktop/portrait/landscape suite and focused WebKit iPhone emulation, with immediate and post-background/foreground restarts and sound off/on. Exercise presentation cancellation without forcing outcomes. On physical iPhone Safari, record repeated legal victory and defeat restarts in both orientations with exact attempt/pass/failure counts. Verify one canvas and dialog, fresh readiness, one new seed per restart, no stale command/audio/listener effects, and no page/console errors. Use controlled-clock emulation only as supporting evidence.
6. **Record disposition.** Add `docs/qa/issue-66-safari-restart.md` plus necessary raw captures under `docs/qa/issue-66/`. Link #66 to the exact candidate, evidence and any overlap with #67. Keep #64's broader device matrix and #65's frame acceptance separate. If hardware evidence is missing or the report remains unreproduced, list the limitation and keep acceptance open unless the owner explicitly accepts a narrower disposition.

## Acceptance mapping and proof

- **AC1 — exact failure context:** preserve the historical report and successful retry, then record any new error/stack with source/served build, orientation and lifecycle/gesture conditions. Capture failures before retries. Unknowns stay unknown.
- **AC2 — diagnosis and regression:** document the traced restart/shutdown/callback path; every claimed root-cause fix needs a retained failing-before/passing-after regression. #67's different reproduction is comparison evidence only until equivalence is demonstrated.
- **AC3 — repeated physical restarts:** legal victory and defeat, both orientations, fresh run readiness, one canvas, no stale effects/listeners and no browser errors on physical iPhone Safari. No outcome/state injection. Emulation does not satisfy this criterion.
- **AC4 — honest disposition:** report attempts, retained failures, unreproduced conditions and missing checks explicitly. Neither a retry nor merged audio/performance work is proof of a Safari fix.

For runtime changes, run the relevant focused regressions first, then the repository's configured `npm run test:unit`, `npm run validate:content`, `npm run typecheck`, `npm run build`, `npm test`, `openspec validate issue-66-safari-restart --strict`, and `git diff --check`. Use the installed runtime/direct CLI equivalents if npm is absent from PATH; record exact commands and browser versions. Keep one browser worker and existing timeouts. The configured browser suite is Chromium; select only portable restart tests for a separate WebKit profile, since CDP-only touch cases cannot run unchanged in WebKit. Preserve existing performance budgets and remeasure any material diagnostic/render cost through the existing measurement/release path.

This planning publication requires only plan/link review, strict OpenSpec validation, whitespace checks, and local/remote Git parity. No runtime test result or physical-device result is claimed by this document.

Planning validation: OpenSpec 1.14.1 `validate issue-66-safari-restart --strict` passed; all four required artifacts exist and implementation checkboxes remain unchecked. All 17 relative Markdown links across the five Markdown files resolve. The CLI was installed in an isolated temporary tools directory because it was absent from PATH; application dependencies were not changed.

## Files, scope and risks

Expected changes are limited to the demonstrated restart owner among `src/main.ts`, `src/ui/dialogs.ts`, `src/phaser/BattleScene.ts` and `src/phaser/BoardRenderer.ts`; `src/diagnostics/browser.ts` only if current capture is insufficient; the existing restart tests/helpers plus a focused WebKit configuration if needed; and the QA report/evidence. Loader/audio/session files are investigation targets, not preauthorized blanket refactors. Add a unit test file only for a real uncovered behavior.

No renderer rewrite, game-rule change, save/resume, new asset/dependency, deployment mechanism, Access configuration, production cutover, speculative retry layer, #67 integration, or broad device certification. No PR, implementation, merge or issue closure is part of this planning publication.

The plan is already minimal: it reuses existing diagnostics, actual-control battle policies and lifecycle tests, makes additional capture conditional on a demonstrated gap, and ties repairs to evidence. Main and #67 may move; reconcile before implementation without discarding either branch's fixes. Physical Safari access and intermittent reproduction remain the principal acceptance risks.
