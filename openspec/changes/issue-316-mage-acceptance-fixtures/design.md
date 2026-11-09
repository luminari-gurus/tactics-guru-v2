# Design

## Context

See proposal.md for motivation and the approved plan for the acceptance map.
`mageJourney` already bounds real dungeon stepping and session commands. Both
its unit consumer and extended browser consumer hard-code seed 68. Existing
production `dungeon.spec.ts` cases can resume explicitly staged valid saves;
the real picker and pure ability tests already own detailed Snare rules.

## Goals / Non-Goals

Preserve complete legal earned progression and exact history while decoupling
focused browser checks from that journey. Change only verification inputs and
evidence, not simulation, projection, content, saves or browser budgets.

## Decisions

- Add one Mage-specific selection function beside `mageJourney`; start with
  inclusive candidates 64–79 in ascending order. Qualify ordinary completed
  simulations against earned level, both abilities, expiry, exact replay and
  terminal cleanup. Return the chosen witness and rejected-candidate reasons.
  Unexpected simulation/replay errors propagate; exhaustion is a hard failure.
  A single literal would retain the reported fragility; a generic search engine,
  persistent cache or browser-driven search adds no required behavior.
- Keep qualification deterministic and independent of browser state. Unit and
  browser callers use the same returned seed and witness. Record durations as
  evidence rather than making elapsed time part of seed selection.
- Extend existing staged production-save coverage for actual Snare and multiple
  missile commands, exact replay and active reload. Use existing legal fixture
  geometry/session validation, making the staging explicit. Keep the full
  progression journey's assertions and its fresh level-one start.
- Retain all project/engine selections and timeouts. Existing configs suffice;
  the task-scoped workflow follows the repository's self-hosted VM-02 exclusive
  lock for an exact-base desktop baseline and final serial six-profile proof.
  A new qualification entry is necessary because existing manual workflows do
  not select these extended Mage cases. It does not change general CI policy.
- Use OpenSpec with `skip_specs: true`: existing product requirements are
  unchanged. Maintain this change's tasks and the requested plan as work proceeds.

## Risks / Trade-offs

- Bounded simulation adds CPU/setup work → measure real selection and exhaustive
  range cost, preserve existing deadlines and fail clearly if no witness exists.
- Staged saves could be mistaken for earned XP → label them explicitly and
  retain the complete legal journey on three Chromium and three WebKit profiles.
- Shared helper edits could affect other heroes → retain their code, run the
  affected unit file and exact discovery contracts, and compare relevant inputs.
- Runner queues/background load affect time → retain runner/source/build
  identities, failures and conditions; no unsupported speedup claim.

## Migration Plan

No product migration or deployment. Publish one focused reviewable PR; leave the
issue open until the complete acceptance is verified and the PR merges. Do not
archive the OpenSpec change before merge.
