# Issue #154: deterministic overworld markers

Planning date: 2026-10-20 (Asia/Jerusalem).
Source baseline: `main` at `1fee092d184fd99998f8e5e2766d45c216c6d5d8`.
Work item: [#154 — Spawn one player marker and three enemy markers](https://github.com/luminari-gurus/tactics-guru-v2/issues/154).
Delivery branch: `branch/issue-154-overworld-markers`.
Status: implementation and focused route checks complete; finishing visual matrix, base-path proof and review delivery.

## Implementation handoff (2026-10-20)

- Worktree: `C:/Users/apexw/.codex/worktrees/issue-154-overworld-markers/Tactics-Guru`.
- Refreshed `origin/main` remains `1fee092`; the branch starts with planning commit `1e4a06c`.
- Live #154 matches this plan. No existing PR for the branch.
- Using OpenSpec change `issue-154-overworld-markers` (spec-driven), as explicitly requested for implementation.
- Ablation retains the pure model, complete-state commits, CSS markers and existing test suites.
  Phaser/sprite/image generation is unnecessary for the DOM route.
- Model checkpoint: `src/map/state.ts` and non-DOM inclusion implemented. All 46 focused unit tests pass,
  including 2,340 seed/type/biome placements, nine pinned position cases, immutable inputs, four selection
  draws, malformed layout failure and unmocked placement on all three forced generator fallbacks.
- `npm run typecheck` passes. Before-edit terrain SHA-256 values are pinned in the suite:
  Rooms `d7dbea289cd9cdec54837ad1b0367a41a894b1503c5b9f862a4d54da5da6c8b0`,
  Walker `dc2715ef5fc6b56526bd19300eea7157bada57f32ebdf580eff0ac70d3d3d893`,
  Cellular `31583dad387235929096a42f680f782551474198495569c9e6c54710f23dc88e`.
- Commands run through WSL Node 24/npm because Windows PATH has no npm/OpenSpec. `npm ci --no-audit --no-fund`
  completed; unrelated PostHog CLI postinstall was blocked by npm policy and is not needed for this work.
- Published model checkpoint: `6a43bf3`, draft [PR #156](https://github.com/luminari-gurus/tactics-guru-v2/pull/156).
- Route/CSS integration is implemented. Desktop marker tests pass (5); the first full preview matrix passed
  56 cases but exposed one test-helper race when an art redraw detached cells. The helper now reads all
  projections atomically from the retained grid. The final full matrix passes 57 cases (3 intentional
  dev-only skips), including all desktop/portrait/landscape marker and existing map regressions.
- Inspected all 54 art/type/biome figures via nine contact sheets, plus the 320px full-page capture.
  Shapes, edging, terrain, wrapping legends and scrollable controls are readable without overlap.
- Controlled dev placement failure passes (1): initial unavailability, successful retry, rollback on type/biome
  regeneration, feedback surviving old artwork completion and final recovery.
- `npm run build` passes (190 content tests, both typechecks, Vite). WSL needs explicit `GIT_DIR` pointing at
  `/mnt/c/Users/apexw/OneDrive/Desktop/Projects/Tactics-Guru/.git/worktrees/Tactics-Guru12`
  and `GIT_WORK_TREE=$PWD` because this Windows-created worktree's `.git` file uses a Windows path.
  For line-ending/mode parity also set `GIT_CONFIG_COUNT=2`, `GIT_CONFIG_KEY_0=core.autocrlf`,
  `GIT_CONFIG_VALUE_0=true`, `GIT_CONFIG_KEY_1=core.filemode`, `GIT_CONFIG_VALUE_1=false`.
  These are command-local environment settings; repository configuration is unchanged.
- Next: finish screenshot review and configured `/prototype/` checks, retain selected QA evidence, update
  final documentation, commit/push UI work and mark PR #156 ready. No deployment or hardware claims.

The previous [issue #145 / PR #150 handoff](plan-before-issue-154.md) is preserved byte-for-byte. It is historical: PR #150 is already merged in this baseline, despite its handoff's pre-merge wording.

## Outcome

Every successfully committed `/map` world contains exactly one player and three enemies, with stable IDs and distinct walkable positions in its connected playable area. Placement is reproducible, bounded and independent of terrain generation and artwork. The existing controls reset or preserve this state according to the rules below. Markers remain readable and described on desktop and mobile.

The existing prototype remains an inspection screen: generate or inspect a map, choose its type/biome/art, and identify its occupants. There is no movement or encounter loop in this change.

## What the current code actually establishes

- [Route entry](../../src/main.ts) dynamically imports `startMap` for `/map` beneath the configured base. This route uses a DOM/CSS grid, not a Phaser scene. The shared entry now initializes optional telemetry and mounts its privacy control; the older documentation's storage-isolation wording must be read alongside the current test allowing the privacy opt-out read.
- [generate.ts](../../src/map/generate.ts), particularly `generateMap` and `validMapCells`, already provides three versioned 20×20 algorithms, 400 row-major binary cells, a blocked perimeter, 60–320 walkable cells and cardinal connectivity. Each algorithm has bounded attempts and a validated 80-cell fallback. Placement does not need to repair terrain, carve corridors or discover a new playable component.
- [biomes.ts](../../src/map/biomes.ts) maps layout to a separate terrain layer without changing walkability or consuming RNG. Consequently a biome-only change at the same seed/type has identical legal spawn cells.
- [view.ts](../../src/map/view.ts) currently retains only a `BiomeMap`. Initial entry, `applySelection` and New seed generate it. Art selection only calls `render`. `render` replaces all 400 cell elements, and [art.ts](../../src/map/art.ts) invokes that same render after asynchronous image decode succeeds or fails. Storing markers solely in those elements would lose them; placing inside render would reset them.
- Current seed semantics are more specific than "reset on change": type/biome changes apply a valid pending seed; art changes preserve a valid pending seed without applying it; invalid seed edits reject type/biome/art changes and retain committed choices. New seed retains committed type/biome/art and has a deterministic increment fallback when browser entropy fails or repeats the current seed.
- [style.css](../../src/map/style.css) fits 20 columns into a responsive square with 1px gaps. Small mobile cells cannot carry detailed characters or substantial text. The current legend does not wrap, so adding two marker keys requires wrapping.
- [overworldMap.test.ts](../../tests/unit/overworldMap.test.ts) already covers deterministic generation, independent connectivity, fallbacks, biome invariance and a pinned Rooms fingerprint. [overworld-map.spec.ts](../../tests/overworld-map.spec.ts) already exercises controls, late artwork, failure fallback, route isolation, asset base paths and screenshots in the three [configured projects](../../playwright.config.ts). Extend these files.
- #87 and #96–#99 are closed, and their functionality is present on this baseline. [#155 — enemy movement](https://github.com/luminari-gurus/tactics-guru-v2/issues/155) is open and explicitly depends on #154. It needs authoritative IDs/positions, not movement scaffolding in this issue. No existing linked branch for #154 was present at planning time.

### Planning evidence

A dependency-free Node 24 source probe executed the actual `generateMap` and `applyBiome` exports for the existing 260-seed corpus (`0..255`, `12345`, `424242`, `2147483648`, `4294967295`):

- 780 layouts passed independent cardinal flood-fill, size/open-count and repeated-generation equality checks.
- 2,340 biome treatments preserved layout cells; generation inputs remained unchanged.
- Observed open-cell counts were 65–270, comfortably above four.
- The Rooms matrix SHA-256 matched the existing test: `d7dbea289cd9cdec54837ad1b0367a41a894b1503c5b9f862a4d54da5da6c8b0`.

This is current-source baseline evidence, not a run of Vitest, not exhaustive coverage of all uint32 seeds, and not marker/browser acceptance. The probe used Node's TypeScript support and a `node:module` resolve hook for the source's extensionless relative imports; it added no application dependency or file.

## Implementation decisions

### 1. One small model owns map and marker state

Add `src/map/state.ts` with exported readonly `OverworldMarker` and `OverworldState` types and a pure `createOverworld(map: BiomeMap)` factory. A state contains the committed map, placement version `markers-v1`, and four markers in fixed order. Each marker has a stable ID (`player`, `enemy-1`, `enemy-2`, `enemy-3`), a `player`/`enemy` kind, and integer `{ x, y }` coordinates. Derive row-major indices when needed rather than storing competing coordinate representations.

The factory returns an explicit success/state or failure/reason result. It has no DOM, time, browser entropy, storage or renderer dependency. The view retains this state; render reads it and projects IDs/positions into data attributes for inspection. No window singleton, entity registry, event bus or new session class is needed. #155 can later transform this same state without reading coordinates back from DOM elements.

### 2. Bounded placement with separate deterministic entropy

1. Validate the expected dimensions and existing layout contract using `validMapCells`; reject invalid/disconnected/undersized input explicitly. Reuse this fixed-size validator rather than introducing another flood-fill implementation.
2. Collect walkable indices in row-major order from the already generated layout.
3. Initialize a fresh local RNG with `seedRng((map.seed ^ 0x4d41524b) >>> 0)` using the existing [pure RNG functions](../../src/domain/rng.ts). The fixed `MARK` salt and policy are owned by `markers-v1`; no terrain RNG instance is shared.
4. Select four cells without replacement using the first four steps of a Fisher–Yates shuffle on the candidate copy. At step `i`, choose `i + nextUint32(localRng).value % (count - i)` and swap it into slot `i`. Assign the fixed IDs in that order. This takes four selection draws after the existing RNG warmup, without retries or rejection sampling.
5. Convert the four indices to coordinates and return the complete state. Do not mutate input cells/terrain or call terrain generation again.

The placement key is layout seed/type/version plus `markers-v1`; the layout itself supplies the candidate set. Biome and art are deliberately excluded. Same seed/type/layout/version yields the same IDs and positions across all biomes and art states. Changing seed/type can reproduce some positions by coincidence; tests must verify the policy, not require every marker to move. Modulo selection is sufficient for these noncompetitive spawn markers; uniform statistical sampling is not an acceptance requirement.

Do not impose minimum distances, reserved start zones, enemy behavior assignments or a center-spawn rule. None is required by #154. A future placement behavior change must bump its own version without changing terrain versions.

### 3. Commit complete worlds; render never spawns

Replace the retained map in `startMap` with the retained overworld state and a single small regeneration path: existing generation → existing biome treatment → marker factory → commit complete state. Use it for initial entry, Generate, map-type change, biome change and New seed.

- **Initial entry/reload:** seed 1, Rooms, Grassland, Simple, deterministic four-marker state; no persistence.
- **Generate:** apply valid displayed seed/current selections and replace the whole state. Repeating the same inputs reproduces the same marker positions.
- **New seed:** retain existing entropy/fallback policy and committed choices, then create a new whole state.
- **Type/biome change:** apply the valid displayed seed and regenerate/reset the whole state. A biome-only reset intentionally reproduces positions because its topology is unchanged; returning to a previous seed/type reproduces its original positions.
- **Art change or late decode success/failure:** render the retained state, with no placement/generation call or marker mutation. Retain pending seed edits, validation feedback and the currently committed controls.
- **Invalid input:** preserve the entire previous state and existing validation behavior.
- **Placement failure:** never commit a partial/unpopulated world or silently regenerate terrain. Retain the last complete world when available, restore committed control choices and show a specific message in the existing live status explaining that marker placement failed and the previous world is unchanged. On initial failure, show an unavailable/empty grid with that message and usable retry controls. Store failure feedback so a later art callback cannot overwrite it. Clear it after a successful regeneration.

Keep the existing artwork loader/cache unless integration reveals a concrete defect; its callback already reads current state. Do not add a second loading lifecycle or image-request coordinator.

### 4. Compact, independent marker presentation

Keep terrain as the existing 400 direct grid children with unchanged `.map-floor`/`.map-wall` class meaning and terrain/background data. Add marker ID/kind/coordinate data to occupied cells and draw a positioned CSS pseudo-element above their terrain background. This avoids changing grid geometry, obscuring terrain identity, adding marker image requests, or breaking the existing tests that count `span` descendants and compare terrain class names.

Use a cyan circle for the player and coral diamond for enemies, following the established player/enemy roles in [DESIGN.md](../DESIGN.md#world-and-tactical-colors). Use map-scoped CSS variables and dark/light edging so shape and boundary remain visible over grass, forest, sand and Legacy 8-bit art. Both shape and color distinguish the roles. Fit markers within their cells at the narrowest supported viewport; do not add animation, sprite assets, fonts or interactive hit targets.

Extend the existing legend with matching Player and Enemy shapes/counts and let it wrap on narrow screens. Retain walkable/blocked keys and their actual fallback presentation. Update the grid's accessible summary with the marker counts and associate a concise text description outside the `role="img"` subtree listing each marker ID and its coordinates. Internal coordinates are zero-based; human labels use one-based row/column. Hidden terrain cells alone cannot provide accessible marker descriptions.

Markers remain noninteractive and outside the tab order. Existing controls retain their keyboard, focus and 44px touch-target behavior. Preserve the current page layout and keep the grid unobstructed.

## Files and delivery sequence

1. **Pure state and focused proof (2–3 hours):** add `src/map/state.ts`; extend [overworldMap.test.ts](../../tests/unit/overworldMap.test.ts); include the new pure module in [tsconfig.domain.json](../../tsconfig.domain.json)'s non-DOM check. Leave generator/RNG algorithms and versions unchanged.
2. **Controls and presentation (2–3 hours):** change [view.ts](../../src/map/view.ts) and [style.css](../../src/map/style.css) for retained state, complete commits, failure feedback, shapes, legend and accessible descriptions.
3. **Browser acceptance and repair (3–4 hours):** extend [overworld-map.spec.ts](../../tests/overworld-map.spec.ts), run the focused matrices below, inspect screenshots and fix any marker/readability/reset regressions. Reuse existing tooling/configuration.
4. **Document and deliver (1–2 hours):** update [overworld-map.md](../overworld-map.md), its short [README entry](../../README.md), and this plan with actual results. Add `docs/qa/issue-154-overworld-markers.md` and selected evidence images only when there are real results to retain. Publish a focused implementation PR referencing #154 and the model handoff to #155.

These are checkpoints for one focused feature branch, not a mandatory PR stack. Recheck current `main` and any concurrent `/map` changes before implementation.

**Estimate: 8–12 focused engineering hours (about 1–1.5 working days), including tests, screenshot review, documentation and PR preparation.** Allow up to a second working day if device/layout or delayed-art regressions need iteration. Review queue time, unrelated failing suites, deployment, #155 movement and new artwork are excluded.

## Proof and acceptance coverage

Extend the existing suites rather than introducing a second harness.

### Pure/model checks

- Across the current seed corpus, all three types and all three biomes: exactly four unique IDs, one player/three enemies, integer in-bounds coordinates, distinct walkable cells and shared cardinal connectivity using the existing independent test flood-fill.
- Equal input produces equal state; fixed representative marker snapshots pin `markers-v1`. Biome-only changes preserve marker IDs/positions, while new seeds/types match fresh factory results. Check normalized zero/max uint32 seeds.
- Frozen input remains unchanged; placement and rerendering cannot affect terrain or an existing battle RNG state. Preserve the Rooms fingerprint and capture comparable Walker/Cellular baseline fingerprints before implementation so all three layout streams stay unchanged.
- The existing forced generator fallback produces four valid placements. Mock only generation during that fixture, then restore the RNG mock before evaluating the real marker policy.
- Empty, fewer-than-four, disconnected and malformed/dimension-mismatched layouts return explicit failure with no partial state. Confirm bounded draw count and no `Math.random`, time or browser entropy dependence.

### Real route and browser checks

- Direct `/map` entry/reload shows exactly four matching marker projections. Compare their IDs/coordinates to the pure model, not just counts. Exercise Generate (including same-seed repeat), New seed and its entropy fallbacks, valid pending edits, type/biome changes and return-to-seed replay.
- Invalid seeds preserve IDs, coordinates, terrain, committed controls and error feedback. Art changes with an unapplied valid seed preserve the committed world.
- Extend the existing 3 types × 3 biomes × 2 art styles loop with placement and accessible-description assertions. Keep all terrain/legend/fallback assertions.
- Hold image requests, regenerate/change type and biome, switch art, then release old requests. Verify the latest state survives success, network failure and corrupt-image decode. Also retain the existing late-load/invalid-input regression.
- Exercise explicit placement failure on initial entry and regeneration, then retry successfully. Use one focused development-server Playwright case that intercepts the state module to return a controlled failure; add no production fault-injection flag. Prove prior complete state and failure feedback survive art completion.
- Capture and inspect screenshots in `desktop`, `mobile-portrait` and `mobile-landscape`, covering all combinations through the existing art matrix and a narrow 320px viewport spot check. Inspect marker shapes/edging at actual cell size, legend wrapping, overlap/clipping, scrolling, focus and usable controls. Screenshots must show the markers, not merely prove that DOM attributes exist.
- Run accessible-name/description assertions and native keyboard/touch control interactions. Do not claim screen-reader or physical-hardware testing from these checks.
- Preserve existing route/load-failure tests, configured-base asset behavior, no map assets on the battle route and no battle/audio initialization on `/map`. Preserve the currently allowed privacy opt-out read; marker logic adds no storage access.

### Commands and evidence

After dependency setup, use the existing scripts and installed Playwright browser (or the documented `PLAYWRIGHT_CHROMIUM_EXECUTABLE` override):

```text
npm run test:unit -- tests/unit/overworldMap.test.ts --maxWorkers=1
npm run build
npx playwright test tests/overworld-map.spec.ts
```

Run the controlled failure case separately with `PLAYWRIGHT_SERVER_MODE=dev`, targeting its name and the desktop project; production chunk-load-failure tests require preview mode and should not be included in that dev invocation. Use the existing configuration's `PLAYWRIGHT_BASE_PATH=/prototype/` with a matching `npm run build -- --base=/prototype/` for relative-navigation marker/art checks; do not include older tests that intentionally navigate to absolute `/map` in the prefixed run. In PowerShell, set these values using `$env:NAME = 'value'`, then remove/restore them after each command group.

Record actual commands, source commit, browser/viewport, pass/fail counts and screenshot paths in the QA record. `npm run build` already validates content and both TypeScript configurations. The normal `npm test` has unrelated posttest suites; invoke the focused Playwright file directly here. Broaden testing only if changes touch shared routes, domain/RNG code or reveal a concrete cross-feature risk. Finish with document-link and `git diff --check` validation.

Browser/device emulation is sufficient under [AGENTS.md](../../AGENTS.md). At planning completion no marker acceptance or browser execution is claimed.

## Ablation: what survives and what is removed

- **Keep the pure state boundary:** omitting it makes redraws authoritative and leaves #155 without stable marker state.
- **Keep deterministic sampling and explicit failure:** omitting them leaves reproducibility, unique placement and failure acceptance unmet. Reuse the validator/RNG instead of building a spawn framework.
- **Keep complete state commits and pending-input behavior:** omitting them can mix old markers with a regenerated map or unexpectedly apply an edited seed during art loading.
- **Keep shape/contrast, descriptions and screenshot review:** color or DOM counts alone cannot establish visibility across the supported art/viewport matrix.
- **Simplify rendering to CSS overlays on existing cells:** a new Phaser scene, canvas renderer, entity component system or SVG overlay grid supplies no required behavior.
- **Drop generated artwork and sprite production:** stable geometric markers meet the requested identity/readability goal without new assets or licensing/loading work. Game Studio foundations/UI/playtest guidance applies; Phaser and sprite/image generation are unnecessary for this DOM route.
- **Drop movement, pathfinding, detection, timers, player controls, encounters/combat, persistence, telemetry events, route redesign and procedural terrain changes:** these are excluded by #154 or belong to #155/other work. No speculative movement settings or save schema are introduced.
- **Keep requested OpenSpec tracking:** the implementation request explicitly adds OpenSpec; the change mirrors this plan without another approval stage. Drop backlog sweeps and extra frameworks.

## Completion boundary

This planning delivery consists of this plan, the preserved prior handoff, a published branch and native issue linkage. It does not implement or close #154.

Implementation is complete only when every proof item above has evidence, existing map contracts still hold, documentation describes the final policy, and the focused PR covers all seven acceptance bullets in #154. #155 remains a separate dependent issue and should reference the exported model after #154 lands; this branch must not claim to resolve enemy movement.
