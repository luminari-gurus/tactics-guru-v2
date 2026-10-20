# Issue 157 dungeon floor acceptance

Status: implementation complete, including the caller-selected confirmed-discard policy. All 13 OpenSpec tasks are complete; PR #186 is ready for review with the baseline test failures retained below.

Issue: https://github.com/luminari-gurus/tactics-guru-v2/issues/157. Branch: `work/issue-157-dungeon-floors`. Base: `6bfe127dd3228392ebda6cbee5344afafa84ca48`. Caller approved the published plan `e5b844e` on 2026-10-20. Runtime source hashes are retained in [source-hashes.json](issue-157/evidence/source-hashes.json); runtime source commit is `dc4bb86e6b3a4a92086916777d81503cbc2cb9e0`, published in PR [#186](https://github.com/luminari-gurus/tactics-guru-v2/pull/186). Tested builds were created before that commit and report planning commit `e5b844e` with a dirty working tree; source hashes bind the runtime bytes rather than claiming a clean-commit build. The confirmed-disposal follow-up changes runtime code and has separate source receipts below.

## Delivered behavior

An explicit `/dungeon` route uses current three-encounter content per continuing floor, summary stair controls, guardian-gated descent, ascent/backtracking, carried party/items, versioned deterministic identities and isolated recovery-safe saves. `/run` remains the terminal proof of concept. [Current rules and limitations](../dungeon.md) distinguish this foundation from future spatial exploration, scaling and boss content.

## Evidence and acceptance mapping

| Issue criterion | Implementation and evidence |
| --- | --- |
| Explicit floor/encounter lifecycle, no fixed-depth victory | Pure reducers; multi-digit-depth continuation and safe-number boundary tests; guardian completion returns ready rather than victory. Existing short-run unit/browser suite remains regression coverage. |
| Guardian unlock once, deterministic descent, restored maps/positions | Dungeon unit stair/revisit/duplicate tests; legal guardian browser boundary, floor-two descent/reload/ascent/revisit checks across desktop/portrait/landscape. |
| Generalized identities, validators, carried/reset state and UI | Shared bounded ownership/grant/preparation/projection; depth-aware IDs; injured/defeated survivor and equipment reconstruction tests; actual progress/stair/item UI. Confirmed charm disposal frees capacity while preserving the pending offer; cancellation, stale commands, equipped-stat cleanup and save/resume are verified. |
| Versioned durable floor facts, bounded geometry/save resources | Three-map cache eviction/reconstruction, checksummed descriptor snapshot, 1 MiB encoding refusal for 4,000 retained floor facts, quota/security/backup-write/readback/reset failure injection, raw corrupt bytes and unrelated namespace preservation. |
| Battle/reward/travel reload, RNG equivalence, stale calls, backtracking and reset | Canonical next-command/RNG comparison after save/resume; legal pure-domain command histories through guardian; real browser action/reload, pending/claimed rewards, travel, recovery and restart tests. Final lifecycle checks pass for defeat/reload/reset, restart during accepted presentation, visibility interruption and base-aware navigation. |

The browser reward/guardian tests seed active snapshots reached through legal pure-domain play, then enact the finishing player command through actual controls. They do not claim every preceding turn was played in-browser. The fixture histories are retained with screenshots. Separate unit playback verifies the legal three-encounter sequence and command history. No browser/device emulation is represented as physical hardware.

## Foundation validation receipts

- `npm run test:unit`: **798 passed**, 49 files. `npm run typecheck`: both TypeScript configurations passed. Production `npm run build` and separate `/tactics/` build passed. Strict OpenSpec validation and `git diff --check` passed.
- Full configured Chromium suite: **630 passed, 3 failed, 3 skipped** in 32.4 minutes. The failures are the three existing desktop native keyboard-select cases at battle-loop.spec.ts:66 and :95 (Cancel/Escape), all failing to enable Review action after native selection. The exact same three cases failed on unchanged main `6bfe127` with the same installed Chrome executable and preview mode. No unrelated application or test changes were made to turn those failures green. The three configured production-preview skips are source-module-interception placement-failure tests, one per project.
- Because the full test command failed, its npm posttest did not run automatically. Both configured matrices were run separately: **24/24 encounter checks** and **21/21 item checks passed**.
- Final dungeon route/lifecycle matrix: **21/21 passed**, desktop / Pixel 7 portrait / Pixel 7 landscape. Final prefixed `/tactics/` desktop matrix: **7/7 passed**, including navigation, active/reward/travel reload, guardian/backtracking, corrupt-save export, uncertain-write recovery, defeat, restart and suspension. Final runtime adjustments after the broad regression build (strict malformed-command rejection, owned reward copies, route privacy controls/collection exclusion) are covered by final unit/type/build and these final route matrices; the broad log is not relabeled as a fresh exact-final-build run.
- Initial interaction-only dungeon matrix passed 9/9 before visual inspection found a missing viewport scroll container. The viewport fix adds explicit viewport/horizontal-overflow assertions; corrected screenshots were inspected and retained. A later lifecycle harness initially tried a hidden battle restart control after visibility cancellation had already returned to the summary. Separating suspension and in-presentation restart checks passed without an application fix. Initial temporary prefix/baseline configs failed to start servers because their cwd was `/tmp`; corrected configs use explicit worktree directories. All initial failed logs remain in the evidence directory. Archived text receipts only normalize trailing whitespace/blank EOF lines for Git diff checks; failure messages and results are retained.
- An early unit fixture hard-coded travel revision 5 even though encounter starts also advance revision; the reducer correctly rejected it as stale. The fixture now uses the actual boundary revision. This was a fixture correction, not a relaxed stale-command rule.

