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
- Prior full capture [41105273512](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41105273512)
  (`6559b9c`) failed: Chromium 798 expected / 4 unexpected (all
  `mobile-landscape`), then the 210-minute step budget ended while
  `assets-prefix-preview` was still progressing.
- Recapture [41202559174](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41202559174)
  (`60ec6b6`) failed before `verify:full`: `verify:batches discover` saw empty
  `SERIAL_MODE` on the request-file push. The full-verify job now pins
  `SERIAL_MODE=capture`. Draft PR #256. No merge claim.
