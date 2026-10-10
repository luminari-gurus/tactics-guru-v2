# Issue #62: Battle audio implementation plan

## Identity and status

| Field | Value |
| --- | --- |
| Issue | [#62 — Add battle audio cues with mute and safe browser lifecycle](https://github.com/luminari-gurus/tactics-guru-v2/issues/62) |
| Parent | [#57 — First-battle performance and audio readiness](https://github.com/luminari-gurus/tactics-guru-v2/issues/57) |
| Acceptance trackers | [#11 — Device/loading acceptance](https://github.com/luminari-gurus/tactics-guru-v2/issues/11), [#1 — First playable battle](https://github.com/luminari-gurus/tactics-guru-v2/issues/1) |
| Assignee | `moshehbenavraham`, resolved with `gh api user` and verified on the issue |
| Branch | `work/issue-62-battle-audio` |
| Base | `origin/main` at `9f785dfd3e9ce703ff8ab46210f84c38890c6f2a` |
| OpenSpec change | [`issue-62-battle-audio`](../../openspec/changes/issue-62-battle-audio/proposal.md) |
| Planning date | 2026-10-10 |
| Scope of this pickup | Implement the approved battle-audio plan, verify it, and publish a reviewable PR with honest device/performance gaps. |

The user explicitly approved creating and claiming the battle-audio child after the backlog review. The subsequent explicit request to fix/implement/continue this plan authorizes implementation and PR delivery; no additional approval checkpoint remains.

## Selection and readiness evidence

The paginated open-issue scan included bodies, labels and assignees, plus comments, dependency endpoints, repository project items, branches, open PRs and merged prerequisites. Seven issues were open before creating #62; the repository had no attached project items/projects in that scan.

| Existing issue | Availability at selection |
| --- | --- |
| [#6](https://github.com/luminari-gurus/tactics-guru-v2/issues/6) | Ready label, but assigned to `dubstylee`; board work already merged through #51, remaining acceptance belongs to its owner. |
| [#11](https://github.com/luminari-gurus/tactics-guru-v2/issues/11) | Ready label, assigned to `dubstylee`, active branch and draft [PR #61](https://github.com/luminari-gurus/tactics-guru-v2/pull/61). |
| [#1](https://github.com/luminari-gurus/tactics-guru-v2/issues/1) | Acceptance epic with #6/#11 still open; not an independent implementation pickup. |
| [#57](https://github.com/luminari-gurus/tactics-guru-v2/issues/57) | Supporting epic explicitly requires scoped children; audio can proceed independently of its performance investigation. |
| [#58](https://github.com/luminari-gurus/tactics-guru-v2/issues/58) | Save/resume planning epic; #1 acceptance is its release gate, schema investigation may precede it. |
| [#59](https://github.com/luminari-gurus/tactics-guru-v2/issues/59) | Short-run epic with unresolved RunState/balance contract and dependencies on first-battle acceptance, resume and rewards. |
| [#60](https://github.com/luminari-gurus/tactics-guru-v2/issues/60) | Rewards epic awaiting the short-run state/reward contract and item/balance decisions. |

No existing unassigned issue was eligible. With the user's approval, #62 was created as a native child of #57, promoted with the exact `ready for work` label after rechecking its scope/dependencies, assigned to the caller and claimed in [this comment](https://github.com/luminari-gurus/tactics-guru-v2/issues/62#issuecomment-6101189721).

This is the best currently claimable option because it removes a known missing feature on the first-battle acceptance path without taking another person's work. Completion contributes to #57/#11, then #1; accepted #1 gates later feature delivery in #58–#60. Audio alone does not satisfy those other gates. Performance work remains important, but its current measurement work is already in #61; this child has a concrete independent integration seam and verifiable behavior on merged main.

Prerequisites are merged: #10 via [PR #55](https://github.com/luminari-gurus/tactics-guru-v2/pull/55) provides the replayable battle, and #19 via [PR #31](https://github.com/luminari-gurus/tactics-guru-v2/pull/31) provides proven proof-audio lifecycle patterns. The dependency API reported no open blocker for #62. #57 is a parent, not a blocker. Neither #61 nor deployment PR #12 is a code prerequisite.

## Inspected implementation and proposed behavior

`src/app/BattleSession.ts` already emits immutable accepted `Presentation` batches with tokens. `src/phaser/BattleScene.ts` presents them beside the HUD log and controls animation cancellation/shutdown, but creates no sound adapter. `src/phaser/ProofAudio.ts` contains gesture unlock, timeout and cleanup patterns tied to proof-only controls. `src/ui/hud.ts` owns battle controls. `src/main.ts` hides proof controls in battle mode. Only proof test-tone assets currently exist.

Add a pure event-to-cue mapping and a scene-owned optional audio adapter. Play short movement, attack miss/hit/critical, magic-missile, unit-defeat and victory/loss cues. Guarded Strike and High Shot use their recorded attack results; Magic Missile produces one cast cue for the action. Group repeated defeat events within one batch, cap feedback at four cues and one active sound, and favor the current presentation over obsolete feedback.

Sound starts disabled. An accessible Enable sound / Mute control unlocks directly from the user's gesture; mute stops current playback. Preserve the preference through in-page restarts and reset it on reload. Consume each token once, including when audio is suppressed. Never replay previews, rejected commands or events missed while muted, locked or hidden. Audio does not change domain state/RNG or delay animation/command completion.

Optional cue loading runs after battle content loading and has request plus overall load/decode deadlines. Unlock, playback, mute, interruption, hide and shutdown use bounded attempts and generation guards. Missing/corrupt/stalled media or refused playback updates sound status and leaves gameplay usable. Every owned sound, callback, listener and timer has a teardown path.

Use eight reproducibly generated short MP3 files, no more than 32 KiB total, without a new runtime dependency. The [design](../../openspec/changes/issue-62-battle-audio/design.md) specifies mapping, limits, lifecycle choices and alternatives; the [capability spec](../../openspec/changes/issue-62-battle-audio/specs/battle-audio/spec.md) defines testable behavior.

## Implementation sequence and affected files

1. Record the implementation baseline and check #61's merge status. Add RED-first pure policy cases, implement cue mapping and document/generate the small asset set.
2. Implement and test the adapter's token policy, bounded optional loading, gesture unlock, failure containment, playback sequence and lifecycle teardown.
3. Integrate accepted batches and sound controls without changing session/domain semantics. Exercise real controls, failures, all signatures, outcomes and repeated restart in browser tests; keep proof-audio regressions intact.
4. Run configured integration checks, measure comparable loading/byte deltas, document physical-device results/gaps, then deliver a scoped PR and QA handoff. Keep unverified criteria visible.

| Files | Intended change |
| --- | --- |
| `src/audio/battleCues.ts` (new) | Pure typed event policy, cue manifest and bounds. |
| `src/phaser/BattleAudio.ts` (new) | Optional loader, sound instances, token/generation lifecycle and preference/availability reporting. |
| `src/phaser/BattleScene.ts` | Small accepted-batch hook, in-page preference and teardown. |
| `src/ui/hud.ts`, `src/style.css` if needed | Accessible control/status using existing touch/layout conventions. |
| `src/diagnostics/browser.ts` | Bounded battle-audio snapshot, independent of proof diagnostics. |
| `public/audio/battle/*.mp3` (new) | Eight documented, bounded cue files. |
| `tests/unit/battleCues.test.ts`, `tests/unit/battleAudio.test.ts` (new) | Mapping, at-most-once tokens, fake-clock/failure and cleanup behavior. |
| `tests/battle-audio.spec.ts` (new) | Actual-control audio/lifecycle flows and comparable resource evidence. |
| `tests/audio.spec.ts`, `tests/battle-loop.spec.ts` | Existing regression coverage; extend only where a real coverage gap requires it. |
| `docs/qa/issue-62-battle-audio.md` (new) | Asset recipe, commands/results, raw-evidence links, budgets and hardware matrix. |

`BattleSession`, domain types/rules/RNG and the proof adapter are inspected reference seams; no behavior change to them is planned. The [checkbox tasks](../../openspec/changes/issue-62-battle-audio/tasks.md) carry completion evidence for each implementation step.

## Acceptance-to-verification map

| Issue criterion | Implementation / OpenSpec tasks | Required evidence |
| --- | --- | --- |
| AC1: committed events, all signatures, no duplicate/state/RNG effects | Cue policy and accepted token hook; 1.2, 2.1, 3.1, 3.3 | Unit event fixtures, actual legal controls, preview/cancel silence, duplicate-callback cases and seeded replay/state equality with sound on/off. |
| AC2: accessible sound toggle, gesture, mute, restart preference | Scene preference and HUD; 2.2, 3.2 | Real pointer/keyboard unlock, initial disabled state, immediate mute, enable/mute restart and reload, portrait/landscape focus and no click-through. |
| AC3: lifecycle, late work and teardown | Adapter generations/deadlines; 2.1–2.3, 3.1, 3.3 | Fake-clock late settlements, hidden/context transitions, no resume backlog, at least five restarts and owned-resource cleanup; no gameplay lock caused by audio. |
| AC4: nonfatal missing/stalled/unsupported/decode errors | Optional load and local failure handling; 2.2–2.3, 3.3 | Injected failures/timeouts, no page/console rejection, useful sound status and continued legal battle controls. |
| AC5: bounded assets/mapping, domain separation and budgets | Manifest, small adapter and evidence; 1.2–1.3, 4.2 | Cue file inventory ≤32 KiB, fixed manifest, unchanged dependencies/domain boundary, comparable raw code/asset/load results and retained failures. |
| AC6: full checks and truthful device evidence | Integration checks and QA; 3.3, 4.1–4.4 | Exact command results, actual-control flows, proof regression, hardware matrix or explicit gaps handed to #11. |

## Validation commands and evidence boundaries

These commands are the implementation verification plan; results are tracked below and in the QA note. All package scripts are present in the inspected `package.json`.

```sh
npm run test:unit -- tests/unit/battleCues.test.ts tests/unit/battleAudio.test.ts
npm run build
npm test -- tests/battle-audio.spec.ts tests/audio.spec.ts tests/battle-loop.spec.ts
npm run test:unit
npm run validate:content
npm run typecheck
npm run build
npm test
openspec validate issue-62-battle-audio --strict
git diff --check
```

Use the host's supported Playwright executable/setup, without committing a machine-specific path. Run focused behavior tests RED before implementation and record GREEN afterward. Full configured browser projects are desktop, Pixel 7 portrait and Pixel 7 landscape; these are Chromium emulation, not physical iPhone certification.

Capture baseline and candidate on the same host/browser/network/cache settings with build identifiers and raw per-sample values. Record optional audio enabled/disabled and cold/warm cache effects, file and actual transfer bytes, controls-ready and first-interaction timings. The current `measure:fit` main command measures the proof scene; do not claim unmerged #61's `--scene battle` instrumentation exists. Use resource/performance data collected by the focused browser harness for audio deltas, and only use battle frame instrumentation if it is merged and verified when implementation begins.

Retain the agreed limits: cold usable ≤2500 ms, warm usable ≤750 ms, compressed code ≤400000 bytes, cold scene assets ≤1500000 bytes, F1 idle p50 ≤16.7 ms / p95 ≤20 ms, F2 workload p95 ≤33.4 ms. Existing #61 measurements fail F1/F2 and have narrow warm-loading headroom; they are not measurements of this change. Record new failures and measurement gaps, never silently loosen budgets or infer causation across different environments.

Physical audio checks cover iPhone Safari, iPhone Chrome, Android Chrome and desktop in both orientations: audible cues after gesture, mute, interruption/background/resume, restart and usable controls. Each row needs device/OS/browser/build and observation evidence or an explicit unverified status. #11 remains the final device/performance tracker. No deployment or Access change is authorized by this pickup.

## Risks, exclusions and handoff

Main risks are browser unlock timing, late loader/context callbacks after restart, rapid-turn cue overlap and the shared `BattleScene`/diagnostics seam with #61. Generation guards, bounded optional work, one active cue, focused lifecycle tests and review of merged main address them. The technical design includes rollback to the silent battle without any data migration.

Excluded: music/voice, broad art packs, new gameplay rules, save/resume, rewards, renderer/performance rewrites, backend, dependency/toolchain upgrades and deployment infrastructure. Import no external legacy plan and add no attribution/co-author/sign-off trailers.

The original planning-only deliverable was published as `7959063`. The current user request authorizes implementation and PR delivery. Keep OpenSpec tasks unchecked until their stated evidence exists. Leave the change unarchived until merge/acceptance, and use a draft PR with `Refs #62` while physical acceptance is unverified.

## Original planning validation (historical)

- OpenSpec 1.14.1 is installed globally for the current Node environment with `npm install --global @fission-ai/openspec@1.14.1`; `openspec --version` reports `1.14.1`. All four planning artifacts are complete and `openspec validate issue-62-battle-audio --strict` passes.
- All six planning files were checked for relative-link targets, trailing whitespace and forbidden attribution trailers; no issues were found. `git diff --check` also passes. No application source or test was changed, and implementation tests have not been run for this documentation-only pickup.
- GitHub readback confirms #62 is open, assigned to `moshehbenavraham`, labeled `enhancement` and `ready for work`, with the claim comment posted. The remote main comparison is identical to the recorded base.
- Publication target: [work/issue-62-battle-audio](https://github.com/luminari-gurus/tactics-guru-v2/tree/work/issue-62-battle-audio), with this plan at [docs/ongoing-projects/plan.md](https://github.com/luminari-gurus/tactics-guru-v2/blob/work/issue-62-battle-audio/docs/ongoing-projects/plan.md). Native issue linkage and remote contents are verified after push; this planning commit contains only the six task-specific documentation files.

## Implementation progress (2026-10-10)

- Authorization: current user request explicitly directs implementation of this plan using ablation and OpenSpec, autonomous issue resolution, commits/pushes and reviewable PR delivery.
- Baseline: clean branch `79590637e2a58bd620fc283f41511bedc240aebf`; remote main remains `9f785dfd3e9ce703ff8ab46210f84c38890c6f2a`. PR #61 is open/unmerged. A detached baseline worktree at `/tmp/guru-issue62-baseline` supports same-host measurements without importing #61.
- Ablation: **Outcome** is all six issue criteria with explicit hardware gaps. **Non-goals** remain unchanged. **Files** follow the table above plus a reproducible asset recipe/measurement harness if needed. **Proof** is RED/GREEN policy/lifecycle tests, real controls, required suites and comparable raw loading evidence. The existing plan is minimal; no generic audio service, new runtime dependency, or proof-adapter refactor is warranted.
- Initial step (completed): cue policy RED tests, then bounded Phaser adapter. OpenSpec checkboxes remain the task source of truth; QA results live in `docs/qa/issue-62-battle-audio.md`.

- Loader refinement: local Phaser `AudioFile.onProcess` has unguarded decoder callbacks and console-error reporting. Use owned abortable fetch/decode and existing Phaser cache/sound APIs, preserving HTML5 fallback. This removes shared loader cleanup/retry coupling and keeps the same acceptance criteria. Eight cues now total 11741 bytes. Policy RED/GREEN and asset inventory pass (8 tests).

- Adapter RED/GREEN: 24 focused tests plus strict typecheck pass. Scene/HUD/diagnostics integration is implemented; browser controls and HTML5/no-audio coverage are next before marking integration tasks complete.

- Integration status: initial desktop audio suite passed 12 tests, including actual-control losses and victories with identical sound-on/off state, RNG and replay. Touch activation, per-action cue assertions and late decode checks were then added; the full configured suite (207 tests) is running. Unit suite: 284 passed; content: 77 passed; strict typecheck/build/OpenSpec validation/diff check pass. Existing large-chunk warning retained.
- Device handoff: all eight physical browser/orientation rows are explicitly unverified in the QA note; #11 retains physical audibility and frame certification. No physical result is inferred from headless tests.
- Next steps: finish all browser projects and address failures, commit the implementation, rebuild with a clean source identifier, run `scripts/measure-battle-audio.ts` sequentially against the detached baseline, record raw evidence and unchanged-budget results, then commit/push QA and prepare the draft PR.

- Delivery checkpoint: implementation commit `2d87b64568cb2a64cf1d528e66de37a38954c841` is pushed. All 69 desktop tests passed; the same live full-suite process is continuing through portrait and landscape. Candidate clean build is at `/tmp/guru-issue62-candidate/dist`. The collector was corrected to measure capture-to-bubble handler response (microtasks from capture can precede target handlers). No runtime source changed after the implementation commit.

- Discovered and fixed: touch-device HTML5 manager lock was not refreshed by owned loading. Added the existing Phaser unlock call inside the gesture and a RED/GREEN regression (25 focused tests pass). First full run stopped after 90 passes/1 genuine fallback failure; an interrupted battle is not counted as a regression. Targeted fallback/enemy-mute checks now run on all three profiles before a fresh final full suite.

- Further fallback repair: stop on capture-phase window blur before Phaser queues HTML5 sounds for focus resume; a RED test proved the missing stop, then all 26 policy/adapter tests passed. Native media play-call counting in browser coverage checks that focus cannot replay an old cue. Corrected the enemy-mute test to follow actual initiative with legal Wait controls (all three profiles passed).

- Fallback repair verified: 6 targeted browser checks pass across all profiles. Replaced the attempted capture-order workaround with public HTML5 `pauseOnBlur` ownership for the adapter lifetime, restoring the prior setting at destroy. This avoids private resume queues and DOM focus interference. Next: commit clean source, measure, then run the final complete browser suite.
