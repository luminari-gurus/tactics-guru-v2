# Tasks

Implementation authorized by the caller on 2026-10-30: “pick up the issue and start working on it”. Work is in progress.

## 1. Approval and supplied artwork

- [x] 1.1 Record explicit caller approval of this proposal/design, including Continue selection, dungeon New Game, bounded dialog destinations, and `/battle` routing; verify approval in the conversation before application/test edits.
- [x] 1.2 Receive the caller-designated title attachment, inspect it, and retain the unchanged original with source/hash/provenance. Supplied `Tactics Guru.webp` is saved at `docs/art/issue-153/source/tactics-guru.webp`; metadata confirms 2172×724 (3:1) with alpha. The caller explicitly identified it as the title image; the earlier Discord 403 no longer blocks source availability.
- [x] 1.3 Refresh current main and coordinate with active work without importing unmerged PRs; record source identity and confirm the approved scope still applies using status/diff and open-PR inspection.

## 2. Routes and isolated entry

- [x] 2.1 Add the base-aware route classifier/builders and menu dispatch, preserving the three explicit root scene values and supported mode routes; verify root/prefix/trailing-slash/unknown-query cases with `tests/unit/routes.test.ts`, both type scopes, and focused boot tests.
- [x] 2.2 Audit root-as-battle consumers across browser helpers, specs, telemetry, collector modules and batch selection. Update canonical URLs without dropping query flags/assertions; verify before/after test discovery accounting and `measureFitOptions`/preview units. Document route migration in README with working links.
- [ ] 2.3 Keep menu outside Phaser/audio and existing battle telemetry classification; verify browser network/canvas/no-audio assertions, existing telemetry unit cases, and configured production/development entry cases.

## 3. Save discovery and explicit handoffs

- [x] 3.1 Implement read-only per-mode save summaries using existing readers and a side-effect-free run context; verify the full slot/status matrix, zero writes/session creation/RNG use, terminal saves and legacy-key preservation in `tests/unit/menuSaves.test.ts`. Document eligibility/backup warnings.
- [x] 3.2 Implement single-mode Continue and stable multiple-mode chooser plus explicit recovery access, refreshing on storage/focus/pageshow; verify real validated saves, invalid/backup/unavailable states, changed-save races, cancellation and no write on menu entry in `tests/main-menu.spec.ts`.
- [ ] 3.3 Add one-shot closed-set destination intents to battle/run/dungeon startup through their existing continuation/recovery/replacement owners; verify legal resume, stale/missing data, corrupt primary/valid backup, New Game confirmation/cancel/failure/repeat input, and unchanged unselected save families.
- [ ] 3.4 Add mode Main menu links with existing unsaved-state/recovery conventions and lifecycle cleanup; verify accepted progress, reload/back/forward and unsaved leave confirmation without stale callbacks. Document the handoff and return behavior alongside the navigation contract.

## 4. Menu presentation and bounded destinations

- [x] 4.1 Render the ordered action definition and separate title/control/background layers with portrait CSS, safe areas and scrolling; verify native keyboard focus/disabled state, minimum target size, touch portrait/landscape, 320px width, short viewport, 200% text and reduced motion. Retain screenshots and update design documentation to describe implemented behavior.
- [ ] 4.2 Derive optimized background assets from the two supplied originals in `docs/art/issue-153/source/`, compare menu readability over both compositions, and import the supplied title as a separate stable optimized asset; verify provenance, preserved dimensions, readable composition, local root/prefix requests, transfer/build deltas and independent missing/corrupt image fallbacks. Do not mark this task complete using fallback text alone.
- [x] 4.3 Implement Records empty-state and Settings with existing privacy controls/audio guidance; verify exact scope, no invented records/settings, keyboard/touch/Escape close and focus return, unavailable preference storage, and privacy behavior without gameplay/save mutation. Document that #176/#180 remain separate work.

## 5. Integration qualification and delivery

- [ ] 5.1 Freeze final relevant inputs and complete source-bound full-regression accounting using `npm run verify:full` and explicit menu Chromium/WebKit selections on qualified exclusive self-hosted capacity. Verify both type scopes/build, units/build integrations, ordinary/fixture/dev-placement suites, both WebKit configs, health bars, separate production/dev telemetry, asset root/prefix preview/dev, performance and root restoration. Retain source/build/asset identity, commands, actual reports/skips/failures and valid reused evidence; do not weaken assertions or restart unaffected passing suites for prose edits.
- [ ] 5.2 Audit every #153 criterion against the design acceptance table, including exact title availability and all menu states; retain a QA report, screenshots, discovery comparison and honest limitations. Verify `openspec validate issue-153-portrait-main-menu --strict` and `git diff --check`.
- [x] 5.3 Commit/push only approved issue work and open/attach one PR after checking for an existing branch PR; verify remote parity and PR base/body. Use `Closes #153` only with all acceptance verified, otherwise a draft with `Refs #153` and precise remaining gates.

## Workflow follow-up

- Leave merge and deployment outside this workflow. Archive the OpenSpec change only after merge under repository instructions.

## Implementation progress (2026-10-30)

Runtime implemented and focused checks retained in `docs/qa/issue-153/README.md`.
The remaining unchecked implementation tasks have code in place; their complete
regression/edge-case qualification remains open. The self-hosted full job is dispatched for the final runtime/test inputs;
PR #256 is a draft pending that result. No merge readiness or issue completion is claimed.
