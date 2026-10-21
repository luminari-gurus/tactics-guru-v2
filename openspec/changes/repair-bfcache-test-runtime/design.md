# Design

## Context

The initial full run retained 223 passes and eight failures before it was stopped. See the #159 QA report for raw logs. The same seven BFCache assertions pass with the installed full Chromium binary; the animation timeout reproduces there at the restarted scene's readiness check.

## Decisions

- Set `channel: 'chromium'` on each Chromium project's use options. The existing executable override retains precedence. Do not put the channel on shared base use options: the focused WebKit configuration replaces projects and must keep its WebKit launch path.
- The existing restart helper says its forced-confirm caller resumes RAF before checking readiness. Follow that contract: capture the incremented session seed, resume the virtual clock, wait for that replacement identity and then player-ready state before pausing deterministic bob samples. The seed poll tolerates absent session data during shutdown. Both animation force-restart callers use this boundary; the battle-loop caller already waits for replacement identity. A single large fake-time advance can end before asynchronous loader/scene startup finishes, and the old scene's player phase alone cannot identify its replacement.
- Preserve all data, anchor, object-count, cached-return and save assertions. Do not add retries, arbitrary sleeps or treat reload as cached return.
- Give the single compound three-actor inspection/cancellation case a 90-second workflow budget, matching the adjacent multi-size workflow, while capping its individual actions at five seconds and retaining every existing five-second assertion and product performance limit. The 681-case run passed both mobile variants but exhausted the desktop case's 30-second aggregate deadline after reaching the third actor. A traced diagnostic completed the entire desktop workflow; its slowest individual browser action/assertion was about 1.2 seconds. The old shell run already took 29.1 seconds without tracing. A scoped aggregate budget preserves cumulative actor/listener coverage without hiding a stalled action or changing the other tests' deadlines.
- Stack this focused test repair after the long-history PR so the final default-suite run qualifies one concrete feature/test tree.

## Proof

Run the seven real BFCache cases, the animation restart regression and native-select cases without an executable environment override; verify WebKit project resolution remains unchanged. Then run the full npm suite with its configured posttests and record every failure/skip explicitly.
