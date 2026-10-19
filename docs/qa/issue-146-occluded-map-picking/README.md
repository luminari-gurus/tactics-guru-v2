# Terrain-occluded battle map selection — issue #146

Updated 2026-10-19 (Asia/Jerusalem). **Complete and ready for review in [PR #149](https://github.com/luminari-gurus/tactics-guru-v2/pull/149).**

The tested runtime is ba815ace96736100e32a40ee84f44d8dda4f8fb8, integrating main 152a74d6f0e0d5ae3c69378cf428b9edc28f1ceb (active-unit bob PR #148). The [sealed manifest](integration/build-manifest.json) binds a clean dirty=false production build, 12 source/test/package inputs, 13 emitted JS/CSS files, browser identity and every final gate. The evidence follow-up changes documentation only; runtime and test inputs remain identical to this tested merge.

## Behavior and scope

Exposed opaque living-unit art selects the unit's authoritative cell. Transparent sprite pixels, defeated units and bodies behind foreground solid terrain cannot steal terrain hits. The normal frontmost solid remains first for terrain; repeated clicks/taps cycle through the actual intersecting top surfaces behind it. The existing caption shows the overlap position before its scrollable legend, and the existing selected-cell/target feedback identifies the choice.

One renderer-local record holds point, candidate keys and index. Hover does not advance selection. Action, dropdown, keyboard, modal, gesture, actual constrained-camera, viewport, turn and scene changes clear the record. Completed touch leaves and trailing untracked zero-coordinate capture events preserve it. A caption reflow cancels held gestures without discarding the choice when camera/candidates stay unchanged. Picking uses existing projection, anchors, alpha and column depth, independently of the decorative bob. The proof renderer keeps its frontmost-solid contract. All intent continues through the existing scene/session preview and explicit confirmation path.

No authored content, assets, domain/range/line-of-sight/movement rules, save/replay formats, dependency versions, terrain fading, grid rotation or input framework changed. Main's bob implementation is preserved. The sole manual merge conflict combined our fresh-selection/no-command run checks with upstream's actor-cue/cleanup checks.

## Reproduction and acceptance

Baseline runtime was 249fa0d4fb0ec407b9ffb02b09f99a33759cac31, whose only change from main 49af402 was the issue plan. The [two original failed browser regressions](baseline-tests.log.txt) use explicit expected grid cells. Their fixtures are legally reached from seed 1 with the existing player policy, enemy decisions and accepted presentation acknowledgements; no production content or forged battle state is used. The JSON includes validated state and its encoded save.

1. **Occluded archer:** [command-28 fixture](archer-fixture.json), fighter #1 at (3,3), living archer #5 at (3,2). Guarded Strike is valid through the dropdown. Exposed head pixel (32,18) maps to board (40,63.75); baseline picks ground (2,1). The repaired mouse/touch path selects (3,2) and prepares unitId 5 with exactly the same preview/pending intent. The body's board point (40,100) still hits foreground stone (4,3). [Current desktop capture](integration/archer-desktop.png).
2. **Hidden neighboring ground:** [command-9 fixture](ground-fixture.json), ranger #2 can move to (3,5) behind the same platform. At board (-77,160), first select raised (4,5), then ground (3,5); further clicks reselect the foreground. Dropdown and map produce the same legal four-step/cost-4 preview. Only explicit confirmation advances commandCount once and moves the actor. [Current desktop capture](integration/ground-desktop.png).
3. **Eligibility and authority:** exact state, replay/continuation, RNG and saved bytes remain unchanged by selection alone. A visible distant grunt remains unavailable with identical dropdown/map feedback. Transparent art and a defeated grunt's former head select the independently specified foreground cells. Native target controls and keyboard continue through the same callback.
4. **Boundaries and lifecycle:** explicit unit/ground/foreground expectations, existing elevated-top/side/edge/outside picking, drag/pinch, DPR/orientation, transformed cameras, modal/presentation locks, cancellation/restart and every encounter transition pass. A one-pixel layout clamp has a separate regression that fails on clean 48dbc75 and passes when the final constrained camera clears overlap history. Upstream bob, reduced motion, fixed health bars and scene cleanup pass in the combined tree.
5. **Device proof:** desktop 1280×720, Pixel 7 portrait 412×839 and landscape 915×412 use real mouse/touch actions in Edge. Fresh WebKit 26.6 covers iPhone 13 portrait 390×664 and landscape 750×342 emulation. Mobile WebKit's driver has no wheel API, so its camera check uses a real drag; Edge covers wheel zoom. No skips, retries or synthetic wheel substitute are used. Playwright/device emulation satisfies AGENTS.md; no physical-device or production acceptance is claimed.

The exact original caller screenshot/turn remains unidentified. These reproduce its failure class in the unchanged authored Forest Ruins map. The [baseline illustration](baseline.png) was captured at 1280×900; the failing desktop regressions use the configured 1280×720 profile. Their expected cells are independent of the production picker.

The [raw baseline render report](receipts/baseline-report.json.gz) retains the canvas transform, terrain/unit coordinates and dropdown-selected state for that illustration. The receipt directory also preserves the original touch-history failure and the initial dead-sprite/BFCache error contexts; these are raw diagnostic data, not continuation instructions.

## Final verification

- **710 unit tests in 41 files**, plus **167 content checks**, both TypeScript configurations and production build: passed.
- **567 main Edge browser cases + 18 encounter + 21 run-item posttests**: passed through the complete npm test lifecycle, exit 0, no skips/retries. The combined legal three-encounter run verifies both selection and bob ownership/cleanup on all profiles.
- **18 focused Edge picking/camera/bob cases**: passed before the broad run.
- **4 fresh WebKit cases on the frozen clean integrated build**: passed.
- Final whitespace, document links, staged scope and local/remote PR-head parity are checked at evidence publication.

[Integrated receipts](integration/receipts/) preserve the exact raw command output as gzip. Source/build/browser identities and gate-to-receipt mappings are in the [sealed manifest](integration/build-manifest.json). Current screenshots: [archer portrait](integration/archer-portrait.png), [ground portrait](integration/ground-portrait.png), [archer landscape](integration/archer-landscape.png), [ground landscape](integration/ground-landscape.png). Screenshot appearance was visually inspected; state/intent and rendered text-range assertions prove interaction and hint visibility.

Environment: local production preview at http://127.0.0.1:4173/, Windows x64, Node 24.19.0, Playwright 1.63.0, Edge 155.0.4283.62 and bundled WebKit 26.6/revision 2359. Browser plugin not available; the repository Playwright path was used. Posttests intentionally use their development fixture configurations. Existing Vite extensionless-config and large-chunk warnings are retained and do not fail these gates.

## Retained diagnostics

[Earlier receipts](receipts/) and [candidate a8](candidate-a8-build-manifest.json), [layout baseline 48dbc75](layout-baseline-build-manifest.json), and [initial planning-stamped build](initial-build-manifest.json) remain historical references, not substituted for combined-tree acceptance.

- Packaged Chromium 153.0.8010.12 was interrupted after 212 completed cases: 204 passes, seven missing BFCache-return markers and one incorrect new dead-sprite expectation. Existing history assertions pass unchanged in Edge. No application persistence change or weakened marker assertion was introduced.
- A 27-case Edge diagnostic passes 26 and exposes a touch-rounded shared-edge expectation. Final dead-sprite and distant-grunt samples use stable opaque/interior pixels. The original failure remains retained.
- WebKit exposes completed-capture and caption-reflow resets; event/reset traces identify them. Initial unsupported mobile-wheel output is retained; the final matrix uses supported real camera input.
- A concurrent unit run hit the existing five-second audio-inventory timeout; quiet complete reruns pass 710/710 without inventory or timeout changes.
- Original npm test on a8 passes all 558 main cases, then its encounter hook fails three old terrain-through-unit-art expectations. Only the terrain sampler is aligned; all 39 posttests pass afterward. The integrated candidate then passes the entire updated 567+18+21 lifecycle in one command.

## Commands and continuation

Commands executed on the integrated source:

    npm run test:unit
    npm run build
    node node_modules/@playwright/test/cli.js test tests/battle-board.spec.ts tests/battle-animations.spec.ts --grep 'occluded archer exposed|repeated map selection|layout clamping resets|active bob' --reporter=line
    npm test
    node node_modules/@playwright/test/cli.js test -c tmp/occlusion/webkit.config.ts --reporter=line
    git diff --check

Set PLAYWRIGHT_CHROMIUM_EXECUTABLE to C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe for the Edge gates. This host supplies npm through C:/Users/apexw/.codex/tmp/issue146-tools/node_modules/.bin on PATH, without a project dependency/lockfile change. To recreate the focused WebKit configuration in a fresh checkout, make ignored tmp/occlusion/ and copy [the retained config](playwright-webkit.config.ts.txt) there as webkit.config.ts; its relative imports then resolve. npm test invokes encounter/run-item posttests automatically on success; npm run posttest can verify them independently. Read a receipt with Node's zlib.gunzipSync or any gzip reader.

All five issue criteria are implemented and verified. Next action is review of PR #149. No required implementation remains. No PR merge, release tag or production operation was performed. [Current plan](../../ongoing-projects/issue-146-occluded-map-picking/plan.md).
