# Issue 79: reward and party-item controls

Approved in the task conversation on 2026-10-14. Base main: `4dac500cb204c9b707d8d2f7fab526941c07be7f`; branch `work/issue-79-reward-item-controls`.

## Shared contract for #80

`RunSnapshot` in `src/domain/runSaveEnvelope.ts` is `{items: RunItems, activeBattle: BattleState|null}`. `RunSaveContext` supplies trusted immutable base content, item definitions, ordered run definition and encounter/map records. Pass the base catalog every time. `runBattleCatalog` projects equipment once and filters defeated entry heroes out of encounter spawns; use this returned catalog for battle construction, commands and restore validation. #80 supplies carried entry HP when constructing the battle. The saved run party remains entry HP while activeBattle owns current damage, initiative, actions, statuses and RNG. Battle seed/map/roster/projected-content identity and HP upper bounds must agree. Reward/terminal phases cannot carry an active battle. A battle-phase snapshot with null activeBattle means encounter preparation.

The envelope has a distinct run kind, format 1, SHA-256 integrity, base rules content identity, item/reward policy identity and encounter mapping identity. Bound: 32,768 UTF-16 code units. Malformed, oversized, incompatible, corrupt and invalid cross-field data are rejected before hydration. No migration or arbitrary import is provided. Digest is corruption detection, not authentication or replay provenance.

`RunItemSession` owns state and derives active-battle permission internally. `boundary()` captures run/item revisions for review; `dispatch()` delegates to the existing atomic item reducer and saves accepted boundaries. Rejections preserve state. Storage failure keeps accepted gameplay with an unsaved indication. `snapshot` returns an owned copy. #80 retains ownership of battle outcome/progression orchestration.

## Storage and recovery

Run keys: `tactics-guru:phaser:run:primary:v1` and `tactics-guru:phaser:run:backup:v1`. Existing battle and legacy Godot keys are never accessed. A validated primary rotates into backup before publication; a sole backup is retained. Invalid/unreadable slots block implicit replacement. Inspection retains exact bytes; explicit removal compares reviewed bytes and refuses changed data. This is best-effort local storage, not cross-tab atomic compare-and-swap or permanent storage.

The UI offers Continue, Save recovery, retry, lossless JSON export of raw slot text (including lone UTF-16 surrogates) and reviewed per-slot removal. Backup continuation does not delete damaged primary data; saving stays blocked until explicit recovery resolves it. Removing multiple slots is not an atomic reset.

## Evidence boundary

The browser fixture starts from explicit run boundaries and mounts production UI/session/storage. It is not evidence of a legal three-battle playthrough. #80 connects these components into the run; #81 retains full-run and physical-device acceptance. No production deployment or physical certification is claimed.

## Validation

Final focused codec/storage/session checks: 12 passing tests. The authored stress snapshot with all six combatants, four instance identities, three assignments, a full consumable stack and wide numeric fields is 2,567 code units of the 32,768 bound; this is a supported shape stress fixture, not evidence of legal item provenance.

## Acceptance mapping

| #79 criterion | Evidence |
| --- | --- |
| Catalog rows, claim/use/equip/unequip, eligible targets and responsive inputs | `src/ui/runItems.ts`; production components mounted by `tests/fixtures/run-items`; browser claim/use/equip/unequip tests use mouse, touchscreen and native keyboard paths. Defeated/full-HP/ineligible target options are disabled with reasons. |
| Duplicate/stale commands and rejection without partial mutation | Session revision tests, real double click/double tap, held Enter and fresh Space, capacity rejection preserving the entire snapshot, and changed-byte recovery refusal. |
| Bounded ownership/equipment/pending reward and safe incompatibility | Codec malformed/version/content/offer/roster/map/seed/HP/inventory tests; storage quota/read/write/removal failure tests, exact byte preservation and lossless recovery download. |
| Reload pending/claimed ownership/stats/RNG/next encounter | Session/codec next-command and RNG comparisons; browser reload pending, claimed, consumed, equipped and active snapshots; explicit Continue control and unchanged equipment projection. |
| Actual browser inputs with honest full-run boundary | Dedicated production-component fixture; layout screenshots at 412x915, 915x412 and 320x568. The input-isolation fixture uses the production BoardInput binder; it does not render a Phaser battle or certify a complete run. |

The controls are reusable production modules; the existing single-battle entry does not expose a competing unfinished run route. #80 mounts these components in the actual run flow. Item labels/effects/eligibility come from validated definitions; hero and encounter names are readable forms of validated IDs, since those records have no display-name field. Modal focus returns to an enabled control after the callback/render. New styles are scoped to the item flow and its modal.

Validation commands:

- `npm run test:unit`: 647 passing across 38 files (includes 12 new codec/storage/session tests).
- `npm run validate:content`: 167 passing.
- `npm run typecheck`: both configured typechecks pass.
- `npm run build`: content, both typechecks and production build pass; existing large-chunk warning remains. Run UI is not yet in the main entry bundle; #80 will measure integrated delivery impact.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test`: 399 main + 18 encounter + 21 run-item browser checks passed (438 total).
- `openspec validate issue-79-reward-item-controls --strict` and `git diff --check`: pass.

Initial focused browser run: 18/18 passed before the final additional rejection/active-reload coverage. The final full run includes the updated posttest suite. No physical-device, Safari, screen-reader, deployed upgrade or full authored-run certification is claimed.

## Final evidence and revision binding

Implementation commit: `064de6f5f48ea0ebb1e4b68c225d07cd9fcd00ce`. Final unit/build checks passed again at that revision. The 19-minute full browser run passed all 399 main cases, then 18 encounter and 21 run-item posttests. Its main preview reported plan commit `9ea31b8f6ac838126f88772a403fd8441daa80a7` with a dirty worktree; it was built before the implementation commit. New modules are not imported by that existing single-battle entry. No failure or skipped browser case was observed.

Visual review caught blank mobile full-page screenshot output from the first capture method. The screenshot-only correction captures the item element at CSS scale. All 21 run-item cases passed again after that correction, using the committed runtime at `064de6f` plus the screenshot-test edit. No runtime changes followed that commit. The final capture JSON records browser Chrome 155.0.8059.41, actual project/viewport, build identity and complete fixture report. [Source hashes and result counts](issue-79/validation.json) bind the relevant implementation and final fixture/test inputs; these are source identities, not a claim that the earlier main preview was built from the later commit.

Reviewed final images: [portrait](issue-79/items-412x915.png), [narrow portrait](issue-79/items-320x568.png), [short landscape](issue-79/items-915x412.png). They show the scrollable component, not a complete battle layout. The mobile emulation runs exercise native touch, keyboard, focus and modal behavior; they do not prove physical hardware or screen-reader acceptance.

Logs (trailing whitespace normalized): [full browser run](issue-79/browser.txt), [final item rerun](issue-79/run-items.txt), [unit](issue-79/unit.txt), [content](issue-79/content.txt), [build](issue-79/build.txt). Existing Vite large-chunk and Node color-environment warnings remain. Strict OpenSpec, both typechecks, local document links and whitespace checks passed. The only remaining workflow step is PR publication; #80/#81 integration/certification remain separate scope.
