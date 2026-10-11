# Design

## Context

See [proposal.md](proposal.md) and the [implementation plan](../../../docs/ongoing-projects/issue-66-safari-restart/plan.md) for the selected issue, full backlog review and acceptance mapping. Base is main `a74bb5e1e68b24bdf0bf49ff3e6726bde6fb146a`; branch is `work/issue-66-safari-restart`.

The outcome dialog closes, resets input and invokes the toolbar restart handler before restoring focus. Main sets loading and calls the Phaser scene restart callback. BattleScene owns session/audio/presentation/input/observer cleanup, and presentation completion is asynchronous. BoardRenderer cancellation currently redraws the final state. Main's generic error messages omit the original exception from its diagnostic report. These observed paths identify investigation targets, not a confirmed defect.

Merged #61 already supplies legal win/loss/restart tests; merged #63 supplies audio teardown/recovery. Open #67 guards redraw after destroyed image resources, but is a different demonstrated regression on an unmerged renderer. The configured suite is Chromium; CDP touch cases are not portable to WebKit.

## Goals / Non-Goals

**Goals:** retain a reproducible failure with exact context; establish lifecycle ownership before repair; exercise the real controls; make any causal correction small; retain an honest physical acceptance record.

**Non-Goals:** automatic retries, outcome/state injection, renderer rewrite, new logging service, dependency change, save system, altered combat/RNG, integration of #67, production deployment/Access work, or completion of #64/#65/#57 by proxy.

## Decisions

1. **Observe before repair.** Start with existing page-error/console/trace capture and `fitDiagnostics`; preserve failures before retrying. Reusing the established collector avoids an unrelated diagnostics framework. If physical capture is insufficient, extend the existing report/error surface with a bounded in-memory record of original exception and run/build/phase context. Provide a mobile-accessible copy path; no external telemetry or persistence. Broad catch-and-retry logic would conceal the failure and is excluded.
2. **Keep one restart route.** Exercise both dialog and toolbar inputs, which converge on the current scene restart. Trace close/focus, loading/readiness, shutdown, animation completion, loader, audio and resize callbacks rather than introducing a second restart mechanism. Choose the actual repair only from a demonstrated failure; document RED-to-GREEN evidence and retain generation/token behavior.
3. **Separate historical and concurrent evidence.** Begin from merged main. Recheck #67 before touching overlapping code. Its guard can inform diagnosis, but do not copy it wholesale or label it the historical Safari fix. If it merges during the work, reconcile main and rerun the affected proof on the combined tree.
4. **Reuse actual-control tests.** Extend `tests/battle-loop.spec.ts` and `tests/helpers/battlePolicy.ts` only where behavior lacks coverage. Use legal seed-1 loss and seed-2 victory, presentation timing and background/foreground cases. Run portable restart cases under a focused WebKit/iPhone profile; keep CDP-only cases in Chromium. Check fresh readiness, one canvas/dialog, single seed advancement, replay, no stale effects and errors.
5. **Keep physical acceptance explicit.** Record repeated physical iPhone Safari legal win/loss restarts in portrait/landscape with exact attempts, browser/device/build/cache/sound conditions and errors. Automated emulation cannot discharge this requirement. If unavailable or still intermittent, retain the issue as unresolved unless the owner explicitly accepts a narrower disposition.

## Risks / Trade-offs

- Intermittent timing and instrumentation can alter reproduction -> retain baseline conditions and minimal bounded capture, compare before/after, report attempts and failures.
- Missing exact historical URL/error/Safari version -> preserve unknowns and the original report; never substitute a current failure without causal evidence.
- Main/#67 overlap -> refresh heads before implementation and coordinate the affected teardown/diagnostics/tests; no unmerged prerequisite assumption.
- Physical Safari access is not established -> diagnosis can proceed, but hardware acceptance remains an explicit delivery gate.
- Broad test runs are relatively costly -> run focused RED-to-GREEN cases first, then configured completion checks once the final change is ready.

## Migration Plan

No persisted schema or data migration. A later implementation PR will include only the confirmed correction, necessary evidence capture and tests/docs. Validate via the existing build and preview path; any deployment beyond normal branch publication needs its own scope. Revert a runtime change through a normal commit if required; preserve raw failure evidence. No implementation PR, deployment, merge or issue closure is included in this plan-publication task.

## Open Questions

Investigation must establish the historical failure's exact error, Safari version, orientation and lifecycle timing where possible. These are evidence gaps already covered by the reproduction tasks, not decisions to guess before writing code. The availability of a physical tester is a verification prerequisite; record it before claiming acceptance.