Final [runtime/test hashes](issue-157/evidence/source-hashes.json), [regression-phase hashes](issue-157/evidence/regression-phase-source-hashes.json), [full log](issue-157/evidence/full-browser.log), [final dungeon log](issue-157/evidence/dungeon-corrected.log), [prefix log](issue-157/evidence/prefix-browser-corrected.log), and [unchanged-main failures](issue-157/evidence/baseline-browser-corrected.log) are retained. The temporary prefix/baseline configs only change server/output directories and port/base URL; browser projects/launch options are inherited from repository configs. No retries or skipped dungeon checks were configured.

## Confirmed-disposal follow-up

The caller selected “Discard with confirmation”. Disposal is available only during preparation/pending rewards, names the charm and any equipped hero, defaults to Cancel, and requires a separate explicit Discard charm action. It removes that instance and assignment without granting replacements/currency or changing party HP, RNG or the offer. A new deliberate claim can fill the freed slot. No skipping policy or short-run command changes were added.

- Full unit suite: **801 passed** (49 files); both TypeScript configurations and production/content validation passed through `npm run build`. Strict OpenSpec and Git diff checks pass.
- Final dungeon/lifecycle matrix: **24/24 passed**, desktop / Pixel 7 portrait / landscape. This includes Cancel and Escape with identical saved bytes, equipped disposal, save/reload, reward claim after capacity recovery, preparation disposal and absent controls during battle.
- Final `/tactics/` desktop matrix: **8/8 passed**. Confirmation screenshots were visually inspected; retained screenshots accurately show browser emulation.
- Unit coverage additionally rejects malformed/unowned/stale/battle/defeat requests, verifies removed equipment bonuses, unchanged battle RNG/pending offers, and reports failed disposal saving as unsaved without rolling back accepted in-memory state.

[Follow-up source receipts](issue-157/evidence/discard-source-hashes.json), [unit log](issue-157/evidence/discard-unit.log), [build log](issue-157/evidence/discard-build.log), [browser log](issue-157/evidence/discard-browser.log), [prefix log](issue-157/evidence/discard-prefix-browser.log) and [entry chunk sizes](issue-157/evidence/discard-route-size.json) bind this stage. The tested build reports precommit `f8b805e6ce2b7a87a3d6a9a8b1c9175b6abed5d8` with a dirty working tree; source receipts bind its runtime bytes. The earlier broad regression failures and results above remain historical evidence, not a fresh exact-follow-up-build run. This bounded dungeon-only follow-up did not change shared item/run/battle behavior; the complete current unit and dungeon/prefix checks cover it.

## Size and resource observations

[Foundation route-size receipt](issue-157/evidence/dungeon-route-size.json) retains the earlier stage; [confirmed-disposal route sizes](issue-157/evidence/discard-route-size.json) record the latest JS/CSS raw and gzip byte counts. These exclude shared engine and shared application modules; they are not total route transfer or loading-budget acceptance. The existing large-chunk warning remains.

Floor history is retained until an explicit encoded-byte or storage failure; resolved UI geometry is limited to three cached maps. A 4,000-floor valid state exceeds the 1 MiB encoding budget and is refused without pruning. No browser storage is promised unlimited. Save/travel failure tests preserve prior durable recovery and keep the current in-memory floor unmodified until successful candidate publication. Uncertain writes require an explicit Continue or retry choice.

Historical performance failures recorded in #127/#85 remain unresolved by this feature. No production frame-budget, cold-load or physical-device certification is claimed here. No deployment, merge, production configuration change, analytics activation or legacy data modification occurred.

## Delivery disposition

The inventory decision is resolved and verified, all acceptance criteria have implementation/evidence coverage, and all 13 tasks are complete. PR #186 can close #157 after merge. The three baseline-reproduced native-select failures, configured skips and prior performance limitations remain explicit; no merge, deployment or OpenSpec archive was performed.
