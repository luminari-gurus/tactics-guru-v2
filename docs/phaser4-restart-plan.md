# Tactics Guru Phaser 4 Restart Plan

**Status:** historical source-backed restart plan; its status snapshot was refreshed 2026-10-16 following the #82 reconciliation. Core product decisions remain approved; implementation and open acceptance are distinguished below. This document does not authorize production operations.
**Inspected:** 2026-10-05 UTC; **re-verified 2026-10-06**. Legacy repository: `luminari-gurus/tactics-guru` (private), `main` at **`e9433f6b608ae6b2d95418615cce9cf17dadcf74`**, still the remote head on 2026-10-06. Local read-only mirror: `ORIGINAL/`, ignored through a local, uncommitted `.gitignore` edit; every legacy path in this plan resolves under it.
**Goal:** recover the small, enjoyable browser tactics game Brian intended, not reproduce every Godot feature.
**New project repository (Brian’s decision):** https://github.com/luminari-gurus/tactics-guru-v2 (public). Main contains the playable battle, tooling, documentation and task-specific OpenSpec changes; the legacy Godot repository remains the reference source, not the target runtime.
**Historical location:** `docs/phaser4-restart-plan.md` and the companion draft have been on main since merged PR #13 (2026-10-06). #82 updates those existing files; no migration or fresh setup is required. Task branches start from current `origin/main`. The unavailable discovery companion and historical `ORIGINAL/` mirror remain provenance references.
**Architecture:** deterministic, engine-independent TypeScript domain core; Phaser owns rendering/input/audio, not rules. Plain HTML/CSS handles responsive menus and accessible controls.
**Stack at the 2026-10-16 snapshot:** Phaser **4.2.1**, TypeScript 7.0.2, Vite 8.3.2, Playwright 1.63.0 and Vitest 5.0.3; Node declared ≥22.12.0. Static browser build. Exact package/script versions are in `package.json`; PR #12’s release configuration is unmerged.

