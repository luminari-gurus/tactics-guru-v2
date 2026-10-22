# Dungeon diamond compass (#195)

The original implementation receipt below describes commit `2c6368a`. The
[review follow-up](#review-follow-up-preserve-keyboard-focus) records the focus
repair and its fresh validation separately.

Issue #195 is assigned to `dubstylee`. GitHub's `blocked_by` and `blocking`
dependency lists were both empty on 2026-10-22; the issue has no comments or
additional prerequisite links. The selected compact diamond design is recorded
in the issue itself.

## Behavior and coverage

Four 46px square native buttons rotate 45 degrees, with counter-rotated upright
letters and full accessible direction names. A three-by-three grid leaves space
between the actual diamond hit areas and their focus outlines. The center is
decorative, hidden from accessibility APIs and ignores pointer input. Available,
pressed, focused and disabled treatments use the surrounding stone/olive palette.

All four buttons call the existing `DungeonMap.step` handler. Walls, map edges and
non-ready phases disable buttons; domain validation still rejects illegal moves
from other inputs. Modal, hidden-document and battle input guards remain in place.
No domain, persistence, map generation, shared battle HUD or dependency changes.

The new case in `tests/dungeon-exploration.spec.ts` checks all four actions and
reverse moves, revision changes, upright labels, hit testing, compass positions,
keyboard focus/Enter/Space, native touch on mobile profiles, pressed styling,
wall-disabled buttons and reward-phase locks. It uses validated structural
position/reward fixtures, not a claim of a full legal journey. The existing real
traversal case separately checks legal movement into battle, a combat command,
modal/keyboard locks and exact reload. Existing hidden-input/art failure and
square-cell/resize cases also ran. Narrow 320px layout is included.

Safari/WebKit uses Option-Tab (`Alt+Tab`) to include buttons with the browser's
default keyboard-navigation setting; Chromium uses Tab. Both assert actual
focus-visible styling. Device coverage is browser emulation, not physical hardware.

## Validation

Run on 2026-10-22, macOS arm64, Node 22.21.1, Playwright 1.63.0,
Chromium 153.0.8010.12 (revision 1243), WebKit 26.6 (revision 2359).
Browser runs used one worker, zero retries, the ordinary unconfigured root
production build, preview on `http://127.0.0.1:4173/`, and no asset/fixture overrides.
Dependencies were installed with `npm ci` (zero audit vulnerabilities).

- `npm run build`: passed, including 221 content tests and both TypeScript scopes.
- `npm run test:unit -- tests/unit/exploration.test.ts tests/unit/dungeon.test.ts tests/unit/dungeonBattle.test.ts --maxWorkers=1 --reporter=json --outputFile=tmp/issue-195/units.json`: 70/70 passed.
- `npx --no-install playwright test tests/dungeon-exploration.spec.ts -g 'diamond compass|real traversal|map input stays inert|exploration cells stay square' --output=tmp/issue-195/chromium-regression --reporter=list`: 12/12 passed (desktop, Pixel 7 portrait, Pixel 7 landscape).
- The same file/filter with `-c playwright.exploration.config.ts --output=tmp/issue-195/webkit`: 9/12 passed; only the three new compass cases failed because plain Tab skipped buttons under Safari's default setting.
- After changing only that new case's WebKit shortcut, `npx --no-install playwright test -c playwright.exploration.config.ts tests/dungeon-exploration.spec.ts -g 'diamond compass' --output=tmp/issue-195/webkit-final --reporter=list`: 3/3 passed (desktop Safari, iPhone 13 portrait/landscape).
- Final `npm run typecheck` and `git diff --check`: passed.

All 24 selected browser cases have passing evidence. The nine unchanged WebKit
regression cases and Chromium results are reused: the final test edit only chooses
Option-Tab for WebKit in the new compass case, leaving Chromium and the other
three cases unchanged. App/build inputs were unchanged throughout browser runs.
Full regression, telemetry, standalone/run and performance suites were not selected
for this dungeon-only control change under `docs/verification-policy.md`.

Retained initial failures: the first unit attempt passed 69/70 but the unchanged
250-floor cold-history case exceeded its 60-second timeout during an unusually
long elapsed run (1031 seconds overall). Its isolated rerun passed in 4.71 seconds,
followed by the clean 70/70 run above. No timeout or domain code was changed.
Sandbox networking initially blocked installation; sandbox port binding initially
blocked preview. Both completed with approved external execution. The first
WebKit download connection reset and Playwright's alternate download succeeded.
Vite emitted its existing extensionless-import and large-chunk warnings.

## Source and evidence identity

Build base: `4f6614edee382def5f284a17e7f5872aafbbb02e`, dirty with this PR's
two runtime files and browser case. The bundle embeds that base/dirty diagnostic
identity. The final commit adds this receipt and screenshots; relevant production
sources, assets, dependency lockfile, browser configs and helpers are unchanged
from the tested build. The only post-build code edit was the WebKit-specific test
shortcut above, checked by the final typecheck and three WebKit acceptance cases.

SHA-256 of tested inputs and dungeon build outputs:

```text
caa6bf5840eac192fdc2ae10cd6cafcb2b1b51bc060f8433a9b2b66ca839b2b2  src/ui/dungeonMap.ts
eca427bb852bcc1b0160c40510dd10208d4679d27befe2995789b7808bc3d80a  src/ui/dungeon.css
bf5014fc8138fe43385e7bf59d4fb05233c4ba4a8fed45542296bf59df6968bd  tests/dungeon-exploration.spec.ts (final)
577f6a4c329611f51a4631f72ef164c909e152275d9ec99de022b50b713e0a9d  package-lock.json
825129a2bab01743f2e8ce1f780eea65334f861e541302d32e03e23d23ed52b9  dist/assets/startDungeonApp-DxBMwDWZ.js
dff4daa8908f3ec8bb5ba2ebe2f45914f6a338e6a4cb4c78162412ebfe05797f  dist/assets/startDungeonApp-Bs6ZGJ6B.css
```

Committed screenshots, captured from the tested production preview:

- [Desktop focus](desktop-focus.png), [pressed](desktop-pressed.png), [unavailable directions](desktop-unavailable.png).
- [Chromium mobile portrait](mobile-portrait.png) and [landscape](mobile-landscape.png).
- [WebKit iPhone portrait](iphone-portrait.png) and [landscape](iphone-landscape.png).

Additional local artifacts remain under ignored `tmp/issue-195/`, including the
unit JSON report, initial WebKit failure contexts and traversal battle receipts.

## Review follow-up: preserve keyboard focus

Addressed [review comment 4352061929](https://github.com/luminari-gurus/tactics-guru-v2/pull/226#discussion_r4352061929).
When keyboard movement makes the activated compass button unavailable, the outer
`renderDungeon` renderer now restores focus to the map. It still restores the
previous control when that control remains available. Native disabled semantics,
movement validation and `preventScroll` remain intact. The outer renderer owns
this restoration because it detaches the map before `DungeonMap.draw` executes.

The new `compass keeps keyboard focus when movement disables the activated
direction` case loads the review's validated seed-1 position-27 fixture. For both
Enter and Space it moves West to 26, verifies West is disabled and the map has
visible keyboard focus, rejects ArrowLeft into the wall without changing state,
and accepts ArrowRight back to 27 while retaining focus and incrementing the
revision exactly once per legal move.

The new case first failed on the original production build at map-focus
restoration. An initial inner-map-only candidate still failed on all three
Chromium profiles (six other selected cases passed). That candidate was reverted;
the final change is confined to the outer renderer. Original failure contexts
and the intermediate JSON report remain under `tmp/issue-195/review-before/`,
`review-chromium/` and `review-chromium.json`.

Fresh validation on 2026-10-22 uses the same runtime/browser versions, ordinary
root preview, one worker and zero retries recorded above:

- `npm run build`: passed, including 221 content tests and both TypeScript scopes; log `tmp/issue-195/review-build-final.log`.
- `PLAYWRIGHT_JSON_OUTPUT_NAME=tmp/issue-195/review-chromium-final.json npx --no-install playwright test tests/dungeon-exploration.spec.ts -g 'compass|real traversal' --output=tmp/issue-195/review-chromium-final --reporter=list,json`: 9/9 passed in 20.4 seconds, desktop and Pixel 7 portrait/landscape.
- `PLAYWRIGHT_JSON_OUTPUT_NAME=tmp/issue-195/review-webkit-final.json npx --no-install playwright test -c playwright.exploration.config.ts tests/dungeon-exploration.spec.ts -g 'compass|real traversal' --output=tmp/issue-195/review-webkit-final --reporter=list,json`: 9/9 passed in 20.2 seconds, desktop Safari and iPhone 13 portrait/landscape.

The 18 browser cases cover the new Enter/Space focus transition, all existing
compass interactions including native touch, and legal traversal/battle/reload
plus modal locks. Unchanged domain code, helpers, lockfile and unit files permit
reuse of the original 70/70 domain-unit evidence. Hidden-input, art and geometry
paths are unchanged; their original results remain historical evidence, not a
claim of a new full regression. No standalone/run/shared HUD consumers changed.

Tested build base: `2c6368a8f5ca109e452f99ddbe0ee501aa24b8dc`, dirty with the
outer-renderer repair and new browser case. After these checks, only QA prose and
copied screenshots were added; final runtime/test inputs match these SHA-256s:

```text
8c2b98b4a6b50be40f0d3b38f7bc85c5a162f8c7e09df6bd7f0e519678b39bc0  src/ui/dungeon.ts
b289545f87f99da56faa5ef1944a35fd5d837136adc888e6bbf897b1de133143  tests/dungeon-exploration.spec.ts
b30de05274d2c316c81b64b317e9b186c7a0db2a11d61c07fefa9e212f942e48  dist/assets/startDungeonApp-CMqkq6UP.js
927795b9223fc4fcd933b90cf6d2e726c4b9c5b8fa47553592cef936cc282299  tmp/issue-195/review-chromium-final.json
7eee44a02faf8d227840c5a08a6d9cace66ad823dd0d742b015e1f687c61f7bc  tmp/issue-195/review-webkit-final.json
```

Focus-fallback screenshots: [desktop](focus-fallback-desktop.png),
[mobile portrait](focus-fallback-portrait.png),
[iPhone landscape](focus-fallback-iphone-landscape.png). Remaining screenshots,
JSON reports and legal-traversal receipts remain in the local output folders.
