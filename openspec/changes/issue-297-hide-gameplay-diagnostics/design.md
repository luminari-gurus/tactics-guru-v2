## Context

See proposal.md for motivation and docs/ongoing-projects/plan.md for source findings. The shared HTML precedes route CSS/code. Layout reparents panel children into a scroll container; dungeon's later direct-child selector therefore misses diagnostics. Existing tests and performance tooling deliberately use proof scenes and stable diagnostic IDs.

## Goals / Non-Goals

Use native hidden markup plus existing scene owners. Retain visible loading/error status, gameplay controls and explicit diagnostics. No new visibility manager, feature flag, dependency, rule or save change.

## Decisions

- Hide the two diagnostic details sections, shared restart and caption in HTML; keep the initial panel/status generically named. Gameplay layout reveals shared restart/caption; proof entry reveals its tools/naming. Static hidden defaults cover slow/failed modules before any CSS, unlike late cleanup.
- Preserve IDs and show controls through existing owners. Remove obsolete direct-child hiding loops rather than adding descendant heuristics or a debug service. Name the dungeon panel explicitly.
- Extend existing boot tests for pre-module/failure behavior and an existing legal dungeon journey for repeated encounters. Existing proof/layout/content tests cover retained tools; run the affected desktop/touch/WebKit consumers and root/prefix builds.

## Risks / Trade-offs

- Shared hidden controls could remain unavailable → verify restart/caption in all gameplay owners and explicit proof tools.
- Hiding the entire panel could conceal import failure → keep the generic status visible from initial HTML.
- Route-only post-boot assertions could miss a flash → hold the initial module before evaluating initial markup and capture screenshots.

## Migration Plan

No persisted data changes. Deliver one focused PR on the issue branch; ordinary rollback restores the previous markup/bootstrap. Keep OpenSpec artifacts unarchived for review.

## Adversarial follow-up

The entry catch and run error handler can update the battle status after the owner has hidden that panel. A small shared presentation helper also places one alert into an existing visible run/dungeon screen. It leaves normal battle/pre-mount status behavior intact, scrolls failure feedback into view, and does not alter controller or save state. Post-mount fault injection and repeated runtime-error browser cases prove the boundary that pre-evaluation request aborts could not cover.
