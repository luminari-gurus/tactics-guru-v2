# Collapsible mobile battle HUD (#123)

Current touch-input runtime: `443ab22`. Latest verification: 676 unit tests, 522 main Chromium + 39 posttests, 18 focused WebKit + 54 WebKit acceptance cases pass. Earlier matrices below retain their original source identities. See the final section and `iphone-touch/` for the iPhone-specific follow-up.

Issue: https://github.com/luminari-gurus/tactics-guru-v2/issues/123
Branch: `work/issue-123-collapsible-hud`; base `a009a3ec4c35b3e57adc58ac700e56721af9ae8f`.
The caller approved the published OpenSpec plan in chat on 2026-10-18.

## Behavior and implementation

Mobile battles start with controls expanded. **Hide HUD** releases the portrait dock or landscape rail space to the board; **Show HUD** remains reachable. The accessible names are “Hide battle controls” and “Show battle controls”, with `aria-expanded` and `aria-controls`. The toggle uses the existing mobile breakpoints and safe-area shell padding. Desktop remains expanded. The choice lasts for the app session, including scene restart and run encounters; a page reload starts expanded.

The shared shell owns one hidden/inert contents wrapper. Actor updates cannot reveal it, and hiding it does not rebuild controls or modify battle/session state. Native dialogs live outside the wrapper. When a resize hides a dialog's invoker, closing returns focus to the visible toggle. Existing BoardRenderer fit, clipping, input reset and ResizeObserver behavior handles the reclaimed geometry; no camera/domain/save changes are required.

## Acceptance mapping

| Issue criterion | Evidence |
| --- | --- |
| 1: portrait/landscape toggle and unchanged desktop | `battle-hud-collapse.spec.ts`: four viewport sizes, desktop transition, repeated toggles; retained screenshots |
| 2: actor/inspection/target/action/review preservation | Exact session including pending intent/state/RNG/replay and actor/preview text comparisons; existing actor/inspection/cancellation tests |
| 3: board geometry and navigation | Larger drawable area, actual cell picking after collapse, wheel/pan retention, in-flight pointer reset on resize; existing board/feedback tests |
| 4: accessibility and input capture | 44px size/reachability, native touch and keyboard activation, expanded state, hidden tab stops, no selection events from toggle; existing safe-area/text-scale checks |
| 5: review/modal/phase/error/recovery safety | Prepared review and modal Tab capture; paused presentation toggle with disabled actions and unchanged command count; controlled runtime error remains reachable; hidden-invoker recovery focus after resize |
| 6: layouts, restart and encounter transitions | Four sizes (390x844, 360x640, 844x390, 915x412), rotation/desktop transitions, scene restart/reload; legal three-encounter run toggles during presentation and retains choice across the first boundary, then checks expanded reset after reload |

## Verification record

The production preview build is bound to clean application revision `8856e52ea147e2be619f158d328d4d95a7fe94ac`. Test-only follow-up `32b1abf` corrects two baseline-reproduced mouse-focus expectations; `source-build.json` records both sets of fixture hashes and the unchanged runtime/build inputs. Evidence/progress edits do not change those inputs.

