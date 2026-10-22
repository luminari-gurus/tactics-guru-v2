# Dungeon diamond compass (#195)

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
