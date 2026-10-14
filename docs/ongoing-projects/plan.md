# PR #105 — map acceptance and cached battle repair

Updated 2026-10-14 (Asia/Jerusalem). [PR #105](https://github.com/luminari-gurus/tactics-guru-v2/pull/105) remains open against `main`. The user authorized validating and fully fixing every review finding, Git repair/publication and local verification using ablation and OpenSpec. Merge remains a separate action.

## Current work

- Worktree: `C:/Users/apexw/.codex/worktrees/repair-pr-105/Tactics-Guru`; local branch `branch/repair-pr-105`, publishing to `branch/issue-96-map-acceptance`.
- Original reviewed head: `46465d4f398ed9c87ea5223a8ef928fcdcfc3e11`. Current base: `7a9b22b` (`main`, including merged #107's run contract). All four original PR patches rebased without conflict; range-diff shows exact patch equivalence. Useful history is retained; no extra stack, squash or release tag is needed.
- Review inventory: one P1 review, no inline threads, and one automated Cloudflare status comment. The P1 is valid: actual BFCache restoration revived seed 1 over newer seed 2 saves, and Wait replaced primary/backup with seed 1 commands 7/6.
- OpenSpec repair: [proposal](../../openspec/changes/pr-105-bfcache-recovery/proposal.md), [design](../../openspec/changes/pr-105-bfcache-recovery/design.md), [spec](../../openspec/changes/pr-105-bfcache-recovery/specs/battle-session/spec.md), [tasks](../../openspec/changes/pr-105-bfcache-recovery/tasks.md). Original [#96 tasks](../../openspec/changes/issue-96-map-acceptance/tasks.md) remain complete and historical.

## Ablation and implementation

**Outcome:** no stale history document can overwrite the current battle; all review details are addressed with local evidence. **Non-goals:** concurrent-tab ownership, new save format, map changes, physical certification and deployment. **Files:** `src/phaser/start.ts`, existing persistence browser tests, storage docs, QA and this OpenSpec/handoff. **Proof:** observed persisted pageshow, exact save-slot preservation and Continue state, existing full unit/browser suite, root/prefix builds, strict OpenSpec and document checks.

The battle bootstrap now synchronously invokes existing scene shutdown on pagehide and reloads a cached pageshow through normal read-only startup. This reuses session disposal and the recovery UI; persisted revision tokens or duplicate save guards are unnecessary. Ordinary hide/show retains its established behavior. See [storage lifecycle contract](../battle-storage.md#browser-history).

## Validation and publication

The focused BFCache regression passes 12/12 across all three profiles. All 508 unit tests and 77 content checks, both TypeScript checks and root/prefix builds pass. The full root browser suite passes 348/348; prefix map/history checks pass 36/36. Both final runs have zero failures, skips, flakes or retries. Strict OpenSpec, relative links and whitespace pass. [Review repair evidence](../qa/pr-105-review-repair.md) and [source-bound results](../qa/pr-105/validation.json) record commands, counts, screenshots and limits. Raw logs and screenshots live under ignored `tmp/review-105/`. The initial regression fails on the rebased unmodified runtime; the retained reproducer confirms actual save loss. Git publication and the review response are next.

## Historical map acceptance and limits

The [original six-criterion acceptance report](../qa/issue-96-map-acceptance.md), [source-bound validation](../qa/issue-96/validation.json) and [original handoff](https://github.com/luminari-gurus/tactics-guru-v2/blob/46465d4f398ed9c87ea5223a8ef928fcdcfc3e11/docs/ongoing-projects/plan.md) remain historical evidence for the original map-only scope. They do not certify the later runtime repair or newer main. The legacy creator/license gap and intentional desert fallback remain documented.

Physical Android/iOS lifecycle certification, production hosting and #57/#58/#64/#74 acceptance remain separate. No merge, release tag, manual deployment, manual issue closure or OpenSpec archive is part of this repair. The existing Cloudflare integration may automatically build a published PR; remote CI is not a completion gate.

The primary checkout's unrelated instruction/environment edits and Android-certification draft, and the original planning worktree, remain untouched. Local test tooling uses the existing npm CLI through ignored `tmp/review-105/bin/npm.cmd`; packages, lockfile and configuration are unchanged. Edge override: `PLAYWRIGHT_CHROMIUM_EXECUTABLE=C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`. OpenSpec CLI: `node C:/Users/apexw/AppData/Local/npm-cache/_npx/c37562604d2d088d/node_modules/@fission-ai/openspec/bin/openspec.js` with `OPENSPEC_TELEMETRY=0`.
