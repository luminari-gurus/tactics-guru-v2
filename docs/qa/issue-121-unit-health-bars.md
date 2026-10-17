# Unit health bars — issue #121

Implementation approved in chat on 2026-10-17 against planning commit bb835b380227c8969e4b0a40633ae14a2c130b65. Branch: `work/issue-121-unit-health-bars`; main base: 718107de00d58a19996386146d792075e3c5c023. PR #119 remained unmerged at implementation start.

## Behavior and visual review

One noninteractive scene-owned Graphics object per rendered unit draws a lower elliptical half-arc: 30 board units wide, 4 high, origin 10 units below the sprite anchor. The 4-unit dark track frames a 2.5-unit colored fill; the 24-segment sweep follows displayed HP/catalog max HP, clamped to 0–1. Green is above 50%, yellow is above 25% through 50%, and red is at/below 25%. Zero-HP units hide their bars with their sprites. Numeric HUD HP is preserved.

A bounded enlargement targets a 2 CSS pixel track at fitted scale (maximum 1.4x), keeping bars close to their unit at small scales. Zoomed bars retain board-relative sizing. Bounds reserve maximum bar extents at every cell. Bars follow the sprite's interpolated movement and elevation; UI refreshes preserve that current position. HP updates with the existing presentation completion/cancellation boundary. Restart/resume/encounter construction use the current authoritative snapshot and existing scene teardown.

Initial screenshot review found Fighter/Mage bars occluded by foreground elevated tiles at the planned tile-relative layer. The final implementation draws bars above terrain/units, retaining their tile ordering, and below combat effects. Review of the repaired screenshot confirms all three hero bars, including those in front of elevated tiles. No independent overlay registry, HP state, input listener or game rule was added.

## Acceptance mapping

| #121 criterion | Evidence |
| --- | --- |
| Living/full-health bars and legacy curve | Focused navigation screenshots show heroes/enemies with dark tracks and full green fills; defeat checks hide only defeated bars. Legacy source pinned at e9433f6b608ae6b2d95418615cce9cf17dadcf74 was read during planning. |
| Accurate proportions/thresholds | 16 focused unit cases cover zero/full/out-of-range and exact/adjacent 25%/50% boundaries; browser checks compare displayed HP and max HP to session/catalog. |
| Movement, elevation, ordering and camera | Frozen real elevated movement, modal refresh, rotation, pan/zoom and narrow resize checks verify bar/sprite positions and depth; screenshots include fitted/zoomed/moving/elevated states. |
| Presentation and lifecycle | Legal accepted signature boundaries test damage/defeat pre/post HP, visibility cancellation and reload/Continue; repeated restarts verify stable object counts and one canvas. A real first encounter, reward claim and Healing Draught use lead into Woodland Crossing with current HP. |
| Mobile and informational input | Actual taps over bar coordinates, pointer dragging, keyboard selection, modal capture and Chromium native multipoint touch; mobile Chromium/WebKit portrait/landscape screenshots and 320x568/568x320 stress views. |
| Automated/visual acceptance | Focused five-profile matrix plus configured full regressions; final results and source receipts below. |

## Test limits and repaired failures

Playwright emulation is the accepted scope of #121; no physical-device certification or deployment was performed. WebKit does not expose native multipoint-touch automation: its pinch check dispatches touch PointerEvents through the production board handlers and temporarily adapts only `setPointerCapture`, since synthetic pointer IDs have no OS capture target. WebKit taps and mouse drags are automated normally. This is handler-level multipointer evidence, not native WebKit pinch certification.

Initial new-test failures were corrected: wrong event name (`damageApplied` instead of `damaged`), a case-sensitive reward heading, and assuming keyboard selection increments the pointer-only diagnostic counter. A subsequent in-flight test run overlapped a rebuilt artifact and encountered the old expected depth against the repaired annotation layer; final validation uses one unchanged build per complete run. The first synthetic WebKit pinch generated a capture error for its synthetic pointer ID; the explicit test-only capture adapter removes that invalid test condition without changing production input.

The existing Vite large-chunk warning remains. No package/lockfile or save-format change is part of this issue.

## Final validation

| Check | Actual result |
| --- | --- |
| `npm run test:unit` | 674 passed, including 16 new health geometry/threshold cases |
| `npm run build` | 167 content checks, both TypeScript configurations and production bundle passed; existing large-chunk warning |
| `npm run typecheck` after final test repair | Both configurations passed |
| Focused `playwright.health-bars.config.ts` | 25 passed, no retries/skips; 24 retained PNGs |
| Full `npm test` | 452 passed, 1 rotation-viewport timing failure (25.6 minutes); application sources were unchanged afterward |
| Original rotation case, three repeats per profile | 8 passed, 1 desktop failure reproduced |
| Repaired rotation case, three repeats per profile | 9 passed; no retries/skips |
| `npm run posttest` | 18 authored-encounter and 21 run-item cases passed |
| Strict OpenSpec / whitespace | Passed |

The failing rotation check advanced a paused virtual clock before the browser delivered its native resize event, then read the old 1280x720 viewport. The test now waits for native resize delivery before advancing Phaser callbacks and asserts the exact rotated dimensions. This is a test-only synchronization repair in `tests/battle-animations.spec.ts`, not a gameplay timing change or weakened assertion. The full suite was not rerun after this test-only change; the affected case passed nine focused repeats. Full/before/after logs and the initial error are retained alongside the passing matrix evidence.

Commands used (Chromium commands set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`):

```sh
npm run test:unit
npm run build
npm run typecheck
npx playwright test -c playwright.health-bars.config.ts
npm test
npx playwright test tests/battle-animations.spec.ts --grep 'elevated target remains' --repeat-each=3
npm run posttest
openspec validate issue-121-unit-health-bars --strict
git diff --check
```

Environment: macOS, Playwright 1.63.0; Google Chrome 155.0.8059.80; Playwright WebKit revision 2359, manifest version 26.6. Profiles: desktop 1280x720, Pixel 7 portrait/915x412 landscape, iPhone 13 portrait/landscape, plus 320x568 and 568x320 stress views. These are emulated profiles, not branded physical browser runs.

The production build identifies planning HEAD bb835b380227c8969e4b0a40633ae14a2c130b65 with dirty=true. [validation.json](issue-121-unit-health-bars/validation.json) binds the exact tested source/test/config bytes and PNGs; it records the original and repaired rotation-test hashes separately. Runtime sources were unchanged through the full suite, test repair and posttests. Captured text logs normalize only trailing whitespace and terminal blank lines; original and normalized log SHA256 hashes are retained. Unit/content counts overlap and are not distinct totals.

The corrected cancellation screenshots advance a render frame after restoring visibility so they show completed health, not the prior paused canvas frame. Visual review covered the repaired hero bars, fitted/zoomed desktop and mobile, moving/elevated views, narrow rotation, post-damage/defeat and next-encounter states.

Selected retained evidence:

- [Desktop zoom: all hero bars clear foreground terrain](issue-121-unit-health-bars/health-desktop-health-zoomed.png)
- [iPhone portrait: completed damage boundary](issue-121-unit-health-bars/health-iphone-portrait-health-damage-complete.png)
- [iPhone portrait: second encounter after healing](issue-121-unit-health-bars/health-iphone-portrait-health-second-encounter.png)
- [Complete evidence directory](issue-121-unit-health-bars/)

Delivery: [PR #124](https://github.com/luminari-gurus/tactics-guru-v2/pull/124), open against main and attached to the Codex task. Runtime implementation commit: 827c54a; subsequent commits update QA/log formatting/task status only.
