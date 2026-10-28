# Goblin Shaman qualification (#166)

Date: 2026-10-29 (Asia/Jerusalem). Work is in progress. This is an evidence and
continuation index, not completed issue acceptance.

- [Live plan](../../ongoing-projects/plan.md).
- [OpenSpec tasks](../../../openspec/changes/issue-166-goblin-shaman/tasks.md).
- Starting commit: `b5b450f80405d14a28082c43ba555bcf02f2b11e`.
- First chunk: validated Shaman stats/art and Basic Attack ownership, with no
  production encounter/AI changes. New support rules/placement are pending.
- Foundation: [PR #251](https://github.com/luminari-gurus/tactics-guru-v2/pull/251),
  open/non-draft at `d2e211ddc87a7ff57ee9b719fd9fd7a9be1fff93`. Final handoff
  metadata changes only documentation/OpenSpec progress and reuses identical
  qualified inputs; no application/browser rerun is needed.

## Support runtime progress (dependent branch)

`branch/issue-166-shaman-support` implements support rules, bounded immunity and
Weakened state, shared AI, save versions **5/6/7/8**, dungeon-only Forest Ruins
placement and existing-surface feedback. OpenSpec progress is **6/9**; complete
six-profile browser and full policy qualification remain pending.

Focused rules/validation/AI/state/turn tests passed 172 cases; later ability
feedback checks pass 48 cases. Existing save/storage/session selection passed
167 cases. New active Weakened/enemy-heal roundtrips in standalone, controlled run
and actual dungeon composition preserve hero-entry HP/Second Wind bounds.
Every pool/survivor/fallback and canonical map/roster assertion passes in the
84-case encounter selection. Both type scopes pass. Raw iteration reports are
under `tmp/issue166/` until final immutable evidence is assembled.

The first full unit attempt had **1,045 passed / two failed** (1,047 total),
preserved in `tmp/issue166/support-all-units-1.{json,log}`. Both failures were
seed-190 witnesses whose gameplay changed with the new Shaman composition:
Ranger no longer reached Pin and the two-floor guardian policy lost. Search of
legal current-source journeys found Ranger seed 1 (five battles, Mark/Pin and
terminal defeat) and guardian seed 4 (six wins, both biomes/all encounter kinds).
Only those inputs changed; all assertions remain. The repaired 13-case dungeon-
battle suite passes, with the original failure retained.

Shaman seed 3 provides a legal 53-command victory with one failed Hex, two ally
heals and expiry through the real session. The browser journey reaches the same
terminal state and reloads active Weakened. Its first attempt failed only the
test oracle's single-Magic-Missile target syntax (array versus the HUD's unitId
shorthand); the oracle now canonicalizes that equivalent input. Raw actual
browser commands/events are preserved and independently replayed exactly.

The repaired Chromium journey passed **3/3** desktop/portrait/landscape cases,
with zero skips/retries/flaky results and 53 accepted commands in each. Both type
scopes pass at the checkpoint. [Passing browser report](iteration/shaman-chromium.json),
[original oracle failure](iteration/browser-oracle-failure.json),
[original full-unit failure](iteration/units-first-failure.json),
[repaired dungeon suite](iteration/dungeon-repaired.json),
[actual desktop command/event trace](iteration/chromium-desktop-journey.json) and
[source/build inventory](iteration/inputs.json) are retained.

Reviewed [portrait board](iteration/shaman-portrait-board.png),
[Shaman inspection](iteration/shaman-portrait-inspection.png),
[landscape Weakened](iteration/weakened-landscape-inspection.png) and
[Will-save log](iteration/shaman-portrait-save-log.png): art anchor and status/save
text are consistent. Existing bounded heading/caption regions remain scrollable
to protect the playfield; modals scroll for detailed inspection. WebKit and final
full qualification are pending; these iteration results do not replace them.

## Acceptance map (qualification still in progress)

1. Validated stats/assets/abilities and placement: content/ability validators,
   pinned source/runtime hashes, unchanged canonical map snapshots and every
   dungeon pool/survivor/fallback pass. The actual seed-3 browser board includes
   Shaman spawn 6; other modes retain their original rosters.
