# Issue #176 verification

Issue: [#176](https://github.com/luminari-gurus/tactics-guru-v2/issues/176).
Plan: [implementation and continuation](../../ongoing-projects/plan.md).
Base: `491f92a080d8577aca882c3e48ddaf910cf30369`; planning commit `0f1c2e9`.

## Increment 1 — model, storage and menu

Implemented and verified in [PR #359](https://github.com/luminari-gurus/tactics-guru-v2/pull/359).
No automatic journey recording exists yet and no full-issue completion is claimed.

Local Windows x64 / Node 24.22.1, using the existing platform-specific install:

- `node node_modules/vitest/vitest.mjs run tests/unit/runRecords.test.ts tests/unit/runRecordsStorage.test.ts tests/unit/menuSaves.test.ts`: **21 passed**.
- `node node_modules/typescript/bin/tsc --noEmit`: passed.
- `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.domain.json`: passed.
- Explicit discovery of the three new records cases: 9 Chromium and 6 WebKit
  selections. Qualification additionally includes the existing read-only menu,
  artwork/loading, Settings and dialog-focus witness (three Chromium/two WebKit).
- `git diff --check`: passed.

The initial unit iteration retained one failed test assumption: Node 24's navigator
already exposes Web Locks. Missing browser-lock coverage now explicitly stubs
navigator instead of depending on the host. One staged terminal fixture's union
discriminator was corrected for the root typecheck. Focused reruns pass.
Windows npm shell wrappers are unavailable in the current runtime, and this
node_modules tree contains Windows native TypeScript packages; direct Node entry
points supply the local checks. Authoritative build/PR/browser verification runs
on the qualified Linux self-hosted VM with its own locked install.

## Self-hosted qualification

Head `35cb55dc9e50d4aaade5ee7bfd3ec098c3bf2248`, clean tested merge
`c241544dcf4d09519a42117a641c2f2613ef9977`. The merge runtime/test/config tree equals
the head tree; the handoff update changes documentation/task status only.

- [PR verification 42824142789](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42824142789): all six stages passed, 1,257 units with none pending/failed, both type scopes, both build integrations, production bundle and **7/7 core journeys**, zero skips/retries/flakes.
- [Records qualification 42824143064](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42824143064): **12 Chromium + 8 WebKit passed**, zero skips/retries/flakes. Node 24.22.2 on qualified `unraid-tactics-02`, workers 1. The focused browser phases took 16.72s and 17.60s.
- Desktop/Pixel portrait/landscape recovery screenshots inspected: readable wrapping, no horizontal clipping, accessible vertically scrolling dialog. Real keyboard/touch export, restore/reset and exact active-save preservation passed. WebKit portrait/landscape passed the same functional checks.
- [Portable receipt](increment-1.json) retains source/input identity, stages, exact case IDs/attempts and raw-report SHA-256. Full source/browser/environment reports and images were downloaded under ignored `tmp/issue-176/run-<run-id>/`; original workflow artifacts have 14-day retention.

Tasks 1.1–1.4 are complete. Authored-run and dungeon lifecycle, route-history
isolation, replacements and complete legal outcomes belong to the next two
increments, with all original issue gates retained. No physical-device,
performance recertification, merge or production operation is claimed.

## Increment 2 — authored recording (qualified)

Based on ready PR #359 at `7d73d35`. Focused local checks pass 43 units across
RunHistory, RunItemSession, runBattle and record model/storage, plus both type scopes.
New checks include exact terminal Continue, a staged valid victory continuation
(explicitly not earned-play proof), real accepted defeat, pending receipt before
replacement, accepted/canceled/stale/partial/racing replacement, interrupted intent
reconciliation and unavailable history that does not block the new game.

Browser discovery retains existing IDs and selects 27 Chromium + 18 WebKit cases:
records/menu/replacement; complete legal run outcomes and legal defeat; valid and
unavailable-storage isolation across all direct/diagnostic entries, now including
records keys and Q*bert. All five original storage-condition variants remain
configured. Later coverage-preserving splits and the final result are recorded below.

Initial standard run [42826784671](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42826784671)
failed one of 1,269 units: the new terminal-Continue unit synthesized an entire
full-health defeat and exceeded the unchanged 5,000ms per-unit budget under the
full parallel unit load. Dependent build/browser stages did not run. Its report
is retained under `tmp/issue-176/run-42826784671/`; this failed run remains failed.
The unit now uses an explicitly staged, validated terminal snapshot and a distinct
valid backup. The real full-health/legal defeat still runs in existing browser
witnesses. No timeout, gameplay rule or assertion was relaxed.
Two retention regression variants initially failed: failed or accepted replacement
could clear an evicted terminal result's seal, letting Continue recreate it.
Known frozen results now skip pending preparation; a real terminal transition
also seals its own pending intent. Three bounded unit cases cover accepted,
refused and racing outcomes after 100 opposite-mode records, without new fields.
The history observer was also simplified to notify only on a visible status
change, preserving active controls during successful receipt writes. Runs
42827503310 was canceled while queued for this runtime repair. Run 42826784471
finished before cancellation: it passed all 25 menu cases and 10/12 Chromium
run/isolation cases, but the two desktop isolation sweeps exceeded their unchanged
30-second case budget. WebKit outcome/isolation was blocked by that stage failure.
Adding Q*bert to the already long multi-route sweep caused the scope to outgrow
the budget. Q*bert is now a separate case group using the same complete storage
audit, all five existing conditions, real turn/restart, reload and menu checks.
Original journey case IDs/assertions and all deadlines remain. The focused
selection is now 33 Chromium + 22 WebKit cases. Runs 42828913970 and the superseded
queued capture are canceled for this test repair; failures/incomplete runs remain
retained rather than relabeled as passing. Fresh qualification is required.

## Increment 3 — dungeon recording (qualification pending)

Based on authored PR #360 at `9a2c326`, in its isolated dungeon worktree. The
dungeon owner records accepted defeat/terminal Continue and confirmed replacement
through the existing root-menu handoff and in-flow controls. No active-save format
or combat/RNG changes. Local focused checks pass 123 units across dungeon,
RunItemSession, runBattle, RunHistory and model/storage, plus both type scopes.

New session checks verify staged terminal admission and exact save bytes,
continued descent without a record, reviewed old identity versus a placeholder,
stale/partial reset, null-storage gating, history denial and an exploration race.
Staged unit fixtures are not earned-play proof.

Final browser discovery selects 83 cases: 21 Chromium + 14 WebKit menu cases;
30 Chromium cases for full legal dungeon defeat, full first floor/descent/return,
actual BFCache and testing isolation; six WebKit dungeon and 12 WebKit isolation
cases. Unchanged authored long journeys are qualified separately on PR #360's
relevant inputs. No case timeout/retry change or hosted fallback is added.
Browser execution and final issue acceptance remain unverified until recorded.

A new real-owner failure regression initially failed: startup rendering re-inspects
the dungeon save, so a preparatory history-warning notification invalidated its
own reviewed replacement token. Preparatory status now updates quietly; the
existing save owner makes its decision before rendering that warning. The same
unit passes without changing deadlines, and the unavailable-history browser case
now drives two real root-menu New Games, verifying accepted new identity, saved
bytes and visible history failure. This is a required nonfatal-history repair.

Initial final-increment workflow validation failed before execution: the new
single-line command contained an unquoted YAML colon in the grep expression.
It is now a block command, and the workflow is checked with the available YAML
parser and actionlint. These configuration failures are not browser evidence.
Actionlint's known older-schema warnings for `concurrency.queue` and the two
verified custom self-hosted labels are excluded explicitly; all other checks pass.

Run 42831528324 passed 19/21 Chromium menu cases; the two mobile concurrent-confirm
cases queried storage before their destination navigation settled. The witness
now awaits both actual destination documents and boot readiness before querying,
then proves a nonempty new saved identity. Its simultaneous native confirmations,
unchanged deadline and zero retries remain. WebKit/dungeon stages were blocked by
that failed menu stage and are not claimed to have run.
## Authored isolation follow-up

Run 42829329281 also failed the two desktop journey sweeps at the later diagnostic
`?scene=battle` entry, after reaching the overall 30-second case deadline; Q*bert,
mobile isolation and legal run cases passed. The original seven-entry sweep is
now split into ordinary routes and diagnostic entries, retaining the same audit
body, all five storage conditions, actual commands/restart/reload/history checks
and the final saved-menu checks. Each group's starting saved bytes are identical
because the audit proves earlier routes leave them unchanged. Original journey
titles remain for the four ordinary routes; three diagnostic routes receive
explicit companion cases. The selection is 39 Chromium + 26 WebKit cases. No
assertion, route, condition, per-case deadline, worker policy or retry is removed.

### Final authored result

Head `eaf85f74597946aa48c065fe1373b170c892b5ff`, clean merge
`1d58eb67c2376e1f2e0b2e1f2d6392ef3f852cc4`:

- [Browser qualification 42833420673](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42833420673): **39 Chromium + 26 WebKit passed**, no failures/skips/retries/flakes. The complete legal authored journey won all three encounters on all five profiles. Separate complete legal defeat, terminal reload/Continue, restart, abandonment and storage-isolation witnesses passed.
- [PR verification 42833420593, attempt 2](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42833420593/attempts/2): **1,272 units, both types, both build integrations and 7/7 core journeys passed**. Both VMs were idle before this controlled run, with VM-02 browser work held. The unit phase took 59.26s. The failed first attempt took 122.85s and timed out one unchanged survivor fixture and two unchanged biome cases at the original 5s budget; it remains failed.
- [Portable receipt](increment-2.json) and [case records](increment-2-cases.jsonl) retain exact identity, counts, stages, victory witnesses, IDs/attempts and raw report hashes. Complete artifacts are downloaded under ignored `tmp/issue-176/run-42833420673/` and `run-42833420593-attempt2/`.

Task 2.2 is complete and PR #360 is ready for review. The one-off execution
workflow is retired after qualification; the same CLI commands and all cases
remain configured. Final documentation/workflow-retirement changes preserve
every runtime/test/config input relevant to these results. Dungeon gates remain
in PR #361; the issue stays open. The shared physical host's unrelated processes
were not independently controlled, so serialized success does not erase prior
resource-sensitive failures or claim a generally repaired host.

## Remaining final qualification

Run 42840048098 passed 35 menu cases and 27 other Chromium cases, including all
six actual BFCache returns, route isolation and complete legal dungeon defeats.
The full-floor extension failed: mobile inherited its Save recovery assertion
after the new menu navigation; desktop reached the original 300-second battle
budget. The assertion now precedes navigation, preserving both original and new
checks. The failed run remains failed. Only the repaired three Chromium full-floor
cases and the 18 previously blocked WebKit cases run next on otherwise idle
qualified capacity. Other 62 passes are reused: runtime/helpers/config and their
test bodies are unchanged. No timeout, retry or gameplay change is made.

## Complete issue acceptance

Qualified functional head `003be9bad3afc25a264f05ce3b95bd5e8e441b0e`, clean tested
merge `6dd0e291661a7527745e3626fcff9b9ad7625ea7`:

- [Remaining qualification 42845257735, attempt 2](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42845257735/attempts/2): **21/21 passed**, zero failures/skips/test retries/flakes. The repaired complete floor, descent/backtracking and empty-history checks passed on three Chromium and three WebKit profiles; WebKit legal defeat and all isolation groups passed. VM-01 was idle during this run. The desktop case kept its original 300s deadline.
- The final **83-case acceptance set is accounted for across 62 retained passes and 21 fresh passes**. This is not a clean single 83-case run: 42840048098 remains failed with its original three failures. Production/helpers/config and other test bodies are unchanged; the only browser-test repair reorders one assertion within the re-executed full-floor case.
- [Current standard verification 42845257864](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/42845257864): **1,279 units, both TypeScript scopes, both build integrations, production build and 7/7 core journeys passed**, no failures/pending/skipped/retried cases. Unit time was 60.28s. Earlier resource-sensitive failures remain recorded.
- [Final portable receipt](increment-3.json) and [83 case records](increment-3-cases.jsonl) retain source/build inputs, exact case identities, attempts, per-stage outcomes and report hashes. Runtime is Linux x64, Node 24.22.2, Playwright 1.64.1, Chromium 156.0.8078.4 and WebKit 27.2. Browser evidence is desktop/native-touch emulation, not physical devices.
- Real selection/batch contracts: 30 checks passed locally on Windows; the existing POSIX shell-guard check could not spawn sh there and passed unchanged under WSL Node 24.15.0. All original profiles, nine whole-file partitions and the 24 approved equivalence mappings are retained. No contract or assertion was weakened for the local shell limitation.

### Acceptance mapping

1. **Immutable schema/identity/counters:** runRecords model units and actual authored victory/defeat records prove stable mode/ID, exact supported counters and frozen first results. Eviction plus accepted/refused/racing replacement regressions preserve seals. Floor projection uses validated unique completion counts; the descent/replacement unit checks deepest visited floor.
2. **Once at real endings; endless dungeon remains open:** authored legal wins/losses, explicit terminal Continue/restart, dungeon legal defeat, root-menu and in-flow replacement all pass. The complete first-floor/guardian/descent/backtrack/menu witness proves no false completion. Repeated callbacks and interrupted pending intents have targeted unit coverage; actual cached returns and concurrent native confirmations pass.
3. **Storage/recovery/sorting/retention/menu:** bounded model/storage units, missing/corrupt/future/unavailable data, exact reviewed export/restore/reset, 100-entry retention and first-result sorting pass. Real keyboard/touch recovery preserves active-save bytes.
4. **Device-local scope and separation:** the menu states browser-local best-effort persistence. No backend/account/economy or active-save format change. Record-only recovery and testing-entry spies preserve all active-save families.
5. **Repeated/continued/corrupt/unavailable and accessible UI:** the 65 authored and final 83-case coverage sets include terminal reload/Continue, continued descent, all testing routes/diagnostics, unavailable history that still permits real New Game, two tabs and actual Chromium BFCache. Records screenshots and complete-journey board snapshots were inspected. WebKit uses actual reload/Continue; no WebKit BFCache or physical-device claim is made.

All nine OpenSpec tasks are complete. The final documentation handoff and retirement
of the one-off execution workflow preserve every functional source/test/config
input; relevant evidence is reused under the policy. All cases remain in their
explicit regression matrices and documented CLI commands. Full unrelated release
regression/performance recertification was not run. No PR merge, release tag or
production operation is part of this handoff. #176 remains open until reviewed
work merges; #270 remains separate for richer statistics.
