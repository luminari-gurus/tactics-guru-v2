# Design

## Context

The approved plan is `docs/ongoing-projects/plan.md`; see proposal.md for motivation. BattleScene owns ready/player/modal/visibility state and lifecycle. BattleHud owns native controls and their disabled state; BattleSelection owns previews/plans. BattleRadial already has disabled buttons, a legal-special submenu and preview hub. All three battle hosts reuse this scene. PR #355 is open on the same base and changes turn-status rendering; this work does not depend on it.

## Goals / Non-Goals

**Goals:** one scene-owned guarded shortcut path, existing controls as authority, stable learned ordering, explicit radial aiming before activation, compact accessible discovery and real-browser evidence.

**Non-Goals:** input rebinding, an app-wide event bus, another rules/selection engine, new dependencies, gameplay or persistence changes.

## Decisions

- Reuse enabled HUD buttons and the existing ability selection callback for the rail. Share a small fixed map between hints and dispatch; introduce no configurable registry. Buttons keep domain/session checks behind them.
- Extend document-level keyboard ownership in the scene. Keep canvas arrows/Enter/Space and modal Escape precedence. Ignore repeats/composition/modifiers/editable targets before new action dispatch; dispose bindings with the existing scene cleanup.
- Use C to confirm because Enter/Space already select board cells and activate native controls. Do not synthesize native key events.
- For radial selection, aim/focus existing slices or canonical ability-ID chips in tap mode. Only C/native activation commits. A held pointer gesture is not a keyboard target; do not let a key cause its later release to commit. Use canonical owned order for numeric keys even though target-specific submenu choices are filtered.
- Radial S follows the existing legal/last-used Special offer, matching its visible hint. Rail S follows the native picker. Exact number keys never fall back to a different legal ability; this matters when Frost Snare is illegal at range one but Magic Missile is offered.
- Reuse the HUD's native details disclosure and title/aria-keyshortcuts hints. Keep existing labels usable by assistive technology and touch. No help modal or preference migration.
- Extend existing battle-loop, ability-picker and radial suites. Use existing legal policy, save snapshots, dev fixtures and native browser events. New production titles start with `keyboard-only shortcuts` to join the existing WebKit grep. No new browser config or blanket full regression.

## Risks / Trade-offs

- Native select typeahead, IME and repeated key activation → real-browser negative cases and yielding to native event handling.
- Radial submenu rebuilding/focus, held-pointer release and skin changes → focus/preview tests, exact command-count checks and explicit cancellation of stale keyboard review.
- Shared scene ownership across restart and dungeon encounters → repeated-entry/reload and complete legal core journeys.
- #355 may merge while work is underway → inspect current base before finalizing and retain its locks; no speculative changes to its status code.

## Migration Plan

No save or preference migration. Publish one focused PR after affected verification; rollback is a normal code revert. Do not deploy, merge or archive during implementation.
