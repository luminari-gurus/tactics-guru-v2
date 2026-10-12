# Issue #72: guarded battle storage and backup recovery

Status: planning complete; implementation not started. Prepared 2026-10-12 (Asia/Jerusalem).

- [Issue #72](https://github.com/luminari-gurus/tactics-guru-v2/issues/72), under [safe-resume epic #58](https://github.com/luminari-gurus/tactics-guru-v2/issues/58).
- Assigned to `moshehbenavraham`; [claim comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/72#issuecomment-6123387699).
- Branch: [`branch/issue-72-battle-storage`](https://github.com/luminari-gurus/tactics-guru-v2/tree/branch/issue-72-battle-storage), created from the pinned base after planning and natively linked in #72's Development section.
- Base: current merged `origin/main`, `d167ac97e56b4b192c9212d6eb596fdbb42fe743`.
- Prerequisite: [#69](https://github.com/luminari-gurus/tactics-guru-v2/issues/69) completed through [PR #70](https://github.com/luminari-gurus/tactics-guru-v2/pull/70), merge `ea58370ceb442b22d7f247bc463c2cdddec12456`; verified as an ancestor of the base.
- OpenSpec: [proposal](../../../openspec/changes/issue-72-battle-storage/proposal.md), [design](../../../openspec/changes/issue-72-battle-storage/design.md), [requirements](../../../openspec/changes/issue-72-battle-storage/specs/battle-storage/spec.md), [tasks](../../../openspec/changes/issue-72-battle-storage/tasks.md).
- Local physical capability: `CAN_TEST_MOBILE=android`, read from the original checkout. Required physical platforms for this adapter-only child: none. Device/browser access beyond that platform declaration is unverified.

## Backlog review and selection

Read all 22 open repository issues with pagination, including bodies, labels, assignees, all available comments, native dependency relationships and linked branches. Inspected the single open PR (#12), remote branches and current merged main. Native dependency edges were empty; the dependencies below come from issue bodies, not invented GitHub relationships. Private project-only drafts could not be enumerated because the credential lacks `read:project`; the completeness claim is limited to this repository's open issues.

- **Selected #72:** newly ready after #69 merged; no existing assignee, task branch or overlapping open PR. Directly unlocks #73. Its dependency chain supports #74 and, through #73, #79/#80 and finally #81; those items retain their other prerequisites.
- **Other eligible work #87 and #88:** independent map prototype and artwork-template documentation, both scoped with verifiable acceptance and no blocker or active branch. Neither has evidenced downstream dependents, so #72 takes precedence.
- **#64 and #66:** physical certification and Safari restart require unavailable iOS access. #66's existing planning branch/comment records a withdrawn claim, not active implementation. #64's audio prerequisite is satisfied; its concrete certification checklist can be taken by someone with the full matrix. The local draft Android-only split was never created and is not selected here.
- **#82:** assigned to `dubstylee`, with `work/issue-82-doc-reconciliation`; preserve that ownership.
- **#75:** useful contract work with several downstream consumers, but unresolved HP/defeated-hero/healing/reward/seed product decisions require review before dependent implementation. It is not promoted on assumed choices.
- **#84:** read-only research can start, but target/path/owner choices remain unresolved. **#85** needs #84, #57 and separate concrete production approval.
- **#73:** blocked by #72. **#74:** blocked by #72, #73 and #57. **#76/#77:** blocked by #75. **#78:** blocked by #75/#77. **#79:** blocked by #75/#78/#73. **#80:** blocked by #75/#76/#78/#73/#57, with #79 coordination. **#81:** blocked by #79/#80 and #58/#57 acceptance.
- **#57, #58, #59, #60 and #83:** parent acceptance/planning epics, not standalone implementation candidates.

Added only `ready for work` to [#64](https://github.com/luminari-gurus/tactics-guru-v2/issues/64), [#72](https://github.com/luminari-gurus/tactics-guru-v2/issues/72), [#87](https://github.com/luminari-gurus/tactics-guru-v2/issues/87) and [#88](https://github.com/luminari-gurus/tactics-guru-v2/issues/88), then read back the labels and refreshed the backlog before selecting. Existing labels/assignments were preserved. Local device limits do not change global readiness. No other issue was assigned or commented on.

## Existing implementation inspected

- [Accepted format](../../battle-save-format.md) and [codec](../../../src/domain/saveEnvelope.ts): `encodeBattleSave`/`decodeBattleSave`, exact compatibility, integrity and a pre-parse limit of 16,384 UTF-16 code units. Reuse these without a second serializer, digest or migration layer.
- [BattleSession](../../../src/app/BattleSession.ts): committed state is already exposed during presentation; it has no hydration path. Do not add one here or treat a mid-battle snapshot as the original replay start.
- [Save fixtures](../../../tests/helpers/saveFixtures.ts) and [codec tests](../../../tests/unit/saveEnvelope.test.ts): accepted player/enemy, guarded, ended and maximum-command states already exist. Reuse them for adapter assertions.
- [Domain boundary check](../../../tests/unit/domainBoundary.test.ts), `tsconfig.domain.json`, package scripts and Playwright configuration: keep DOM storage outside pure domain/content; retain the existing desktop, Pixel 7 portrait and landscape regression profiles.
- No current `localStorage`/`sessionStorage` implementation exists in `src`. The established audio adapters show nonfatal browser-failure handling, but storage does not need a shared framework with them.

## Implementation contract

### 1. Small adapter and typed results

Create `src/persistence/battleStorage.ts` with an injected synchronous provider exposing only `getItem`, `setItem` and `removeItem`. The default browser provider resolves `window.localStorage` lazily inside a guard, never at module import. Wrap provider access and every individual storage operation.

Use exactly `tactics-guru:phaser:battle:primary:v1` and `tactics-guru:phaser:battle:backup:v1`. Do not enumerate storage, call `clear`, or read/write/remove any legacy Godot key. These slot names do not replace the codec's own format/version checks.

Read results distinguish missing, valid, invalid and unavailable slots. A valid result contains an owned decoded state; invalid results retain the exact raw string plus codec reason. Storage errors identify operation/slot and quota, security, unavailable or other failure without throwing into a session. Return enough status for #73 to present an honest warning; this issue adds no UI or live autosave caller.

### 2. Recovery precedence without repair writes

Read and validate both slots independently. Prefer a valid primary; otherwise offer a valid backup and explicitly report the primary problem. Return no restored state when neither validates. An unreadable slot is unknown, never equivalent to missing. A valid backup may be offered when primary is unreadable, with that limitation visible; subsequent writes remain blocked until both reads succeed.

Loading never writes or removes anything, including when recovery uses backup. Preserve malformed, corrupt, oversized and future/incompatible strings unchanged. Expose original text for later explicit export; do not truncate, normalize, log or automatically archive it. The decoder's bound prevents parsing oversized data, although reading a browser-stored string itself cannot be size-bounded in advance.

### 3. Backup-before-primary writes

Encode the proposed state with the accepted codec before any mutation, then freshly read/validate both slots. Refuse ordinary writes when either read fails or either slot contains undecodable text, even if the other slot is valid. Return `recoveryRequired` or the typed storage error; preserve both slots and all caller state. No generic force-overwrite option.

For valid/missing slots, use this explicit order:

1. If primary is valid, copy its exact validated text to backup, then write the newly encoded primary. If backup write fails, do not attempt the primary write.
2. If primary is missing and backup is valid, leave backup untouched and write the new primary.
3. If both are missing, seed backup with the new encoded snapshot before publishing the same text as primary. A failure of the second write therefore leaves a recoverable first save.
4. If a primary write fails or execution stops between writes, do not roll back by deleting/replacing data. A fresh load returns the prior valid primary or the preserved/seeded backup as appropriate. Report the exact stage; do not claim that the new primary committed.

This relies on the browser's per-operation storage semantics, not a multi-key transaction. Distinguish injected exceptions and interruption between calls from physical power-loss/disk-durability guarantees. Cross-tab last-writer races and browser eviction are not solved by this ordering; no locking/coordination framework is added here.

### 4. Explicit removal boundary

Provide a narrowly named explicit single-slot removal operation for future recovery UI. Require slot identity and expected raw text from a prior inspection, re-read it before removing, and return `changed` if the value differs. Guard acquisition/read/remove independently and retain inspected raw text in failure results. No load/save path calls removal automatically. A missing slot is an idempotent success only after a successful read.

This is not an atomic two-slot New battle/restart reset. #73 must prevent stale-save resurrection across partial invalidation failures before connecting its controls; that integration must not assume this primitive provides a transaction or cross-tab compare-and-swap.

## Work sequence and acceptance mapping

1. Add the typed adapter and a recording in-memory storage fake supporting failures at acquisition and every operation index. **AC1/AC3:** exercise existing codec results and verify no browser globals enter domain/content.
2. Add read-only primary/backup selection and raw recovery access. **AC1/AC4/AC5:** cover the missing/valid/invalid/unreadable combinations, exact-byte retention, all codec failure classes and zero load mutations.
3. Implement the three write cases and recovery-required refusal. **AC2/AC3/AC5:** fail each write in turn, simulate stopping between calls, then construct a fresh reader to prove the last valid snapshot remains. Never back up corrupt primary text.
4. Implement explicit single-slot removal with stale-inspection detection. **AC3/AC4:** fail getter/read/remove; verify no unrelated key access and no automatic deletion. Document partial-reset limits for #73.
5. Use accepted-boundary fixtures to verify save/load equivalence, next RNG and enemy-plan equivalence, and frozen in-memory state after all errors. **AC1/AC3:** deterministic gameplay is unchanged.
6. Write `docs/battle-storage.md`, link it from the format guide, and record actual results in `docs/qa/issue-72-battle-storage.md`. **AC5:** document precedence, key ownership, interruption cases, raw preservation, origin/private-mode/quota/eviction limits and the #73/#74 handoff.
7. Run the verification below, update the plan/tasks with evidence, commit implementation separately and prepare the eventual PR referencing #72. Do not close #58/#57 or claim deployment/device acceptance.

## Verification

During implementation, run focused `npm run test:unit -- tests/unit/battleStorage.test.ts tests/unit/saveEnvelope.test.ts tests/unit/domainBoundary.test.ts`, then the issue-required `npm run test:unit`, `npm run validate:content`, `npm run typecheck`, `npm run build` and `npm test`. The configured typecheck includes both general and DOM-free domain builds. Preserve any original failure and distinguish focused repairs from a clean full rerun.

Check strict OpenSpec validation for `issue-72-battle-storage`, relative document links, and `git diff --check`. No new test-only application route, live storage UI or browser harness is needed for this adapter scope: injected storage fixtures prove the ordering/failure contract; configured browser tests protect existing play. Real-browser live persistence/lifecycle acceptance remains #73/#74 and is not implied by the adapter tests.

For this planning-only publication, validate OpenSpec structure, every new relative document link, changed-file scope and whitespace. Application tests/builds are not run merely for Markdown changes; this document's implementation checks are future work.

Planning verification: strict OpenSpec validation passed; all four planning artifacts are complete, with eight implementation tasks unchecked. All 14 relative document links resolve. The publication contains only this plan and five OpenSpec planning/metadata files. No application tests, runtime implementation or physical-device checks were performed for this planning commit.

## Risks and boundaries

Recovery blocks writes when either slot is undecodable. That intentionally preserves original data; #73 must present recovery/export/reset choices before enabling autosave. A backup is an older accepted boundary, not a promise of no progress loss. Storage is origin-scoped, synchronous and best-effort; denial, quota, private-mode policy, eviction and another tab can invalidate persistence assumptions. Do not introduce a new storage engine to imply guarantees localStorage cannot make.

No gameplay, session hydration, autosave triggers, Continue/New battle UI, audio/animation replay, run/inventory model, legacy importer, cloud sync, dependency upgrade, deployment change, parent closure or physical certification is included. #57 remains the feature release gate. Existing root-checkout Safari/environment/workflow edits and the Android draft remain untouched in the original checkout.
