# Issue 155 overworld movement acceptance

Issue: [#155](https://github.com/luminari-gurus/tactics-guru-v2/issues/155). Caller/assignee: `dubstylee`.
Branch: `work/issue-155-overworld-enemy-movement`, based on `d5b19279a869501205e98856ebd5e5f91f8c287d`.
The caller explicitly approved the [published OpenSpec plan](../../openspec/changes/issue-155-overworld-enemy-movement/proposal.md) in chat on 2026-10-25.

## Result and scope

The real `/map` route now demonstrates passive wandering and aggressive shortest-path pursuit with inspectable profiles. Movement is pure and reproducible, uses a separate RNG, resolves occupancy in stable ID order and pauses while hidden. Generation resets simulation atomically; art changes and failed regeneration preserve it. Final disposal aborts listeners and scheduling; actual cached-document restoration retains the world and resumes without catch-up.

All seven issue acceptance items have affected-scope evidence. No player movement, combat trigger, save format, terrain/placement algorithm, dungeon behavior, dependency or production deployment changed. Configuration is the typed initialization argument, not a new settings UI. See the [current rules](../overworld-map.md#enemy-movement).

## Source, build and evidence reuse

Final tested source: **`f7ec7ddb4815d20ee84df44dccae0e08c24e7b48`**. The final ordinary production build was made with a clean tracked tree and embeds that commit with `dirty:false`; it remains restored at `dist/`. Source/test/config/lockfile hashes, build-file hashes, environment, raw report hashes and screenshot hashes are in [inputs.json](issue-155/inputs.json). Later changes in this delivery are QA/planning prose and evidence only; they do not change those relevant inputs. They did not execute the earlier tests again.

The broad preview run started at planning commit `0cd726464a7cc5f42f22938d94ea22d95e205667` with the implementation uncommitted (`dirty:true`). Its input manifest records the actual source hashes, including the then-untracked movement module. Those runtime bytes were committed as `00e8bee`; every recorded runtime/config/lockfile input is identical at final tested source. Only `tests/overworld-map.spec.ts` changed afterward:

- The byte-transfer case uses the native clock, because Playwright's clock fixture replaces Resource Timing. All three affected cases were freshly rerun without weakening the exact 1,118-byte assertion.
- Direct-entry navigation uses `map` relative to the configured base. On `/` this resolves to the same URL as the earlier `/map`; all three root and three prefix cases were freshly verified after this change.

Other test bodies, their clock handling, helpers, projects, dependencies and application behavior are unchanged, so their 69 passing results and reviewed screenshots are reused as functional coverage. Informational embedded build commits differ between those builds; this report does not claim identical emitted bytes or that the earlier run executed the final commit. No old failure is relabeled as passing, and there is no claim of a clean full-regression run.

## Checks and retained failures

All browser commands use `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, one worker and zero retries. Exact commands, selected IDs, projects, errors, times and raw report hashes are retained in [results.json](issue-155/results.json). Raw logs/JSON and the original screenshot/error directory remain locally at `tmp/verification/issue-155/`; the compact receipts and representative images are committed here.

| Check | Actual result |
| --- | --- |
| `npm run test:unit -- tests/unit/overworldMap.test.ts` on final source | **54 passed**; original map/placement fingerprints plus movement configuration, rejection, geometry, RNG, occupancy and immutability checks |
| `npm run build` on final source | **Passed**: 221 content checks, both TypeScript scopes, production bundle |
| Full affected map preview file, desktop + Pixel 7 portrait/landscape | **69 passed, 3 failed, 3 expected dev-only skips**, 59.3 seconds; original failed result retained |
| Byte-transfer recovery, all three projects | **3 passed**, no skips/retries; native clock restores real Resource Timing entries |
| Explicit `PLAYWRIGHT_SERVER_MODE=dev` placement-failure/retry, all three projects | **3 passed**, no skips/retries; moving state is preserved on failed generation |
| Root map entry/refresh from public-asset-base suite | **3 passed**, no skips/retries |
| Initial prefixed preview selection | **3 passed, 3 failed**; separate base-aware route checks passed, direct-entry test used hard-coded root `/map` instead of `/prototype/map` |
| Prefixed direct-entry recovery after relative URL repair | **3 passed**, no skips/retries |
| Final clean-root direct-entry test | **3 passed**, no skips/retries; root build restored |
| Strict OpenSpec validation and `git diff --check` | **Passed** |

The failed byte-transfer assertions read zero bytes because the newly installed test clock hides Resource Timing entries. This was a harness defect introduced during this work; no asset-transfer assertion was relaxed. The original prefix failures are also retained, with the corrected navigation separately verified. Recovery results do not rewrite either failed invocation as a clean run.

The 75 discovered map selections remain present across the three projects. Preview's three intentional skips are the source-module placement interception, which ran successfully in its required dev mode. No mobile tags or global suite selection changed. The map test file opts into real Chromium BFCache, following the existing persistence-suite pattern.

## Acceptance mapping

| Issue item | Evidence |
| --- | --- |
| Configurable profiles and both behaviors | Configuration rejection/copy units; real-route test shows passive enemy-1 and aggressive enemies with ranges 6/10, checks visible and accessible assignments, and observes actual passive/pursuit movement on every profile |
| Passive wandering/stay | Enclosed and single-exit fixtures, reproducible neighbor draws and 45 type/biome/seed combinations over 30 steps each |
| Aggressive detection/visibility/loss | Inclusive Manhattan boundary, one beyond, intervening wall, immediate loss after moving the fixture player, documented no-occlusion rule |
| Legal pursuit/occupancy/adjacency | Wall detour with deterministic first step, unreachable approaches, adjacency wait, contested destination, vacated cells/no swaps, per-step unique walkable occupancy |
| Cadence/order/separate RNG | Stable IDs and draw accounting, immutable starting world and unchanged battle RNG; controlled one-second steps, hidden 60-second pause, full-delay resume and independent native-clock smoke |
| Reset/art/hidden/disposal | Successful Generate/New seed/type/biome reset; invalid edits and moving dev placement failure; delayed success/network/decode art regressions; final disposal ignores late images/control callbacks; actual persisted BFCache return on all three profiles |
| Desktop/mobile evidence | Keyboard/focus and native emulated touch; existing 320px control-size/no-overflow assertions; screenshots below visually inspected |

## Environment, images and limits

Local macOS arm64, Node **26.11.0**, Playwright **1.63.0**, Google Chrome **155.0.8059.86**. Desktop Chrome, Pixel 7 portrait and 915×412 landscape emulation; narrow checks use 320×568. Browser invocations were serial, unthrottled, with persistent caches and unverified background workload conditions. These are functional results, not a performance baseline. The bounded model visits at most 400 cells per aggressive search, updates four markers once per second and adds no asset requests. The exact legacy-art transfer check remains 1,118 encoded bytes.

The self-hosted `unraid-tactics-01` runner was offline at preflight. Checks ran locally; no GitHub-hosted fallback or CI success is claimed. No physical device or WebKit testing was performed. Physical availability was missing/invalid and treated as none; Playwright emulation satisfies the issue under AGENTS.md. Battle/dungeon/telemetry matrices were excluded because their runtime contracts, shared marker shape and consumers were unchanged. The existing Vite native-config and large Phaser chunk warnings remain; no budgets/assertions were relaxed.

Reviewed screenshots show readable wrapped controls and behavior descriptions, distinguishable markers and no horizontal clipping; short landscape and narrow screens use normal page scrolling:

- [Desktop](issue-155/desktop.png)
- [Portrait](issue-155/mobile-portrait.png)
- [Landscape](issue-155/mobile-landscape.png)
- [320px narrow](issue-155/narrow-320.png)

No merge, deployment or OpenSpec archival was performed.
