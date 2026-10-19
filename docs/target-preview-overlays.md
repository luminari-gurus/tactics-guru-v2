# Target preview overlays

Issue: [#142](https://github.com/luminari-gurus/tactics-guru-v2/issues/142).

## Legacy review

Reviewed the local legacy source at revision `a7e59d9733bdd5503bb3a8b7bd6d393c2d91f45c`, with no tracked modifications. This is a source review, not a claim of running the Godot application.

| Legacy overlay | Source and behavior | v2 treatment |
| --- | --- | --- |
| Movement reach | [BattleView.gd:1235](https://github.com/luminari-gurus/tactics-guru/blob/a7e59d9733bdd5503bb3a8b7bd6d393c2d91f45c/scripts/view/BattleView.gd#L1235): filled diamond with glow, outer border and inner edge; excludes the active unit's cell. | Retain v2's existing reachable diamonds and active-unit border. Hide movement reach during attack targeting. |
| Movement path | The same draw path layers path diamonds over reachable cells; [BattleController.gd:139](https://github.com/luminari-gurus/tactics-guru/blob/a7e59d9733bdd5503bb3a8b7bd6d393c2d91f45c/scripts/combat/BattleController.gd#L139) clears invalid paths and switches to action previews when an ability is selected. | Retain v2's authoritative pending-move path. |
| Attack candidates | [BattleView.gd:1277](https://github.com/luminari-gurus/tactics-guru/blob/a7e59d9733bdd5503bb3a8b7bd6d393c2d91f45c/scripts/view/BattleView.gd#L1277): green valid, red illegal, yellow risky/height-advantage diamonds; blocked LOS adds an X. Metadata comes from [BattleController.gd:760](https://github.com/luminari-gurus/tactics-guru/blob/a7e59d9733bdd5503bb3a8b7bd6d393c2d91f45c/scripts/combat/BattleController.gd#L760). | Bring forward valid/invalid diamonds for living enemy cells. Add a check or X for every candidate so availability does not depend on color. Include out-of-range enemies as unavailable rather than implying they can be attacked. Existing HUD text retains exact hit chance, damage and invalid reason. |
| Selected target | [BattleView.gd:1285](https://github.com/luminari-gurus/tactics-guru/blob/a7e59d9733bdd5503bb3a8b7bd6d393c2d91f45c/scripts/view/BattleView.gd#L1285) redraws the intended enemy target above the board. | Use a stronger outer border plus white inner diamond, keeping the validity color and symbol. A selected ally or empty cell gets an invalid preview too. Keep fills on terrain tops and symbols at the front edge, clear of unit bodies. |
| Area preview | [BattleView.gd:1358](https://github.com/luminari-gurus/tactics-guru/blob/a7e59d9733bdd5503bb3a8b7bd6d393c2d91f45c/scripts/view/BattleView.gd#L1358): Manhattan-radius area, with different empty/ally/enemy fills, only for a valid `save_area` preview. | Not selected: v2 currently has basic attack, Guarded Strike, High Shot and Magic Missile unit targets, without an area action. Do not port legacy Ember Burst or add unsupported affected cells. |

Legacy ability selection clears movement/path and publishes attack candidates; cancel restores movement and clears action/attack previews ([BattleController.gd:213](https://github.com/luminari-gurus/tactics-guru/blob/a7e59d9733bdd5503bb3a8b7bd6d393c2d91f45c/scripts/combat/BattleController.gd#L213)). Restart also clears previews. The selected v2 behavior follows these lifecycle boundaries without changing its explicit review/confirm flow. Risk/height-specific colors are omitted: existing exact HUD numbers communicate those distinctions, while board shapes communicate legality and intent.

## Implementation contract

`targetOverlays` reads the same `actionCommand` and `BattleSession.preview` used to prepare/review actions. It neither prepares a command nor mutates state, budgets, saves or RNG. It returns no overlays outside a player decision, after spending the action, in movement mode or after cancellation. The current UI assigns Magic Missile to one target; its preview marks that target cell, not a fictitious blast radius.

The existing cached tile textures render target fills, check/X symbols and selected double outlines at each tile's projected elevation. Camera transforms, tile depth, geometric picking, canopy fading and input ownership stay with the existing renderer. The board caption explains the target symbols during targeting, and the HUD retains live preview text. Arrow navigation updates both the prepared preview and its text; confirmation remains explicit.

Changing action/target recomputes overlays. Review and inspection preserve the current target preview; cancelling attack review or the action clears it. Cancelling a Move review retains Move mode for another destination, preserving the existing flow. Resolution clears target overlays before animation, and no target overlays appear during enemy turns or after outcome. Restart and encounter transitions create a fresh scene with no selected action.

## Verification

The battle animation browser suite checks selected valid targets for all three signatures, including keyboard and mobile controls, preservation during review, and clearing during resolution. Its focused overlay scenario checks ally rejection, arrow navigation, actual board click/tap on an elevated target, action switches, both cancellation paths, unchanged state/save slots and restart. Screenshots include valid signature previews and invalid selections in desktop, mobile portrait and mobile landscape projects. See the test run results accompanying this change for executed checks and limitations.

| Browser profile | Valid target preview | Invalid selection |
| --- | --- | --- |
| Desktop | [High Shot](qa/issue-142-target-previews/desktop-valid-target.png) | [Ally rejection](qa/issue-142-target-previews/desktop-invalid-target.png) |
| Mobile portrait | [High Shot](qa/issue-142-target-previews/mobile-portrait-valid-target.png) | [Ally rejection](qa/issue-142-target-previews/mobile-portrait-invalid-target.png) |
| Mobile landscape | [High Shot](qa/issue-142-target-previews/mobile-landscape-valid-target.png) | [Ally rejection](qa/issue-142-target-previews/mobile-landscape-invalid-target.png) |

Validated on 2026-10-18 with Node 23.11.1 and installed Google Chrome:

- `npm run build`: passed content validation (167 tests), both TypeScript checks and the production build. Existing Vite configuration/chunk-size warnings remain.
- `npm run test:unit`: 706 tests passed across 41 files.
- `npm test -- tests/battle-animations.spec.ts tests/battle-board.spec.ts tests/battle-loop.spec.ts tests/run-progression.spec.ts`, with `PLAYWRIGHT_CHROMIUM_EXECUTABLE` pointing to installed Chrome: 189 tests passed across desktop, Pixel 7 portrait and mobile landscape projects. The configured posttests also passed: 18 authored-encounter checks and 21 run-item checks (228 browser tests in total).
- `git diff --check`: passed.

Browser evidence uses emulation, not physical devices. The full default 546-test browser suite was not completed; validation is scoped to the affected suites and their configured posttests. No deployed-build, WebKit or physical-device result is claimed. The pre-existing untracked issue-84 release-plan and release-validation documents were left untouched.
