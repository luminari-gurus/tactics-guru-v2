# Design

## Context

See [proposal](proposal.md). `BattleDialogs.close` restores focus before its callback. Cancellation clears pending state and disables Review; confirmation locks it during presentation. Persistence callbacks can instead open another dialog using the same owner.

## Goals / Non-Goals

**Outcome:** usable final focus after each synchronous state transition, preserving replacement-modal ownership. **Non-goals:** HUD redesign, new focus service, async polling, command or persistence changes.

## Decisions

Capture the original invoker locally, close/transition, run the existing callback, then restore focus only if this dialog is still closed. Recheck the saved invoker's connected/disabled state and reuse the existing Restart fallback. The local capture prevents a replacement dialog's `showChoices` call from overwriting the old invoker. No timer or extra state is needed.

**Files:** `src/ui/dialogs.ts`, existing battle-loop and persistence browser tests, this OpenSpec change and focused QA record. Keep the #108 canonical plan on its design branch to avoid an independent PR editing the same handoff file.

The broader animation suite also sends fresh Enter/Space after confirmation to exercise the presentation lock. With usable focus restored to Restart, that sequence intentionally requests reset. Target the canvas explicitly for that existing board-input assertion and assert the Restart fallback first; preserve every animation/state/save assertion. Held-key reset protection remains a separate persistence regression.

## Risks / Trade-offs

Replacement recovery/reset dialogs must retain focus; cover their real startup path. Confirmation starts async presentation synchronously; assert focus while the existing controlled-clock test holds that lock. Normal enabled-invoker return stays covered by persistence checks.

## Proof

PR #113 review adds two concrete requirements: one held Enter must not flow through the fallback into reset, and startup Continue must not return focus to BODY. Keep the existing Restart fallback; prevent the native default for repeated Enter/Space keydowns on buttons in the dialog owner's abortable document listener. No timer, activation latch or second focus service is needed. Exclude BODY/documentElement and disabled controls, attempt the original invoker's focus, and check actual activeElement before falling back. The explicit disabled check is necessary because native dialog close can temporarily leave activeElement on a newly disabled invoker until a later frame. Preserve the replacement-modal early return. Extend the existing persistence tests with repeated keydowns, exact saved-slot comparisons, fresh-key reset and keyboard Continue focus.

First demonstrate the added cancellation assertion fails on the baseline; then run cancellation/confirmation/replacement-dialog checks across desktop/portrait/landscape, both typechecks, unit/content validation and build. Reuse the existing test suites; no new test harness or physical-device claim. Publish a focused PR against main independently of design PR #112.
