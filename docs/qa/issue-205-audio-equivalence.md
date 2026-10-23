# Issue #205 audio equivalence qualification

Work in progress, 2026-10-23 (Asia/Jerusalem). Base: `b749ba4`; planning
commit: `34b7c72`. No application, helpers, assets, package or config changes.
Historical #200 failed/incomplete captures remain failed/incomplete and are not
reused as this change's acceptance or timing baseline.

## Assertion ownership

- Original seed-1 defeat / seed-2 victory and complete audible committed cue
  delivery: retained complete browser journeys on desktop, portrait and landscape.
- Original final audible/muted session equality: strengthen to every accepted
  command through the real BattleSession and BattleAudio adapter in existing
  fake-host units; compare phase, state/RNG, events, command/replay records and
  canonical save bytes. Short paired browser sequences cover the real wiring.
- Replay acceptance and final replay state: retained in each complete browser
  journey and both seeded adapter units. Save decode/continuation checks remain
  real domain checks, not audio playback evidence.
- Zero muted playback: retained short real-browser pairs, plus complete muted
  adapter journeys. No callback or suppressed token can resurrect old feedback.
- Committed cue starts, first mapped cue, aggregate move/hit/miss/unit-defeat and
  outcome cues: retained in each complete audible browser journey. Seed 2 also
  retains magic and basic_attack/guarded_strike/high_shot/magic_missile commands.
- Frozen accepted events, duplicate/stale tokens, muted/blocked suppression and
  late completion/disposal: existing fake-host tests plus real accepted batches.
- All other 16 audio titles per default profile remain unchanged, covering real
  gesture/focus/restart, previews/cancellation, interruption, unlock refusal and
  timeout, automatic recovery, HTML5 priming/backend, nonfatal optional media,
  unrelated fatal errors, unsupported audio and destroyed-scene decoding.
- The existing four WebKit audio selections remain unchanged. Units do not prove
  browser playback, user-gesture permission, engine behavior or physical devices.
- Startup/reload/presentation persistence and run dialog/accepted-command checks
  retain their original focused consumer selection; execute fresh where valid
  retained receipts are unavailable.

## Execution state

OpenSpec ledger: `issue-205-audio-equivalence`. Raw local receipts are kept under
`tmp/verification/issue-205/`; final review evidence will include compact results
and artifact hashes here. Local WSL qualification is separate from CI runner
qualification; no hosted fallback or workflow is introduced.

Initial build attempts failed during setup: Windows native Rolldown binding was
incompatible with WSL, then a build was started before dependency installation
finished and could not find vitest. Both logs are retained. Locked `npm ci`
completed with zero audit vulnerabilities; it blocks the optional PostHog CLI
install script under the installed npm policy. The ordinary unconfigured build
does not need that release-upload executable.

Original local browser baseline passed 54/54 (18 per profile), zero failures,
retries or skips. Playwright runner: 780,826 ms; wrapper wall including final
source/build hashing: 797,196 ms. The bundle remained identical. Only the two
non-executed audio unit files changed during browser capture; browser inputs
stayed frozen. Original audio units passed 28/28.

The consolidated adapter/cue units pass 29/29. Combined per-file test duration
changed from 305 ms to 791 ms (about 486 ms added); this excludes transform,
worker and runner startup. Session/save compatibility checks and both TypeScript
scopes pass. The first implementation chunk is ready for review; browser
reduction and final matched captures are still pending. No speedup or completed
issue acceptance is claimed yet.
