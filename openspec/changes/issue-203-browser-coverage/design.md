# Design

## Context

See proposal.md for motivation and branch identity. `playwright.config.ts` currently multiplies every default case across desktop, Pixel portrait and Pixel landscape; one worker serializes all work. `scripts/verification-batches.mjs` builds nine whole-file/project batches and checks exact coverage against canonical discovery. Its source file-group inventory comes from the historical #200 investigation, so existing partition correctness must be proven after selection changes without rewriting that historical evidence.

The default discovery on base main has 693 IDs. WebKit acceptance, exploration and health-bar configurations replace the base projects. Fixtures inherit base projects. Prefix/dev asset stages and telemetry also depend on configurations; all consumers require before/after discovery checks even if their execution sets remain equivalent. Active PR #229 adds audio cases separately and PR #139 changes mobile HUD coverage; neither is a reason to edit their assertions here.

## Goals / Non-Goals

**Goals:** implement explicit reviewable selection metadata, retain stable titles/IDs of surviving cases, map every removed profile execution, prove aggregation compatibility and measure affected executions.

**Non-Goals:** fixture changes, audio equivalence refactors, blanket single-device execution, changed gameplay, assertion timing, retries, rendering budgets, parallel hosts or CI deployment. Unknown device dependence means retaining the case, not expanding this change to redesign its assertions.

## Decisions

### Use two narrowly applied metadata tags

Use Playwright details metadata tags (not title suffixes) so retained titles and IDs stay stable. `@canonical` means desktop-only within the default Chromium projects. `@fixed-viewport` excludes only the redundant mobile-landscape instance. Apply project-level `grepInvert` only in the base mobile projects, preserving existing project names, device descriptors, workers and retry policy.

The nine canonical cases are the three failure cases in `assets.spec.ts`, the four `missing engine chunk` route cases in `boot.spec.ts`, and the two error/loading-delay cases in `engine-fit.spec.ts`. They exercise controlled resource failure/delay without touch, DPR, layout geometry or backend-specific assertions. Their exhaustive failure assertions remain on desktop; existing content-loading error/layout cases and boot smoke continue on mobile. No other cases are classified as device-independent without further evidence.

The five `layout.spec.ts` viewport-generated cases receive `@fixed-viewport`. Each calls `setViewportSize` before navigating. Pixel portrait and landscape otherwise have identical UA, touch, mobile, density and browser settings. Keep the full five-viewport corpus on desktop and mobile portrait, preserving desktop-vs-mobile differences. Keep the separate CSS gesture/context-menu case on every profile. This is not a substitute for actual touch suites: input, move, battle, run and dungeon touch/orientation coverage remains selected.

Expected default count: 693 → 670 (18 canonical duplicates plus five mobile-layout duplicates removed). This is a conservative reduction, not a promised epic-wide speed target. Prefer native metadata/project selection over runtime skips, title matching tables or a new test framework. A new case without tags keeps the existing matrix by default.

### Make selection loss explicit

Retain baseline and candidate discovery for default, WebKit acceptance/exploration, health bars, fixture configs, telemetry in both modes, root/prefix asset modes and dev placement. Record file, full title, test ID, project, effective configuration and mapping for each of the 23 expected removals. For canonical mappings explicitly state that DPR/touch assertions are absent, rather than asserting entire devices are identical. For layout mappings demonstrate effective viewport and complete device-option equivalence.

Add a focused Node tooling contract alongside existing `tests/tooling` contracts using real `--list --reporter=json` discovery. It must detect wrong project exclusion, changed retained IDs, unclassified omissions, accidental WebKit/fixture/telemetry loss and batch missing/duplicate IDs. Do not silently bless a fresh snapshot when an assertion fails. Existing exactCoverage remains authoritative; change batching only if its real discovered partition fails. Do not rewrite historical #200 receipts or rebalance batches without measured need.

### Qualification follows the affected consumers

Before edits, record the 42 affected original executions: nine canonical candidates × three profiles plus five fixed-viewport candidates × three profiles. Measure them against the same host, root preview build, browser versions, one worker and zero retries. After edits measure the retained 19 executions. Include missing landscape baseline cases directly. Record setup/server wall time separately where the existing receipt tools support it. Preserve every failure and interrupted attempt; use exact-base case comparisons to attribute failures.

Shared matrix selection warrants full affected-coverage qualification under `docs/verification-policy.md`, not only the small filtered timing run. Execute the final default Chromium selection through resumable serial batches on qualified self-hosted capacity; do not use the old monolithic timeout path or GitHub-hosted fallback. Discover all other canonical full-verification stages and compare their effective inputs/selections. Reuse source-bound raw evidence only for demonstrably unchanged consumers; run missing/invalidated fixture/dev, WebKit, telemetry, health-bar and asset-mode obligations. Keep performance evidence unchanged unless its relevant inputs or capture behavior change. Verify actual build metadata before claiming reuse.

Run selection/batch/full-runner tooling contracts, both TypeScript scopes and a successful production build. Keep representative legal victory/defeat journeys and real touch/focus/audio/persistence coverage in final full selection. Publish source-bound coverage and timing reports, with the older #200 failed full capture still explicitly failed. The local `.env` capability is missing/invalid and treated as `none`; no physical device is required under AGENTS.md. Devices used for acceptance are browser emulations.

## Risks / Trade-offs

- Inherited config filters could remove special-mode tests → compare actual discovery and project options for every consumer before execution; preserve all non-default sets.
- Metadata could alter selected IDs → verify stable retained IDs, not just counts or titles.
- Layout DPR or mobile flags may differ despite equal viewport → compare complete effective use settings; keep execution if equivalence fails.
- Serial-batch budgets and baseline counts can drift with active PRs → pin base/final identities, refresh discoveries and preserve historical receipts; re-evaluate overlap if #229 or #139 merges.
- A small reduction may not materially improve full wall time → report observed savings and retained coverage honestly; no minimum fabricated speedup.
- Existing failed full-baseline stages remain → distinguish fresh affected qualification, valid reused evidence and still-unverified historical obligations.

## Migration Plan

This is verification tooling only. After plan approval, capture baseline before editing tags/config, implement metadata/filtering and coverage checks, qualify selections and publish one focused PR. Reverting the metadata and project filters restores the original matrix without changing application state or production. No deployment or data migration is needed.
