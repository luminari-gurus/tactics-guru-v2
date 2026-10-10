# Issue #11: battle device and performance evidence

Issue: https://github.com/luminari-gurus/tactics-guru-v2/issues/11. Approved plan: `issue-11-device-performance`, published at `144fde6`, explicitly approved by the caller on 2026-10-10. Branch: `work/issue-11-device-performance`; base main `9f785df`.

## Capture method

Use a clean committed checkout and `npm run build`. Do not run other browser workloads during measurement. With the installed Chrome executable on this host:

```sh
export PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
npm run measure:fit -- /tmp/issue-11-proof.json
npm run measure:fit -- /tmp/issue-11-battle.json --scene battle
npm run measure:fit -- /tmp/issue-11-deployed.json --scene battle --url https://tactics-guru-v2.pages.dev
```

Proof remains the default. Each run uses three fresh-context cold loads and same-context warm reloads for desktop, Pixel 7 portrait and landscape. No request routing or cache disabling. Record host/browser/network/CDN conditions and the served build, not just collector source. Local inventory includes file hashes. Errors/mixed builds fail the run after writing evidence; timeout writes completed samples and a failed-capture snapshot.

Battle controls-usable time is navigation-relative until the initial enemy presentation settles and a player can act. Idle frame samples are visible post-render intervals while a player can act, excluding workload windows. Frames use nearest-rank p50/p95, at most 600 per window. Action windows retain up to 60 records: 250 ms after selection/pan/zoom input, extended during a move presentation. Input response runs from accepted input handling to its first post-render callback after a synchronous presentation change; it is an engine-render proxy, not physical input dispatch latency or proof of display scanout. Unchanged/clamped camera inputs do not produce response records. Hidden intervals/pending input are discarded; restart resets the run and detaches the prior render callback. No domain commands/RNG decisions come from instrumentation.

The collector snapshots idle diagnostics before its wheel zoom, eight-step drag pan, legal Move target selection and Review/Confirm move. The workload targets the visible player controls; it injects no outcomes, HP or battle state. Full legal wins/losses and all signatures remain verified by `tests/battle-loop.spec.ts`, not by this short performance workload.

## Budgets and results

Results pending capture. Compare to [#20](issue-20-fit-gate.md) and the post-export [#35 baseline](issue-35-proof-asset-export.md). Report each sample, ranges and medians; differing hosts/browser builds cannot establish causal speedups.

| Gate | Existing agreed proof-derived limit | Battle status |
| --- | --- | --- |
| L1 cold deployed usable | ≤2500 ms | Unverified |
| L2 warm deployed usable | ≤750 ms | Unverified |
| L3 cold compressed code | ≤400000 bytes | Unverified |
| L4 cold scene assets | ≤1500000 bytes | Unverified |
| F1 idle intervals | p50 ≤16.7 / p95 ≤20 ms | Unverified |
| F2 pan/zoom/move intervals | p95 ≤33.4 ms | Unverified |
| I1 selection/pan | visible by next frame | Engine-render proxy only; physical unverified |

Classify navigation/HTML/CSS/JS as code, same-origin scene resources as assets, and unknown cross-origin timing explicitly. Zero transfer can indicate a cache hit, not zero resource size. Preserve failures; do not rerun until limits pass or silently loosen thresholds.

## Physical-device record

All rows are pending. Historical proof-scene hardware reports do not certify the authored battle. For each row record date, tester/source, device model, OS/browser versions, URL and served commit, cache/network, orientation, screenshots/logs, raw measurements and every checklist item below.

| Browser | Portrait | Landscape | Device / OS / browser / build / conditions |
| --- | --- | --- | --- |
| iPhone Safari | Unverified | Unverified | Not supplied |
| iPhone Chrome | Unverified | Unverified | Not supplied |
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
- Unit suite: 264 passed; content validation: 77 passed. Typecheck/build pass; existing Phaser chunk-size warning remains. Full browser suite and committed captures pending.

| Issue acceptance criterion | Evidence / unresolved gate |
| --- | --- |
| Physical win/loss/restart, four browsers × two orientations | Matrix pending; automatic battle tests are supporting evidence only |
| Gestures, safe areas, chrome resizing, audio, suspension, errors | Existing and added battle checks; physical checklist pending; battle audio absent |
| Reproducible deployed budgets and proof baseline comparison | Collector ready; capture/budget table pending |
| Actual action/AI/outcome automation, viewport/DPR, approved deployment | Existing full battle/picking/layout suite plus new diagnostics regression; deployed build unverified |
| Explicit deferred scope | Listed below |

Deferred: saves/resume follow-up, short route, inventory/equipment, procedural generation, advanced combat, editor, analytics and backend. No new art, audio feature or battle rules are included.

Only the existing separately approved beta release path is allowed. Do not install or depend on unmerged PR #12, alter production Access, or introduce an upload/deployment mechanism. Missing intended served build, physical evidence or audio keeps #11 open and the PR draft with `Refs #11`.
