# Issue #106 — signature ability animations

Updated 2026-10-14 (Asia/Jerusalem). **Planning only; implementation has not started.**

- Issue: [Add battle animations for Guarded Strike, High Shot, and Magic Missile #106](https://github.com/luminari-gurus/tactics-guru-v2/issues/106).
- Assignee: `moshehbenavraham`; [claim comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/106#issuecomment-6165482833).
- Task branch: [`branch/issue-106-ability-animations`](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-106-ability-animations).
- Base: `main` at `6292b1c808fc7d18aab2a70da7cfe8bbdef87837`.
- Worktree: `C:/Users/apexw/.codex/worktrees/issue-106-animation-plan/Tactics-Guru`.
- OpenSpec: [proposal](../../openspec/changes/issue-106-ability-animations/proposal.md), [design](../../openspec/changes/issue-106-ability-animations/design.md), [specification](../../openspec/changes/issue-106-ability-animations/specs/battle-ability-presentation/spec.md), [tasks](../../openspec/changes/issue-106-ability-animations/tasks.md).
- Previous completed work: [PR #105 merge and next-session handoff](https://github.com/luminari-gurus/tactics-guru-v2/blob/6292b1c808fc7d18aab2a70da7cfe8bbdef87837/docs/ongoing-projects/plan.md). Its acceptance record remains in Git and `docs/qa/`; this plan takes over the active handoff.

## Why this item

The [backlog review](issue-106-ability-animations/backlog-review.md) covers all 18 open repository issues, their comments/dependencies, 50 branches and the open PR. #106 and #108 are the eligible ready choices; #106 has concrete acceptance and wins the oldest-issue tie-break without inventing downstream dependencies. #76 is already assigned; #77 still needs reviewed item choices; release and physical-device tasks retain their gates. No readiness label changes were justified. Private Projects drafts could not be enumerated because the credential lacks `read:project`; the public repository Projects page lists none.

Available physical mobile platform: **Android**, read from the caller's local `.env`. Required by #106: desktop/mobile visual and interaction coverage in portrait/landscape, with no explicit physical-iOS certification requirement. Browser profiles provide emulated coverage; physical Android checks, if performed, must be recorded separately. No hardware testing has been performed for this plan.

## Outcome and scope

Give each existing signature a short recognizable effect from actor to target: a melee slash and fighter shield cue for Guarded Strike, an arrow for High Shot, and a magical projectile/impact for Magic Missile. Display resolved hit/miss/damage/guard/defeat at the correct unit. Reuse current visual style, board-local drawing and the existing animation handle.

Keep combat rules, action economy, HP, RNG, command identity, autosave boundaries and automatic-hit Magic Missile unchanged. Preserve movement/basic/enemy fallback presentation, current action/target/review semantics and audio. No new abilities, content assets, balance changes, framework, dependencies, HUD redesign or save format. [#108](https://github.com/luminari-gurus/tactics-guru-v2/issues/108) owns the separate controls design.

## Code-grounded implementation

1. **Describe the resolved effect.** Read `abilityUsed`, `attackRolled`, `missileRolled`, `damaged`, `guarded` and `defeated` from accepted events. Attack `unitId` is the actor and `targetId` is the defender; damage/defeat `unitId` is the affected unit. Use before-state anchors even for a defeated target. A small pure descriptor helper is allowed if it improves isolated tests; no new domain event or rule is needed.
2. **Draw under the existing board root.** Extend `BoardRenderer.animate` with temporary Graphics/Text and one progress tween. Project anchors with `projectTile`; root pan/zoom/fit then carries effects with the units. Start with roughly 280–420 ms per signature and tune through captured intermediate frames. Stage or offset labels so damage and defeat do not overlap, and show guard on the fighter even on a miss.
3. **Finish safely.** Keep `{done, cancel}` and use one idempotent finish path for tween stopping, temporary-object cleanup and promise resolution. Guard updates and final snapshot rendering when shutdown has already destroyed display objects. Preserve `BattleScene`'s live/session-token guard, hidden-document cancellation and phase recovery. Avoid permanent sprite mutations when temporary graphics suffice.
4. **Keep persistence and history intact.** `BattleSession` already commits and invokes autosave before presentation. Effects never dispatch, roll, save or resolve again. Preserve synchronous page-departure shutdown and current-save startup on BFCache return; Continue must not replay historical effects.
5. **Prove behavior and appearance.** Extend existing real-control/seeded helpers and controlled-clock browser tests for each signature, outcomes, cancellation and transforms. Add only minimal read-only effect fields to existing diagnostics where assertions need them. Inspect mid-effect and impact screenshots, then run integrated checks and record acceptance evidence.

## Expected files

- Primary: `src/phaser/BoardRenderer.ts` for event-driven rendering, label placement, bounded temporary objects and cleanup.
- Conditional: `src/phaser/abilityPresentation.ts` plus focused unit tests for a small pure event mapping; `src/phaser/BattleScene.ts` only for demonstrated integration needs. Reuse existing diagnostics instead of adding an independent framework.
- Tests: a focused `tests/battle-animations.spec.ts`, existing `tests/helpers/battlePolicy.ts`, `tests/battle-loop.spec.ts` and `tests/battle-persistence.spec.ts` where shared behavior requires extensions. Existing domain/session suites remain regression oracles.
- Evidence/handoff: `docs/qa/issue-106-ability-animations.md`, this plan and the OpenSpec task status. No runtime/test file has been edited in this planning commit.

## Acceptance and verification

1. **Recognizable animations through normal controls:** execute all three signatures with real action/target/review/confirm controls; capture travel/strike and impact frames. Verify distinct shapes and actor-to-target direction in all three browser projects.
2. **Feedback matches events:** cover attack hit, miss, critical, guard-on-miss, damage and defeat; verify labels belong to affected units and match event values. Magic Missile uses its existing damage result and never gains a roll-to-hit/miss branch.
3. **Presentation only and exactly once:** compare frozen event inputs, full replay/state/events, command count, next RNG and accepted save boundaries across completed/cancelled effects. Preview cancellation/rejection has no effect. Reuse domain/session contracts and legal seeded battles rather than simulating combat in tests.
4. **Input gating and repeated use:** pause during each signature, attempt repeated confirmations/action inputs, and verify no extra command/effect. After completion/cancellation, controls match the correct player/enemy/ended phase. Repeated uses leave no transient objects or callbacks.
5. **Lifecycle:** cancel repeatedly; hide/show; open/cancel the restart dialog; confirm restart during travel and impact; depart/return through real BFCache; reload/Continue at an accepted boundary. Verify fresh run readiness, no stale callbacks/effects, one canvas, unchanged current-save bytes before Continue, and no page/console errors. Retain existing player/enemy/movement restart and four real-history regressions.
6. **Alignment/readability:** pan/zoom before and during effects, use elevated targets, resize/rotate, and inspect desktop plus mobile portrait/landscape images. Check canopy occlusion, label overlap and clear non-color-only distinctions. Emulated success does not certify physical devices.
7. **Configured verification:** run the commands below and record exact source/build identity, counts, failures, retries, screenshots and limitations in the QA report. Every issue criterion must have evidence before a closing PR reference is used.

Suggested implementation checks (not run during planning):

```text
npm run test:unit
npm run validate:content
npm run typecheck
npm run build
npm test -- tests/battle-animations.spec.ts tests/battle-loop.spec.ts tests/battle-persistence.spec.ts
npm test
npm run build -- --base=/prototype/
PLAYWRIGHT_BASE_PATH=/prototype/ npm test -- tests/battle-animations.spec.ts tests/battle-persistence.spec.ts
npm run build
openspec validate issue-106-ability-animations --strict
git diff --check
```

Environment notation above is conceptual: in PowerShell use `$env:PLAYWRIGHT_BASE_PATH='/prototype/'` and remove it for root checks. This host has bundled Node/Git but no `npm` or `gh` executable on PATH. Reuse the documented ignored npm wrapper when implementation needs package commands; do not change package/lockfiles to work around PATH. The available OpenSpec 1.14.1 entrypoint is `node C:/Users/apexw/AppData/Local/npm-cache/_npx/c37562604d2d088d/node_modules/@fission-ai/openspec/bin/openspec.js`, with `OPENSPEC_TELEMETRY=0`. Browser execution can use `PLAYWRIGHT_CHROMIUM_EXECUTABLE=C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`; verify availability when implementation begins.

## Risks and completion boundary

Longer animations can expose cancellation races and increase battle duration; keep bounded phases and meaningful timeouts. Refresh/resize can render committed snapshots while transient effects exist; keep effects independently anchored and test those transitions. Shutdown may destroy objects before cleanup; finish must be safe and idempotent. Visual quality needs inspected intermediate frames, not just passing DOM assertions. See the design for these decisions and mitigations.

Planning validation passed: strict OpenSpec validation, all 10 relative document links and whitespace checks. All four planning artifacts are present; all eight implementation tasks remain unchecked. The branch is natively linked in #106's Development section. Application tests are intentionally not run for this documentation-only change. Implementation is unapproved. No PR, merge, manual deployment or production activation is part of this request; existing hosting automation may build branch pushes.

After approval, continue this same issue/branch and OpenSpec change, record the approval, then implement the checklist. Do not reselect work or reopen completed #105 scope.
