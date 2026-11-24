# Issue #490 browser coverage

The comparison base is [run #68](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/45419718975) at `10895b93bc53a4e8ad9312baa25f2fdf7a6a8058`.

Each row below accounts for the same removal in **desktop**, **mobile-portrait**
and **mobile-landscape** under `playwright.regression.config.ts`.

| File | Removed case | Retained case |
| --- | --- | --- |
| battle-animations | guarded_strike: reload discards the active presentation and starts fresh | high_shot: reload discards the active presentation and starts fresh |
| battle-animations | magic_missile: reload discards the active presentation and starts fresh | high_shot: reload discards the active presentation and starts fresh |
| battle-animations | guarded_strike: cached return starts fresh after an accepted action | high_shot: cached return starts fresh after an accepted action |
| battle-animations | magic_missile: cached return starts fresh after an accepted action | high_shot: cached return starts fresh after an accepted action |
| guarded-effects | Guarded badge stays attached when panning the Fighter offscreen and back | shared Guarded lifecycle: standalone hit |
| battle-audio | seed 1: short sound on/off legal checkpoints preserve deterministic session state and leave storage empty | seed 1: complete audible legal battle delivers committed cues and playerLoss |
| battle-audio | seed 2: short sound on/off legal checkpoints preserve deterministic session state and leave storage empty | seed 2: complete audible legal battle delivers committed cues and playerWin |

- **Animations.** `src/phaser/start.ts` stops the same BattleScene on `pagehide`
  and reloads on a persisted `pageshow`. Its shutdown cancels the presentation
  and disposes the session in `src/phaser/BattleScene.ts`. The High Shot test
  still requires an actual persisted return. Each ability retains the rendering,
  anchoring, accepted-result, cancellation and restart assertions.
- **Guarded.** The standalone hit visits both shared HUD layouts once per
  Chromium project (320 × 568 bottom dock, 568 × 320 side dock). The standalone
  miss and the run and dungeon hit/miss cases retain their project-default
  viewport badge and input assertions. Standalone invalid-target, dungeon
  resume, and every mode's incoming attacks and expiration remain covered.
  The offscreen and return gestures run in the existing standalone hit, then
  wheel zoom and the viewport refit restore the original camera before the
  badge tap and turn advancement.
- **Audio.** For each seed the muted journey still verifies the initial state
  and two legal command checkpoints. The audible full journey compares those
  same checkpoints, verifies cue delivery and the terminal outcome, then
  reloads and verifies a fresh seed, zero playback on re-enable and empty
  storage. The reload now occurs after the outcome. Checkpoint and outcome
  screenshots remain available.

Discovery of the affected specs under all 17 Playwright configs yielded
189 → 168 regression executions (21 removed, zero added, all retained IDs
identical). The WebKit combat-pace (8), critical-impact (8) and device acceptance
(6) selections for these files retained every ID. The other configs selected
zero cases from these three files.

## Timing comparison

Run #68 used Chromium 156.0.8078.4, Playwright 1.64.1, Node 24.22.2 and one
worker on `unraid-tactics-01`. It used persistent caches with background
workloads unverified. Its Chromium report has 122 passes, three expected
skips, zero unexpected outcomes and zero retries. The Chromium stage took
1,948.34 s and its Actions job used 2,026 s of compute. The two-runner run
took 38m 30s from dispatch to result and used at least 3,753 s of completed
job compute (the aggregate was still running when its receipt was written).

Expect 118 Chromium desktop cases, including the same three skips. Compare
retained case IDs and outcomes, skips and retries against the original receipt.
Estimate each consolidation's direct contribution from case durations in the
corresponding file: removed IDs for the animation change, the six lifecycle
cases plus the old standalone pan for Guarded, and the two audible outcome
cases plus the old two checkpoint cases for audio. Include the cost of the
assertions moved into the retained cases. Compare these per-file totals
separately from the browser-stage duration, runner compute and dispatch-to-result
time. Use the same parallel pair, per-runner locks and default worker count for
the stage comparison. Record environment and workload differences alongside
the results.
