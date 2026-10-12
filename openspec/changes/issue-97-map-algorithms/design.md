# Design

## Context

See proposal.md for motivation and issue/branch identity. Current `generate.ts` exposes binary topology, validation and a local-state rooms RNG with four attempts; `view.ts` owns seed parsing and renders simple cells. Existing tests independently flood-fill seeds and check map-only route/storage isolation. Main specs have no map capability; the unarchived #87 delta remains the baseline reference. PR #93 is merged.

## Goals / Non-Goals

Goals: extend the current pure generator boundary and controls with two distinct layouts, while preserving Rooms cell signatures and seed behavior. Non-goals: implementing biome/art dropdowns or terrain layers, campaign/POI graphs, additional legacy algorithms, persistence, dependency/framework changes or battle edits.

## Decisions

### Typed dispatch with compatible Rooms behavior

Add a small typed constant catalog of stable type IDs, labels and algorithm versions and dispatch through `generateMap(seed, type = 'rooms')`. Keep `version` as algorithm version and add `type` to generated results. Retain the existing rooms draw order, attempt sequence and fallback cells exactly. Unknown runtime type input and invalid seeds throw RangeError rather than silently selecting another type. Preserve `validMapCells` as common validation; no generic configurable generator framework.

### Independently implemented bounded algorithms

Use conceptual references from the pinned legacy generator/tests in issue #97 and the #87 rot.js comparison. No source copying or new dependency. Each new attempt owns a fresh deterministic RNG derived with fixed uint32 mixing of input seed, a documented type-specific constant and attempt index. Do not reseed Rooms. Treat the mixing formula/draw order as part of the algorithm version.

Random walker: carve inside the 18×18 interior from a seeded interior start, then make at most 2048 cardinal steps with occasional one-cell side branches and a mild persistent direction bias. Stop carving when 160 unique open cells are reached; branch and step loops remain fixed-bounded. Connected carving ensures one component; validate density and retry when necessary. No open-cell target can create an unbounded loop.

Cellular: initialize interior openness near 48%, perform four synchronous smoothing passes using eight-neighbor counts, and retain blocked perimeter. Connect disconnected components by deterministic Manhattan corridors: at most 324 component/repair iterations, each flood-fill scanning at most 400 cells and each corridor at most 34 steps. Validate 60–320 cells; retry invalid density. Connectivity is four-direction even though smoothing uses eight neighbors. Deterministic ordering prevents Set/map iteration or tie choices from becoming accidental algorithm changes. Tune constants only within these declared bounds to meet the existing acceptance matrix; record final constants and measurements.

After four failed attempts, use the existing validated 80-cell rectangle fallback for either added type, preserving requested type/version and setting fallback true. A shared fallback is sufficient because recovery need only be valid, deterministic and explicit. Force exhaustion with the existing RNG mock pattern or a narrow internal candidate seam only if genuinely needed; do not expose user-facing generation knobs for tests.

### Transactional UI selection

Reuse the existing form. Centralize valid-seed parsing for submit and change; keep a committed seed/type pair. On valid dropdown change, render the chosen type with the displayed seed and commit only on success. On invalid input restore the dropdown to committed type and preserve map/input with feedback. Generate uses the chosen type; New seed keeps type and retains the existing entropy/fallback behavior. Native labeled select gets existing input-style focus/minimum 44-pixel sizing. Show seed/type/version/fallback metadata and keep current grid dataset version compatibility while adding type.

### Shared integration boundary

Document the approved contract in QA/README: layout data owns binary cells; sibling #99 owns separate terrain treatment with grassland-v1/forest-v1/desert-v1 and its isolated seed-derived randomness. Defaults are rooms/grassland/simple. Every initial combination retains topology. #98 inventories one actual legacy style, assigns its stable ID then, and uses readable Simple fallback for missing coverage/assets. Art never changes map data or consumes generation RNG. No dormant biome registry or presentation pipeline is built in #97; the current simple appearance is the retained baseline.

## Risks / Trade-offs

- Cave repair may erase visual differences or overfill cells → deterministic component repair, density validation, seed matrix/fallback frequency and inspected representative screenshots before acceptance.
- Walker bounded steps may fall short → bounded retry and validated explicit fallback; report frequency rather than masking it.
- Refactoring rooms may change historical output → record baseline signatures from pre-change main and assert unchanged output independently of repeat-call checks.
- Invalid input can leave a displayed type inconsistent with the map → transactional committed selection and browser assertions.
- Browser emulation does not certify physical devices → record actual tested profiles and limits; no hardware certification claim.

## Migration Plan

No persisted data or URL contract changes. Ship through a reviewed PR against main; rollback reverts this issue's commits. No production deployment is authorized by this plan.

## Files and Proof

Modify existing generator/view/style and map unit/browser tests; add issue QA and update README. No package change expected. Unit matrix covers every type, independent validity/connectivity, repeatability, 90% diversity, baseline Rooms signatures, type metadata/error handling, bounded forced fallback, clock independence and battle RNG sentinel. Browser checks cover switching/reproducing all types, valid/invalid seed controls, New seed selection retention, entropy failure, keyboard/mobile layout, direct entry/refresh, non-root base behavior and map/battle route/storage isolation. Record representative screenshots and raw/gzip map chunk delta against base.

Run focused map unit/browser checks while developing, then `npm run test:unit`, `npm run validate:content`, `npm run typecheck`, `npm run build`, full configured `npm test`, `openspec validate issue-97-map-algorithms --strict` and `git diff --check`. Report actual results and unverified criteria. User approved this implementation plan on 2026-10-12.

## Scope review

Ablation keeps typed dispatch, bounded algorithms, native controls and existing test infrastructure because each maps to acceptance. It excludes a plugin framework, new dependencies, sibling implementations and production work. Outcome, files, non-goals and proof are specified above; no extra approval stage is added beyond the workflow's concrete plan approval.
