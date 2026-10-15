# Issue #111 — PR #119 review fixes ready to merge

Updated 2026-10-16 (Asia/Jerusalem). **Both PR #119 review findings are repaired and verified locally.** The PR remains open; issue #111 stays open until it merges.

- Geometry prerequisite [PR #118](https://github.com/luminari-gurus/tactics-guru-v2/pull/118) merged as `ffb0d0a4dd0bb1989ac4572d82a9edf08f61585b`.
- Remaining delivery: [PR #119](https://github.com/luminari-gurus/tactics-guru-v2/pull/119), `branch/issue-111-responsive-hud` → `main`.
- Runtime/test repair: `617830999bd4fc7539b47188b1b41b1bcf1f7b4e`, on PR head `453cf2dd1008c8ed38f3f4f56fb1540bed437a0b`. It includes current main `21f5023ba0feb91f175a543b9a7901562a1189a1`.
- [QA record](../qa/issue-111-battle-controls.md) distinguishes fresh repair verification from earlier implementation/prefix evidence. [OpenSpec tasks](../../openspec/changes/issue-111-responsive-battle-controls/tasks.md) remain complete and active.
- Repair checkout: `C:/Users/apexw/.codex/worktrees/repair-pr-119/Tactics-Guru`. Other existing checkouts were preserved.

## Outcome, files and ablation

[Living-target identity](https://github.com/luminari-gurus/tactics-guru-v2/pull/119#discussion_r4286775892) was valid: legal seed 1, command count 64 puts defeated Ranger #2 and living Goblin Archer #5 on the same cell. `src/ui/hud.ts` now prefers the living occupant (retaining corpse-only inspection). `src/phaser/BattleScene.ts` builds confirmation identity from the prepared command's target IDs using the existing label formatter, instead of reading panel text.

[Clamped feedback overlap](https://github.com/luminari-gurus/tactics-guru-v2/pull/119#discussion_r4286775908) was valid: at seed 1, command count 73, a legal Guarded Strike at the top panned edge covered damage with Guarded. `src/phaser/BoardRenderer.ts` retains the existing placement until stacks collide, then places the intact stacks in one separated column inside the drawable region. Hidden impact labels reserve space from the start.

`tests/battle-animations.spec.ts` extends the existing legal-policy and saved-startup path. It checks dropdown/panel/inspection/confirmation/committed-target agreement, confirmation with stale DOM text, and pairwise feedback separation for misses and defeats through pre-pan, other edges, zoom and rotation. No new renderer, state owner, dependency, fixture infrastructure or unrelated cleanup was needed.

Non-goals: combat/RNG, save formats, audio ownership, release/deployment, physical-device or screen-reader certification, and separately owned #80. Existing #113 modal/focus protections remain covered.

## Fresh proof

On repair source/test commit `6178309`:

- `npm run test:unit`: **652/652**, 38 files.
- `npm run build`: **167/167** content checks, both TypeScript configurations and production build passed. Existing bundle-size warning remains.
- Focused Playwright regressions: **9/9** across desktop, emulated portrait and landscape.
- Full configured Playwright suite: **429/429**; posttests: **18/18** encounters and **21/21** run items. No failures, retries or skips in these completed runs.
- Strict OpenSpec and whitespace checks passed. The clean root build was stamped with `6178309`; subsequent documentation changes do not alter tested source or tests.

Commands, reproduction notes, screenshots and report locations are in the QA record. Earlier 48-case prefix evidence is retained, not a fresh repair run.

## Git decisions and continuation

The PR already contained current main and had no conflicts. Preserve its original implementation and merge ancestry; publish the repair and this documentation as ordinary commits. No rebase, squash, new stack, carry-forward code or release tag is warranted. GitHub reported main unprotected with no active branch rules, and no open dependent PR. Final publication verifies exact remote equality, `0 0` ahead/behind and a clean repair checkout.

This session leaves #119 ready to merge without merging it or closing #111. When merge is authorized, refresh base/head and rules, merge the verified change, then reconcile/close #111 and sync/archive OpenSpec while preserving the already merged #113 scenarios. Do not repeat the geometry-only premature issue closure.
