# Issue #11: battle device and performance evidence

Issue: https://github.com/luminari-gurus/tactics-guru-v2/issues/11. Approved plan: `issue-11-device-performance`, published at `144fde6`, explicitly approved by the caller on 2026-10-10. Branch: `work/issue-11-device-performance`; base main `9f785df`.

## Capture method

Use a clean committed checkout and `npm run build`. Do not run other browser workloads during measurement. With the installed Chrome executable on this host:

```sh
export PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
npm run measure:fit -- /tmp/issue-11-proof-local.json
npm run measure:fit -- /tmp/issue-11-battle-local.json --scene battle
npm run measure:fit -- /tmp/issue-11-battle-deployed.json --scene battle --url https://a49bc1b1.tactics-guru-v2.pages.dev
npm run measure:fit -- /tmp/issue-11-main-deployed.json --scene battle --url https://tactics-guru-v2.pages.dev
```

Proof remains the default. Each run uses three fresh-context cold loads and same-context warm reloads for desktop, Pixel 7 portrait and landscape. No request routing or cache disabling. Record host/browser/network/CDN conditions and the served build, not just collector source. Local inventory includes file hashes. Errors/mixed builds fail the run after writing evidence; timeout writes completed samples and a failed-capture snapshot.

Battle controls-usable time is navigation-relative until the initial enemy presentation settles and a player can act. Idle frame samples are visible post-render intervals while a player can act, excluding workload windows. Frames use nearest-rank p50/p95, at most 600 per window. Action windows retain up to 60 records: 250 ms after selection/pan/zoom input, extended during a move presentation. Input response runs from accepted input handling to its first post-render callback after a synchronous presentation change; it is an engine-render proxy, not physical input dispatch latency or proof of display scanout. Timing covers pointer/dropdown selection and pointer camera changes; keyboard performance is not instrumented. Unchanged/clamped camera inputs do not produce response records. Hidden intervals/pending input are discarded; restart resets the run and detaches the prior render callback. No domain commands/RNG decisions come from instrumentation.

The collector snapshots idle diagnostics before its wheel zoom, eight-step drag pan, legal Move target selection and Review/Confirm move. The workload targets the visible player controls; it injects no outcomes, HP or battle state. Full legal wins/losses and all signatures remain verified by `tests/battle-loop.spec.ts`, not by this short performance workload.

## Budgets and results

