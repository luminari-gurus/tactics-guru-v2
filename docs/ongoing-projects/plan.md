# Issue #145 — default Move handoff

Updated 2026-10-19 (Asia/Jerusalem). Implementation and acceptance are complete; final review-evidence publication is being sealed.

## Current state

- Issue: [#145](https://github.com/luminari-gurus/tactics-guru-v2/issues/145), assigned to `moshehbenavraham`; kept open for PR review/merge.
- Review: [PR #150](https://github.com/luminari-gurus/tactics-guru-v2/pull/150), open/non-draft and mergeable against `main`, on `branch/issue-145-default-move`.
- Worktree: `C:/Users/apexw/.codex/worktrees/issue-145-default-move/Tactics-Guru`. The caller's root checkout and other worktrees were preserved.
- Implementation `bed900c`; test/capture follow-ups `2861440` and `7940d3e`; handoff-only follow-up `0677c22`. Tested production candidate: `7940d3e3b7f63bbe5ad832ff503e597d16cc5c17`. Refreshed main remains `41ca7829271b1b6873819819d1d1e7e8c2f72419`.
- OpenSpec [issue-145-default-move](../../openspec/changes/issue-145-default-move/tasks.md), spec-driven: 3/4 tasks complete, with only final publication/readback outstanding. The [main battle-controls spec](../../openspec/specs/battle-controls/spec.md) includes the new requirement.
- The [prior shared plan](plan-before-issue-145.md) is preserved byte-for-byte. Historical performance work does not expand #145. No merge, release tag or production deployment is requested.

## Outcome and minimal change

At the first usable decision of each player-controlled turn, Move is selected when existing movement rules permit it. This reuses normal action controls, legal destination options and range rendering without selecting a destination, changing focus, preparing an intent, executing a command or changing persistence.

The shared `BattleScene.begin` retains one `(round, active unit ID)` marker, initialized only when ready in player phase, including after enemy execution and round wrap. It records unavailable turns too. Full cancel, explicit Basic attack/signature choices, modal/lifecycle/layout refreshes and same-turn post-action clearing do not reset it. Reconstructing a standalone or run scene naturally resets it.

A direct command-limit regression exposed the HUD's narrower eligibility check. Move now uses the existing `previewMovement` result for availability and reuses it for destination options. Origin-only reach keeps existing enabled selection but creates no destination or intent. No movement, combat, initiative, AI, RNG, save/replay, asset, dependency, camera or layout rules changed.

Ablation retained one local marker and real-path proof. Existing scene/HUD/domain paths avoid a selection service, event bus, persistent UI state, configuration or separate standalone/run implementations. Existing browser suites and legal session/save fixtures provide coverage; validated artificial snapshots isolate origin-only and command-limit boundaries. Concise OpenSpec change artifacts support the caller's explicit workflow.

## Verified acceptance

The [QA record](../qa/issue-145-default-move.md) maps all eight issue criteria to tests and records exact runtime/source identity, initial failures and the [three inspected captures](../qa/issue-145-default-move/).

- Startup assertion failed before the scene edit; command-limit disabled-Move assertion failed before the HUD repair.
- Focused unit checks: 53/53. Full unit suite: 712/712 in 41 files.
- Build: 167 content checks, both TypeScript configurations and Vite passed.
- Focused desktop/portrait/landscape default/Continue/attack-before-move/unavailable/map/run coverage: 21/21 in four minutes, no retries/skips. Earlier keyboard/touch/lock checks passed 6/6. The original incorrect seed-2 player-first assumption was repaired using actual domain turn order.
- Full browser command: 567 passed and 21 BFCache-marker failures in 39.2 minutes. CDP diagnosed `BackForwardCacheDisabledForDelegate` in installed Chromium headless shell. The same build restored BFCache in installed Edge; all 21 unchanged original checks then passed across all three profiles in 52.9 seconds using the existing executable override.
- Configured posttests ran separately after the failed full command: 18/18 encounter cases and 21/21 run-item cases passed on their Vite dev servers.
- Thus every one of the 588 configured browser cases has passing evidence, plus 39 posttests. This is not a claim that the initial `npm test` command was entirely green, nor that headless shell supports BFCache or that all cases were certified in Edge.
- Strict change/main-spec validation, document links and whitespace passed during implementation; final publication repeats the non-runtime checks only.

Production source blobs are `ccadc293b2d5085b524d1d37b9b7a9b290c48381` (BattleScene) and `db923598af5b9874df02355a2e29e3c111098741` (HUD). Runtime, test, dependency and build configuration inputs are unchanged after candidate `7940d3e`. The build reports `dirty=true` because content validation rewrote a tracked snapshot's LF/CRLF representation; Git showed no snapshot content diff. That generated newline rewrite is excluded from publication.

## Remaining workflow

Only seal the final QA/screenshots/handoff publication, verify PR and remote parity, then mark the delivery task complete. No implementation or runtime acceptance remains. Leave PR #150 open for review, #145 open until merge, and the OpenSpec change active for its later archive workflow. Do not start another broad test run, add hardening, merge or deploy.

## Reproduction and local tools

Windows Node 24.19.0 is available but npm is absent from PATH. Ignored `tmp/bin/npm.cmd` runs `node C:/Users/apexw/AppData/Local/node/corepack/v1/npm/12.0.2/bin/npm-cli.js %*`; prepend it for npm and Playwright web-server subprocesses. Dependencies were installed with `npm ci` (44 packages, zero audit findings). The QA record lists exact Chromium/Edge versions and device descriptors.

```powershell
$env:PATH="$((Get-Location).Path)\tmp\bin;$env:PATH"
npm run test:unit
npm run build
npm test -- --reporter=line
# If the installed headless-shell delegate rejects BFCache, retain that result,
# run posttests explicitly, and recheck only those failed original cases:
npm run posttest
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
node node_modules/@playwright/test/cli.js test tests/battle-animations.spec.ts tests/battle-persistence.spec.ts --grep 'ability departure through real browser history|browser history with BFCache enabled' --output tmp/bfcache-recheck --reporter=line
```

OpenSpec and gh are installed in WSL. OpenSpec works from the mounted worktree. Run WSL gh from `/tmp` with `-R luminari-gurus/tactics-guru-v2`; Linux Git cannot resolve this Windows linked-worktree's `.git` path. Use body files for PR updates. The GitHub connector rejected PR creation with 403; authenticated gh succeeded. Windows Git owns commits/pushes; no history rewrite was used.

```sh
openspec instructions apply --change issue-145-default-move --json
openspec validate issue-145-default-move --strict
openspec validate battle-controls --type spec --strict
```

Ignored `tmp/` retains exact verification logs named in QA. Vite's existing chunk/native-config-loader warnings and Node color precedence are recorded. Playwright emulation satisfies AGENTS.md; no physical hardware, screen-reader or production acceptance is claimed.
