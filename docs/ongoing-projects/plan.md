# Issue #483 — Repair the dungeon counter migration browser assertion

- Issue [#483](https://github.com/luminari-gurus/tactics-guru-v2/issues/483), claimed by [@moshehbenavraham](https://github.com/moshehbenavraham) in the [issue comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/483#issuecomment-7126376882)
- Implementation branch [branch/issue-483-dungeon-counter-migration](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-483-dungeon-counter-migration)
- Planning base `960eb8d3ef594d4fc93e40ae04d53b7bf75bc5b2` on `main`, reviewed November 24, 2026 (Asia/Jerusalem)
- Previous handoff [#482 radial battle controls](issue-482-radial-controls-regressions-plan.md)
- OpenSpec [issue-483-dungeon-counter-migration](../../openspec/changes/issue-483-dungeon-counter-migration/proposal.md)

## Implementation status

Implementation authorized November 24, 2026, including OpenSpec tracking. The published planning branch was clean at `8e73e851` and has incorporated `main` at `1a4b0af1`. The intervening changes cover matched-batch tooling and leave the affected migration and browser inputs identical to the planning base. A Linux verification checkout and reports are under `/home/aiwithapex/projects/tactics-483-verification.giz3lM` in WSL Ubuntu. The baseline runs on the literal planning base.

The baseline root preview at `960eb8d3` built on Node `24.15.0` with the locked Playwright `1.64.1`. Discovery selected exactly the two WebKit cases. Both failed at the expected assertion with 13 expected and 17 received, one worker and zero retries. `base-webkit.json` and `base-webkit-artifacts/` retain the two failures. The sorted distribution file-manifest digest is `00f6eb16dfa505e729c661e4664b5b5ad0692d84e57b6d3657449235ebe994fd`.

The two-file source fix is in place. The test now imports the existing format identifier and compares it to the saved envelope. Diff review confirmed the original fixture, legacy assertions and production encoder/decoder logic are preserved. The final targeted and ordinary PR checks are the remaining OpenSpec task.

## Selection

Reviewed all 42 open issues, including unlabeled items, five open PRs, active branch refs, and GitHub Projects visible to the authenticated account. No Projects were returned for the repository, organization, or account. #483 had no assignee, linked branch, implementation PR, or formal dependency. [#208](https://github.com/luminari-gurus/tactics-guru-v2/issues/208) and [PR #481](https://github.com/luminari-gurus/tactics-guru-v2/pull/481) reference the failure as part of their P1 verification work. The separate radial-control repair for the other six recorded failures, [PR #484](https://github.com/luminari-gurus/tactics-guru-v2/pull/484), is in the planning base.

The [serial](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/45306223119) and [parallel](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/45306284527) receipts show the same counter case failing in WebKit portrait and landscape at `9fc9d44`, with zero retries. The issue records expected format 13 and observed format 17. The inspected migration, storage, test, fixture, package and WebKit config paths are identical between that head and the planning base. This is the smallest verified repair that removes a known obstacle to rerunning the matched comparison. A new green comparison and the full verification timing target remain with #208.

## Outcome and implementation

Make the existing [browser migration case](../../tests/main-menu.spec.ts#L735) assert the canonical envelope format for the fresh dungeon written after accepting replacement. The old save is read and recorded during that journey. The envelope check at the end is for the newly created dungeon.

1. The [dungeon session replacement](../../src/app/DungeonSession.ts#L375) calls `freshDungeon` with tracking enabled. [Fresh exploration](../../src/domain/exploration.ts#L62) goes through `visit`, which sets wall sight. [The encoder](../../src/domain/dungeonSaveEnvelope.ts#L38) therefore uses `WALL_SIGHT_STATS_SAVE_FORMAT` (17) before any active encounter-entry or ground-loot state exists. Export that existing named constant from `src/domain/dungeonSaveEnvelope.ts`. Keep its value and encoder/decoder behavior intact.
2. Add the constant to the existing envelope import in `tests/main-menu.spec.ts` and use it for the new primary save’s exact format assertion. Keep the literal [format-12 counter fixture](../../tests/fixtures/saves/issue-270/counter-dungeon-v1.json), byte-for-byte startup checks for both slots, and old/new identity checks. Retain the assertions for preserved kill and move counts, partial legacy time, the old record and counter bests, exclusion from the playtime best, and whole-run time coverage in the new save.

## Ablation and scope

Reuse the one named format definition and the existing browser journey. The envelope assertion checks which format the browser persisted. Simply decoding any supported format would lose that check. Exporting the existing constant avoids a second format literal or a helper. The [dungeon unit tests](../../tests/unit/dungeon.test.ts) still independently pin formats 12, 13, and 17 for their respective states. OpenSpec tracks the two-file implementation with `skip_specs: true` because the acceptance contract and application behavior are unchanged.

## Proof for the implementation PR

1. Preserve the historical failures above. Use a root production preview of the literal planning base with one worker and zero retries to confirm that both WebKit profiles reach the stale assertion. If the base fails earlier, retain that report and diagnose the difference before attributing it. Use the same fixture, dependencies, browser versions and conditions for the final comparison.
2. Run the existing dungeon units and ordinary PR verification on the final fix. The unit file covers reading the literal counter-only save, preserving partial time, and writing the applicable legacy and wall-sight formats. The PR tier covers both type scopes, the production build and the routine smoke journeys. Run the focused Playwright case against that final root build. Add `--list` to each Playwright command first to verify exactly two WebKit and three Chromium profile/case IDs. Both WebKit orientations and both Chromium mobile orientations are emulated.

~~~sh
npm run test:unit -- tests/unit/dungeon.test.ts
npm run verify:pr

case_name='counter-only dungeon upgrades known counters without inventing complete playtime'
npx --no-install playwright test -c playwright.device-acceptance.config.ts tests/main-menu.spec.ts -g "$case_name" --workers=1 --retries=0
npx --no-install playwright test -c playwright.regression.config.ts tests/main-menu.spec.ts -g "$case_name" --workers=1 --retries=0
git diff --check
~~~

3. Retain final reports and failures with commit, build, profile and test IDs per the [verification policy](../verification-policy.md). Scope browser execution to the changed case and the ordinary PR tier. A focused pass leaves the original matched runs recorded as failed. Once all five profile/case combinations and the remaining checks pass, open one PR with `Closes #483` and `Refs #208`.

## Estimate and open questions

Allow 20–35 minutes for implementation, focused comparison, and ordinary PR checks with dependencies and browser binaries available. Any self-hosted CI queue adds elapsed time. There are no open product or design questions.
