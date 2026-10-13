# Issue 96 — combined map acceptance

Updated 2026-10-14 (Asia/Jerusalem). Status: complete and ready for review in [PR #105](https://github.com/luminari-gurus/tactics-guru-v2/pull/105).

## Goal and working state

Complete [#96](https://github.com/luminari-gurus/tactics-guru-v2/issues/96) on [branch/issue-96-map-acceptance](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-96-map-acceptance) and publish a review PR. The user authorized execution, autonomous fixes for discovered issues and Git publication using ablation and OpenSpec. Do not merge or deploy.

- Workspace: `C:/Users/apexw/.codex/worktrees/issue-96-map-plan/Tactics-Guru`.
- Starting HEAD: `9670a64ba508463ddd3d3e3335e273463fa7014a`; refreshed main: `79f7d983ff3a12ca38e93efdc72f3f317dfb789c`. The refreshed base is unchanged; retain the existing planning commit and add the evidence commit normally. No rebase, squash or tag is warranted.
- #97/#99/#98 are closed/completed through PRs #100/#101/#104. #96 remains open and assigned to `moshehbenavraham`.
- OpenSpec: [proposal](../../openspec/changes/issue-96-map-acceptance/proposal.md), [design](../../openspec/changes/issue-96-map-acceptance/design.md), [tasks](../../openspec/changes/issue-96-map-acceptance/tasks.md). All seven execution tasks completed; specification deltas are skipped because no behavior change is proposed.
- The original checkout's unrelated `.agents/skills/work-work-work/SKILL.md`, `.env.example`, `AGENTS.md` and Android draft changes remain untouched. The app cannot attach this existing worktree because its planning chat owns the attachment; the requested branch is being used directly without moving it or creating a competing checkout.

## Ablation and contract

**Outcome:** one reviewable disposition for all six epic criteria, with bound source/build identity, combined-control/mobile/keyboard proof, root/prefix navigation and regressions. **Non-goals:** new algorithms/biomes/art, RNG or save changes, campaign, dependencies, deployment or physical certification. **Files:** [epic QA](../qa/issue-96-map-acceptance.md), bounded evidence under `docs/qa/issue-96/`, and this handoff/OpenSpec tracking. Existing source/tests are conditional on a demonstrated defect or coverage gap. **Proof:** reuse existing unit/browser suites and source contracts; inspect generated screenshots and visible controls; run typechecks/build/strict/document/whitespace checks.

The plan is already minimal: keep the existing layout → biome → art pipeline and verification suite; add no feature or test framework. [Map contract](../overworld-map.md) defines Rooms/Grassland/Simple defaults, 20×20 topology, stable version metadata, fallback, invalid-input rollback and the approved art-only rerender exception. A pending valid seed edit remains unapplied when changing art, while type/biome changes apply it.

[Algorithm QA](../qa/issue-97-map-algorithms.md), [biome QA](../qa/issue-99-map-biomes.md) and [art QA](../qa/issue-98-map-art.md) remain historical references. `cc64433` and task HEAD have identical source/test/public/package/lockfile/config blobs. However, the child 336-pass browser run lacks a complete working-tree manifest; a fresh full configured run supplies broad proof rather than claiming exact historical source binding.

## Completed checks

- `npm ci --no-audit --no-fund`: 44 locked packages installed. No dependency/lockfile changes or vulnerability audit.
- All 446 unit tests passed (including 27 map tests); all 77 content checks passed.
- Root and `/prototype/` production builds passed, each including both TypeScript checks. Only the existing large battle-chunk warning remains.
- Codex in-app browser root/prefix direct entry and refresh verified `data-commit=9670a64ba508463ddd3d3e3335e273463fa7014a`. All three keyboard selectors worked together; all showed 3px visible focus and 44px heights. Prefix legacy asset paths, 393×727 mobile layout, no overflow and desert feedback were inspected. [Direct observations](../qa/issue-96/direct-inspection.json).
- Full root browser suite: 336/336 passed (112 per profile), including 42 map cases; prefix biome/art suite: 24/24 passed. Zero failures/skips/flakes/retries in both runs, with one worker and normal timeouts on Edge 155.0.4283.45. All 54 root combination screenshots and representative originals were visually reviewed. No contract violation or coverage gap required source/test changes. Raw logs/reports remain under `tmp/issue-96/`; [reviewable validation](../qa/issue-96/validation.json) records every browser case and exact source objects. Both preview servers and the temporary inspection tab are closed.

Both builds identify starting HEAD and a dirty worktree due only to acceptance documentation/evidence. Source/tests/config remain unchanged. Root `dist` remains intact; prefix output lives under ignored `tmp/issue-96/prefix-dist`.

## Review handoff

[PR #105 — Verify combined map selection acceptance for #96](https://github.com/luminari-gurus/tactics-guru-v2/pull/105) is open, non-draft and targets main with `Closes #96`. Evidence commit: `6c633687e537207a8a4080abb32b2f058b066782`; this final handoff update changes documentation only. The original planning commit is preserved. All seven OpenSpec tasks are complete; strict validation, 33 relative links and whitespace checks passed.

The GitHub connector could not create the PR (`403 Resource not accessible by integration`). Publication used the repository's existing Git credential after verifying account `moshehbenavraham` and exact remote head; the PR title/body, target and non-draft state were read back. The publishing session verifies final head/remote parity after this handoff commit.

No implementation work remains. Review the six-criterion QA disposition and evidence; merge remains a separate action. #96 stays open until the review PR is merged. No merge, tag, deployment, manual issue closure or OpenSpec archive was performed.

## Commands and local tools

Node is available on PATH; npm is not. This run used an ignored `tmp/issue-96/bin/npm.cmd` to invoke the existing npm CLI with bundled Node. A future local rerun should provide npm on PATH (or recreate that local wrapper) before repository commands. This leaves package/config files unchanged. Installed Edge override: `PLAYWRIGHT_CHROMIUM_EXECUTABLE=C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`.

- Unit: `npm run test:unit -- --reporter=json --outputFile=tmp/issue-96/unit.json`; content: `npm run validate:content`.
- Root: `npm run build`; `PLAYWRIGHT_JSON_OUTPUT_NAME=tmp/issue-96/root-browser.json npm test -- --reporter=list,json --output=tmp/issue-96/root-results` (set env vars with PowerShell syntax on Windows).
- Prefix: `npm run build -- --base=/prototype/ --outDir=tmp/issue-96/prefix-dist`; `PLAYWRIGHT_JSON_OUTPUT_NAME=tmp/issue-96/prefix-browser.json npm test -- --config=tmp/issue-96-prefix.config.ts tests/overworld-map.spec.ts --grep 'biome|art ' --reporter=list,json`.
- The temporary prefix adapter (reproduced in the QA report) imports repository config, preserves projects/worker count, uses `testDir: '../tests'`, baseURL `http://127.0.0.1:4174/prototype/`, and preview command `npm run preview -- --base=/prototype/ --outDir=tmp/issue-96/prefix-dist --port=4174 --strictPort` with repository cwd and matching readiness URL. No server is left running from manual inspection.
- Raw reports, logs and screenshots are retained locally under ignored `tmp/issue-96/`. Temporary formatting/publication helpers are removed after verification; they introduce no runtime/test framework. The QA report includes the prefix adapter needed for reproduction.
- OpenSpec CLI: `node C:/Users/apexw/AppData/Local/npm-cache/_npx/c37562604d2d088d/node_modules/@fission-ai/openspec/bin/openspec.js instructions apply --change issue-96-map-acceptance --json`; use the same entrypoint for `validate issue-96-map-acceptance --strict`.

## Limits and prior context

Mobile checks are browser emulation and responsive inspection, not physical Android/iOS certification or production hosting proof. Available physical capability in the original checkout is Android; no physical access is needed to complete this bounded epic. Preserve the inventoried legacy creator/license gap and intentional desert fallback.

The [backlog disposition](issue-96-map-acceptance/backlog-review.md) records why #96 was selected. Prior persistence handoff: [main's preceding plan](https://github.com/luminari-gurus/tactics-guru-v2/blob/79f7d983ff3a12ca38e93efdc72f3f317dfb789c/docs/ongoing-projects/plan.md). #57/#58/#64/#74 and other battle acceptance remain separate.
