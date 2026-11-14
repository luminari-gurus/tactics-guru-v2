# Dungeon floors

Source audit: `b343ab02ae033a57f8c5f613f07883764f0752c0`, extended by qualified Shaman source `f4616ae301da4be133455334d4c2b38e3583c8f7`. Current save/reward compatibility and growing-floor integration are tracked in [PR #279](https://github.com/luminari-gurus/tactics-guru-v2/pull/279), including source-specific qualification and retained failures. Historical evidence retains its original revision and test limits.

Issue #159 supplies the encounter foundation in `content/dungeonEncounters.ts` and `domain/dungeonEncounters.ts`, integrated with durable dungeon floors. [Hero progression](hero-progression.md) adds level/XP/HP carryover and versioned saves. The catalog admits existing Forest Ruins (with one dungeon-only access step at 4,2), Woodland Crossing, Ruined Approach and generated Desert rosters, including a goblin guardian. Every pairing passes the existing reachability/survivor/fallback checks. The original standalone and short-run maps remain unchanged. The summary shows the saved biome and depth, and the battle heading also shows the encounter kind. Undiscovered POIs remain hidden. Exploration uses existing Forest/Desert treatment; prior games retain Grassland. Missing or failed legacy artwork uses Simple fallback, including Desert's currently unavailable legacy art.

The new policy `dungeon-encounters-v1` seed-selects Forest/Desert first, then alternates by depth. Slots are normal, equally weighted elite/vault, then boss. Versioned biome/kind/map/composition streams use stable sorted IDs and do not consume existing battle/reward/terrain/exploration RNG. Guardian means full-roster victory, with no named-boss abilities or extra loot. `enemy-depth-v1` projects baseline enemy HP/power/accuracy/AC: nearest rounding (half toward positive infinity) of baseline × `(depth+9)/10`, clamped to current bounds; vault then rounds × `6/5` and clamps again. Elite and boss have no extra multiplier. Zero remains zero and signed accuracy saturates at its lower bound. Maximum safe-integer depths saturate before multiplication. Enemy scaling does not modify heroes. Hero HP and Mage caster level follow [hero progression](hero-progression.md); non-HP class stats, movement and resources retain their baselines. Repeated projection always starts from the immutable baseline; it never scales saved damage or a previous projection. This arithmetic contract is not a high-depth balance claim.

Current contract: issues #155, #157, #158 and #159. The continuation plan and QA reports distinguish pure/domain proof from browser route acceptance and identify tested revisions.

#166 adds `forest_ruins_shaman_v1` only to the dungeon Forest Ruins choice. Spawn 6
becomes a Goblin Shaman at the same coordinates; other IDs/coordinates and the
existing dungeon access step remain unchanged. The dungeon-local map carries that
same roster to satisfy authored battlefield admission. Canonical standalone,
authored-run and generated Desert rosters remain unchanged. Map/biome selection
streams and scaling arithmetic are preserved; the encounter catalog identity
changes deliberately. Shaman power affects Hex DC after ordinary depth projection.

Start or continue saved dungeons through the main menu at the configured base root (`/?game=dungeon`, or `/prototype/?game=dungeon`). Direct `/dungeon`, `/battle`, `/run` and `/map` are isolated testing entries; they never inspect, hydrate or change saved games. Testing dungeons support normal exploration, encounters and stairs in memory, with a fresh layout on restart/reload and no save recovery or unsaved-departure prompt. The durable behavior below applies to menu play. Existing direct-route bookmarks now enter testing; return to menu Continue to recover their existing saves. No slot or format is migrated.

Each fresh floor saves three selected encounters, including source/roster, map/composition/pool IDs, biome, kind, guardian reference, scaling depth/policy and resolved battlefield hash. Resume validates these facts against their versioned definitions without drawing a new selection. The same projected catalog supplies initial HP, inspection, preview, AI, resolution and replay. Active saves retain damage. New-format games using the legacy opponent policy keep fixed opponents and unscaled enemy stats, including on unvisited floors. Pre-progression saves require recovery/export and their originating build. Exploration geometry, stairs and POIs remain independent of battle selection. The first floor uses the existing 20×20 Rooms layout; new deeper floors grow by four cells per side to 36×36 on floor five and beyond, using a deterministic sector graph or Arena profile selected from the floor seed. Existing rooms-v1 floors retain their original geometry. New descriptors retain size and profile identity; unknown or inconsistent versions are rejected. A previous build cannot necessarily read newly generated floor descriptors. Further content expansion remains #170.

Legacy fixed-policy floor plans may defer their derived battlefield with `battlefield: null`: formats 1/2 never stored per-slot battlefield geometry. Normalization retains fixed source/roster/depth facts and resolves the deterministic map only at battle entry, avoiding three full graph validations per historical floor. Active battle geometry and RNG still validate exactly. Existing format-3 legacy plans with full descriptors remain supported and validated; new-policy plans always require their resolved battlefield facts. Save identities, byte/floor limits, read-only inspection and raw-backup preservation remain unchanged.

Cold format-3 reads validate all saved selection/source identities, then fully verify only the current floor's battlefield geometry. Historical hashes remain saved exactly; switching to a historical floor verifies those hashes before travel can be saved or published. A bad historical geometry hash therefore blocks that travel without changing the current floor or durable save. This removes cold-start graph work proportional to history and keeps the admission cache at a bounded 128-entry working set. Descriptor shapes, source/map IDs and layout seeds still reject immediately on every floor.

Attempt a cardinal step onto any uncleared `M` encounter marker to start its associated encounter; encounters may be cleared in any order. Battle starts before the party moves: the accepted state keeps the origin, the enemy's actual contact cell and its encounter slot. Entering battle does not visit or reveal the destination, increment exploration move counts, or advance enemies. The party stays at that origin through victory or defeat. A cleared marker never relaunches. An explicit Enter encounter control remains available for a legacy save whose party is already on an available encounter cell; that path preserves the occupied-cell state without inventing an earlier origin. Each new victory generates one seeded item, quantity one, on the defeated enemy’s actual contact cell. XP, encounter completion and the third-victory descent unlock are awarded immediately; collecting loot is optional. The party returns to exploration at the origin with no reward picker or claim/decline gate. Auto-collect loot defaults on and may complete that single interrupted step after the return presentation; turning it off leaves the party at the origin until normal input. Previously saved floors that were already cleared remain ready for descent. A party wipe ends the dungeon. Start new dungeon requires confirmation and replaces only the dungeon namespace. It restores the full starting party and empty inventory. A cancelled choice does nothing.

Auto-collect loot is an accessible checkbox in main-menu Settings. Its description
is: “After victory, automatically move onto the defeated enemy's square and collect
its loot.” The independent `tactics-guru:auto-collect-loot` preference stores `on`
or `off` across runs; absent or unrecognized values default on. If browser storage
refuses the write, the choice applies for the current visit and Settings explains
that limit. Changing the preference affects subsequent victories and never moves
the party, sweeps existing piles, or changes another preference.

A newly accepted origin/contact victory can capture one transient intent. After
the battle return presentation finishes, active exploration shows the original
position and ground loot for 400 milliseconds before attempting that step. The
intent is never encoded in the save and cannot be reconstructed by loading,
rendering, changing Settings or restoring visibility. An existing active battle
resumed before its real victory can earn a new intent normally; restoring an
already finished battle or ready ground-loot state cannot.

Immediately before committing, inside the exclusive save boundary, automatic
collection rechecks the dungeon ID, depth, revision, original party position,
adjacent destination, cleared encounter slot, exact remaining loot identity,
capacity and active interaction state. A live encounter, blocked or stale target,
failed victory save, or available stair cancels the automatic step without
redirecting the party. If nothing fits, the party remains at the origin with
brief capacity feedback. If anything fits, the ordinary movement/pickup reducer
collects eligible contents, records one ordinary move, runs the usual enemy
update once, and saves the accepted transition; the exact remainder stays on
the ground. Once all encounters are cleared, that ordinary enemy update is a
no-op, just as it is for a manual step.

Fresh movement, preparation or other exploration input cancels pending automatic
movement. Recovery, restart, navigation, hidden documents, scene disposal and
incompatible dialogs also invalidate it, including while it waits for a save
lock. Held or queued combat input cannot resume a route. Outcome cutscenes own
the return callback, so completion, Skip, disabled scenes and reduced-motion
bypass all reach the same single scheduling boundary. Hiding the page cancels
an intent; becoming visible does not recreate it. A reload before the step
restores the saved origin and pile, while a reload afterward restores the one
accepted pickup without repeating it.

Ascend is unavailable on floor 1. Travel is unavailable during a battle or an older saved pending reward choice. Descend requires all three encounters to be cleared; ordinary ground loot does not block it. Moving onto an available matching stair automatically ascends or descends in the same accepted movement revision; no separate activation is required. Arrival, rendering and restoring a saved position on stairs never trigger travel. Move off and back onto the stair to travel again; remote stair requests are rejected. Travel retains the departing position and enters the retained position on the destination floor (new floors start upstairs). Revisit restores geometry, position, revealed/visited cells, POIs, completion, stair state and each remaining or depleted loot record, and cannot restart cleared encounters or grant rewards again. Party HP, defeated heroes, inventory and equipment carry through travel. New encounters reset battle-local movement/actions/Guarded state; reload preserves the accepted active battle instead. Equipment is projected once from the immutable base catalog. Healing Draught can heal a living hero during preparation or as an ordinary hero action in an active battle; it cannot revive a defeated hero. Revive Kit is a preparation action for a fallen hero while the dungeon remains active, and cannot undo a final party wipe.

Exploration and save recovery render before the battle engine is loaded. Entering or resuming an encounter locks repeated entry while its engine loads. Recovery, restart, visibility and page disposal prevent a late load from reviving an abandoned encounter; a failed load retains the saved encounter and offers recovery or reload. A loaded engine is reused for later encounters in the same page.

Exploration uses a single cardinal step per arrow or WASD press while exploration is active, adjacent-cell pointer/touch activation, or a labeled direction button (at least 44×44 CSS pixels). The map’s Enable WASD movement checkbox turns letter shortcuts off and saves the preference in this browser when storage is available. Diagonal, blocked, remote, stale or repeated key input cannot move the player. Keyboard navigation of other controls retains its usual behavior. Battles, older pending reward choices, defeat and dialogs block movement. Ground loot is traversable and does not block exploration or another encounter. Each completed exploration step advances the remaining enemy movement cadence once using a separate deterministic movement RNG; enemies avoid visible stairs. Living encounters hold position when an accepted player step ends cardinally adjacent, giving the player a reliable next step onto the marker; their cells remain reserved against other enemies. Farther away, enemy 1 wanders, enemy 2 chases into the player’s previous cell when that cell is reachable (including when the pursuer is already adjacent to it), and enemy 3 blocks toward the resulting cell and stays when already adjacent. Actual occupancy remains authoritative for both pursuit targets; chase ignores an invalid or out-of-range previous cell and never occupies the player’s current cell. Attempting to enter an enemy starts its battle before movement, pickup or an exploration tick. Waiting, rejected commands, rendering and reload do not advance enemies. Each command binds dungeon ID, floor and revision; a step and its enemy movement or battle entry are saved in one revision.

Each initial/accepted position reveals a Manhattan-radius-two diamond, including through walls; this is awareness, not combat LOS. Revealed/visited cell indices are bounded, sorted and unique. Uncleared encounter cells use `M`, including the guardian; cleared encounters retain `✓`; remaining loot uses `◆`. A small loot overlay remains visible when the party, a live encounter or a stair shares that cell. The same full tile is the interaction target. Visible text identifies pile contents, including beneath the party, without requiring hover. Upstairs markers appear only on floors 2 and above. Downstairs markers appear after the floor’s final encounter is cleared, independently of uncollected ground loot. A legacy pending choice retains its original restriction until resolved once. Both stairs still require discovery: unlocking descent does not reveal its cell. These presentation rules are derived again on reload and return travel; travel validation remains unchanged. Completion derives from the existing encounter boundary. Exploration POIs are seeded without replacement from legal cells excluding both stairs, with stable enemy-1/2/3 IDs and slots. Their exploration-v1 seed is independent of terrain, battle, reward and encounter-selection streams. On a newly descended floor, if a marker would occupy a cardinal neighbor of the arrival stair, placement is redrawn deterministically with all those neighbors reserved. Adjusted positions are stored in the movable exploration format so the party can step off the landing before engaging. Reused guardian rosters and existing rewards do not imply new named-boss abilities or vault loot.

Simple/Legacy 8-bit art is view-local. Art changes, delayed/failed image loading and rotation preserve authoritative state and RNG; unavailable artwork uses Simple fallback. `/map` retains its independent generator/biome/art inspection controls. Dungeon discovery never grants scouting, trap or cache rewards (#175).

`dungeon-seeds-v1` hashes the run seed, positive safe-integer depth, purpose and encounter slot. Floor, battle and reward purposes are separate. No mutable battle RNG is consumed by floor generation, rendering, travel or previews. Floor descriptors retain template/generator/biome versions and the map hash. Battle descriptors retain their own source identity/hash. Changes to rules, RNG, catalog or templates invalidate compatibility rather than silently rerolling saved progress.

Ground rewards use `<dungeon-id>:floor:<depth>:reward:<completion-index>:loot`.
Each record keeps its encounter slot, actual contact cell, seeded item, original
quantity one and remaining quantity zero or one. The completion index uses the
existing independent reward seed stream. A single draw from the existing sorted
eligible catalog replaces the two-option offer; no weighting, pity, extra reward
occasion, automatic healing or item-quantity change is introduced. Loading and
validation preserve that saved result; presentation and pickup consume no combat
RNG. Depleted records remain saved and cannot be recreated by reload or revisit.

A normal legal move onto loot picks up every item that fits before advancing
enemies or entering available stairs. Same-cell encounter records remain separate;
pickup proceeds in ascending completion index, skipping a full item category so
other eligible records can still fit. Existing limits remain nine of each
consumable and six equipment instances. Full or partial piles retain their exact
remainder and report brief nonblocking capacity feedback. An occupied pile starts
the live encounter first and cannot be collected by pretending movement occurred.
A successful inventory action while standing on an unoccupied pile retries pickup
without movement, an enemy tick or an extra revision beyond the inventory action. Collection never equips gear,
heals a hero, replaces owned equipment or consumes items.

Preparation Discard retains its explicit named-item confirmation and removes the
instance and any assignment. That freed slot can immediately receive a waiting
item from a pile beneath the party, without equipping it. A repeated or stale
command cannot discard or collect twice. Ownership, HP changes and pile depletion
are persisted and read back together before an inventory transition is published;
a failed write keeps the prior accepted state and exposes recovery. Ground pickup
and movement use the same transaction rule.

Older pending two-option offers remain exact one-time compatibility boundaries,
with their original `<dungeon-id>:floor:<depth>:reward:<completion-index>:option:<ordinal>`
identity. Claim or decline resolves the saved offer; neither rerolls it nor grants
both options. Such a legacy offer cannot coexist with a ground record for the same
completion index. Subsequent spatial encounters use ground loot. Shared standalone
and three-battle reward rules remain unchanged.


The UI retains at most three resolved floor geometries. A separate bounded 256-entry cache reuses frozen geometry during domain validation and movement; keys include seed, generator and size, and never contain floor progress. All visited-floor descriptors, positions and completion facts remain in the durable snapshot; evicted geometry is regenerated and checked against its saved hash on entry. There is no gameplay depth endpoint. Safe-integer overflow, an encoded 1 MiB UTF-8 envelope limit and actual browser quotas are engineering failures, never victory conditions. Collection validation has a conservative 8,192-floor allocation bound; the byte limit is reached earlier for this descriptor format. No visited-floor history is pruned to fit. Browser storage is finite.

Saves with [wall-aware exploration](dungeon-exploration-visibility.md) use envelope format 14, or 15 with an active Healing Draught ledger. Saves containing only legacy exploration use format 10 or 11 respectively. These formats bind the current encounter, item, scaling, exploration and progression identities with a canonical checksum. Formats 11 and 15 require that active ledger. The reader also accepts format 9 with its previous catalog identity, preserving its pending reward and active battle under the legacy rules; it rejects a version-2 reward or draught ledger in that legacy envelope. Formats 1–8 remain incompatible. Inspection/Continue preserve raw bytes for recovery/export and do not reconstruct XP, reset heroes or write a replacement. The next accepted save uses the current writer format. Current-format legacy exploration remains readable and gains movement state only on an accepted step. Existing `rooms-v1` floors retain their saved 20×20 geometry at every depth; newly visited floors follow the growing-size policy. Older builds cannot be assumed to read newly generated descriptors or current item/battle state. Incompatible saves remain available for export and continuation in their originating build; explicit replacement retains the existing confirmation safeguards.

A pending third reward or a charm earned from it uses a new save identity. The reader accepts existing saves and earlier preview saves, and writes the new identity only while the state requires third-reward support. An older build reports those saves as incompatible. The storage adapter retains an available compatible backup from the same dungeon while a third-reward save would replace it. After rolling back, export the newer primary before removing it through Save recovery, then continue the compatible backup. That backup reflects an earlier point in the run. Return to the updated build to use the newer save.

New encounters with a captured origin/contact contract use format 18 and the
`origin-contact-v1` identity through their active battle when no floor has ground loot. Previously written format-18 pending rewards remain readable.
The record binds the current floor position to a walkable origin and its actual
adjacent encounter marker; a mismatched slot, moved contact or nonadjacent entry
is rejected. The contract survives active-battle save/resume exactly. Format 18
supports current optional statistics, sight and Healing Draught state, and cannot
be relabeled as an older format. Victory or defeat removes the completed entry record without moving the party. A preserved format-18 reward removes it after its original claim or decline. Saves without a captured entry or ground loot retain their prior envelope formats.

Older active-battle saves and pending two-option offers keep their existing
position, battle, offer, ownership, XP and completion facts. Loading them does
not infer a missing pre-battle origin, replay completion, reroll a reward or
write a migration. They can finish their existing reward flow once. Saves that
were already incompatible continue through the existing recovery/export path.
While format-18 progress would replace an available same-dungeon backup without
the new entry contract, storage retains that earlier checkpoint for rollback.
It does not project an active encounter onto a fabricated historical position.

Any floor with ground loot, including fully depleted records, uses format 19 with
an identity binding the one-item reward policy and existing catalog. This format
can also preserve a subsequent active encounter’s origin/contact contract. It
cannot be relabeled as an older format. Saves validate record order, unique
encounter/reward identities, cleared contact locations, seeded content and exact
equipment provenance; uncollected equipment cannot also be owned. Per-floor
records survive leaving and returning to the floor. Loading never schedules a
pickup or movement. Once ground progress is saved, subsequent backups preserve
its exact format-19 snapshot; they do not strip loot to imitate an older build or
apply an unnecessary older-sight projection.

When saving a battle with a Healing Draught ledger, the adapter retains an existing non-ledger checkpoint for the same dungeon, depth and encounter-completion boundary when available. Otherwise it writes a preparation checkpoint in format 10 before writing the format-11 or format-15 primary. Later ledger-bearing saves do not rotate that primary over the checkpoint. Both written slots require readback verification. This preserves a recovery boundary for a build that understands the checkpoint's format and descriptors; it does not make new floor profiles readable by older builds. Normal saves preserve the previous primary as backup, keeping exact bytes for a legacy envelope. For a wall-aware primary, the backup omits the sight version and adds the legacy radius-two discovery around the saved position on each affected floor. The current reader uses a checksummed record tied to the rollback bytes to restore the exact sight version and remembered cells. Missing, stale, or corrupt checkpoint metadata leaves the legacy backup readable. Recovery can export both forms. If the rollback projection exceeds the save limit, storage keeps an existing legacy backup when available.

Primary and backup keys remain `tactics-guru:phaser:dungeon:{primary,backup}:v1`. The single bounded snapshot includes party/items, every floor's selections/progress/loot, any legacy pending reward and at most one active battle. No floor history is evicted to fit. A movement, spatial encounter-entry or automatic stair-travel candidate is published only after primary write/readback succeeds. Stair entry and travel are saved together; a failed travel save retains the pre-step position and floor. Entry failure never launches a detached battle. Subsequent accepted battle commands retain visible unsaved/recovery semantics if a save fails; resolved commands are not rolled back. Failed or uncertain writes retain the current in-memory floor, block silent retries and offer recovery. If an uncertain write committed, **Continue primary dungeon** adopts that inspected durable state; **Retry saving current progress** explicitly chooses current in-memory state. Backup continuation can lose latest progress and says so. The storage adapter keeps at most two privately cloned, validated states keyed by their exact save bytes; inspection still rereads each slot and clones cached values so callers cannot alter later checks. A bounded 128-entry cache stores SHA-256 keys of verified current-floor encounter facts. Historical geometry is verified before that floor becomes current, avoiding the former whole-history scan and sequential-eviction cascade. The cache stores no geometry or progress and cannot grant completion, select opponents or preserve changed facts under an old key; save and floor limits remain unchanged.

Startup is read-only. Invalid/incompatible saves stay exportable and are never automatically removed. Save recovery exports current progress and exact saved bytes, supports compare-before-removal with confirmation, and retains recovery copies after a partial reset/removal. Removing one slot does not remove another mode's data. Quota/security/unavailable errors are visible. Explicit unsaved play permits exploration and battle progress but blocks stair travel until saving is restored. Export before closing an unsaved tab; in-memory recovery copies do not survive navigation. Storage operations are synchronous best effort; a changed primary save blocks a stale tab from silently overwriting progress.

Implementation boundaries: `domain/dungeon.ts` owns transitions and battle validation, `dungeonSaveEnvelope.ts` owns encoding, `persistence/dungeonStorage.ts` owns effects/readback, and `app/DungeonSession.ts` owns the live battle and accepted callbacks. `BattleSession`/`BattleScene` remain the shared battle engine and presentation. `ui/dungeon.ts` renders exploration/items/stairs and `ui/dungeonMap.ts` owns map input and view-local art; `startDungeonApp.ts` owns route lifecycle/recovery. Device evidence uses Playwright emulation; no physical-device testing is claimed.

Dungeon telemetry collection stays disabled until its event/route taxonomy is selected separately. Existing Privacy & analytics controls remain available for the browser preference used by other modes; this change does not activate collection or introduce new event types.
