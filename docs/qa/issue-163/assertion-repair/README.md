# Battle assertion repair

The authored-entry test compared `{heroId,hp}` with full progression records;
the Guarded test expected the short label superseded by the penalty/expiry text.
Both fail on literal main `e489a3077b5571874ad7352e0511035403a30813` under matching
Windows x64 Node 24.19.0, Playwright 1.63.0 and Chromium 153.0.8010.12 conditions.
The baseline report retains both failures; no game behavior changes.

The repaired HP assertion compares equivalent projections and independently checks
the complete carried party, retaining level/XP/max-HP/learned metadata coverage.
Actor and inspection assert the full approved Guarded explanation; existing AC,
spent-action and unchanged-state checks remain.

Tested commit: `c4eed28` on `branch/issue-163-battle-assertions`, based on the
standalone prerequisite `bad8f19`. This is an isolated test repair under the
verification policy. Focused discovery selects exactly 9 cases; no selection,
worker, retry, deadline, fixture or production-rule changes are made.

Commands:

- Literal base: `node node_modules/playwright/cli.js test tests/procedural-grids.spec.ts tests/battle-animations.spec.ts --project=desktop -g 'authored final entry|ability:guarded_strike: spent action' --reporter=json`:
  2 failed with the same assertions as feature qualification.
- Repair: same files with `-g 'authored final entry|spent action and effective Guarded' --list`,
  then execution on the default desktop/Pixel portrait/Pixel landscape matrix:
  **9 passed**, no skips, retries or flakiness (20.9 seconds).
- `npm run typecheck`: both scopes passed.
- `npm run build:bundle`: passed; unchanged content inputs reuse the preceding
  literal-base content/build checks and prerequisite coverage. Existing Vite
  configuration/chunk-size warnings remain.
- `git diff --check`: passed.

Compressed reports, logs, original report hashes and the tested source inventory
are retained here. No full matrix is repeated for these assertion-only changes.
