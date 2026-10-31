# Issue 153 — focused summary

Portrait main menu, `/battle` routing, read-only save discovery, and Main menu
return links. Source art remains in `docs/art/issue-153/source/`; runtime art is
`public/menu/`.

Run logs, Playwright JSON, and screenshots are workflow artifacts, not tree
files. Dispatch `issue-200-baseline.yml` with `extra_job=full-verify` on the PR
head and retain the `full-verify-<run>-<attempt>` artifact for 30 days.

## Status

- Focused Chromium/WebKit menu coverage lives in `tests/main-menu.spec.ts`.
- Run, dungeon, and standalone battle use explicit `hasUnsavedProgress` owner
  state so rejected commands cannot clear a leave warning.
- Prior full capture [41105273512](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41105273512)
  (`6559b9c`) failed: Chromium 798 expected / 4 unexpected (all
  `mobile-landscape`), then the 210-minute step budget ended while
  `assets-prefix-preview` was still progressing. That run does not accept this
  branch. Draft PR #256. No merge claim.