| Command | Result |
| --- | --- |
| `npm run test:unit` | 675 tests / 40 files passed |
| `npm run validate:content` | 167 tests / 5 files passed |
| `npm run typecheck` | Both TypeScript configurations passed |
| `npm run build` | Passed; existing large-chunk warning retained |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test -- --output=/tmp/tg123-final-results` | 498 main + 18 encounter + 21 item checks passed (537 total) |
| Chromium focus follow-up: two relevant tests on all three configured profiles | 6 passed |
| `npx playwright test -c playwright.hud.config.ts --output=/tmp/tg123-webkit-hud-results` | 10 passed |
| WebKit focus follow-up: two relevant tests on both configured profiles | 4 passed |
| `npx playwright test -c playwright.device-acceptance.config.ts --output=/tmp/tg123-webkit-acceptance-fixed-results` | 54 passed |
| `openspec validate issue-123-collapsible-hud --strict` and `git diff --check` | Passed |

Host: macOS 27.0.1 arm64, Chrome 155.0.8059.80, bundled WebKit 26.6/revision 2359, Node 26.11.0 and Playwright 1.63.0. See `environment.json` for the exact emulation profiles. Raw logs are compressed without byte changes; `reports.json` records their uncompressed hashes.

The initial full Chromium run retained in `issue-123-collapsible-hud/initial-browser.log.gz` passed 493/498. Three new tests attempted keyboard Restart before the asynchronous desktop breakpoint revealed its invoker; the corrected test waits for visible contents. Two new run tests compared snapshots across progressing enemy animations (one extra enemy command was visible). The run test now checks visibility during presentation and relies on its final deterministic replay/state assertions; the separate paused-presentation test checks the command-count boundary with time stopped. No application behavior or acceptance limit was changed to satisfy these assertions. Initial failure contexts are retained as gzip files alongside the log, preserving their exact bytes.

The first broader WebKit acceptance run passed 50/54. Two pointer-modal focus assertions failed in both orientations; all four failures reproduced against the clean unchanged base build with the original tests. WebKit retains focus on the battle scroll region after mouse activation, a valid outcome already covered in `battle-loop.spec.ts`. The two assertions now accept either Restart or that region and explicitly require visibility. Exact keyboard-invoker and collapsed-toggle focus checks remain unchanged. Baseline and candidate failure logs/contexts are retained; no runtime fix is claimed. One prematurely launched verification run was interrupted after a guarded edit detected an additional matching assertion; its log is retained and is not acceptance evidence.

Representative native-touch screenshots: [portrait](issue-123-collapsible-hud/chromium-390x844.png), [narrow](issue-123-collapsible-hud/chromium-360x640.png), [short landscape](issue-123-collapsible-hud/chromium-844x390.png), [landscape](issue-123-collapsible-hud/chromium-915x412.png).

WebKit screenshots: [portrait](issue-123-collapsible-hud/webkit-390x844.png), [landscape](issue-123-collapsible-hud/webkit-844x390.png). All final matrices completed without skipped cases or configured retries.

Mobile WebKit has native tap coverage in `playwright.hud.config.ts`. Its wheel/CDP scenario is covered by Chromium because those Playwright APIs are unavailable for mobile WebKit; this config explicitly excludes that scenario. Emulation is used; no physical hardware claim is made.

## Size and remaining performance work

`issue-123-collapsible-hud/bundle.json` compares all built JS/CSS files with the exact base using Python gzip with `mtime=0`: +1,503 raw bytes and +457 gzip bytes. This aggregate is a size comparison, not route transfer or network timing acceptance. The first temporary archive build lacked Git metadata required by Vite; the successful baseline uses the exact base commit and index. Both builds retain the existing large-chunk warning.

The independent deployed cold-code/loading/frame failures tracked by #127 remain open. No deployment, budget relaxation, parent certification or merge is part of this issue.

## Landscape gesture follow-up — 2026-10-18

The caller reports failed pinch zoom and flaky panning in landscape. This remains unconfirmed on the current branch; device/browser, URL, HUD state and rotation sequence have been requested. No application fix is claimed.

Added native CDP multitouch cases to `tests/battle-board.spec.ts`, covering both `/` and `/run`, expanded/collapsed HUD, portrait-to-landscape rotation, asserted pinch scale increase, two-finger to one-finger continuation with unchanged scale, and a fresh pan without selections or commands. All 12 cases passed across the three configured Chromium profiles. Command: `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npx playwright test tests/battle-board.spec.ts -g 'landscape native' --output=/tmp/tg123-landscape-regression-results`.

The initial contained landscape probe passed all four cases. An intermediate diagnostic failed four continuation assertions because the test ended the wrong CDP touch contact and then introduced a new contact; pointer event traces identified that harness error. Correcting the lifted contact passed all four rotation/continuation cases. These diagnostic logs and the final 12-case log are retained; they do not establish reproduction or resolution of the caller's reported failure. Mobile WebKit's actual multitouch sequence remains unverified by these CDP checks.

## iPhone Chrome touch transport fix

The caller identified iPhone Chrome at `https://work-issue-123-collapsible-h.tactics-guru-v2.pages.dev/`, with pinch failing in either HUD state. The served build was verified as clean `ddc9044`, so this was not a stale alias.

Runtime follow-up `443ab225835f5fb9ce5a76485bb65dbd81201006` handles native touch contacts directly when Touch Events are available. Mouse/pen Pointer Events and native touch contacts feed the same contact map and pinch/pan calculation. Compatibility touch pointer events are ignored on that path, preventing duplicate processing and removing touch dependence on pointer capture. Bounds rejection, taps, cancellation, visibility reset and scene cleanup remain in the shared pipeline. No browser UA check, second gesture algorithm, new dependency or page-wide zoom restriction is added.

The new touch-only unit sequence fails against the old handler and passes after the change. This demonstrates the missing touch transport, not reproduction of the original physical iPhone event stream. The latter was not captured, and exact device-specific causality is not claimed.

Checks completed before the full frozen rerun: 676 unit tests, content/type/build checks, 30 focused Chromium gesture cases (including native multitouch), 18 WebKit HUD/contact cases and all 54 WebKit acceptance cases passed. WebKit contact tests inject DOM contact records; WebKit native taps and Chromium native multitouch remain separately identified. An initial contact fixture used a prohibited WebKit Touch constructor (8 fixture errors, 10 existing passes); replacing only that constructor-dependent fixture produced all 18 passes. All attempts are retained under `iphone-touch/`.

The preview was verified to serve clean `443ab22` after publication. The caller was invited to retry `/?gesture=443ab22` while the full regression rerun continues. The clean frozen full Chromium rerun passed all 522 main cases, 18 authored-encounter posttests and 21 run-item posttests (561 total), without skips or configured retries. The current JS/CSS aggregate is +2,106 raw / +701 gzip bytes against the exact base; this is not a route transfer or timing acceptance claim. All follow-up implementation and automated checks are complete. The caller’s physical iPhone event stream was not captured and direct device confirmation has not been received; no claim of physical-device testing or proven original-event causality is made. `iphone-touch/source-build.json` binds the input files, frozen build inventory and observed preview identity. WebKit validation used the precommit working-tree build of the same source; the clean committed build is used for the full Chromium rerun.
