# Collapsible mobile battle HUD (#123)

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

Validation is in progress; final commands and counts are recorded below when complete.

The initial full Chromium run retained in `issue-123-collapsible-hud/initial-browser.log.gz` passed 493/498. Three new tests attempted keyboard Restart before the asynchronous desktop breakpoint revealed its invoker; the corrected test waits for visible contents. Two new run tests compared snapshots across progressing enemy animations (one extra enemy command was visible). The run test now checks visibility during presentation and relies on its final deterministic replay/state assertions; the separate paused-presentation test checks the command-count boundary with time stopped. No application behavior or acceptance limit was changed to satisfy these assertions. Initial failure contexts are retained as gzip files alongside the log, preserving their exact bytes.

Mobile WebKit has native tap coverage in `playwright.hud.config.ts`. Its wheel/CDP scenario is covered by Chromium because those Playwright APIs are unavailable for mobile WebKit; this config explicitly excludes that scenario. Emulation is used; no physical hardware claim is made.

## Size and remaining performance work

`issue-123-collapsible-hud/bundle.json` compares all built JS/CSS files with the exact base using Python gzip with `mtime=0`: +1,503 raw bytes and +456 gzip bytes. This aggregate is a size comparison, not route transfer or network timing acceptance. The first temporary archive build lacked Git metadata required by Vite; the successful baseline uses the exact base commit and index. Both builds retain the existing large-chunk warning.

The independent deployed cold-code/loading/frame failures tracked by #127 remain open. No deployment, budget relaxation, parent certification or merge is part of this issue.
