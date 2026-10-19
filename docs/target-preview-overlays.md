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

### Ability reach from a hypothetical origin

The follow-up source review uses current legacy revision `e9433f6b608ae6b2d95418615cce9cf17dadcf74`: [BattleView.gd:2791](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/view/BattleView.gd#L2791) publishes the hovered cell; [BattleController.gd:270](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/BattleController.gd#L270) previews a movement path and a [move-then-attack plan](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/BattleController.gd#L1260). The selected v2 behavior previews the active unit's ability reach as if it moved to the hovered tile.

The v2 hover overlay shows only owned ability ranges and line of sight from the preview origin; a white ring marks that origin. The existing teal movement overlay remains unchanged, and cells reachable only by movement are excluded from the purple overlay. Occupied cells and terrain that cannot be walked on are included when within ability reach. Legal living-unit targets are checked with the actual combat previews on a relocated copy of the state and get pink fills plus a white plus marker. Direct action-target markers retain priority while an attack is selected. The active unit stays on its actual tile, and no movement query is run from the hypothetical origin. Spent actions, spent movement and non-player phases disable the planning overlay. Occupied, unwalkable and out-of-bounds origins produce no preview. The origin may lie outside actual movement reach; this is a planning preview.

Mouse/pen hover changes neither selection nor pending commands, budgets, RNG, state or saves. Drag/zoom, leaving the board, modal entry, resize, suspension and action/lifecycle transitions clear the pointer origin. A prepared Move destination supplies the same range for touch and keyboard users and restores its preview after hovering elsewhere. Arrow navigation also previews its cursor cell. Cancellation clears the relevant preview; review hides it, and resolution/restart/encounter replacement removes it. The stable caption explains the shapes without resizing when the hover changes.

Hover screenshots: [desktop](qa/issue-142-target-previews/desktop-hover-movement.png), [portrait](qa/issue-142-target-previews/mobile-portrait-hover-movement.png), [landscape](qa/issue-142-target-previews/mobile-landscape-hover-movement.png).

Ability-only correction (2026-10-19): the opening Mage preview from `(4, 8)` includes the goblin five cells away in Magic Missile reach. Occupied targets remain visible, with pink markers for legal targets. A fighter regression excludes both the origin and a tile inside Move range but outside all owned ability ranges. Unit coverage also checks blocked line of sight, spent actions and unchanged state. Browser coverage checks that actual movement reach, selection, pending commands and saves remain unchanged. Current target screenshots: [desktop](qa/issue-142-target-previews/desktop-hover-goblin.png), [portrait](qa/issue-142-target-previews/mobile-portrait-hover-goblin.png), [landscape](qa/issue-142-target-previews/mobile-landscape-hover-goblin.png).

The current correction passed `npm run build`, all 708 unit tests, and the following 18 focused browser checks across desktop and mobile emulation with installed Chrome:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npx playwright test tests/battle-board.spec.ts tests/battle-animations.spec.ts --grep 'hovered origins|real controls|legal player movement|target overlays' --output=/private/tmp/issue-142-ability-only-capture
```

Prior broader validation below is historical; complete runs and configured posttests were not repeated for this correction.

The earlier hover extension passed `npm run build` (including content validation and both TypeScript checks), all 708 unit tests, and the focused hover scenario in all three browser profiles. Its regression command was:

```sh
npm test -- tests/battle-board.spec.ts tests/input.spec.ts tests/battle-loop.spec.ts tests/battle-animations.spec.ts --grep-invert 'complete legal authored battle|cached return|reload resumes accepted save|repeated cancellation|feedback matches resolved events|panned-edge actor|visible action feedback|elevated target remains anchored|spent action and effective'
```

With `PLAYWRIGHT_CHROMIUM_EXECUTABLE` pointing to installed Chrome, all 84 scoped browser checks passed. The configured posttests added 18 authored-encounter checks and 21 run-item checks (123 browser checks total). The complete battle/run scenarios below are retained from the initial target-overlay validation; they were not repeated for this hover extension. No physical-device, WebKit or deployment result is claimed. `git diff --check` also passed.

### Initial target overlay validation

The battle animation browser suite checks selected valid targets for all three signatures, including keyboard and mobile controls, preservation during review, and clearing during resolution. Its focused overlay scenario checks ally rejection, arrow navigation, actual board click/tap on an elevated target, action switches, both cancellation paths, unchanged state/save slots and restart. Screenshots include valid signature previews and invalid selections in desktop, mobile portrait and mobile landscape projects. See the test run results accompanying this change for executed checks and limitations.

| Browser profile | Valid target preview | Invalid selection |
| --- | --- | --- |
| Desktop | [High Shot](qa/issue-142-target-previews/desktop-valid-target.png) | [Ally rejection](qa/issue-142-target-previews/desktop-invalid-target.png) |
| Mobile portrait | [High Shot](qa/issue-142-target-previews/mobile-portrait-valid-target.png) | [Ally rejection](qa/issue-142-target-previews/mobile-portrait-invalid-target.png) |
| Mobile landscape | [High Shot](qa/issue-142-target-previews/mobile-landscape-valid-target.png) | [Ally rejection](qa/issue-142-target-previews/mobile-landscape-invalid-target.png) |

The initial target-overlay implementation at `fe78f1c` was validated on 2026-10-18 with Node 23.11.1 and installed Google Chrome:

- `npm run build`: passed content validation (167 tests), both TypeScript checks and the production build. Existing Vite configuration/chunk-size warnings remain.
- `npm run test:unit`: 706 tests passed across 41 files.
- `npm test -- tests/battle-animations.spec.ts tests/battle-board.spec.ts tests/battle-loop.spec.ts tests/run-progression.spec.ts`, with `PLAYWRIGHT_CHROMIUM_EXECUTABLE` pointing to installed Chrome: 189 tests passed across desktop, Pixel 7 portrait and mobile landscape projects. The configured posttests also passed: 18 authored-encounter checks and 21 run-item checks (228 browser tests in total).
- `git diff --check`: passed.

Browser evidence uses emulation, not physical devices. The full default 546-test browser suite was not completed; validation is scoped to the affected suites and their configured posttests. No deployed-build, WebKit or physical-device result is claimed. The pre-existing untracked issue-84 release-plan and release-validation documents were left untouched.
