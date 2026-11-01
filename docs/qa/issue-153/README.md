# Issue 153 — focused summary

Portrait main menu, `/battle` routing, read-only save discovery, and Main menu
return links. Source art remains in `docs/art/issue-153/source/`; runtime art is
`public/menu/`.

Run logs, Playwright JSON, and screenshots are workflow artifacts, not tree
files. Start a full capture by dispatching `issue-200-baseline.yml` with
`extra_job=full-verify`, or by bumping `.github/full-verify-request`. Retain the
`full-verify-<run>-<attempt>` artifact for 30 days.

## Status

- Rebased onto main after [PR #255](https://github.com/luminari-gurus/tactics-guru-v2/pull/255)
  (`a8b87c1`). Planning/undo HUD stays; standalone battle stays at `/battle`.
  #255 tests that still opened `/` now open `./battle`.
- Focused Chromium/WebKit menu coverage lives in `tests/main-menu.spec.ts`.
- Run, dungeon, and standalone battle use explicit `hasUnsavedProgress` owner
  state so rejected commands cannot clear a leave warning.
- Post-rebase capture [41303583877](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41303583877)
  (`68004c4`) completed every `verify:full` stage and **failed**. Artifact
  `full-verify-41303583877-1`. Device evidence is Playwright/WebKit emulation.
  Draft PR #256. No merge claim.

  | Stage | Result | Notes |
  | --- | --- | --- |
  | tooling | passed | 0.4s |
  | units | passed | 1103 tests, 49s |
  | typecheck | passed | both scopes |
  | build-integration | passed | |
  | build-root | passed | |
  | chromium | passed | 829 expected / 0 unexpected / 6 skipped (~78 min) |
  | fixtures | passed | 87 expected |
  | placement-dev | passed | 3 expected |
  | webkit-acceptance | passed | 92 expected |
  | webkit-exploration | **failed** | 98 passed, 1 timeout: `portrait-webkit` stairs / `compass` waiting 15s for heading `Dungeon floors` after reload while Phaser status was still Loading. Landscape-webkit stairs arrows/wasd/compass/`cell` all passed in this run. |
  | health-bars | passed | 25 expected |
  | telemetry-production | passed | 36 expected |
  | telemetry-development | passed | 36 expected |
  | assets-root-dev | passed | 75 expected / 3 skipped |
  | performance | passed | |
  | build-prefix | passed | `--base=/prototype/` |
  | assets-prefix-preview | passed | 78 expected, ~3.7 min |
  | assets-prefix-dev | passed | 75 expected / 3 skipped |
  | restore-root | passed | |

- Passing full capture [41239917772](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41239917772)
  (`c39e10b`) completed every `verify:full` stage **before** the #255 rebase.
  Chromium 820/0; `webkit-exploration` 105/0. It does not qualify this head.

- Prior full capture [41105273512](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41105273512)
  (`6559b9c`) failed: Chromium 798 expected / 4 unexpected (all
  `mobile-landscape`), then the 210-minute step budget ended while
  `assets-prefix-preview` was still progressing.
- Recapture [41202559174](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41202559174)
  (`60ec6b6`) failed before `verify:full`: `verify:batches discover` saw empty
  `SERIAL_MODE` on the request-file push. The full-verify job now pins
  `SERIAL_MODE=capture`.
- Recapture [41212901716](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41212901716)
  (`2d5f3a0`) ran `verify:full` to completion and **failed**. Chromium
  820 expected / 0 unexpected; `assets-prefix-preview` and `assets-prefix-dev`
  passed. The only failed stage is `webkit-exploration`: 104 passed, 1 timed
  out (`landscape-webkit` dungeon stairs / `cell` waiting on Continue after
  reload, Phaser still `Loading`). Same case passed desktop and portrait
  WebKit in that run. Not a routing/base-prefix regression. The stairs wait
  in `continueSavedDungeon` is the repair that 41239917772 recaptured.
