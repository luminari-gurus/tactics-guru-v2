# Design

## Context

See proposal.md for identity and scope. At base 718107d, BoardRenderer owns per-unit images and rings inside a depth-sorted transformed container. `present` projects unit cells; `animate` holds `animatedSnapshot` at the pre-command boundary and interpolates only the moving image. Completion/cancellation renders the after snapshot; shutdown already guards destroyed display objects. Maximum HP resides in hero/enemy catalog definitions, as used by HUD labels. Run healing occurs between battles, so the next battle snapshot supplies its result.

The pinned legacy UnitView.gd and HealthBarPalette.gd were read at e9433f6b608ae6b2d95418615cce9cf17dadcf74. They use a lower elliptical half-arc from PI toward zero, a dark track, narrower colored fill and thresholds 0.5/0.25. This is a curved line, not a rounded rectangular progress widget.

## Goals / Non-Goals

Deliver the spec through renderer-local view objects with a small pure geometry/palette helper. No second health model, DOM overlay, new presentation phase, dependency or persistence migration. Do not extend #111 or implement #123.

## Decisions

1. Allocate one noninteractive Graphics object per rendered unit alongside the existing image/ring. Draw a full shallow lower arc and proportional colored arc with a dark contrasting outline/track. Initial visual target: roughly 30 board units wide, 4 high, centered about 10 units below the unit anchor, with a 4-unit track and 2.5-unit fill; refine these constants using actual mobile screenshots to separate rings, sprite feet and Guarded text. Use legacy RGB values approximately background 0x1f211f, green 0x3bc761, yellow 0xe0992e, red 0xdb2e29. Geometry and clamped ratio/color belong in `src/phaser/healthBar.ts`; HP/catalog resolution stays in BoardRenderer. This avoids DOM positioning and a separate unit-component refactor.
2. Update bars in `present` from its effective snapshot, honoring `animatedSnapshot`. Use the same unit ID, side/definition and `hp > 0` visibility as the sprite. Preserve existing completion-boundary HP timing rather than adding an independent impact timer. Movement tween updates bar position/depth alongside the image; refreshes during movement must restore the current tween position for both objects, avoiding a one-frame snap to the source cell. Cancellation uses the existing finish path and destroyed-root guard.
3. Keep bars under the board container transform and draw bars above terrain/units and below transient combat effects/labels, retaining tile-relative order within the bar layer. Include bar extents in fitted bounds for every traversable position. Enforce a modest minimum screen stroke/width at small fit scales, bounded to avoid neighboring-unit overlap; recompute view-only geometry on zoom/fit and account for that extent in bounds. Verify minimum zoom and crowded/elevated cases visually. Prefer bounded redraws on state/view changes; do not create per-frame objects or ratio-specific cached textures.
4. Keep Graphics noninteractive, with no extra listeners or hit areas. The existing board pointer/keyboard paths remain authoritative. Existing scene/container destruction owns bar cleanup. Extend existing `data-battle-report` diagnostics with visible ratio/color/position/depth/count for assertions, accompanied by screenshots so diagnostics alone cannot establish rendered correctness.
5. Add focused browser coverage via `tests/unit-health-bars.spec.ts` and `playwright.health-bars.config.ts`: desktop Chromium plus touch Android Chromium and iPhone WebKit portrait/landscape (including narrow layouts). Keep the existing default suite intact. Reuse actual-control helpers for movement, attacks, signatures, modal capture, defeat, restart, save/Continue and run transitions; fixtures can isolate elevation/threshold geometry, but lifecycle evidence must use real UI commands. Screenshot settled and moving states and inspect them. Verify no stale health after between-encounter healing; no new in-battle healing rule is needed.

## Acceptance and verification mapping

| Issue criterion | Implementation | Verification |
| --- | --- | --- |
| 1: living/full HP curved bars | Graphics allocation and legacy arc helper | Full-health hero/enemy screenshots; defeat visibility |
| 2: accurate ratios/max HP/color | Snapshot HP + catalog max HP, clamped pure helper | Unit tests zero/full/out-of-range and 25/50% exact/adjacent boundaries; HUD comparison |
| 3: attachment/depth/readability | present/tween/view/bounds paths | Mid-movement elevated screenshots, pan/zoom/resize, crowded units, active/selected markers and feedback |
| 4: timing/lifecycle | animatedSnapshot and existing finish/cancel/scene lifetime | Pre/post damage, defeat, suspension, repeated restart object counts, Continue and run transition/healing checks |
| 5: mobile/input | View scaling, noninteractive objects | Chromium/WebKit portrait/landscape visual QA, tap-vs-drag/pinch, keyboard and modal capture |
| 6: evidence/checks | Focused unit/browser tests and QA record | Commands below and screenshot review; emulation is sufficient for #121 |

Run `npm run test:unit`, `npm run validate:content`, `npm run typecheck` (both configs), `npm run build`, `npm test` (including encounter/run-item posttests), focused `npx playwright test -c playwright.health-bars.config.ts`, strict OpenSpec and `git diff --check`. Record exact commits, browser versions, commands and failures/limitations. Use configured executable override only for Chromium; WebKit must launch its own runtime.

## Risks / Trade-offs

- Small fitted board or crowded bars → screen-size floor, bounded widths and screenshot validation; avoid a global overlay manager.
- Animation/refresh drift → centralize view placement for sprite and bar and test mid-animation resize/modal refresh.
- #119 may merge while this plan waits → fetch/recheck before implementation, preserve its drawable rectangle and clamped feedback behavior; run the focused suite against the combined result.
- WebKit runtime availability → install through normal dependency approval if needed; never substitute Chromium or claim an unexecuted matrix pass.

## Migration Plan

No persisted-data change. Implement only after explicit plan approval, commit source/tests/evidence, and open a PR against main. Rollback is a normal revert; no deployment or PR merge is authorized by this plan.

## Backlog readiness record

Reviewed all 14 open non-PR issues with bodies/labels/assignees, current open PRs #12/#119, remote branches, closed tracker history and main identity on 2026-10-17. #121 had no blockers/comments/assignee/active branch or PR; its concrete six criteria permit emulation and #111 is coordination, not a prerequisite. Re-read immediately before adding only `ready for work`, verified label, refreshed backlog, re-read before assigning dubstylee and verified assignment. No other label changed.

#123 waits for unmerged #119. #111 belongs to moshehbenavraham and active #119. #74/#81 retain physical lifecycle/persistence acceptance gaps; #57's owner exception explicitly accepts a baseline for #80, not blanket physical certification. #64/#66 retain hardware/reproduction requirements. #84 needs owner target/path choices; #85 waits for those choices and explicit production authorization. #57/#58/#59/#60/#83 remain parent acceptance trackers, not implementation candidates. #121 has no evidenced downstream unblock advantage; it wins as the sole concrete eligible feature after exclusions. No unsupported dependency links are inferred.

## Implementation refinement

Screenshot review found the planned below-nearer-tile depth hid the Fighter and Mage bars behind elevated foreground tiles. Bars therefore use an annotation depth above terrain/units but below existing effects, ordered by their unit tile. This preserves the always-visible requirement without changing state or interaction scope. Movement diagnostics update only the moving unit fields rather than remeasuring all static surfaces per frame.

Full-suite validation reproduced a native-resize/virtual-clock race in the existing elevated-impact test. The test now observes native resize before advancing the virtual clock and requires exact rotated dimensions; nine repaired repeats passed, while all runtime sources remain unchanged. Full first-pass results and limits are retained in the QA record.