**Map selection follow-up (#146, 2026-10-19):** [PR #149](https://github.com/luminari-gurus/tactics-guru-v2/pull/149) adds exposed opaque living-sprite hits and repeated click/tap cycling through overlapping terrain cells via the existing selection/preview path. Hidden bodies do not override foreground terrain; the proof scene keeps frontmost-solid picking and domain legality is unchanged. This branch implementation supersedes the dated D8/T4 tile-only disposition below for battles; it was merged in PR #149. See the [current contract and evidence](qa/issue-146-occluded-map-picking/README.md).

Tracker check on 2026-10-29: #2, #11, #57–#60, #64, #66, #74, #81, #111 and #121 are closed; #153, #161 and #162 remain open. PRs #115 and #149 are merged. Issue status is separate from the original QA evidence and can change; consult GitHub for later updates.

### Historical state (verified 2026-10-16)

This snapshot and its tracker states are historical. For the current source contract audited at `b343ab02ae033a57f8c5f613f07883764f0752c0`, see the [README](../README.md), [dungeon](dungeon.md), [hero progression](hero-progression.md), [ability rules](signature-abilities.md), [enemy turns](enemy-turns.md), and [verification policy](verification-policy.md). Check GitHub for current issue and PR states. Browser/device emulation satisfies acceptance under [AGENTS.md](../AGENTS.md) unless physical devices are explicitly requested; old hardware-only gates below are historical.

GitHub main is [`b175ddb5dabed2ee8457e132e345e9a2fc2affdb`](https://github.com/luminari-gurus/tactics-guru-v2/commit/b175ddb5dabed2ee8457e132e345e9a2fc2affdb), the merged #80 integration (PR #120). Issue and PR states were refreshed on 2026-10-16. Initial local source inspection used `work/issue-79-reward-item-controls` at `3060060`; subsequent main changes below are confirmed by merged tracker records, not local execution. The documentation PR is based on the main revision above. Historical QA results retain their original revision/device limits; this documentation update ran no gameplay or physical-device tests.

| Area | Merged implementation / tracker state | Evidence and remaining acceptance |
| --- | --- | --- |
| Plans and tooling | Both planning documents merged in [PR #13](https://github.com/luminari-gurus/tactics-guru-v2/pull/13). Phaser 4.2.1, TypeScript 7.0.2, Vite 8.3.2, Playwright 1.63.0 and Vitest 5.0.3 are pinned. | [package.json](../package.json), [domain compiler config](../tsconfig.domain.json), [Vitest config](../vitest.config.ts), [OpenSpec changes](../openspec/changes). No new dependency or setup is needed. |
| Battle milestones | #1 and #2–#11 are closed; content, state/RNG, movement, turns, signatures, legal AI, board, HUD and replay/restart exist on main. | [BattleSession](../src/app/BattleSession.ts), [battle QA](qa/issue-10-battle.md), [#11 evidence](qa/issue-11-battle.md). Closed implementation milestones do not certify the remaining hardware matrix. #6 is closed. |
| Audio | #62 closed; [PR #63](https://github.com/luminari-gurus/tactics-guru-v2/pull/63) merged at `de738584`. Eight generated MP3 cues, explicit Enable sound/mute/retry, bounded recovery and no duplicate resume playback. | [Audio QA](qa/issue-62-battle-audio.md), [cue definitions](../src/audio/battleCues.ts). Physical audibility/lifecycle remains in #64; historical intermediate failures are retained. |
| Performance | #65 closed; [PR #67](https://github.com/luminari-gurus/tactics-guru-v2/pull/67) merged at `e955e9d`. Shared cached column/overlay textures and corrected v3 POST_RENDER sampling. | [Frame evidence](qa/issue-65-frame-budgets.md) records deployed unchanged F1/F2/L1–L4 passes, source/build identity and earlier failures. These captures do not certify hardware or the later combined audio tree. |
| Baked experiment | #68 closed; [PR #71](https://github.com/luminari-gurus/tactics-guru-v2/pull/71) merged at `cae524e`. Prototype **not adopted**; #67 renderer retained. | [Experiment evidence](qa/issue-68-baked-tiles.md): submission reduction did not justify memory/generation/maintenance cost; prototype source and failures remain reviewable. |
| First-battle readiness | #57 remains open; #64 physical iPhone Safari/Chrome, Android Chrome and desktop certification plus #66 intermittent Safari restart remain open. | [#64](https://github.com/luminari-gurus/tactics-guru-v2/issues/64), [#66](https://github.com/luminari-gurus/tactics-guru-v2/issues/66). #66’s prior claim was withdrawn; its planning branch is historical. The #65 shutdown repair is not a diagnosis or fix of the physical report. |
| Save/resume | #69/#72/#73 complete through merged PRs #70/#91/#95; snapshot codec, guarded primary/backup storage, command-boundary autosave, Continue and recovery controls are implemented. | [Storage contract](battle-storage.md), [resume QA](qa/issue-73-battle-resume.md). #58 and physical lifecycle certification #74 remain open; implementation is not certification. |
| Authored run and rewards | #75–#80 closed; PRs #107/#109/#114/#115/#116/#120 merged. Three encounters, HP carryover, item/reward catalog, atomic commands, ownership UI and playable run continuation are delivered. | [Run contract](run-contract.md), [encounters](authored-encounters.md), [item QA](qa/issue-79.md), [integration PR #120](https://github.com/luminari-gurus/tactics-guru-v2/pull/120). #59/#60 and full-run certification #81 remain open. |
| Overworld prototype | #87/#96–#99 closed; PRs #93/#100/#101/#104/#105 merged. Standalone `/map` has seeded layouts, biomes and art selection. | [Map contract](overworld-map.md), [acceptance QA](qa/issue-96-map-acceptance.md). This remains independent of battle/run progression. |
| Battle presentation and controls | #106 animation and #108 design complete (PRs #110/#112); dialog/input fixes #113 and drawable board regions #118 merged. | [Animation QA](qa/issue-106-ability-animations.md). #111 remains open with controls/inspection PR #119 open; health bars #121 are requested, not delivered. |
| Delivery | QA records existing Pages main/branch previews. [PR #12](https://github.com/luminari-gurus/tactics-guru-v2/pull/12) remains open and unmerged. | Pages served-build captures are historical evidence, not a fresh live-host probe. SSH installer is not installed/approved by its package tests. #83/#84 review and #85 separately authorized activation retain production/rollback gates. Analytics stays optional/default off. |

The October 6 legacy audit and revision notes below remain historical evidence at legacy SHA `e9433f6b608ae6b2d95418615cce9cf17dadcf74`. This task did not re-audit that private repository or refresh the old host probe. Missing `ORIGINAL/` and `phaser4-discovery/evidence.md` references are provenance, not available local files.

### Historical current-state audit (verified 2026-10-06)

The following table and its then-current restrictions describe October 6 only. PR #13 subsequently merged the plans; the current snapshot supersedes scaffold/branch status, not the dated observations.

| Fact | Evidence |
|---|---|
| v2 `main` is `df693f0`, "chore: initialize minimal Phaser 4 TypeScript project" (2026-10-05 22:04 UTC): one placeholder scene in `src/main.ts`, one Playwright smoke test (`tests/boot.spec.ts`) run in three Chromium projects. | [51]; at that commit, locally: `npm run typecheck` passes, `npm run build` passes, `npm test` passes 3 of 3. |
| Implementation is tracked by Epic #1, "First Phaser 4 playable battle", with child issues #2–#11 (opened 2026-10-06). The epic says: "Minimal scaffold already exists; do not reopen repository initialization", "Deployment webhook automation is underway separately" and "External design plans remain outside Git". | [52] |
| PR #12, "tested main releases via restricted SSH", is open, unmerged, with a green check. It defines the release mechanism and its hard limits (§5.1). | [53] |
| A beta host exists behind Cloudflare Access: `https://tg-beta.absoluteparallax.com/` answers `302` to an Access login. PR #12 states that the scaffold release `df693f0` is what is served there; that statement was not independently verified. | HTTP request on 2026-10-06; [53] |
| Legacy `main` is unchanged at `e9433f6`; #624 is still the only open legacy PR. | `git ls-remote` and GitHub, 2026-10-06; [50] |

Earlier wording that the new repository must not be initialized or scaffolded is therefore superseded. At that checkpoint, plans were to stay out of `main` and out of implementation PRs; no completion or `Closes` claim before acceptance; no production cutover without explicit approval.

## 1. Executive recommendation

Restart the runtime deliberately, while retaining the Godot repository and history as a reference. Keep its strongest ideas: readable grid tactics, three recognizable heroes, deterministic debugging, data-driven content and testable rule boundaries. Do **not** copy GDScript into a transliteration exercise. Its services are conceptually portable but still use Godot Resources, vectors, RNG, autoload lookup and serialization.[3][4][5]

Recommend a **combat-first vertical slice**: one authored forest map, Fighter/Ranger/Mage, melee and ranged goblins, terrain/height, one move plus one action, Basic Attack plus one signature ability each (Guarded Strike, High Shot, Magic Missile), greedy AI, preview/confirm/cancel, outcome/restart and a compact combat log. The short three-encounter run has since been implemented through #75–#80; full-run certification remains #81. This returns to the original document's useful single-battle intent without assuming Brian still wants all FFT-like rules.[1]

"Melee and ranged goblins" means the original trio: two Goblin Grunts and one Goblin Archer. Current main no longer spawns that trio on Forest Ruins; it draws a seeded three-unit forest roster that always includes a Goblin Shaman (§3.3). Choosing the trio is a deliberate simplification, not a conversion of the current encounter.[3][59]

Phaser 4 is now an actual released target, not the historical experimental/beta line: official 4.0.0 notes date the major release to April 10, 2026; current npm `latest` and official release agree on **4.2.1**, released July 9, 2026 (re-checked 2026-10-06: `latest` is still 4.2.1).[37][38][40]

Its normal scene/sprite/graphics/input/camera APIs fit a small 2D tactics game. Its new renderer is still a material engineering risk: 4.2.1 fixes ESM, resize, stencil and delayed-tween bugs. Pin it, use standard APIs, and require a mobile proof-of-fit before committing to the full restart.[38][39][72]

The engine also has a fixed download cost. The scaffold's production build is a single 1,375,836-byte JavaScript file, about 0.35 MB once gzip-compressed, and nearly all of it is Phaser; Phaser's own README gives 345 KB gzip for the full minified build.[51][71] That is the floor before any game code or asset.

**The engine change alone will not make the project lighter. Scope reduction and fewer tools will.** So will leaving the legacy asset weight behind: the deployed build's load problem has causes that can be read directly from the legacy source (§3.5), and the slice's assets copied unchanged would nearly fill the new release pipeline's size cap (§5.1). No ECS, physics, backend, multiplayer, procedural suite, map editor, React UI framework or custom renderer is needed for the first slice. Keep one npm project and a static build.

## 2. Approved requirements and remaining implementation decisions

**Brian approved during discovery:** “A lean playable loop first; selectively bring back proven features later.” First release targets **mobile and desktop browsers, with touch and mouse support**. Full Godot parity is explicitly not the goal. These requirements supersede the earlier uncertainty about browser support and parity.

**Brian's coordinator-question responses (recorded verbatim in substance):**

1. **Minimum fun loop: A — one replayable tactical battle.** A route or walkable overworld is deferred, not initial acceptance.
2. **Reason for restarting: deployed load time/mobile issues.** The restart is not a request to simplify away the basic tactical rules. Loading, first interaction, responsive input and rendering on physical phones are primary proof-of-fit concerns.
3. **Retain isometric presentation and basic rules.** Preserve the proposed baseline height/movement/d20 tactics; advanced Godot-era effects remain deferred.
4. **Acceptance platforms: iPhone Safari, iPhone Chrome, Android Chrome, and desktop; both portrait and landscape.** Telegram/in-app webviews are not part of the required matrix unless separately requested. Exact device models, OS/browser versions and desktop browser coverage still need specifying.
5. **Fresh new runtime.** No legacy run/save/record/custom-map importer is required. Preserve old Godot data without reading or overwriting it in the Phaser runtime.
6. **New repository:** `luminari-gurus/tactics-guru-v2`, already selected and since initialized with a minimal scaffold; the tracker says not to reopen initialization.[51][52] Both plans subsequently merged through PR #13; their maintenance is #82.

The following details clarify approved scope or remain implementation proposals:

- Browser delivery is approved; keyboard support is recommended, and native packaging is not promised.
- Preserve isometric presentation and modest integer height; top-down conversion is not the selected direction.
- Three fixed heroes, not party recruitment or ten playable classes. Portrait files for other classes are not proof of playable class systems; current party creation explicitly constructs Fighter/Ranger/Mage.[3][8]
- Retain the basic rules and d20 previews expressed by the baseline resolver/tests, pinned in §3.4. The stated concern is loading/mobile delivery, not randomness; do not switch to fixed damage as an implicit engine-migration choice.[5][25]
- One replayable battle before exploration; do not add an overworld or route to first-slice acceptance.
- Fresh runtime with no legacy save/custom-map compatibility requirement; preserve old storage keys and offer a fresh Phaser start.
- A brief slice is a validation target, not an approved 20/30/45-minute run-length choice.

### Coordinator decisions — resolved and remaining

1. **Loop — resolved:** A, one replayable tactical battle.
2. **Restart motivation — resolved:** deployed load time/mobile issues. Preserve basic gameplay while improving delivery/usability; do not claim gains before measurement.
3. **Presentation/rules — resolved:** retain isometric presentation and basic tactical rules.
4. **Platforms/orientations — resolved:** iPhone Safari, iPhone Chrome, Android Chrome, desktop; portrait and landscape. Remaining QA details: representative physical devices, OS/browser versions, desktop browsers and realistic network conditions.
5. **Legacy compatibility — resolved:** fresh new runtime; no legacy importer in scope.
6. **Repository choice — resolved by Brian:** use https://github.com/luminari-gurus/tactics-guru-v2 for the new Phaser project. Preserve the original Godot repository/history as reference. The repository now holds the playable implementation, tracker, these plans and task-specific OpenSpec changes; no repository initialization or plan migration is pending.
7. **Restart seed (D7) — resolved by dubstylee, 2026-10-09:** a restart starts a new battle with a new seed that the session supplies. Legacy's same-seed restart is not kept. #7 provides `createBattle(mapId, seed, catalog)`; the restart control and the seed source are #10.

8. **Guarded Strike (D5/D6, its part of D11) — revised by Brian, 2026-10-09, #49:** fixed −2 attack / +2 dodge AC, inspired by the Fighter bonus feat [Combat Expertise](https://www.d20srd.org/srd/feats.htm#combatExpertise). This supersedes the earlier Fighting Defensively −4/+2 decision implemented in #8. Keep the name, range 1, base damage 2, Guarded after a resolved hit or miss, next-turn expiry, and non-stacking repeated effects. Apply the penalty once to the activating attack and further attacks while Guarded; unguarded Basic Attack keeps normal accuracy. The SRD's Intelligence prerequisite, variable exchange and base attack bonus limit are not modeled; existing timing is a game adaptation. See `docs/signature-abilities.md` for scope.

9. **Mage signature — resolved by Brian, 2026-10-09:** replace Ember Burst with 3.5E [Magic Missile](https://www.d20srd.org/srd/spells/magicMissile.htm). Each missile hits automatically and deals a rolled 1d4+1 force damage, with no attack roll or saving throw. Missile count follows caster level (1/2/3/4/5 at levels 1/3/5/7/9). The starting Mage uses caster level 1. Brian subsequently requested Ranger-like range: Manhattan range 1–5 tiles, with multiple targets within 3 tiles of each other. See `docs/signature-abilities.md` for targeting, RNG and scope; all three signatures are implemented through the pure command dispatcher.

Core product/repository choices are resolved, and implementation is tracked by Epic #1 and its child issues. This plan is design input to those issues. The register below distinguishes remaining decisions from resolved ones.

| # | Decision / current disposition | Evidence / remaining gate |
| --- | --- | --- |
| D1 | Required browser/orientation matrix retained; minimum versions and complete physical device details still open. | #64/#66; reported iPhone success is not the full matrix. |
| D2 | Numeric loading/frame budgets established for measured acceptance. | #65: L1 cold ≤2500 ms, L2 warm: no hard time gate; any load >1000 ms warns, repeated slow loads prompt review, isolated spikes are history, L3 compressed code ≤400000 bytes, L4 assets ≤1500000 bytes; F1 idle p50 ≤16.7/p95 ≤20 ms, F2 pan/zoom/move p95 ≤33.4 ms. #64 still verifies hardware. |
| D4 | Implemented Fighter/Ranger/Mage and two Goblin Grunts plus one Goblin Archer on Forest Ruins; no Shaman roster adopted. | #29/#3 and `src/content/forestRuins.ts`, `src/content/catalog.ts`. |
| D5 | Resolved: Guarded on resolved hit/miss; Magic Missile replaced Ember Burst. | #8, [signature contract](signature-abilities.md). |
| D6 | Resolved: Guarded Strike −2 attack / +2 AC; Basic Attack retains normal accuracy. | #49 / PR #50; no legacy −4 penalty. |
| D7 | Resolved by dubstylee 2026-10-09: restart uses a new seed. | #10; BattleScene starts at seed 1 and increments per scene creation. No same-seed restart promise. |
| D8 | Visible-face geometric picking, transformed selection and keyboard cell targeting implemented. | #6/#10, `src/geometry/picking.ts`, `src/phaser/BattleScene.ts`; the broader historical hidden-cell selection proposal is not established by this source review; no new acceptance or retirement decision is made here. Physical coverage stays in #64. |
| D9 | Production host/domain/release path and cutover still require owner choice and authorization. | #83/#84/#85; Pages evidence does not select SSH PR #12 or approve its installation. |
| D10 | Analytics optional/default off; no collection selected by this task. | Separate owner decision after readiness. |
| D11 | Approved signatures retained: Guarded Strike −2/+2; Magic Missile 1d4+1 per missile, starting caster level 1, range 1–5 and 3-tile target spread. | #8/#49, signature contract; any later balance change requires its own scope. |

D3 was absent from the historical register; numbering is retained without inventing a decision. D7 is now shown explicitly rather than only in the prose.

### Engineering question register (T1–T11)

The companion draft §12 uses the same dispositions. Merged implementation is evidence of the chosen path, not proof of physical acceptance.

| # | Historical design question | Current disposition / evidence |
| --- | --- | --- |
| T1 | Depth model and occluders | Implemented interleaved column/surface/occupant layers and fading nearby canopies (#6, BoardRenderer); physical readability remains #64. |
| T2 | Canvas resolution/DPR | Implemented `Phaser.AUTO` + CSS-pixel `RESIZE`, fitted board scale ≤1.5 and zoom 1–4× fit; no bounded-DPR or explicit-WebGL implementation claimed (`start.ts`, `iso.ts`, `BoardInput.ts`). |
| T3 | Generator | sfc32 with explicit four-word/cursor state and deterministic die rejection sampling implemented (#4, `src/domain/rng.ts`). |
| T4 | Unit sprites as pick targets | Current picker uses visible tile faces; sprites/canopies pass input through (#6). Sprite-body targets remain unadopted. |
| T5 | Desktop commit model | Move/attack use review/confirm/cancel; Wait commits directly (#10, HUD/session). |
| T6 | Turn ending / unused-action prompt | Explicit Wait / End turn; no automatic turn ending after move+action, no unused-action prompt (#7/#10). |
| T7 | Keyboard-only play | DOM focus and canvas arrow cell cursor, Enter/Space selection, Escape cancel implemented (#10); physical/accessibility acceptance is not inferred from code. |
| T8 | AI damage measure | Pure attack preview, integer damage scoring and stable explicit ties implemented (#9, `src/domain/ai.ts`); previews consume no RNG. |
| T9 | Sound voices and release cues | #62 selected eight generated cues with one active voice and up to four queued per batch, explicit opt-in/mute/retry. The old two-voice/release-impact scheme was not adopted. |
| T10 | Battle begins | Current scene automatically runs initial enemies to player readiness; no separate Begin button (#10). Sound unlock uses Enable sound (#62). |
| T11 | Cue container | Eight small MP3 cues implemented (#62); no mono-WAV cue or music requirement adopted. |

## 3. Historical legacy-main audit: the TDD is not the implementation inventory

The actual `docs/tech_design.md` mixes M0 future work, M10/M11 notes and later additions. It calls `ContentDatabase` a stub and save/load/procedural overworld deferred, but current code has resource registries and semantic validation, generated exploration maps and active-run/battle persistence.[1][2][9]

Its final “next step: M1 movement” is obsolete: movement, combat, AI and extensive tests already exist.[4][5][7]

Mechanical snapshot inventory: **236 `.gd` files**, **154 `test_*.gd` files** under `scripts/tests/`, **61 `.tres` files** under `content/`. These are file counts, not passed-test counts or coverage percentages. Key bodies/assertions were inspected; the suite was deliberately **not run**. The stability test repeatedly forces enemy/player defeat and restart; it is not proof of ten fully played battles.[36]

Every count and line range in this section was re-checked on 2026-10-06 against `ORIGINAL/` at the pinned SHA; the corrections that resulted are listed in *Revision notes*. To reproduce the counts from `ORIGINAL/`: `git ls-files '*.gd' | wc -l`, `git ls-files 'scripts/tests/test_*.gd' | wc -l`, `git ls-files 'content/**/*.tres' | wc -l`, `ls openspec/specs`, `ls openspec/changes` (66 change directories plus `archive`).

Classification: **implemented** means source bodies and representative tests exist, not that this audit verified runtime correctness. **Partial** means a narrower behavior exists than the label suggests. **Proposed** means a contract/doc/change is not proof of a shipping feature.

### 3.1 Feature inventory and disposition

| Area | Observed source and test/spec evidence | Classification | Restart decision and reason |
|---|---|---|---|
| Combat movement/height | `scripts/combat/GridService.gd:25-95` validates occupancy, Jump and uphill terrain cost; `scripts/tests/test_grid_service.gd` asserts these and immobilization. | Implemented | **Keep** cardinal movement, weighted reachability and modest height; reimplement in TS. No physics/pathfinding plugin. [4] |
| Targeting and d20 resolution | `scripts/combat/TargetingService.gd`; `CombatResolver.gd:1197-1322` preflights, rolls, applies damage and logs; `test_combat_resolver.gd` uses injected rolls for hit/miss, natural 1/20 and defeat. Ember Burst resolves through a separate Dex-save path (`CombatResolver.gd:918-1048`), not the attack roll. | Implemented | **Keep** previews, legal-target checks, minimum hit damage and deterministic outcomes; **simplify** breadth to creature-targeted attacks and missiles and explicit LOS blockers. The target slice uses ordinary attacks plus automatic-hit Magic Missile damage rolls (§2); the legacy Dex-save path is not required. [5][25] |
| Turn order | `scripts/combat/TurnManager.gd` rolls initiative and skips defeated units; `test_turn_manager.gd`; `test_issue_606_tempo_modifiers.gd` checks round-boundary reorder without RNG. | Implemented, more than static initiative | **Keep** stable baseline initiative; **defer** tempo reorder. Do not mistakenly document current main as purely static. [6][34] |
| Classes/party progression | `ForestRuinsMvpBuilder.gd:1190-1215` creates three heroes; `UnitProgressionService.gd:4-48` caps at level 5 and gates class abilities; `test_m15_unit_progression_service.gd`, `test_m15_ability_level_gating.gd`. | Implemented fixed party + progression | **Keep** three roles/canonical portraits; **simplify** to fixed stats and one signature each; **defer** XP, unlock tree, secondary abilities and recruitment. [3][12] |
| Abilities/status effects | `CombatResolver.gd`, `AbilityAvailabilityService.gd`, `StatusModifierService.gd`, `StatusApplicationService.gd`; issue tests 591/594/598/606 assert stacking, immunity, cooldown and tempo. | Implemented | **Keep** Guarded/high-ground/AoE class contrast; **defer** generic stacking, typed resistances, immunities, cooldown tempo, auras, charges, forced movement, summons/commands. Preserve atomic-rejection/pure-preview tests as future cases. [5][33][34] |
| Enemy AI/content | `AIController.gd:35-80,622-669` generates legal candidates, supports typed special effects and deterministic tie ordering; `test_m6_ai_controller.gd` checks melee, ranged high ground, Wait and taunt. | Implemented greedy AI | **Keep/simplify** melee/ranged profiles and deterministic tie-breaks; **defer** extended tactical effects and broad biome rosters. [7] |
| Battle maps/content loading | `ContentDatabase.gd:18-59,205-225` loads/validates registries; builder selects resource-backed Forest Ruins and falls back for others; tests 530/531/532. The Forest Ruins resource holds tiles only (144 cells: cell, height, terrain); spawns, hero classes, two of the three signatures and the Goblin Archer are defined in code (§3.3). | Implemented mixed resource/fallback pipeline | **Keep** selected map geometry/data and validation invariants; **drop** resource-loader emulation and giant fallback builder; convert one map to canonical JSON. [2][3][58] |
| Procedural overworld/exploration | `OverworldMapGenerator.gd:85-149` dispatches random-walker/cellular/digger/rogue/sector-graph/arena, validates reachability and falls back; `RunState.create_prototype()` calls it; `test_m12_overworld_map_generator.gd` asserts deterministic maps, POIs, borders, mixed surfaces/sparse roads. | Implemented | **Defer** full generator/floors/scouting; optional **simplify** to authored tiny map or route after Brian selects loop. Keep reachability/determinism tests. [8][9][28] |
| POIs/economy/rewards | `RunState.gd` has treasure vault, hazards/disarm, currency, rewards and run upgrades; `RewardCatalog.gd` seeded weighted item rewards; tests 394/395 and item reward profiles. | Implemented narrower prototype economy | **Defer** shops/economy breadth; **simplify** next slice to one post-battle choice and HP carryover. POI names/assets do not prove a finished shop system. [8][11] |
| Inventory/equipment/items | `ItemCatalog.gd` supplies kinds/categories/slots/effects; `RunState.gd:1122-1168` validates compatibility and replaces slot; `OverworldScene.gd:2818+` builds Use Items/Equipment tabs; `test_run_equipment_effects.gd` asserts battle-local effects and no base-state mutation; item-use tests assert revive consumes only on success. | Implemented catalog + UI | **Keep** extensible catalog/contracts; **defer** equipment UI for combat MVP. If included next, use a few entries through generic typed effects, not hard-coded one-off items. Existing equip method checks category but not owned inventory—do not assume ownership enforcement. [10][18][26] |
| Save/resume/migration | `ActiveRunStorage.gd`, `ActiveBattleStorage.gd`, `BattleState.gd`/`UnitState.gd` versions and validation; `Main.gd` resumes; `test_active_battle_storage.gd` round-trips and rejects corruption/version 0. | Implemented Godot/browser storage | **Keep** versioned-save safety and malformed/future rejection cases; **replace** bridge with safe localStorage adapter. **Defer** Godot save importer and arbitrary mid-animation resume. Saves/resume are a listed follow-up to the first tranche, not part of Epic #1 acceptance. [13][14][27][52] |
| Renown/meta/local records | `MetaProgressionState.gd` manages unlocks and in-memory renown; base meta spec explicitly defers durable Renown; local leaderboard record/storage exist. | Partial meta progression, implemented local records | **Defer** meta and leaderboards; do not describe in-memory Renown as proven persistent across app restart. [15][16][31] |
| Global backend | `LeaderboardRunRecord.gd` exports a versioned future payload; `test_m22_leaderboard_global_sync_contract.gd` asserts `deferred_no_backend` and “No upload endpoint exists yet.” | Proposed contract, not global sync | **Drop from MVP**; no accounts, server or leaderboard service. [15][29] |
| UI/mobile/input | `BattleView.gd`, `MobileWebLayout.gd`, overworld modal input handlers; `test_m11_mobile_viewports.gd` checks dock, controls and first-touch promotion; camera/touch tests exist. | Implemented Godot responsive/touch UI | **Keep** behavior cases and readable preview/confirm/cancel; **replace** layout with responsive DOM and Phaser board input. **Defer** rotation, advanced threat overlay, compound planning and log export unless requested. Grid rotation was one of the legacy view's two aids for cells covered by raised terrain; deferring it leaves the selection question in §4.2. [17][19][35] |
| Art/occlusion | PNG art, portrait catalog, tile mapping; `BattleView.gd:2873-2969` redraws nearby elevated canopy faces with alpha; asset records distinguish generated and legacy. Portraits are 1254×1254 PNGs of 1.3 to 3.7 MB each (the slice's five are about 3.3 MB each); 145 of the 159 unit sprites, including the slice's five, are single-frame 64×80 PNGs; tiles are 256×352 PNGs drawn at 78×107. | Implemented visual logic + source assets | **Keep** selected original art with the optimization in §5.1; **keep** occlusion intent in proof-of-fit if iso retained, not Godot clipping code. Illustrated busts and canonical hero art should be reviewed, not regenerated automatically. [17][24] |
| Audio | `AudioFeedback.gd`, `BgmVariantCatalog.gd`, view music handling; tests m7/m16/m21 cover SFX, variants/toggles/visibility. All music is Ogg Vorbis; SFX are 16-bit WAV (14 stereo 44.1 kHz, 7 mono 22.05 kHz, as measured). | Implemented asset/audio adapter | **Keep** a small SFX set, mute and optional one music track, transcoded for iPhone (§5.1); **defer** variant catalog. Browser audio unlock/background handling needs real-device validation. [17][18][49][66][67] |
| Editor/custom maps | `scripts/combat/BattleMapAuthoringService.gd`, `scripts/developer/CustomMapPackageService.gd`, editor/practice launch; tests 540-543/552/554 inspect edits, stable validation, import/export, return. | Implemented separate tool | **Defer** editor/portable packages; keep validated JSON-authoring concepts. No editor UI required to ship one map. [32] |
| Analytics | `AnalyticsService.gd` event allowlists and sink failure handling; `web/posthog-bootstrap.js` gates enabled configuration, DNT and replay off; GDScript and JS analytics tests exist. `openspec/changes/issue-612-posthog-analytics/tasks.md` leaves owner/privacy/live verification/production enablement and successful-run completion observer gates unchecked. | Implemented integration; production gates outstanding | **Optional/defer**; ship disabled by default if retained. Keep narrow privacy allowlists, no raw saves/logs/seeds; no analytics dependency in domain core. [20][21] |
| Deployment | `Dockerfile` Godot export → nginx; `nginx.conf` no-store boot/JS/WASM/PCK. The TDD claims `.github/workflows/deploy.yml`, but the tree has no `.github` path; the TDD is the stale document. `README.md` (Deployment Notes) records the actual mechanism: Coolify's GitHub App watches `main`, and "there is no separate `coolify` branch or webhook workflow in this repository". | Build/serve implemented; pipeline documented in README, not live-verified | **Replace** export with Vite static build. The new repository's release mechanism is being built separately (PR #12, §5.1); whether production reuses any legacy hosting is undecided (D9). Do not invent or promise Coolify automation for the new build. [1][22][23][53][54] |

### 3.2 Open PRs and requirements are not feature acceptance

At inspection, GitHub returned one open PR, **#624**, head `23edf0da64795afd332c59f64d31a7ecdfc339d9`, “Fix Shattered Citadel sprite corrections.” Its diff changes five unit PNGs (`arcane_bailiff`, `crossbow_levy`, `crownless_champion`, `net_caster`, `siege_engineer`), not combat rules; these proposed corrections are **not main assets**.[50] Unchanged on 2026-10-06.

There are four canonical capability specs and 66 unarchived change proposal directories in the snapshot. Directory status/checklists are not reliable proof of “unimplemented”: many have runtime code/tests already. `openspec/project.md` expects changes to be archived into base specs after merge; reconciliation is needed before reusing old requirements.[30] Exact affected base paths: `openspec/specs/combat-core/spec.md`, `openspec/specs/overworld-run/spec.md`, `openspec/specs/mobile-web-ux/spec.md`, `openspec/specs/meta-progression/spec.md`. The full change/delta/task path list was saved in `phaser4-discovery/evidence.md`, which is not stored with this copy; `ls ORIGINAL/openspec/changes` regenerates it.

### 3.3 Slice content: where each definition actually lives

Only part of the slice is resource-backed. A converter that reads `.tres` files alone would miss the heroes, the spawns, two of the three signatures and the archer.

| Slice item | Location at `e9433f6` | Form |
|---|---|---|
| Forest Ruins tiles: 12×12, 144 cells with cell, height and terrain | `content/maps/forest_ruins_mvp.tres` [58] | Resource |
| Terrain costs and flags (8 IDs used by the map) | `content/terrain/*.tres`; defaults in `scripts/content_defs/TerrainDefinition.gd` | Resource |
| Hero spawns (1,8), (2,8), (1,9) | `ForestRuinsMvpBuilder.gd:1213-1215` [3] | Code |
| Enemy spawns (8,4), (9,2), (8,5) | `ForestRuinsMvpBuilder.gd:2646-2647`, the default arm [3] | Code |
| Fighter/Ranger/Mage stats and ability lists | `ForestRuinsMvpBuilder.gd:1190-1211` [3] | Code |
| Basic Attack, Ember Burst | `content/abilities/basic_attack.tres`, `ember_burst.tres`; duplicated as fallbacks in `CombatResolver.gd:33-71` | Resource |
| Guarded Strike, High Shot, Shortbow Shot, the Guarded status | `CombatResolver.gd:41-50,148-154` [5] | Code |
| Goblin Grunt class, unit and AI profile | `content/classes/`, `content/units/`, `content/ai_profiles/goblin_grunt.tres` | Resource |
| Goblin Archer class and unit | `ForestRuinsMvpBuilder.gd:1527-1538` [3] | Code |
| Goblin Archer AI profile | `content/ai_profiles/goblin_archer.tres` | Resource |
| Current Forest Ruins enemy composition: seeded common pick, forced `goblin_shaman`, seeded elite pick | `ForestEncounterCompositionSelector.gd:255-305`, reached from `ForestRuinsMvpBuilder.gd:1231-1246` [59] | Code |
| Legacy trio: grunt, archer, grunt | `ForestRuinsMvpBuilder.gd:1346-1348`, a fall-through that Forest Ruins no longer reaches [3] | Code |
| Tile footprint and elevation step: 64×32 and 16 | `scripts/autoload/GameConfig.gd:6-8` [60] | Code |
| Tile draw size and anchor: 78×107 at offset (39,45) | `BattleView.gd:74-76` [17] | Code |
| Per-unit sprite anchor and scale tables | `scripts/view/UnitView.gd` [62] | Code |

Checks for the map conversion: 144 cells covering x and y from 0 to 11; terrain counts grass 101, stone 18, grass_path 8, tree_dense 5, cliff 4, water 4, tree_single 2, tree_cluster 2; heights 0 on 120 cells, 1 on 15, 2 on 9; no tile hazards. The `.tres` format omits default values: the (0,0) tile has no `cell` line, height-0 tiles have no `height` line, and the 12×12 size itself is the default from `scripts/content_defs/MapDefinition.gd:6`, so a naive parser misplaces or drops them.[58]

### 3.4 Baseline rules snapshot (pinned at `e9433f6`)

The tracker asks for rules "derived from legacy rule evidence". These are historical behaviours; the Guarded Strike and Magic Missile decisions in §2 supersede the relevant target rules. Ember Burst below records the original game, not a planned v2 ability. Line numbers refer to the pinned SHA.

| Rule | Baseline behaviour | Source |
|---|---|---|
| Movement graph | Four cardinal neighbours. A step needs a walkable destination that no other unit occupies (allies block too) and an uphill difference no greater than Jump; downhill is unrestricted. | `GridService.gd:6-11,25-42` [4] |
| Movement cost | Destination terrain cost plus the uphill difference; budget is Move. Lowest-cost search; the frontier is ordered by cost, then y, then x. Among equal-cost routes the path kept is the first found, which depends on neighbour order (+x, −x, +y, −y) and a strict less-than update. | `GridService.gd:6-11,45-59,62-95,147-163` [4] |
| Terrain | Grass, path and stone cost 1; water costs 3; cliff and the three tree terrains are unwalkable and block line of sight. | `content/terrain/*.tres` |
| Range and line of sight | Manhattan distance within the ability's minimum and maximum. Line of sight samples the cells between attacker and target along an interpolated line with per-axis rounding; only terrain flagged as blocking stops it. Units and height never block. | `TargetingService.gd:44-49,79-107` [57]; `TileState.gd:26-27` [69] |
| Area shape | Manhattan diamond of the given radius, cells ordered by y then x. | `TargetingService.gd:110-125` [57] |
| Initiative | Rolled once at battle start, in unit-ID order: d20 plus Dex. Order by total, then Dex, then player side, then lower ID. Defeated units are skipped; the round counter advances when the order wraps. | `TurnManager.gd:8-27,101-108,119-137` [6] |
| Turn lifecycle | At most one move and one action per turn, in either order. A player's turn ends only on Wait/end turn; acting does not end it. An enemy's turn ends after the AI's single command. | `BattleController.gd:231-267,326,716,1416-1445` [56] |
| Attack roll | d20 plus accuracy, ability modifier, height modifier and status modifiers against AC plus status AC; a total that equals the AC hits. Natural 1 always misses; natural 20 always hits and is critical. | `CombatResolver.gd:1089-1111,1236-1246` [5] |
| Height modifier | Plus 2 to hit when the attacker's tile is higher, minus 2 when lower; not scaled by the difference. | `CombatResolver.gd:1051-1060,1174-1185` [5] |
| Damage | At least 1: ability base plus attacker Power plus modifiers; a critical doubles the result. A unit at 0 HP is defeated and its tile is vacated at once. | `CombatResolver.gd:1188-1194,1250-1253` [5] |
| Basic Attack | Range 1, base damage 2, for every hero. Ranger and Mage have no ranged option except their signature. | `content/abilities/basic_attack.tres` |
| Guarded Strike | Range 1, base damage 2, then the Fighter gains Guarded: plus 2 AC until the start of the Fighter's next turn. Granted whenever the strike resolves, including on a miss; no cooldown. The legacy test covers only the hit case. | `CombatResolver.gd:41-42,148-154,260-278` [5]; `StatusEffectDefinition.gd:13-14` [64]; `test_m5_class_abilities.gd:37-58` [65] |
| High Shot | Range 2 to 5, base damage 2, plus 2 damage when the Ranger is higher than the target, on top of the plus 2 to hit. | `CombatResolver.gd:45-46,285-297` [5] |
| Ember Burst | Centre cell at range 2 to 4 with line of sight; radius 1. Each enemy in the area rolls d20 plus Dex against 10 plus the Mage's Power; a total that equals the target number saves. A success takes no damage, a failure takes a flat 3. Allies are never affected by the resolver, although the legacy UI asks "Ember Burst will hit an ally. Cast anyway?" (`BattleView.gd:3090-3093`). One roll per target in unit-ID order; no natural 1 or 20 rule. | `content/abilities/ember_burst.tres`; `CombatResolver.gd:574-576,918-1048` [5]; `test_m5_class_abilities.gd:189-217` [65] |
| Shortbow Shot (archer) | Range 2 to 4, base damage 2, ordinary attack roll. | `CombatResolver.gd:49-50,634-640` [5] |
| Outcome | Checked after each action: no living player unit is a loss, otherwise no living enemy is a win. | `BattleController.gd:1910-1930` [56] |
| Seed | A new seed is chosen when a new game starts; restarting a battle reuses it. | `Main.gd:165` [68]; `BattleController.gd:124,1336-1346` [56] |
| Random numbers | Godot's generator behind `roll_d20()`, with a 64-bit continuation state saved after each action. | `BattleRng.gd` [63]; `BattleController.gd:852-854` [56] |
| AI choice | Candidates scored with floating-point weights; ties broken by action kind, target ID, move cell (y, x), centre cell, then ability ID. Wait is the fallback. | `AIController.gd:35-44,609-641` [7] |

| Unit | HP | Move | Jump | Accuracy | AC | Power | Dex | Will | Slice abilities |
|---|---|---|---|---|---|---|---|---|---|
| Fighter | 18 | 4 | 1 | 4 | 14 | 3 | 0 | 1 | Basic Attack, Guarded Strike |
| Ranger | 12 | 4 | 1 | 5 | 12 | 2 | 2 | 0 | Basic Attack, High Shot |
| Mage | 11 | 4 | 1 | 3 | 11 | 4 | 1 | 2 | Basic Attack, Ember Burst |
| Goblin Grunt | 9 | 4 | 1 | 4 | 12 | 2 | 1 | 0 | Basic Attack |
| Goblin Archer | 8 | 4 | 1 | 4 | 11 | 2 | 2 | 0 | Shortbow Shot |

Three consequences worth knowing before porting:

- Part of the rule lifecycle is not in the pure services. Action economy, end of turn, outcome evaluation, enemy-turn sequencing and RNG continuation sit in `BattleController.gd` (2,393 lines), a scene node that awaits animations. The legacy code even defers the win/loss check while an animation is running (`:1904-1907`), which is the coupling this plan forbids. Extract the lifecycle rules; do not port the sequencing.[56]
- Every unit has Jump 1, and the height-2 ruin block at (4..6, 3..5) has no height-1 neighbour, so nothing in the slice can stand on it. On this map height matters through the two height-1 areas: the stone platform at (8..10, 1..3), where the archer spawns, and the ledge at (2..3, 8..10), where the Ranger spawns.[58]
- Current main adds adjacency accuracy modifiers, typed damage and status immunities to the attack path. The slice drops them; expected numbers in legacy tests that exercise them do not transfer.

### 3.5 Why the deployed build loads slowly: source-verifiable causes

The restart motivation is deployed load time. These contributors are visible in the legacy source without running anything:

- **Everything is exported.** `export_presets.cfg` sets `export_filter="all_resources"`, and the README requires it because assets are loaded by `res://` path at run time.[54][55]
- **The asset tree is large.** 517 tracked PNGs total 430.6 MB (410.7 MiB), of which `art/portraits/` is 160 files and 406.2 MB (387.4 MiB); 158 of those are 1254×1254, between 1.3 and 3.7 MB each with a mean of about 2.6 MB. Music is 19 Ogg files totalling 25.1 MB; SFX are 21 WAV files totalling 2.9 MB.
- **Nothing heavy is cacheable.** `nginx.conf` sends `Cache-Control: no-store` for `.wasm`, `.pck`, `.js` and `index.html`, so every visit downloads the engine and the pack again.[23]
- No service worker is registered (`progressive_web_app/enabled=false`) and threads are off.[55]

Not measured: the actual exported `.pck` and `.wasm` transfer sizes. Godot re-encodes imported textures, so the pack is not simply the sum of the PNGs; the live build or an export must be measured (§4.2).

What follows from this:

- The old-versus-new comparison must record the old build's transfer sizes and note that its warm load equals its cold load by configuration; a warm-cache comparison is not like-for-like.
- The new runtime must not rebuild the same causes: ship only the slice's assets, downscaled; cache content-hashed files; keep optional assets off the critical path (§5.1).
- Two of the contributors are deployment configuration rather than engine: the cache headers could revalidate instead of forbidding storage, and portrait resolution could be reduced. That does not reopen the restart decision. It is recorded so the comparison is honest, and because it is the cheapest mitigation for the live build while the restart proceeds.

## 4. Verified Phaser 4 suitability and tooling

- npm metadata: `phaser@4.2.1`, MIT, bundled `types/phaser.d.ts`, ESM `dist/phaser.esm.js`, exports for import/require; application need not install Phaser's own renderer-development dependencies.[37]
- Official Vite/TypeScript template actually depends on **4.0.0**, despite stale “Phaser 3” description. Its `new Game(config)` with `Phaser.Types.Core.GameConfig` and scene array is usable inspiration; explicitly update/pin 4.2.1, and omit its `log.js` scaffolding telemetry scripts. Do not trust a template title to select the engine.[41][42]
- `Phaser.Scene` exposes `init/preload/create`, display list, camera/input/loader/sound references. Standard scene organization remains available in tagged 4.2.1 source.[43]
- `Graphics.fillPoints(points, closeShape, closePath, endIndex)` and `setDepth(value)` support simple diamond rendering and ordered objects. These do **not** supply tactical height, canopy occlusion or picking automatically; our view adapter must implement those.[47][48]
- `InputPlugin.addPointer(quantity)` supports additional pointers; `BaseCamera.getWorldPoint(x,y,output)` and `setZoom(x,y)` exist. Pinch/long-press/drag arbitration is game code, not a claimed built-in tactics gesture.[45][46]
- Scale manager supports `FIT`, `RESIZE` and the hybrid `EXPAND`; its own docs warn RESIZE can create huge GPU canvases. Start with responsive parent layout plus bounded canvas/DPR, determine mode via proof-of-fit rather than blindly scale a desktop UI to a phone.[44]
- WebAudio sound manager has `unlock()` and focus/visibility lifecycle. Asset decoding/autoplay/in-app-browser limitations remain acceptance risks; presence of API is not proof all intended devices work.[49]
- 4.x replaces 3.x pipelines with render nodes, FX/masks with filters; old `BitmapMask`, `setTintFill`, `Geom.Point` and `TextureManager.generate` are removed. RenderTexture/DynamicTexture buffered draws require `render()`. Standard PNG orientation is handled automatically. Canvas remains available but deprecated; prefer WebGL, with an explicit unsupported-device message if unavailable.[39]
- `roundPixels` now defaults to `false`, which affects how crisp small pixel-style sprites look; choose the setting on purpose.[39]
- `Phaser.AUTO` selects the deprecated Canvas renderer when WebGL is unavailable, with no warning and nothing visible to the player. Request WebGL explicitly and detect support first.[70]

**Maturity conclusion:** suitable released engine for this proposed standard-API 2D game, conditional on proof-of-fit; not a guarantee of load size, FPS, old plugins, native builds or Telegram webview compatibility. Official website/docs HTTP fetches were blocked/unavailable; tagged official GitHub JSDoc/changelogs and npm metadata provided primary verification, not Phaser 3 recollection. On 2026-10-06 the same claims were re-checked against the installed package (`node_modules/phaser`, version 4.2.1). The package also ships version-matched topic guides under `node_modules/phaser/skills/` and `node_modules/phaser/docs/` (scaling, input, loading, audio, v3-to-v4 migration, pixel art); use those and `types/phaser.d.ts` as the working API reference.[71]

### 4.1 Historical scaffold audit against the proposed contracts

Historical facts at `df693f0`, not present-day defects.[51] Main now has scoped Vitest/Playwright runners, domain type checking, validated content and load errors. It still uses `Phaser.AUTO` and CSS-pixel `RESIZE`, not the proposed explicit-WebGL/bounded-DPR policy; §2’s T register records that gap without changing runtime scope.

| Scaffold fact | Contract in this plan | Where it is resolved |
|---|---|---|
| `type: Phaser.AUTO` | WebGL with an explicit unsupported-device message; no silent downgrade | #2 |
| `scale.mode: RESIZE`, canvas sized to the window in CSS pixels, no size or DPR bound | Bounded canvas and DPR chosen by measurement | #2 |
| No loading or error UI; readiness is a `data-ready` attribute set in `create()` | Nonblocking loading and error screens | #2, #10 |
| `playwright.config.ts` has `testDir: './tests'` and Chromium projects only | Separate unit and browser suites; WebKit not covered | #4, #11 (§7.2) |
| `npm test` runs Playwright only; there is no `test:unit` or `validate:content` | Scripts in §7.2 | #3, #4 |
| One `tsconfig.json` gives every file DOM and Node types | Domain code must not use DOM or browser globals | #4 (§6) |
| No `vite.config.ts`; no assets yet | Content-hashed, flat asset output | #3 (§5.1) |

### 4.2 Original proof-of-fit protocol and remaining battle acceptance

The original protocol below was input to closed #2/#14–#20; see [dated fit evidence](qa/issue-20-fit-gate.md) for actual coverage and missing detail. Full battle hardware acceptance remains #64/#66. Build a diagnostic, not a game. Each item needs evidence on physical iPhone Safari, iPhone Chrome and Android Chrome, plus desktop, in both orientations. The diagnostic uses real slice assets.

**Rendering and picking**

- Render the real Forest Ruins geometry (heights 0 to 2) with one canonical hero sprite and portrait; pick a raised tile after zoom and pan; animate one move. Reject duplicate input or selection drift after scaling.
- Canopy: a unit behind a tree tile stays identifiable, with a selected-unit affordance.
- Hidden cells. With the legacy projection, the top face of a height-2 cell (x, y) is drawn exactly where flat cell (x−1, y−1) is drawn. The ruin block at (4..6, 3..5) therefore covers the tiles of walkable cells (3,2), (4,2), (5,2), (3,3) and (3,4). A unit standing on one of them is still drawn, because units render above the tile layer, but at the spot where a unit on the ruin cell in front would stand.[17][58][60][61] The legacy view copes in two ways. Its picker scores every candidate under the pointer and prefers an occupied or highlighted cell, falling back to the front-most tile on a tie (`BattleView.gd:3112-3169`); and the player can rotate the grid (`BattleView.gd:620-626`). Rotation is deferred, so show how the player selects, targets and inspects those five cells and units on them, including the tie where the raised cell and the hidden cell are both legal targets (D8).
- Tile size on screen. The board is about 768 logical pixels wide at 64×32 per tile, so fitting it to a 390-pixel-wide phone leaves diamonds about 32×16 CSS pixels, far below a 44-pixel target. Record the default zoom per orientation and the resulting tile size, and use a forgiving picker that snaps to the nearest legal cell. The legacy constants are a starting point as ratios of the 64-unit tile, not as pixel values, because they are in Godot viewport units that the engine scales to the screen: selection radius 38 with bonuses of 10 for an occupied cell and 8 for a highlighted one, tap-versus-drag threshold 14, zoom range 0.75 to 3.0 (`BattleView.gd:239-247`).[17]

**Lifecycle**

- Unlock one sound after a tap, using an MP3; also try an Ogg Vorbis file on each iPhone and record whether it decodes (D1). A generated test tone answers the codec question without publishing legacy audio.
- Resize portrait to landscape and back, including browser toolbars appearing and disappearing.
- Suspend and resume the tab. Force a WebGL context loss and confirm the board recovers or a visible reload prompt appears.
- Show a graceful screen when WebGL is missing or a load fails.
- Page-level gestures do not fight the board: no page pinch or double-tap zoom, pull-to-refresh, text selection or long-press callout over the board and HUD; safe-area insets respected.

**Measurement protocol**

- What to capture: transferred and decoded bytes per resource, request count, `content-encoding` and cache status of the JavaScript; time to first render, time to usable controls and time to first playable battle; frame-time median and 95th percentile over a scripted 30-second pan/zoom/move sequence; console errors; screenshots.
- "Usable controls" needs one definition: a `performance.mark` set when the board first accepts input.
- Conditions to record with every number: device model, OS and browser version, orientation, network type or throttling profile, cold (site data cleared) or warm (reload), build SHA. On iPhone also record that Low Power Mode is off, because it can cap rendering at 30 frames per second.
- The historical beta host probe found Cloudflare Access; this does not describe Pages protection or verify current host state. For an Access-protected tested target, sign in first and measure after sign-in; iPhone Safari and iPhone Chrome hold separate sessions. Do not weaken Access to make testing easier.[52][53]
- Functional checks (picking, gestures, audio unlock, resize) can start on a trusted-LAN preview of the production build. Current deployed QA uses the existing Pages previews with served commit proof; local captures are supporting evidence. Installing PR #12 is not a prerequisite to those measurements.
- Compare with the old deployed Godot build where safely accessible under matching conditions, with the caveats in §3.5; otherwise state the comparison gap.

**Outputs:** the chosen scale mode and DPR cap; numeric budgets agreed with Brian from the measurements (D2); and one of three recorded outcomes: proceed, proceed with named constraints, or stop and revise rendering or scope. Evidence goes on the issue; a short task-specific QA note may accompany the PR, but not these plans.[52] No silent downgrade to Phaser 3. Telegram/in-app browsers are optional, not a required gate. Do not invent performance gains.

## 5. Reuse strategy and coupling costs

**Direct reuse candidates:** selected portraits, unit and terrain art, and audio, after the optimization steps in §5.1; asset source docs, descriptive IDs/names and plain documentation. Do not copy `.import`, `.uid`, editor cache, `res://` strings or unused whole asset folders.[24]

**Data conversion:** the Forest Ruins tiles from `content/maps/forest_ruins_mvp.tres`, plus selected terrain, ability and AI definitions. Resolve Resource references to IDs and export primitive tile data into validated JSON. Spawns, hero stats, Guarded Strike, High Shot, the Guarded status and the Goblin Archer's class and unit are not in any resource; transcribe them from the code locations in §3.3 and check the result against §3.3 and §3.4. Most legacy map variants remain code-driven; that is a later extraction task, not direct JSON reuse.[2][3][58]

**Algorithms/invariants worth native reimplementation:** cardinal weighted search and deterministic tie order; Manhattan ranges/LOS; d20 natural-roll edges; Magic Missile d4 damage rolls; preview without RNG/mutation; invalid commands consume neither action nor inventory; status expiry; legal AI with Wait fallback; occupancy/HP consistency; reachable start/POIs/boss if exploration returns. Existing tests carry expected scenarios (§7.3); `.tscn` runners and node-path assertions do not transfer.[25][28][33]

Three porting hazards affect determinism:

- Line of sight uses floating-point interpolation and rounds halves away from zero; JavaScript's `Math.round` rounds halves up. The two agree for the non-negative coordinates used here, but only test vectors make that a fact (§6).[57]
- Legacy comparators break every tie explicitly. Port them in full; do not lean on sort stability.
- Legacy code iterates dictionaries in insertion order. JavaScript objects iterate integer-like keys in numeric order, so anything order-sensitive must be an array with an explicit comparator.

**High coupling / rewrite, not port:** `BattleView.gd` (5,950 lines) and `OverworldScene.gd` (4,109 lines) combine node/layout/input/audio/rendering behavior; `ForestRuinsMvpBuilder.gd` (3,047 lines) combines maps, spawns and fallback content; `BattleController.gd` (2,393 lines) interleaves rule lifecycle with animation waits (§3.4). Resource clone semantics, Godot RNG continuation state, vectors/StringName dictionary keys, scene signals and JavaScriptBridge all need target-native contracts.[3][13][17][56]

**Restart versus gradual migration:** a clean target runtime has fewer legacy constraints and easier tests, but temporarily lacks content breadth. Gradual dual-engine runtime creates two builds, duplicated UI/storage/content and pressure to preserve every effect; sharing Godot through a service/WebAssembly bridge contradicts the lighter/offline goal. Recommend one new TS runtime with an explicit retention matrix. Retain a frozen reference source SHA; postpone old-runtime retirement until Brian accepts the slice.

**Repository decision:** use https://github.com/luminari-gurus/tactics-guru-v2 for the new runtime. Main contains the implementation and both plans; keep the original Godot repository/history/deployment/storage untouched. Reconcile only approved Phaser scope and the live tracker; do not copy the legacy backlog. Task branches start from current `origin/main`.

### 5.1 Asset pipeline and release constraints

**Current delivery versus proposed limits.** Existing QA uses Pages, including `https://tactics-guru-v2.pages.dev` and the #65 branch preview. See [frame QA](qa/issue-65-frame-budgets.md) for exact served-commit/resource evidence; this task did not probe those URLs. Main has no tracked deployment workflow/SSH installer. PR #12 is open, unmerged and explicitly not installed: its body pins reviewed package `de518a77f6d0c389ece720530a29683db0852b25`, while its current head is `60e9581a96e5dd9314735ca659a11dd5a9992eef`. Review exact bytes and the [pinned operator runbook](https://github.com/luminari-gurus/tactics-guru-v2/blob/de518a77f6d0c389ece720530a29683db0852b25/deploy/ssh-install/README.md) before any separately approved operator action.

The limits below are the historical reviewed SSH proposal, not a certified Pages configuration. Recheck the selected package/path in #84; #85 requires #57 readiness, explicit target/build/operation authorization, preview/cache/load/old-session/rollback evidence and authentic operator gates if SSH is selected. No merge/install/upload/activation or analytics approval is implied.[53]

- One ZIP of at most 20 MiB per release; at most 64 MiB expanded, 16 MiB per file and 512 files. The uploader packages everything under `dist/`.
- Allowed file types, case-sensitive: `.html .js .css .json .png .jpg .jpeg .webp .svg .ico .woff .woff2 .mp3 .ogg .wav`. Not shippable: `.m4a`, `.aac`, `.avif`, `.wasm`, `.map`, `.txt`, `.webmanifest`, `.ttf`, `.otf`.
- Layout: files at the root of `dist/`, or exactly one level down under `assets/`. Names use letters, digits, `_`, `.` and `-`, and must be unique ignoring case. Root `manifest.json` and `_deployment.json` are reserved.
- Serving, per the proposed `deploy/nginx.conf`: `/assets/` gets `Cache-Control: public, max-age=31536000, immutable`; `/index.html` gets `no-cache`; a missing path outside `/assets/` returns `index.html` with status 200, apart from a few reserved paths that return 4xx. The server block has no compression directive.

**Historical build requirements for that proposed SSH path (not all implemented)**

Current main statically imports content definitions/metadata, but the loader fetches unhashed images from `public/battle/` and `public/proof/`; audio comes from `public/audio/battle/`. Vite hashes the JS/CSS bundle, not these copied media paths. `vite.config.ts` embeds build commit/dirty identity; it does not implement separate engine chunks, `assetsInlineLimit: 0`, `appType: mpa` or a publisher-equivalent dist check. Pages support is not evidence that this build satisfies PR #12’s flat-path rules. #84/#85 must resolve the selected path’s compatibility, cache headers and old-session behavior before activation.

1. Every game asset goes through Vite's asset graph, so it lands in `dist/assets/` flat and content-hashed. Vite copies `public/` verbatim, without hashing and with its folders; the companion draft's earlier `public/assets/portraits/…` layout would have been rejected for nesting, and flattened it would have been cached for a year under an unchanging name. The draft no longer proposes it.
2. Content JSON is imported statically, so it is bundled and hashed with the JavaScript; it is validated in CI and again at boot.
3. Anything fetched at run time lives under `/assets/`. Elsewhere a missing file comes back as the HTML shell with status 200, which the loader reports as a decode error rather than a missing file.
4. Source maps cannot be deployed. Keep them as CI artifacts if stack traces need decoding, and show the build identity in the app (§6).
5. Check `content-encoding` on the deployed JavaScript at the edge. Uncompressed it is 1.38 MB; compressed, about 0.35 MB.
6. Compressed audio must be MP3. It is the only allowlisted format that every target browser decodes; M4A is not allowlisted, and Ogg Vorbis is unsupported on iOS before 17.4 and only partially supported before 18.4.[73][74]
7. Emit Phaser as its own chunk. With a single bundle, every game-code release changes the hash of the whole 1.38 MB file and returning players download the engine again; a separate engine chunk keeps its year-long cache entry until Phaser itself is upgraded.
8. A release replaces the served directory atomically, so a session that started before a release gets a 404 for any file it requests afterwards whose content, and therefore name, changed in that release. Assets loaded late must fail soft (no sound, placeholder portrait), and a failed critical fetch should offer a reload.

**Historical legacy asset sizes (measured 2026-10-06 in `ORIGINAL/`)**

| Asset set | Files | Legacy form | Bytes |
|---|---|---|---|
| Portraits: fighter, ranger, mage, goblin_grunt, goblin_archer | 5 | 1254×1254 RGB PNG | 16,405,399 |
| Unit sprites, same five | 5 | 64×80 RGBA PNG, single frame | 41,265 |
| Terrain tiles for the map's eight terrain IDs (slope and corner variants extra) | 8 | 256×352 PNG, drawn at 78×107 | 366,900 |
| SFX the legacy build routes for the slice's actions | 12 | 16-bit WAV: 8 stereo 44.1 kHz, 4 mono 22.05 kHz | 1,585,752 |
| One combat music track | 1 | Ogg Vorbis, stereo, about 160 kbps | about 1,120,000 |

That is about 19.5 MB (18.6 MiB), 84% of it five portraits, before the JavaScript. Copied unchanged, the slice would sit just under the 20 MiB release cap and repeat the load-time problem.

**Original pipeline proposals for #3 (compare with merged asset records)**

#3/#26–#30/#35 are closed; current manifests/conversion records are [content contract](content-contract.md), [first-battle content](first-battle-content.md) and [proof exports](qa/issue-35-proof-asset-export.md). These proposals are not claims that every historical setting shipped.

- Portraits: resize to the largest size the HUD displays multiplied by the DPR cap, and encode as WebP. Show them as DOM images that load after the board, not as GPU textures.
- Unit sprites and tiles are small enough to ship individually. Decide by eye whether tiles are pre-scaled to their drawn size; pack an atlas only if request count shows up in the measurements. Unit sprites are single frames, so "animation" means tweens and effects, not sprite sheets.
- Filtering: the legacy view draws enemy sprites with nearest-neighbour filtering and hero sprites filtered (`UnitView.gd:268`); pick one rule for the new renderer.[62]
- Audio: transcode music and SFX to MP3, mono for SFX. Load SFX after the first tap, alongside audio unlock; load music last. Neither is on the critical path.
- Critical path: JavaScript, board tiles, unit sprites and system fonts. Everything else is deferred.
- One manifest row per shipped asset: key, source path at the pinned SHA, origin, dimensions, anchor. The build fails when a referenced key has no row.
- Commit the optimized outputs to the new repository; the originals stay in the private one. Record the conversion commands next to the manifest so the outputs can be regenerated. The converters are run by hand and are not build dependencies.
- CI reports total `dist/` bytes and the largest file on every build, and fails above the agreed budget; the publisher's caps are the outer limit, not the target.

**Source records.** The legacy asset docs record origins for the Kenney Sketch Town tiles, the project-generated terrain tiles, the menu art and several later enemies, and not for the hero sprites or portraits, the Goblin Grunt or Archer art, any SFX or any music.[24] Six of the map's eight tile images (the "detailed" grass, path, stone and tree tiles) were generated from a user-supplied screenshot of a tactical RPG editor used as a style reference. The BGM README and the SFX table record that files arrived as MP3 uploads and were converted; the SFX table covers 8 of the slice's 12 cues, and the other four (`hit`, `miss`, `victory`, `defeat`) have no origin record.[66][67] Record the origin of each asset when it is added.

## 6. Target engineering contracts

- Domain imports no Phaser, DOM or browser globals. Inject immutable catalog and explicit RNG state; use integer coordinates/IDs, JSON-compatible arrays/records and named shared rule/layout constants. Enforce this mechanically rather than by review: type-check `src/domain` and `src/content` with a second tsconfig whose `lib` is `ES2022` only and whose `types` list is empty, so DOM and Node globals fail compilation; run domain tests in Vitest's `node` environment with `Math.random` and `Date.now` stubbed to throw.
- `dispatch(state, command, catalog)` returns typed success/rejection plus domain events. Validate completely before RNG/action consumption; preview is pure and non-random. Controller owns input mode and animation lock; animations never advance initiative or decide victory. The lifecycle rules that the legacy build keeps in `BattleController.gd` belong in the domain; the session only sequences presentation.
- Separate `contentVersion`, `rulesVersion`, `saveVersion`, `rngAlgorithmVersion`. Define deterministic PRNG and test vectors for new TS game; do not promise identical Godot seeded rolls. Preserve state+cursor for continuation, stable iteration/tie-breaks and command logs.
- PRNG requirements: state is a small fixed set of unsigned 32-bit integers that serialize as JSON numbers, with no BigInt and no floats; bounded rolls use rejection sampling, not modulo or float scaling. The app layer supplies the seed, shows it in the log and diagnostics, and accepts an override for tests; the domain never creates entropy.
- Ordering: order-sensitive collections are arrays sorted by comparators that are total orders. Do not depend on object key order or on sort stability. AI scores are integers (for example expected damage as a numerator over 20), so ties are exact.
- Line of sight: keep the legacy sampling rule and pin it with test vectors for all eight directions, including exact half-way cases.
- Compile-time types **and runtime validation**: unique IDs; references; finite/integer bounded stats/costs/coordinates; complete map cells; terrain validity; walkable unoccupied spawns; known asset keys; bounded AoE; discriminated effect shape. Validation runs before build and load. No silent fallback to malformed content.
- Items: `ConsumableDef | EquipmentDef`, category-based compatible `SlotDef`, generic whitelisted stat/ability effects, stack policies, inventory ownership and atomic consumption. UI derives rows from the catalog. Add one test item to prove extensibility without new branches.
- Saves (implemented after the first tranche by #69/#72/#73; see [storage contract](battle-storage.md)): namespaced primary/backup keys (`tactics-guru:phaser:battle:primary:v1` and `tactics-guru:phaser:battle:backup:v1`), version envelope, content/rules/RNG version, checksum for accidental corruption only, safe integer checks, bounded payload, complete domain validation. Quota/security exceptions return visible nonfatal status. Keep last-known-good backup and do not delete a corrupt/future save automatically. Save only at an accepted command boundary; never serialize scene objects. Old 64-bit RNG values need a separate importer policy, not JS-number coercion.[13] Two continuing storage limits: localStorage is per origin, so the namespaced key only protects old data if the new build is ever served from the legacy origin; and Safari deletes script-writable storage after seven days of browser use in which the user has not interacted with the site, so resume on iPhone is best-effort.[75]
- Lightweight presentation: board in Phaser; DOM buttons/dialogs/log/portraits outside canvas. Explicit modal pointer capture and focus/keyboard handling; no Phaser objects in save payload. Isometric picking/depth are separate utilities, tested against camera scaling and occlusion fixtures.
- Diagnostics: a global error handler shows a visible, copyable panel with the message, build identity, seed and index of the last command. Build identity comes from a build-time constant or the release marker `/_deployment.json`.[53] No third-party error service.

## 7. Testing and phased PR-sized roadmap

All future implementation uses clean TDD worktrees based on the then-current approved base. Write failing focused tests first, implement minimum behavior, run focused/full checks, update spec/task evidence; no “Closes”/completion PR claim until acceptance is actually met.

### 7.1 Roadmap and tracker mapping

The original battle implementation order is complete. Current status and dependencies are below; each live child issue remains the detailed acceptance contract.

| Phase / status | Tracker | Existing paths / concrete follow-up | Acceptance gate |
| --- | --- | --- | --- |
| P0: scope selected | #1 closed | Existing two planning docs; approved decisions in §2 | Core product choices retained; no parity or production approval inferred. |
| P1: proof delivered | #2, #14–#20 closed | `FitScene`, geometry/input/proof/audio diagnostics, `tests/*.spec.ts` | [Proof fit evidence](qa/issue-20-fit-gate.md) retains reported hardware success and unavailable detail. It does not certify the full battle. |
| P2: content/state/movement delivered | #3/#4/#5 closed | `src/content`, `src/domain/{types,grid,rng}.ts`, `tests/unit` | Runtime/build content checks and pure compiler boundary exist. |
| P3: rules/signatures delivered | #7/#8/#49 closed | `src/domain/{turns,targeting,combat}.ts`, `src/content/abilities.ts` | Approved d20/movement/Guarded/Magic Missile contracts and deterministic fixtures. |
| P4: AI/board/play loop delivered | #9/#6/#10 closed | `src/domain/ai.ts`, `BattleSession`, `BattleScene`, `BoardRenderer`, HUD/dialogs | Real-control automated win/loss/replay/restart and transformed picking; no physical acceptance by proxy. |
| P5: automated evidence delivered; physical gate open | #11/#62/#65/#68 closed; #57/#64/#66 open | Existing battle/audio/performance QA; cached renderer retained | Supported physical matrix and Safari restart disposition remain required. |
| P6a: delivery review / approved activation pending | #83 → #84 → #85; PR #12 open | Existing Pages evidence and reviewed SSH alternative | #84 resolves owner target/path; #85 requires accepted #84/#57 and explicit target/build/operation approval. SSH adds separate exact-package/preflight/install/activation/recovery gates only if selected. |
| P6b: local save/resume implemented; certification open | #69/#72/#73 closed; PRs #70/#91/#95 merged; #58/#74 open | Snapshot codec, guarded storage/backup, autosave, Continue and explicit recovery delivered | Physical lifecycle certification #74 and first-battle readiness #57 remain open. |
| P7: authored content, rewards and controls delivered | #75–#79 closed; #59/#60 open | Approved run contract, three encounters, deterministic offers, atomic ownership commands and resumable item controls | Parent acceptance remains open; see #81 for full-run certification. |
| P7: integration delivered; certification pending | #80 closed via merged PR #120; #81 open | Playable three-encounter progression and bounded run continuation integrated on main | Full supported-device/playtest certification remains #81; #57/#58 parent acceptance is not inferred from merge. |
| Independent exploration prototype delivered | #87/#96–#99 closed | Standalone seeded 20×20 `/map`, three layout algorithms, three biomes and art selection | [Map acceptance](qa/issue-96-map-acceptance.md); no battle/run coupling or exploration campaign implied. |

### 7.2 Commands and CI

Configured on main: `npm ci`, `npm run dev`, `npm run preview`, `npm run test:unit` (`vitest run`), `npm run validate:content` (content + authored-content suites), `npm run typecheck` (app and domain configurations), `npm run build` (both typechecks then Vite) and `npm test` (Playwright). See [package.json](../package.json).

Vitest is scoped to `tests/unit/**/*.test.ts` in Node; Playwright keeps `testDir: ./tests` with `testMatch: **/*.spec.ts`, one worker and desktop/Pixel 7 portrait/landscape Chromium projects. Moving tests to `tests/e2e` is unnecessary for current scoping. No configured WebKit project, `test:e2e` alias or tracked main CI workflow exists. PR #12’s workflow is proposed, not an installed gate. Local Playwright serves existing `dist/`, so build first. An installed compatible Chromium may be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

Existing QA notes record actual prior checks and limits, not new test runs by this documentation task. Emulated touch/WebKit cannot substitute for physical iPhone Safari/Chrome, Android Chrome or desktop acceptance in #64/#66. New behavior work runs the issue’s focused and configured checks; this reconciliation uses link/source/consistency, strict OpenSpec and whitespace checks only.

### 7.3 Legacy scenario sources

The 154 legacy test files are a scenario library. Take the situations from them and re-derive expected numbers from §3.4, because some fixtures exercise effects the slice drops. All files are under `scripts/tests/` at the pinned SHA.

| New test area | Legacy scenario sources |
|---|---|
| Content | `test_content_database.gd`, `test_issue_530_resource_backed_forest_ruins.gd`, `test_forest_ruins_mvp_builder.gd`, `test_player_unit_placement.gd`, `test_m6_enemy_definitions.gd` |
| RNG and state | `test_battle_rng.gd`, `test_active_battle_storage.gd` |
| Grid | `test_grid_service.gd`, `test_m4_terrain_movement.gd`, `test_movement_execution.gd` |
| Projection and picking | `test_iso_math.gd`, `test_tile_hover.gd`, `test_combat_scene_grid.gd`, `test_m7_battle_grid_rotation.gd` (raised-tile picking under rotation, pan and zoom) |
| Turns and outcome | `test_turn_manager.gd`, `test_wait_action.gd`, `test_m7_outcome_state.gd`, `test_status_lifecycle.gd` |
| Targeting and combat | `test_m4_targeting.gd`, `test_m4_height_attack.gd`, `test_combat_resolver.gd`, `test_basic_attack_controller.gd`, `test_m7_combat_preview.gd` |
| Signatures | `test_m5_class_abilities.gd`, `test_m5_definitions_status.gd` |
| AI | `test_m6_ai_controller.gd`, `test_m6_enemy_turn_execution.gd` |

Add one test for the coincidence itself: a height-2 cell and the flat cell at (x−1, y−1) project to the same point, and the picker chooses between them by the rule decided under D8. The legacy rule is in §4.2: an occupied or highlighted candidate wins, otherwise the front-most tile.

## 8. Requirements/docs reconciliation and scope control

The repository already has both planning documents, `README.md`, QA/asset records and task-specific OpenSpec changes. #82 maintains these two documents in place; there is no document migration, new root setup, legacy spec import or archival in this change. OpenSpec change tasks describe their own approved work; completed tasks are not hardware certification. Legacy Godot base/delta specs remain historical inputs at the pinned SHA and are not edited or deleted.

### Accepted / deferred / retired ledger

| Disposition | Scope | Current evidence / boundary |
| --- | --- | --- |
| Accepted battle slice, implemented | One replayable isometric Forest Ruins battle, fixed three heroes/minimal goblins, height/d20, signatures, legal AI, previews, replay/restart and optional sound | #1–#11/#49/#62; implementation closure is distinct from #57/#64/#66 readiness. |
| Accepted follow-ups, implementation delivered; acceptance open | Safe local resume, authored three-encounter run and minimal owned rewards/items | #69/#72/#73/#75–#80 closed; #58–#60/#74/#81 retain acceptance scope. |
| Separately requested prototype, delivered | 20×20 seeded procedural `/map` with layout, biome and art selection | #87/#96–#99 closed; independent of #59 and first-battle acceptance. Larger exploration/campaign remains deferred. |
| Deferred | Recruitment/classes, XP/meta progression, shops/economy, broad biomes/status systems, editor/custom-map exchange, rotation, accounts/leaderboards, analytics and legacy import | Historical legacy audit in the restart plan is reference material; no automatic port, new retirement or parity promise. Analytics remains default off. |
| Retired from the new runtime only | Godot Nodes/Resources/autoloads/GDScript/export/PCK/WASM plumbing and legacy same-seed restart | TS domain/session/Phaser/DOM replaces these; original repository/history/deployment/storage remain untouched. |
| Superseded/not adopted | Ember Burst, historical Guarded Strike −4 penalty, #68 baked prototype, proposed Begin/two-voice scheme | Approved Magic Missile/−2 tradeoff and merged implementation apply. Experiments and old proposals remain historical evidence. |

Keep legacy source numbers and dates: §3 is the October 6 Godot audit, not a refreshed v2 implementation inventory. Its missing discovery companion and mirror are not verification dependencies for #82. Current v2 code/merged history/live issues settle current-state claims; only explicit owner decisions settle product choices. The companion’s T1–T11 questions are now reconciled in §2 and draft §12. Differences between old engineering proposals and current code stay visible rather than becoming retroactive completion claims.

## 9. Risks and guardrails

Highest risk is **parity creep**: “already implemented in Godot” is not justification for reimplementing a map editor, six generation modes, deep status interactions and a content roster before the core feels right.

| Risk | Evidence | Mitigation or gate |
|---|---|---|
| Parity creep | 236 scripts and 66 unarchived change proposals describing existing behaviour | Explicit scope gates; parity ledger (§8); the encounter is the legacy trio unless D4 says otherwise |
| Legacy asset weight carried into the new build | 16.4 MB for five portraits; 19.5 MB for the slice unchanged (§5.1) | Asset pipeline and CI size report (§5.1) |
| Release pipeline rejects or mis-serves the build | Flat `assets/`, file-type allowlist and size caps in PR #12; year-long immutable caching | Vite-hashed assets only; nothing copied from `public/` into `assets/`; re-check after PR #12 merges |
| iPhone audio silent or broken | Music exists only as Ogg Vorbis; iOS support is recent | MP3; decode check on physical iPhones; check the hardware silent switch before filing a no-sound report |
| Cells covered by raised terrain; units on them appear to stand on the ruin | Five covered walkable cells on Forest Ruins; rotation deferred | D8, proven in #2 before #6 builds on it |
| Mis-taps on small tiles | Diamonds about 32×16 CSS pixels when the board is fitted to a phone | Default zoom per orientation and a forgiving picker (§4.2) |
| Mobile canvas/DOM coordinate mismatch, canopy occlusion and picking | Known problem areas in the legacy build | Pure projection/picking utilities with fixtures; early physical-device testing |
| Renderer and API drift | Phaser 4's renderer is new; 4.2.1 is a bug-fix release | Pinned version, standard APIs only, version-matched docs from the package |
| Engine download floor | About 0.35 MB compressed JavaScript before game code | Budget agreed from measurement (D2); verify edge compression |
| Toolchain novelty | TypeScript 7.0.2 was published in July 2026 and Vitest 5.0.0 in September 2026; both are young major versions (Vite 8 dates from March 2026) | Keep the toolchain minimal; pin exact versions; treat tool upgrades as their own PRs |
| Rule lifecycle lost in translation | Lifecycle rules live in a 2,393-line scene controller | §3.4 as the reference; lifecycle in the domain (§6) |
| Replay differences between preview and execution, or between browsers | Float AI scores, rounding rule, key order | Integer scores, pinned vectors, explicit comparators (§6) |
| Unmerged release mechanism | PR #12 is open; production installation not approved | Do not depend on it in gameplay PRs; #64/#85 use the selected reviewed path and served-build proof; existing QA used Pages. Deployed measurements for #2 need whichever release path is working at the time |
| Battle lost when the browser discards the tab | Saves are deferred; phones reload background tabs under memory pressure | Accept for the first tranche and say so in #11's deferred list; seed plus command log keeps later resume cheap |
| QA blocked or skewed by Access | Historical beta probe answered with Access login; current state unverified | Sign in per browser; measure after sign-in; never weaken Access |
| Historical plans drift from merged work | Both plans are already on main; dated proposals can look current | #82 reconciles them in place; use evidence/date and current `origin/main` for task bases |
| Saves that vanish on iPhone | Safari's seven-day storage cap | Best-effort storage and visible save failures in the implemented slice (§6) |
| Old-save precision, d20 pacing, procedural tuning | As in the original audit | Deferred with their features |

The general mitigations stand: pinned APIs, early physical-device fit testing, explicit scope gates, catalog validation, a pure deterministic core and no production cutover until accepted. If the proof-of-fit fails, the engine-independent domain is the hedge: issues #3–#5 and #7–#9 stay valid under any renderer, and the alternative is chosen explicitly with Brian.

Do not claim smaller bundle, better FPS, faster loading, compliant analytics or working live infrastructure from this planning task. No runtime prototype or new tests were written. The 2026-10-06 review ran only the scaffold's existing type-check, build and smoke tests, read both repositories and the tracker, and made one unauthenticated request to the beta host. It edited no file other than this one; the build and test runs regenerated the ignored `dist/` and `test-results/` directories, and the uncommitted `.gitignore` change that ignores `ORIGINAL/` predates the review. Afterwards, on request, the plan and the companion draft were committed to a `docs` branch; nothing was merged into `main`. The companion draft was then revised in a separate pass, which also made the edits here that keep the two documents consistent (§5.1 item 1, §8 item 7, this paragraph and the revision notes). That pass ran its own throwaway checks outside the repository; the draft's revision notes list them. This revision is ready for review. It is not a signal to begin anything beyond what the tracker already covers.

## Revision notes (2026-10-16)

Refreshed save/resume, authored run/rewards, overworld and control-work status against merged PRs and open acceptance issues. Main includes PR #120; initial local source inspection predates that integration. No runtime changes or fresh test/certification claims.

## Historical revision notes (2026-10-12)

Approved #82 reconciles current milestone/tooling/roadmap/delivery facts against main `30331e6` and the live tracker. The October 6 legacy audit, source numbering and notes remain dated historical evidence. Added shared D/T dispositions and scope ledger; preserved #57/#64/#66, unmerged #70, operator/production and analytics gates. #87 is an independent requested prototype, not battle scope. No gameplay, dependency, deployment, legacy repository or physical-device change.

## Historical revision notes (2026-10-06)

Corrections to earlier statements:

- Status and repository wording: the new repository is initialized, tracked (Epic #1, #2–#11) and has an open release PR; "do not initialize or scaffold" is superseded. The stack line now gives the pinned versions.
- Deployment row: the legacy README documents the Coolify pipeline; only the TDD's workflow claim is stale.
- Data conversion: the Forest Ruins resource contains tiles, not spawns; heroes, spawns, Guarded Strike, High Shot and the archer are defined in code (§3.3).
- Slice encounter: the grunt/archer/grunt trio is not what current main spawns on Forest Ruins (§3.3).
- High-coupling list: `BattleController.gd` added.
- Roadmap: P0 marked done; P6 split, with saves/resume moved after the first tranche to match issue #11; phases mapped to issues.
- Commands: the existing scripts are now distinguished from the proposed ones.
- References to `phaser4-discovery/evidence.md` and `/opt/data/writeups/tactics-guru/` now say that those are not stored with this copy.
- Location: the plan and the companion draft are tracked on the `docs` branch as of 2026-10-06; statements that the file was untracked were updated to match.
- Companion draft: revised later the same day. The statements here that described its old state were updated (§5.1 item 1, §8 item 7, §9); nothing else in this plan changed in that pass.

Additions: current-state table; open-decisions register (§2); slice content map, pinned rules and load-time causes (§3.3–§3.5); scaffold-versus-contract table and the restructured fit gate with hidden-cell, tile-size, context-loss, audio and measurement items (§4); asset pipeline and release limits (§5.1); enforcement, PRNG, ordering, diagnostics and storage limits (§6); CI wiring, runner scoping and legacy scenario map (§7.2–§7.3); tracker deltas (§8); risk table (§9).

Verified unchanged: the file counts and cited line ranges in §3.1, apart from the `ContentDatabase.gd` range, which was tightened to whole functions; the #624 description; the Phaser API, changelog and migration claims in §4; the template claims. The new sections were then checked by a second, independent pass against the same sources, and its corrections are included.

## Sources

[1] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/docs/tech_design.md
[2] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/autoload/ContentDatabase.gd
[3] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/ForestRuinsMvpBuilder.gd
[4] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/GridService.gd
[5] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/CombatResolver.gd
[6] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/TurnManager.gd
[7] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/AIController.gd
[8] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/RunState.gd
[9] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/OverworldMapGenerator.gd
[10] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/ItemCatalog.gd
[11] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/RewardCatalog.gd
[12] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/UnitProgressionService.gd
[13] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/ActiveBattleStorage.gd
[14] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/ActiveRunStorage.gd
[15] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/LeaderboardRunRecord.gd
[16] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/MetaProgressionState.gd
[17] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/view/BattleView.gd
[18] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/OverworldScene.gd
[19] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/ui/MobileWebLayout.gd
[20] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/analytics/AnalyticsService.gd
[21] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/web/posthog-bootstrap.js
[22] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/Dockerfile
[23] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/nginx.conf
[24] https://github.com/luminari-gurus/tactics-guru/tree/e9433f6b608ae6b2d95418615cce9cf17dadcf74/docs
[25] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_combat_resolver.gd
[26] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_run_equipment_effects.gd
[27] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_active_battle_storage.gd
[28] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_m12_overworld_map_generator.gd
[29] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_m22_leaderboard_global_sync_contract.gd
[30] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/openspec/project.md
[31] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/openspec/specs/meta-progression/spec.md
[32] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/developer/CustomMapPackageService.gd
[33] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_issue_599_summon_command_actions.gd
[34] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_issue_606_tempo_modifiers.gd
[35] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_m11_mobile_viewports.gd
[36] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_m7_stability_pass.gd
[37] https://registry.npmjs.org/phaser/latest
[38] https://github.com/phaserjs/phaser/releases/tag/v4.2.1
[39] https://github.com/phaserjs/phaser/blob/v4.2.1/changelog/v4/4.0/MIGRATION-GUIDE.md
[40] https://github.com/phaserjs/phaser/blob/v4.2.1/changelog/v4/4.0/CHANGELOG-v4.0.0.md
[41] https://github.com/phaserjs/template-vite-ts/blob/main/package.json
[42] https://github.com/phaserjs/template-vite-ts/blob/main/src/game/main.ts
[43] https://github.com/phaserjs/phaser/blob/v4.2.1/src/scene/Scene.js
[44] https://github.com/phaserjs/phaser/blob/v4.2.1/src/scale/ScaleManager.js
[45] https://github.com/phaserjs/phaser/blob/v4.2.1/src/input/InputPlugin.js
[46] https://github.com/phaserjs/phaser/blob/v4.2.1/src/cameras/2d/BaseCamera.js
[47] https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/components/Depth.js
[48] https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/graphics/Graphics.js
[49] https://github.com/phaserjs/phaser/blob/v4.2.1/src/sound/webaudio/WebAudioSoundManager.js
[50] https://github.com/luminari-gurus/tactics-guru/pull/624
[51] https://github.com/luminari-gurus/tactics-guru-v2/commit/df693f0185defda88c0de306ae12ec2424466b6e
[52] https://github.com/luminari-gurus/tactics-guru-v2/issues/1 (child issues #2–#11)
[53] https://github.com/luminari-gurus/tactics-guru-v2/pull/12 (head `636e0ea462ee24a36cf572d1f93ac5fffcb69525`: `deploy/release.py`, `deploy/ssh_upload.py`, `deploy/nginx.conf`, `deploy/README.md`, `.github/workflows/release.yml`)
[54] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/README.md
[55] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/export_presets.cfg
[56] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/BattleController.gd
[57] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/TargetingService.gd
[58] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/content/maps/forest_ruins_mvp.tres
[59] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/ForestEncounterCompositionSelector.gd
[60] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/autoload/GameConfig.gd
[61] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/view/IsoMath.gd
[62] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/view/UnitView.gd
[63] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/BattleRng.gd
[64] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/content_defs/StatusEffectDefinition.gd
[65] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/tests/test_m5_class_abilities.gd
[66] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/audio/music/bgm_variants/README.md
[67] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/docs/issue-377-sfx-running-table.md
[68] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/game/Main.gd
[69] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/combat/TileState.gd
[70] https://github.com/phaserjs/phaser/blob/v4.2.1/src/core/CreateRenderer.js
[71] https://github.com/phaserjs/phaser/blob/v4.2.1/README.md
[72] https://github.com/phaserjs/phaser/blob/v4.2.1/changelog/v4/4.2.1/CHANGELOG-v4.2.1.md
[73] https://developer.apple.com/documentation/safari-release-notes/safari-18_4-release-notes
[74] https://caniuse.com/ogg-vorbis
[75] https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/
[76] https://registry.npmjs.org/vitest/latest
[77] https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/CLAUDE.md
