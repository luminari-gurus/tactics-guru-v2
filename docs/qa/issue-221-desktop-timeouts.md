# Issue #221 desktop timeout investigation

## Retained original observation

Recovered artifact `12396082054` from run `39700595665`. ZIP SHA-256: `748aba4ed5450557980eb652fe2fb496db4664f9529631f173c0b29b0cb01a8b`. Local raw recovery is under ignored `tmp/issue-221/original/`; the original 30-day GitHub artifact remains the shared raw source.

Its `issue200-ci/source.txt` identifies `73d34dba1620174837cf15a93812d393abe690aa`. Direct Git comparison with literal base `251db945569e3f1ac957caa091e9fa9eec11a034` confirms no differences in `src/`, `tests/helpers/`, either reported test file, `playwright.config.ts` or `package-lock.json`.

`timings/github-hosted-baseline/chromium.log` retains all four 30-second timeouts. Hover fails waiting for player phase after restart; camera expires clicking Wait; first bob expires reading the report at line 447 (after the 2,000ms reduced-motion advance); second bob at line 480 (after the hidden-page advance). These locations are observations, not causal conclusions. The full Chromium invocation was interrupted at start marker 257/687 and remains incomplete.

## Current qualification

At kickoff, runner `unraid-tactics-01` is online and not busy, labels `[self-hosted, Linux, X64, tactics-browser]`. PR #210 provides prior Chromium/WebKit setup qualification; this branch does not import its unmerged tooling. The branch-scoped workflow rechecks actual Chromium launch and records runtime/host/input identity, then builds and runs exactly the four desktop cases untraced with one worker and zero retries.

## Literal-base reproduction

[Run 39750405032](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39750405032) tested literal main `251db945569e3f1ac957caa091e9fa9eec11a034` on `unraid-tactics-01`: Node v24.22.1, npm 11.19.1, Chromium 153.0.8010.12, Linux 6.8.0-139-generic, six reported CPUs (Ryzen 7 2700X), 8,174,178,304 bytes RAM. Load averages before launch: 1.62/1.15/1.05. Actual browser executable: `/home/actions/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`.

Production build passed. Four-case discovery passed; untraced execution used preview, one worker, zero retries and unchanged 30-second limits. **3 passed, 1 failed, zero skips/retries**: hover 16.7s, camera 20.0s, first bob 26.7s; bob lifecycle 30.1s, timing out at line 494 during post-restart sampling. This is the same case but a later location than the original hosted observation. Other failures did not reproduce in isolation on this host; no causal repair is yet claimed.

Raw receipt download: ignored `tmp/issue-221/baseline/issue-221-39750405032-1/`. A separate diagnostic invocation adds a temporary reporter of existing API/assertion steps; its timings are identified separately. Initial run `39750301292` failed YAML parsing before any job/case execution, corrected in `cbe576e`.

No repair or passing acceptance is claimed yet. See `docs/ongoing-projects/plan.md` and OpenSpec `issue-221-desktop-timeouts` for remaining tasks.
