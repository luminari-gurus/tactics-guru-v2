# Issue #408 compatibility with PR #397 and PR #400

## Result and limits

**11 of 12 primary browser cases passed.** The remaining failure was the native
video-completion assertion. It reproduced in a separate diagnostic bundle with
the new automatic-collection victory observer removed. In the full composition,
the cutscene's existing seven-second watchdog returned to exploration and exactly
one delayed, saved pickup followed. That is watchdog/fallback evidence, **not a
native-media pass**.

Keyboard and touch Skip, disabled cutscenes, reduced motion, missing media,
visibility cancellation, independent Settings persistence, and the selected
standalone/run compatibility journeys passed. No product changes were made to
PR #397 or #400 to obtain these results. The native `ended` assertion was retained.

The [compact JSON receipt](compatibility.json) contains exact case names,
durations, source hashes, input heads, return/pickup observations, and retained
failure-artifact locations. The [browser suite](compatibility.spec.ts.txt) and
[configuration](compatibility.playwright.config.ts.txt) are preserved as text so
they do not enter ordinary test discovery.

## Pinned inputs

| Input | Identity |
| --- | --- |
| Assembled issue #408 Stage 3 base | `06447ab6b9c577d578b7684413f32402da38d3f9` plus the recorded seven-file Stage 2 working-tree overlay |
| Local snapshot of that overlay | `7590a6c4` |
| [PR #400: session-only standalone and three-encounter modes](https://github.com/luminari-gurus/tactics-guru-v2/pull/400) | `62f4efcdfd6cbcba45da898a7349faa4e325400c` |
| [PR #397: full-dungeon outcome cutscenes](https://github.com/luminari-gurus/tactics-guru-v2/pull/397) | `40ef9d76236f5fe93d8d21f539972f78b5532d10` |
| Initial combined local merge | `e2d321f0` |
| Final production source used by all primary browser cases | `435a1104efdd372e31277c8cf6388b49658c4aa6` |

The compatibility worktree was isolated at
`/workspace/scratch/f77bb8a7baf3/issue408-compatibility` on local branch
`work/issue-408-compatibility`. It was not pushed and has no PR. The final source
also includes the shared legacy-layout correction: remove the newly added
migration paragraph while retaining the **Saved reward choice** heading. The
intermediate shortened paragraph was not used by any browser run.

The source comparison confirmed that the domain, envelope, storage, session,
loot renderer, and preference modules match the implementation trees. The
additional production differences are the pinned #397/#400 changes and their
resolutions below. The JSON records hashes of the relevant source, helpers,
dependencies, media assets, and built entry page.

### Merge resolutions

PR #400 merged into the assembled Stage 3 snapshot without conflicts. Adding
PR #397 then required four resolutions:

| File | Resolution |
| --- | --- |
| `src/app/startDungeonApp.ts` | Keep the delayed `host.ended` handler and add #397's `showOutcomeCutscenes: true` opt-in. |
| `src/phaser/BattleScene.ts` | Add the cutscene import while preserving #400's removal of the obsolete `BattleSaveControls` import. The outcome-presentation and shutdown changes otherwise merged automatically. |
| `src/ui/mainMenu.ts` | Keep both independent preference imports and Settings mounts. |
| `tests/main-menu.spec.ts` | Keep #400's deletion of obsolete persistent standalone/run cases and add the incoming routine-cutscene preference case. |

Both Settings styles were retained. The old #397 dungeon test that expects a new
reward picker was not selected; the preserved compatibility suite exercises the
new ground-loot contract through a real winning command.

## Validation matrix

All browser runs used Playwright **1.64.1**, WebKit **27.2**, one worker, zero
retries, and the production preview at `http://127.0.0.1:4198/`. Profiles were
Desktop Safari, iPhone 13 portrait, and iPhone 13 landscape at 844 × 390.
These are browser/device-emulation results, not physical-device results.

| Check | Profile / cases | Result |
| --- | --- | --- |
| Keyboard/touch Skip retains the origin during the cutscene, then performs one delayed saved pickup; reload does not repeat it | Desktop, portrait, landscape: 3 | **3 passed** |
| Native playback emits `ended` before return and pickup | Desktop: 1 | **Failed**: playback stalled; watchdog returned safely, and the delayed pickup checks passed before the native-event assertion failed |
| Routine cutscenes disabled, reduced motion, and media HTTP 404 | Desktop: 1 case with 3 subscenarios | **Passed** |
| Hide during the cutscene, then restore visibility without automatic movement | Desktop: 1 | **Passed** |
| Both independent Settings toggles persist together | Desktop, portrait, landscape: 3 | **3 passed** |
| Complete legal standalone battle, seed 2, reaches victory and verifies replay | Desktop: 1 | **Passed** |
| Run undo, legal terminal journey, and reset on reload | Desktop: 1 | **Passed** |
| Public and transient testing routes ignore valid legacy saves, preserve their bytes, and leave dungeon Continue working | Desktop: 1 | **Passed** |
| Diagnostic native playback with only the victory observer removed | Desktop: 1, separate bundle | **Failed with the same missing `ended` event** |

The primary total is **11 passed / 1 failed**. The separate diagnostic adds
**one reproduced failure**; it is not part of that primary total. There were no
automatic retries or suppressed browser failures.

The combined initial build passed 226 content tests, both TypeScript scopes, and
the production bundle. Thirty-five focused automatic-collection, controller,
preference, route, and menu-save unit tests passed. The final bundle was rebuilt
after the legacy paragraph removal, and both TypeScript scopes passed on the
final source. The earlier unit/content evidence is reused across that literal
legacy-copy-only change. This is a bounded compatibility check, not a claim that
the whole regression matrix or all acceptance gates of #397/#400 ran.

### What the dungeon browser checks establish

The starting save is an **ongoing** battle, validated by the dungeon reader and
encoder. Its combat history comes from legal domain play; the adjacent
exploration approach is deliberately staged. The final winning command is
executed through the real browser HUD. Earlier turns and traversal are not
claimed as browser interaction.

Read-only DOM observers record accepted victory, exploration becoming visible,
and the saved pickup. Successful pickup increments the dungeon revision once
and the normal exploration movement counter once, depletes the one ground item,
and survives reload without a second step. The browser assertion requires at
least 350 ms between return and pickup to allow observation jitter; the separate
controller unit test checks the exact 399/400 ms boundary. These observations
establish sequencing, not a performance budget.

The hide case overrides `document.hidden` and dispatches `visibilitychange` to
exercise the application and cutscene cancellation handlers. It does not claim
an actual background-tab or BFCache transition. Actual touch Skip and Settings
activation use Playwright's touchscreen on both mobile profiles. The captured
desktop and mobile cutscene/pickup screenshots were visually inspected for
legible feedback, reachable Skip controls, and the returned exploration state.

## Native-media failure and isolation

`ffprobe` reports the pinned victory asset as H.264/`avc1`, 96 frames at 24 fps,
with a duration of exactly 4.000 seconds. Its SHA-256 is
`a866c4251df75f7bc7bce30d14adf5e48f0875bf687a8982c200952b8ee00a93`.
WebKit reports that it can probably play the format and emits `playing`.

In the primary native-completion case, no `ended` or media-error event arrived.
The existing seven-second cutscene watchdog closed the presentation. The
automatic pickup then published 428 ms after exploration returned. The test
failed because the required native `ended` event was absent.

For the bounded diagnostic, a separate bundle changed only the assignment of
`session.onVictory` to `null`. The original source and ordinary production bundle
were preserved. The diagnostic again emitted `playing`, then stalled at
`currentTime = 0.1762462` with `duration = 4`, `readyState = 2`,
`networkState = 2`, `paused = false`, `ended = false`, and no media error. The
watchdog returned to exploration; the party remained at its origin and the loot
remained on the ground, as expected with the observer removed.

The stall also occurs with the automatic-collection victory observer disabled.
This comparison does **not** establish an exact PR #397-only baseline,
identify the underlying codec/network/runtime cause, or certify native playback.
Native completion remains an explicit limitation of this receipt. The fallback
result must not be relabeled as a native playback pass. Both failures, traces,
screenshots, logs, and sampled state were retained. No #397 product fix or
assertion relaxation was made.

## Reproduction and retained artifacts

The installed browser required these existing runtime settings:

```sh
export PLAYWRIGHT_BROWSERS_PATH=/workspace/scratch/c33ca9df3054/webkit-local
export LD_LIBRARY_PATH=/workspace/scratch/c33ca9df3054/webkit-local/root/usr/lib/x86_64-linux-gnu
export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1
```

The validation override bypasses the runtime's dependency scanner; it does not
skip test assertions or browser execution. Node was **v24.22.1**. Browser jobs
were serialized. Other non-browser checks also ran during qualification;
no performance-budget claim is made for these media observations.

The preserved suite/configuration are copied back to their original `.ts`
locations in the isolated combined checkout for reproduction. Primary selections
used the following commands, with receipt-specific output directories:

```sh
npm run build
npx --no-install vitest run tests/unit/dungeonAutoCollect.test.ts tests/unit/delayedDungeonStep.test.ts tests/unit/autoCollectLootPreference.test.ts tests/unit/menuSaves.test.ts tests/unit/routes.test.ts
npm run typecheck
npm run build:bundle

ISSUE408_COMPAT_RUN=desktop-skip npx --no-install playwright test -c playwright.issue408-compatibility.config.ts tests/issue408-compatibility.spec.ts --project=desktop-webkit --grep 'keyboard or touch cutscene Skip'
ISSUE408_COMPAT_RUN=desktop-rest npx --no-install playwright test -c playwright.issue408-compatibility.config.ts tests/issue408-compatibility.spec.ts --project=desktop-webkit --grep 'native cutscene completion|disabled reduced-motion|hiding an active cutscene|both independent settings'
ISSUE408_COMPAT_RUN=mobile npx --no-install playwright test -c playwright.issue408-compatibility.config.ts tests/issue408-compatibility.spec.ts --project=portrait-webkit --project=landscape-webkit --grep 'keyboard or touch cutscene Skip|both independent settings'
ISSUE408_COMPAT_RUN=modes npx --no-install playwright test -c playwright.issue408-compatibility.config.ts --project=desktop-webkit --grep 'testing routes: fresh play never accesses valid saved games|run battle undo and a legal terminal journey reset on reload|complete legal authored battle seed 2 reaches playerWin through controls and replays'
```

The original `desktop-rest` invocation used `--grep-invert 'keyboard or touch
cutscene Skip'` before the diagnostic case was added. The explicit selection
above reproduces those same four cases using the final preserved suite. That
suite adds read-only media samples to the unchanged native assertion and the
separate observer-removed diagnostic; the previously passing case bodies remain
unchanged.

The observer-removal patch is embedded in the JSON receipt. Its separate bundle
was built with `npm run build:bundle -- --outDir
/workspace/scratch/f77bb8a7baf3/issue408-compatibility-qa/no-auto-dist`, then the
original source was restored. Its command was:

```sh
ISSUE408_COMPAT_RUN=no-auto-native ISSUE408_COMPAT_NO_AUTO=1 npx --no-install playwright test -c playwright.issue408-compatibility.config.ts tests/issue408-compatibility.spec.ts --project=desktop-webkit --grep 'native cutscene with victory observer removed'
```

Raw local evidence remains under
`/workspace/scratch/f77bb8a7baf3/issue408-compatibility-qa/`:

- `integration-inputs.json`, source manifests, and `stage3-overlay.patch` record the combined inputs.
- `build.log`, `units.log`, final typecheck/bundle logs, and each named browser log preserve all runs.
- `desktop-skip/`, `desktop-rest/`, `mobile/`, `modes/`, and `no-auto-native/` hold the JSON reports and artifacts.
- `no-auto-source.patch`, `no-auto-build.log`, and `no-auto-dist/` preserve the diagnostic difference and bundle.

The committed QA files contain UTF-8 text/JSON only. Binary screenshots, videos,
bundles, and failure traces remain in the retained local evidence; their relevant
hashes/paths are recorded in the JSON receipt.
