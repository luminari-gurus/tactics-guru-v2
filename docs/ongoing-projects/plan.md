# Issue #179 — Group and export the combat log

- [GitHub issue #179](https://github.com/luminari-gurus/tactics-guru-v2/issues/179) · [Claim](https://github.com/luminari-gurus/tactics-guru-v2/issues/179#issuecomment-7189847036) · [Development branch](https://github.com/luminari-gurus/tactics-guru-v2/tree/work/issue-179-combat-log-export)
- Assignee `moshehbenavraham` · planning base `f3a0d2c4c43aa4dfb8bcdeea68456f0d888056ad` · November 26, 2026
- [Previous handoff for #404](issue-404-combat-log-filters-plan.md)

## Implementation status

Implementation authorized November 26, 2026. The local worktree and published development branch are dedicated to #179. The [OpenSpec change](../../openspec/changes/issue-179-combat-log-export/proposal.md) tracks the grouped view, retention and download. The Linux verification checkout is `/home/aiwithapex/projects/tactics-179-verification.JyttLs/checkout`. Dependencies installed there with `npm ci --prefer-offline` after the strictly offline install found an uncached package. The history model, modal download and combat guide are implemented. Three focused unit cases and both type scopes passed against the implementation files before the browser assertions were added. The browser pass and ordinary PR checks are pending.

## Outcome

Players can read recent combat by round, acting unit and action in the existing Battle log, then explicitly download that same retained history as readable, indented JSON. The file identifies the source build and combat rules. Existing filters, Hide, Escape and focus return stay available in both Rail and Radial.

The backlog review covered all 42 open issues and 15 open PRs, including issues without the ready label. This issue has an independent, verifiable remaining scope. Merged [PR #628](https://github.com/luminari-gurus/tactics-guru-v2/pull/628) supplies its typed event categories, modal and legal browser witness. Issue #179 has no open prerequisite, overlapping PR or linked branch at claim time. The combat effects work in [#161](https://github.com/luminari-gurus/tactics-guru-v2/issues/161) and local records in [#176](https://github.com/luminari-gurus/tactics-guru-v2/issues/176) can proceed independently.

## Implementation

1. **Record context at the existing accepted-event boundary.** Pass the accepted presentation's before-state and events from [BattleScene](../../src/phaser/BattleScene.ts) to the existing [BattleHud](../../src/ui/hud.ts) log append path. Use the original round and acting unit for the action batch and retain the affected unit on each result. Derive the action from the existing leading events for move, undo, ability and End Turn. The standalone heal event produced by drinking a draught forms its own action. Keep the event order emitted by [turn resolution](../../src/domain/turns.ts), including expiry during End Turn and then the next turn header with its new round and actor. Label a resumed battle from its current turn with the existing synthetic header. Never replay earlier events into the visible buffer.
2. **Group the one bounded history.** Enrich [the existing log-entry shape](../../src/ui/battleLog.ts) with self-contained round, actor and action context. Use the accepted command count to distinguish consecutive action batches. Keep the latest 40 visible entries and retain context on surviving rows even if a header or earlier result was evicted or hidden by a filter. Group contiguous rows in first-seen order. Show the existing readable result text and preserve selected-filter and empty-state behavior. Use text nodes and the current dialog wrapping and touch sizing.
3. **Add an explicit download inside Battle log.** Add a keep-open `Export combat log` button using [the existing dialog choice handling](../../src/ui/dialogs.ts). Download the complete retained dialog snapshot regardless of the active filter through the same Blob link and cleanup pattern used by [run records](../../src/ui/runRecords.ts). The indented JSON includes a combat-log format identifier and version, build commit/dirty metadata from `__BUILD_INFO__`, and rules/RNG/content versions from the accepted battle snapshot. Include stable event types, round/actor/action, affected-unit identity where available, ordered readable result lines and structured outcome values for attack/save/missile rolls, HP changes and battle outcome. Serialize an explicit projection rather than the battle state, full event arrays or raw commands. Use a distinct fixed filename, `tactics-guru-combat-log.json`. Keep the modal focused and the battle state intact after the download.
4. **Describe the retention contract.** Add short player-facing copy in the dialog and document the format in [the combat guide](../turn-flow-combat.md). The log covers the current encounter since entry or Continue, up to the latest 40 visible events. Reload discards the earlier log and a different encounter starts a fresh one. Record whether the retained view starts from a resumed or truncated boundary so a file can be interpreted on its own.

## Ablation and scope

The grouping metadata is needed to retain context across filters, truncation and the transition between turns. Build and rules identity are already available in the scene. The existing dialog, formatter, download pattern and 40-entry buffer cover the remaining needs. One readable JSON format satisfies both reading and structured export. Keep storage, save and replay formats, recovery exports, telemetry, and encounter rules outside this increment. The exported payload contains only combat log content and build/rules identity. It excludes seeds, RNG state, saved payloads, browser identifiers and personal fields. The log requires no browser storage or network access.

## Proof

- Extend [the existing unit tests](../../tests/unit/battleLog.test.ts) for an ordered mixed battle, including actor versus target, same-actor adjacent actions, round wrap, expiry before the new turn header, ability healing versus draught healing, and resumed initialization. Feed more than 40 rows and prove that truncating within an action leaves the surviving rows correctly grouped and marked. Check category projections, stable version metadata, multiline and special-character JSON round trips, and absence of save or identity fields.
- Extend the existing [Dungeon battle-log journey](../../tests/dungeon.spec.ts). Reuse its legal Shaman checkpoint and turn. Verify grouped history, filter parity, keyboard export and return focus on desktop, and native touch export in portrait and landscape. Use Playwright's download event to read the actual file and assert name, format, build/rules identity, entry order and independence from the selected filter. Exercise blocked storage using the existing test pattern on the transient Dungeon entry, and verify that the log and download still work. Verify a saved reload separately within the journey or its existing resume coverage. Earlier entries must stay absent, and the restored turn header must appear once. Confirm that export, Hide and reopen do not spend an action, change combat state or unlock the board behind the dialog.
- Run the same focused witness on Chromium and WebKit using production preview and the existing profile selections. Check the existing Shaman production journey for healthy log text and close behavior. Trace the shared Rail/Radial launcher and use existing keyboard, modal and resize coverage for affected behavior. Run the ordinary PR checks and record exact source/build, test IDs and any skips or failures per [verification policy](../verification-policy.md). Playwright device emulation covers the device requirement.

~~~sh
npm run test:unit -- tests/unit/battleLog.test.ts
npm run verify:pr
npx --no-install playwright test -c playwright.regression.config.ts tests/dungeon.spec.ts -g 'battle log filters and keeps history across Hide and reopen'
npx --no-install playwright test -c playwright.exploration.config.ts tests/dungeon.spec.ts -g 'battle log filters and keeps history across Hide and reopen'
npx --no-install playwright test -c playwright.extended-webkit.config.ts tests/dungeon.spec.ts --project=portrait-webkit -g 'Shaman production journey'
git diff --check
~~~

Deliver grouping and export together in one focused PR since the same model and acceptance journey exercise both. Use `Closes #179` once all issue criteria are verified.

## Estimate and open questions

Codex implementation and targeted verification should take **2–3 hours** with dependencies, browser binaries and a usable runner. Queue time is additional. There are no blocking questions. The plan adopts an encounter-only 40-entry history that resets on reload and a single, readable JSON download of the complete retained snapshot.
