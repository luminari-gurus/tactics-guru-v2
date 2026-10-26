# Engine-aware browser fixtures

Three battle test files applied `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to every engine.
With that override set, WebKit attempted Chrome with `--inspector-pipe`, failing
before test execution. The same launch failure reproduces on literal main
`e489a30`; a representative persistence case and two Windows audio failures are
retained. Windows WebKit also failed MP3 load/decode on that base; Linux WebKit
provides the supported media runtime used below. No application/audio code changes.

The fixtures now apply the executable override only for `browserName === 'chromium'`.
The existing BFCache argument exception is retained. The WebKit selector also
referenced a renamed authored-run test: discovery retains **all 52 prior IDs**
and adds exactly its portrait/landscape cases (**54 total**). No assertion,
deadline, worker, retry or existing selected case is removed.

Patch commit: `64adcdb`, based on the assertion dependency `95e1a6a`.
Both TypeScript scopes passed. Exact-patch Windows WebKit startup and accepted-run
reload cases passed **2/2** with the Chromium override set.

Broader qualification uses feature integration `9157214`, which contains the same
launch/selection patch with the Fighter implementation. Local WSL Linux x64,
Node 24.19.0, npm 12.2.1, Playwright 1.63.0 and actual WebKit 26.6 were recorded.
All 100 files of the served ordinary Windows `d208a6b` production artifact were
SHA-256 verified before use; runtime application behavior is unchanged by this
test-only patch. The invalid Chromium sentinel
`/invalid/chromium-override-must-not-reach-webkit` remains set throughout:

- `node node_modules/playwright/cli.js test -c playwright.device-acceptance.config.ts --reporter=line,json`:
  **54 passed**, no skips/retries/flakiness (7.7 minutes), including real-gesture
  audio, persistence/recovery, keyboard/touch and the restored complete run cases.
- A retained temporary config selects the animation file's basic/Guarded feedback
  cases on iPhone WebKit: **2 passed**, no skips/retries (7 seconds). This exercises
  the third fixture with the same unusable Chromium sentinel.
- Browser probing records `webkit.version() === '26.6'`; no Chromium binary is
  substituted for engine coverage. Windows and WSL browser jobs run serially.

Reports, source/build inventories, exact selection comparison and temporary config
are compressed alongside this document. The published base report omits unrelated
browser-extension registry noise; its original output hash and local original
are retained. Failed Windows setup/media results remain failed; they are not
represented as a clean original aggregate. Integration qualification does not
claim a separate full application run of this patch's earlier parent branch.
