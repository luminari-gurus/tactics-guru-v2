# Fighter Second Wind and Taunt qualification

Issue [#163](https://github.com/luminari-gurus/tactics-guru-v2/issues/163).
The requested branch is `branch/issue-163-fighter-abilities`.
Implementation: `d208a6b`; fixture repairs: `b45a011`; browser dependency
integration: `9157214`; first qualified application build: `fbca57b`; current-main integration build: `a74d85e`.
Before current-main integration, later commits carry evidence, fixtures and a
comment correction in `effects.ts`; Fighter application logic, dependencies and
assets remain unchanged. The subsequent bounded automatic-stair merge and its
qualification are detailed in [the current-main addendum](main-integration/README.md). Changed test fixtures/configuration
were requalified below. Earlier tests are explicitly reused, not claimed to have
executed later documentation commits.

## Acceptance evidence

- Canonical level-2 Second Wind / level-3 Taunt, exact profile validation and
  locked-command rejection: ability-validation/progression units cover levels
  1/2/3/5 and malformed owners, kinds, targets, ranges, uses and duration data.
  Standalone play uses a level-one projection; raw definitions remain available
  to earned run/dungeon progression.
- Atomic healing: existing ability/session units cover actual/capped healing,
  projected HP/power, full health, invalid/dead/foreign targets, spent action/use,
  repeated preview/cancel/confirmation, unchanged RNG, fresh reset and resume.
- Taunt: pure previews/resolution restrict all offensive targeting; deterministic
  AI attacks the living source, legally approaches or Waits. Tests cover no-roll
  application, replacement, source/target defeat including friendly missiles,
  target-turn/idle expiry, minimum bow range, blocked routes and legal termination.
  Shared LOS remains authoritative; adjacent range-one cells have no intervening
  LOS samples under the existing terrain rules. Current enemies have no immunity.
- Persistence: exact state readers, run/dungeon healing admission and short-run
  completion preserve bounded healing above entry HP, spent use, Taunt, canonical
  progression and dead heroes. Save/resume/replay match accepted state/events/RNG.
  Fresh encounters carry HP and reset battle-local fields.
- Player controls: all 27 ability-picker cases pass across desktop and Pixel 7
  touch portrait/landscape, including self targeting, accurate heal/use feedback,
  no healing-friendly-fire warning, cancellation, inspection/logs, 320px resize,
  legal approach, once-only activation and reload. The explicit default Mage
  fixture retains its authored two-missile profile; XP fixtures retain canonical
  caster progression. Guarded and Magic Missile numeric/targeting rules remain.

Six complete production dungeon journeys start from the canonical fresh seed-190
level-one/empty-inventory save and enact every spatial step, reward choice and
combat command through the real UI. Desktop/portrait/landscape Chromium and WebKit
produce identical traces: 6 encounters, 365 accepted commands, earned Fighter
level 3, both abilities used and reloaded, five victories followed by terminal
defeat at the second guardian. This is a complete legal journey, not a claim of
two-floor victory. Encounter 6 starts at 24 Fighter HP and legally heals to 30.
The canonical trace SHA-256 is
`ecee36ea8c28011e6ac191e53e6d6958e578221caa943d686f7dd8fe0e0d2f00`.
The `production-*-journey.json.gz` files and representative PNGs retain proof.
Heal preview, Taunt inspection/log and production WebKit screenshots were visually
checked for readable feedback and reachable controls.

## Verification and reconciliation

The shared command/turn/save contracts select policy full regression. The existing
19-stage manifest ran serially with one browser worker. Units and type evidence
were reused only after matching the recorded verification input hash
`405039eaba83caeb6484dca3a8310885bb817f49b8f51ad10a6e4fca6aa57dbc`.

- `npm run test:unit`: **968 passed in 55 files** at the original freeze and
  **971 passed** after current-main integration, no skips; both TypeScript scopes
  passed, including after repairs. Content validation is included in units.
- Tooling: **10 passed**. Build integration: **2 passed**. Ordinary root/prefix
  bundles and final root restoration passed, with per-file build inventories.
- Original browser stages: **1,194 executions: 1,120 passed, 65 failed, 9 skipped**.
  These aggregates remain failed. They are not relabeled as a clean full run.
- Every initial failure maps to successful focused qualification in
  `qualification/reconciliation.json.gz`. All 9 skips map to their required dev
  placement or production-preview mode. No coverage obligation is omitted.
- Repaired integration: **15 Chromium cases passed**, including carried HP/full
  party metadata, full Guarded explanation, actual BFCache and run presentation
  reload across all three default profiles.
- Ability-picker requalification: **27 passed**; the other **45 unchanged fixture
  cases** retain the original successful coverage. Their modules do not consume
  the changed ability fixture entry.
- WebKit acceptance: **54 passed** on local WSL Linux, plus **2 animation cases**,
  with an intentionally invalid Chromium override still set. All 52 previous test
  IDs remain and exactly two previously omitted authored-run cases are added.
- Windows WebKit dungeon/exploration: **63 passed**. Health bars: **25 passed**.
  Production and development telemetry: **36 passed each**.
- Asset repair: **3 passed in each of four modes**: root preview, root dev, prefix
  preview and prefix dev. Unchanged cases retain their original mode-specific
  passes. Source discovery selected exactly the affected three-profile case.
- Original final proof capture: **18 cold/warm samples**, no failures,
  served build `fbca57b`; current-main build `a74d85e` also passes 18 samples. The original 18-sample capture also passed. These are
  local proof-scene measurements, not a new #200 comparable baseline.

Actual commands, selected IDs, statuses, source/build inventories, attempts and
hashes are retained in `qualification/`. Temporary execution wrappers reuse the
maintained manifest/environment logic and are retained as compressed execution
records; no general verification infrastructure is added. Focused browser runs
use existing files/configs and title filters; unchanged suites were not restarted.

## Discovered failures and boundaries

- The carried-party projection and obsolete short Guarded label fail on literal
  main `e489a30`; [PR #244](https://github.com/luminari-gurus/tactics-guru-v2/pull/244)
  fixes their assertions while preserving/adding full metadata coverage.
- Chromium executable overrides reaching WebKit also reproduce on that base.
  [PR #245](https://github.com/luminari-gurus/tactics-guru-v2/pull/245) scopes them
  by engine and restores the missing complete-run selector. Exact-patch Windows
  WebKit startup/run reload passed 2/2; broader integration used actual Linux
  WebKit 26.6 with verified copies of all 100 ordinary production files.
- Original Windows WebKit media cases failed load/decode on the literal base too.
  Supported real-media qualification uses Linux WebKit. No audio assertion was
  weakened, codec mocked, or Chromium substituted for WebKit. Unrelated extension
  registry noise is omitted from published copies; original hashes/local reports
  remain retained.
- Task-owned asset identity and default Mage fixture regressions were repaired
  and requalified. Earlier failed fixture/production attempts remain recorded,
  including the initial unrequested two-floor-victory assertion.

Windows x64 and local WSL Linux used Node 24.19.0, Playwright 1.63.0, Chromium
153.0.8010.12 and WebKit 26.6. Device profiles are emulation; no physical-device
or CI execution is claimed. No merge, deployment, release tag or production data
change is part of this review handoff.

Battle state 2 / rules 3, run envelope 4 and dungeon envelope 5 deliberately reject
earlier saves. The standalone wrapper remains 1 and RNG remains 1. Existing
recovery/export preserves original bytes; no silent migration or reset is added.

Local raw originals and their complete screenshot directories are retained at
`verification-receipts/issue-163-2026-10-25/`. Historical paths inside those reports
still identify the executed `tmp/issue-163-full/` location. Temporary comparison
checkouts were removed after evidence capture; published branches remain.
