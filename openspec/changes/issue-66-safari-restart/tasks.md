# Tasks

Issue: [#66](https://github.com/luminari-gurus/tactics-guru-v2/issues/66). Branch: `work/issue-66-safari-restart`. See the [plan](../../../docs/ongoing-projects/issue-66-safari-restart/plan.md) for AC1-AC4 and scope. All implementation tasks remain unstarted; this file is not implementation approval.

## 1. Reproduction and failure evidence

- [ ] 1.1 Confirm the instruction to implement this concrete plan, refresh main/#67 and record source/served commits plus the original failure/successful retry in `docs/qa/issue-66-safari-restart.md`; verify the report distinguishes merged code, unmerged comparison work and unknown historical conditions (AC1/AC4).
- [ ] 1.2 Exercise existing legal seed-1 loss and seed-2 victory through actual controls, compare dialog/toolbar restart, and retain page-error/console/trace evidence before retrying; verify each capture identifies orientation, build, seed, cache, sound and lifecycle state or explicitly marks it unavailable (AC1).
- [ ] 1.3 Assess physical error capture; if generic errors lose the cause, extend only the existing diagnostics/report surface with a bounded in-memory error and build/run/phase record accessible on mobile. Verify meaningful diagnostic/error-path tests and no telemetry/persistence, or document why existing capture is sufficient (AC1).

## 2. Causal investigation and correction

- [ ] 2.1 Trace dialog focus/reentry, shutdown/cancellation, asynchronous continuations, readiness, loader/audio/resize ownership against the captured conditions; record findings and the separate #67 teardown reproduction, verifying that every root-cause statement has supporting evidence (AC2).
- [ ] 2.2 For each confirmed cause, retain a failing regression through the relevant restart controls, apply the smallest proven correction and record passing-after evidence plus deterministic replay/new-seed invariants. If no cause is confirmed, record the unreproduced disposition without a speculative runtime fix (AC2/AC4).
- [ ] 2.3 Extend existing restart cases only for uncovered timing/lifecycle behavior, using a focused portable WebKit profile where needed; verify repeated legal win/loss restarts, background/foreground and presentation cancellation, fresh readiness, one canvas/dialog and no stale effects/errors, and record exact engines/attempts in QA (AC2/AC3 supporting evidence).

## 3. Physical acceptance and integrated verification

- [ ] 3.1 Perform repeated legal defeat and victory restarts on physical iPhone Safari in portrait/landscape, including sound off/on and lifecycle return; retain tester/date/device/OS/browser/build/cache context, attempt counts, failures, readiness, single-canvas and stale-effect/error observations. Leave this task incomplete if hardware checks are unavailable unless the owner explicitly accepts a narrower disposition (AC3/AC4).
- [ ] 3.2 On the final runtime candidate, run configured unit/content/typecheck/build/browser checks, strict OpenSpec validation and whitespace checks; retain exact commands/results and any necessary performance measurement from the existing path, without broadening claims to untested hardware (AC2/AC3).
- [ ] 3.3 Reconcile every issue acceptance criterion with the QA evidence, preserve the original failure and successful retry, and document remaining limits and any owner-approved disposition. Verify #64/#65/#57 remain separate and no unsupported Safari-fix or closure claim is made (AC4).

## Workflow follow-up

- Following an explicit implementation request and completed validation, publish the implementation on this branch and open the appropriate PR. Use `Refs #66` while acceptance remains incomplete; use a closing reference only when every criterion is verified or the owner explicitly accepts a revised scope.
- Do not merge, manually close the issue or archive this OpenSpec change as part of plan publication.
