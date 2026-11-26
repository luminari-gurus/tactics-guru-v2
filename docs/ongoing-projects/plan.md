# Issue #404 — Combat log filters and Hide

- [GitHub issue #404](https://github.com/luminari-gurus/tactics-guru-v2/issues/404) · [claim](https://github.com/luminari-gurus/tactics-guru-v2/issues/404#issuecomment-7188578414)
- Branch `branch/issue-404-combat-log-filters` · planning base `153fb6dfed965769459c031f549d90b486654640` · November 26, 2026 (Asia/Jerusalem)
- [Previous handoff for #483](issue-483-dungeon-counter-migration-plan.md)

- OpenSpec [battle-controls change](../../openspec/changes/issue-404-combat-log-filters/proposal.md)

## Implementation status

Implementation authorized November 26, 2026. The existing issue branch is checked out in its dedicated worktree. The OpenSpec proposal, behavior delta, design and tasks are ready. The Linux verification checkout is at `/home/aiwithapex/projects/tactics-404-verification.i5PD90/checkout`.

The four filters and Hide are wired into the existing dialog. The focused unit test passed. At seed 189 the first player turn has an empty Status & Saves filter. Four legal player decisions then produce Weakening Hex and Magic Missile outcomes. The focused browser case starts from the legally reached encounter boundary with Fast combat pace. The separate Shaman companion owns full exploration and battle traversal.

The first exact-source WSL run of `npm run verify:pr` stopped during units with 29 test timeouts and two timing-related assertions. Its original receipts are retained under `checkout/verification-receipts/pr/1795687950112-591259/`. The separate root build passed content validation and both TypeScript scopes. The first Chromium attempt reached the new assertions on one profile and timed out before completing on all three, so its logs and traces are retained. Later runs will record results separately.

## Outcome

During battle, players can open Battle log, choose **All**, **Actions**, **Damage & Healing**, or **Status & Saves**, then hide and reopen the log. Switching back to All displays the same history in the same order. Hide and Escape return focus through the existing dialog path and leave the battle in its prior state. The log opens on All.

The backlog review covered all 43 open issues and 15 open PRs, including issues without the `ready for work` label. This issue had a clear player-facing gap, a small implementation surface in the shared battle screen, and no overlapping branch or PR. Current main already has the pinned Rail controls relevant to #403 and the obstructed-enemy visibility fix relevant to #417. The separate grouping and export work belongs to [#179](https://github.com/luminari-gurus/tactics-guru-v2/issues/179).

## Implementation

1. Keep the existing event formatter and 40-entry cap in [BattleHud](../../src/ui/hud.ts). Store each visible entry as its `BattleEvent` type and formatted text. Preserve the initial turn header, append order, omitted initiative-roll lines and current battle-session lifetime. Classify by event type so follow-up grouping and export can consume the same ordered entries.
2. Add a small `src/ui/battleLog.ts` module for the typed entry and filter view. **Actions** includes turn, movement, push, ability use, and battle-end lines. **Damage & Healing** includes attack outcomes, missile rolls, damage, defeats and healing. **Status & Saves** includes saving throws and status application, consumption and expiry. **All** displays every retained line. Give an empty filter a short empty-state message. The [legacy view](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/view/BattleView.gd#L2333-L2358) also filters the ordered history by category.
3. In [BattleScene](../../src/phaser/BattleScene.ts), pass the filtered content to the existing native dialog through its supported DOM-content path. Use four toggle buttons styled as tabs with an announced selected state and the existing dialog keyboard cycle. Rename `#log-close` to **Hide** in visible copy, retaining its ID and existing release and focus callbacks. Keep the shared Rail/Radial launcher and make the filter row wrap with usable touch targets in [the battle stylesheet](../../src/style.css).

### Ablation decisions

One bounded history supplies all four views. Filtering derives the displayed rows directly from retained entries, which preserves the cap and order. The existing formatter, dialog and HUD launcher already handle copy, focus, input locking, close/reopen and scene teardown. This increment stays in the presentation layer, so combat decisions, saves, replay and telemetry continue through their existing paths. Issue #179 owns round grouping, downloads and any longer-lived history.

## Proof

- Add a focused unit case for event classification, including attack misses, healing, status expiry, and an ordered mixed list. Check that each filter is a read-only projection and All preserves the order.
- Add one focused case to [tests/dungeon.spec.ts](../../tests/dungeon.spec.ts) titled `battle log filters and keeps history across Hide and reopen`. Reuse the seeded Shaman encounter and legal commands used by the existing Shaman journey to generate mixed history. Assert the exact retained lines on All before and after switching filters, matching and excluded lines for each category, and a meaningful empty state. Exercise keyboard activation, Escape and focus return on desktop, and actual taps in portrait and landscape. Verify the log closes and reopens in the same encounter without spending an action, and that a narrow or resized viewport keeps the controls reachable. Use the existing Battle tools disclosure helper so the journey follows the active layout.
- Run the existing Shaman production case as a companion check for human-readable saves and the stable close hook. Run the focused case across Chromium and WebKit configurations before preparing the implementation PR. Use [the verification policy](../verification-policy.md) to record the final commit, served build, projects, test IDs, results and any failures. Playwright device emulation covers the device requirement.

~~~sh
npm run test:unit -- tests/unit/battleLog.test.ts
npm run verify:pr
npx --no-install playwright test -c playwright.regression.config.ts tests/dungeon.spec.ts -g 'battle log filters and keeps history across Hide and reopen'
npx --no-install playwright test -c playwright.exploration.config.ts tests/dungeon.spec.ts -g 'battle log filters and keeps history across Hide and reopen'
npx --no-install playwright test -c playwright.extended.config.ts tests/dungeon.spec.ts --project=desktop -g 'Shaman production journey'
git diff --check
~~~

Open one implementation PR with `Closes #404` after the acceptance checks pass. Reference #179 for the typed entry handoff.

## Estimate and open questions

Estimated Codex implementation and targeted verification time is **60–90 minutes** with dependencies and browser binaries available. Self-hosted CI queue time is additional. There are no blocking product questions. The first legal seed-189 sequence that produces the required mixed and empty filter states will be confirmed during implementation.
