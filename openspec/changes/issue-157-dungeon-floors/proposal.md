# Proposal

## Why

[#157](https://github.com/luminari-gurus/tactics-guru-v2/issues/157) replaces the fixed three-battle production concept with continuing dungeon floors, unlocking #158 exploration and #159 encounter selection. The existing short run remains a testing proof of concept.

Caller: `dubstylee`. Branch: `work/issue-157-dungeon-floors`. Base: `origin/main` at `6bfe127dd3228392ebda6cbee5344afafa84ca48`. Implementation approval: caller said “Approved” on 2026-10-20 for published plan `e5b844e`, including the route, temporary floor template, summary stair controls and resource/recovery decisions.

## What Changes

- Add an explicit dungeon mode at `/dungeon`, linked from existing run navigation, with floor/encounter identity, saved positions and POI completion, boss-gated descent and backtracking. Preserve `/`, `/run` and `/map` behavior and save slots.
- Start with a versioned floor template using current three encounter sources; the third encounter is the floor guardian boundary, with existing roster mechanics. No claim of new boss content. Repeat floors with independently derived seeds, without fixed-depth victory.
- Carry party HP, owned items and equipment; reset battle-local state only on new encounters. Revisit restores saved floor facts and never grants rewards twice.
- Generalize shared item/reward identity primitives for dungeon boundaries without weakening existing short-run validation.
- Add bounded geometry caching, compact durable floor descriptors and explicit save-capacity recovery without silent floor eviction or a gameplay depth cap.
- Verify pure reducers, active battle/reward/travel reload equivalence and desktop/mobile stair controls through Playwright.

## Capabilities

### New Capabilities

- `dungeon-progression`: Continuing floor lifecycle, deterministic encounters, backtracking, durable completion and safe resource handling.

### Modified Capabilities

None. Existing battle-session requirements remain regression constraints; existing three-encounter contracts remain mode-specific.

## Impact

Expected areas: new dungeon domain/content/session/storage/entry/UI modules; shared `items.ts`, `rewards.ts` and battle construction adapters; `main.ts` routing; focused unit/browser tests; current dungeon contract and QA documentation. No new game dependencies, gameplay stat/ability changes, biome packs, spatial traversal/fog, enemy wandering, music, telemetry taxonomy expansion, deployment or legacy-save import.

Readiness audit: all 34 open issues inspected, native dependencies checked, open PRs/remote branches reviewed. #58–#60 are closed. #155 promoted after merged #154/PR #156; #158 remains blocked on #157, #159 on #157, later content on their stated prerequisites. #185 and design-decision issues remain unready. #123/PR #139, #128 branch and #85 release work excluded as ongoing. #157 has the strongest evidenced downstream reach; #161 unlocks abilities but most consumers also require progression/encounter work.
