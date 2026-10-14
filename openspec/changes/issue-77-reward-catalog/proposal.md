# Proposal

## Why

[Issue #77](https://github.com/luminari-gurus/tactics-guru-v2/issues/77) needs a reviewed minimal item catalog and reward contract before #78 can implement owned-item commands. The prerequisite #75 is complete through merged PR #107; #57 remains a feature-release gate.

Caller: `dubstylee`. Branch: `work/issue-77-reward-catalog`. Base: `origin/main` at `220d40f0ad179a7ffe5a4e3c67188b99718e722e`. Implementation approval: caller replied “Approved” on 2026-10-14 to the published plan at `4b719e0`, including item values and timing.

Readiness refresh on 2026-10-14 scanned all 17 open issues, open PRs and remote branches. #77 was unassigned, had no active branch/PR or GitHub blocking relationships, and its documented prerequisite #75 is closed with PR #107's merge on current main. Added and read back the exact `ready for work` label before selection. #77 directly unblocks [#78](https://github.com/luminari-gurus/tactics-guru-v2/issues/78), then [#79](https://github.com/luminari-gurus/tactics-guru-v2/issues/79) and [#80](https://github.com/luminari-gurus/tactics-guru-v2/issues/80); these remain unready. #106 is assigned and covered by PR #110. #64/#66 require physical certification; #74/#80/#81 retain documented gates. #84 still requires owner release choices. #108 is eligible design work but has fewer evidenced downstream dependencies. No other issue was relabeled.

## What Changes

- Propose three entries: a 6-HP healing draught, a +1 armor-class charm and a +1 accuracy charm; one shared equipment slot per living hero.
- Define validated discriminated consumable/equipment definitions and bounded whitelisted effects, separately from owned stacks, equipment instances and derived battle stats.
- Specify one choice of two distinct seeded catalog items after each of the first two victories, with persisted offer identity and an atomic claim handoff to #78.
- Add pure deterministic offer construction and validation fixtures, including an additional fixture item using the same effects and labels.
- Document eligibility, timing, ownership limits, replacement rules, compatibility identity and #78/#79/#80 handoff.

## Capabilities

### New Capabilities

- `run-item-catalog`: Minimal validated items, bounded ownership contracts and deterministic reward offers for the authored run.

### Modified Capabilities

None. Existing battle rules, battle catalog/save identity and single-battle controls remain unchanged.

## Impact

Expected files: new `src/content/items.ts`, `src/content/itemTypes.ts`, `src/content/validateItems.ts`, `src/domain/rewards.ts`, `tests/unit/items.test.ts`, `tests/unit/rewards.test.ts`, `docs/run-items.md`, plus the existing `package.json` content-validation script. Reuse `hasShape`, dense-array checks, `hashJson`, `seedRng`/`nextUint32`, and #75's `PendingReward`/derived reward seed. A separate catalog avoids changing `ContentCatalog` and invalidating existing battle saves.

No use/equip/claim reducer, battle stat projection implementation, run progression UI, save codec extension, new assets, dependency changes, deployment or physical certification. This scope supplies contracts to those later children. All proposed balance and gameplay choices require approval of this plan before implementation.
