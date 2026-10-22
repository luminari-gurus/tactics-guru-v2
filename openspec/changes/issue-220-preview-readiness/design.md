# Design

## Context and goals

Use the existing collector and Vite configuration. A formatted URL is not a readiness protocol, and HTTP 200 alone cannot distinguish a foreign listener. Preserve the independent Node child and exact production sampling/provenance. See the root plan for outcome, non-goals, files and proof.

## Decisions

One private helper contains the lifecycle and worker entry. The worker dynamically loads pinned Vite, resolves the existing config, rejects missing output, awaits strict host/port binding and acknowledges through IPC. Only after that acknowledgement can the parent accept bounded HTTP success while the child is live. A ten-second monotonic deadline covers both bind and HTTP, with per-request cancellation.

The parent retains bounded stdout/stderr tails, child PID/exit/signal and last HTTP observation. One lifetime wrapper installs temporary SIGINT/SIGTERM handlers before startup, closes resources on every exit path and preserves the initiating error alongside cleanup failures. Cleanup requests worker close over IPC, awaits exit, then escalates against only that child with bounded waits. Worker disconnect closes its own server. No process groups, descendants, detached shells, new dependencies or public knobs.

Remote mode owns no process, skips local build inventory, and keeps the existing URL/build checks. Hash the helper alongside all collector sources.

## Risks and verification

Awaited Vite bind provides ownership before HTTP probing; an occupied foreign port must fail without issuing even one HTTP probe to it. Real Vite/static fixtures prove config, missing-dist, bind and release; isolated worker fixtures prove output independence, hangs, death, timeout, cancellation and forced cleanup. Test-only deadlines/ports isolate contracts without changing production limits. Preserve historical and setup failures. Freeze implementation before one production build and default 18-sample capture; retain budget failures without resampling. No full-matrix claim, merge or production activation.
