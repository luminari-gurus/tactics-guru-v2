# Tactics Guru — Browser-First Tactical Game Technical Design

**Document status:** proposed `docs/tech_design.md` for the new project, revisiting the original Godot TDD; NOT applied to either repository. Core product decisions below are approved; remaining engineering details are proposals, not implementation authorization.
**New project repository (Brian's decision):** https://github.com/luminari-gurus/tactics-guru-v2. Brian created this repository for the Phaser restart. Do not initialize/scaffold it or add/commit/push these plans there until separately authorized; all planning artifacts remain outside the repository.
**Reference baseline:** `luminari-gurus/tactics-guru/main` at `e9433f6b608ae6b2d95418615cce9cf17dadcf74`, inspected 2026-10-05 UTC.
**Engine:** Phaser **4.2.1** (released npm `latest` at inspection).[37][38]
**Language:** TypeScript. **Build:** Vite. **Tests:** Vitest + Playwright.
**Approved presentation/rules:** isometric board and basic tactical rules, including the baseline height/movement/d20 model. Proposed tile footprint: 64×32 logical units; integer elevation; responsive HTML/CSS HUD.
**Approved MVP:** one polished replayable tactical battle (coordinator question 1, option A). A short roguelike route is deferred, not a prerequisite.

## 0. Executive summary and historical context

Tactics Guru should be a compact browser game, not an engine/tooling project. Preserve the original design's valuable intent: meaningful positioning, readable combat, small squads, brisk turns, reproducible debugging, extensible content and rules separated from presentation.[1]

The old implementation has grown beyond its TDD: resource-backed content validation, a generated overworld, inventory/equipment UI, level gating, local save/resume, custom maps and advanced status/combat systems are present. Some old sections still call these future work or describe a stub content database.[2][8][13] This design deliberately reduces restart scope rather than promising that all existing behavior survives.

Godot Resources, Nodes, TileMapLayer assumptions, autoloads, GDScript, `.tscn` tests and Web export are retired **in the new runtime** at `luminari-gurus/tactics-guru-v2`. The original `luminari-gurus/tactics-guru` repository/history and running Godot build remain untouched. Selected assets, content facts, algorithms and behavioral tests are references, not a line-for-line source port. Choosing the new repository does not authorize initialization, implementation, documentation inclusion or a deployment cutover.

## 1. Product goals and scope

### Approved product requirements

Brian confirmed **a lean playable loop first, selectively bringing back proven features later**; first release supports **mobile and desktop browsers, touch and mouse**, not full Godot parity. His coordinator answers resolve the scope as follows:

- **Loop:** A — one replayable tactical battle; no route or exploration requirement initially.
- **Restart motivation:** deployed load time/mobile issues, rather than a request to abandon basic gameplay rules.
- **Presentation/rules:** retain isometric presentation and basic rules.
- **Required QA matrix:** iPhone Safari, iPhone Chrome, Android Chrome and desktop; both portrait and landscape. Actual device models, OS/browser versions and desktop browser selection remain to be agreed; Telegram/in-app webviews are optional.
- **Compatibility:** fresh new runtime; no importer for Godot saves, runs, records or custom maps. Preserve old data untouched.
- **Repository:** `luminari-gurus/tactics-guru-v2`; initialization/scaffolding and adding plans remain explicitly on hold.

### Proposed goals

- Small, readable tactics battles playable by mouse, keyboard and touch.
- Fighter, Ranger and Mage have visibly different tactical roles.
- Height and terrain matter without full 3D physics or raycasting.
- Players preview movement, target legality and resolution before committing.
- A seed plus commands can reproduce a bug without relying on frame timing.
- Adding a content definition should not require a new UI branch.

### Combat MVP

One authored forest board, roughly 10–12 cells per axis; three fixed heroes and a small melee/ranged goblin encounter; cardinal weighted movement, occupancy and Jump; initiative; one move and one action per turn; Basic Attack and one signature per hero; greedy legal AI; win/loss, restart, turn queue, log, inspection and touch-safe preview/confirm/cancel. Include a small set of existing art/SFX, mute and a nonblocking loading/error screen.

Candidate signatures: Guarded Strike, High Shot and Ember Burst preserve the original frontline/range/AoE contrast. Existing Second Wind, Mark Target, Arc Bolt and level-unlocked Taunt/Pinning Shot/Frost Snare are later content, not MVP acceptance.[3][12]

### Explicitly outside combat MVP

Procedural overworld/combat generation, multi-floor campaigns, shops, recruitment, XP/meta progression, item economy UI, broad biome rosters, editor/custom map exchange, advanced stacks/typed resistances/immunities/auras/charge/forced movement/summons/tempo, camera rotation, multiplayer/accounts/global leaderboard and analytics collection.

A later separately approved short-run slice may add three encounters, party HP carryover, one reward choice and a few generic items. Exploration is not part of the approved first loop; do not silently expand this MVP to the current procedural system.

### Definition of done

Start/play/win/lose/restart without developer tools; movement/target previews match actual resolution; no illegal AI actions or soft locks; three signatures have distinct useful situations; fully played repeated battles—not only forced-outcome fixtures; agreed mobile devices and orientations pass; local resume at safe boundaries works if accepted into the slice; production cutover is separately approved. Numeric loading/FPS budgets are set after measurement, not asserted here.

## 2. Architecture and dependency boundaries

```text
Validated content catalog + explicit RNG state
                  ↓
      engine-independent domain core
  grid / targeting / turns / combat / AI
                  ↓
        typed results + domain events
                  ↓
       app BattleSession controller
            ↙                ↘
 Phaser board/input/audio   HTML/CSS HUD/dialogs
                  ↓
       versioned storage adapter
```

Domain code imports no Phaser, DOM, browser globals or animation helpers. The session validates/dispatches player or AI commands, exposes a pure preview and coordinates presentation. Phaser Scenes load/render assets and translate pointers/camera positions into commands; they never determine legality, HP or victory. DOM controls consume selectors and send intentions through the same session. Storage only receives plain domain snapshots.

This keeps the original simulation/presentation boundary while replacing engine-specific structure.[1] Avoid ECS, generic event buses, state-management frameworks and dependency injection containers until a concrete need exists.

## 3. Proposed module/file layout

```text
package.json                    # one npm project; exact Phaser pin + lockfile
index.html
vite.config.ts
tsconfig.json
src/
  main.ts                       # create game, mount DOM HUD
  domain/
    types.ts constants.ts rng.ts
    grid.ts targeting.ts turns.ts combat.ts abilities.ts ai.ts battle.ts
    run.ts inventory.ts equipment.ts  # only when short-run slice approved
  content/
    types.ts validate.ts catalog.ts
  app/
    BattleSession.ts selectors.ts
  phaser/
    BootScene.ts BattleScene.ts BoardRenderer.ts
    iso.ts picking.ts input.ts audio.ts
  ui/
    hud.ts dialogs.ts styles.css
  storage/
    schema.ts migrate.ts localSave.ts
content/
  maps/forest-ruins.json
  terrain.json classes.json units.json abilities.json ai-profiles.json
  items.json encounters.json      # optional next slice
public/assets/
  manifest.json portraits/ units/ tiles/ audio/
tests/
  unit/                          # pure rules/content/storage
  e2e/                           # actual browser interactions/screensizes
  fixtures/                      # seeds, command logs, overlap boards, saves
docs/
  tech_design.md asset_licenses.md browser-qa.md scope-ledger.md
openspec/
  specs/{combat-core,overworld-run,mobile-web-ux,meta-progression}/spec.md
```

Paths are proposals for `luminari-gurus/tactics-guru-v2`, not created runtime files or instructions to modify the original Godot repository. Use named constants for dice bounds, critical multiplier, elevation step, tile dimensions, UI hit targets and rule limits. Split a service only when its responsibility warrants it; do not rebuild every Godot class in TypeScript.

## 4. Data contracts and content validation

**Immutable definitions:** Terrain (ID, positive move cost, walkable, LOS block, asset key); Class (ID, role, bounded base stats, ability IDs); Unit (ID, class ID, side, AI profile, sprite/portrait); Ability (ID, discriminated effect/target, range, height tolerance, cost, presentation keys); Map (ID, size, tile coordinates/height/terrain, player/enemy spawns); AI profile (explicit finite weights).

**Runtime state:** Battle contains rules/content versions, seed and PRNG continuation, tiles/occupants, units/HP/statuses/action flags, initiative/round/active index, outcome and command/event log. Coordinates are `{x:number,y:number}` with integer validation; IDs are stable strings; use JSON-compatible records/arrays at the persistence boundary. Runtime HP is never stored in immutable definitions.

**Commands:** move, useAbility, wait, restart. Intent contains actor/target IDs or cell, not computed damage or arbitrary caller paths. Recompute legality and cost in domain.

**Results:** discriminated success/rejection; reason code; new state or explicit validated state transition; ordered typed events such as moved, rolled, damaged, statusApplied, defeated, turnChanged and battleEnded. Preview returns legality/cost/formula/affected cells without RNG or mutation. Reject the whole invalid command before consuming RNG, an action or inventory. This reuses the existing advanced tests' valuable atomicity principle without retaining all effects.[33]

**Build/load validation:** unique IDs; every reference resolves; no NaN/infinity/fractional coordinates; bounded map dimensions and complete unique cells; walkable distinct spawns; positive movement cost; supported target/effect combinations; known asset keys; bounded radius/range; no unsupported effect fields. Unknown content must fail with a useful path/error, not create a partially working battle. Existing content validation is a real implementation, not the stub described in the old TDD.[2]

### Optional inventory/equipment contract

Use `ConsumableDef | EquipmentDef`, typed categories, stack policy, usable contexts/target rules, slot layouts and generic whitelisted stat/ability effects. Owned stacks/equipment instances are separate from catalog definitions. Equip validates ownership, slot and category; unequip returns the prior item; invalid use never consumes; successful effects compose on fresh battle stats without contaminating base stats. Generate UI from catalog entries. Existing tests demonstrate battle-local equipment and composition, but current equip code does not itself enforce owned inventory.[8][10][26]

## 5. Coordinates, rendering and input

Retain logical square grid independent of screen projection. With named tile width/height/elevation constants, project `(x-y)×halfWidth` and `(x+y)×halfHeight - height×elevationStep`. Flat inverse is only a candidate picker: raised overlaps need top-face hit testing and deterministic visual order. Domain never accepts an action just because a sprite was clicked.

Start with standard Graphics/images rather than assuming an isometric Tilemap plugin solves height. Phaser 4.2.1 `Graphics.fillPoints` and component `setDepth` exist; neither provides the game's occlusion or picking rules.[47][48] Prefer separate terrain, units, canopy/foreground and overlay passes. Preserve canopy occlusion intent with a readable selection/inspection affordance; existing code redraws nearby elevated canopy faces with alpha, rather than offering a general 3D occlusion model.[17]

Camera input uses tagged `BaseCamera.getWorldPoint`/`setZoom`; pointer tracking uses `InputPlugin.addPointer` when multi-touch is needed.[45][46] Implement gesture arbitration: tap selects/previews; confirm commits; drag pans and cannot also commit a tap; pinch zoom cannot fire two selections; cancel is visible (long-press optional); modals capture board input. Do not require hover on touch.

DOM HUD uses ≥44 CSS-pixel hit targets, safe-area insets, clear action names, keyboard focus and accessible HTML dialogs. Determine available board area from actual layout, not a desktop-resolution threshold alone. Reflow across portrait/landscape/short windows; do not merely shrink all controls. Phaser FIT/RESIZE are real options; its ScaleManager warns unrestricted RESIZE can exhaust fill-rate.[44] Choose bounded rendering/DPR in the fit gate.

Animation consumes events after simulation commits. Input locks prevent duplicate actions, and cleanup/restart cancels stale tweens/listeners. Animations and sound failures cannot stall turn advancement or corrupt state.

## 6. Rules, initiative, targeting and AI

Proposed baseline preserves the original readable rules unless Brian approves simplification:

- Four cardinal neighbors; destination terrain cost plus positive climb; Jump limits uphill delta; no occupied/impassable destination; one movement budget, no split movement.
- Manhattan range and explicit tile LOS blockers; no full 3D raycast or occupant LOS.
- Initiative d20 + Dex, ties by Dex then player side then instance ID; fixed order for MVP; defeated units skipped. Current main adds tempo-driven round reorder, explicitly omitted here.[6][34]
- Attack d20 + accuracy/ability/height/status versus AC; natural 1 misses, natural 20 crits; minimum positive hit damage and named critical multiplier. Signature high-ground/AoE/Guarded behaviors use shared calculation paths for preview and execution.[5][25]
- Status expiry at a precise hook, initially one Guarded policy; no generic deep effect system until needed.
- AI generates legal current-position/move+action candidates and Wait fallback, scores by expected damage/range/height/safety and uses stable ties. No multi-turn planning; domain validates selected AI command again. Do not compute candidates every render frame.[7]

Use a documented TypeScript PRNG with test vectors and explicit cursor/state. Matching Godot seed streams is not promised: Godot's RNG state and old saved numeric representations are engine-dependent.[13] Determinism is guaranteed only within an accepted rules/content/RNG version.

## 7. Assets, audio and content workflow

Reuse only selected canonical Fighter/Ranger/Mage unit art and illustrated portraits, forest terrain, a small enemy set and required WAV/OGG assets. Verify provenance via `docs/asset_licenses.md`; generated art history may need additional review before moving outside the original repository. Do not transfer Godot `.import`/`.uid` metadata or unused large asset batches.[24]

Maintain a typed asset manifest with key/path/origin/license and dimensions/anchor metadata. Validate missing keys/files during build. PNG is directly usable; Phaser 4 handles ordinary image texture orientation automatically.[39] Test sprite foot anchors and portrait readability; do not generate new media for this restart planning.

Music is optional one track; required controls are mute/volume and visibility suspend/resume. Phaser's WebAudio manager has unlock/focus hooks, but first-user-gesture playback and intended in-app browser behavior need real testing.[49] Domain events name audio cues; no core sound calls.

## 8. Saves and optional services

Use a new namespaced local key, e.g. `tactics_guru.phaser4.save.v1`; never overwrite `tactics_guru.active_run_state`, `tactics_guru.active_battle_state` or old leaderboard keys. Save envelope contains format/rules/content/RNG versions and a domain snapshot at a safe command boundary. Validate type, size, finite safe integers, known IDs and state invariants. Corrupt/future versions should offer recover/reset/export choices without automatic deletion. Keep last-known-good backup; catch quota/security exceptions. A checksum detects accidental corruption, not cheating.

Preference saves can start early; active battle/run resume requires next-command/RNG equivalence tests. Do not serialize animation phase, Phaser objects, DOM, resource references or unbounded logs. Explicit migrations are pure functions with fixtures and backup-first behavior. Legacy Godot save import is optional separate scope, particularly because RNG integers need precision care.[13][27]

No server is required. Existing global leaderboard is a deferred payload contract, not a working upload backend.[29]

Meta Renown is not guaranteed durable by the base spec.[31]

Analytics has actual privacy-constrained code, but is optional for restart; default disabled, no replay/raw logs/saves/seeds, no domain dependency.[20][21]

## 9. Browser delivery and operational simplicity

One Vite application builds static `dist/` HTML/JS/assets. Host on existing static infrastructure if desired; a small Node-build/nginx image is an option, not mandatory. Keep index/config revalidated and content-hashed JS/art immutable; test reload across deployments and missing assets. No Godot export stage/WASM/PCK is retained in the new build.[22]

The old TDD names a Coolify GitHub deploy workflow, but the inspected complete tree has no `.github` entries. Actual hosting/automation ownership is an open operational question, not an established dependency.[1] No deployment changes are authorized by this draft.

No service worker/PWA/offline-cache migration, native wrapper, authentication, backend or telemetry requirement until explicitly approved. Local play being browser-based does not by itself guarantee offline first-load availability.

## 10. Tests and acceptance gates

**Vitest:** content validation, seeded RNG vectors, occupancy/weighted paths/Jump, LOS/AoE, initiative ties/skip, d20 edges, class effects/expiry, pure previews, invalid-command no-op, legal AI/Wait, outcome/restart, safe save round-trip and future/corrupt/quota cases. Later inventory tests must prove extensible catalog entries, ownership, compatibility, atomic consumption and battle-local effects.

**Playwright:** boot/loading failures, move/attack/wait/outcome/restart through real controls, picking under pan/zoom/elevation, modal no-click-through, keyboard, touch/drag arbitration, screen-size/DPR changes, log/portrait visibility, reload/resume and asset errors. Fixed seeds/time/fonts for visual fixtures. Use actual state and control assertions as well as screenshots; emulated WebKit/touch is not proof of physical iPhone or Telegram-webview behavior.

**Manual/device gate:** physical iPhone Safari, iPhone Chrome, Android Chrome and agreed desktop browsers; portrait+landscape, audio after tap, background/resume and repeated fully played battles. Record device/OS/browser/network conditions, compressed transfer and asset sizes, cold-cache and warm-cache time to usable controls/first playable battle, plus frame timings. Compare against the old deployed Godot build under matching conditions where safely accessible, or record the missing baseline. Minimize startup assets and defer optional content loading. Establish numerical budgets with Brian after measurement; improvement is an acceptance concern, not a proven result. Telegram/in-app webviews are optional and not substitutes for the approved device matrix.

Proposed scripts: `typecheck`, `validate:content`, `test:unit`, `build`, `test:e2e`; none have run for this planning task. Existing 154 named GDScript test files are a scenario library, not a portable or verified-green suite. `.tscn` node layout tests are replaced with browser tests. Existing forced win/loss restart fixtures do not satisfy full-battle play acceptance.[36]

## 11. Incremental roadmap

1. **Approve scope/reconcile specs:** one restart proposal, capability mapping, reduced acceptance and asset/save choices. Repository choice is settled as `luminari-gurus/tactics-guru-v2`; initialization and inclusion of these plans still require separate authorization.
2. **Proof-of-fit:** isolated 4.2.1 ESM/types build; raised board, sprite/canopy picking, move animation, audio unlock, resize and actual target devices. No claim it has already run.
3. **Content + movement:** convert one map; validator and pure grid/RNG tests before implementation.
4. **Turns/combat/signatures:** TDD legal commands, pure previews, d20 outcomes and status expiry.
5. **AI + scene loop:** legal deterministic choices, event adapter and full play/restart flow.
6. **Responsive input/HUD + safe storage:** real browser/device checks, nonfatal local persistence.
7. **Accepted preview → intentional cutover:** verify static delivery and preserve Godot history/build fallback.
8. **Optional run slice:** only after product approval; few encounters/rewards/items, not full parity.

Every slice is reviewed from a clean TDD worktree with focused/full test evidence and synchronized specs/tasks. No closing issue/PR language until acceptance is complete.

## 12. Risks, assumptions and open decisions

Primary risk: full feature-parity creep defeats the purpose. Other risks: Phaser's recently replaced renderer, wrong Phaser-3 examples/plugins, camera/DOM coordinate mismatch, raised-tile/canopy picking, mobile GPU/DPR, sound policy, old-save precision, asset provenance and unchanged d20 complexity.

4.2.1 fixes resize, ESM, stencil and delayed tweens; pin it and avoid custom rendering internals. Phaser 4 removes the old pipelines and unifies FX/masks into filters; Canvas is deprecated. Do not silently target Phaser 3 or promise unsupported-device performance.[38][39]

Resolved by Brian: one replayable tactical battle; deployed loading/mobile problems as the restart motivation; isometric presentation/basic rules retained; iPhone Safari, iPhone Chrome, Android Chrome and desktop in both orientations; fresh runtime without legacy import; new repository https://github.com/luminari-gurus/tactics-guru-v2. Remaining decisions include exact physical-device/desktop-browser samples, numerical loading/frame budgets, hosting, optional analytics and final encounter/ability balancing. Repository initialization and plan inclusion remain explicitly on hold; approved product direction is not authorization to begin implementation.

## 13. Transition mapping from the original TDD

| Original sections | Proposed treatment |
|---|---|
| 0–2 summary/goals/MVP | Preserve compact positioning/readability intent; replace stale status with explicit proposal and reduced combat MVP. |
| 3 architecture | Keep rules/view separation; use domain→session→Phaser/DOM boundary. |
| 4–5 Godot structure/scenes | Retire `res://`, autoload, Node/Resource/TileMapLayer layout; use TS modules and minimal Phaser Scenes. |
| 6 coordinate math | Retain logical projection/constants; strengthen raised picking/occlusion tests. |
| 7–8 content/runtime | Replace Resources/Vector2i/StringName with immutable typed definitions and serializable runtime state; validate actual data. |
| 9–13 lifecycle/turns/movement/targeting/combat | Preserve useful baseline/invariants; explicitly exclude newer deep effects/tempo until accepted. |
| 14–15 initial content/AI | Keep three roles and simple legal AI, not all expanded rosters/abilities. |
| 16–18 UI/rendering/audio | Rebuild browser/mobile UI and event presentation; reuse selected artwork/SFX with provenance. |
| 19–21 authoring/database/signals | One validated JSON map/catalog; typed commands/events instead of Godot signal/resource tooling; editor later. |
| 22–25 debugging/tests/performance/saves | Versioned deterministic logs; Vitest/Playwright + devices; measured performance; safe namespaced saves instead of obsolete “save later” status. |
| 26–27 milestones/backlog | Replace historic M0–M11/backlog with approval/fit/core/playable/mobile/cutover gates. |
| 28–30 risks/extensions/questions | Explicit scope ledger, optional run, product questions; no automatic parity. |
| 31–33 operations/references/immediate step | Static browser build; verify hosting; official Phaser 4 tagged references; scope approval + fit proof, not old M1 movement work. |

### OpenSpec alignment, not mutation

Retain capability-level requirements where still accepted. Use the original repository's `openspec/specs/combat-core/spec.md`, `overworld-run/spec.md`, `mobile-web-ux/spec.md`, `meta-progression/spec.md` as reconciliation inputs for implemented and deferred behavior. After explicit authorization to initialize and include documentation in the new repository, establish only the accepted Phaser requirements and target-native workflow there; validate focused and all target specs strictly before implementation. Do not edit, mass-delete or archive the original Godot requirements as part of this planning task; existing unarchived changes include already-implemented work.[30]

Exact delta/proposal/design/task paths for all current changes are listed in `phaser4-discovery/evidence.md`. The companion plan supplies feature decisions and PR-sized file/acceptance mapping. This draft and source snapshot are external review artifacts; repository design/specs/runtime remain unchanged.

## Sources

[1] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/docs/tech_design.md
[2] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/autoload/ContentDatabase.gd
[3] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/ForestRuinsMvpBuilder.gd
[5] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/CombatResolver.gd
[6] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/TurnManager.gd
[7] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/AIController.gd
[8] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/RunState.gd
[10] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/ItemCatalog.gd
[12] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/UnitProgressionService.gd
[13] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/ActiveBattleStorage.gd
[17] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/view/BattleView.gd
[20] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/analytics/AnalyticsService.gd
[21] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/web/posthog-bootstrap.js
[22] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/Dockerfile
[24] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/docs/asset_licenses.md
[25] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_combat_resolver.gd
[26] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_run_equipment_effects.gd
[27] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_active_battle_storage.gd
[29] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_m22_leaderboard_global_sync_contract.gd
[30] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/openspec/project.md
[31] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/openspec/specs/meta-progression/spec.md
[33] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_issue_599_summon_command_actions.gd
[34] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_issue_606_tempo_modifiers.gd
[36] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_m7_stability_pass.gd
[37] https://registry.npmjs.org/phaser/latest
[38] https://github.com/phaserjs/phaser/releases/tag/v4.2.1
[39] https://github.com/phaserjs/phaser/blob/v4.2.1/changelog/v4/4.0/MIGRATION-GUIDE.md
[44] https://github.com/phaserjs/phaser/blob/v4.2.1/src/scale/ScaleManager.js
[45] https://github.com/phaserjs/phaser/blob/v4.2.1/src/input/InputPlugin.js
[46] https://github.com/phaserjs/phaser/blob/v4.2.1/src/cameras/2d/BaseCamera.js
[47] https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/components/Depth.js
[48] https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/graphics/Graphics.js
[49] https://github.com/phaserjs/phaser/blob/v4.2.1/src/sound/webaudio/WebAudioSoundManager.js
