# Issue #145 — default Move handoff

Updated 2026-10-19 (Asia/Jerusalem). Implementation is published for review; final integration validation is running.

## Current state

- Issue: [#145](https://github.com/luminari-gurus/tactics-guru-v2/issues/145), assigned to `moshehbenavraham`; kept open for review/merge.
- Review: [PR #150](https://github.com/luminari-gurus/tactics-guru-v2/pull/150), open/non-draft against `main`, with implementation on `branch/issue-145-default-move`.
- Worktree: `C:/Users/apexw/.codex/worktrees/issue-145-default-move/Tactics-Guru`. The caller's root checkout and other worktrees were preserved.
- Implementation `bed900c`; test/handoff follow-ups `2861440` and `7940d3e`. Full browser candidate: `7940d3e3b7f63bbe5ad832ff503e597d16cc5c17`. Refreshed main/base was `41ca7829271b1b6873819819d1d1e7e8c2f72419`.
- OpenSpec change: [issue-145-default-move](../../openspec/changes/issue-145-default-move/tasks.md), spec-driven, 2/4 tracked tasks complete. The [main battle-controls spec](../../openspec/specs/battle-controls/spec.md) includes the new requirement. Review and archive remain separate; no merge, release tag or deployment is requested.
- The [prior shared plan](plan-before-issue-145.md) is preserved byte-for-byte. Its historical performance work does not expand this issue.

## Outcome, scope and implementation

Select Move at the first usable decision of each player-controlled turn when existing movement rules permit it. Reuse the normal selected action, destination options and movement range, without selecting a destination, changing focus, preparing an intent, executing a command or changing persistence.

The shared `BattleScene.begin` retains one `(round, active unit ID)` marker. Its ready/player-phase refresh initializes once, including after enemy execution and round wrap, and records unavailable turns too. Full cancel, explicit Basic attack/signature choices, modal/lifecycle/layout refreshes and same-turn post-action clearing do not reset the marker. Reconstructing a standalone or run scene naturally resets it.

A directly reproduced command-limit boundary exposed the HUD's narrower eligibility check. Move now uses the existing `previewMovement` result for availability, reusing that result for destination options. Origin-only reach retains existing enabled selection but creates no destination or intent. No movement, combat, initiative, enemy AI, RNG, save/replay, asset, dependency, camera or layout rules changed.

Ablation retained the one local marker and real-path proof. Existing scene/HUD/domain paths replace any need for a selection service, event bus, persistent UI state, configuration or separate standalone/run implementations. One helper loads validated snapshots for multiple boundary cases; tests extend existing suites. Concise OpenSpec change artifacts were added for the caller's explicit implementation workflow.

## Proof and outstanding work

[QA record and acceptance map](../qa/issue-145-default-move.md) cover all eight issue criteria, reproduction, source identity and limitations.

Completed:

- Startup assertion failed on the unchanged application (`aria-pressed=false`, expected true).
- Command-limit disabled-Move assertion failed before the HUD fix.
- Focused domain/session/input checks: 53/53.
- Full unit suite: 712/712 in 41 files; source inputs remain unchanged.
- Build: 167 content checks, both TypeScript configurations and Vite passed.
- Focused desktop/portrait/landscape selection, Continue, attack-before-move, unavailable/origin-only, map picking and complete run progression: 21/21, four minutes, no retries/skips.
- Earlier keyboard/touch/presentation-lock cases: 6/6. A seed-2 player-first fixture assumption initially failed on all profiles; it was corrected using actual domain turn order, then passed.
- Strict issue OpenSpec validation and whitespace passed. Desktop, portrait and landscape screenshots have been inspected; the final captures now scroll the action rail to the top so selection/spent controls are visible.

Running/pending:

1. `npm test -- --reporter=line` is running in exec session `64431`, log `tmp/full-browser.txt`, against the production build of `7940d3e`. It contains 588 configured Chromium cases and will invoke the encounter/run-item posttests on success. Do not start a competing preview on port 4173 or rebuild `dist` during this run.
2. Finish/read back those results, repair real failures, copy the final representative screenshots to `docs/qa/issue-145-default-move/`, and record exact browser/build metadata in QA.
3. Mark remaining OpenSpec tasks only after proof, finish this handoff, commit/push documentation/evidence, update PR #150 and recheck exact remote head, base, review/check status and clean worktree.

The final build reports commit `7940d3e` with `dirty=true` because content validation rewrote a tracked snapshot's LF/CRLF representation; `git diff` shows no snapshot content difference. Production source blobs remain `ccadc293b2d5085b524d1d37b9b7a9b290c48381` (BattleScene) and `db923598af5b9874df02355a2e29e3c111098741` (HUD). Do not commit the generated newline rewrite. Retain this distinction from an actually different implementation.

## Reproduction commands and environment

Windows Node 24.19.0 is available, but npm is absent from PATH. Ignored `tmp/bin/npm.cmd` runs `node C:/Users/apexw/AppData/Local/node/corepack/v1/npm/12.0.2/bin/npm-cli.js %*`; prepend that directory to PATH for the commands below and Playwright web-server subprocesses. Dependencies were installed with `npm ci` (44 packages, zero audit findings). Playwright is 1.63.0 and uses installed Chromium without an executable override.

```powershell
$env:PATH="$((Get-Location).Path)\tmp\bin;$env:PATH"
npm run test:unit
npm run build
npm test -- --reporter=line
```

OpenSpec and gh are installed in WSL. OpenSpec works from the mounted worktree. WSL gh must run from `/tmp` with `-R luminari-gurus/tactics-guru-v2`: the Windows linked-worktree `.git` path cannot be resolved by Linux Git. Use a body file for PR updates. The GitHub connector can read this repository but rejected PR creation with 403; authenticated gh created the PR successfully. Windows Git owns commits/pushes; no history rewrite was used.

```sh
openspec instructions apply --change issue-145-default-move --json
openspec validate issue-145-default-move --strict
```

Warnings are retained in QA: Vite's existing Phaser chunk/native-config-loader notices and Node color precedence. Playwright/device emulation satisfies AGENTS.md. No physical hardware, screen-reader, production deployment or release acceptance is claimed. Stop after review-ready publication and verified final checks; no unrelated cleanup or hardening phase is needed.
