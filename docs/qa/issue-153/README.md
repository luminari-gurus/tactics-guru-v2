# Issue 153 — focused summary

Portrait main menu, `/battle` routing, read-only save discovery, and Main menu
return links. Source art remains in `docs/art/issue-153/source/`; runtime art is
`public/menu/`.

Run logs, Playwright JSON, and screenshots are workflow artifacts, not tree
files. Start a full capture by dispatching `issue-200-baseline.yml` with
`extra_job=full-verify`, or by bumping `.github/full-verify-request`. Retain the
`full-verify-<run>-<attempt>` artifact for 30 days.

## Status

- Focused Chromium/WebKit menu coverage lives in `tests/main-menu.spec.ts`.
- Run, dungeon, and standalone battle use explicit `hasUnsavedProgress` owner
  state so rejected commands cannot clear a leave warning.
- Passing full capture [41239917772](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41239917772)
  (`c39e10b`) completed every `verify:full` stage. Artifact
  `full-verify-41239917772-1`. Device evidence is Playwright/WebKit emulation.
  `openspec validate issue-153-portrait-main-menu --strict` and `git diff --check`
  pass on this accounting commit. Draft PR #256. No merge claim.

  | Stage | Result | Notes |
  | --- | --- | --- |
  | tooling | passed | 0.4s |
  | units | passed | 1086 tests, 52s |
  | typecheck | passed | both scopes |
  | build-integration | passed | |
  | build-root | passed | |
  | chromium | passed | 820 expected / 0 unexpected / 6 skipped (~118 min) |
  | fixtures | passed | 87 expected |
  | placement-dev | passed | 3 expected |
  | webkit-acceptance | passed | 92 expected |
  | webkit-exploration | passed | 105 expected / 0 unexpected, including landscape-webkit stairs/`cell` |
  | health-bars | passed | 25 expected |
  | telemetry-production | passed | 36 expected |
  | telemetry-development | passed | 36 expected |
  | assets-root-dev | passed | 75 expected / 3 skipped |
  | performance | passed | 18 proof cold/warm samples |
  | build-prefix | passed | `--base=/prototype/` |
  | assets-prefix-preview | passed | 78 expected, ~3.7 min |
  | assets-prefix-dev | passed | 75 expected / 3 skipped |
  | restore-root | passed | |

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
