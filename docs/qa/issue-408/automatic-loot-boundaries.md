# Issue #408 increment 3: automatic-loot boundaries

## Result and scope

On 2026-11-14, **18/18 browser cases passed on their first execution in
66.279 seconds**: six cases on each of desktop, portrait and landscape WebKit.
The report contains **zero skipped, unexpected or flaky outcomes**, with one
worker, zero retries and one execution per case. The exact report duration is
66,279.095 ms, including runner overhead.

These are bounded browser acceptance checks for the automatic collection
boundary and preference. They execute real final battle commands, persistence,
exploration movement and preparation UI. They use terminal fixtures and a
controlled delayed callback; they do not establish a complete floor journey or
natural elapsed-time behavior. Final all-unit verification, complete manual and
automatic journeys, and combined #397/#400 verification are recorded separately.

The [compact evidence summary](automatic-loot-boundaries.json) preserves all
18 outcomes and durations, fixture origins, source comparisons, artifact
checksums and supporting build/tooling results. No binary artifacts are added
by this report.

## Source identity and final assembly comparison

The run used the assembled `issue408-session` working tree above
`06447ab6b9c577d578b7684413f32402da38d3f9`, with copied ground-loot domain,
codec, storage, session, rendering and fixture changes still uncommitted.
It was not a test of that commit in isolation. The browser file and its two
registrations were committed afterward as `e97bae43`, without changes after
the successful run, then cherry-picked into the final assembly as
`1b50b4e0459a341153f370512579631f78d09acd`.

An independent comparison against that final assembly checked all **167 files**
in the recorded relevant-input manifest. **166 match byte for byte**. All
automatic collection, lifecycle, preference, save, domain, browser-test,
fixture and config inputs match. No recorded input changed during execution.

The only difference is removal of the old migration explanation paragraph in
`src/ui/dungeon.ts`, inside `if (s.offer)`. That paragraph belongs to the
legacy saved-reward panel. Every new-entry victory in this suite asserts
`offer === null`; none renders that legacy branch. This scoped comparison does
not claim that the complete working trees or built bundles are identical.

| File | Matching tested and assembled SHA-256 |
| --- | --- |
| `src/app/startDungeonApp.ts` | `87dd5c5086ff6a0199e8159cf527ad0218ffd48986d37001678f7f5a05927b63` |
| `src/app/DelayedDungeonStep.ts` | `81e033ff894f96301938142953c02838920894dda6fbaef942b8716da12cc281` |
| `src/app/DungeonSession.ts` | `bafd91699931fce2b7b9d7244f69a454ad504a3300f15c001f1bc959ce133b80` |
| `src/domain/dungeonAutoCollect.ts` | `74542d2d706631d7ff310a1b8d052cf58d0c8249854d8fb0530d0c682734d102` |
| `src/ui/autoCollectLootPreference.ts` | `3ecbace8f9c0f2193ce5dacff4d3f9f2dd54deadeaba0d27da7914fc52dcf90d` |
| `tests/dungeon-loot.spec.ts` | `5898c128814fba2ab95fecc255e2464410d6507beb34d7c656f5aa35765a1067` |

The JSON retains 22 matching hashes covering the above code, ground-loot
domain/envelope/storage, menu/map, fixture/input helpers, configs and build
dependencies. For the one changed file, its tested SHA-256 is
`c9e81abd0d79f81239334e26dea8fb1832347cff1fec41245e2df5bc4b086b50`;
the assembled SHA-256 is
`bf8109a6b7fbfa4e1d9c9a4f8658e7029a06093287248ffe879b7459cfc4521b`.

## Browser coverage

| Scenario | Desktop WebKit | iPhone portrait | iPhone landscape |
| --- | --- | --- | --- |
| Default On: one delayed ordinary step, pickup, enemy tick, saved resume and no repeated callback | Passed | Passed | Passed |
| Accessible Settings, persistent Off/On, unchanged other preferences, origin waiting and no retroactive sweep | Passed | Passed | Passed |
| Fresh manual movement cancels the pending step, including release of its stale callback | Passed | Passed | Passed |
| Accepted preparation cancels the pending step; full inventory refuses movement and collection | Passed | Passed | Passed |
| Visibility interruption and explicit save recovery each cancel without replay | Passed | Passed | Passed |
| Reload before execution preserves the origin and uncollected pile, without surprise movement | Passed | Passed | Passed |

The default-On case compares the accepted result with the ordinary manual
`stepDungeon` result and separately requires revision `+1`, exploration enemy
tick `+1`, movement statistic `+1`, the exact depleted loot record and the exact
new equipment instance. Pickup leaves party HP and equipment assignments
unchanged. The primary saved payload matches the accepted result. Releasing the
same callback again and reloading do not add another move or item.

