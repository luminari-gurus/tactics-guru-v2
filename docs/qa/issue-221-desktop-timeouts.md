# Issue #221 desktop timeout investigation

## Retained original observation

Recovered artifact `12396082054` from run `39700595665`. ZIP SHA-256: `748aba4ed5450557980eb652fe2fb496db4664f9529631f173c0b29b0cb01a8b`. Local raw recovery is under ignored `tmp/issue-221/original/`; the original 30-day GitHub artifact remains the shared raw source.

Its `issue200-ci/source.txt` identifies `73d34dba1620174837cf15a93812d393abe690aa`. Direct Git comparison with literal base `251db945569e3f1ac957caa091e9fa9eec11a034` confirms no differences in `src/`, `tests/helpers/`, either reported test file, `playwright.config.ts` or `package-lock.json`.

`timings/github-hosted-baseline/chromium.log` retains all four 30-second timeouts. Hover fails waiting for player phase after restart; camera expires clicking Wait; first bob expires reading the report at line 447 (after the 2,000ms reduced-motion advance); second bob at line 480 (after the hidden-page advance). These locations are observations, not causal conclusions. The full Chromium invocation was interrupted at start marker 257/687 and remains incomplete.

## Current qualification

At kickoff, runner `unraid-tactics-01` is online and not busy, labels `[self-hosted, Linux, X64, tactics-browser]`. PR #210 provides prior Chromium/WebKit setup qualification; this branch does not import its unmerged tooling. The branch-scoped workflow rechecks actual Chromium launch and records runtime/host/input identity, then builds and runs exactly the four desktop cases untraced with one worker and zero retries.

No repair or passing acceptance is claimed yet. See `docs/ongoing-projects/plan.md` and OpenSpec `issue-221-desktop-timeouts` for remaining tasks.
