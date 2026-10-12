# Tasks

Implementation of [#73](https://github.com/luminari-gurus/tactics-guru-v2/issues/73) was authorized on 2026-10-12. [The active handoff](../../../docs/ongoing-projects/plan.md) records progress and evidence. Checkboxes are completed only after their specified proof.

## 1. Validated session hydration and honest diagnostics

- [x] 1.1 Add the fallible validated snapshot factory in `BattleSession.ts`; verify malformed input rejection, owned/frozen state, derived phase and empty transients with the existing save fixtures.
- [x] 1.2 Preserve deterministic continuation through hydrated sessions; compare actual next command/events/state/RNG with uninterrupted seed 1-5 sessions at accepted boundaries, including seed 2/command 29, terminal and command-limit cases.
- [x] 1.3 Distinguish full fresh replay from resumed continuation diagnostics and update consumers/helpers; retain existing fresh-session replay checks and document the missing pre-save history in `docs/battle-save-format.md`.

## 2. Command-boundary persistence and recovery coordination

- [x] 2.1 Add one optional accepted-state callback and a focused injectable app coordinator using the existing storage adapter; verify one save attempt before presentation for each accepted player/enemy command, no writes for previews/rejection/acknowledgements, and containment of storage/observer failures.
- [x] 2.2 Implement read-only startup/candidate selection, recovery status and explicit per-slot removal; verify missing/valid/invalid/unavailable combinations, raw-text retention, changed-value refusal and untouched unrelated keys in `tests/unit/battlePersistence.test.ts`.
- [x] 2.3 Implement the shared replacement gate with backup-first removal and final absence verification; fault-inject every boundary to prove no new session/seed on failure and no old recoverable save after success, including failed fresh saves, cancelled/duplicate requests and uint32 seed wrap. Document fallback and single-writer limits in `docs/battle-storage.md`.

## 3. Live scene and accessible controls

- [ ] 3.1 Integrate startup/Continue and committed-state rendering in `BattleScene.ts`; verify actual-control ongoing/ended continuation, no initial throwaway session or hidden enemy pump, and no historical animation/audio in focused browser tests.
- [ ] 3.2 Add native Continue/New battle/recovery/export/reset UI and visible nonfatal status using current dialog/HUD conventions; verify keyboard/touch/mouse, focus restoration, 44 CSS pixel targets, short landscape, lossless export and no click-through. Document the player flow and origin-scoped limits.
- [ ] 3.3 Route toolbar, confirmation-dialog and outcome restart through the same coordinator in `main.ts`, `start.ts` and scene wiring; verify failed reset leaves a usable current session, successful repeated restart retains one canvas and sound preference, and old callbacks/listeners cannot dispatch or save. Keep proof/content-smoke behavior passing.

## 4. Integration verification and delivery evidence

- [ ] 4.1 Add controlled-clock reload tests during legally reached player/enemy presentation, paired uninterrupted continuation, backup recovery, legal victory/defeat and repeated restart; pass across configured desktop/portrait/landscape projects without forcing state as completion evidence.
- [ ] 4.2 Run focused checks followed by full unit/content/browser suites, both typechecks, production build, strict OpenSpec and whitespace checks; record exact revision/browser/results and limitations in `docs/qa/issue-73-battle-resume.md` and keep the active handoff current.
- [ ] 4.3 Map all five issue acceptance criteria to evidence, recheck branch/base and unrelated PR overlap, then publish the implementation commits and review handoff; keep #57/#58/#74 gates explicit and claim no physical-device or deployed-build validation that was not performed.

## Workflow follow-up

- The plan is approved. Open the implementation PR after implementation is verified. Use `Closes #73` only when its acceptance is met; parent #58 stays open.
- Merge, deployment, physical certification and OpenSpec archival are outside this implementation request.
