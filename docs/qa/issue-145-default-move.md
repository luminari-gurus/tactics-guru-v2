# Issue #145 acceptance evidence

Updated 2026-10-20 (Asia/Jerusalem). Both review findings are repaired and published in [PR #150](https://github.com/luminari-gurus/tactics-guru-v2/pull/150), with a [verified review response](https://github.com/luminari-gurus/tactics-guru-v2/pull/150#issuecomment-6289845095). The [handoff](../ongoing-projects/plan.md) and [OpenSpec tasks](../../openspec/changes/issue-145-default-move/tasks.md) record completed delivery. This review record supersedes the original acceptance record below for current integration readiness.

## PR #150 review repair

All seven original PR commits rebased without conflicts onto `main` `6758d0f9a28575713b523689a5d8fb7636bfbc99` (13 integration commits). Original reviewed head: `f625686332ed462d788f410ea7911c3c98ad398d`; rebased pre-repair baseline: `b4e9de9`. Repair commit: `1082658920e4e3fcc6b3f9c99bab127c6e551fdb`.

Both findings in review `5583848401` reproduced using native input against the rebased baseline. All three new desktop regressions failed: clearing Choose target retained pending move `(0, 9)`; Cancel and Escape each left Review disabled after the native popup re-selected the same destination. Baseline: ignored `tmp/pr150-baseline.log`.

The repair passes the empty option as null through existing scene selection and clears selected/hovered destination on movement-confirmation dismissal. Move remains selected. Existing `battle-loop.spec.ts` cases assert cleared selection/hover/intent, disabled Review, unchanged state/replay/save bytes, native retry and exactly one accepted command after confirmation. Native Space/Home/ArrowDown/Enter re-selection exposes the real unchanged-value defect; selectOption does not synthesize that retry.

## Current local results

- `npm ci`: 48 packages, zero audit findings. npm blocked the inherited PostHog CLI install script, which these checks do not need.
- `npm run test:unit -- --maxWorkers=1`: 762/762 tests, 47 files, 55.50 seconds (`tmp/pr150-unit-final.log`). Two earlier parallel runs had 761 passes and one five-second timeout in unchanged full-battle `runBattle.test.ts`; its isolated file passed 8/8. Serial execution passes original assertions/timeouts without a source workaround.
- `npm run build`: 190 content checks, both TypeScript configurations and Vite passed (`tmp/pr150-build-final.log`). Both typechecks passed again after the browser-test changes (`tmp/pr150-typecheck-final.log`).
- All 609 configured default browser cases have passing production evidence on installed Edge: 588 passed in the 34.2-minute broad run, and all 21 affected cases passed in a 1.6-minute focused recheck. No retries or skips. The initial full command was 588 pass / 21 fail, not entirely green (`tmp/pr150-full-browser.log`, `tmp/pr150-integration-recheck.log`).
- Both configured posttests passed separately: 24/24 encounter cases (35.6 seconds) and 21/21 run-item cases (16.7 seconds), on their configured Vite dev servers (`tmp/pr150-posttests.log`). The failed broad command did not automatically invoke posttests.
- All 36 configured telemetry cases have passing evidence on their configured production build with mocked ingestion: 33 passed in the 4.2-minute full run; the three affected complete-run cases passed in a 3.3-minute focused recheck (`tmp/pr150-telemetry.log`, `tmp/pr150-telemetry-recheck.log`). The first telemetry command was 33 pass / 3 fail.
- All nine new native-input regressions passed in the production broad run, plus the earlier 9/9 Vite-dev repair pass (`tmp/pr150-repaired.log`).
- Strict OpenSpec change/main-spec validation, document links and whitespace passed; final publication repeats these non-runtime checks.

The 21 broad failures came from three exact expectations unchanged on `main`: the layout list omitted the new Privacy & analytics disclosure; map isolation rejected read-only opt-out preference reads; and health-bar progression expected the former authored map ID instead of `map:desert_woodland_crossing`. Commit `1231a8703ba2ee3b22c455a11e0430de49812493` aligns those expectations. All size/reachability, forbidden storage reads/writes, health projections, encounter labels and legal progression assertions remain. The map test permits only `getItem:tactics-guru:telemetry-opt-out`; every write and other storage access still fails it.

The telemetry fixture reached a legitimate defeat at encounter three but required victory. The current procedural-grid contract explicitly does not guarantee victory. Its repaired test still requires all three encounters, two earned rewards, terminal Continue, exact event counts and privacy assertions. It now accepts either terminal result at encounter three and additionally verifies that the reported outcome/phase matches actual state. This does not accept early defeat as coverage of the complete-run fixture.

## Source and browser identity

Default production artifact: `c394ee5d650d816d7e9ccbdf649e74886cd3f0b5`. Source blobs: BattleScene `936106fe8769e37451177fafe127f0040105bc1c`; HUD `416f7443e8031c1e27599ca608f3b861a2cddbad`; native regression file `53b82252625781f410fb0ddf053db18e286a753f`. Build metadata reports dirty=true because content checks rewrote tracked snapshot line endings without a canonical Git content change. Those generated rewrites were restored and are excluded from publication.

Application, dependency and build inputs have not changed after that artifact. Subsequent changes only align the four failing browser expectations and update documentation/OpenSpec. All other passing test inputs are unchanged, so their evidence is reused under ablation; this is combined coverage, not a claimed single clean full rerun.

Environment: Windows Node 24.19.0, npm 12.0.2, Playwright 1.63.0 and installed Edge 155.0.4283.62. Projects: desktop 1280x720, Pixel 7 portrait 412x839 and landscape 915x412. Browser plugin unavailable; the repository's Playwright workflow was used. The flow is fresh battle → native destination → clear or Cancel/Escape → cleared preview and same-destination retry → one explicit confirmation. New regression cases reported no page errors. Desktop and portrait production screenshots were visually inspected: no stale board selection/hover, a neutral destination prompt and disabled Review; the nested scroller keeps controls reachable without covering the board. Local screenshots remain in `tmp/pr150-full-browser`.

Playwright emulation supplies device acceptance under AGENTS.md. This does not claim physical hardware, screen-reader behavior, live PostHog ingestion or production deployment. The Edge override avoids the previously diagnosed headless-shell BFCache limitation; all original BFCache assertions passed in this broad run. Existing Vite chunk/native-loader and Node color warnings remain non-failing.

## Exact review validation commands

Windows npm uses the existing ignored `tmp/bin/npm.cmd` wrapper; OpenSpec runs through the installed WSL CLI.

```powershell
$env:PATH="$((Get-Location).Path)\tmp\bin;$env:PATH"
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
npm run test:unit -- --maxWorkers=1
npm run build
npm test -- --output tmp/pr150-full-browser --reporter=line
node node_modules/@playwright/test/cli.js test tests/layout.spec.ts tests/overworld-map.spec.ts tests/unit-health-bars.spec.ts --grep 'controls stay at least 44 px|map isolates battle storage|real run reward healing' --output tmp/pr150-integration-recheck --reporter=line
npm run posttest
npm run test:telemetry -- --output tmp/pr150-telemetry --reporter=line
npm run test:telemetry -- --grep 'mocked ingestion sees accepted run' --output tmp/pr150-telemetry-recheck --reporter=line
npm run typecheck
wsl bash -lc 'openspec validate issue-145-default-move --strict; openspec validate battle-controls --type spec --strict'
git diff --check
```

## Original acceptance record (2026-10-19)

The original pre-rebase implementation had passing evidence for all 588 configured cases plus 39 posttests across the runs below. Its first full browser command was not entirely green. These historical results do not substitute for the current integration run.

## Candidate and reproduction

Base: `b1bd7e7` (plan) on `main` `41ca782`. Initial focused build: that base with the issue implementation in the working tree. Production source blobs are `ccadc293b2d5085b524d1d37b9b7a9b290c48381` for BattleScene and `db923598af5b9874df02355a2e29e3c111098741` for HUD. No movement, combat, save or replay rules changed.

The full lifecycle and retained captures use production build `7940d3e3b7f63bbe5ad832ff503e597d16cc5c17`, with those same production source blobs. Build metadata reports `dirty=true`: content validation rewrote a tracked snapshot's LF/CRLF representation, with no Git content diff. Subsequent handoff/evidence commits do not change tested application or test inputs.

The unchanged application failed `default Move initializes once per usable player turn and preserves explicit choices` on desktop: Move was enabled but `aria-pressed` was `false`, expected `true`. This was tested against a production build before the scene edit.

A second direct regression isolated a validated artificial snapshot at the existing 10,000-command limit. After the scene fix, Move was correctly unselected but the HUD still enabled it despite `previewMovement` returning `commandLimit`. The test failed before the narrow HUD fix. Both checks and origin-only behavior pass in the candidate's desktop boundary pass. Artificial boundary snapshots are not represented as ordinary gameplay progression.

## Acceptance map

1. First/later turns: `battle-loop.spec.ts` defaults without an action click after an enemy opening, another hero, round wrap and a real player-first restart seed selected from domain state.
2. Normal selected state: the same test compares native destination values and board reach with `previewMovement`, checks an empty destination, null pending intent and disabled Review before input.
3. Explicit override: Basic attack and signature survive target selection, hover, inspection/log dialogs, resize and simulated visibility restoration. State, replay and exact localStorage bytes stay unchanged.
4. Next turn: real Wait/enemy progression replaces an explicit choice with Move. `run-progression.spec.ts` checks fresh selection and empty destination at all three legally played encounter entries.
5. Selection never executes: existing keyboard, real touch and occluded-ground pointer/touch tests now use the default directly. Existing confirmation, right-click, Escape, modal capture, held-key and gesture suites remain in the full regression run.
6. Unavailable movement: the Continue test legally confirms one move, checks spent/unpressed Move and reconstructs that saved state unchanged. The synthetic command-limit case proves domain rejection disables Move. The origin-only case keeps existing enabled selection but offers no destination or intent.
7. Post-action flow: Move accepts exactly one command and leaves the remaining action usable. A legally reached attack-before-move boundary stays cleared with unspent Move manually selectable. Session result comparison and existing complete-battle/run replay checks retain deterministic acceptance proof.
8. Interaction/visual evidence: desktop, Pixel 7 portrait and landscape run the same scenarios. Screenshots cover initial selection, explicit override and spent movement. Playwright emulation satisfies AGENTS.md; no hardware, screen-reader or deployment testing is claimed.

## Verification

- `npm ci`: 44 packages, zero audit findings.
- Focused unit command from the plan: 53/53 tests in four files.
- `npm run test:unit`: 712/712 tests in 41 files.
- `npm run build`: content checks, both TypeScript configurations and Vite passed.
- Strict OpenSpec validation: passed for this change.
- Three-profile focused default/Continue/map/run pass: 21/21, four minutes, no retries or skips. This includes all three run encounters on every profile. Initial keyboard/touch/lock checks also passed 6/6; that preliminary batch had three fixture-assertion failures from assuming seed 2 was player-first. The fixture now derives the actual player-first seed from session rules, and the corrected cases pass on all profiles.
- Complete default `npm test -- --reporter=line`: 567 passed and 21 failed in 39.2 minutes. All failures were the existing BFCache-return-marker assertions, seven per profile; the new #145 cases passed. No retries or skips. The failing command did not invoke posttests.
- Explicit `npm run posttest`: 18/18 authored-encounter cases (40.3 seconds), then 21/21 run-item cases (12 seconds), using their configured Vite dev servers and the same application/test inputs.
- BFCache-only recheck with installed Edge and the existing executable override: 21/21 in 52.9 seconds across all three profiles, no retries or skips. The original assertions remain intact. Combined with the 567 passing default-browser cases, this completes coverage of all 588 configured cases.

The environment uses bundled Windows Node 24.19.0, npm 12.0.2 and Playwright 1.63.0 with installed Chromium/headless shell 153.0.8010.12 (revision 1243). Projects are desktop 1280×720, Pixel 7 portrait 412×839 and Pixel 7 landscape 915×412; mobile screenshots use device scale factor 2.625. These values were read from the installed Playwright device descriptors and project configuration. Windows npm is invoked through an ignored wrapper because npm is absent from the session PATH. OpenSpec runs via the installed WSL CLI. No browser executable override is set.

Existing warnings: Vite reports its large Phaser chunk and future native-config-loader extension support; Node reports FORCE_COLOR/NO_COLOR precedence. These do not fail build/tests. A premature second Playwright invocation found the owned preview port busy and ran no cases; subsequent browser runs are serialized.

The BFCache diagnosis used CDP's `Page.backForwardCacheNotUsed`: installed Chromium headless shell reported `BrowsingInstanceNotSwapped` and `BackForwardCacheDisabledForDelegate`. An unchanged-build diagnostic with installed Edge 155.0.4283.62 returned the expected persisted pageshow marker. The local full Chromium binary could not launch (`spawn UNKNOWN`), so the recheck used `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`. This is an environment selection through an existing test option, with no product workaround or weakened cache assertion. This evidence does not claim BFCache support in the installed headless-shell delegate or a full Edge browser certification. No application/test input changed between the full run and the recheck.

After the full command, the failed cases and posttests were completed with:

```powershell
npm run posttest
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
node node_modules/@playwright/test/cli.js test tests/battle-animations.spec.ts tests/battle-persistence.spec.ts --grep 'ability departure through real browser history|browser history with BFCache enabled' --output tmp/bfcache-recheck --reporter=line
```

Logs remain in ignored `tmp/full-unit.txt`, `tmp/final-build.txt`, `tmp/focused-default.txt`, `tmp/full-browser.txt`, `tmp/posttests.txt` and `tmp/bfcache-recheck.txt`. The 21 missing checks were rerun; the 567 valid passes were reused under the ablation workflow. No extra compatibility layer, browser harness or unrelated source repair was added.

## Visual review

All three retained captures were visually inspected. The desktop initial capture shows the gold selected Move button, teal movement range, untouched board selection and disabled Review. Portrait retains the explicit signature selection and target overlays. Landscape shows disabled, unselected spent Move with the remaining action available. The existing rail/dock keeps the board unobstructed; deeper controls remain in the nested scroller.

- [Desktop initial default](issue-145-default-move/desktop-default-move.png).
- [Portrait explicit signature override](issue-145-default-move/mobile-portrait-explicit-override.png): the gold signature selection and target overlays remain while Move is unselected. The controls remain within the nested scroller and do not cover the board.
- [Landscape post-move state](issue-145-default-move/mobile-landscape-post-move.png).
