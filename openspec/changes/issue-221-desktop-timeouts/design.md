# Design

## Context

See proposal.md and the implementation plan. Relevant source at main `251db94` equals the failed hosted capture for the four cases, runtime, helpers, browser config and lockfile. The qualified host is `unraid-tactics-01` with `[self-hosted, tactics-browser]` labels.

## Goals / Non-Goals

Measure fixture, browser action, readiness and controlled-clock phases separately. Preserve real commands, exact save checks and rendered geometry. Avoid speculative runtime optimization or a generic profiling framework.

## Decisions

- Run a four-case literal-base reproduction first, on one worker with zero retries. Retain the original hosted failure independently; different host timings are not regression attribution.
- Use a branch-scoped PR workflow and `tactics-browser-exclusive` concurrency. Existing main has no suitable self-hosted dispatch route; do not import the unmerged #207 tooling or use hosted capacity.
- Use existing reports and Playwright traces/steps for diagnosis; any temporary instrumentation is identified separately from ordinary timing evidence.
- Keep repairs local when supported by measurements. Splitting a cumulative case requires an assertion mapping and equivalent setup; reducing work must preserve every obligation and operation limit.
- Runtime/helper changes require tracing standalone, run and dungeon consumers before expanding verification. No automatic full baseline rerun.

## Risks / Trade-offs

- An isolated pass may hide workload sensitivity: investigate the smallest evidenced condition and retain non-reproduction honestly.
- Tracing changes timing: compare untraced results separately.
- Preview evidence depends on a successful current build: stop its consumers if build fails.
- A prior interrupted full run remains incomplete after focused success.