2. Will-save/Weakened contract and feedback: ability tests enumerate twenty faces,
   equality/extreme Will/DC/natural outcomes, Guard/Mark composition, refresh,
   saved-cast preservation, immunity and defeat/turn expiry. Actual inspection and
   log show DC 12 and Fighter/Ranger/Mage 50%/45%/55% save chances; the seed-3
   Ranger fails with natural 3 and reload retains exactly one −2 source.
   The full-run Ranger seed-1 HUD trace also records natural 17 + Will 0 saving
   against DC 12, plus later failures, through existing legal journey coverage.
3. Heal eligibility/cap/atomic rejection: existing ability owner tests cover
   injured living grunt/archer/Shaman, wrong side, dead/missing/full/self/range/LOS,
   missing HP 1/4/7 and exhausted RNG. Aggregate run/dungeon tests preserve hero
   entry HP and Second Wind limits. The production trace contains two useful ally
   heals, one ordinary action each, without RNG or extra use counters.
4. Useful stable AI: all 45 AI cases pass, including common integer utility,
   ties/permutations/repeated planning, no preview RNG, Taunt, Pin/Snare,
   support approach/Wait and the existing grunt/archer expectations. Real-session
   and browser traces prove one committed ability followed by turn end.
5. Negative cases and complete continuation: malformed/reference/immunity/range/
   LOS/action/target cases are atomic; exact prior saves remain recoverable. The
   53-command production victory includes Hex, healing, active status reload,
   expiry and exact raw command/event/RNG replay on three Chromium profiles.
   WebKit's three profiles and remaining full-regression stages are still pending;
   no complete issue acceptance is claimed yet.

The original Linux full run is retained at
`/tmp/tactics-issue-166-20261029/tmp/verification/full-2026-10-28T22-38-13.070Z-3061420/`.
Its units passed **1,048/1,048** with both type scopes/build integrations/root
bundle passing. The served root hash is
`ace84f9570c810d914d61abbc15861e2218f951ac5afd389334a2baf8bb26ba5`,
byte-identical to the pilot bundle. This original run is still in progress and
has a retained Fighter seed-190 browser failure: the party loses at floor 2's
first encounter before Taunt. The replacement seed 17 preserves every gate,
including the second-guardian terminal boundary; the new pure six-battle test
passes. Its six browser profiles remain pending until serial capacity is free.

The [previous qualified raw Chromium report](../issue-165/full-run/chromium.json.gz)
records all three old Fighter cases passing. Git comparison verifies zero
src/public/tests/scripts/config/package differences between its source `4f8c194`
and literal base `7cea1e9`; that existing baseline evidence is reused, rather
than claiming the new failure was pre-existing or rerunning a base matrix.

During the final coverage audit, the original support-approach fixture was
strengthened to put an injured ally opposite all attack goals. It exposed a real
implementation defect: hypothetical support goals passed an entire MapCell as
UnitState.cell, so exact x/y admission rejected the preview. The one-line repair
projects `{x,y}`; the reader remains strict. All **45 AI + 14 dungeon-battle tests**
and both type scopes pass. The original aggregate remains frozen at its checkpoint;
it does not qualify this newly exercised branch.

Complete before/after consumer packets are equal for Ranger 1, Mage 17, Shaman 3,
guardian 4, the healed Fighter boundary and dynamically selected victory fixtures:
commands, events, states/RNG, progression/party and replay data. Canonical hashes
are retained in `tmp/issue166/consumer-equivalence.json` pending the final ledger.
Static reach is the non-attack support-goal branch only; standalone/short-run
rosters have no Shaman and ordinary-enemy planning is untouched. Fresh final-source
units/build/header/base-path/performance and Shaman/Fighter six-profile checks
will accompany reuse of demonstrably unchanged consumer histories.

## Source and export evidence

Legacy revision: `e9433f6b608ae6b2d95418615cce9cf17dadcf74`. Asset registry:
[assets.ts](../../../src/content/assets.ts). Source files are exact Git blobs.

- Sprite: `art/units/goblin_shaman.png`, SHA-256
  `43d287a0d5e801bb4fdcfe007e94aae424472ccdb01619eb02d35906753a9d3f`;
  64×80 RGBA, alpha bounds (4,13)–(60,80), anchor (32,76), 7,817 bytes.
- Portrait: `art/portraits/goblin_shaman_portrait.png`, SHA-256
  `55cc13df61bab3b51581a5be52c42c21a7c5b376607ef92dbd6b3f8901efbbe2`;
  1254×1254 RGB, 3,245,364 bytes.
- Full-frame Lanczos 96×96 optimized RGB PNG export using Pillow 10.2.0:
  SHA-256 `c81d18f2d869258283e8c2d969a9c179fe6aaa9d14f4408b1af61f3486e4b5e0`,
  20,391 bytes. No crop, repaint or new generation.
