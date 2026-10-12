# PR #95 review repair: public asset bases and integration

Date: 2026-10-13 (Asia/Jerusalem). Review: [5496115117](https://github.com/luminari-gurus/tactics-guru-v2/pull/95#pullrequestreview-5496115117). Issue: [#92](https://github.com/luminari-gurus/tactics-guru-v2/issues/92).

## Finding and repair

Confirmed on the rebased pre-fix runtime: all three desktop production-prefix entry checks fail with controlled image errors (`asset:terrain_grass` for battle/content-smoke; `terrain-grass` for proof). The prefix is `/prototype/`. The same tests are retained as regressions.

Commit `4ca9ca5` resolves URLs at the existing image loaders, HUD/proof portrait assignments, battle/proof audio consumers and content fixture request. Canonical registries, domain, persistence, terrain metadata, public media and lockfile are unchanged from the rebased baseline `c959855`. Existing canonical fixture/hash/save/continuation tests remain the identity proof; focused browsers compare the settled seeded state against the existing session's actual enemy decisions at each base.

The rebase onto main `a8e115aa07aea4831419ae19b4b1db88c368fbe0` preserves all five original PR commits. Its only range-diff change moves guarded restart handling into `src/app/startBattleApp.ts`, retaining main's independent map route and import-failure handling. There is no release tag, extra stack or squash.

## Verification

Environment: Windows, Edge `155.0.4283.45`, one Playwright worker, unchanged desktop and emulated Pixel 7 portrait/landscape profiles. Browser plugin unavailable; used the repository's Playwright suite. URLs are loopback `http://127.0.0.1:4173/` and `/prototype/`, never a hosted deployment.

- `npm run test:unit`: 428/428 passed.
- `npm run validate:content`: 77/77 passed.
- `npm run typecheck`: both configurations passed.
- `npm run build` and `npm run build -- --base=/prototype/`: passed.
- `npm test`: complete root production suite, 309/309 passed in 15.5 minutes, zero failed/flaky/skipped cases.
- Focused matrix: prefixed production preview 39/39, prefixed development 39/39, root development 39/39 passed. Root production's 39 focused cases are included in the full 309-case run. Total additional cases: 117.
- `openspec validate issue-73-battle-resume --strict` and `openspec validate issue-92-public-asset-base --strict`: passed.
- `git diff --check`: passed.

Screenshots inspected: prefixed production battle after Continue in all three profiles and proof in portrait. Board textures, sprites, portraits and meaningful controls render; the landscape panel retains its existing scrolling layout. Success cases collect page/console errors and require an empty result; intentionally faulted media cases require controlled status and no uncaught page error. Local logs retain the failing reproduction, initial assertion correction and final runs under ignored `tmp/`; inspected prefix screenshots are retained outside the checkout at `C:/Users/apexw/AppData/Local/Temp/tactics-guru-pr95-evidence/`.

Focused command: `npm test -- tests/public-asset-base.spec.ts` with `PLAYWRIGHT_BASE_PATH` set to `/` or `/prototype/` and `PLAYWRIGHT_SERVER_MODE` set to `dev` or `preview`. Preview uses a matching `npm run build -- --base=<base>` first. The full suite uses a root build and both variables unset. This host uses the lockfile-installed CLIs through Node and an ignored npm wrapper because npm is absent from PATH; dependency versions are unchanged.

The focused checks cover direct entry and refresh of battle/proof/content-smoke, Continue after reload, requested image/audio paths, decoded DOM portraits, proof audio and Web Audio/HTML5 committed-move playback, malformed fixture validation, map routing, required image missing/corrupt/stalled failures and optional audio missing/corrupt/stalled failures. The first post-fix run had 36 passes and three failures in the new battle test: it compared a live enemy turn with the pre-turn seed. The assertion now waits for the player turn and compares the existing session's enemy decisions; this was a test correction, not a runtime change.

## Limits

No physical Android/iOS certification, audible listening claim or hosted-prefix validation. No existing hosted prefix was supplied and no deployment target was created. Phaser's existing chunk-size warning, development renderer `setMask` warning and the environment's color-variable warning remain; the renderer code is unchanged by this repair. Remote CI is not a gate for this request; `.github` contains no Actions workflows to reproduce. OpenSpec remains unarchived while the PR is unmerged. #57/#58/#74 remain open.
