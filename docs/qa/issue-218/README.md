# Issue 218: persistent Guarded badge

Issue: https://github.com/luminari-gurus/tactics-guru-v2/issues/218
Branch: `work/issue-218-guarded-indicator`; base `87a80366686edd897affa1ec7053c0ac32609615`.
The caller explicitly approved the small-change chat plan on 2026-10-25. No OpenSpec change was needed.

## Behavior and acceptance mapping

The board creates one non-interactive vector shield per unit and reads the existing
`guardedEffect` from each presented snapshot. The badge has a minimum 12 CSS-pixel
width and remains above ground overlays, below transient attack feedback, and separated
from the HP arc. Movement and camera/layout updates reposition the same object.
Scene-owned display objects are destroyed with the scene. No gameplay, RNG, command,
save, effect-lifetime or asset contracts change.

| Acceptance | Evidence |
| --- | --- |
| Accepted hit/miss, after animation and other-unit turns | Guarded lifecycle cases explicitly select deterministic accepted hit/miss boundaries in standalone, run and dungeon; check badge visibility after presentation and each subsequent player boundary |
| Expiry, rejected actions, defeat, restart and transitions | Lifecycle expiry; standalone hit rejects self-target through keyboard controls with unchanged state/storage; legal Guarded defeat witness; restart while Guarded checks no badges/object leaks; health-bar next-encounter check |
| Accessible explanation | HUD/party inspection text includes +2 AC, −2 attack rolls and expiry immediately before this unit's next turn; keyboard inspection and native touch badge taps |
| Saved Guarded | Reload/Continue checks exact state, no replayed events or transient activation effect, and immediately visible badge in all three modes |
| Responsive and unobscured | Desktop/portrait/landscape, 320×568 and 568×320 screenshots; shield bounds/depth/HP-gap assertions; health matrix; legal move and zoom witness |

## Verification selection

PR-readiness tier under [verification policy](../../verification-policy.md).
Affected consumers: shared `BoardRenderer` and `unitFeedback` in standalone, authored-run
and dungeon-hosted `BattleScene`. Select Guarded lifecycle, HP/annotation geometry, legal
movement/defeat/restart, responsive inspection and complete journeys for all three routes.
Both TypeScript scopes and production content/build validation are required.

Dev encounter/item/ability fixtures, dev placement, configured telemetry, base-path assets,
audio matrices and performance captures are not selected: their code/contracts are unchanged.
This is bounded presentation work, not a full-regression or release qualification.

## Environment and retained attempts

Local macOS arm64, Node 26.11.0, Playwright 1.63.0, Chromium 153.0.8010.12 and
WebKit 26.6. Installed browser launch qualification passed outside the filesystem sandbox;
its initial sandboxed launch failed before tests. The CI runner `unraid-tactics-01` was
offline, so no CI or GitHub-hosted execution is claimed. Runs are serial with one worker,
zero retries, root production preview on port 4173, ordinary unconfigured telemetry.
Persistent caches and unrelated host activity are not independently measured. No performance
comparison or physical-device testing is claimed. WebKit mobile zoom uses the existing
health-matrix pointer-handler technique because its driver lacks native wheel/multipoint input;
Chromium badge taps use native touch on mobile profiles.

Raw logs/discovery and source/build hashes are retained locally in `tmp/issue218/`;
browser JSON, screenshots and errors in `verification-receipts/browser-runs/`.
Reports below preserve failed attempts as well as affected-case recovery; separate focused
passes do not rewrite an earlier failed full invocation.

