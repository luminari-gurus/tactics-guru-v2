# Issue #146 — restore map selection through terrain occlusion

Planning date: 2026-10-19 (Asia/Jerusalem). Status: **plan published; implementation has not started**.

- Issue: [#146 — Occluded goblin archer and neighboring tiles cannot be targeted directly on the map](https://github.com/luminari-gurus/tactics-guru-v2/issues/146).
- Assignee: `moshehbenavraham`, verified from the authenticated GitHub account and the issue after assignment.
- Kickoff: [we're on this](https://github.com/luminari-gurus/tactics-guru-v2/issues/146#issuecomment-6269785949).
- Branch: [`branch/issue-146-occluded-map-picking`](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-146-occluded-map-picking), linked through GitHub's issue Development relationship.
- Inspected base: `main` at `49af40223a8e4d19eedb7a974eca34c12c1b7c88`, including merged target-preview PR #143. Refresh the default branch and review intervening input/render changes before implementation.
- Planning scope: this document only. Leave the incumbent `docs/ongoing-projects/plan.md` and other workstreams intact. Application edits, new regression tests, deployment and merging are subsequent work.

## Why this is the best available item

Reviewed the entire paginated open issue collection: seven issues and four open PRs, with bodies, assignees, labels, available comments, explicit dependency/sub-issue relationships, linked branches, remote branch inventory and merged `main`. Repository and organization Projects V2 both report zero projects. Selection did not require a `ready for work` label.

- **#146: selected.** An unassigned reported bug affects direct battle targeting and destination selection. No linked/issue-named branch, active PR or explicit prerequisite was found. Existing geometry, session validation and browser fixtures provide a bounded repair path. This prioritizes a broken core interaction over a convenience enhancement; no downstream dependency or independently reproduced screenshot failure is claimed.
- [#145 — Default to Move](https://github.com/luminari-gurus/tactics-guru-v2/issues/145): also unassigned and available. Starting a turn with `action=null` is visible in `BattleScene.begin`; the enhancement is useful but does not repair an inaccessible map interaction. Keep it separate.
- [#123 — Collapsible HUD](https://github.com/luminari-gurus/tactics-guru-v2/issues/123): assigned to `dubstylee`, covered by open [PR #139](https://github.com/luminari-gurus/tactics-guru-v2/pull/139). Its #111/#119 prerequisites are merged; active ownership, rather than those old dependencies, excludes it.
- [#144 — Active-unit bob](https://github.com/luminari-gurus/tactics-guru-v2/issues/144): assigned to `dubstylee`, covered by open [PR #148](https://github.com/luminari-gurus/tactics-guru-v2/pull/148). Recheck its eventual renderer changes when implementing #146; it is not a prerequisite.
- [#128 — PostHog](https://github.com/luminari-gurus/tactics-guru-v2/issues/128): assigned to `dubstylee`; its project/collection-policy decisions belong to that workstream.
- [#83 — Release epic](https://github.com/luminari-gurus/tactics-guru-v2/issues/83) and [#85 — Release execution](https://github.com/luminari-gurus/tactics-guru-v2/issues/85): [#84](https://github.com/luminari-gurus/tactics-guru-v2/issues/84) is now closed with an accepted Pages runbook and a specific rollback exception. The parent still contains older open-#84 wording. Execution retains a separate explicit production-authorization gate; this planning request does not supply that authorization. Open [PR #12](https://github.com/luminari-gurus/tactics-guru-v2/pull/12)'s SSH alternative is not the selected Pages path.
- Open [PR #147 — Desert procedural grids](https://github.com/luminari-gurus/tactics-guru-v2/pull/147) already owns that proposal. Do not duplicate it, introduce generated maps here, or require it to reproduce this bug.

## Outcome and non-goals

**Outcome:** players can select an otherwise eligible partially occluded goblin archer and neighboring occluded ground cells through the battle map. Map and dropdown selections identify the same unit/cell and produce the same eligibility result. Visible units, raised surfaces and terrain boundaries remain predictable; selecting never submits a command.

**Non-goals:** change movement, range, line of sight, turn rules, RNG, save/replay formats, authored maps or sprite assets; redesign the HUD, camera, terrain transparency or renderer; add a new input framework or global interaction service; implement #145, #144, telemetry or release operations. Keep the dropdown and keyboard path available.

Use this ordinary issue plan for a bounded picking bug. Additional OpenSpec artifacts would duplicate the five existing acceptance criteria without settling the missing reproduction. If investigation instead establishes a necessary broader interaction redesign, revise this plan around the demonstrated requirement before that expanded work.

## Verified source facts and remaining uncertainty

- [`BoardInput.ts`](../../../src/phaser/BoardInput.ts) converts CSS input through the canvas rectangle, rejects drags/pinches as selections, then invokes `board.select`. [`BattleScene.ts`](../../../src/phaser/BattleScene.ts) gates the drawable region, dialogs and session phase. The shared battle scene serves standalone and run encounters.
- [`BoardRenderer.cellAt`](../../../src/phaser/BoardRenderer.ts) transforms the point with `screenToBoard` and calls `pickTile`. [`picking.ts`](../../../src/geometry/picking.ts) returns the first tile whose top or solid side contains the point, in reverse painter order. Its documented contract says occupant art passes through; it cannot return another overlapping surface or an independent unit-art hit.
- [`iso.ts`](../../../src/geometry/iso.ts) owns projection, tile faces and ordering. [`canopy.ts`](../../../src/geometry/canopy.ts) already supplies unit-art bounds; the renderer owns current living-unit positions, anchors and depths. Reuse these facts rather than adding guessed screen offsets or a second projection.
- [`hud.ts`](../../../src/ui/hud.ts)'s dropdown passes cell coordinates to the same scene `select` callback, bypassing geometric picking. The callback uses `actionCommand` and `BattleSession.prepare`; [`BattleSession.ts`](../../../src/app/BattleSession.ts) retains movement/combat legality. A dropdown option alone does not prove an attack is legal: enemy options can lead to an unavailable preview.
- [`tests/unit/picking.test.ts`](../../../tests/unit/picking.test.ts) intentionally asserts frontmost raised-side selection. [`tests/input.spec.ts`](../../../tests/input.spec.ts) exercises the proof renderer; [`tests/battle-board.spec.ts`](../../../tests/battle-board.spec.ts) covers real battle selection, camera and hover behavior. Several expected selections are calculated with the production picker, so those comparisons alone cannot detect this bug.
- A planning-time execution of the inspected picker, with only its extensionless import adjusted for Node's TypeScript loader, confirmed this synthetic witness: ground `(0,0,elevation=0)` plus raised `(1,0,elevation=2)` at board point `(20,0)` picks the raised tile; `(0,-40)` returns null. This demonstrates the picker contract and lack of art input. It is **not** the reported screenshot, a rendered goblin hit, a reproduced gameplay defect or repair proof.

The original map, turn, coordinates, browser and viewport remain unknown. Begin by recording a real failing case. The authored forest-ruins map has raised stone platforms and goblin archers and is a concrete first place to inspect; its identity as the reported battle is unconfirmed. Distinguish a pixel-hit failure from an action that is genuinely unavailable.

## Implementation steps

1. **Reproduce and fix the expected behavior before changing picking.** On the refreshed base, capture an authored battle position containing a living archer behind a raised platform and at least one eligible neighboring ground destination. Use legal play or the existing validated snapshot/fixture path; do not change production content to arrange the test. Record map/seed or snapshot, actor/action, unit IDs, grid cells, elevation, canvas transform, click/tap coordinates, dropdown value, preview and screenshot. Check the same action through map and dropdown; independently assert the intended cell instead of deriving the expectation from `pickTile`. If the original position cannot be recovered, retain that limitation and reproduce the same failure class in a deterministic valid fixture.

2. **Repair hit resolution at the existing geometry/renderer boundary.** Keep coordinate conversion, gesture recognition and domain validation. Distinguish visible living-unit art from terrain faces, mapping an art hit to that unit's authoritative cell. Respect render depth and visible footprint so a transparent sprite rectangle or hidden body cannot steal clicks from foreground content. Reuse existing anchors/bounds and tile geometry; picking must not depend on a decorative bob or transient attack offset.

   Preserve the existing frontmost result for ordinary terrain hits. Where the fixture proves that one screen point covers multiple required cells, enumerate the actual intersecting top surfaces plus the normal foreground hit, deduplicate by cell and order deterministically by render depth. The preferred minimal disambiguation is repeated click/tap at that overlap to advance through candidates, with the selected-cell highlight and a short contextual hint showing the result. A fresh interaction starts at visible content; a stationary hover does not advance selection. Omit cycling and its hint entirely if corrected geometry gives every required target/destination an unambiguous map hit region. Do not blindly ignore all side faces, pick the nearest grid center or prioritize any legal target anywhere on the board.

3. **Keep one selection/preview path and bounded transient state.** Feed the resolved cell into the existing `select` callback; the dropdown, pointer/touch and keyboard must agree on the selected cell, pending command and valid/unavailable preview. Selection may prepare an intent but cannot change authoritative state, RNG, replay commands or persisted saves before confirmation. Preserve cancellation/review, modal and enemy/presentation locks. If overlap history is needed, keep it local and clear it when its candidate set, camera, action, turn or scene changes, including pan/pinch, resize, modal/recovery, restart and encounter transitions. Hover must not silently replace an explicitly selected alternate cell. Keep the proof renderer's frontmost-solid semantics unless the actual repair requires a compatible shared-helper change.

4. **Add regression proof on the real interaction path.** Extend existing picking tests for overlap ordering, boundaries, unit-art hits/dead-unit exclusion as applicable and pan/zoom coordinate inversion. Extend battle-board/browser tests with the deterministic occluded archer and neighboring destination, mouse click and touch tap, independently stated cell/unit expectations, dropdown parity and genuine invalid-range/line-of-sight checks. Cover visible units, raised tops, side edges, outside-board clicks, transformed cameras and repeated selection. Exercise keyboard/dropdown continuity, drag/pinch without selection, modal/presentation locks, restart and one run encounter transition. Assert no command/save/RNG change from hit selection alone. Reuse existing fixture/test infrastructure.

5. **Validate the final candidate and retain evidence.** Run focused checks first, then the repository completion commands below. Capture desktop, mobile portrait and short landscape screenshots and interactions with the actual built application, plus a run-route check of the shared renderer. Retain source/build/browser identities, exact reproduction and any original failures under `docs/qa/issue-146-occluded-map-picking/`. Read the diff against all five issue criteria, update this plan with actual results and publish a focused PR referencing #146. Use a closing reference only after its acceptance is proved; otherwise describe remaining gaps.

## Files

Expected implementation files are `src/geometry/picking.ts`, `src/phaser/BoardRenderer.ts`, `tests/unit/picking.test.ts` and `tests/battle-board.spec.ts`. A small `src/phaser/BattleScene.ts` integration change is justified only if candidate reset or hover/selection consistency needs it. Reuse `src/geometry/iso.ts`, `src/geometry/canopy.ts`, `src/ui/hud.ts`, `src/ui/targetPreview.ts`, `src/app/BattleSession.ts` and `src/phaser/BoardInput.ts` as existing contracts; edit them only for a demonstrated requirement. If overlap hints are needed, use the existing battle caption/status path. Extend existing input/run tests only where they supply missing acceptance proof. New QA receipts belong to this issue; leave unrelated plans and evidence intact.

## Proof for every issue criterion

1. **Partially hidden archer:** real canvas click and touch tap select the specified living archer's cell/ID in the deterministic terrain arrangement. Compare dropdown selection and prepared ability intent without confirming; capture visible exposed art and selected feedback.
2. **Neighboring hidden tiles:** select at least one otherwise legal occluded destination and each distinct overlap geometry reproduced in step 1 through map interaction. Confirm only an intentional legal move; prove any required overlap disambiguation can also reselect the visible foreground surface.
3. **Map/dropdown parity:** identical cell/unit, action preview, availability reason and pending intent for both paths. Include an unavailable target so the fix cannot manufacture legality or bypass line of sight/range.
4. **Visible content/boundaries:** independent exact-cell expectations for visible units, raised tops, side faces, shared edges and empty/outside points, before/after pan, zoom and orientation changes. Preserve camera and command count during selection.
5. **Regression and device evidence:** a deterministic regression fails on the unchanged baseline for the relevant reported behavior and passes after the fix. Retain browser screenshots and actual mouse/touch/keyboard interactions across configured desktop, Pixel 7 portrait and 915×412 landscape profiles. Playwright/device emulation satisfies device acceptance under `AGENTS.md`; physical hardware is not required or claimed.

After implementation, run:

```sh
npm run test:unit -- tests/unit/picking.test.ts tests/unit/input.test.ts tests/unit/targeting.test.ts
npm run build
npx playwright test tests/battle-board.spec.ts tests/battle-loop.spec.ts tests/input.spec.ts --reporter=line
npm run test:unit
npm test
git diff --check
```

`build` includes content validation and both TypeScript configurations. A successful `npm test` runs the configured encounter and run-item posttests; if the main suite fails, run `npm run posttest` separately and retain both outcomes. Run a focused fresh WebKit interaction check only if the repair depends on browser-specific hit/input behavior; do not infer its result from Chromium emulation. Existing failures must remain reported, rather than being hidden by picker-derived assertions, retries or skipped cases. This bug does not require a new full performance study unless the chosen hit-resolution work adds a demonstrated hot-path concern.

## Ablation decisions and completion boundary

Keep real-path reproduction, independent expected targets, hidden-ground reachability and visible-surface regressions: removing any leaves an explicit issue criterion unproved. Keep the common scene/session path: replacing it would create competing eligibility rules. Simplify hit testing by reusing existing projection, bounds, ordering and fixtures. Add candidate cycling only for demonstrated ambiguous hits; remove its entire state/hint/test cluster if unique hits suffice. Drop terrain fading, camera rotation, new assets, domain/save changes, generic input abstractions and duplicated OpenSpec/backlog reports because no criterion requires them. Do not reduce scope to sprite clicking alone: neighboring occluded tiles are also required.

Estimate: roughly 4–8 active engineering hours for reproduction, repair, regression evidence and review, with elapsed suite time dependent on the test host. This is not a fixed soak period or a promise that the original screenshot is already reproducible. Revise the estimate if reproduction exposes a materially different cause.

Planning validation: all seven open issues/four PRs reviewed; repository/organization project inventories checked; source paths and required scripts inspected; assignment and kickoff read back; synthetic picker witness executed. Document/link, whitespace, committed-file scope, published-blob parity and native branch linkage are checked when publishing this plan. **No application implementation, browser reproduction, new regression, full application suite, merge or production operation is claimed by this planning commit.**
