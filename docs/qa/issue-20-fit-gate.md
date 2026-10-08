# Issue #20: deployed proof measurements and physical-device fit gate

Evidence for the proof-of-fit gate (#20, parent #2). Sections 2 and 3 are the physical-device record, section 4 the deployed measurements, section 5 the comparison, section 6 the proposed budgets and section 7 the fit decision with its limitations. Collector change on `issue-20-fit-gate`: `fed3936` (`npm run measure:fit -- <output> --url <origin>`).

## 1. Build under test

| Field | Value |
| --- | --- |
| URL | https://tactics-guru-v2.pages.dev |
| Served build | `231fea0025f031b3609f4796f8f860e72363544c` (merge of PR #31), `dirty: false`, read from the served bundle's baked `__BUILD_INFO__` and confirmed by `measuredBuild` in both collector runs |
| Deployment | Cloudflare Pages automatic deploy of `main`, HTTPS, no deployment automation added and no Access change |
| Approval | dubstylee confirmed on 2026-10-07 that this auto-deploy counts as the approved beta URL for this gate: https://github.com/luminari-gurus/tactics-guru-v2/issues/20#issuecomment-6045490375 |

## 2. Physical-device checklist

The diagnostic named in #20 (occlusion, selection after pan/zoom, tap versus drag, one animated move, audio unlock, resize, suspend/resume, repeated restart) plus the §6 lifecycle checklist of [issue-19-lifecycle.md](issue-19-lifecycle.md), run on the build above on 2026-10-07. Physical runs were reported as whole-list passes with no per-item notes and no on-screen errors; the per-item rows below restate that report. Sources: Android https://github.com/luminari-gurus/tactics-guru-v2/issues/20#issuecomment-6045359857, desktop https://github.com/luminari-gurus/tactics-guru-v2/issues/20#issuecomment-6045679543. The iPhone Chrome and iPhone Safari rows were recorded by dubstylee directly in the #20 acceptance checklist and its "Hardware verification evidence" section on 2026-10-07: Brian verified on physical devices that all testable functions are operational, including sound on iPhone Chrome. Per-scenario coverage, device model, iOS and browser versions and measurements were not supplied, so the lifecycle rows and the iPhone-only rows below are marked not recorded.

| Check | Android: Brave, Chrome, Edge, Samsung Internet | Desktop browser | iPhone Safari | iPhone Chrome |
| --- | --- | --- | --- | --- |
| Load to Ready, board visible | pass | pass | pass as reported | pass as reported |
| Tap selects, drag pans, pinch zooms | pass | pass (wheel for zoom) | pass as reported | pass as reported |
| Selection correct after pan and zoom | pass | pass | pass as reported | pass as reported |
| Occlusion fixtures and tree opacity | pass | pass | pass as reported | pass as reported |
| Animated move completes once | pass | pass | pass as reported | pass as reported |
| First-gesture audio unlock | pass | pass | pass as reported | pass as reported (sound confirmed) |
| Pan-first audio unlock | pass | pass | not recorded | not recorded |
| Retry after Blocked | n/a, never Blocked | n/a, never Blocked | not recorded | not recorded |
| Resize: rotate / narrow and wide window | pass (portrait and landscape) | pass (narrow and wide) | pass as reported | pass as reported |
| Backgrounded during move: frozen, completes once | pass | pass | not recorded | not recorded |
| Pointer held across app switch | pass | pass | not recorded | not recorded |
| Return after a long background | pass | pass | not recorded | not recorded |
| Repeated restart (5+) | pass | pass | pass as reported | pass as reported |
| Browser toolbar collapse | pass | n/a | not recorded | not recorded |
| Page gestures: no zoom, selection, callout, pull-to-refresh, context menu | pass | pass | not recorded | not recorded |
| Slow network stall | not run (optional) | not run (optional) | not recorded | not recorded |
| Safe areas | not recorded | n/a | not recorded | not recorded |
| Silent switch, interrupted context, Ogg probe, Low Power Mode | n/a (iPhone rows) | n/a | not recorded | not recorded |

Orientation coverage: every Android check in portrait; load, tap/drag/pinch, animated move and repeated restart also in landscape. Desktop at a narrow and a wide window.

## 3. Device record

| Field | Android | Desktop | iPhone Chrome and iPhone Safari |
| --- | --- | --- | --- |
| Device / OS version | Android phone; model and OS version not recorded | not recorded | not supplied |
| Browser versions | Brave, Chrome, Edge, Samsung Internet; versions not recorded | not recorded | not supplied |
| Network / cache conditions | not recorded | not recorded | not supplied |
| Console errors | not captured (needs USB remote debugging); no on-screen error in any browser | not captured; no on-screen error | not captured; "all testable functions operational" as reported |
| Measurements JSON per browser | not captured | not captured | not supplied |
| Low Power Mode | not recorded | n/a | not recorded |

The Android and desktop blanks are accepted by the assignee for this pass; the iPhone blanks are stated in the issue body itself. All are listed again under limitations (§7). On-device bytes and timing therefore come from the collector in §4, which is emulation on this host, not device evidence.

## 4. Deployed measurements

Collector: `scripts/measure-fit.ts` at `fed3936`, run on 2026-10-07 19:57–19:58 UTC. Host: Linux 6.6.114.1 (WSL2), Intel Core Ultra 9 285H, Node v24.15.0, Playwright 1.63.0 with its own Chromium 153.0.8010.12, headless, software rendering. Three fresh-context cold loads and three same-context warm reloads per profile (desktop, Pixel 7 portrait, Pixel 7 landscape emulation); frame statistics are the first ≥120 active scene-update intervals at idle, no interaction workload. All 36 samples had zero console and page errors. Raw results: [fit-deployed-231fea0.json](issue-20/fit-deployed-231fea0.json), [fit-local-fed3936.json](issue-20/fit-local-fed3936.json).

Two runs, back to back:

- **Deployed**: `--url https://tactics-guru-v2.pages.dev`, host network over HTTPS through the Cloudflare CDN, no throttling; CDN edge cache state not controlled. `measuredBuild` = `231fea0`.
- **Local**: the same source tree served by Vite preview on loopback (`fed3936`, whose bundle differs from `231fea0` only in the baked build info, because the collector change is not bundled). Same host, minutes apart, so the difference between the two runs is the network.

Medians of three; timings are milliseconds from navigation start; frame columns are medians of the per-run p50/p95.

| Profile | Cache | Transferred bytes deployed / local | Controls usable ms deployed (min..max) / local | Frame p50 ms deployed / local | Frame p95 ms deployed / local |
| --- | --- | ---: | ---: | ---: | ---: |
| desktop | cold | 7,768,020 / 7,767,539 | 1,712 (1,364..2,092) / 367 | 16.7 / 16.7 | 17.0 / 16.9 |
| desktop | warm | 4,572 / 3,600 | 570 (387..682) / 314 | 16.7 / 16.7 | 17.0 / 16.9 |
| mobile-portrait | cold | 7,768,261 / 7,767,539 | 1,577 (1,089..2,064) / 293 | 16.7 / 16.7 | 16.9 / 16.9 |
| mobile-portrait | warm | 4,572 / 3,600 | 570 (333..574) / 259 | 16.7 / 16.7 | 16.9 / 16.8 |
| mobile-landscape | cold | 7,768,020 / 7,767,539 | 1,130 (1,062..1,688) / 283 | 16.7 / 16.7 | 16.9 / 16.9 |
| mobile-landscape | warm | 4,572 / 3,600 | 333 (330..551) / 276 | 16.7 / 16.7 | 16.9 / 16.9 |

Cold transfer by resource (desktop, deployed, first sample; identical sizes in every cold sample):

| Resource | Transferred bytes | Share | Duration ms | Note |
| --- | ---: | ---: | ---: | --- |
| `proof/fighter-portrait.png` | 3,285,410 | 42.3% | 1,305 | 1254 × 1254 RGB PNG, displayed at 48 × 48 CSS px |
| `proof/grass-material-v1.png` | 2,980,661 | 38.4% | 1,266 | 1254 × 1254 RGB PNG |
| `proof/tree-grass-v1.png` | 1,117,792 | 14.4% | 925 | 1233 × 1276 RGBA PNG |
| `assets/start-*.js` (Phaser and scene) | 363,583 | 4.7% | 149 | 1,394,209 bytes decoded; compressed by the CDN |
| `proof/fighter.png` | 9,143 | 0.1% | 82 | 64 × 80 |
| HTML, CSS, two small JS chunks, two tone files | 11,372 | 0.1% | | |

Reading: the three large PNGs are 95.1% of the cold transfer and the three slowest requests, so the deployed cold load is bound by asset bytes, not by the engine. Code (HTML, CSS, JS) is 369,125 bytes compressed. Warm reloads transfer only revalidations plus the HTML document, which Pages re-serves (972 bytes encoded) where the local preview answers 304. Frame intervals sit at the 16.7 ms display interval in every profile and cache state, with p95 within 0.3 ms of it; the one-off maxima (34–38 ms on desktop) are single frames at scene start.

## 5. Comparison

| Reference | Conditions | Cold bytes | Cold usable ms | Warm usable ms | Frame p50 / p95 ms |
| --- | --- | ---: | ---: | ---: | ---: |
| #14 empty scene, [issue-14-baseline.md](issue-14-baseline.md) | loopback preview, Chrome 154 headless, other host | 360,339 | 184–198 | 116–118 | 16.7 / 18.1–18.5 |
| #19 branch `9c3fbf2`, [issue-19-lifecycle.md](issue-19-lifecycle.md) §5 | loopback preview, this host | 7,767,267 | 565–648 | 478–665 | 16.7–24.3 / 27.7–40.8 |
| This note, local `fed3936` | loopback preview, this host | 7,767,539 | 283–367 | 259–314 | 16.7 / 16.8–16.9 |
| This note, deployed `231fea0` | pages.dev over HTTPS, this host | 7,768,020 | 1,130–1,712 | 333–570 | 16.7 / 16.9–17.0 |

- Against the empty-scene baseline, the completed diagnostic transfers 21.6× the bytes, almost entirely the three PNGs, and reaches usable controls about 100–170 ms later on loopback. The engine's own cost (Phaser chunk 363 kB compressed in both) is unchanged.
- Against the #19 loopback run of the same content, today's loopback numbers are 200–350 ms faster to usable with tighter frames; that run was taken under load on the same software-GL host and recorded as noisy, so the honest reading is that the loopback figures lie in a 280–650 ms band on this host.
- Deployed versus loopback, same host and minutes apart: the network adds about 850–1,350 ms to the cold load and about 60–260 ms to a warm reload. Frame timing does not change with the network.
- **Old deployed game: comparison unavailable.** No URL for it is recorded anywhere in this repository and none was supplied; marked explicitly as not compared.

## 6. Proposed budgets

Proposed from the measurements above and agreed as proposed by the assignee when closing #20 on 2026-10-07 (https://github.com/luminari-gurus/tactics-guru-v2/issues/20#issuecomment-6046571556); none is asserted by code. "Deployed" means the collector against the approved URL from a wired or Wi-Fi host.

| Budget | Proposed limit | Evidence | Current build |
| --- | --- | --- | --- |
| L1 Cold load to usable controls, deployed | ≤ 2,500 ms | medians 1,130–1,712 ms, worst sample 2,092 ms | passes |
| L2 Warm reload to usable controls, deployed | ≤ 750 ms | medians 333–570 ms, worst sample 682 ms | passes |
| L3 Code transfer (HTML, CSS, JS), cold | ≤ 400 kB compressed | 369,125 bytes | passes |
| L4 Asset transfer per scene, cold | ≤ 1.5 MB | 7,398,836 bytes at `231fea0`; the three PNGs were 95% of the cold load and would take about 6 s alone on a 10 Mbit/s connection, which would break L1 on a mobile radio. After the #35 re-export ([issue-35-proof-asset-export.md](issue-35-proof-asset-export.md) §8): 1,412,374 bytes in every cold sample, both on loopback at `1330f58` and on the Cloudflare Pages preview of PR #37 at `6a45b38`; the main-deploy figure follows the merge | **fails** at `231fea0`; **passes** at `6a45b38` (preview deploy; main pending merge) |
| F1 Frame intervals at idle | p50 ≤ 16.7 ms, p95 ≤ 20 ms | 16.7 / 16.9–17.0 ms in every profile | passes |
| F2 Frame intervals during pan, zoom and the move | p95 ≤ 33.4 ms (two display intervals) | no numeric sample yet: the collector has no interaction workload and the on-device Measurements JSON was not captured | not measured |
| I1 Interaction response | tap-to-select and drag-to-pan visible on the next frame | tester observation only; no instrumentation exists | observed, not measured |

L4 is the one measured failure. Fixing it is asset work (re-export the proof PNGs at their display resolution, for example the portrait at 96 × 96 for 2× DPR) and not engine work, so this note does not fix it; per #20 the loading gate stays open on L4 until the assets are re-exported or the budget is agreed at a different number. F2 and I1 need instrumentation or on-device captures before they can be asserted.

## 7. Fit decision and limitations

**Decision: Phaser 4.2.1 is fit for the first-battle tranche, with the loading gate held open on L4 under #35.** On every physical browser tested (four Android browsers, one desktop browser, and iPhone Chrome and iPhone Safari as reported on the issue) the diagnostic passes with no functional failure, no on-screen error and no audio, lifecycle or gesture defect, and the collector found zero console errors in 36 deployed and loopback samples. The engine's cost is small and stable: 363 kB compressed, frames at the display interval, usable controls within 1.1–1.7 s over the real CDN. The only measured failure is the weight of the proof art, which is independent of the engine. Recorded as final in the closing comment on #20; the asset re-export is tracked by #35.

Outstanding limitations, accepted as recorded when #20 was closed:

1. iPhone Chrome and iPhone Safari are recorded as functional acceptance only ("all testable functions are operational"); the lifecycle scenarios and the iPhone-only checks (silent switch, interrupted context, Ogg probe, Low Power Mode) were not itemised, and no device model, iOS or browser versions were supplied.
2. No device model, OS version, browser versions or network conditions were recorded for the Android, desktop or iPhone passes; no per-browser Measurements JSON, no on-device console log, no on-device bytes or timing. All numbers in §4 are emulation on one WSL2 host with software rendering.
3. L4 fails; F2 and I1 are unmeasured.
4. The old deployed game was not compared (no accessible URL).
5. The cold deployed numbers include whatever state the Cloudflare edge cache was in; the three cold samples per profile agree within 50% on timing and exactly on bytes.
6. The slow-network stall check was not run on any device.

## 8. Verification

Commands run on the branch at `fed3936` (host as in §4):

- RED: `npx vitest run tests/unit/measureFitOptions.test.ts` failed before `scripts/measure-fit-options.ts` existed (`Failed to resolve import`).
- `npx vitest run tests/unit/measureFitOptions.test.ts`: 5 passed. `npm run test:unit`: 36 passed (31 before, 5 new).
- `npm run typecheck`: passed after adding `allowImportingTsExtensions` (Node's type stripping needs the explicit `.ts` import; `noEmit` is already set). `npm run build`: passed; the Phaser chunk-size warning remains.
- `npm run measure:fit -- docs/qa/issue-20/fit-deployed-231fea0.json --url https://tactics-guru-v2.pages.dev`: 18 samples, build `231fea0`, zero errors.
- `npm run measure:fit -- docs/qa/issue-20/fit-local-fed3936.json`: 18 samples, build `fed3936`, zero errors; the new local-mode assertion (served build must equal source HEAD) held.
- `npm test`: 90 passed in 2.9 min across desktop, mobile-portrait and mobile-landscape, run after the two collector runs so no browser workloads overlapped.
- `git diff --check`: clean.
