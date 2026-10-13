# Issue 96 — combined map acceptance and closeout plan

Updated 2026-10-13 (Asia/Jerusalem). Status: planning only; acceptance execution and implementation have not started.

- Issue: [#96 — Map type, biome and art style selection](https://github.com/luminari-gurus/tactics-guru-v2/issues/96).
- Assignee: `moshehbenavraham`; [kickoff comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/96#issuecomment-6152871668).
- Task branch: [branch/issue-96-map-acceptance](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-96-map-acceptance), published and natively linked in #96's Development section.
- Base: `main` at `79f7d983ff3a12ca38e93efdc72f3f317dfb789c`.
- Workspace: `C:/Users/apexw/.codex/worktrees/issue-96-map-plan/Tactics-Guru`.
- OpenSpec: [proposal](../../openspec/changes/issue-96-map-acceptance/proposal.md), [design](../../openspec/changes/issue-96-map-acceptance/design.md), [future tasks](../../openspec/changes/issue-96-map-acceptance/tasks.md). Specifications are deliberately skipped because no behavior change is proposed; the child contracts remain authoritative.

## Why this item

The [complete repository backlog review](issue-96-map-acceptance/backlog-review.md) covers 18 open issues, the one open PR, prerequisites, assignments and active branches. #75 has stronger downstream value but is already assigned to `dubstylee` and has an active planning branch. Its run/reward dependents remain blocked; physical iOS items are ineligible locally; release planning still needs owner decisions. #96 is the remaining unclaimed, concrete acceptance task. No new feature or child issue is needed.

#97/#99/#98 are completed through merged PRs #100/#101/#104. The shared product contract is approved, and the source already implements all three controls. Promoted #96 to `ready for work`, assigned the caller, and left the kickoff comment. The epic remains open: closed children do not by themselves prove every parent criterion.

Available physical mobile capability: Android, from the caller checkout's `CAN_TEST_MOBILE=android`. Required for #96: desktop/mobile usability and keyboard checks, with no mandated physical-iOS matrix. Existing configured Pixel 7 profiles provide emulation only. #64/#74/#81 physical certification is separate. Private project-only drafts could not be read because `read:project` is unavailable.

## Existing implementation and evidence

[Map contract](../overworld-map.md) defines layout → biome → art, defaults Rooms/Grassland/Simple, 20×20 topology, reproducibility metadata and fallback. `src/map/generate.ts`, `biomes.ts`, `art.ts` and `view.ts` implement those boundaries. The approved exception is explicit: type/biome changes apply the displayed valid seed; art changes rerender retained data and leave a pending valid seed edit unapplied. Invalid input preserves the previous map and selections.

[Algorithm QA](../qa/issue-97-map-algorithms.md), [biome QA](../qa/issue-99-map-biomes.md) and [art QA](../qa/issue-98-map-art.md) already document generation matrices, combined controls, 18 combinations, keyboard use, asset failures and root/prefix navigation. The art report records 336 configured browser passes on its implementation working tree. These are inherited records, not tests run in this planning session.

## Acceptance mapping

1. **All three accessible controls:** use `tests/overworld-map.spec.ts` to verify associated labels, native keyboard selection, visible focus, 44px controls and no horizontal overflow on desktop and emulated portrait/landscape. Inspect the combined page and retained visuals.
2. **Seed and selection transactions:** reuse type/biome/art tests for Generate, New seed, valid pending edits, invalid input rollback and retained selections. Preserve the approved art-only rerender exception.
3. **Reproducible data and isolated RNG:** reuse `tests/unit/overworldMap.test.ts` for the seed matrix, preserved Rooms fingerprint, bounds/connectivity/fallback and biome/RNG isolation; use browser signatures to verify art leaves cells, terrain and version metadata unchanged.
4. **Baseline choices and metadata:** verify seed 1/Rooms/Grassland/Simple defaults and refresh behavior, all supported options, visible seed/type/version/biome/version/fallback information, and the documented absence of URL/save state.
5. **All combinations and fallback:** inspect 3 types × 3 biomes × 2 art styles; use existing matching-legend checks and desert, network, decode and stale-load scenarios. Preserve the inventoried three PNGs and their documented provenance limits.
6. **Navigation and regression evidence:** pin the built revision and `data-commit`, run root map checks and configured-prefix entry/refresh plus relative-route biome/art checks, verify battle startup/isolation, and record applicable checks with actual counts and limitations.

## Execution after plan approval

1. Refresh main and issue state, pin the actual revision, and compare runtime/test/config/lockfile blobs with child evidence. Start `docs/qa/issue-96-map-acceptance.md` with six acceptance sections and separate inherited/fresh/unverified results.
2. Run the existing map unit suite and root map browser suite. Inspect representative original screenshots and the complete combination sheets; record browser/version, profile, URL, source/build identity, command and outcome.
3. Build with `--base=/prototype/`; use the existing `PLAYWRIGHT_BASE_PATH=/prototype/` configuration and relative-route biome/art cases for prefix checks. Some older map tests use absolute `/map`, so do not label those as prefix evidence. Confirm direct `/prototype/map` entry/refresh separately with actual controls.
4. If an acceptance requirement lacks coverage, extend its existing test only. If a reproducible contract violation is found, retain a failing regression and make the smallest in-scope correction. A documentation-only result is acceptable; do not add code merely to make a larger PR.
5. Finalize the epic report and update the tasks/plan. Publish a normal PR after acceptance work is authorized; use `Closes #96` only with evidence for all criteria, otherwise `Refs #96` and explicit blockers. Do not manually close the epic in this planning task.

## Files and verification

Expected deliverable: `docs/qa/issue-96-map-acceptance.md`, plus narrowly needed evidence under `docs/qa/issue-96/` and updates to this plan/OpenSpec tasks. Reuse existing child assets rather than duplicating them. Conditional files: existing map tests, `docs/overworld-map.md` for proven documentation discrepancies, and map source only for a reproduced violation of the approved contract. No package/config change is planned.

Commands for the execution phase:

- `npm run test:unit -- tests/unit/overworldMap.test.ts`
- `npm run build` (runs both application/domain typechecks)
- `npm test -- tests/overworld-map.spec.ts`
- `npm run build -- --base=/prototype/`, then prefix-configured `npm test -- tests/overworld-map.spec.ts --grep 'biome|art '`, followed by restoring the root build before root regression checks
- `npm run test:unit`, `npm run validate:content`, and full configured `npm test` if source/tests change or inherited broad evidence cannot be bound to the tested source
- `openspec validate issue-96-map-acceptance --strict` and `git diff --check`

Use the existing installed Chromium executable override if required on this host. Record actual passes, failures, skips, retries and unperformed checks. Reuse exact-source broad historical evidence only when its source binding is established; do not silently convert it into a fresh run. After required checks pass, repeat or broaden only for new changes or unresolved concerns.

## Boundaries and risks

No new generator, biome, art set, RNG semantics, save system, campaign/run integration, dependency upgrade, deployment or infrastructure operation. Broader behavior changes require a revised plan. Main can advance: refresh and bind every conclusion to the actual tested revision. Emulated mobile/local preview evidence does not establish physical-device or hosted production behavior. No physical iOS acceptance is claimed.

The prior persistence handoff is preserved at [main's previous plan](https://github.com/luminari-gurus/tactics-guru-v2/blob/79f7d983ff3a12ca38e93efdc72f3f317dfb789c/docs/ongoing-projects/plan.md); #57/#58/#74 remain open and are not superseded by map closeout. The original dirty checkout and Android draft remain untouched.

Planning validation: strict OpenSpec validation passed; proposal/design/tasks are complete, specification deltas are intentionally skipped, and all seven execution tasks remain unchecked. Nine relative document links resolved. Game tests and acceptance execution were not run for this planning-only publication. The plan and related planning files are committed/pushed together; the publishing session separately verifies the exact commit and remote parity.
