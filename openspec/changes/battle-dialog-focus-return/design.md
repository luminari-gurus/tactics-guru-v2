# Design

## Context

See [proposal](proposal.md). `BattleDialogs.close` restores focus before its callback. Cancellation clears pending state and disables Review; confirmation locks it during presentation. Persistence callbacks can instead open another dialog using the same owner.

## Goals / Non-Goals

**Outcome:** usable final focus after each synchronous state transition, preserving replacement-modal ownership. **Non-goals:** HUD redesign, new focus service, async polling, command or persistence changes.

## Decisions

Capture the original invoker locally, close/transition, run the existing callback, then restore focus only if this dialog is still closed. Recheck the saved invoker's connected/disabled state and reuse the existing Restart fallback. The local capture prevents a replacement dialog's `showChoices` call from overwriting the old invoker. No timer or extra state is needed.

**Files:** `src/ui/dialogs.ts`, existing battle-loop and persistence browser tests, this OpenSpec change and focused QA record. Keep the #108 canonical plan on its design branch to avoid an independent PR editing the same handoff file.

## Risks / Trade-offs

Replacement recovery/reset dialogs must retain focus; cover their real startup path. Confirmation starts async presentation synchronously; assert focus while the existing controlled-clock test holds that lock. Normal enabled-invoker return stays covered by persistence checks.

## Proof

First demonstrate the added cancellation assertion fails on the baseline; then run cancellation/confirmation/replacement-dialog checks across desktop/portrait/landscape, both typechecks, unit/content validation and build. Reuse the existing test suites; no new test harness or physical-device claim. Publish a focused PR against main independently of design PR #112.
