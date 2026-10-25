# Tasks

Caller explicitly approved this published plan in chat on 2026-10-25 ("Approved"). Issue #155; caller `dubstylee`; branch `work/issue-155-overworld-enemy-movement`; base `d5b19279a869501205e98856ebd5e5f91f8c287d`. Follow the design's acceptance mapping and proportional verification selection. Physical platforms available/required: none/none; browser/device emulation is sufficient.

## 1. Pure movement and reproducibility

- [x] 1.1 Verify explicit approval of this exact published plan, record it here, and recheck branch/base/issue identity before implementation; confirm only approved task work is present.
- [x] 1.2 Add the readonly movement wrapper and validated per-enemy configuration without altering OverworldMarker, markers-v1 placement or terrain; extend existing map units for valid/invalid profiles, immutable inputs, default assignments and independent seeded RNG, and document configuration in docs/overworld-map.md.
- [x] 1.3 Implement passive neighbor selection and aggressive inclusive Manhattan detection/idle/loss rules; verify enclosed and free wandering, exact-range/beyond-range, no-occlusion and moved-player model fixtures, deterministic draws and no mutation; document the selected visibility rule.
- [x] 1.4 Implement bounded BFS toward free player-adjacent cells and fixed ID occupancy updates; verify detours, unreachable/occupied approaches, adjacency, collision conflicts, no swaps and tie breaks across repeated-step seed/type/biome corpora; retain untouched terrain/placement and battle-RNG assertions and document path rules.

## 2. Real map integration and lifecycle

- [x] 2.1 Retain simulation in the view, project moving markers without rebuilding controls, and show behavior/range labels visibly and accessibly; extend real-route tests for both profiles, correct positions, unchanged counts, pending seed edits, keyboard focus and native touch, and update the map contract.
- [x] 2.2 Add one visible-only 1000ms scheduling loop, reversible pagehide/pageshow suspension, idempotent disposal and map-only hot-disposal wiring; verify hidden-time pause, full-delay resume, no catch-up/double scheduling, departure/remount, late callbacks and actual BFCache restoration where available; document any unverified restoration gate.
- [x] 2.3 Reset simulation atomically on successful Generate/New seed/type/biome actions while preserving failed-regeneration state, art selection and pending input; adapt existing static-marker checks with controlled time and verify delayed art success/network/decode, invalid seed and dev placement failure without resets/draws; retain an independent real-time movement smoke and document reset semantics.

## 3. Final acceptance and delivery

- [x] 3.1 Run final affected map units, content/type/production build and discovered map browser coverage on desktop and emulated portrait/landscape, including 320px keyboard/touch screenshots; run explicit dev placement and root/prefix route checks from design, retain source/build-bound results and visually review images in docs/qa/issue-155-overworld-movement.md. Preserve failures/skips/retries and explain excluded unrelated suites.
- [x] 3.2 Compare every issue criterion and spec scenario against final evidence, verify strict OpenSpec and git diff checks, commit only issue changes and push; create/reuse and attach a PR with approval and evidence links, using Closes #155 only if all acceptance gates pass, otherwise a draft with Refs #155 and remaining work.

## Workflow follow-up

- End planning by requesting approval; do not implement in the planning turn.
- Do not merge, close the issue manually, deploy or archive automatically. Archive only after merge and a separate request.

Delivery: [PR #246](https://github.com/luminari-gurus/tactics-guru-v2/pull/246). Initial delivery tasks complete; review follow-up below. No merge or archive performed.


## 4. Caller-authorized review follow-up

The caller explicitly requested the first five grouped fixes from the feedback assessment on 2026-10-25; no additional approval is pending.

- [x] 4.1 Add visible numbered enemy markers and matching legend keys; verify rendered glyphs/legend correspondence in the browser and review updated desktop/mobile/320px screenshots.
- [x] 4.2 Replace the weak contention fixture and add a dead-end/U-shaped shortest-path fixture; verify both enemies really choose the same only exit when free and that the shortest escape initially increases distance and arrives in 14 steps.
- [x] 4.3 Select native clock via explicit tags, atomically capture marker/step/description state and assert monotonic cached-page advancement; verify the native smoke and real BFCache checks without installing a fake clock after navigation.
- [x] 4.4 Add keyboard/touch Pause/Resume, preserve pause through regeneration/art/visibility and resume after a full interval; verify no hidden RNG/position/step advancement and accessible control state/size.
- [x] 4.5 Directly invoke the returned disposer twice and test hidden artwork completion; correct the main entry's full-reload cleanup hook and documentation, verifying idempotence, detached listeners and deferred DOM updates.
- [ ] 4.6 Run affected units, build/type/content, full map preview and explicit dev interception cases plus root/prefix routing on final relevant inputs; retain failures and new receipts/screenshots, update PR #246 and confirm published branch parity without merge.
