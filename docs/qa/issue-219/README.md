# Issue #219: owned process cleanup qualification

PR #222 targets PR #209's `work/issue-200-verification-timings` branch, where the
timing runner lives. No application, lockfile, browser config, gameplay assertion,
worker, retry or product timeout was changed. Self-hosted setup remains separate.

The base `0ca15c2f076f0f982cf05c18a85ee8613c641d24` failed the detached-server
contract in all three modes: timeout, interruption and normal launcher exit.
A server ignoring TERM and owning a detached group retained its listener after
launcher close. The repair waits for verified observed descendants, including
escalation, and preserves an unrelated sibling server/process. Linux `/proc`
identity translation also passed in the local nested PID namespace.

Local Node 24.19.0: **18/18** timing/process/reporter contracts and **10/10**
canonical orchestration contracts passed. Local Chromium installation returned
invalid ZIPs and local WebKit lacks libraries; no local real-browser pass is claimed.

## Hosted result

[Run 39713862333](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39713862333)
**passed**, head `97a369f09bc7e7229969719fb8bf1e9408c2cf6f`, tested merge
`e091edd8292e053cd08c933a2346e0ae86a1a456` against the unchanged #209 base.
Ubuntu 24.04 / Linux x64 / Node 24.22.0; Playwright 1.63.0 installed Chromium
153.0.8010.12. Installation skips package lifecycle scripts/audit requests because
these checks never invoke the release CLI; Playwright and OS libraries install
explicitly. This is not PostHog release-tool or security-audit evidence.

- Timing/process/reporter contracts: **18/18**; orchestration: **10/10**.
- Ordinary production build: **221 content cases**, both type scopes and Vite passed.
- Browser lifecycle contracts: **2/2**, one each for Vite preview and dev on 4173.
- Each mode retained a passed canvas smoke and a second test-start event before
  its deliberate 20-second process cutoff. No final JSON was emitted for either
  interrupted invocation; both remain failed/interrupted evidence.
- Each mode then launched a fresh Playwright-owned Vite server on that exact port,
  `reuseExistingServer=false`, and passed one more smoke with final JSON. That is
  **four passed smokes and two deliberately interrupted cases**, not six passes.
- All four process receipts have `cleanup.complete=true`, no survivors/errors.
  Synthetic contracts exercise SIGKILL escalation; actual browser descendants
  stopped with TERM. Per-case starts/completions survived both real cutoffs.

[Raw 30-day artifact](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39713862333/artifacts/12397374537):
14 files, 47,934 bytes, downloaded and SHA-256 verified:
`b180981e38b6c7eac90d8e17933cc7808e266a0c4c4aff537f94e04734db39ce`.
It expires 2026-11-21 02:55:52 UTC. [validation.json](validation.json) retains compact
results, source identities, relevant hashes and per-mode recovery statistics.
Evidence-only documentation after this head reuses unchanged tested inputs.

The earlier [run 39713266531](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/39713266531)
is cancelled/superseded. Its completed logs still show both recovery contracts
passed and an artifact uploaded; this is not labeled a completed successful run.
Its `npm ci` took about five minutes. The exact delay cause is unproved; the scoped
replacement install completed in four seconds under different cache/setup conditions,
so no causal speedup is claimed. The workflow now bounds dependency/browser setup
and supersedes stale qualification runs.

This qualifies observed Linux npm/Playwright/Vite lifecycle recovery. Polling
ancestry is not process containment; short-lived unobserved reparenting can escape
it, SIGKILL of the orchestrator cannot run cleanup, and non-Linux descendants remain
best-effort/unverified. See [the timing contract](../../verification-timings.md).

The failed 81.56-minute #200 baseline remains failed/incomplete. This scoped repair
does not recover the eight entire gameplay suites, disposition #220/#221, qualify
a self-hosted host, or establish a new full baseline. It enables those missing
coverage follow-ups without repeating unchanged successful CPU/telemetry work.
