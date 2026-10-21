# Proposal

## Why

The HUD selects the first owned non-basic ability, hiding any additional abilities. Issue [#162](https://github.com/luminari-gurus/tactics-guru-v2/issues/162) needs explicit catalog-driven selection before the class-skill additions in #163–#165.

Caller: `dubstylee`. Branch: `work/issue-162-ability-picker`. Base: `origin/main` at `5a1857f0ae9b69780e17d911501fa255fe1f8b68`. Implementation approved by caller in chat on 2026-10-21. Upstream square-map-cell fix merged before implementation; implementation base `1620349`.

## What Changes

- Replace the first-signature shortcut with a labeled native ability selector carrying an explicit AbilityId. Keep Move, Basic attack and Wait directly reachable.
- Derive choices, names, range, targeting guidance and disabled reasons from current catalog/session truth. Keep all implemented owned non-basic abilities selectable.
- Share selected-ability command construction with board targets, native target controls and overlays; expose currently legal friendly Magic Missile targets with explicit friendly-fire confirmation.
- Preserve selection and prepared intent through inspection/layout refresh; clear stale intent after accepted actions, actor changes, cancellation and restart.
- Verify multiple abilities per hero using isolated validated catalogs built from existing implemented profiles, without introducing new production abilities or progression rules.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `battle-controls`: Explicit owned-ability choice, accurate availability and targeting, preserved intent and accessible mobile controls.

## Impact

Expected runtime files: `src/ui/hud.ts`, a small `src/ui/battleActions.ts` helper if needed to avoid coupling, `src/ui/targetPreview.ts`, `src/phaser/BattleScene.ts`, and relevant battle-control styles. Tests: focused unit cases and `tests/battle-loop.spec.ts` or a dedicated ability-picker browser fixture. Documentation: `docs/signature-abilities.md` and `docs/qa/issue-162-ability-picker.md`.

No new package, gameplay balance, save format, level system, generic targeting framework or HUD collapse implementation. #111 is complete; #160 and #163–#165 remain coordinated future producers. #123/PR #139 and #159 have active work and are excluded. #187's direct-confirm change is separate; preserve the current confirmation contract unless it merges first, then reconcile before implementation. #190's three known desktop native-select failures remain recorded and must not be hidden.

Readiness refresh reviewed all 35 open issues, formal dependency relationships, current main, open PRs and remote branches. Promoted #195 (selected compass design, existing movement path, emulated acceptance) and #190 (bounded documented reproduction and acceptance, no unmet prerequisite), verifying both exact labels. #162 outranks independent presentation work because it enables three high-priority class-skill tickets and supports later #172/#181 controls. #160's dungeon award dependency #159 remains unmerged; #161's merged slice is Guarded-only and does not establish all future status/save primitives. Neither is assumed complete for new mechanics.

Caller approved the necessary validator extension in chat on 2026-10-21: accept additional well-formed ability IDs using existing implemented profiles, bounded values and distinct valid owners; preserve canonical required IDs, kinds and owner checks. `src/content/validate.ts` and focused malformed-extension tests are added to affected files. No new production definitions or save schema are added.
