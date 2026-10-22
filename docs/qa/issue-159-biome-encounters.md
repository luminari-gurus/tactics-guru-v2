# Issue #159 biome encounter acceptance

Date: 2026-10-21, Asia/Jerusalem. Status: implementation and required qualification complete; ready for review, with initial failures and focused repairs retained explicitly. This report distinguishes executable/domain proof, structural UI fixtures and a complete legal browser journey.

## Implementation and source

- [#191](https://github.com/luminari-gurus/tactics-guru-v2/pull/191): bounded catalog, admission, independent seeded selection and baseline scaling.
- [#192](https://github.com/luminari-gurus/tactics-guru-v2/pull/192): durable descriptors, projected catalog, formats 1/2 normalization and format 3.
- Presentation runtime tested at `ac7fc9d`; `f8d0d23` improves receipt metadata without changing runtime. Final publication and complete validation are tracked in [the preserved issue-159 plan](../ongoing-projects/issue-159-biome-encounters-plan.md).
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

An exploratory [256-seed automated player/preparation corpus](issue-159-biome-encounters/automated-balance-corpus.json) found 27 first-floor clears and zero two-full-floor clears. Losses: 15 in the first encounter, 144 in the second, 70 at the first guardian, 25 at floor-2 encounter 1 and 2 at floor-2 encounter 2. This exposes substantial attrition for that policy; it is not human-play balance certification. That initial witness did not fulfill task 3.2's legal coverage of all four kinds and a later-floor guardian; structural fixtures do not supply the missing legal victories. The review repair extends the existing route through both complete floors, preserving the original corpus as historical evidence.

## Performance

The retained [desktop receipt](issue-159-biome-encounters/desktop-performance.json) measured 202 ms cold usable, 4.3 ms p95 saved step and 398,317 normalized gzip code bytes against unchanged 2,500 ms / 33.4 ms / 400,000-byte budgets. Asset and all idle/step frame checks passed. This first receipt predates the metadata correction: its commit field is null; the command/build log identifies runtime `ac7fc9d`. Later receipts read the existing diagnostics provider for build/viewport/user agent and include floor creation time, descriptor bytes and save bytes.

No new production asset or library is loaded by this feature. Existing standalone/short-run catalog and save behavior remain independently covered. The separate Vite advisory fix is [#193](https://github.com/luminari-gurus/tactics-guru-v2/pull/193); it has zero audit vulnerabilities and is not a dependency of this stack.

[Chromium portrait](issue-159-biome-encounters/chromium-portrait-performance.json) and [landscape](issue-159-biome-encounters/chromium-landscape-performance.json) retain exact build, viewport and browser metadata. All byte/latency/frame flags pass: 398,317 code bytes, 4.0/5.8 ms p95 saved steps, 37.1/41.1 ms floor creation, 3,525-byte descriptors and 4,472-byte saves. These receipts identify runtime `ac7fc9d` and its dirty flag; subsequent changes affect tests/docs only. The build's dirty state is disclosed, not presented as a clean exact-head certification.

The focused WebKit configuration passed **45/45**, including the legal journey on desktop, iPhone portrait and landscape. [Desktop](issue-159-biome-encounters/webkit-desktop-performance.json), [portrait](issue-159-biome-encounters/webkit-portrait-performance.json) and [landscape](issue-159-biome-encounters/webkit-landscape-performance.json) performance receipts all pass their unchanged flags: 334–355 ms cold usable, 9–10 ms p95 saved step, 33–37 ms floor creation and 398,330 code bytes. The historical WebKit idle observation did not reproduce on this host across this matrix. The [portrait next-floor view](issue-159-biome-encounters/portrait-next-biome.png) was inspected with heading/map framing corrected; no game state changed to capture it.

Six additional WebKit kind/inspection rechecks pass with explicit [320×568 vault](issue-159-biome-encounters/narrow-forest-vault.png) and [568×320 guardian](issue-159-biome-encounters/short-desert-guardian.png) sizes across all three projects. Both exploration and battle shells remain within their viewport; scaled inspection is readable and scrollable, and close/reload preserves state. These screenshots were inspected. The same expanded cases are included in the full Chromium run.

## Comprehensive qualification and retained failures

The [first full run](issue-159-biome-encounters/initial-full-suite.txt.gz) was stopped after 223 passes and eight failures, with one existing skip, one interrupted case and 448 not run. Seven actual-BFCache assertions failed under headless shell. A full-Chromium [binary-isolation probe](issue-159-biome-encounters/full-chromium-probe.txt.gz) passed them unchanged; the eighth test reproduced a paused-clock scene-boot timeout. The focused repair selects full Chromium per Chromium project and runs virtual time during asynchronous scene startup before pausing visual samples again. WebKit replacement projects stay WebKit. Its [initial qualification](issue-159-biome-encounters/test-runtime-repair.txt.gz) passed 11 desktop cases, both mobile bob cases and six WebKit migration/performance cases, without changing those assertions or deadlines.

The completed [681-case full Chromium run](issue-159-biome-encounters/full-chromium-suite.txt.gz), built at `5bb6c17`, recorded **677 passes, one failure and three expected dev-only skips**. Every BFCache and repaired bob case passed in every project. The sole failure was the compound desktop actor/inspection workflow exhausting its 30-second total limit near its end; both mobile variants passed. The old shell run already took 29.1 seconds. A [traced diagnostic](issue-159-biome-encounters/actor-budget-diagnostic.txt.gz) completed all three complete scenarios with a diagnostic 90-second budget (desktop approximately 66 seconds with tracing, portrait 51.4, landscape 56.4); the slowest individual desktop action/assertion was approximately 1.2 seconds.

The test-only repair gives that cumulative three-actor workflow 90 seconds and caps each action at five seconds. It retains all three actors, every unit inspection, native selection, both cancellation routes, modal/state/RNG/focus checks, existing five-second assertions and product performance limits. Its untraced repaired variants pass at **27.6 / 20.7 / 21.8 seconds**. No skips, retries or arbitrary sleeps were added. The full run remains recorded as failed; the following focused repair and dev coverage complete qualification. This is not represented as one clean 681-case run.

Main advanced through independent #196 to `162034997ed5fd0f3788531a4217b1b010b4dd27`. Forward merges brought it into the root PR and propagated each parent through the stack without rewriting history. The one textual conflict retains both complete exploration test additions; comparing against the pre-integration feature test file shows only the 15-line square-grid case added. Main's square rows/columns and this feature's biome styles both survive. Main/HEAD merge-tree is clean.

The original integration source was **`df03f4c693645883a90f676ed891fee17bd9c611`**. Its results remain historical; the review repairs and their separately bound checks follow below. The [fresh build](issue-159-biome-encounters/final-build.txt.gz) passes 221 content checks, both TypeScript scopes and production compilation. The 880-unit run used `npm run test:unit -- --maxWorkers=2` with the explicit WSL Git paths documented in the plan. Build metadata reports dirty because content validation regenerated historical unit snapshot line endings; that unrelated churn was inspected/restored. Application source was committed and unchanged throughout these checks.

Final checks on that combined source:

- [Chromium: 21/21](issue-159-biome-encounters/final-chromium.txt.gz), including all three repaired actor workflows and square-grid, real keyboard/touch traversal, art/visibility, both biomes/all kinds, scaled inspection/reload and performance cases.
- [WebKit: 18/18](issue-159-biome-encounters/final-webkit.txt.gz), the corresponding combined dungeon matrix in desktop/portrait/landscape.
- [Configured npm posttests: 24 encounter + 21 item cases](issue-159-biome-encounters/final-posttests.txt.gz), explicitly run because the failed main run prevented npm's automatic posttest hook.
- [Development-server placement probes: 3/3](issue-159-biome-encounters/final-dev-placement.txt.gz), covering the three cases intentionally skipped by the production-preview suite.
- **880/880** domain/unit tests remain valid at implementation `ab4c521`; later application changes are solely main's two CSS lines. The focused matrix covers those layout/control changes. Both OpenSpec changes validate strictly; their completed ledgers are checked before publication.

Reproduction commands, after the fresh production build (default configurations serialize their projects):

```text
npm run build
npx playwright test tests/battle-loop.spec.ts tests/dungeon-exploration.spec.ts -g "live actor, inspection|exploration cells stay square|real traversal, art independence|map input stays inert|saved kinds, scaled inspection|records route transfer" --output=tmp/issue-159-final-chromium
npx playwright test -c playwright.exploration.config.ts tests/dungeon-exploration.spec.ts -g "exploration cells stay square|real traversal, art independence|map input stays inert|saved kinds, scaled inspection|records route transfer" --output=tmp/issue-159-final-webkit
npm run posttest
PLAYWRIGHT_SERVER_MODE=dev npx playwright test tests/overworld-map.spec.ts -g "controlled placement failure" --output=tmp/issue-159-final-dev-placement
openspec validate issue-159-biome-encounters --strict
openspec validate repair-bfcache-test-runtime --strict
```

All six final integration performance receipts pass every unchanged byte/latency/frame flag: [Chromium desktop](issue-159-biome-encounters/integration-chromium-desktop-performance.json), [portrait](issue-159-biome-encounters/integration-chromium-portrait-performance.json), [landscape](issue-159-biome-encounters/integration-chromium-landscape-performance.json), [WebKit desktop](issue-159-biome-encounters/integration-webkit-desktop-performance.json), [portrait](issue-159-biome-encounters/integration-webkit-portrait-performance.json), [landscape](issue-159-biome-encounters/integration-webkit-landscape-performance.json). Code is **398,337** gzip-normalized bytes, cold usable **215–367 ms**, saved-step p95 **4.9–10 ms**, floor creation **37–47.5 ms**, descriptors **3,525 bytes**, and saved movement state **4,472 bytes**. Limits remain 400,000 code bytes, 2,500 ms cold, 33.4 ms saved steps, existing frame/asset limits, 1 MiB saves and 8,192 floors.

The historical enlarged-cache repair and its dirty receipts are retained in #197. Current source instead validates historical identities immediately and geometry before floor activation, using a bounded 128-entry working set.

Historical cache-specific receipts `cache-desktop-performance.json`, `cache-portrait-performance.json` and `cache-landscape-performance.json` all record `dirty: true`. Their `commit` field names HEAD `ab4c521`; it does not bind the measured bundle exclusively to that commit. Their passing values are dirty historical observations, not clean exact-commit certification. Current parent qualification and its source bindings are separate evidence.

The final test repair is [#198](https://github.com/luminari-gurus/tactics-guru-v2/pull/198). The feature/recovery/legal-route evidence above remains reusable; no unsupported human/high-depth balance claim follows from it. #190's separate macOS native-select report stays open; matching cases pass on this Linux host without establishing a macOS fix. Review PRs remain open, and no production deployment or release tag is part of this delivery.

## PR #194 review repair

Review correctly identified missing legal coverage in task 3.2. Repair source `15151a0` extends the existing journey through six victories: seed 198 clears Forest normal/vault/guardian, then Desert normal/elite/guardian, in 45/32/35/40/52/54 battle commands. Both floors end at completion 3; Fighter survives at 2 HP and Ranger/Mage remain defeated. Existing rewards, equipment and healing carry forward through the normal controls. Ascent/revisit, absence of duplicate rewards, living-party construction, an accepted second-floor action and exact active/final reload checks remain in the route.

The test-only player helper has one optional preference for finishing wounded enemies and safer firing positions. It uses the existing previews and expected damage, without reading future rolls, changing RNG, injecting combat outcomes or altering game balance. Existing helper callers retain their original policy. The old 256-seed corpus remains historical evidence of that original policy's attrition; a selected witness does not establish general or high-depth balance.

Local full units pass **881/881**, including the new two-floor domain witness and the admission-cache regression moved into #192. Content validation (**221** checks), both TypeScript scopes, build and strict OpenSpec pass. The desktop Chromium browser route passes in **3.7 minutes**; WebKit portrait and landscape pass in **2.3/2.4 minutes**. All three independently walk and play the complete route. The complete-route deadline is ten minutes because it now plays six full encounters; individual assertions and product/performance budgets remain unchanged.

[Review receipts and screenshots](issue-159-biome-encounters/review-194/) retain the six battle records and final state, unit/build/browser logs, and [source/test tree bindings](issue-159-biome-encounters/review-194/source.json). Earlier seed-43 receipts remain historical. The initial desktop run used the same six-encounter assertions before the final aggregate-deadline and screenshot-scroll adjustments; the WebKit run uses the committed repair exactly. Build dirtiness from the local dependency symlink is disclosed in the source binding.

## Earlier review closeout (source 96b13ed)

Review integration source is `96b13ed3aaec7a99d45b6a8fb94f9361078a5174`. The four valid findings across the stack are addressed: the 44-floor admission-cache cascade, the late legacy-history migration cost, missing legal all-kind/later-guardian proof, and the restarted-scene readiness race. #191/#197 had no actionable findings. Changes were carried through the requested dependency order without rewriting published history.

The late #192 repair (`804e50d`, [raw proof](issue-159-biome-encounters/review-192/)) replaces 900 graph resolutions during 300-floor format-1/2 migration with deferred derived legacy geometry. Decoding measured 43.8/45.6 ms locally after 4.83/5.05 s before; call counts, rather than wall time, form the regression assertion. Actual entry resolves once. Active geometry/RNG and prior-format wire checks remain exact, old full format-3 legacy descriptors stay supported, and new-policy saves cannot defer facts. No additional cache, engine or storage adapter was introduced.

The #198 repair (`18d2572`) waits for the incremented replacement seed before player readiness and re-pausing time. It also repairs the same phase-only wait in the animation teardown caller and tolerates absent session data during shutdown. Three initial seed-assertion probes passed on this host; source inspection showed that loading uses `data-ready`, while `data-phase` can still belong to the old scene. The corrected boundary passes all **12** affected teardown/bob cases across desktop, portrait and landscape with unchanged deadlines/assertions.

After carrying the legacy fix, all **885/885** unit tests pass, including both legal-floor witnesses, both long legacy formats, compatibility/tamper checks and the 44-floor cache regression. A fresh build passes **221** content checks and both TypeScript scopes; both OpenSpec changes validate strictly. Three fresh Chromium real-action/traversal/resume cases and three WebKit old-save migration profiles pass. The complete six-encounter browser route remains qualified as recorded in the #194 review section; its new-policy selection and resolved geometry path are unchanged by the legacy-only deferral.

Final source `96b13ed` additionally passes **three Chromium + three WebKit** route/performance checks and the configured **24 encounter + 21 item** npm posttests. Every unchanged transfer/latency/frame/asset flag passes: **398,394** normalized gzip code bytes; saved-step p95 **4.7–10 ms**. All six raw receipts, exact command logs and [source/tree bindings](issue-159-biome-encounters/review-closeout/source.json) are retained in [review-closeout](issue-159-biome-encounters/review-closeout/).

The historical 681-case run remains 677 passes, one repaired aggregate timeout and three expected dev-only skips. This review pass reuses unaffected broad evidence and adds the targeted checks above; it is not reported as a new clean 681-case run. The old automated-policy attrition corpus remains a limitation, alongside the separate reproducible two-floor witness. No merge, release tag, OpenSpec archival or production deployment was performed.

## Parent and historical-receipt provenance

**Current parent reference (2026-10-21):** #194 at `95909244ca33d702fc5a357a199dcf4830b250c1` contains the legacy/cold-start repairs and legal two-floor/all-kind proof. This #197 tree has identical runtime, tests, dependencies and build configuration to that specific updated parent, verified by direct diff. Earlier `c9fa877` describes a previous checkpoint and does not establish equality for the later legacy repair. The current admission strategy validates historical identities immediately and geometry before floor activation, using a bounded 128-entry working set; the original enlarged-cache receipts are historical.

Historical cache-specific receipts `cache-desktop-performance.json`, `cache-portrait-performance.json` and `cache-landscape-performance.json` all record `dirty: true`. Their `commit` field names HEAD `ab4c521`; it does not bind the measured bundle exclusively to that commit. Their passing values are dirty historical observations, not clean exact-commit certification. Current parent qualification and its source bindings are separate evidence.

## Review completion after late findings

The final integration source is `462af95b7931c03221763482bbdc79b9ee7bdc8f`. All seven findings are addressed: three admission/migration/cold-start findings in #192, legal all-kind/later-guardian coverage in #194, two parent/provenance corrections in #197, and replacement identity in #198. The original enlarged admission cache is superseded: current source validates historical identities immediately and full geometry before floor activation, using the bounded 128-entry working set.

The cold format-3 regression is a valid 250-floor, 924,599-byte envelope: 750 graph resolutions / 4.21 s before, exactly three resolutions / about 159 ms after. Historical source/map/layout-seed mismatches reject immediately. A bad historical geometry hash rejects candidate travel before state or storage changes. Desktop Chromium and portrait WebKit Continue preserve raw bytes and pass the existing 2,500-ms startup budget; the retained #192 receipts measured 807/1,121 ms. [Cold-start proof](issue-159-biome-encounters/review-cold-start/) includes raw logs, screenshots and source bindings.

The updated #194 parent `9590924` passes **887/887** units, content (**221** checks), both TypeScript scopes, build, strict OpenSpec and both long-history browser profiles. This integration has identical runtime/unit/helper source. The 12 repaired restart cases remain applicable through unchanged test/config and standalone source. The **24 encounter + 21 item** posttests at `96b13ed` are reused after verifying their source/config paths unchanged; the only later runtime change is in dungeon history validation, outside those routes. Prior broad-run failures and original balance limitations remain explicit.

Fresh source `462af95` passes six functional performance cases across Chromium/WebKit. Code transfer is **398,451** normalized gzip bytes. Five initial profiles pass every unchanged flag; Chromium landscape initially records idle p50 `16.700000000000045` against `16.7`, so its raw strict flag is false. That initial receipt is retained. One focused landscape recheck records `16.699999999999932` and passes every unchanged flag. No measurement code or budget was altered, and this is not described as one initially clean six-flag run.

All current performance receipts also record `dirty: true`; the commit field alone does not bind the measured bundle exclusively. [Source/tree bindings, inspected-diff notes, raw initial/recheck receipts and logs](issue-159-biome-encounters/review-completion/source.json) identify the actual qualification and its limits. #197's original `cache-*` receipts are explicitly dirty historical observations, and its equality claim now cites the actual qualified #194 parent rather than `c9fa877`.
