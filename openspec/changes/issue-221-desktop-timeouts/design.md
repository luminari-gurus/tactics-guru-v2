# Design

## Context

See proposal.md and the implementation plan. Relevant source at main `251db94` equals the failed hosted capture for the four cases, runtime, helpers, browser config and lockfile. The qualified host is `unraid-tactics-01` with `[self-hosted, tactics-browser]` labels.

## Goals / Non-Goals

Measure fixture, browser action, readiness and controlled-clock phases separately. Preserve real commands, exact save checks and rendered geometry. Avoid speculative runtime optimization or a generic profiling framework.

## Decisions

- Run a four-case literal-base reproduction first, on one worker with zero retries. Retain the original hosted failure independently; different host timings are not regression attribution.
- The original diagnosis used a branch-scoped workflow and `tactics-browser-exclusive` concurrency. After merging main's #207 tooling, retire that temporary workflow and use the existing local `test:browser` wrapper with the same selections, one worker and zero retries. A workflow introduced only on the PR cannot provide pre-merge manual dispatch, and branch-controlled code must not gain a new entry point to the persistent runner.
- Use existing reports and Playwright traces/steps for diagnosis; any temporary instrumentation is identified separately from ordinary timing evidence.
- Keep repairs local when supported by measurements. Splitting a cumulative case requires an assertion mapping and equivalent setup; reducing work must preserve every obligation and operation limit.
- Bound the live actor transition with an explicit 3,000ms readiness timeout and a browser-clock elapsed check from before resume. Pause only after checking readiness, retaining all subsequent controlled samples. Prove delayed readiness beyond 3,000ms is rejected.
- Record hover/camera as non-reproductions with their original failures and cause still unproved; a completed disposition is not a completed runtime repair. Keep issue-159 references attached to its preserved plan when the generic handoff changes owner.
- Runtime/helper changes require tracing standalone, run and dungeon consumers before expanding verification. No automatic full baseline rerun.

## Risks / Trade-offs

- An isolated pass may hide workload sensitivity: investigate the smallest evidenced condition and retain non-reproduction honestly.
- Tracing changes timing: compare untraced results separately.
- Preview evidence depends on a successful current build: stop its consumers if build fails.
- A prior interrupted full run remains incomplete after focused success.
