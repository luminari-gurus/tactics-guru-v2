# Tasks

Implementation authorized and completed on 2026-10-12. All required local checks passed; see [QA](../../../docs/qa/issue-72-battle-storage.md), [design](design.md) and the [acceptance mapping](../../../docs/ongoing-projects/issue-72-battle-storage/plan.md) for #72 on `branch/issue-72-battle-storage`.

## 1. Guarded inspection and recovery

- [x] 1.1 Add `src/persistence/battleStorage.ts` with lazy/injectable storage acquisition, two fixed namespace keys and typed slot/error results; add acquisition/read failure and module-import-without-window tests in `tests/unit/battleStorage.test.ts`, and document the API/key ownership in `docs/battle-storage.md`.
- [x] 1.2 Add independent primary/backup validation using the existing codec and read-only precedence; verify all missing/valid/invalid/unreadable combinations, exact raw retention, all codec failure categories and zero writes/removals, and document recovery status/source semantics.

## 2. Safe write ordering

- [x] 2.1 Implement input encoding, fresh slot inspection and mutation refusal for invalid/unreadable slots; verify invalid primary never replaces good backup, invalid backup is retained, encoder failures have no effects and frozen inputs remain unchanged, and document recovery-required behavior.
- [x] 2.2 Implement existing-primary backup, backup-only recovery and first-save backup seeding before primary publication; inject each write failure and simulate interruption between calls, then prove fresh-reader recovery and exact stage reporting, with the write/failure sequence documented alongside tests.

## 3. Explicit removal and deterministic boundary

- [x] 3.1 Add explicit single-slot removal requiring expected inspected text; test unchanged, missing, changed and throwing acquisition/read/remove cases with a deny-on-unexpected-key fake, and document non-atomic reset/cross-tab limitations and the #73 handoff.
- [x] 3.2 Reuse accepted player/enemy/guarded/ended/maximum-command fixtures to verify saved/restored state, next RNG and enemy decisions; assert errors leave in-memory state/catalog unchanged and run the existing DOM-free domain-boundary checks without changing the codec.

## 4. Integration verification and delivery evidence

- [x] 4.1 Run focused adapter/codec/domain tests, all configured unit and content checks, both typechecks, production build and the configured browser suite; record commands, exact revision, failures and remaining limits in `docs/qa/issue-72-battle-storage.md`, without treating emulation as physical persistence acceptance.
- [x] 4.2 Link the completed adapter guide from `docs/battle-save-format.md`, reconcile this plan with actual delivery, and verify all #72 acceptance criteria, strict OpenSpec validation, relative document links and `git diff --check`; keep #73/#74 and parent gates explicitly open.

## Delivery closeout

Planning and implementation were separately authorized and published. With subsequent explicit merge authorization, PR #91 merged into main on 2026-10-12 as `3e7bf08600c59a09a0f9c37f3c81c7c07b3a6954`, completing #72. Fresh checks and retained browser evidence are recorded in the [QA report](../../../docs/qa/issue-72-battle-storage.md). No deployment, parent closure or OpenSpec archive was performed. The [next-session handoff](../../../docs/ongoing-projects/plan.md) prepares existing #73 without starting it.
