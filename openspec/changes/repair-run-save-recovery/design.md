# Design

## Context

The existing `RunItemSession` accepts commands and saves every boundary. `startRunApp` constructs it from a loaded save or a seed-13 placeholder. Dialogs inspect storage, invalidating earlier review objects; the startup buttons currently retain those objects.

## Goals / Non-Goals

**Outcome:** preserve saved bytes after read access returns, keep Continue usable after dialog exits, and start a fresh usable run after deletion. **Non-goals:** storage schema changes, cross-tab synchronization, general persistence redesign or design-guide changes.

## Decisions

Use one session-level unsaved flag covering battle, item and manual retry writes; only successful explicit Continue/replacement clears it. Reuse existing review/remove/replace semantics. Refresh startup after dialog exits and route rejected Continue to visible recovery. Use the existing fresh-run replacement path for a controller initialized from prior saved progress; a genuinely empty first launch keeps seed 13. No new persistence service or save format is needed.

**Files:** `src/app/RunItemSession.ts`, `src/app/startRunApp.ts`, existing `RunItemSession` and run-progression tests, plus these artifacts and QA evidence.

**Proof:** reproduce all three failures before editing runtime; unit proof for the unsaved flag and explicit transitions; real-control browser sequences for recovered storage, Cancel/Escape/export and deleting both slots. Run local unit/type/build checks and run-regression suites in Edge profiles and Linux WebKit. Preserve commands, failures and screenshots.

## Risks / Trade-offs

- An unsaved flag without an exit would strand progress: expose reviewed Continue while unsaved and retain the existing explicit Start new run path.
- Refreshing startup can replace the focused control: focus the new corresponding control on dialog exit.
- Startup captured state can be stale: reacquire inspection at Start and refuse destructive actions with obsolete reviews.

No migration or deployment is needed. Publication uses forward commits; the focused repair can be reverted independently of the visual guide.
