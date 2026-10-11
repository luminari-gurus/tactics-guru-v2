# Proposal

## Why

PR #67 now supplies a merged shared-texture baseline, but every battle tile still submits a column and a separately transformed terrain surface. Issue [#68](https://github.com/luminari-gurus/tactics-guru-v2/issues/68) asks whether baking those immutable layers provides enough measured benefit to justify memory and maintenance costs.

## What Changes

- Prototype shared baked column/surface variants keyed by terrain asset and elevation; keep dynamic overlays, units, rings and canopies separate.
- Compare exact baseline and prototype builds with the corrected #65 v3 collector, matching profiles, seed, cold/warm runs and interaction workloads; retain raw captures and visual comparisons.
- Measure variant dimensions/count, estimated texture memory, generation time and restart stability.
- Record an evidence-backed adoption decision. Keeping the baseline and delivering only experiment evidence is an accepted outcome.

## Capabilities

### New Capabilities

- `battle-tile-rendering`: bounded reuse of static tile textures, preserved dynamic geometry/presentation, and measured adoption of rendering changes.

### Modified Capabilities

None. Main specification inventory is empty.

## Impact

Primary implementation: `src/phaser/BoardRenderer.ts`, with a small adjacent texture helper only if needed. Verification: `tests/battle-board.spec.ts`, relevant existing input/loop/lifecycle tests, and focused cache tests if needed. Evidence: `docs/qa/issue-68-baked-tiles.md` and `docs/qa/issue-68/`. Reuse `scripts/measure-fit.ts`, its v3 diagnostics, and `docs/qa/issue-65/profile-harness.mjs`; change measurement tooling only for required texture/resource reporting.

Issue: #68; caller: `dubstylee`; branch: `work/issue-68-baked-tiles`; base: `e955e9d9f182a76f057ea69057c7a1ac6c0bd682` (`origin/main`, merged PR #67). Remote: https://github.com/luminari-gurus/tactics-guru-v2/tree/work/issue-68-baked-tiles.

Readiness audit: all seven open issues, comments, blocked-by relationships, repository branches and all PRs inspected on 2026-10-11. #68 had no assignee, blocker relationship or active branch/PR; #67 merged into main and fulfills its explicit baseline prerequisite. Promoted exact `ready for work` label and read back; refreshed backlog, claimed and verified assignment. #66 belongs to another caller and active branch; #57–#60 explicitly require scoped child issues. #64 remains unchanged: physical device evidence and Safari failure disposition remain outstanding; no hardware availability is established in this task. #68 is the sole eligible ready issue after refresh; no downstream dependency is invented.

No whole-board bake, new assets/dependencies, combat/RNG changes, deployment changes, proof-scene redesign or physical certification. Risks: texture size/upload cost, alpha seams, terrain orientation, depth interleaving and misleading near-60-fps comparisons. Implementation approval is pending; this commit contains planning only.
