# Browser assertions and fast rule coverage

Inventory for the under-ten-minute goal after PRs #288–#290. Source:
`d350bb6247ad577b3e0b9c732dcf65d8918dfc8f` (2026-11-05). This maps coverage
families and the next bounded migration; it does not certify that every possible
permutation is covered or authorize removing the remaining browser cases.

| Boundary | Existing fast coverage | Browser obligation retained |
| --- | --- | --- |
| Commands, turn/RNG and replay | `combat`, `turns`, `battleSession`, `saveEnvelope`, `battlefieldContinuation` unit suites | Complete legal battle, command controls, reload and replay in the core journey |
| Progression and learned actions | `progression` and `dungeonProgressionBoundary` | Dungeon XP 0/180 picker and party inspection across the retained Chromium/WebKit profiles; earned progression in explicit extended journeys |
| Authored ability-picker XP fixture | New `abilityFixtureProgression` plus `battleActions` | All four existing XP fixture cases still run on three Chromium fixture profiles; DOM health/choices/inspection, actual reload and pointer/touch are unchanged |
| Dungeon floor, traversal, encounter and reward rules | `dungeon`, `exploration`, `dungeonBattle`, `dungeonEncounters`, `rewards` | Dungeon creation, real action and exact active resume on Chromium/WebKit; stair and complete progression journeys remain explicit |
| Run items, rewards and terminal transitions | `run`, `runBattle`, `items`, `itemCommands`, `RunItemSession` | Core undo/reload/terminal journey plus explicit authored item/encounter fixtures |
| Persistence and recovery failures | `saveEnvelope`, `runSaveEnvelope`, `battleStorage`, `runStorage`, dungeon storage/session tests in `dungeon`, and `menuSaves` | Real reload, recovery dialogs/focus, native download and browser lifecycle/BFCache witnesses |
| Audio state and sound selection | `audioState`, `battleAudio`, `battleCues`, `battleAudioInventory` | Browser media delivery, native gesture unlock, suspend/resume, and retained prefix touch-audio cases |
| Geometry and device presentation | `grid`, `healthBar`, `radialGesture`, `radialLabels`, `boardPresentation` | GPU rendering, narrow layout/orientation, real touch and WebKit behavior |
| Content/assets and loading failures | `content`, `contentContract`, content-specific/inventory tests and root/prefix build integrations | Recoverable startup failure, asset/base-path behavior and visual rendering |

Suite names above refer to `tests/unit/<name>.test.ts`. They identify relevant
owners; a change still needs transitive-consumer selection under
[`verification-policy.md`](../verification-policy.md).

## Current increment: XP fixture rule coverage

The development ability fixture uses `abilityCatalog(2)`, rather than the
production catalog. Its synthetic `ability:zz_mage` unlocks at level two. The
production-catalog save tests from #289 therefore do not alone prove its choices.
The new nine unit cases cover XP 0, 59, 60, 179, 180, 359, 360, 599 and 600:

- Exact level, max HP and full-health session creation.
- Exact sorted choices from `ownedAbilities`, the helper consumed by the HUD;
  synthetic level-two and Frost Snare level-three gates, including locked command
  rejection through `actionCommand`.
- Legal Magic Missile preview and accepted missile counts (one/two/three), no
  RNG/state/event/replay mutation on cancellation, one accepted command, and
  rejection after spending the action.
- Fresh transient-session reconstruction discards the previous cast. This is
  unit proof of reconstruction, not proof that a browser reload wired it up.

The composition matches `tests/fixtures/abilities/main.ts`: projected XP catalog,
positioned `abilitySession` snapshot, then a **fresh** `BattleSession`. The first
local draft accidentally used the positioned helper directly (a resumed session)
and failed nine replay assertions. Correcting the test composition fixed those
failures; no product or fixture behavior was changed.

## Next removal requires browser evidence

`tests/ability-picker.spec.ts` still runs XP 0/60/180/600. Removing its XP 60 or
600 cases is a separate increment. Retain real DOM health, choice, inspection,
action and actual fixture-reload witnesses; preserve level-one, level-two and
level-three UI transitions where each is distinct. The synthetic level-two gate
means the earlier dungeon XP 0/180 mapping cannot simply be copied here.

Before editing that loop, capture exact fixture discovery, identify each removed
assertion's retained unit/UI witness, then execute the affected Chromium fixture
profiles on a qualified self-hosted runner with matching baseline/candidate
inputs. Retain failures and compare timings. Keep core discovery at seven and
do not claim an E2E reduction or speedup from this additive unit increment.

## Remaining measurement work

The successful PR observations are on persistent runner caches. A reproducible
cold dependency/browser setup observation and a separate warm observation,
including upload and queue time, remain open. Do not delete shared runner caches
to manufacture a cold run; use isolated cache/install directories on qualified
capacity and record their scope. This work is separate from product cold-start
qualification, whose original startup failure remains retained.