Settings are reached through the real main-menu dialog. With the preference
absent, the **Auto-collect loot** checkbox is checked and has the help text as
its accessible description. Keyboard Space turns it Off. The value survives
navigation, and the combat-control and privacy preferences remain unchanged.
Off allows a new victory to settle at its origin with loot on the contact cell
and no automatic timer. Returning to Settings, turning it On and continuing
that saved ready state does not sweep the existing pile.

The fresh-input case uses keyboard exploration on desktop and real compass
taps on the touch profiles. The preparation case revives the defeated Mage
through the actual item review and confirmation. Both invalidate the pending
callback. The full-capacity case leaves the party, enemy movement state, loot
and ownership unchanged and shows the inventory-full explanation.

Portrait Settings and collected-loot screenshots were visually inspected.
The checkbox focus treatment and wrapped help text were readable; the map and
party layout remained intact. These are emulated device checks, not a claim of
physical-device verification.

## Fixture and timing boundaries

`dungeonGroundVictoryBoundary` stages a legal adjacent approach, enters combat
through the actual spatial command and reaches its terminal boundary using
legal pure-domain battle commands. The browser loads that ongoing save and
enacts the final command through the battle HUD. This proves the finishing
transition and subsequent interactions, not preceding browser traversal.

- Seed **28**, slot **0**, uses origin **108** and contact **128**. Its one
  seeded item is an **Aiming Charm**. This is the ordinary success, settings,
  movement, interruption and reload witness.
- Seed **13**, slot **0**, uses origin **265** and contact **285**. Its one
  seeded item is a **Revive Kit**. Starting stock of **1** isolates preparation;
  stock of **9**, the current bound, isolates a full stack. This inventory is an
  explicitly structural fixture, not a claim that it was earned in prior play.
- Statistics start with `since-upgrade` coverage. Comparisons normalize only
  elapsed `activeMs`, because focus, recovery and navigation can checkpoint
  playtime. Revision, movement counts, RNG, party, loot and ownership remain
  exact.

The init script holds only `setTimeout` callbacks whose requested delay is
**400 ms** and which are scheduled while the dungeon map is visible. Other
timers, battle animations, accepted commands, saves and map movement run
normally. The test releases the held callback explicitly, waits for the same
exclusive primary-save queue and then two animation frames. Cancelled
callbacks remain available to release, so the checks exercise invalidation
even if an obsolete callback reaches the application after `clearTimeout`.

This hook proves that movement is pending at the intended boundary and that
one valid release produces one ordinary step. **It does not measure a natural
400 ms delay** or substitute for the cutscene return/timing checks. Visibility
is changed with a synthetic `document.hidden` property and `visibilitychange`
event. It proves the handler's cancellation behavior, not native tab focus,
background scheduling or BFCache restoration.

## Environment, commands and supporting checks

The run began at `2026-11-14T14:11:56.617Z` using Node **24.22.1**, Playwright
**1.64.1**, WebKit **27.2** (revision **2370**) and Linux x86_64. It used a
production preview at `/` on port **4183**, separate from the concurrent
checkout's preview. Browser execution was serialized with the other agents'
browser work.

Profiles were Desktop Safari at **1280 × 720**, iPhone 13 portrait at
**390 × 664**, and iPhone 13 landscape at **844 × 390**. The extracted WebKit
runtime used `PLAYWRIGHT_BROWSERS_PATH` and `LD_LIBRARY_PATH`;
`PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` bypassed the host check that
cannot see those supplied libraries. The real WebKit browser launched and
completed all reported cases.

The equivalent repository selection is:

```sh
npx --no-install playwright test -c playwright.exploration.config.ts \
  tests/dungeon-loot.spec.ts --reporter=line,json
```

The actual invocation used the scratch wrapper
`/workspace/scratch/f77bb8a7baf3/issue408-auto-browser.config.ts`. It imports the
repository exploration config and overrides only absolute test/output paths,
preview working directory, base URL and port. Its checksum is in the JSON.
The project definitions, one-worker policy, zero retries and 30-second test
timeout were unchanged.

Supporting checks passed:

- `npm run build`, including **226/226 content tests in 8 files**, both type
  scopes and the production bundle.
- `npm run typecheck` after adding the browser file, covering application/tests
  and the DOM-free domain scope.
- `npm run test:verification-batches`: **31/31 checks**, including the exact
  nine-batch partition of canonical discovery.
- Discovery of **18 cases** in the new file. It is registered exactly once per
  Chromium profile in `scripts/verification-batches.json` and included in the
  exploration WebKit config.

**No local Chromium execution is claimed.** Chromium registration and
discovery are selection/tooling evidence; the browser results above are
WebKit only. The supporting content checks are not a claim that this bounded
invocation ran the complete unit suite.

Original logs, the full browser report, source manifest and screenshots were
retained under `/workspace/scratch/f77bb8a7baf3/issue408-auto-browser-*`.
The JSON records the report, manifest, build, typecheck, batch-tooling and
wrapper-config SHA-256 values so later aggregate evidence can identify these
exact inputs and outputs.
