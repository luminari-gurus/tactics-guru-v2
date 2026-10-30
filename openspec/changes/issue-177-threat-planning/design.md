# Design

## Context

Issue [#177](https://github.com/luminari-gurus/tactics-guru-v2/issues/177); caller `dubstylee`; base `1c53c5e52e5b691d9827799892d8c415f78a6331`; branch `work/issue-177-threat-planning`. #142 is closed. The current `BattleSession` records each accepted command and persists immediately; `previewMovement` and `previewAbility` validate authoritative state. `hoverPreview` relocates hypothetically without checking reachability. AI currently evaluates reachable moves and ordinary attacks. The design must preserve accepted history and saved snapshots rather than simply moving a sprite back.

Plan approved by the caller on 2026-10-29.

## Goals / Non-Goals

**Goals:** Safe, understandable planning and undo across standalone, run and dungeon consumers. **Non-Goals:** New hazard/reaction systems, arbitrary rewind, predictive AI choices, and hidden information.

## Decisions

- Preview a compound plan by validating the move on the current snapshot, applying it only to a temporary snapshot, then validating the chosen ability there. At confirmation revalidate both against the live snapshot before dispatching; present the move then ability through existing locks. If a lifecycle interruption occurs after the move, retain the accepted move and do not silently execute a stale ability. This avoids inventing a second rule engine or treating a merely walkable hover as reachable.
- Threat inspection is a present-state union of legal enemy ordinary attack and Weakening Hex targets from origin or legally reachable cells, accounting for blockers, status, range and LOS. Label it potential danger, not a promise of AI choice or damage. Reuse shared legality with an explicit hypothetical enemy-turn context; do not mutate live initiative or consume RNG. Future ability profiles must opt in through real legality, rather than guessed ranges.
- Undo is restricted to the last player move, before any action or turn transition, after presentation finishes, with no intervening consequence or information reveal. Record a validated undo command in the authoritative command history, restoring only the captured position/movement budget, so replay and persistence agree. Invalidate eligibility on reload, restart, changed state, hazard/reveal/reaction, or any unprovable safety; no reload-based undo. The accepted save after undo must contain the restored state. Alternative truncating history can contradict already persisted moves and is rejected.
- Use the immediately preceding accepted move and its before-snapshot as session-owned evidence for undo; replay reconstructs the same pair from its command history. Verify the move reproduces the current snapshot before reversing it. This avoids adding an undo marker to persisted battle snapshots and leaves undo unavailable after reload; introduce a separately versioned replay record for the new command while accepting existing records.
- Add keyboard and native touch controls to existing HUD and board overlays; distinguish danger from active-unit reach, preserve modal/focus/input locks and existing confirm/cancel behavior. Trace `src/app/BattleSession.ts`, `src/domain/{grid,combat,turns,types,ai}.ts`, battle save/replay readers, `src/ui/{hud,targetPreview,battleActions}.ts`, `src/phaser/BattleScene.ts` and renderer plus their consumers before final edits.

## Risks / Trade-offs

- [Replay/save compatibility] → Version and validate any new command or state format, maintain old save admission or safe recovery, test standalone/run/dungeon continuation and replay.
- [Partial execution after move] → Explicitly retain and display the accepted prefix; revalidate ability and never apply it twice.
- [Threat computation cost or misleading display] → Bound to current catalog and board; use authoritative checks and explain scope; measure affected rendering.
- [Future hazards or reactions] → Default to disabling undo when safety cannot be proven; never erase revealed information or consequences.

## Migration Plan

Preserve existing saves and replay compatibility through versioned validation/migration if the command format changes; reject unsupported data through existing recovery without deleting it. Rollback uses the prior build and existing recovery safeguards, not destructive save clearing.

## Verification and device scope

Physical availability: `CAN_TEST_MOBILE` missing, treated as none. Required physical platforms: none; Playwright desktop and native-touch emulation in portrait/landscape and applicable WebKit satisfy the standing instruction. This shared command/replay and lifecycle change selects full regression under `docs/verification-policy.md`, plus focused unit and browser checks during iteration. Discovery must account for fixtures, placement, WebKit, telemetry and all issue edge cases; retain failures and source/build identities. No physical-device claim.
