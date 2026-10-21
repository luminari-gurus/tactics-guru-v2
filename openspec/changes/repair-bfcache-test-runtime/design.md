# Design

## Context

The initial full run retained 223 passes and eight failures before it was stopped. See the #159 QA report for raw logs. The same seven BFCache assertions pass with the installed full Chromium binary; the animation timeout reproduces there at the restarted scene's readiness check.

## Decisions

- Set `channel: 'chromium'` on each Chromium project's use options. The existing executable override retains precedence. Do not put the channel on shared base use options: the focused WebKit configuration replaces projects and must keep its WebKit launch path.
- The existing restart helper says its forced-confirm caller resumes RAF before checking readiness. Follow that contract: resume the virtual clock, wait for actual player-ready state, then pause for deterministic bob samples. A single large fake-time advance can end before asynchronous loader/scene startup finishes.
- Preserve all data, anchor, object-count, cached-return and save assertions. Increasing timeouts, adding retries or treating reload as cached return would hide the failures and is excluded.
- Stack this focused test repair after the long-history PR so the final default-suite run qualifies one concrete feature/test tree.

## Proof

Run the seven real BFCache cases, the animation restart regression and native-select cases without an executable environment override; verify WebKit project resolution remains unchanged. Then run the full npm suite with its configured posttests and record every failure/skip explicitly.
