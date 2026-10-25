# Automatic dungeon stairs — issue 230

[Issue #230](https://github.com/luminari-gurus/tactics-guru-v2/issues/230) · [published branch](https://github.com/luminari-gurus/tactics-guru-v2/tree/work/issue-230-auto-stairs).

The caller approved the concrete chat plan with **“Approved”** on 2026-10-25. This is the small-change work-work-work path; no OpenSpec planning files were added. Caller/assignee: `dubstylee`. Base: `e489a3077b5571874ad7352e0511035403a30813`. Implementation and tested production build: **`ab5ba9693f60b9086aea159937ff6b6e1239dee7`**, clean before build and browser execution. Subsequent evidence-only commits reuse these unchanged runtime, test, dependency and bundle inputs; they do not claim the old build contains a later documentation commit.

## Behavior and acceptance

`stepDungeon` composes accepted movement into the existing `travelDungeon` validator, producing one revision for both stair entry and travel. The session persists/readbacks the final candidate before publishing it. Failed travel saves retain the pre-step floor and position, including when an uncertain write requires explicit recovery. Unsaved play still blocks travel. The obsolete session travel method and manual Ascend/Descend controls are removed; guidance explains automatic entry and stepping off/back on after arrival or Continue.

| Issue acceptance | Evidence |
| --- | --- |
| Eligible ascent/descent and correct arrival | Pure movement roundtrip; four browser control cases assert floor, revision, arrival, party and inventory. Existing legal guardian-boundary journey now uses automatic descent, return ascent and revisit. |
| Once per entry; no arrival bounce | A stair entry increments the revision once; replaying the old command rejects. Browser arrival stays on the destination stair, then requires a real step off/on to travel again. |
| All supported movement controls | Arrow keys, WASD, compass activation and adjacent-cell activation each perform descent/ascent and locked-stair entry in all six browser profiles. Mobile compass/cell activation uses native Playwright touch. |
| Locks and floor boundaries | Floor-one upstairs and uncleared downstairs remain walkable without travel. Units retain wrong-phase, stale-command, revision-limit, unsaved-play and historical-geometry rejection; existing guardian/reward/defeat gates remain covered. |
| Reload/restore on stairs | Each new control case reloads/Continues after descent and ascent and compares the exact snapshot. Unit encode/decode, construction and Continue also preserve the arrival. |
| Desktop/mobile Playwright proof | 72 Chromium and 72 WebKit cases passed with zero failures, skips or retries. |

The new clear-floor fixtures isolate traversal, not preceding combat completion. The existing dungeon journey separately executes legal finishing commands at all three victory boundaries, reward choices, movement, travel, reload, backtracking and namespace isolation. It is not a claim of six consecutive battles played from a fresh dungeon.

## Verification scope and commands

PR-readiness scope is bounded to dungeon movement, exploration UI and its persistence publication path. No shared battle command/RNG contract, save schema/admission rule, browser configuration, asset, dependency or shared harness changed. The affected units and all three dungeon browser files cover the consumers. Existing exports in `dungeonFixtures` remain unchanged; its new stair-approach export is used only by affected dungeon/exploration tests. `dungeonTraversal` consumers are the two tested dungeon files. Full regression, unrelated telemetry/dev fixtures, and a separate performance capture were not selected. Existing startup/route responsiveness assertions remain in the executed suites.

Commands, all from the repository root:

```sh
npm run test:unit -- tests/unit/exploration.test.ts tests/unit/dungeon.test.ts tests/unit/dungeonBattle.test.ts tests/unit/dungeonEncounters.test.ts
npm run build
npm run check:browsers
npm ls --depth=0
npx --no-install playwright test tests/dungeon.spec.ts tests/dungeon-exploration.spec.ts tests/dungeon-lifecycle.spec.ts --list
npx --no-install playwright test -c playwright.exploration.config.ts --list
PLAYWRIGHT_JSON_OUTPUT_FILE=tmp/issue-230/chromium.json npx --no-install playwright test tests/dungeon.spec.ts tests/dungeon-exploration.spec.ts tests/dungeon-lifecycle.spec.ts --workers=1 --retries=0 --reporter=list,json --output=tmp/issue-230/chromium-artifacts
PLAYWRIGHT_JSON_OUTPUT_FILE=tmp/issue-230/webkit.json npx --no-install playwright test -c playwright.exploration.config.ts --workers=1 --retries=0 --reporter=list,json --output=tmp/issue-230/webkit-artifacts
git diff --check
```

Results: **100 affected unit tests; 221 content checks; both TypeScript scopes; production build; 72 Chromium and 72 WebKit cases passed.** Discovery selected exactly 72 cases for each matrix. Browser runs were sequential, root production preview on strict port 4173, one worker, zero retries, no tracing or stale-server reuse. Production bundles embed the tested commit with `dirty:false`. Installed direct dependencies match package declarations; no reinstall or dependency change was needed.

## Provenance, retained failures and limits

Local host: macOS/Darwin 27.0.0, arm64, Node 26.11.0, Playwright 1.63.0, Chromium 153.0.8010.12 and WebKit 26.6, using the matching installed browsers without executable overrides. Projects: desktop/Pixel 7 portrait/landscape and desktop Safari/iPhone 13 portrait/landscape. These are browser/device emulation results, not physical-device tests. `CAN_TEST_MOBILE` was missing/invalid and interpreted as none. The registered `unraid-tactics-01` Actions runner was offline; no CI browser job or GitHub-hosted fallback was dispatched. Local caches were retained and unrelated host workload was not independently measured; this is functional acceptance, not a comparative performance baseline.

The initial sandbox browser qualification failed to launch either engine. Qualification outside the sandbox passed both, followed by actual dungeon execution on both engines. Those environment receipts are preserved separately. An early expanded unit run had **one failed assertion / 62 passes** because its roundtrip expectation omitted discovery recorded by stepping off a stair. The expectation now retains that discovery; runtime code did not need repair. The initial failed run is retained, alongside final passing evidence. The first four focused desktop stair cases also passed. Existing Vite native-config-loader and large-chunk warnings remain in the build/browser logs.

[Evidence directory](issue-230/) contains compressed raw browser JSON/logs, discovery, build/unit logs, initial iteration logs, dependency inventory, environment receipts, results and a source/build SHA-256 manifest. The manifest records 456 relevant source/test/config/asset/dependency/bundle files and the tested clean commit; all recorded hashes were rechecked before delivery. Representative desktop/portrait/landscape arrival screenshots were inspected; they capture the visible portion of the scrolling exploration screen, while DOM assertions cover arrival and full control behavior. Additional raw artifacts remain locally under `tmp/issue-230/`.
