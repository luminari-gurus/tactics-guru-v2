# Issue #145 acceptance evidence

Updated 2026-10-20 (Asia/Jerusalem). See [PR #150](https://github.com/luminari-gurus/tactics-guru-v2/pull/150), the [handoff](../ongoing-projects/plan.md) and [OpenSpec tasks](../../openspec/changes/issue-145-default-move/tasks.md). The review repair below supersedes the original acceptance record for current integration readiness.

## PR #150 review repair

Rebased all seven PR commits without conflicts onto `main` `6758d0f9a28575713b523689a5d8fb7636bfbc99` (13 new integration commits). Reviewed original head: `f625686332ed462d788f410ea7911c3c98ad398d`; rebased baseline: `b4e9de9`. Repair commit: `1082658920e4e3fcc6b3f9c99bab127c6e551fdb`.

Both findings in review `5583848401` reproduced with real native input against the rebased baseline. The three new desktop regressions failed: clearing Choose target retained pending move `(0, 9)`; Cancel and Escape each left Review disabled after the native popup re-selected the same destination. Baseline log: ignored `tmp/pr150-baseline.log`.

The minimal repair uses the existing scene selection callback for the empty option and clears selected/hovered destination when movement confirmation is dismissed. Move stays selected. Tests assert cleared board selection/hover and intent, disabled Review, unchanged battle/replay/save bytes, a usable native retry and exactly one command after confirmation. No selectOption call synthesizes the same-value retry.

Current local evidence:

- `npm ci`: 48 packages; zero audit findings. npm blocked the inherited optional PostHog CLI install script; it is not needed by these checks.
- New Vite-dev regressions on installed Edge: 9/9 passed across desktop, Pixel 7 portrait and landscape, no retries/skips/page errors (`tmp/pr150-repaired.log`).
- `npm run test:unit -- --maxWorkers=1`: 762/762 tests, 47 files, 55.50 seconds (`tmp/pr150-unit-final.log`). Two earlier default parallel runs were 761 pass / one five-second timeout in unchanged full-battle `runBattle.test.ts`; its isolated file passed 8/8. Serial execution passes the original assertions/timeouts without a source workaround.
- `npm run build`: 190 content checks, both TypeScript configurations and Vite passed (`tmp/pr150-build.log`).
- `openspec validate issue-145-default-move --strict` and `openspec validate battle-controls --type spec --strict`: passed.
- Final production matrix, configured posttests and telemetry checks are pending; use the handoff for the current delivery state.

Browser plugin unavailable; the repository Playwright workflow is used. The flow is fresh battle → native destination → clear or Cancel/Escape → cleared preview and same-destination retry → one explicit confirmation. Screenshots and console/state assertions cover real rendered interactions. Playwright emulation satisfies the caller's acceptance instruction; physical hardware and production deployment are not claimed.

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
