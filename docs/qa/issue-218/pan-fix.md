# PR 241 follow-up: keep Guarded attached while panning

The caller requested this fix after review of PR #241 at
`179a04800020158065c258d59e9c40362dcbba89`.

## Defect and change

`placeGuard` clamped the badge's x coordinate to the drawable viewport's left edge.
Normal camera panning could therefore leave a shield over unrelated terrain while its
Fighter was completely offscreen. Removed that clamp. The badge now retains its board-space
offset and the existing canvas clip naturally hides it with the unit. No visibility state,
effect rules, saves, HP layout, fitting bounds, camera constraints or input handlers changed.

The new regression derives an accepted hit state through the existing legal Guarded boundary,
resumes it, pans the Fighter fully offscreen, checks fixed attachment and offscreen shield
bounds, uses pinch zoom to make the offscreen condition reachable in short landscape, then reverses the camera displacement and checks the visible badge and unchanged
battle state. Chromium mobile profiles use native CDP single-touch dragging; desktop and
WebKit use real mouse drags through the existing pointer handlers.

## Verification and retained failures

- `run-SZwTcl`: the first test setup used a later legal Fighter position that could not be
  fully panned offscreen at fitted zoom. Its prerequisite assertion failed; the fixture was
  corrected to the existing earlier legal hit boundary. This is not the defect reproduction.
- `run-XfEyIO`: the corrected regression failed on the reviewed build: badge offset was
  `106.9487` instead of `−29` board pixels. This confirms the defect before the fix.
- `run-CIHPXm`: 26/27 Chromium cases passed after removing the clamp; the new landscape
  case failed its offscreen prerequisite because fitted camera bounds kept the Fighter
  partly visible. This setup limitation was fixed by pinch-zooming before the pan.
- `run-780JOh`: all three final Chromium pan regressions passed with that setup,
  including native touch pinch and drag on both mobile profiles. The preceding 24
  lifecycle/move/defeat cases have unchanged relevant assertions and helpers.
- Production build passed after the fix, including 221 content checks and both TypeScript
  scopes. Focused ability/board/health geometry units passed 40/40. Existing Vite warnings
  remain. Local Node/browser/host settings are unchanged from the original QA record.

Fresh verification selects the entire changed Guarded file: 27 Chromium cases and 18
WebKit cases, including the new pan regression in all five profiles, plus responsive
bounds/HP separation, hit/miss, reload, movement, defeat, restart and all three route hosts.
Exact commands, source/build hashes, results and retained report hashes are in
`pan-fix-results.json`. Raw logs and discovery are retained locally in
`tmp/issue218-pan-fix/` and `verification-receipts/browser-runs/`.

The previous 25 health-bar and 15 complete-journey cases remain valid functional evidence:
the sole runtime difference is the badge's x placement in `placeGuard`. HP positions,
health scaling, turn/session/domain logic, scene transitions, input, save admission, fixture
helpers and those suites/configurations are unchanged. Those old checks do not assert a
viewport-clamped badge position. The fresh Guarded cases cover the changed coordinate
behavior and all shared route consumers. This is behavior-based reuse; the new build has
its own hashes and is not claimed byte-identical to the original build. No full-matrix,
telemetry, asset-base or performance rerun is justified by this localized fix. All original
failed/incomplete attempts remain unchanged; browser emulation is not physical-device proof.


Implementation commit: `d512741f9ada88f81c04b4405dd957711a434a4a`.
The fresh preview bundle was built from `179a048` with the fix applied and dirty metadata;
its runtime inputs match the implementation commit. QA-only follow-ups do not change them.
[Inspected offscreen screenshot](pan-fixed-offscreen.png): the Fighter and shield are both
outside the canvas clip, with no shield pinned over the visible terrain.


Final result: **45 unique fresh Guarded cases verified** (27 Chromium across the full
invocation and focused pan recovery; 18/18 in one WebKit invocation), zero unresolved
cases and zero skips. The original Chromium invocation remains 26 passed / 1 failed
fixture prerequisite; its three affected pan cases passed after fixture correction.
Build/content/type checks, 40 focused units, documentation links and `git diff --check`
passed. Earlier unaffected 40 health/journey cases are reused as mapped above.
