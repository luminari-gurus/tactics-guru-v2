## Context

See proposal.md and docs/ongoing-projects/plan.md. The existing scene refresh already renders movement range; null action is also the intentional result of cancellation and accepted commands.

## Decisions

- Keep one scene-local `(round, active unit ID)` marker. Initialize only after readiness in player phase and mark unavailable turns too. A null-action or phase-transition fallback would incorrectly overwrite same-turn choices.
- Use existing movement preview eligibility and HUD selection rendering. Set only action and prompt; never invoke the action callback against a previously selected tile.
- Share the existing standalone/run scene. Scene reconstruction resets the marker without storing UI state in saves.
- Extend existing browser suites and reuse legal session/save fixtures. No new test harness or dependencies.
- Pass the destination placeholder as null through existing scene selection. Reset its prompt along with pending intent and selection; no second cancellation path or HUD-local state.
- When movement confirmation is cancelled, clear selected/hovered destination and retain Move. Keep full action cancellation and attack cancellation semantics intact. Verify Cancel and Escape followed by native keyboard selection of the original destination; synthetic selectOption would conceal unchanged-value failures.

## Risks / Trade-offs

- Accepted state can advance before animation finishes → gate initialization on usable player phase.
- Refreshes after full cancel or attack must stay clear → retain the marker across clear/presentation.
- Domain eligibility can reject more than spent movement → test boundary states and align the narrow HUD Move check if demonstrated necessary.

## Migration Plan

No data migration. Review and merge through a focused PR; reverting the scene change restores the prior UI selection behavior.