- Local sprite/96px portrait inspected: staff/hood/foliage silhouette and matching
  hood/staff portrait are visible. Original bottom-edge foliage is preserved;
  board/HUD integration screenshots remain pending.
- Runtime eager-load delta: 28,208 image bytes plus two requests. The full portrait
  source is retained in public output but not requested by the asset loader.

## Validation log

- Strict OpenSpec validation passed before implementation (nine tasks pending).
- Asset import setup: the Contents endpoint omits large-file base64 for the
  portrait; initial import therefore failed. Git Blob API supplied the original
  bytes, whose dimensions/hash now validate. No corrupted export was retained.
- First content run: 198 passed / one failed expected rules-identity snapshot.
  The new catalog actor/Basic Attack owner deliberately changes identity from
  `sha256:d5e89333b0a4c8c7e88bb69c0bf2065ad67ebbf6b996a47ad984f27447bdee16`
  to `sha256:89149927608032823b58b67683a15edb63e9711bb1b42e04e7df4bb670d27bb9`.
  Updated only that identity assertion; all authored map hashes remain unchanged.
- Initial build failed because the local npm launcher resolved the wrong nested
  CLI path. A task-local ignored npm shim points to the installed native CLI.
  The next build passed 222 content tests then found two synthetic catalogs and
  one Dexterity lookup missing the new closed ID. Their fixtures now preserve
  the complete base catalog; no new spawns or combat behavior were added.
- Final focused content command: `npm run test:unit -- tests/unit/content.test.ts
  tests/unit/authoredContent.test.ts tests/unit/abilityValidation.test.ts
  tests/unit/authoredEncounters.test.ts tests/unit/dungeonEncounters.test.ts`:
  **199/199 passed**. Existing combat/turn fixture suites: **28/28 passed**.
- Content validation as part of the build: **222/222 passed**. Both TypeScript
  scopes passed after fixture repair, then `npm run build:bundle` passed using
  those unchanged prerequisites. Existing Vite future native-loader and chunk-size
  warnings remain warnings; no compiler/bundle error remains.
- `npm run test:build -- tests/integration/buildHeaders.test.ts`: **2/2 passed**,
  proving root and prefix hashed exports/cache rules include both new assets.
- Packaged Chromium 1243 could not spawn on this Windows host: all 27 selected
  cases failed at browser launch before app execution. The full original
  [failure report](foundation/browser-launch-failure.json) is retained.
- With `PLAYWRIGHT_CHROMIUM_EXECUTABLE=C:/Program Files/Google/Chrome/Application/chrome.exe`,
  one desktop content-success smoke passed, then the original selection passed
  **27/27**, zero skips/retries/flaky cases. Exact command:
  `node node_modules/playwright/cli.js test tests/content-loading.spec.ts
  tests/battle-board.spec.ts tests/public-asset-base.spec.ts -g 'content smoke|default authored board renders|collector cold/warm|public assets respect'
  --reporter=line,json --output=tmp/issue166/foundation-browser-repaired-artifacts`.
  [Raw report](foundation/browser.json). Preview/root base, one worker, installed
  Chrome **155.0.8059.41**, Playwright **1.63.0**, Node **24.19.0**, npm **12.0.2**,
  Windows x64; browser/device emulation only. Ordinary unconfigured telemetry.
- [Portrait](foundation/portrait.png) and [landscape](foundation/landscape.png)
  screenshots reviewed: board fit, units, selection and HUD remain readable and
  unchanged. These screenshots prove the unchanged canonical board, not Shaman
  battle placement. New pair loading/decode/dimensions are covered by loader success.
- [Source/build inventory](foundation/inputs.json) binds the tested dirty source
  at starting commit `b5b450f`, including all untracked asset bytes. Relevant input
  hash before/after browser verification is identical:
  `61aafd0995baf926a2311e9b0b2d07f2b1b76f8ef3fed468ca47f1b7f5b5e822`.
  Build metadata still names `b5b450f`; later commit/doc metadata reuses these
  functional results after comparing all recorded input hashes. This is focused
  foundation readiness, not a full regression or complete #166 acceptance.
- Raw setup/unit/build logs and extra screenshots remain under ignored
  `tmp/issue166/`; required full qualification and production Shaman journey
  remain tracked in the plan/OpenSpec tasks.
