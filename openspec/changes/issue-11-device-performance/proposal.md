# Proposal

## Why

The complete battle is merged, but needs reproducible measurements and an honest automated-validation record. On 2026-10-10 the caller approved narrowing [#11](https://github.com/luminari-gurus/tactics-guru-v2/issues/11) to the completed automated validation and evidence milestone, with remaining acceptance transferred to linked follow-ups. Chromium/WebKit emulation does not establish physical-device usability; closing this milestone does not close the first-battle tranche.

## What Changes

- Extend existing measurements and collector with an explicit battle mode, bounded idle/workload frame samples and input-to-visible response evidence while retaining the proof baseline mode.
- Exercise real battle controls, gestures, viewport/DPR, lifecycle and restart in browser checks; retain existing legal win/loss coverage.
- Publish a physical-device checklist and QA report with exact served build, conditions, raw results, budget comparisons and unresolved gates.
- Use only the existing approved release mechanism; no production configuration changes or dependency on unmerged deployment PR #12.

## Capabilities

### New Capabilities

- `battle-performance-evidence`: reproducible battle diagnostics and workload measurement with provenance and acceptance limits.

### Modified Capabilities

None. Combat rules and existing controls are unchanged.

## Impact

Affected areas: `src/diagnostics/{browser,measurements}.ts`, `src/phaser/BattleScene.ts`, `src/phaser/BoardInput.ts` if needed for timing, `scripts/measure-fit{,-options}.ts`, existing unit/browser measurement and battle tests, and `docs/qa/issue-11-battle.md` plus raw evidence. No new runtime dependency is planned.

Caller: `dubstylee`. Base: `main` at `9f785dfd3e9ce703ff8ab46210f84c38890c6f2a`. Published branch: `work/issue-11-device-performance`. Change: `issue-11-device-performance`. Approval: caller explicitly replied “Approved” to the published plan at `144fde6` on 2026-10-10.

Prerequisite #10 is closed and PR #55 merged into main. Existing #20/#35 proof budgets and prior device reports are references, not battle acceptance. Exclude saves/resume, short route, inventory/equipment, procedural generation, advanced combat, editor, analytics, backend, new art/audio and external legacy plans. Revised completion requires exact automated/emulated coverage, retained raw passing/failing measurements and explicit follow-up ownership: physical certification #64, frame regressions #65, intermittent Safari restart #66, and existing battle audio #62. The caller explicitly authorized scope revision and issue closure; these gaps remain open under #1/#57. No merge or archive is authorized.