- `run-MYsBac`: first standalone hit failed the HP-gap check at short landscape size. Fixed by retaining an 8px screen-space HP gap at small scales.
- `run-nLWKwp`: 18/18 Chromium Guarded lifecycle cases passed on the corrected runtime.
- `run-KgQCo5`: all six newly added movement/defeat cases failed during test-clock setup (wheel before readiness; paused Continue/initial render).
- `run-KVlS6c`: corrected desktop defeat passed; movement failed because the assertion did not account for the existing idle sprite bob. The badge correctly remained tied to the tile anchor.
- `run-FuVMxO`: all six corrected Chromium move/defeat cases passed.
- `run-WWYqHN`: 14 WebKit cases passed; two movement cases failed because mobile WebKit does not support mouse wheel. No product failure or unsupported wheel claim is hidden.
- `run-RnxAyt`: all four affected WebKit movement/rejected-target cases passed after using the established pointer technique.
- `run-Cpi8bf`: 25/25 health-bar device cases passed, including the added badge/state and fresh-encounter assertions.
- `run-6xyRnk`: 15/15 complete legal battle win/loss, run outcome/reward/restart, dungeon reward/guardian/travel, and keyboard cases passed across all three Chromium profiles.
- `run-MFsKjA`: 3/3 final Chromium standalone-hit cases passed after the explicit rejected-target assertions were added. Other Chromium lifecycle branches and the Chromium movement branch have unchanged behavior and assertions; the WebKit-only pointer adaptation does not alter Chromium wheel execution.
- Full `npm run test:unit`: 915 passed, 27 failed with 27 errors in `measureFitPreview.test.ts` because the sandbox blocks `listen` on local ports. Outside-sandbox focused recovery: 27/27 passed. The initial full invocation remains failed; this is not a clean full-suite rerun.
- Focused abilities, board presentation and health geometry units: 40/40 passed. Production build: 221 content checks and both TypeScript scopes passed. Existing Vite native-loader and large-chunk warnings remain.

## Inspected screenshots

These are `run-nLWKwp` standalone-hit screenshots on the corrected runtime, after
activation feedback completes. Later changes only add test assertions and documentation;
source/build equivalence is recorded in `results.json`.

- [Desktop](guarded-desktop.png)
- [Mobile portrait](guarded-portrait.png)
- [Mobile landscape](guarded-landscape.png)

The final implementation commit is `24b92830ffe8789cc726d8ef45086ce2b67cb01f`.
All browser runs serve the retained production build from base `87a8036` with dirty runtime
inputs; `results.json` records their hashes and equivalence to the implementation commit.
They are not claimed to have rebuilt or served clean `24b9283` metadata. QA-only commits
preserve those runtime, test, dependency and served-build inputs. Ordinary build output is
1,425.75 kB / 372.39 kB gzip for the main chunk; existing Vite warnings remain.

Final report counts, source/build identity and artifact hashes are recorded in `results.json`.


## Reproduce the additional WebKit selection

The existing acceptance/exploration configs intentionally exclude `guarded-effects.spec.ts`.
For this task only, `tmp/issue218/webkit.config.ts` used the ordinary preview/server settings
with the existing iPhone profiles and the changed file selected explicitly:

```ts
import { defineConfig, devices } from '@playwright/test';
import base from '../../playwright.config';
export default defineConfig({
  ...base, testDir: '../../tests', testMatch: '**/guarded-effects.spec.ts',
  projects: [
    { name: 'guard-webkit-portrait', use: { ...devices['iPhone 13'], launchOptions: {} } },
    { name: 'guard-webkit-landscape', use: { ...devices['iPhone 13 landscape'], launchOptions: {} } },
  ],
});
```

Run from the repository root after a successful production build:

```sh
npm run test:browser -- tests/guarded-effects.spec.ts
npm run test:browser -- -c tmp/issue218/webkit.config.ts
npm run test:browser -- -c playwright.health-bars.config.ts
npm run test:browser -- tests/battle-loop.spec.ts tests/run-progression.spec.ts tests/dungeon.spec.ts -g 'complete legal authored battle seed|keyboard-only movement|legal run outcomes|legal reward and guardian boundaries'
```

Actual executed invocations and case results, including focused recoveries, are retained in
`results.json` and the original browser reports. The commands above describe reproduction,
not an assertion that every original invocation was clean.


## Final acceptance accounting

All **80 unique affected browser cases** are accounted for with a passing latest result:
24 Guarded Chromium, 16 Guarded WebKit, 25 health-bar profiles and 15 complete-journey/keyboard
cases. There are zero unresolved affected cases and no skipped cases. This union uses
focused recoveries and does not relabel the original failed invocations as passing.
`results.json` retains every attempt and its hash, plus latest-case coverage accounting.
The final source, tests, helpers, configs, lockfile and served assets are hashed there.
`git diff --check` and documentation-link checks passed. No acceptance criterion remains
unverified within browser/device emulation; physical hardware and full release regression
were not performed or required for this issue.
