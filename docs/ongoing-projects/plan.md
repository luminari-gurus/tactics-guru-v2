# Issue #145 — default to Move once per player turn

Updated 2026-10-19 (Asia/Jerusalem). Status: **implementation in progress in the dedicated issue-145 worktree**.

## Active handoff

- Worktree: `C:/Users/apexw/.codex/worktrees/issue-145-default-move/Tactics-Guru`; branch and remote both began at `b1bd7e7`. Refreshed `origin/main` remains `41ca782`.
- Caller authorized implementation, validation and focused PR publication. No merge/deployment is requested.
- OpenSpec change: `issue-145-default-move` (spec-driven). Its concise artifacts now track this implementation; this supersedes the planning-only suggestion below to omit change artifacts.
- Implementation commit `bed900c` is pushed and [PR #150](https://github.com/luminari-gurus/tactics-guru-v2/pull/150) is open, non-draft and mergeable against main. Startup and command-limit regressions both failed before their respective repairs. [QA evidence](../qa/issue-145-default-move.md) maps all eight acceptance items.
- Current checks: 712 unit tests, production build (167 content checks plus both typechecks), strict OpenSpec and whitespace pass. The focused 21-case three-profile browser run is in progress in `tmp/focused-default.txt`; desktop and portrait direct selection/boundary cases passed, run progression is still running. No completed full-suite claim yet.
- Next: finish the focused run, build the committed candidate, run full `npm test` including posttests, review/retain screenshots, mark OpenSpec tasks as proven, update this handoff and PR, and verify clean remote parity. Keep #145 open for PR review/merge.
- Windows runtime has Node but no npm on PATH. Use Node with `C:/Users/apexw/AppData/Local/node/corepack/v1/npm/12.0.2/bin/npm-cli.js`; a local ignored `tmp/bin/npm.cmd` wrapper supplies npm to build/Playwright subprocesses. OpenSpec and gh are available in WSL. Dependencies installed with npm ci (44 packages, zero audit findings).

- Work item: [#145 — Default to Move at the start of each player turn](https://github.com/luminari-gurus/tactics-guru-v2/issues/145).
- Implementation branch: [`branch/issue-145-default-move`](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-145-default-move), created through GitHub's native linked-branch mutation and attached to #145's Development relationship.
- Inspected base: `main` at `41ca7829271b1b6873819819d1d1e7e8c2f72419`, including merged map-picking PR #149 and active-unit bob changes. Refresh main before implementation and review intervening scene/HUD changes.
- GitHub assigns #145 to `moshehbenavraham`. Inspection returned no linked branch, matching PR, parent, sub-issue or explicit blocking dependency. #145 is the only work item this branch claims.
- The [previous shared plan](plan-before-issue-145.md) is preserved byte-for-byte at the same directory depth, retaining its relative links and historical performance/control handoffs. Its instructions do not expand this issue's scope.

## Outcome and non-goals

**Outcome:** on the first usable decision of each player-controlled unit turn, select Move when available. The existing selected action, legal destination options and board range must agree. Players can immediately choose a destination or explicitly select another action. Apply the default once per turn, preserving explicit choices across ordinary refreshes and the current cancellation/post-action behavior. Cover standalone battles and `/run` encounters, initial enemy execution, round wrap, restart and scene reconstruction.

**Non-goals:** change no movement/action costs, pathfinding, combat rules, initiative, enemy decisions, save/replay formats, assets, dependencies, camera/picking behavior or HUD layout. Add no preference setting, automatic destination, prepared intent, command confirmation or automatic end-turn. Do not implement unrelated issues, reopen historical performance work, merge or deploy. Action selection alone must leave state, RNG, accepted commands and persistence unchanged.

## Verified codebase findings

These are source observations at the inspected commit, not fresh browser reproduction or implemented acceptance.

1. **The initial selection is missing; range rendering already exists.** [`BattleScene.begin`](../../src/phaser/BattleScene.ts) starts with `action=null` (line 56), while `refresh` already draws `previewMovement` reach for null or Move (lines 65–72). This is not evidence of a missing range renderer. The unpressed button and disabled destination dropdown are the initial gap.
2. **The HUD already renders the required selected state.** [`BattleHud.render`](../../src/ui/hud.ts) sets `aria-pressed` from the supplied action and disables buttons for non-player phases/spent budgets (lines 104–125). It obtains movement destinations from `previewMovement`, excluding the zero-cost origin (lines 137–140). Reuse this path rather than adding another selection store or CSS state.
3. **Null action and player phase do not identify new turns.** Scene `clear` resets action to null, and `present` calls it after every accepted command, including movement and abilities (lines 64, 110–119). Full cancel also clears action. [`BattleSession.finishPresentation`](../../src/app/BattleSession.ts) can return to the same player's turn after movement or attack. A null-action fallback or every transition back to player phase would incorrectly reselect Move after cancellation or acting before moving.
4. **The authoritative turn identity exists.** [`endTurn`](../../src/domain/turns.ts) advances `activeIndex`, skips defeated units, increments `round` on wrap, resets the next actor's budgets and emits `turnStarted`. Within one battle, `(state.round, session.active.id)` distinguishes turns, including the same surviving hero in a later round. `commandCount` changes on every command and is unsuitable. Constructor events are not appended to `session.events`, so a later-events-only listener misses startup. Accepted state can already contain the next actor while presentation remains locked; wait for a usable player phase.
5. **Availability and legality already have owners.** [`grid.ts`](../../src/domain/grid.ts) validates active state, spent movement, occupancy, terrain, jump and cost. `previewMovement` can succeed with only the origin; that cell is not a destination. There is no current rooted/stunned status to invent policy for. The HUD's ordinary disabled cases are non-player phases and `hasMoved`; domain validation remains authoritative, including command-limit rejection. Do not bypass these restrictions or manufacture a new movement rule.
6. **One shared scene covers both entry paths.** Standalone save/start controls call `begin`; [`startRunApp.startBattle`](../../src/app/startRunApp.ts) constructs the same scene with a run-hosted session. Recreated scenes have no persisted explicit UI action to restore. A resumed turn with spent movement must not default to Move; a resumed turn with movement available may receive the initial UI default without mutating its saved state.
7. **Existing coverage can pass without this feature.** [`battle-loop.spec.ts`](../../tests/battle-loop.spec.ts) and [`battlePolicy.playCommand`](../../tests/helpers/battlePolicy.ts) click an action before targeting. They do not prove an automatic default. [`battle-board.spec.ts`](../../tests/battle-board.spec.ts) explicitly expects Move to become unpressed after right-click cancellation; preserve that behavior. Existing [`battleSession.test.ts`](../../tests/unit/battleSession.test.ts) checks preview immutability, enemy-first sessions, locks and replay, but cannot prove the scene/HUD selection.

## Minimal implementation sequence

1. **Reproduce the behavior gap through existing browser tests.** Add default-selection assertions before any action click. Use `BattleSession`, accepted commands and existing save/Continue helpers to reach player-first/enemy-first starts, later turns, round wrap, a move-spent boundary and a legal attack-before-move boundary. The initial Move-selection assertion must fail on the unchanged base. Use validated artificial states only for isolated domain boundary cases, clearly identified as such.
2. **Add one scene-local initialized-turn marker.** Inside `begin`, retain the last initialized `(round, active unit ID)` alongside `action`. Before rendering a usable player decision, compare that tuple. If new, record it even when movement is unavailable, and set the initial action to Move only when existing movement availability permits. An idempotent check in the existing refresh path, gated by scene readiness and player phase, covers both initial readiness and `finishPresentation`. Do not key on null action, object identity, command count or phase transition alone.
3. **Set UI state only.** Set the initial action and a suitable destination prompt. Leave selected cell, cursor, pending command and focus alone. Do not invoke the existing action callback on a stale selected tile, or call `prepare`, `confirm` or `dispatch`. Reuse reach, preview, dropdown options, `aria-pressed` and captions. No new renderer, action-selection service or event subscription is needed.
4. **Preserve same-turn behavior.** Explicit action choices, hover/selection refreshes, inspection/log dialogs, visibility changes and cancel do not reset the marker. Retain `clear` and current modal-cancel behavior. After an accepted move or attack, action is cleared as today and the same turn does not regain its default. Wait defaults the next player turn only after presentation/enemy work settles. Restart and a new run encounter get a new marker through the existing scene closure; existing live/token/disposal guards still reject stale callbacks.
5. **Keep availability consistent.** Never select or newly enable Move in enemy/presenting/ended/error phases or when movement is spent. Reuse existing movement legality for initialization; origin-only reach does not preselect a destination or create an intent. Preserve the existing blocked-destination behavior. If a reachable acceptance fixture reveals disagreement between initialization eligibility and the HUD's enabled state, align that narrow check in `hud.ts` with the existing domain result and add direct regression proof. Do not build a general availability framework or new status rules.
6. **Update the behavioral contract and record proof.** Update the existing battle-controls specification for once-per-turn initialization, explicit-choice precedence and unchanged confirmation/cancel behavior. Record exact source/build/browser/profile, results and screenshots in `docs/qa/issue-145-default-move.md` and `docs/qa/issue-145-default-move/`. Keep #145 open until implementation and acceptance are complete.

## Acceptance and proof

The following items map in order to all eight acceptance checkboxes in #145. Extend existing tests; do not add a duplicate harness.

1. **First and subsequent turns:** without clicking Move, assert enabled/pressed Move at player-first startup and after an enemy-first opening. Use real Wait/enemy progression to reach another hero and the same hero in a later round; both receive the default. Assert no default during locked phases. This proves startup, actor changes and round wrap rather than just one seed or hero.
2. **Normal selected UI and movement preview:** compare reachable cells and native destination options with `previewMovement`. Before input, assert no selected destination, null pending intent and disabled Review. Selecting a legal tile or dropdown destination must produce the existing cost/path preview and enable Review without executing movement.
3. **Explicit override:** choose Basic attack and signature separately before moving. Exercise ordinary board/hover updates, inspect/log open-close, layout refresh and visibility restoration using existing helpers. The chosen action and target overlays remain selected. Unconfirmed selections/previews change no authoritative state/RNG, accepted commands or saved bytes.
4. **Reset for the next turn:** leave another action selected and Wait. The next usable player turn defaults to Move instead of inheriting it. Include round wrap and `/run` encounter transitions; an old scene's marker/selection must not leak.
5. **Selection never executes:** exercise mouse selection on desktop, touch taps in mobile projects, and canvas keyboard navigation/Enter without first clicking Move. Compare state/RNG/commands/storage before and after unconfirmed preview and cancellation. Deliberate Confirm accepts exactly one move. Retain Escape, full Cancel action, right-click, modal cancel and drag/pinch/captured-pointer regressions. A refresh after full cancel leaves the action unselected that turn; modal cancel retains its existing action-specific behavior and focus restoration.
6. **Unavailable movement:** Continue a legally reached `hasMoved=true` state. Move stays disabled/unpressed; no movement target or pending intent appears; remaining actions/Wait obey current budgets. Verify enemy, presenting and ended locks, existing domain rejection and origin-only/no-destination behavior. Do not invent a new immobilization rule. Any narrow availability repair selected in step 5 requires a direct failing-before/passing-after case.
7. **Post-move and post-attack flow:** confirm a move, settle presentation, and verify spent Move, no re-applied default and usable remaining-action controls. Separately confirm a legal attack before movement; action stays cleared on that same `(round, actor)` boundary, and unspent Move remains manually selectable. Terminal outcome stays locked. Replay accepted records to verify unchanged command/state/event results.
8. **Regression and interaction evidence:** run the focused behavior in desktop, mobile portrait and mobile landscape Playwright projects. Extend `/run` start/encounter-transition assertions; retain restart and spent/available-movement Continue checks. Capture the initial default, explicit override and post-move state with exact candidate identity. Playwright emulation satisfies [AGENTS.md](../../AGENTS.md); physical hardware is not a gate and must not be claimed as tested.

## Files

- Primary implementation: [`src/phaser/BattleScene.ts`](../../src/phaser/BattleScene.ts).
- Conditional, only if demonstrated necessary for consistent availability or wording: [`src/ui/hud.ts`](../../src/ui/hud.ts). Existing selected-state rendering and movement options should suffice.
- Extend [`tests/battle-loop.spec.ts`](../../tests/battle-loop.spec.ts), [`tests/battle-board.spec.ts`](../../tests/battle-board.spec.ts), [`tests/battle-persistence.spec.ts`](../../tests/battle-persistence.spec.ts) and [`tests/run-progression.spec.ts`](../../tests/run-progression.spec.ts) for the specific gaps above. Reuse [`tests/battle-animations.spec.ts`](../../tests/battle-animations.spec.ts), existing session/save fixtures and battle policy helpers. Touch shared helpers only when multiple real new callers need the setup.
- Documentation: [`openspec/specs/battle-controls/spec.md`](../../openspec/specs/battle-controls/spec.md), this plan and issue-specific QA evidence. Reuse existing domain/session/input unit checks; do not test the spelling/storage of the marker or change domain files solely to make UI tests easy.

## Ablation decisions

**Keep** one local turn marker, existing movement eligibility/preview paths and scene/HUD regression evidence. Omitting the marker cannot distinguish new turns from clear/presentation/refresh in the same turn. Omitting browser evidence leaves the real automatic-selection requirement unproven by tests that explicitly click Move.

**Simplify** through the shared scene, existing refresh flow, HUD rendering, action controls, replay checks and legal save fixtures. This removes the need for separate standalone/run implementations, an event bus, selection controller, reducer framework, durable UI state or preference configuration.

**Drop** rule/save changes, HUD/picking redesign, new assets/dependencies, unrelated performance matrices and duplicate OpenSpec proposal/design/task documents for this bounded enhancement. Keep this single implementation plan and update the existing behavioral spec during implementation. Mobile interaction, cancellation and unavailable-movement proof remain required.

**Investigate** the exact legal fixture boundaries and any demonstrated availability mismatch during implementation. Missing runtime evidence requires testing those paths, not assuming a new rule or expanding the architecture.

## Verification and stopping point

First run the new focused default assertions against the unchanged base and retain the expected failure. After the fix, run focused behavior plus existing movement, cancellation, lock and persistence regressions on the built candidate:

```sh
npm run test:unit -- tests/unit/battleSession.test.ts tests/unit/grid.test.ts tests/unit/turns.test.ts tests/unit/input.test.ts
npm run build
npx playwright test tests/battle-loop.spec.ts tests/battle-board.spec.ts tests/battle-animations.spec.ts tests/battle-persistence.spec.ts tests/run-progression.spec.ts
```

At closeout, run the full repository unit suite and default browser lifecycle once on the final candidate; reuse results where source/build inputs are identical:

```sh
npm run test:unit
npm run build
npm test
git diff --check
```

`npm run build` includes content validation and both TypeScript checks. `npm test` covers all three configured Chromium profiles and invokes the encounter/run-item `posttest` configurations; direct Playwright invocation does not run those hooks. Record actual failures, warnings, retries/skips and browser overrides. The existing WebKit device-acceptance configuration has a fixed test-name filter and will not automatically include new default-Move checks; use an explicit focused selection if a WebKit-specific regression warrants it. A new cross-browser harness, performance certification or deployment is not required by #145.

Stop when all eight issue criteria have direct proof, spec/QA updates are complete and the diff contains only necessary work. Repeat/widen verification only for relevant changes, failures or unresolved risks. Planning validation consists of source/issue inspection, acceptance coverage, document-link/whitespace checks, archive byte parity and publication/linkage readback. **No runtime tests or fresh Playwright runs were performed for this plan; no implementation is claimed.**

## Implementation estimate

**Approximately 3–5 active engineering hours**, normally within one working day on a configured machine:

- 45–90 minutes for legal fixture reproduction and the small scene-local default.
- 90–150 minutes for meaningful turn/override/cancel/unavailable/post-move and run/resume regression coverage.
- 30–60 minutes for review, final validation and the spec/QA record.

This includes test authoring and verification, not just the code edit. Automated suite wall time and PR review/merge queues can extend elapsed time. No fixed soak, physical-device wait or deployment is included. Newly reproduced unrelated browser/environment failures may need separate triage and are not speculative implementation scope.
