# Nov 5 QA controls and level-up acceptance

This records the original implementation at `125c239`. The subsequent caption
review correction and its current-source acceptance are recorded in
[caption-fix/README.md](caption-fix/README.md).

Fixes #326, #325 and #319. Runtime and test inputs are identified in
[receipt.json](receipt.json); compressed logs retain the results below.

## Behavior

- #326: HUD rendering now skips unchanged inputs during board hover. The native
  target picker and button contents remain stable while moving to Confirm.
  Control-style application invalidates the cache, including same-style refresh.
- #325: an inspected move destination outside the legal target list remains
  selected in a disabled option with its authoritative rejection (for example,
  `Unavailable: Unreachable`). Confirm remains disabled; legal reselection works.
- #319: learned ability IDs are formatted as names such as `Second Wind`.
  The common feedback function serves dungeon and run progression.

## Validation

All commands use Node 22.21.1, Playwright 1.64.1 on macOS arm64. Browser runs
are sequential, one worker, zero retries, ordinary root production preview.
Mobile results use native touch-device emulation, not physical devices.

| Check | Result | Log |
| --- | --- | --- |
| Literal-base production build with new regression assertions | 3 expected failures: 22 redundant HUD child-list mutations, blank rejected target, raw ability ID | [base](base-regressions.log.gz) |
| Full units, `npm run test:unit -- --maxWorkers=2` | 67 files / 1,186 tests passed | [units](units.log.gz) |
| Final `npm run build` | 226 content checks, both TypeScript scopes and bundle passed | [build](build.log.gz) |
| Chromium focused controls/progression + rail/radial switching | 21 passed, desktop / Pixel 7 portrait / landscape | [Chromium](final-chromium.log.gz) |
| `npm test` core journeys | 7 passed, standalone legal victory/replay, run terminal journey/reload, dungeon action/resume, startup, menu and touch/modal/lifecycle | [core](final-core.log.gz) |
| WebKit dungeon action/resume and level-up/reload | 6 passed, desktop / iPhone portrait / landscape | [WebKit](final-webkit.log.gz) |
| New QA control cases in iPhone WebKit portrait / landscape | 4 passed | [WebKit controls](final-webkit-controls.log.gz) |

Focused Chromium command:

```sh
npx --no-install playwright test -c playwright.regression.config.ts tests/battle-loop.spec.ts tests/dungeon.spec.ts tests/battle-radial.spec.ts --grep 'QA:|hero progression commits|undo and compound plan|radial End turn is docked|radial invalid reselection clears|radial switching to rail preserves'
```

WebKit dungeon command:

```sh
npx --no-install playwright test -c playwright.exploration.config.ts tests/dungeon.spec.ts -g 'hero progression commits|read-only entry, keyboard new dungeon'
```

For direct WebKit controls, copy [the isolated config](qa-webkit.config.ts.txt)
to `tmp/qa-webkit.config.ts` and run
`npx --no-install playwright test -c tmp/qa-webkit.config.ts`.
It only selects the two new QA cases under both native WebKit touch profiles.
It changes no checked-in shared harness or routine suite membership.

The full-unit evidence predates only the final one-line `applySkin` cache
invalidation. Unit tests do not instantiate the DOM HUD; their tested progression,
domain/session, storage and exported HUD formatter inputs are unchanged. Final
build/type/content and all 38 final browser cases ran after that correction.
No source or test edits followed the final browser build; only this receipt did.

## Retained limitations

The initial browser attempt could not launch because Chromium revision 1248 was
missing. Matching Chromium and WebKit revisions were installed before execution.
Two sandboxed unit attempts were interrupted: the ordinary run stalled, and a
bounded-worker verbose run exposed localhost-server fixture timeouts. Their logs
are retained. The complete localhost-capable run then passed 1,186/1,186 without
changing any test or timeout. These failed/incomplete attempts are not passing runs.

The swallowed click reported by QA was intermittent; the base witness reproduces
unnecessary native-control rebuilding, not a deterministic dropped click. Final
cases assert one-click Confirm, Wait and Close log, and no hover-only rebuilding.
The production build retains its existing large engine-chunk warning.
This is focused PR acceptance, not the full release/performance matrix.
