# Design

## Context

See proposal.md for identity, selection evidence and scope. On the pinned base, `hud.ts` encodes Action as move/basic/signature and uses `find` for the first owned signature in both command construction and rendering. `BattleScene.ts` retains action/selected cell separately from `BattleSession.pending`. `targetPreview.ts` repeats hostile-only candidate filtering. Domain attack preview rejects allies, while Magic Missile has no allegiance exclusion and accepts a unitId shorthand allocating all missiles to one target. The UI currently supplies a one-element missileTargets array, unsuitable for higher caster levels.

Only attack, guardedAttack and magicMissile profiles exist. There are no learned-ID, hero-level, cooldown or limited-use fields. #161's merged work preserves Guarded through a shared bounded lifecycle; its open issue is not evidence that other status profiles exist.

## Goals / Non-Goals

Goals: make every currently owned implemented profile selectable by exact ID and keep all input surfaces consistent with existing authoritative legality. Keep changes within the current DOM/session/Phaser architecture.

Non-goals: new production abilities, level/XP persistence, speculative availability fields, self-healing/area targeting, a new UI framework, HUD collapse, changes to combat balance or save identity. Tests may use additional IDs with existing validated profiles. Such fixtures prove picker behavior, not shipped new class skills.

## Decisions

1. Use a labeled native select for non-basic abilities alongside the existing Move, Basic and Wait controls. An explicit selected AbilityId replaces the signature sentinel. A small pure action helper can own enumeration, display metadata and command construction, shared by HUD/scene/overlays. Reject a generic ability-tree registry or new widget library: the existing catalog is sufficient. Sort choices deterministically by ID and preserve a still-owned explicit choice across rerenders. Do not recreate the selector on ordinary target refreshes, avoiding lost keyboard focus.
2. Ownership comes from catalog owners, the only current ownership contract. List all owned non-basic profiles, including disabled action-spent/phase states with adjacent readable reasons. Show selected range, target mode and effect from the same profile/preview. Do not display invented cooldown/use/level numbers. Future #160/#163–#165 must supply authoritative unlock/resource data together with their real consumers. Current locked/unavailable verification covers spent actions, phase locks, ownership rejection, range/LOS and invalid target kinds; level-locked profiles are explicitly inapplicable on this base.
3. Construct useAbility with the exact selected ID. Ordinary attacks retain hostile-only targeting. Magic Missile candidates include living allies, subject to range/LOS; the current minimum range rejects self-targeting; use unitId shorthand for complete same-target missile allocation. Keep multi-target allocation rules unchanged; adding an allocation editor is separate. Native targets and overlays query the same command/preview path. Invalid board targets retain explanatory feedback without intent.
4. Keep current preview/review/confirm flow and add unmistakable friendly-fire text naming target and damage consequence in its confirmation. No additional confirmation for ordinary hostile actions. If #187 merges before implementation, rebase/reconcile to its direct-confirm contract while retaining an explicit friendly-fire safeguard; a materially different contract returns for approval. Do not implement #187 here.
5. Preserve action/ability/cell/pending identity through inspection, viewport resizing and ordinary render. Switching abilities cancels the previous pending command before rebuilding a preview for a retained target. Accepted action, actor changes, full cancel and restart clear stale intent. Same-turn spent-action state disables ability choice; initial-turn Move default stays intact. Continue derives choices from the resumed authoritative catalog/state and never restores an uncommitted intent.
6. Add validated test catalogs with at least two non-basic implemented profiles for each hero, distinct IDs/ranges and stable catalog permutations to catch first-entry bugs. Use the existing isolated Vite fixture approach when production cannot represent these cases; never inject test definitions into runtime content. Exercise ordinary production signatures separately on standalone and run routes.

## Acceptance mapping and verification

| Issue criterion | Implementation | Evidence |
| --- | --- | --- |
| All owned choices and reasons | explicit-ID action helper and HUD select | multi-ability catalogs for all three heroes, reordered catalogs, foreign IDs, spent/phase locks |
| Target mode/range/effect/resources/levels where applicable | profile-derived metadata and existing previews | existing profiles' metadata, Guarded tradeoff, Missile count/damage; record absence of level/cooldown/use schema |
| Implemented target modes and friendly confirmation | shared candidates/commands/overlays and review text | hostile attacks, friendly Missile, self/minimum-range and dead/LOS rejection, cancellation, complete missile allocation |
| Selection persistence and stale clearing | scene refresh and intent lifecycle | inspection, resize, actor/action transitions, restart, exact state/RNG/replay/save comparisons |
| Multiple skills, keyboard/touch/narrow/repeat/resume | focused fixture and production regressions | desktop, 320px portrait and short landscape, native keyboard selection, actual touch, one accepted command, exact resume |

Run focused pure/session and Playwright cases, then `npm run test:unit`, `npm run validate:content`, `npm run typecheck`, `npm run build`, and `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test` including configured posttests. Run `openspec validate issue-162-ability-picker --strict` and `git diff --check`. Capture screenshots and inspect them. Record exact host/browser, source revision, counts and failures in `docs/qa/issue-162-ability-picker.md`. Use browser/device emulation per standing caller instruction. Do not claim physical testing.

## Risks / Trade-offs

- Native selects can lose focus if rebuilt → update choices only when identity/availability changes, use actual keyboard tests. #190 already records three main-branch desktop failures; reproduce and retain their disposition without skipping, weakening assertions or quietly bundling an unrelated repair.
- Fixture breadth can overstate production feature delivery → distinguish test-only multi-ability catalogs from existing signatures and future locked-level mechanics in QA and PR.
- Shared files overlap #123/PR #139 and #187 → inspect latest main before implementation, preserve upstream contract, avoid implementing their features.
- Friendly fire becomes discoverable → use authoritative target legality with deliberate named confirmation and cancellation tests; do not silently change Magic Missile rules.

## Migration Plan

No persisted schema or content identity changes are planned. Selection remains transient. Existing saves resume under the same catalog and rules. Reverting this UI change restores prior controls without data migration. No production deployment or merge is authorized by this plan.
