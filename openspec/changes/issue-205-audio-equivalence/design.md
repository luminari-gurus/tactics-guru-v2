# Design

## Context

See proposal.md and the continuation plan. The current two outcome tests execute twelve full UI battles across three profiles. Accepted commands resolve before BattleAudio consumes their frozen events; animation acknowledges the presentation separately.

## Goals / Non-Goals

Compare actual accepted state, RNG, command/event order, replay and canonical save bytes for seed 1/loss and seed 2/win, including adapter callbacks. Browser playback and permission claims remain browser-owned. No new harness, fixture corpus, production hooks, configuration or dependencies.

## Decisions

- Extend the existing cue-policy and fake-host adapter tests. Keep pure mapping proof separate from adapter integration; do not create another fixture framework.
- Keep complete audible battles and every existing cue/ability/replay/error assertion. Pair short legal sequences from both seeds through actual controls and compare canonical saved bytes and sessions.
- Capture the original file before editing it, then the changed file, sequentially on the same locally qualified WSL browser host. Record preflight, two-engine Phaser smoke, cache/load conditions and failures. This is local focused qualification, not a claim about the registered CI runner or #200's incomplete baseline.
- Preserve the same production bundle for before/after because application/build inputs do not change. Record its identity and relevant input hashes; no blanket runtime evidence reuse.

## Risks / Trade-offs

- Fake audio cannot establish gesture permission or real backend delivery: retain all browser-owned checks.
- Short browser comparisons cannot replace exhaustive equivalence: compare every accepted boundary for both complete seeded battles in units first.
- Host load can distort timings: use one worker, no retries/tracing, serial captures and retain load observations; report limitations without inferring a universal speedup.
