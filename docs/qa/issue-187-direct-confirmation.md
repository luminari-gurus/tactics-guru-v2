# Issue 187: direct battle action confirmation

[Issue #187](https://github.com/luminari-gurus/tactics-guru-v2/issues/187) · Branch `work/issue-187-confirm-action` · Caller `dubstylee`.

The caller approved the concrete small-change chat plan with “Approved” on 2026-10-24. No OpenSpec change was needed for this existing HUD/session confirmation path. Base: `98d872d1a02fa1907e303004b416340da5c6df53`. All final runtime/browser evidence below tests clean implementation commit `995d5f5`; subsequent changes only package evidence and update prose. Source, tests, helpers, configs, dependencies and assets were hashed before qualification and verified unchanged afterward. The final documentation commit does not represent another application run.

## Result and acceptance

The shared standalone/run/dungeon button reads **Confirm action** and immediately calls the existing `BattleSession.confirm()`/presentation path. There is no intermediate action dialog. Existing command preflight, pending-intent consumption and synchronous presentation locks still control commitment. Keyboard activation hands focus away from the disabled button; the existing held-key protection remains in place. The DOM id is retained for CSS/geometry consumers. Inspection, recovery and restart dialogs retain their own flows.

| Issue criterion | Evidence |
| --- | --- |
| Button renamed wherever the old control appears | Shared HUD implementation, label assertion, inspected portrait/landscape screenshots, standalone/run/dungeon and prefixed-route cases |
| Existing confirmation behavior executes directly | Real movement/basic/signature actions; complete legal battle/run/dungeon journeys; ability fixtures including deliberately confirmed friendly fire |
| No additional action modal | Explicit no-visible-dialog assertions during direct keyboard/touch/ability execution; inspection/restart/recovery remain separately tested |
| Validation/disabled states and exactly-once execution | Invalid-target and spent/locked controls; frozen real Enter activation followed by duplicate event dispatch; real held Enter; touch suspension; exact replay/command/save comparisons |
| Desktop and mobile Playwright evidence | Chromium desktop and native touch portrait/landscape; iPhone WebKit acceptance; dedicated five-profile health-bar matrix and narrow layouts |

Preparation can still be cancelled with Cancel action or Escape without changing state, RNG, replay or saves. Unlike the removed modal cancellation path, the pre-existing Cancel action path retains the inspected board cell while clearing action/intent. The migrated assertions preserve that behavior and test native same-destination retry after explicitly choosing Move again.

## Verification scope and results

The affected-consumer regression covers the shared `playCommand` helper and all battle HUD consumers: battle loop/board/animations/audio/persistence/Guarded/health bars, run progression, dungeon/exploration/lifecycle, procedural boards and base-aware assets. Separate ability/encounter/item dev fixtures, both WebKit configs, the dedicated health-bar matrix, configured production/development telemetry and root/prefix asset modes retain their owning selection. Proof-scene-only suites, placement-dev and the isolated performance collector are outside this bounded confirmation change; this is not a clean full-inventory or release/performance qualification.

| Check | Result |
| --- | --- |
| `npm run test:unit` on frozen source | 941 passed in 55 files |
| Ordinary, prefixed and restored-root `npm run build` | Passed content validation (221 checks), both TypeScript scopes and Vite; existing large-chunk/config-loader warnings retained |
| 13 affected default Chromium files, all three projects | 501 passed, 3 failed |
| Combined dev fixtures | 69 passed |
| WebKit battle/run acceptance | 48 passed, 4 failed |
| WebKit dungeon/exploration | 60 passed |
| Dedicated health-bar matrix | 25 passed |
| Configured production telemetry | 36 passed |
| Configured development telemetry | 36 passed |
| Root development assets | 66 passed, 3 production-only resource-hint skips |
| Prefixed production-preview assets | 69 passed |
| Prefixed development assets | 66 passed, 3 production-only resource-hint skips |
| Exact discovery comparison | All test IDs, titles, tags, timeouts, expected statuses and effective projects/devices unchanged from the literal base test tree |
| `git diff --check` | Passed |

The final browser selection totals **976 passed, 7 failed, 6 skipped**, with zero flaky results or retry attempts. Production-only skipped assertions execute in their production-preview owning modes. An earlier 36-case focused boundary run passed; it is not added again to that total. Exact commands, flags, source/build hashes, per-case results and reports are retained under [issue-187](issue-187/summary.json), with [SHA-256 checksums](issue-187/SHA256SUMS.json).

Telemetry ran the intended full configured suites, but npm ignored the optional reporter/output flags because the local orchestration omitted the `--` separator for those two invocations. Their complete Playwright list logs are retained and every executed case is matched to the unchanged 36-ID discovery set in explicitly derived stdout-result files. These are not claimed as native JSON reports. Passing suites were not repeated solely to change report formatting.

## Preserved failures and literal-base comparison

Every broader failure was reproduced with the same assertion and diff at clean literal base `98d872d`, using the same locked installation versions, host, engines, one worker and zero retries. Only the affected cases were run on base; no base full matrix was repeated. [Comparison](issue-187/baseline-comparison.json.gz), both base native reports, base build/source identity and current native reports are committed.

- `authored final entry preserves carried heroes and equipped projection`: fails in all three Chromium profiles because an HP-only `{heroId, hp}` projection is compared with party records that now also contain `learned`, `level`, `maxHp` and `xp`. It fails before an action is confirmed.
- `changed saved data refuses an old confirmation and requires fresh review`: WebKit portrait/landscape fail the existing `#fit-restart` focus assertion after cancelling the stale-save restart flow.
- `run preparation and dialogs retain 44px controls, native touch and narrow layout`: WebKit portrait/landscape fail the existing `#fit-restart` focus assertion after cancelling a new-run dialog.

Those assertions and product behavior were not weakened or repaired in this confirmation change. The failed regression rows remain failed; matching base failures are attribution evidence, not a green full-suite result. All issue-specific direct-confirmation criteria above are verified.

Initial local iteration retained six assertion failures while migrating modal cancellation to the existing Cancel action behavior (15 passed/6 failed), one zero-test port-conflict launch, and a test-only TypeScript assertion-shape error. The assertions/type were corrected; the subsequent focused 36-case run and committed-source qualification remain separate receipts rather than rewriting those attempts.

## Environment and evidence boundaries

Local macOS arm64, Node v26.11.0, Playwright 1.63.0, Chromium 153.0.8010.12 and WebKit 26.6. All browser execution was serial with one worker and no retries. Persistent caches and unrelated workstation load were not independently controlled, so these are functional acceptance receipts, not a comparable performance benchmark. The registered `unraid-tactics-01` Actions runner was offline; no hosted fallback or CI workflow change was introduced. No physical-device testing is claimed. `CAN_TEST_MOBILE` was missing/invalid in the caller checkout and was treated as no declared physical platforms; emulation is sufficient under AGENTS.md.

The initial root production artifact, separate instrumented production telemetry artifact, final restored root artifact, commands and allowlisted flags are source-bound in the receipts. Development modes use the recorded source/config/flags rather than a production bundle. No production deployment, merge, manual issue closure, save-format change or unrelated defect fix was performed.
