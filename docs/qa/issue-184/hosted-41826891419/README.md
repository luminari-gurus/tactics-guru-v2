# Hosted verification 41826891419

[Run 41826891419](https://github.com/luminari-gurus/tactics-guru-v2/actions/runs/41826891419) tested commit `f51d73ae9e39ba3c73932efd21be025e37b05034` on GitHub-hosted Ubuntu after the caller authorized hosted verification for PR #279. Source, build, runtime, reports, and timing samples are retained here; the run artifact also contains browser failure attachments.

Setup, build, affected units, WebKit exploration consumers, and maximum-floor Chromium passed. Chromium consumers had 206 passes and one failure: the mobile-landscape main-menu unsaved-play case expected “Movement refused” but observed the unsaved-play warning. The same test exists on the exact base; attribution remains unverified.

The failure attachment shows a guardian battle already active. The test clicks the first enabled direction before attempting the blocked movement, and moving enemies can start an encounter during that step. The test and its session/startup files have no diff from exact base `fbf82420b82674dc5f57397d68b0a50c8bf485c0`; a repeated exact-base run is needed to distinguish a pre-existing random-seed failure from an effect of the changed generation or movement logic.

All three maximum-floor WebKit frame-p95 cases failed the 33.4 ms budget (desktop 53 ms, portrait 43 ms, landscape 42 ms). Their corresponding behavior cases passed. The existing budget is unchanged; these hosted measurements do not establish equivalence with the previous self-hosted performance environment. Further investigation and passing verification remain required.

WebKit synchronous click-handler P95 was 25/23/28 ms (desktop/portrait/landscape), below the limit, while the frame samples were consistently longer. This isolates the failing measurement to the complete frame interval rather than the synchronous handler alone, but does not distinguish rendering from scheduling. Similar frame-budget failures were recorded on the self-hosted runner in runs 41772062741 and 41778532804, so the hosted machine alone cannot explain the issue.
