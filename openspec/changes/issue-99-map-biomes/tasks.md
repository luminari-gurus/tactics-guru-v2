# Tasks

Issue: https://github.com/luminari-gurus/tactics-guru-v2/issues/99
Caller: dubstylee. Branch: work/issue-99-map-biomes. Base: main be7094aa105fb2b21c90610f411e16c4ef15ae25.
Approval: user explicitly approved this published plan in the task conversation on 2026-10-12 (America/New_York).

## 1. Pure biome contract
- [x] 1.1 Add versioned biome catalog and pure immutable six-treatment mapping in src/map/biomes.ts; verify repeated treatment, frozen-input preservation and unknown-biome rejection with focused unit tests (AC1/3).
- [x] 1.2 Extend tests/unit/overworldMap.test.ts for all nine combinations over the design seed matrix, independent topology checks, exact input equality, fallback retention, no entropy/clock access and battle next-RNG isolation; retain the Rooms fingerprint (AC3/4).
- [x] 1.3 Write docs/overworld-map.md roster, terrain meanings, legacy pinned reference limitations, defaults, versions and sibling art contract; verify source references and link it from README (AC1).

## 2. Controls and Simple presentation
- [x] 2.1 Add Biome select and retained treated data in src/map/view.ts; commit seed/type/biome transactionally, roll back both selects on invalid seeds and expose metadata. Browser tests verify edited seeds, Generate, New seed, returning to previous biome and entropy-failure fallback (AC2/3).
- [x] 2.2 Add three Simple palettes and restrained blocked motifs in src/map/style.css, matching legend and documented Simple fallback contract. Browser assertions and inspected screenshots for all nine combinations at desktop/mobile portrait/landscape verify readable semantics, keyboard focus, 44px controls and no overflow; preserve default grassland appearance (AC1/5).
- [x] 2.3 Extend map browser route/isolation checks for nine combinations, root and prefix direct entry/refresh, untouched save keys and battle startup regression. Document current Simple-only art compatibility; imported artwork verification remains #98 (AC2/5/6).

## 3. Integrated validation and delivery
- [x] 3.1 Run focused checks, complete unit/content/browser suites, both typechecks, root production build, prefix build/preview map checks, strict OpenSpec and git diff --check. Record actual commands/results, screenshots and any limitations in docs/qa/issue-99-map-biomes.md against every acceptance criterion (AC6).
- [x] 3.2 Review issue scope and all artifacts/tasks against final changes, commit only this issue, push and create/attach PR with approval and validation evidence. Use Closes only when all criteria are verified; otherwise draft with Refs and remaining work.

## Workflow follow-up
- Do not merge or archive before merge. No release or production operation is authorized.

Delivery: [PR #101](https://github.com/luminari-gurus/tactics-guru-v2/pull/101), implementation commit `ae399d8`. All eight tasks completed; no merge or archive performed.
