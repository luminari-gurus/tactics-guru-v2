# Issue #205: audio equivalence qualification

2026-10-23 (Asia/Jerusalem). Implementation and affected qualification passed;
publication is being finalized in [PR #229](https://github.com/luminari-gurus/tactics-guru-v2/pull/229).
Application code, assets, dependencies, shared helpers and browser configuration
are unchanged. No performance limits, retries or existing timeouts changed.

## Coverage and ablation

The six paired outcome executions previously ran **12 complete UI battles**.
They now run **six complete audible battles plus short paired legal checkpoints**,
with every accepted boundary compared in the existing real-adapter unit fixture.
The mapper-only seed-2 loop was consolidated into this stronger proof.

- Seed 1 still ends in defeat after 85 commands; seed 2 still wins after 38.
  All six audible browser replay records are byte-identical JSON to the original
  capture. Each browser journey retains replay admission/state equality,
  committed-cue starts and first mapped cue, move/hit/miss/unit-defeat and outcome
  cues. Seed 2 retains magic and basic_attack/guarded_strike/high_shot/magic_missile.
- Both seeded adapter units compare every accepted batch, frozen events, command
  and event order, state/RNG, phase/pending/error, replay and canonical save bytes.
  Decoded checkpoints dispatch the same next recorded command/events. Playback
  completion before or after acknowledgement cannot change gameplay. Duplicate,
  suppressed and destroyed-controller callbacks cannot resurrect feedback.
- Each short browser pair compares the initial boundary and two real legal HUD
  commands in enabled/muted modes, both stored slots, canonical primary bytes,
  decoded state and replay state. Muted playback stays zero; enabled committed
  cues start. Continue and a new enabling gesture play no historical cues.
- All 16 other audio titles per profile and their assertions remain. One initial
  activation in the clock-controlled interruption case uses keyboard after the
  diagnosed WebKit event-delivery failure below. The separate gesture case still
  proves keyboard, pointer and touch activation, previews/cancellation, focus and
  restart preference. Backend, media/unlock failure and lifecycle owners remain.
- Discovery: **693 → 699** default IDs. Six old paired IDs become six audible
  journey IDs and six short-pair IDs. All **687 retained IDs**, including **48
  non-outcome audio IDs**, match exactly. Full WebKit selection is identical;
  this file still selects exactly four WebKit executions. #208 / PR #228 derives
  its whole-file/project plan from discovery; no packaging changes are needed here.

## Measured refactor capture

Original capture: planning SHA `34b7c722add3d199658326678ee796d87621620e`, with
browser/application inputs identical to literal main base `b749ba40f358cf6fa0e8e9acb96f535c6362e938`.
Refactor capture: `5b36658355f82d11b8d945de6382090275787fad`.

- Original: **54/54 passed**, Playwright runner **780.826 s**; wrapper wall
  **797.196 s**, including final source/build fingerprinting.
- Refactor: **60/60 passed**, runner **608.309 s**; wrapper wall **625.901 s**.
  Saved **172.517 s (22.1%)** of runner time. Neither capture has failures,
  retries, flaky results or skips.
- Summed case time by profile (18 → 20 cases): desktop **300.713 → 228.188 s**;
  portrait **227.081 → 191.125 s**; landscape **239.864 → 175.452 s**.
- Outcome-family case time, including the added short pairs: **505.834 →
  339.413 s**. The short pairs cost 77.261 s total; remaining unchanged audio
  cases still account for about 255 s. Halving complete battles is not a 50%
  whole-file wall-time claim.
- First-test delay: **9.283 → 9.594 s**. Runner overhead outside summed case
  durations: **13.168 → 13.544 s**. Locked installation took 46 s; build and
  two-engine smoke were setup outside both captures. The bundle was reused.
- Audio units: **28 → 29 passing tests**. Summed file test time **305 → 791 ms**
  (486 ms added); measured Vitest runner interval **2.354 → 1.873 s**, including
  startup/transform. This is one observation per revision, not a statistical
  performance guarantee. Session/save compatibility passes **43/43**.

The measured capture precedes the local keyboard-setup repair. Final acceptance
reuses its **57 unchanged Chromium cases**, then executes the three affected
Chromium cases, all four WebKit cases and all 15 selected persistence/run cases.
No clean full-file rerun of the later repair is claimed.

## Final qualification and provenance

- Fresh repaired interruption cases: **3/3 Chromium**. Fresh audio WebKit:
  **4/4** (33.316 s). Persistence/run consumers: **15/15** (134.133 s).
  Zero retries/skips/flaky results in these final captures.
- Ordinary build passed **221 content checks**, both TypeScript scopes and Vite.
  Chromium/WebKit Phaser boot/resize smoke passed **2/2**. Both TypeScript scopes
  also pass after the final browser setup repair. No unrelated full regression,
  telemetry, performance collector or CI workflow was run.
- Node 24.15.0, Playwright 1.63.0, Chromium 153.0.8010.12, WebKit 26.6, Linux/WSL
  on the same local Intel Core Ultra 9 285H workstation. One worker, zero retries,
  tracing off for captures, normal fresh test contexts, ordinary root production
  preview on port 4173. npm/browser caches were warm. No other agent test/build
  jobs ran during captures; resident services remained. Host-wide idleness was
  not independently established (observed starting 1-minute loads 1.10/1.43).
  This is focused local qualification, not a registered CI runner or #200 baseline.
- The exact bundle manifest is identical before/after and throughout every
  capture: SHA-256 `e0c7efea36a99a1152010da99536c389a1137255701d1eb88df3e329a8c36d87`.
  Full input manifests are retained. The original capture changed only two
  non-executed unit files; browser inputs stayed frozen. Refactor/final captures
  kept their inputs stable. Only the browser test file differs for the local
  gesture repair; all three final focused stages have the same input hash.
- Units ran on the dirty patch committed unchanged as `d5f7a45`; later source
  comparisons justify reuse. The refactor capture's dirty flag was the plan.
  Final repair captures ran the recorded dirty keyboard patch based on `5b36658`;
  later publication commits do not mean those commits were themselves executed.
- Representative desktop, portrait and landscape screenshots were inspected:
  the board is clear; landscape shows the scrollable rail at its current offset.
  Automated playback and emulation are recorded accurately; no physical-device
  audibility claim is made or required under AGENTS.md.

## Preserved failures and repair

Initial build setup failed on Windows-native Rolldown dependencies under WSL.
A premature build during installation then could not find Vitest. Locked Linux
`npm ci` repaired setup, audited zero vulnerabilities, and blocked the optional
PostHog release CLI install script under npm policy. The ordinary build passed.
Both failed build logs are retained. A preliminary receipt-driver import-path
error occurred before browser launch; it was corrected. Its original diagnostic
is in the chat tool output, while that preliminary log was not retained.

The first WebKit audio capture passed **3/4**. Landscape's clock-controlled test
stayed muted after its initial automated mouse activation. The exact case on
literal base `b749ba4` passed once using the same bundle/dependencies. Instrumented
candidate diagnosis reproduced **2 passes / 1 failure**: trusted pointer/mouse
down/up reached the stable button with ready media, but no click event followed.
The audio handler never ran. Its raw failure, event records and trace are kept;
trace network hosts were inspected and contain only `127.0.0.1:4173`.

Keyboard activation of the focused button preserves the interruption test's
purpose and real gesture boundary. Three diagnostic repetitions then passed,
followed by the uninstrumented final Chromium/WebKit checks above. No retries,
wait inflation or timeout relaxation were added. The first diagnostic-copy
launch selected zero cases because the normal config selects the canonical
filename; that setup failure and the temporary selector are retained. Diagnostic
source/config files and the detached exact-base worktree were removed afterward.
Historical #200 failed/incomplete aggregate captures remain failed/incomplete.

## Review artifacts and commands

[Machine-readable comparison](issue-205/comparison.json),
[receipt archive](issue-205/receipts.tar.gz), and
[artifact sizes and SHA-256 manifest](issue-205/evidence.json) retain raw reports,
input/build/environment identities, discovery, command logs and the diagnosed
failure trace. Additional raw PNGs remain locally with hashes in the manifest;
the three representative review images are published separately to avoid
duplicating them in the archive. Screenshots: [desktop](issue-205/desktop.png),
[portrait](issue-205/portrait.png), [landscape](issue-205/landscape.png).

From the repository root under WSL, the executed verification used:

```sh
npm ci
node scripts/browser-check.mjs
npm run build
node node_modules/vitest/vitest.mjs run tests/unit/battleCues.test.ts tests/unit/battleAudio.test.ts --reporter=json --outputFile=tmp/verification/issue-205/head/unit-audio.json
node node_modules/vitest/vitest.mjs run tests/unit/battleSession.test.ts tests/unit/saveEnvelope.test.ts --reporter=json --outputFile=tmp/verification/issue-205/head/unit-session-save.json
npm run typecheck
node tmp/verification/issue-205/capture.mjs smoke -c playwright.setup-smoke.config.ts
node tmp/verification/issue-205/capture.mjs base tests/battle-audio.spec.ts
node tmp/verification/issue-205/capture.mjs head tests/battle-audio.spec.ts
node tmp/verification/issue-205/capture.mjs webkit -c playwright.device-acceptance.config.ts tests/battle-audio.spec.ts
node tmp/verification/issue-205/capture.mjs chromium-interruption tests/battle-audio.spec.ts --grep 'mute, hidden'
node tmp/verification/issue-205/capture.mjs webkit-fixed -c playwright.device-acceptance.config.ts tests/battle-audio.spec.ts
node tmp/verification/issue-205/capture.mjs consumers tests/battle-persistence.spec.ts tests/run-progression.spec.ts --grep 'startup is read-only|reload during legal|accepted player presentation reload|run preparation and dialogs'
openspec validate issue-205-audio-equivalence
git diff --check
```

The ignored capture driver is preserved in the archive for provenance. It uses
the existing JSON reporter and records exact forwarded args, status and wall time.
Explicit diagnostic repeats used zero retries and retained failure traces; they
are separate from timing captures. #199/#200 remain open; review/merge is pending.
