# Design

Approval: User approved this plan in the conversation on 2026-10-31.

## Context

Issue [#254](https://github.com/luminari-gurus/tactics-guru-v2/issues/254); caller `dubstylee`; base `main` at `a8b87c199fb2ae171a9bb72961ac7114622c4d60`; branch `work/issue-254-dungeon-enemy-behaviors`. Device access: `CAN_TEST_MOBILE` missing or invalid, treated as none. No physical platforms required; Playwright emulation satisfies the standing device instruction.

`stepDungeon` validates a step, updates position, checks direct encounter entry, then calls `moveDungeonEnemies`. The shared transition sees only the resulting position. `pursue` seeks a legal adjacent cell in fixed cardinal order; enemies resolve in ID order against updated occupancy. The exploration save stores positions, RNG and step, not profile definitions. `/map` is stationary, but movement helpers and tests are shared.

## Goals / Non-Goals

**Goals:** Make distinct profiles observable while preserving step/encounter, collision, RNG and saved-state contracts.

**Non-Goals:** New battle AI, map-generation changes, extra configuration UI, new save subsystem or physical-device certification.

## Decisions

- Pass the old player cell explicitly from the accepted step into the movement transition; use the actual new player marker for occupancy. Target choice is separate from occupancy so the old cell can be traversed when legal and the current cell cannot. Direct player-to-enemy entry still starts battle first. A single fixed target per profile applies throughout that step.
- Assign enemy 1 passive, enemy 2 chase at range 6, enemy 3 block at range 10. This retains the existing passive and one blocking profile and makes both pursuit behaviors reachable. Existing aggressive behavior maps to block if any API or fixture retains that profile; inspect all callers before choosing whether an alias is needed. No profile is stored in the current dungeon envelope, so compatible saves retain their positions and RNG and adopt these fixed assignments on their next accepted step. Do not silently invalidate current saves.
- Retain shortest path to a target-adjacent legal cell, fixed neighbor order, ID-ordered occupancy and existing no-route/adjacent stay behavior. Old target is a target, not an occupant: another enemy can occupy it; route legality still applies. This avoids new pathfinding machinery or special collision rules.
- Extend existing unit and browser coverage rather than introduce a new harness. Verify real dungeon interaction for both profiles with reproducible legal positions, and cover persistence and rejection through the real session.

## Risks / Trade-offs

- [Chase target may be occupied by another enemy] → continue to use legal adjacent-goal pathfinding and actual occupancy; cover contested old/new cells.
- [Shared movement changes affect existing consumers] → trace callers, preserve default semantics where no prior cell is supplied, and verify map and dungeon tests.
- [Behavior changes mid-save] → preserve data and deterministic continuation under the new rules; document the change and test current-format/legacy exploration admission. No claim that old and new builds choose identical future routes.

## Migration Plan

No persisted profile field or format bump is planned. Validate current envelope and legacy exploration handling before implementation; if a schema or rules-identity change proves necessary, update this plan for approval before changing compatibility. Rollback uses the previous build's existing save handling.
