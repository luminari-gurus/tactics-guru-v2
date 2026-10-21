# Issue #159 biome encounter acceptance

Date: 2026-10-21, Asia/Jerusalem. Status: focused matrices complete; full-suite failures are being repaired and a long-history cache regression has been reproduced/fixed. Full-suite acceptance is pending. This report distinguishes executable/domain proof, structural UI fixtures and a complete legal browser journey.

## Implementation and source

- [#191](https://github.com/luminari-gurus/tactics-guru-v2/pull/191): bounded catalog, admission, independent seeded selection and baseline scaling.
- [#192](https://github.com/luminari-gurus/tactics-guru-v2/pull/192): durable descriptors, projected catalog, formats 1/2 normalization and format 3.
- Presentation runtime tested at `ac7fc9d`; `f8d0d23` improves receipt metadata without changing runtime. Final publication and complete validation are tracked in [plan.md](../ongoing-projects/plan.md).
- Tests run with WSL Node 24.15.0 and repo Playwright, including desktop and mobile browser/device emulation. No physical-device test is claimed. Vite's Phaser chunk-size notice remains a build warning, not a raised transfer limit.

## Completed proof

The persistence checkpoint passed 878 unit tests, 221 content checks, both TypeScript scopes, production build and strict OpenSpec. Catalog tests admit every enabled pairing, all seven nonempty survivor subsets and generated fallback; invalid definitions/spawns/references reject. The dungeon-only stone step at (4,2) connects Forest Ruins' nine otherwise unreachable raised tiles while preserving existing-mode maps.

The presentation checkpoint subsequently passed **879/879** full unit tests, the same 221 content checks, both TypeScript scopes and a fresh production build at `1fa532a` (QA worktree dirtiness disclosed). No runtime change followed the Chromium matrix; later commits add evidence and test framing only.

Arithmetic tests pin depth 1/2/10, half rounding, signed accuracy, zero power, each saturation threshold and maximum safe depth. Elite/boss have no extra multiplier. Repeated projection leaves baseline catalogs unchanged. Combat-consumer tests compare scaled inspection stats, attack preview, AI, actual hit/damage and command replay using the same catalog.

Formats 1/2 cover ready, active, legally reached Guarded, reward, defeat and backtracking. Tests preserve meaningful state and next-command/RNG results, verify fixed/unscaled unvisited floors and exact old primary bytes in backup on the first format-3 write. Format 3 retains damage/selections and rejects mismatched policy/catalog/kind/depth/pool/composition/boss/roster/source/hash/version through recoverable validation. Existing quota/security/uncertain-readback/explicit-recovery tests remain. The 400-floor structural fixture crosses the unchanged 1 MiB limit and retains all floor history when encoding refuses it.

The complete Chromium dungeon suite passed **45/45**, as desktop 15/15 plus portrait/landscape 30/30:

```text
npx playwright test tests/dungeon.spec.ts tests/dungeon-exploration.spec.ts tests/dungeon-lifecycle.spec.ts --project=desktop
npx playwright test tests/dungeon.spec.ts tests/dungeon-exploration.spec.ts tests/dungeon-lifecycle.spec.ts --project=mobile-portrait --project=mobile-landscape
```

This includes read-only startup, real input/active resume, old-save recovery, hidden/rotated/failed-art controls, both biomes/all four kinds, scaled inspection/reload, restart/stale lifecycle, defeat/reset, isolated saves, uncertain travel, charm capacity, and the legal journey below. The kind/depth-2 presentation cases explicitly use structural fixtures; they are not claims of prior legal victories. See [Forest vault inspection](issue-159-biome-encounters/forest-vault-scaled-inspection.png) and [Desert guardian inspection](issue-159-biome-encounters/desert-boss-scaled-inspection.png).

## Legal route witness

Seed 43 starts from a fresh dungeon snapshot. The browser walks every required spatial step and enacts all player turns through the normal action/review/confirm controls; enemy turns use the production AI. It legally defeats Desert normal, elite and the full guardian roster, claiming and preparing ordinary rewards through confirmed controls. The domain witness uses 28/47/38 commands. It leaves Fighter at 18 HP, Ranger at 8 HP immediately after guardian combat, then 12 after the remaining potion; Mage remains defeated.

The browser then walks downstairs, descends to Forest, explores, returns upstairs, ascends and revisits the cleared Desert floor, descends again, reloads the retained Forest floor, starts its actual scaled encounter with the defeated Mage absent, accepts an action and reloads that exact active battle. Selected descriptors, exploration, HP, ownership and completed POIs remain stable; no new guardian reward or restart occurs. See the [full receipt](issue-159-biome-encounters/legal-desktop-journey.json) and [guardian-clear screenshot](issue-159-biome-encounters/desktop-guardian-cleared.png).

An exploratory [256-seed automated player/preparation corpus](issue-159-biome-encounters/automated-balance-corpus.json) found 27 first-floor clears and zero two-full-floor clears. Losses: 15 in the first encounter, 144 in the second, 70 at the first guardian, 25 at floor-2 encounter 1 and 2 at floor-2 encounter 2. This exposes substantial attrition for that policy; it is not human-play balance certification. No second-floor guardian clearance or high-depth balance is claimed. The accepted route requirement is a legal guardian clear with multi-floor travel/revisit and continued play; the browser witness proves that outcome without manufacturing extra wins.

## Performance

The retained [desktop receipt](issue-159-biome-encounters/desktop-performance.json) measured 202 ms cold usable, 4.3 ms p95 saved step and 398,317 normalized gzip code bytes against unchanged 2,500 ms / 33.4 ms / 400,000-byte budgets. Asset and all idle/step frame checks passed. This first receipt predates the metadata correction: its commit field is null; the command/build log identifies runtime `ac7fc9d`. Later receipts read the existing diagnostics provider for build/viewport/user agent and include floor creation time, descriptor bytes and save bytes.

No new production asset or library is loaded by this feature. Existing standalone/short-run catalog and save behavior remain independently covered. The separate Vite advisory fix is [#193](https://github.com/luminari-gurus/tactics-guru-v2/pull/193); it has zero audit vulnerabilities and is not a dependency of this stack.

[Chromium portrait](issue-159-biome-encounters/chromium-portrait-performance.json) and [landscape](issue-159-biome-encounters/chromium-landscape-performance.json) retain exact build, viewport and browser metadata. All byte/latency/frame flags pass: 398,317 code bytes, 4.0/5.8 ms p95 saved steps, 37.1/41.1 ms floor creation, 3,525-byte descriptors and 4,472-byte saves. These receipts identify runtime `ac7fc9d` and its dirty flag; subsequent changes affect tests/docs only. The build's dirty state is disclosed, not presented as a clean exact-head certification.

The focused WebKit configuration passed **45/45**, including the legal journey on desktop, iPhone portrait and landscape. [Desktop](issue-159-biome-encounters/webkit-desktop-performance.json), [portrait](issue-159-biome-encounters/webkit-portrait-performance.json) and [landscape](issue-159-biome-encounters/webkit-landscape-performance.json) performance receipts all pass their unchanged flags: 334–355 ms cold usable, 9–10 ms p95 saved step, 33–37 ms floor creation and 398,330 code bytes. The historical WebKit idle observation did not reproduce on this host across this matrix. The [portrait next-floor view](issue-159-biome-encounters/portrait-next-biome.png) was inspected with heading/map framing corrected; no game state changed to capture it.

Six additional WebKit kind/inspection rechecks pass with explicit [320×568 vault](issue-159-biome-encounters/narrow-forest-vault.png) and [568×320 guardian](issue-159-biome-encounters/short-desert-guardian.png) sizes across all three projects. Both exploration and battle shells remain within their viewport; scaled inspection is readable and scrollable, and close/reload preserves state. These screenshots were inspected. The same expanded cases are included in the full Chromium run.

## Remaining qualification

The [first full run](issue-159-biome-encounters/initial-full-suite.txt.gz) was stopped after 223 passes and eight failures, with one existing skip, one interrupted case and 448 not run; posttests did not execute. Seven failures required a real BFCache return that the default headless-shell launch did not provide. The same cases pass unchanged with the installed full Chromium binary ([7-pass / 1-failure probe](issue-159-biome-encounters/full-chromium-probe.txt.gz)). The eighth timeout also reproduces there: the restarted-scene test waits for boot while its fake clock remains paused. These results are retained and are not reclassified as application regressions or accepted baselines without evidence. A test-host/clock repair and clean full rerun remain required.

Separately, a 44-floor regression exposed 132 repeated graph resolutions from the 128-encounter cache. SHA-256 cache keys bounded by the existing floor-allocation limit remove that eviction cliff; the regression now passes. Save identity, encoded bytes, stat policy and the 1 MiB/8,192-floor limits remain unchanged. Commit `ab4c521` passes **880/880** units, 221 content checks, both typechecks, build and three fresh route/performance checks. [Desktop](issue-159-biome-encounters/cache-desktop-performance.json), [portrait](issue-159-biome-encounters/cache-portrait-performance.json) and [landscape](issue-159-biome-encounters/cache-landscape-performance.json) receipts pass every unchanged flag: 398,321 code bytes and 5.0–9.4 ms p95 steps. No claim that the earlier full run is green accompanies this repair.

Complete the full `npm test -- --output=tmp/issue-159-full-results` (681 main cases, then automatic encounter/item posttests) and final spec/receipt/publication checks. The 879-unit/content/type/build checks are already green and remain reusable while runtime code is unchanged. Record actual failures and their repairs here; do not turn #190's macOS native-select report into an unverified current-host baseline. No merge or production deployment is part of this delivery.
