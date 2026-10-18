# Design

## Context

See proposal.md for identity and scope. Main's `mountBattleLayout` wraps actor and scroll content for both entry points. CSS switches between a portrait dock and landscape rail. `BattleScene` observes the board region and shell, updates clipping, resets stale input and calls `BoardRenderer.fit`. Run boundaries hide the shell. Existing battle-controls requirements remain applicable whenever controls are expanded.

## Goals / Non-Goals

Keep visibility local to the shared shell; domain/session state remains authoritative. Preserve existing modal nodes and handlers. Avoid reconstructing HUD nodes, storing preference in saves or introducing a second board-region calculation.

## Decisions

1. Add one native toggle in the shared shell, outside the collapsible actor/scroll contents. Use the existing mobile CSS conditions, including short landscape. New app sessions start expanded. Retain the in-memory choice across encounters and restart; desktop forces expanded rendering while retaining the mobile choice for return. This avoids a preference persistence feature and gives first-time players visible controls.
2. Hide/inert expanded contents together and shrink the portrait row or landscape column to the compact toggle. Use existing safe-area spacing, focus styling and pointer capture. Keep dialog elements outside any hidden/inert subtree; if focus return targets hidden content, return it to the visible toggle. Do not auto-confirm or cancel intent. A hidden toggle on desktop must never retain focus.
3. Reuse the observed drawable-region geometry in BattleScene. Retain existing input reset on region changes. Inspect and minimally adjust camera fitting only where needed to preserve pan/zoom with bounds clamping; do not call resetView for a visibility toggle. No alternate geometry service or animation is needed.
4. Extend actual-control battle and run tests, using state/replay/RNG comparison around visibility-only changes. Screenshots accompany touch/keyboard assertions; screenshots alone cannot establish input correctness. Test both Chromium and configured WebKit support with emulation.

## Risks / Trade-offs

- Hidden actor nodes may be updated by HUD refresh → visibility must be owned by a wrapper/class that normal renders cannot accidentally reveal.
- Modal focus restoration can point into hidden contents → retain native modal capture and route return focus to a visible control.
- Geometry changes during gestures or animation can stale input → use the existing observer/reset path and verify presentation and gesture boundaries.
- Mobile CSS conditions overlap → cover portrait, 360x640 narrow, 844x390 and 915x412 short landscape, desktop and transitions at breakpoints.
- Main retains performance failures under #127 → record the baseline and any added transfer; do not relax budgets or claim #127 closure.

## Migration Plan

No data migration or deployment operation. Deliver a normal reviewed PR; reverting the shell/CSS change restores the prior expanded behavior. Application changes await explicit approval of this plan.

## iPhone landscape gesture follow-up

The caller reports no pinch zoom and flaky pan on iPhone Chrome at the branch preview, with either HUD state. Served commit `ddc9044` was verified, ruling out a stale preview. Native Chromium contained/rotated pinch and pan passed, so the specific iPhone failure is not represented by those tests.

Use native Touch Events as the touch transport when available; keep Pointer Events for mouse/pen and the existing fallback where Touch Events are absent. Both feed one contact map and one existing pinch/pan calculation. Do not process duplicate touch pointer events or depend on pointer capture for touch contacts. Preserve bounds rejection, cancellation, lifecycle reset, modal capture and cleanup. This is within the approved board/input integration scope and the caller explicitly requested the follow-up fix. No UA-specific branch, second gesture algorithm or viewport zoom restriction is added. A modeled touch-only stream is red on the old handler; native Chromium multitouch and modeled WebKit contacts verify the new transport. Physical iPhone event-stream causality has not been captured and is not claimed.
