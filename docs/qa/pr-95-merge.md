# PR #95 merge validation

Date: 2026-10-13 (Asia/Jerusalem). [PR #95](https://github.com/luminari-gurus/tactics-guru-v2/pull/95) merged as `38cb3d9defdef6bac0233dfee290d78ebc391d6f`.

## Pinned integration

- Main parent: `d15caca0f66ed2e956cbf7194bd67a634c2a224f`.
- PR parent: `03bb3c41c4bbe44a5f8be821c9680b8c6b1b708c`.
- Merge base: `a8e115aa07aea4831419ae19b4b1db88c368fbe0`.
- Tested and published merge tree: `961591d1f4be1847e078d5d17d5beb4d16f3b2a9`.

Main was seven commits ahead of the prior integration, adding PR #100's map algorithms and PR #101's biomes. The merge was conflict-free; README automatically retained both changes. Battle/session/persistence/UI source matches the repaired PR head. Map source and tests match the main parent. Relative to the repaired head, the only runtime/test changes are the four map files and their two test files. Package/lockfile/config inputs are unchanged.

All eight PR commits remain in ancestry. The source branch was retained. No history rewrite, squash, release tag or extra stack was needed. The connector's merge request returned HTTP 403 (integration permission); a guarded normal fast-forward Git push published the exact locally tested commit. Remote refs were checked immediately before publication. GitHub then reported merged and automatically completed #73/#92.

## Fresh checks on the merge commit

Lockfile dependencies were installed with `npm ci --no-audit --no-fund`. The installed Node runtime and an ignored npm wrapper were used because npm is absent from PATH; package versions and repository configuration were not changed.

- `npm run test:unit`: 446/446 passed.
- `npm run validate:content`: 77/77 passed (the content cases are also included in the unit total).
- `npm run build` and `npm run build -- --base=/prototype/`: both TypeScript configurations and both production builds passed.
- `openspec validate issue-73-battle-resume --strict` and `openspec validate issue-92-public-asset-base --strict`: passed; the existing 12/12 and 3/3 tasks remain completed.
- Root preview: `npm test -- tests/battle-loop.spec.ts tests/battle-persistence.spec.ts tests/public-asset-base.spec.ts tests/overworld-map.spec.ts` passed 120/120 in 5.5 minutes (40 per configured profile).
- Prefixed preview: after the matching build, `PLAYWRIGHT_BASE_PATH=/prototype/ PLAYWRIGHT_SERVER_MODE=preview npm test -- tests/public-asset-base.spec.ts` passed 39/39 in 1.4 minutes (13 per profile). In PowerShell set these environment variables separately before the command.
- Whitespace checks passed for the merged diff and closeout documentation.

Windows; Edge `155.0.4283.45`; one worker; unchanged normal timeouts; desktop and emulated Pixel 7 portrait/landscape. Both runs used loopback port 4173. JSON results were checked for unique configured cases, one successful attempt each, and zero failures, flaky or skipped cases. The current complete suite enumerates 318 cases; this session intentionally ran the 120 relevant integration cases and the separate 39-case prefix regression, not all 318.

Checks cover legal victory/defeat/restart, hydration during player/enemy presentation, recovery/export/reset and storage failures, keyboard/touch/modal ownership, root/prefix entry and refresh, real-gesture audio requests, controlled asset failures, map routing/import failure, all map type/biome combinations and isolation from battle storage. Continue/recovery screenshots were inspected in all three profiles, plus the portrait cellular/forest map and a prefixed battle screenshot. No integration regression was found.

Raw logs, JSON reports and screenshots remain in ignored `tmp/merge-pr-95/` in `C:/Users/apexw/.codex/worktrees/merge-pr-95/Tactics-Guru`; [merge-results.json](pr-95-merge-results.json) records counts, provenance and report hashes. The published [prior review-repair evidence](issue-92-public-asset-base.md) retains its complete 309-case root run and 117 additional focused cases; its local root/prefix log totals were checked, and commits after its runtime revision `4ca9ca5` change documentation only. Those historical runs are not claimed as fresh combined-tree execution.

## Limits and remaining acceptance

The existing Phaser large-chunk warning and Node color-environment warnings remain. No Actions workflow is configured in this checkout, and the connector returned no commit statuses; this is not a claim of remote CI success. No physical Android/iOS test, audible listening, hosted-prefix validation, manual deployment or deployed-main verification was performed.

#74 owns remaining persistence/lifecycle and measured acceptance, after #57's first-battle readiness gate. #64's physical matrix and #66's intermittent iPhone Safari restart remain open; emulated restarts do not establish that physical report's cause or resolution. #58 remains open. The [active handoff](../ongoing-projects/plan.md) prepares the next session without starting it.
