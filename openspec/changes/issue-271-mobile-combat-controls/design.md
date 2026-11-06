# Design

## Context

Issue [#271](https://github.com/luminari-gurus/tactics-guru-v2/issues/271). Owner decisions on 2026-11-02: 10 px touch pan threshold (6 px mouse/pen); Magic Missile one-target on mobile; Plan move is a radial slice that reopens at the chosen tile; settings Auto/Radial/Rail with Auto → Option C on every coarse pointer. Design reference is draft PR #237 at `b1dc2dd` (`mockups/combat-ui/`), not mergeable game code.

On `main`, selection lives in `BattleScene` locals (`action`, `selected`, `planning`, `planMove`). `BoardInput` pans after `DRAG_THRESHOLD = 6` for every pointer. HUD rail/dock from #108/#111/#123 still owns Ability/target selects and Confirm/Cancel. Magic Missile already accepts `{ unitId }` as “all missiles at that target”; the radial uses that form. Desktop rail behaviour is unchanged unless the player picks Radial.

## Goals / Non-Goals

**Goals:** shared selection model; Option C on Auto+coarse and Radial; rail on Auto+fine and Rail; accessible tap/keyboard path; existing desktop tests still pass.

**Non-Goals:** Desktop Option B; merging `mockups/combat-ui/`; rule/balance/ability changes; undo-last-confirm; board rotation (#178).

## Decisions

- Extract `BattleSelection` (`src/ui/battleSelection.ts`) as the only writer of `selectedCell`, `selectedAction`, planning, and the prepare/confirm/cancel/endTurn/plan path. `BattleHud` and `BattleRadial` are views. Scene still owns presentation, board overlays, dialogs, and audio.
- Skin resolution is one helper: stored preference, then `(pointer: coarse)` when Auto. Listen to `matchMedia`, `storage`, and a same-tab change event. Switching skins never calls `cancel()`; an open radial closes visually while pending intent remains.
- Gestures: optional `hold`/`aim`/`release`/`dismiss` on `BoardInput`. Proof/fixture callers omit them and keep today’s tap/pan/pinch. Touch threshold 10 px; mouse/pen 6 px. Hold 300 ms opens the radial and aims the default slice; releasing without leaving the hub commits that default (one-step hold). Leaving the hub then returning cancels. Reduced motion skips the timer; taps open the menu. Second finger, pinch, `pointercancel`, `lostpointercapture`, hidden document, dialogs, and non-player phases dismiss with no command.
- Slices: N Attack, E Special, S Inspect, W Move, plus Plan when movement+action remain. Special lists only specials whose `targetOverlays`/`previewTacticalPlan` preview is legal; one legal special commits with no extra step. Last-used special is remembered per unit in scene memory.
- Plan move: slice → destination tap stores `planMove` and reopens the radial at that tile → Attack/Special choose the follow-up (self specials commit immediately; others wait for a target tap) → `confirmPlan()`. Hub/Escape at either step clears the plan.
- Mobile Magic Missile uses existing `{ unitId }` allocation. No split UI. Desktop rail is unchanged.
- Settings: Auto/Radial/Rail radios in the main-menu Settings dialog and the battle overflow. Key `tactics-guru:combat-controls`. End turn stays `#battle-next` (min 48 px on the radial dock). Secondary tools keep their IDs; Ability/target/Confirm/Cancel are hidden, not removed from the rail DOM, so fine-pointer tests keep using them.

## Risks / Trade-offs

- Hold vs pan → pointer-type thresholds and a hold timer that arms only when the finger stays inside the threshold; unit tests on both sides of 6 and 10 px.
- Existing mobile Playwright files click rail widgets → `playCommand`/`playUndo` follow the active skin; rail-only assertions skip on coarse-pointer projects; new `battle-radial.spec.ts` covers Option C; WebKit grep adds hold/tap/cancel/End turn.
- Hidden rail widgets on radial → keyboard/screen-reader path is the labelled radial buttons, not the hidden selects.

## Migration Plan

No save-format change. Unknown preference values fall back to Auto. Rollback is the previous build.

## Verification and device scope

Playwright Chromium `mobile-portrait` / `mobile-landscape` and WebKit device-acceptance emulation satisfy device acceptance. Physical devices are not required. PR-readiness: shared-model and gesture units, both typechecks, production build, desktop battle files, new radial Chromium cases, and the updated WebKit grep set.
