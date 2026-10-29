# Design

## Context

See proposal.md for motivation and docs/ongoing-projects/plan.md for the source-grounded acceptance map. Current movement reachability/AI already share movementBlockSource, but pinnedBy, source admission and events are Ranger-specific. Required-level projection and the picker already support multiple learned actions.

## Goals / Non-Goals

Goals: reuse the existing pure domain → session → Phaser/DOM boundary and one movement lifecycle. Every retained change supplies a requirement or its proof.

Non-goals: new dependencies/art/audio, separate Arc Bolt, generic status scripting, immunities without a real consumer, migrations, reward upgrades and unrelated refactoring.

## Decisions

- Replace pinnedBy with movementBlock: {sourceId, abilityId}; admit only canonical Pin/Snare IDs and their class/learned profile. Keep Mark separate. A generic effect engine or second Snare state path increases complexity without a requirement.
- Extend existing effect-only targeting/resolution for Mark, Pin and Snare. Preserve the exported Ranger preview if existing callers need its entry point, while sharing one resolver. Events use movementBlocked/movementBlockExpired with ability identity.
- Reuse movementBlockSource for grid/AI; reuse target-end-turn and all-damage cleanup. No new movement algorithms.
- Advance state/rules and aggregate envelope versions; retain RNG and standalone envelope versions. Reject previous bytes safely. Exact-base fixtures were captured using e2f0cdd readers before modification.
- Reuse the existing picker, target previews, inspection/logs and effect feedback, without a signature animation or attack cue. Earned progression supplies Mage level and unlocks; no progression duplication.
- Work in reviewable commits; publish completed coherent chunks promptly, with dependent PRs only for independently necessary repairs. Preserve all required acceptance gates and failures. Full regression is required because shared state/commands/save admission changes, after narrow iteration checks.

## Risks / Trade-offs

- Save incompatibility → exact-base fixtures, current-format roundtrips, forged-state checks, byte-preserving recovery.
- Cross-consumer status drift → source/ability identity in admission, resolution, expiry and feedback; full consumer search and units.
- Synthetic fixtures missing reachability → legal earned production journey across Chromium/WebKit device profiles with replay receipts/screenshots.
- Expensive regression → serial existing runner with immutable source/build identity, valid reuse and focused repairs; no blanket retries.

## Migration Plan

No migration. Earlier snapshots remain exportable. Leave the feature in review-ready PRs; merging, deployment and releases are outside this request.
