# Spatial dungeon exploration acceptance

Final runtime: `135f1e2` on `work/issue-158-overworld-traversal`, based on `38474f2`. The caller approved published OpenSpec plan `e115ea2`. [Source, test and built-file SHA-256 bindings](issue-158/runtime-manifest.json) identify the final runtime. Later delivery commits contain QA evidence, output-directory ignore rules and task progress only.

Delivered: `/dungeon` accepts legal single-cell keyboard/pointer/touch traversal, retains reveal/visited cells and seeded POIs, starts the next battle on contact, returns with exactly-once completion/reward state, and requires arrival at stairs for travel. Valid v1 saves convert without altering party/items, pending rewards or active battle/RNG. Existing recovery and explicit unsaved play remain available. `/map` stays independent inspection. Stationary POIs do not complete #155 wandering; #159 selection/scaling and #175 scouting/traps/caches remain separate.

## Verification

| Check | Actual result |
| --- | --- |
| `npm run test:unit` | 828 passed across 50 files |
| `npm run validate:content` | 190 passed across seven files |
| `npm run typecheck` and `npm run build` | Passed both TS configurations and production build; existing Vite native-loader and large-engine-chunk warnings retained |
| Complete `npm test` checkpoint at `4da0159` | 663 passed, six failed, three dev-only cases skipped; see disposition below |
| Final focused Chromium: dungeon exploration, dungeon, lifecycle and Guarded effects | 45/45 passed across desktop, portrait and landscape |
| Final focused WebKit: exploration, dungeon and lifecycle | 36/36 passed across desktop Safari and portrait/landscape iPhone emulation |
| Final Chromium evidence capture | 12/12 exploration cases passed; screenshots/state/frame/transfer receipts retained immediately after the run |
| `npm run posttest` | 24 encounter and 21 item checks passed |
| Dev-only placement failures | Three cases passed with `PLAYWRIGHT_SERVER_MODE=dev`; these are the three cases skipped by the production-preview matrix |
| Strict OpenSpec and diff checks | Passed before delivery |

Raw logs are preserved as gzip files in [issue-158](issue-158/). [Chromium](issue-158/chromium/) and [WebKit](issue-158/webkit/) retain screenshots, synthetic state and performance receipts. The focused WebKit command is `npx playwright test -c playwright.exploration.config.ts`. Chromium uses the installed Google Chrome executable through `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

## Failures and corrections

The initial 44/45 focused run hit a detached-control measurement during asynchronous artwork redraw. An atomic size assertion exposed the same real redraw defect during scrolling in the full matrix. The fix updates tile backgrounds in place: image completion and art switching preserve the map/control nodes, focus and authoritative state. The final test explicitly asserts retained node identity and passes on both engines. The artwork correction changes only `src/ui/dungeonMap.ts` in runtime source after the broad checkpoint; the final affected route, lifecycle and shared-battle regressions were rerun rather than presenting that earlier full matrix as green.

The full matrix's other three failures are desktop standalone native-select tests at `battle-loop.spec.ts:66` and `:95` (Cancel/Escape). All three reproduce on exact unchanged base `38474f2`, with the same disabled Review action assertion. [Baseline source/test hashes](issue-158/baseline-source-check.json), raw log and contexts are retained. The baseline build's dirty flag comes only from its dependency symlink; runtime source and tests match the base. No standalone-select code was changed or existing failure waived.

The initial readback-mismatch unit harness armed its fault before writing, rather than during primary readback. The corrected harness commits the candidate, fails readback, rejects silent retry and verifies explicit durable recovery. All 828 unit tests then passed. [Initial logs/contexts](issue-158/initial/) retain these failures without counting them as passes.

## Acceptance mapping

| Issue criterion | Direct evidence |
| --- | --- |
| Authoritative legal traversal and controls | Domain rejection/revision tests plus fresh UI walks using keyboard, cell pointer and real mobile taps; repeat-key, modal and hidden-page locks |
| Persistent fog and inspectable POIs | 100-seed placement corpus, malformed-state tests, monotone discovery, accessible discovered/visited/cleared list and screenshots |
| Encounter contact, battle transfer and return | Real UI walk into the first POI and legal action/reload; legal final-command fixtures for victory/reward/guardian/defeat; duplicate/stale boundary tests and nonaccumulating item projection |
| Floor travel and art independence | Arrival-gated stairs, saved backtracking, cache regeneration, exact snapshot comparisons across art completion/failure, rotation and reload |
| Unified saves and lifecycle | v1 ready/reward/active/defeat conversion, exact battle/RNG preservation, retained original backup, quota/security/unavailable/readback faults, export/recovery and disposed-session tests |

Legal final-command fixtures are labeled evidence of those boundaries, not a claim that every preceding turn or spatial step used browser input. Capacity fixtures are structural. The real traversal case separately proves the feature is reachable through actual production controls.

## Performance and retained limits

Final Chromium local samples: cold usable 83–84 ms; synchronous saved map-step p95 1.7–1.8 ms. Each observed route has 394,035 bytes of normalized gzip JS/CSS against the unchanged 400,000-byte limit, and 683 observed image bytes for the small reused optional art set against 1,500,000. Gzip is measured from fetched resources; it is not a claim that preview served compressed wire responses. New content/biomes are not loaded. Startup is localhost, not deployed-network acceptance.

Frame receipts retain 30 idle and 40 step rAF intervals per profile, separately from synchronous script time. Chromium idle p50/p95 and step p95 meet the unchanged 16.7/20/33.4 ms limits in these samples. WebKit idle p50 is **17 ms**, above **16.7 ms**, on all three profiles; idle p95 is 18 ms and step p95 is 17–18 ms. The exact base floor summary also records idle p50/p95 **17/18 ms** on all profiles using the same sampler: [baseline samples](issue-158/baseline-idle.json) and [reproducible sampler](issue-158/baseline-idle.mjs). Both sets remain above-budget observations; no exception or relaxed threshold is granted. The integer-valued samples and baseline comparison do not establish a new runtime regression or complete release certification.

Individual early performance receipts have a null pre-battle DOM commit field; their source/build association is supplied by the retained runtime manifest. The earlier full-matrix build's dirty flag reflected an existing test-generated QA simulations file; its original source/build manifest is preserved under initial. The final source binding is independently checked against `135f1e2`. The unrelated generated simulations file was restored, not delivered as a change.

Browser/device emulation is sufficient under the caller's standing instruction. No physical-device test, production deployment, merge or broader release-performance acceptance is claimed. Baseline native-select failures and the WebKit idle-budget observation remain visible review limitations, independent of the completed #158 functional acceptance.
