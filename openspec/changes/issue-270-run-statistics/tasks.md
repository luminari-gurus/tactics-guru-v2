# Tasks

Issue: [#270](https://github.com/luminari-gurus/tactics-guru-v2/issues/270).
Branch: `branch/issue-270-run-statistics`.
Review entry: [plan.md](../../../docs/ongoing-projects/plan.md).
Implementation authorized by the caller on 2026-11-11. Track proven work below;
the plan records commands, failures, PR boundaries and remaining acceptance work.

## 1. Persistent accepted counters — first PR

- [x] 1.1 Add the pure versioned stats value/reducer, exact win/floor projection and bounded accepted-boundary receipt; verify enemy-only defeats, player moves, undo, rejected/duplicate inputs, bounds and unchanged RNG with focused units; document definitions and the future granular-event extension point.
- [x] 1.2 Add compatible stats-bearing authored/dungeon snapshots and new envelope formats, preserving every supported legacy reader, exact shapes, byte/digest limits and explicit recovery; verify old/current/malformed/future and partial-data fixtures in affected envelope/storage units without a write on opening.
- [x] 1.3 Expose exact accepted event batches through the existing compatible BattleSession callback and atomically update both journey owners, including terminal events and published spatial steps; verify complete legal move/undo/reload/Continue journeys, failed spatial saves and standalone-consumer parity; run required affected checks and verify:pr, then publish a focused Refs #270 PR with its coverage and remaining criteria recorded on the issue.

## 2. Active time and immutable history/bests — second PR

- [ ] 2.1 Add one injected active-clock helper and wire both admitted owners to gameplay eligibility, visibility/focus/dialog/navigation/disposal plus bounded checkpoints; verify exact fake-clock accounting, repeated lifecycle events, no closed/paused time, no review-token drift and safe queued-write disposal; document eligibility and best-effort persistence limits.
- [ ] 2.2 Extend existing history to compatible version 2 with frozen stats in terminal and single/paired pending records, plus bounded per-mode maxima and retained winner summaries; verify immutable repeat endings, interrupted/refused/paired replacement, eviction/ties/reset, legacy coverage and corrupt/future/readback/conflict recovery in existing record/storage/session units; document schema and compatibility.
- [ ] 2.3 Exercise actual menu-origin terminal/unsaved/replacement and pause/reload/lifecycle paths on affected Chromium/WebKit profiles, retaining failed/incomplete attempts and source/build receipts; run required affected checks and verify:pr, then publish a focused Refs #270 PR dependent on increment 1 and update issue acceptance accounting.

## 3. Recent/best presentation and whole-issue qualification — third PR

- [ ] 3.1 Extend the existing Hall of Records modal with five-stat recent rows, per-mode bests and accessible winning summaries, preserving partial/N/A labels and recovery/focus behavior; verify keyboard plus narrow portrait/landscape native touch and WebKit, retain reviewed screenshots, and update docs/run-records.md with delivered behavior.
- [ ] 3.2 Extend existing route-isolation spies and real legal authored/dungeon journeys to verify full counters, time, final events, undo/reload, floor travel/backtracking, repeated terminal Continue and both replacement identities; verify all direct/diagnostic entries do not track or touch player storage, and discover the exact affected special/regression/batch selections without losing prior coverage.
- [ ] 3.3 Freeze relevant final inputs, run required PR and affected persistence/lifecycle checks, strict OpenSpec validation, links and diff checks; retain exact source/build-bound evidence/reuse/failures, audit AC1–AC8, and publish the final focused PR using Closes #270 only when every gate is proven, otherwise Refs #270 with the remaining scope on the issue.

## Workflow follow-up

- Review/merge and production operations require their applicable later instructions; this handoff only publishes the plan and linked branch.
- Archive/sync this OpenSpec change after accepted implementation and merge, preserving the original qualification failures and partial-data limitations.
