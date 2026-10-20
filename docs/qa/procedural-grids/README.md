# Procedural battle grid implementation

Follow-up to planning PR #147, change `desert-procedural-battle-grids`.

The first two run encounters resolve version-1 desert grids; the last resolves the
unchanged authored ruined approach. The independent authored battle remains
available. New enemy types, balancing changes and the overworld generator are
outside this change.

## Evidence

- `corpus.json`: seeds 0–9,999 plus both upper uint32 edges. Every candidate goes
  through common admission, all seven survivor subsets and desert constraints.
  All 10,002 admitted maps are distinct; normal fallback count is zero. Forced
  rejection exercises all four attempts and the validated flat fallback separately.
  The latest corpus median is 4.95 ms; p95 is 9.02 ms on this host. These are local
  pure-resolution timings, not device frame measurements.
- `simulations.json`: two independent test player policies, three representative
  seeds, full and one-HP parties. Accepted commands reproduce exact state/events.
  First-encounter aggressive policies win these samples; waiting and wounded
  samples lose legally. A separate late-battle fixture proves a one-HP Mage can
  complete a legal victory. Win rate is not an admission criterion.
- Golden descriptor fixtures identify generator 1/profile `desert-v1` and full-map
  hashes. The final authored grid passes common admission without any cell or spawn
  repair. Its existing authored snapshot remains the identity regression.
- Generated production picking, camera changes, accepted movement and exact reload
  passed desktop, Pixel 7 portrait and landscape emulation. Authored final entry
  preserves carried HP and equipment. Player/enemy presentation reloads preserve
  commands/RNG without past events; independent battle recovery remains isolated.
- `performance-dirty.json` retains the first diagnostic capture. The existing
  collector rejected its dirty build identity. It is not acceptance evidence.
  `performance-pre-cache.json` and its evaluation retain an intermediate clean
  capture at 438fc16: all 18 samples passed. The final asset pipeline additionally
  versions the new images and preloads them only for the run.
- `browser/final-browser.txt`: 30/30 final production asset, camera/highlight,
  movement/resume, authored final, cache stability and controlled-error cases.
  `browser/fixtures.txt`: 24/24 authored, invalid-source/asset, forced fallback and
  representative-layout cases. Functional captures use runtime 0a56090; their
  dirty build marker reflects staged QA receipts, not uncommitted runtime edits.
- `browser/unit.txt`: 759/759 unit tests. Header tests verify byte-identical
  content-hashed images and immutable rules at both `/` and `/tactics/`.
- `browser/broad-browser.txt`: 125/126 broad run/persistence/content cases passed.
  One desktop reload received HTTP 404 while this task rebuilt `dist` under the
  running preview. `browser/rebuild-race-404.md` retains the failure. The same
  accepted-player case then passed all three profiles in the final 30-case run,
  with builds and browser runs serialized.
- Static texture receipts cover run seeds 13–16: each restart kept five cached
  shapes, 3,299,328 raw RGBA bytes and 595 objects. Representative seed 0/1/2 and
  forced-fallback captures preserve readable open sand and distinct rock surfaces.
  The quality captures were visually reviewed.

## Reproduction

```sh
npm run test:unit
npm run build
BATTLEFIELD_CORPUS=full npx vitest run tests/unit/battlefieldCorpus.test.ts
openspec validate desert-procedural-battle-grids --strict
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npx playwright test tests/procedural-grids.spec.ts tests/run-progression.spec.ts tests/battle-persistence.spec.ts tests/content-loading.spec.ts
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npx playwright test -c playwright.encounters.config.ts
```

Browser/device coverage uses Playwright emulation. No physical hardware is claimed.
The collector's established frame/loading/transfer budgets remain unchanged.
Static-shape receipts report raw width × height × 4 RGBA estimates, not measured GPU
allocation. Generated terrain uses only elevation 0/1; cache keys do not include
seeds, map IDs or material identities.

## Compatibility

Run envelope format 2 requires a full battlefield descriptor. Rules version 2
identifies detour pursuit. Unsupported versions and changed identities preserve
original bytes through existing recovery/export controls. No legacy migration,
map embedding or generator-version retention was added. See
`docs/battle-save-format.md`, `docs/first-battle-content.md` and
`docs/grid-movement.md` for the contracts and rollback procedure.


## Final performance certification

`performance.json` and `performance-evaluation.json` certify clean runtime
`6d925b9595888d117ebe4be57df7996a41e0009d`, installed Chrome 155 on the recorded
Apple M5 Pro host. The collector ran alone after functional testing. All 18
samples (three repetitions × cold/warm × desktop/portrait/landscape) passed with
zero capture failures, warnings or budget violations. Maximum cold usable time
was 729.4 ms; warm 656.8 ms. Maximum cold compressed code was 394,545 bytes and
cold assets 1,072,666 bytes. The existing frame gates also passed every sample.

Fresh-run measurements use run seed 13 and encounter index 0. The corresponding
versioned descriptor/layout seed is the seed-13 entry in each static-texture
receipt. Those receipts also retain the viewport and the next three restart
seeds; corpus seeds and fixture screenshot names refer to encounter seeds.
All device profiles are emulation. No deployed or physical-device performance
claim is made. The only post-certification changes are QA records and checklist
completion; runtime source hashes are recorded in `manifest.json`.
