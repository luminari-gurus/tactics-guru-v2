# Device acceptance closeout — 2026-10-17

The caller explicitly accepts Playwright evidence, including device emulation, for all work unless physical testing is requested for that task. [Guidance PR #125](https://github.com/luminari-gurus/tactics-guru-v2/pull/125) is merged on main `13418626fab4cc40609cd2255d54800c15e34805`. Historical physical-only requirements do not reinstate a hardware gate. Actual software failures remain failures.

[PR #126](https://github.com/luminari-gurus/tactics-guru-v2/pull/126) contains the validation repairs and this closeout evidence. New branch: `work/device-acceptance-closeout`, distinct from both merged PR branches. Original checkout edits are preserved. No deployment, hardware run or production activation was performed.

## Functional validation and necessary repairs

Initial WebKit validation on the application-equivalent main baseline passed 48/52 cases. Two audio checks required Chromium-only CDP and two run-recovery checks demonstrated keyboard focus escaping the modal. Touch-enabled profiles now use native Playwright touchscreen taps, retaining CDP for desktop Chromium. The existing BattleDialogs owner explicitly cycles all enabled choice buttons on Tab/Shift+Tab, including when focus starts on the dialog itself. The regression checks both directions and every recovery choice.

After that repair the expanded WebKit matrix passed 52/54. The newly included startup/recovery touch case exposed a separate actual invoker problem in both orientations: WebKit does not focus a tapped button, so closing recovery returned to an older focused control. The Save recovery click handler now focuses its own invoker before opening the same modal. All six affected WebKit audio/run/recovery cases subsequently passed, including the two formerly failing cases. No command, save-format, combat, content, dependency or presentation-timing behavior changed.

| Check | Result / identity |
| --- | --- |
| Initial WebKit portrait/landscape matrix | 48 passed / 4 failed; baseline build `2251044`, failures retained |
| WebKit after Tab repair | 52 passed / 2 failed; build `40def1e`, failures retained |
| Affected WebKit after touch-invoker repair | 6 passed / 0 failed; clean runtime `a362aaa` |
| Chromium focus/keyboard/recovery across desktop and Android portrait/landscape | 24 passed / 0 failed on `a362aaa` |
| Authored encounters / run items | 18 / 21 passed on `a362aaa` |
| Unit / content / both typechecks / production build | 674 unit, 167 content; typechecks/build passed; existing large-chunk warning |
| Codec measurement | 160 successful validated round trips from eight existing legal/bounded fixtures |

The complete 54-case WebKit matrix was not repeated after the final one-button focus repair; the affected six cases and the broader Chromium/posttest regressions were rerun. Coverage is staged, not a claim that every case passed in one final full-suite run. Merged #124 retains the earlier full Chromium suite's 452 initial passes plus the repaired rotation case's nine passing repeats. That older broad run is supporting evidence, not a new full-suite execution of the focus fixes.

Environment: macOS host, Playwright 1.63.0, installed Chrome 155.0.8059.80 and Playwright WebKit 26.6/revision 2359. Chromium profiles: desktop 1280x720, Pixel 7 portrait and 915x412 landscape. WebKit: iPhone 13 portrait/landscape, including narrow 320x568 and 568x320 control checks. WebKit represents the iOS engine/device dimensions, not branded physical Safari/Chrome apps. Real reload and visibility hooks model lifecycle; no actual OS discard is claimed. This is sufficient evidence under the caller's policy.

## Full-run observations

Both WebKit orientations completed all three legal encounters, rewards, preparation/healing, final resume and a fresh restart through production controls. Stored per-encounter replays reproduce state/events; player/enemy reload tests compare the resumed next decision/RNG against uninterrupted controls. Unit fixtures cover carryover, defeated heroes, duplicate/stale transitions and equipment nonaccumulation. No state, HP or outcome was forced for legal playthrough evidence.

Representative seed-13 final battle boundaries:

| Encounter | Accepted commands | Surviving party HP at victory |
| --- | --- | --- |
| Forest Ruins | 37 | Fighter 10, Ranger 12, Mage 11 |
| Woodland Crossing | 34 | Fighter 16, Ranger 12, Mage 3 |
| Ruined Approach | 41 | Fighter 6, Ranger 0, Mage 0 |

The run showed increasing attrition and completed with one surviving hero. Reward/healing/preparation and boundary resume remained usable in both orientations. The approved authored values were retained; there are no tuning changes or invented duration/legacy-parity promises. Automated execution time is not a manual-play duration estimate. Existing battle-target touch sizing limitations remain owned by #111 / PR #119; this audit does not claim that pending HUD implementation is merged.

## Loading, transfer and frame budgets

Sequential, unthrottled deployed captures measured the same clean release `1341862` on https://tactics-guru-v2.pages.dev/ and `/run`: 18 samples per route, three cold fresh-context and same-context warm measurements per desktop/Android portrait/landscape profile. No capture or console/page error was reported. Code transfer uses navigation plus JS/CSS response transfer sizes, including response overhead; assets use the remaining same-origin scene resources. CDN edge cache is uncontrolled.

The existing collector otherwise stalls at the saved-game Continue prompt on warm reload. The retained collector copy clears only its own isolated context's four v2 save keys before warm navigation, preserving HTTP cache and starting the same fresh battle. It never touches the user's browser or legacy keys. Run capture uses actual Start new run / Start encounter controls; their automated interaction cost is included. Legitimate hero-first run starts are not misclassified as missing enemy-startup movement. Saved-game resume is measured separately below. No production source or budget was changed to make collection pass.

| Metric | Battle maximum | Run maximum | Accepted limit / actual result |
| --- | --- | --- | --- |
| Cold usable | 1363.5 ms | 997 ms | 2500 ms; pass |
| Warm usable | 657.2 ms | 705.9 ms | 750 ms; pass |
| Cold code transfer | 409,064 bytes | 417,514 bytes | 400,000 bytes; **all nine cold samples fail on each route** |
| Scene asset transfer | 848,829 bytes | 848,829 bytes | 1,500,000 bytes; pass |
| Idle p50 | 16.7 ms | 16.8 ms | 16.7 ms; battle passes, one run warm sample fails |
| Idle p95 | 18.6 ms | 18.7 ms | 20 ms; pass |
| Pan/zoom/move p95 | 22.4 ms | 21.4 ms | 33.4 ms; every window passes |

Only floating arithmetic noise below 1e-6 ms is ignored, matching the existing method. The 16.799999952316284 ms run sample is a failure, not rounding noise. No retry was used to erase any failed budget sample. [Issue #127](https://github.com/luminari-gurus/tactics-guru-v2/issues/127) owns the actual transfer/frame failures. #57, #64 and #81 retain these software acceptance gates; physical hardware availability is no longer a blocker.

## Save/resume timings

Forty-five exact-state resume measurements used three fresh contexts per profile on local clean runtime `a362aaa`: desktop Chromium, Android-sized Chromium portrait/landscape and iPhone-sized WebKit portrait/landscape. Each used two warm saved reloads plus one fresh-context cold HTTP-cache resume seeded with the real saved bytes via browser storageState. Continue was activated through real controls; authoritative state matched after every restore, with no page/console errors. Cold/warm values include automated Continue interaction, not a human waiting at the prompt.

- Cold navigation-to-player maximum: 319 ms (L1 2500 ms); warm maximum: 208 ms (L2 750 ms).
- Continue-click-to-player maximum: 102 ms. The two timings are reported separately and not treated as the same metric.
- Guarded real localStorage writes: maximum observed call duration 1 ms, subject to browser timer resolution.
- Host Node codec round trips: encode median/p95/max 0.0664/0.113/0.2188 ms; validated decode 0.0602/0.116/0.2611 ms. No standalone encode/write/decode budget is documented, so no such budget is invented or claimed passed.

Functional reload/presentation tests separately verify next-command/RNG/enemy equivalence, no replayed historical audio/animation, ended/new/restarted saves, corruption/future versions, backup/export/reset, unavailable storage, held keys and stale recovery review. Existing codec/storage unit fixtures retain malformed/oversized/unsafe-number/unknown-ID/invariant/corruption/compatibility rejection and legacy-key separation. Origin-scoped best-effort storage and upgrade limitations remain documented in docs/battle-storage.md.

## Issue dispositions

| Issue | Evidence-backed disposition |
| --- | --- |
| #66 intermittent Safari restart | Validated for closure as unreproduced under the caller's emulation policy. Fresh legal WebKit loss/victory outcome restarts passed in both orientations, alongside Chromium regressions and repeated sound/restart lifecycle checks. Original iPhone error/stack/build remain unavailable and the historical failure/successful retry are retained. No causal fix or physical-device success is asserted; reopen if the error recurs with evidence. |
| #74 persistence / parent #58 | Acceptance is verified on the repaired runtime; PR #126 closes these on merge, because the required recovery-focus fix is not yet on main. All eight parent save/resume criteria map to codec/storage unit coverage, paired reload/RNG checks, recovery/export/explicit reset, guarded failures, v2 namespace separation, presentation-boundary saves, replacement/new-seed cases and the accepted browser/timing matrix above. |
| #64 battle certification | Device matrix and evidence collection are complete, but keep open for the measured software budget failures in #127 and reference the recovery repair in PR #126. Do not present this as a remaining hardware requirement or a universal readiness pass. |
| #81 full-run certification | Legal full-run/reward/resume/playtest evidence is complete with unchanged approved content; keep open for #127's actual transfer/idle failures. Parent #59/#60 acceptance is not closed by proxy. |
| #57 readiness | Keep open for #127; the old accepted baseline does not turn newly measured failing budgets into passes. |

Release target selection and production authorization in #83–#85 / PR #12 remain separate. The caller's device policy does not authorize deployment or close unrelated product/release decisions.

## Reproduction and evidence

[Evidence directory and source hashes](device-acceptance-2026-10-17/validation.json). Restore the retained measure.ts.txt and resume.mjs.txt to `tmp/device-acceptance/`, and evaluate.py to `/tmp/tg-device-evaluate.py`, to preserve their relative paths/output names. The codec measurement source can be restored temporarily to tests/unit/deviceAcceptanceTiming.test.ts and run explicitly; it is retained as a measurement tool, not added to every CI unit run. No dependencies changed.

```sh
npm run build
npm run test:unit
npx playwright test -c playwright.device-acceptance.config.ts
# Affected WebKit cases after the final one-button repair:
npx playwright test -c playwright.device-acceptance.config.ts --grep 'startup is read-only|run startup preserves|sound control uses'
# Chromium commands use the existing PLAYWRIGHT_CHROMIUM_EXECUTABLE override:
npx playwright test tests/battle-audio.spec.ts tests/battle-persistence.spec.ts tests/run-progression.spec.ts tests/battle-loop.spec.ts --grep 'sound control uses|startup is read-only|run startup preserves|player HUD|keyboard-only|held confirmation|review: recovery dismissal'
npm run posttest
node --experimental-strip-types tmp/device-acceptance/measure.ts /tmp/tg-device-battle-perf.json --scene battle --url https://tactics-guru-v2.pages.dev
node --experimental-strip-types tmp/device-acceptance/measure.ts /tmp/tg-device-run-perf.json --scene battle --url https://tactics-guru-v2.pages.dev/run
node tmp/device-acceptance/resume.mjs
python3 /tmp/tg-device-evaluate.py
git diff origin/main...HEAD --check
```

Run browser workloads sequentially during performance capture. Captured text logs normalize trailing whitespace only; JSON and PNG bytes retain their hashes. Screenshots include both WebKit run rewards/victory and final recovery states. These are scoped acceptance checks, not a new full repository-wide browser run after the focus repairs.