Captures below retain successful results and the main-URL failure. Compare to [#20](issue-20-fit-gate.md) and the post-export [#35 baseline](issue-35-proof-asset-export.md). Report each sample, ranges and medians; differing hosts/browser builds cannot establish causal speedups.

| Gate | Existing agreed proof-derived limit | Battle status |
| --- | --- | --- |
| L1 cold deployed usable | ≤2500 ms | Pass on preview; worst 1403.8 ms |
| L2 warm deployed usable | ≤750 ms | Pass on preview; worst 749.9 ms |
| L3 cold compressed code | ≤400000 bytes | Pass; worst 392624 bytes |
| L4 cold scene assets | ≤1500000 bytes | Pass; 834688 bytes |
| F1 idle intervals | p50 ≤16.7 / p95 ≤20 ms | Fail locally and deployed |
| F2 pan/zoom/move intervals | p95 ≤33.4 ms | Fail; raw windows retained |
| I1 selection/pan | visible by next frame | Engine-render proxy only; physical unverified |

Classify navigation/HTML/CSS/JS as code, same-origin scene resources as assets, and unknown cross-origin timing explicitly. Zero transfer can indicate a cache hit, not zero resource size. Preserve failures; do not rerun until limits pass or silently loosen thresholds.

### Captured builds and conditions

- [Local battle](issue-11/battle-local.json): clean source/build `12e97e8`, 18 samples, no browser errors.
- [Local proof](issue-11/proof-local.json): clean source/build `ea656e7`, 18 samples, no browser errors. This commit adds only collector timeouts relative to `12e97e8`; application sources are the same, with a different baked build identity.
- [Deployed battle](issue-11/battle-deployed-12e97e8.json): https://a49bc1b1.tactics-guru-v2.pages.dev, served clean build `12e97e8`, 18 samples, no browser errors; collector source `ea656e7`, clean. The existing Cloudflare Pages branch build was successful. No release infrastructure or Access setting changed.
- [Main URL failure](issue-11/main-deployed-unavailable.json): https://tactics-guru-v2.pages.dev served clean main `9f785df`, which has no battle frame sampling. The finite 18-second wait failed, preserving its zero-frame diagnostic snapshot and errors. This is zero successful samples, not a passing deployed measurement. The branch preview is the user-authorized new-build capture; it does not update the main URL.

Host for these runs: Apple M5 Pro, macOS kernel 27.0.0 arm64, Node 26.11.0, installed headless Chrome 155.0.8059.40. Desktop Chrome profile and Pixel 7 portrait/landscape emulation; no physical-device evidence. Local uses loopback compression; preview uses host network/TLS/CDN without throttling, with uncontrolled edge cache. Cold is a fresh context, warm a same-context reload. These runs were sequential without other browser workloads.

### Deployed loading and idle frames

Medians of three samples per row; min/max preserve outliers. Resource figures include response-header overhead and DOM portrait cache-hit requests. All measured resources in these captures are same-origin: navigation/HTML/CSS/JS count as code; image resources count as assets.

| Profile | Cache | Usable median (min–max), ms | Total transferred bytes (min–max) | Idle p50 / p95 median, ms |
| --- | --- | --- | --- | --- |
| desktop | cold | 781.1 (751.8–1403.8) | 1,227,192–1,227,312 | 26.2 / 26.7 |
| desktop | warm | 637.8 (626.5–642.9) | 7,951–7,951 | 29.8 / 31.5 |
| mobile-portrait | cold | 883.8 (844.6–963.8) | 1,226,962–1,227,312 | 29.6 / 31.0 |
| mobile-portrait | warm | 711.3 (676.5–749.9) | 7,951–7,951 | 29.6 / 30.9 |
| mobile-landscape | cold | 832.5 (771.2–853.1) | 1,226,962–1,227,312 | 29.6 / 30.8 |
| mobile-landscape | warm | 699.8 (690.1–704.7) | 7,951–7,951 | 29.5 / 30.9 |

L1 passes on all nine cold samples (worst 1403.8 ms); L2 passes on all nine warm samples (worst **749.9 ms**, only 0.1 ms below its limit). Cold code transfer is 392274–392624 bytes (L3 ≤400000 passes). Cold asset transfer is 834688 bytes throughout (L4 ≤1500000 passes). Warm total is 7951 bytes; cache-hit encoded size is not zero resource size. These are preview measurements, not main-URL or physical mobile acceptance.

### Workload and interaction results

Windows are observed engine-render intervals, not a GPU benchmark. A 250 ms input window can overlap another action or modal update; attribution to a single operation is therefore limited. Move records include the initial automatic enemy movement and the confirmed player movement. Small windows can have few samples; raw counts/intervals are retained.

| Workload | Local worst p95, ms / failed windows | Deployed worst p95, ms / failed windows | F2 result |
| --- | --- | --- | --- |
| pan | 47.1 / 9 of 18 | 47.9 / 10 of 18 | Fail |
| zoom | 31.9 / 0 of 18 | 33.7 / 1 of 18 | Pass locally; fail deployed |
| move | 120.1 / 3 of 36 | 131.0 / 2 of 36 | Fail |

Deployed selection input-handler to first post-render response: median 32.3 ms, range 23.5–43.7 ms across 18 inputs. Deployed pan input-handler to first post-render response: median 0.9 ms, range 0.7–1.4 ms across 126 inputs. Every recorded change reaches the first following render callback. This is an I1 engine-render proxy only; it omits OS input dispatch and display scanout. Physical next-frame visual acceptance is unverified.

F1 fails for the battle in both local and preview runs: deployed p50 is 26.1–30.0 ms and p95 26.5–32.0 ms. The contemporaneous local proof p50 is about 16.7 ms and p95 18.1–18.5 ms. Local battle loading is 476.2–611.1 ms cold and 532.3–602.8 ms warm; local proof is 104.5–232.4 ms cold and 79.0–124.8 ms warm. Scene complexity and differing update/post-render observation points prevent assigning a cause from these captures alone. The battle F1/F2 failures remain blockers; no speculative renderer rewrite, budget relaxation or passing-device claim is included.

## Physical-device record

The caller reports that iPhone Chrome/Safari look good, followed by the browser results below. These are qualitative reports; checklist completion and device/orientation details remain unverified. Android evidence is still unavailable. Historical proof-scene hardware reports do not certify the authored battle. For each row record date, tester/source, device model, OS/browser versions, URL and served commit, cache/network, orientation, screenshots/logs, raw measurements and every checklist item below.

Caller report received 2026-10-10 for https://15a9d5a6.tactics-guru-v2.pages.dev:

- Device subsequently identified by the caller as iPhone 16 Pro running iOS 27.0.1. The caller clarified that “desktop and landscape” meant portrait and landscape on this iPhone; it supplies no desktop-computer evidence.
- Chrome 155.0.8059.37 and Safari (version unknown): caller reports movement, attacks, features, panning and zooming working in both portrait and landscape. “Features” was not itemized, so it does not individually certify all three signatures or other checklist items.
- The caller explicitly did not complete a full battle. Victory, defeat and restart after outcomes remain unverified. No problems were reported in the exercised checks; detailed safe-area/browser-toolbar behavior, suspension/resume, console inspection and physical timing remain unverified. Served commit and actual test date were not supplied. This deployment differs from the measured `a49bc1b1` preview above; its report does not replace those performance captures.

| Browser | Portrait | Landscape | Device / OS / browser / build / conditions |
| --- | --- | --- | --- |
| iPhone Safari | Partial: movement, attacks, features, pan/zoom reported working | Partial: same checks | Caller: iPhone 16 Pro, iOS 27.0.1; Safari version unknown; full battle not completed |
| iPhone Chrome | Partial: movement, attacks, features, pan/zoom reported working | Partial: same checks | Caller: iPhone 16 Pro, iOS 27.0.1; Chrome 155.0.8059.37; full battle not completed |
| Android Chrome | Unverified | Unverified | Not supplied |
| Desktop | Physical/manual unverified | Physical/manual unverified | Automated host metadata comes from captures |

Run each orientation independently, using real controls:

1. Complete a legal victory and defeat; exercise Move, Basic attack, all three signatures, Wait, enemy turns and restart after each outcome. Seed 1 gives the automated legal-policy loss; restart once for seed 2 and its winning policy. Manual choices may change the outcome; never force state to manufacture a pass.
2. Select a visible cell, pan by drag, pinch/wheel zoom and select after transformation. Gesture completion must not select or confirm a move. Check canceled/held pointers across app switch and repeated restarts (at least five).
3. Check safe areas/notches, toolbar collapse/expand, rotate repeatedly, scroll short-landscape controls, tap targets, page zoom/selection/callouts/context menus and modal backdrop/focus capture.
4. Check audio availability, first gesture unlock, interruption/resume and errors. **Battle audio is absent:** the battle hides proof sound controls and does not create the proof audio adapter. Record this as an unmet audio gate, not a pass. `?scene=proof` may separately test the existing sound adapter on the same build; label that evidence as proof-only.
5. Hide/resume during player and enemy presentation; no duplicate command or stuck control. Record console/page errors with remote browser debugging and visible status. OS suspension and browser chrome cannot be certified by emulation.
6. Record cold/warm loading, transfer, first interaction and idle/pan/zoom/move frame captures. State limitations when device timing or console capture is unavailable.

## Verification and acceptance

- Initial RED unit run: six failures demonstrate missing scene option, retained-failure validation and workload/response methods. Focused GREEN: 12 tests pass.
- Focused real-control diagnostics browser test: three profiles pass, including replay equality and restart isolation.
- Full configured browser suite: **171 passed in 7.6 minutes** across desktop/mobile portrait/mobile landscape, against the production build at clean `ea656e7`. Report/task/raw-evidence edits made during the run do not change application/test sources.
- Unit suite: **264 passed** across 23 files, including the pure-domain boundary; content validation: **77 passed**. Strict typecheck/build and OpenSpec validation pass; existing Phaser chunk-size warning remains.
- Deployed proof-only sound check: **3 passed in 8.2 seconds** at the same `a49bc1b1` preview. The test exercises trusted button input, AudioContext unlock and played counters with no console/page errors; it does not certify audible sound on physical devices or supply battle audio.

| Actual command | Result |
| --- | --- |
| `npm run test:unit -- tests/unit/measureFitOptions.test.ts tests/unit/measurements.test.ts` | RED: 6 failures before implementation; final GREEN: 12 passed |
| `npm run test:unit` | 264 passed |
| `npm run validate:content` | 77 passed |
| `npm run typecheck` | Both strict TypeScript configurations passed |
| `npm run build` | Passed, existing chunk warning |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test -- tests/battle-loop.spec.ts --grep 'battle diagnostics'` | 3 passed |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test` | 171 passed |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm test -- --config tmp/issue-11-remote.config.ts tests/audio.spec.ts --grep 'the test tone plays only'` | 3 passed against the pinned preview |
| `git diff --check` | Passed |
| `openspec validate issue-11-device-performance --strict` | Passed |

The temporary remote config inherited `playwright.config.ts`, used `testDir: '../tests'`, disabled `webServer`, and overrode `use.baseURL` to `https://a49bc1b1.tactics-guru-v2.pages.dev`. It was removed after the run; no persistent test/server/deployment configuration changed. Capture commands and retained failure evidence are recorded above.

| Issue acceptance criterion | Evidence / unresolved gate |
| --- | --- |
| Physical win/loss/restart, four browsers × two orientations | Partial iPhone Safari/Chrome checks reported in both orientations; no full battle completed; outcomes/restarts and Android/desktop evidence pending; automatic battle tests are supporting evidence only |
| Gestures, safe areas, chrome resizing, audio, suspension, errors | Existing and added battle checks; physical checklist pending; battle audio absent |
| Reproducible deployed budgets and proof baseline comparison | 18 local and 18 preview battle samples plus 18 proof samples; F1/F2 fail; main URL lacks diagnostics |
| Actual action/AI/outcome automation, viewport/DPR, approved deployment | Existing full battle/picking/layout suite plus new diagnostics regression; preview build verified; main URL is older; 171 configured tests passed |
| Explicit deferred scope | Listed below |

Deferred: saves/resume follow-up, short route, inventory/equipment, procedural generation, advanced combat, editor, analytics and backend. No new art, audio feature or battle rules are included.

Only the existing separately approved beta release path is allowed. Do not install or depend on unmerged PR #12, alter production Access, or introduce an upload/deployment mechanism. Missing intended served build, physical evidence or audio keeps #11 open and the PR draft with `Refs #11`.


## Delivery status

Implementation and evidence collection are ready for draft review. OpenSpec progress is 10/11 tasks: physical-device task 3.4 remains unchecked. The caller supplied partial iPhone Safari/Chrome evidence in both orientations, without completing a full battle; remaining physical acceptance is pending. Performance F1/F2 and battle audio remain unmet issue acceptance gates even though their failures are measured and recorded. #11 and the epic remain open; no `Closes` reference is justified. No merge or OpenSpec archive has been performed.
