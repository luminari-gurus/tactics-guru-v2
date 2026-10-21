# Issue 190: native movement destination keyboard failures

Issue: https://github.com/luminari-gurus/tactics-guru-v2/issues/190

Branch: `work/issue-190-native-select`, assigned to `dubstylee`, based on main
`35afc77cab96e782d2b1283651a95ab5a4a75011`. The caller approved the focused
chat plan before implementation on 2026-10-21. OpenSpec was unnecessary for
this bounded test-interaction repair. #187 remained open at delivery preparation;
the review modal contract is therefore retained. Related harness PR #198 is
already included in the base. #207's browser setup PR is separate work.

## Cause and repair

All three original desktop tests reproduced at the reported disabled Review
assertions: 0 passed, 3 failed. On this macOS arm64 host, headless installed
Google Chrome 155.0.8059.86 delivers the Home/ArrowDown and
Space/Home/ArrowDown/Enter keys to the select but leaves its value empty and
emits neither `input` nor `change`. A minimal HTML select with no application
code reproduces this behavior. Arrow/Enter, Alt+ArrowDown and click/arrow
variants also fail to change that minimal select. Keyboard type-ahead changes
it and emits trusted native `input` and `change` events.

This isolates the observed failures to host/browser native-select automation
behavior combined with test assumptions; no production input defect was found.
It does not establish that headed Chrome or other hosts have the same behavior.
The HUD's option replacement was investigated but is not needed to reproduce
the failure, so runtime code is unchanged.

The three tests now choose via real keyboard type-ahead. Tab away and refocus
resets the browser's type-ahead buffer before each choice; without this focus
transition, immediate typing of the placeholder after a destination does not
clear the selection on this host. No timer delay is used. Each helper call
asserts the exact option value and a fresh trusted native `change` event.
`selectOption`, synthetic input/change, skips, arbitrary sleeps and retries are
not used in these interactions. Both cancellation cases explicitly assert the
empty destination and null pending intent before selecting the same destination.
Confirmation checks the entire replay command list against the original list
plus precisely the prepared move.

## Acceptance mapping

- Reproduce/classify all three failures: unchanged-base failure log plus
  minimal and production native event diagnostics below.
- Preserve actual keyboard/native selection: `pressSequentially` drives the
  browser select; a fresh `event.isTrusted === true` assertion guards every choice.
- Clearing removes pending intent, selected/hovered tile and preview; Move stays
  selected, Review is disabled, state (including RNG), replay and all localStorage
  bytes remain equal to the original values.
- Cancel and Escape each clear intent, allow the same native destination to be
  chosen again, preserve state/replay/save bytes, and accept exactly one move
  after deliberate confirmation.
- Browser regressions cover keyboard/modal focus, mobile controls, real touch,
  presentation locks, restart, inspection and complete authored win/loss journeys.

## Environment and verification

macOS 27.0.1 (26A434), arm64; Node 26.11.0; locked Playwright 1.63.0;
installed Google Chrome 155.0.8059.86 at
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
Production preview, one worker, zero configured retries. Mobile profiles use
Playwright Pixel 7 portrait/landscape emulation; no physical-device claim.

Commands use this executable override:

```sh
export PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
npm ci
npm run build
npx playwright test tests/battle-loop.spec.ts --project=desktop -g 'clearing the native|movement confirmation (Cancel|Escape)'
npx playwright test tests/battle-loop.spec.ts
npm run test:unit
npm run typecheck
git diff --check
```

Results:

- Original desktop reproduction: **3 failed**, all at the reported assertions.
- Initial repaired desktop selection: **3 passed**; the final run below includes
  the subsequently strengthened cancellation and exact-command assertions.
- Final full `battle-loop.spec.ts`: **45/45 passed** in 3.9 minutes, 15 per
  desktop / mobile portrait / mobile landscape, no skips or retries.
- Full configured unit suite: **887/887 passed**, 51 files.
- Production build: **221/221 content checks**, both TypeScript scopes and
  Vite bundle passed. Final test changes also pass both TypeScript scopes.
- `git diff --check`: passed.

[Final browser log](issue-190-native-select/regression.log.gz).
Visually reviewed [cleared desktop](issue-190-native-select/cleared-desktop.png),
[Cancel portrait](issue-190-native-select/cancel-portrait.png), and
[Escape landscape](issue-190-native-select/escape-landscape.png) captures retain
the empty destination/selection and disabled Review state. The landscape
capture is scrolled to Review, with part of the select above the scroll viewport.

## Retained evidence and provenance

[Original 3/3 failures](issue-190-native-select/baseline.log.gz),
[original application key/event values](issue-190-native-select/diagnose.log.gz),
[minimal-select comparison](issue-190-native-select/isolate.log.gz),
[type-ahead without buffer reset](issue-190-native-select/typeahead.log.gz),
[type-ahead with real focus transition](issue-190-native-select/typeahead-blur.log.gz).
Diagnostic scripts are retained as `.mjs.txt` alongside these logs; copy into the
repository as `.mjs` and run with a production preview on port 4174 to reproduce.
They only observe events and drive real browser keys.

[Build](issue-190-native-select/build.log.gz),
[unit suite](issue-190-native-select/unit.log.gz),
[typechecks](issue-190-native-select/typecheck.log.gz),
[initial three passing desktop cases](issue-190-native-select/focused.log.gz).
The initial focused pass preceded the additional empty-destination/exact-command
assertions; final browser evidence covers those assertions.

[Input and served build SHA-256 hashes](issue-190-native-select/input-hashes.json)
bind the final test file, runtime, lockfile/configuration and actual dist bytes.
The production build was made on the clean base before test-only changes; its
runtime/build inputs are unchanged. Commit metadata alone is not used to claim
that a build includes later test or evidence changes. Unit tests generated a
simulation report; only that task-generated change was discarded.

No global browser, WebKit, fixture, telemetry or performance matrix was rerun for this
test-only repair. Existing Vite config-loader/large-chunk warnings remain.
The separately tracked Vite advisory is outside this issue. No merge or
deployment was performed.
