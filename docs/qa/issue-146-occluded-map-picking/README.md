# Terrain-occluded battle map selection — issue #146

Updated 2026-10-19 (Asia/Jerusalem). Implementation verification in progress; this is the live evidence record, not final acceptance.

**Moving-main handoff:** candidate a8c3cd0 now passes 710 unit tests, both typechecks/build, 558 main Edge cases, 18 encounter + 21 run-item posttests and four fresh WebKit cases. Its [clean build manifest](candidate-a8-build-manifest.json) and raw attempts are preserved. Final refresh found main advanced to 152a74d (active-unit bob PR #148) and PR #149 now conflicts. Integration and combined-tree acceptance remain required. The encounter posttest helper was aligned to avoid living-art rectangles when sampling terrain; its three initial failures are retained, all 39 posttests pass afterward, and no runtime changed for that repair.

## Reproduction

Baseline runtime: planning commit `249fa0d4fb0ec407b9ffb02b09f99a33759cac31`, based on `49af40223a8e4d19eedb7a974eca34c12c1b7c88`. Its only change from main is the issue plan. No authored content or combat rules were changed. The original caller screenshot/turn is unidentified; these legally reached Forest Ruins states independently reproduce the same failure class.

Both fixtures are reached from seed 1 by the existing player policy and enemy decisions, acknowledging each accepted presentation. The committed JSON includes the validated state and encoded save; browser tests regenerate it through `BattleSession` rather than trusting a forged state.

- [Archer boundary](archer-fixture.json): command 28; fighter #1 at `(3,3)` can use Guarded Strike on living goblin archer #5 at `(3,2)`. The archer's ground is at board `(40,100)`, behind elevation-2 stone `(4,3)`; exposed head pixel `(32,18)` in the canonical sprite maps to `(40,63.75)`. Dropdown selection prepares `unitId:5`; baseline head clicking selects ground `(2,1)` and feet clicking selects stone `(4,3)`, losing the target. [Baseline screenshot](baseline.png) shows exposed art and legal dropdown preview.
- [Ground boundary](ground-fixture.json): command 9; ranger #2 can move to ground `(3,5)` behind the same platform. Repeated baseline clicks keep selecting raised `(4,5)`. The final test uses board `(-77,160)`, three units inside the destination's diamond instead of its touch-rounded boundary at `(-80,160)`.
- [Original failed browser run](baseline-tests.log.txt): both regressions fail on the unchanged built runtime. Expected cells are explicit fixture coordinates, never calculated by the production picker.

## Repair and ablation

The battle renderer adds opaque living-art hits using existing sprite anchors, projection, texture alpha and column depth. A hidden body or transparent sprite pixel cannot override foreground solid terrain. The existing proof picker retains its frontmost-solid contract. Battle terrain candidates consist of that frontmost hit followed by intersecting top surfaces in reverse painter order, without duplicate cells. Repeat click/tap cycles these actual overlaps; the existing caption gives the overlap position and the existing selection feedback identifies the cell.

One renderer-local record holds the last screen point, candidate keys and index. Camera/input/scene/session boundaries reset it. Hover can inspect the chosen alternate without advancing it. Action, dropdown and keyboard selection continue through the existing scene/session callback, so legality remains in domain previews. Selection does not dispatch a command or write a save. Completed touch `pointerleave` and WebKit's trailing zero-coordinate lost-capture event preserve the sequence; leaving during a captured gesture still cancels it. Caption reflow aborts held gestures while retaining overlap history when camera/candidates do not change. Real viewport/camera changes still reset it. The hint now leads the scrollable caption so portrait users can read it without scrolling; a rendered text-range assertion verifies this.

No terrain fading, nearest-cell heuristic, legal-target priority, new assets, input framework, domain/save change, new package or duplicated OpenSpec change is needed. Cycling is retained because the reproduced ground destination has no independent visible hit at the tested overlap. Scope is this issue; no release operation is implied.

## Verification handoff

Host: Windows x64, Node 24.19.0, repository-pinned Playwright 1.63.0, local production preview `http://127.0.0.1:4173/`. Browser plugin not available; repository Playwright is used. Chromium desktop, Pixel 7 portrait and 915×412 landscape emulation are the device matrix. Physical hardware is neither required nor claimed. Fresh WebKit touch verification is required for the touch-specific leave behavior.

Completed on the follow-up: 710 unit tests in 41 files, 19 focused unit checks, 167 content checks, both typechecks/build, and four fresh built WebKit cases in portrait/landscape pass. Existing Vite extensionless-config and large-chunk warnings are retained. The final full Edge browser matrix is next; its result will replace this pending status before closeout.

A final camera review exposed a bounds-clamping case: shrinking the caption by one pixel at minimum zoom changes the actual camera within the repeat-click distance threshold. Checking the requested view before clamping incorrectly keeps the old overlap index. An independent browser regression fails on the unchanged clean 48dbc75 build. The repair compares the constrained camera; all nine focused Edge cases and all four WebKit cases pass. The earlier Edge run stopped at 159 passes before this correction, and its [clean baseline manifest](layout-baseline-build-manifest.json) and raw log remain diagnostic. The full final matrix now contains 558 main cases.

Packaged Chromium 153.0.8010.12 was stopped after 212 completed cases: 204 pass, seven missing BFCache-return markers, one incorrect added dead-sprite expectation. Edge 155.0.4283.62 passes all 21 cached-history assertions unchanged. A 27-case Edge diagnostic passes 26 and finds one touch-rounded shared-edge expectation; the final dead-sprite point is five board units inside the actual foreground side. The unavailable-grunt art sample also uses a stable opaque interior pixel. No domain rule, timer, assertion of cached return, retry or skip was changed to create acceptance. A concurrent full unit run hits a five-second audio-inventory timeout; two subsequent quiet full runs pass 710/710 without changing inventory or timeouts.

Fresh WebKit initially exposed completed-capture and caption-reflow resets. Development event/reset traces identify those paths; they are diagnostic rather than acceptance. After repair the complete focused WebKit flow passes four cases. Mobile WebKit's driver rejects wheel input, so its camera check uses a real drag; Chromium/Edge retain wheel zoom. Both paths assert a changed camera, no gesture selection, a fresh foreground hit, successful alternate selection and explicit legal move confirmation. [Compressed raw attempts](receipts/) preserve failures and final checks; the [initial build manifest](initial-build-manifest.json) records the dirty planning stamp and exact runtime blobs of the first published implementation. The [final build manifest](build-manifest.json) records the clean published follow-up; its complete Edge matrix is running.

The older terrain browser assertion sampled through living unit art; that expectation conflicts with exposed-art selection. It now chooses terrain test points outside living-art bounds, while the new tests independently verify opaque, transparent, occluded-body and defeated-unit behavior. The interrupted focused run is diagnostic, not acceptance. Full final-tree checks will include the repaired expectation.

Required completion commands:

```sh
npm run test:unit -- tests/unit/picking.test.ts tests/unit/input.test.ts tests/unit/targeting.test.ts
npm run build
npm run test:unit
npm test
npx playwright test -c tmp/occlusion/webkit.config.ts --reporter=line
git diff --check
```

The focused browser command is `npx playwright test tests/battle-board.spec.ts tests/battle-loop.spec.ts tests/input.spec.ts --reporter=line`; the full suite includes those cases. `npm test` also runs the encounter and run-item posttests on success. Retain failures; do not substitute retries, skips or emulation for claims of physical hardware. Final logs/screenshots and a source/hash manifest will be added before PR closeout. Continue from the [implementation plan](../../ongoing-projects/issue-146-occluded-map-picking/plan.md).
