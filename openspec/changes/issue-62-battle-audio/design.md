# Design

## Context

See [proposal.md](proposal.md) for motivation and [the capability spec](specs/battle-audio/spec.md) for observable behavior. Issue: [#62](https://github.com/luminari-gurus/tactics-guru-v2/issues/62). Owner: `moshehbenavraham`. Branch: `work/issue-62-battle-audio`. Planning base: main `9f785dfd3e9ce703ff8ab46210f84c38890c6f2a`.

Observed in that base:

- `BattleSession.confirm()` and `nextEnemy()` return immutable `Presentation` values containing accepted events and a monotonically increasing token. Previews and rejected commands return no presentation. The cumulative `session.events` log is unsuitable for triggering sound.
- `BattleScene.present(step)` owns committed presentation and already handles cancellation on visibility change and shutdown. `animation.done` alone controls `finishPresentation`; sound must not join that promise chain.
- `ProofAudio` owns Phaser sound instances, bounds `context.resume()` with a wall-clock watchdog, invalidates late attempts, and removes listeners/timers on destroy. Its hard-coded proof DOM controls and diagnostics cannot be reused as a battle controller.
- `BattleHud` renders DOM controls and disposes its listeners. The app hides proof details for battle mode. Only proof MP3/OGG tone files currently exist.
- PR #61 adds measurements in some of the same scene/diagnostics files but is unmerged. Its recorded F1/F2 failures and tight warm-load headroom are context, not measurements of this change or an implementation prerequisite.

## Goals / Non-Goals

**Goals:** Keep audio an optional scene-owned consumer of accepted data; use one small pure cue policy and one Phaser adapter; make resource and asynchronous lifetimes explicit; expose enough bounded diagnostics to test actual controls without inserting battle state.

**Non-Goals:** No change to domain commands/events, replay schema, RNG or combat rules; no generic audio framework, music, voice, cross-page preference storage, performance rewrite or reuse of unmerged instrumentation. The existing proof adapter stays independently testable.

## Decisions

### 1. Derive a compact sequence from each accepted batch

Add `src/audio/battleCues.ts`: a pure typed projection from `readonly BattleEvent[]` and the validated ability catalog to cue keys. Use the ability `kind` to identify a magic-missile cast, avoiding a new ability-ID-specific rule. Mapping:

| Accepted event | Cue policy |
| --- | --- |
| `moved` | One short move cue per batch, not per path cell |
| `attackRolled` | One miss, hit or critical cue reflecting the recorded result |
| `abilityUsed` for `kind: magicMissile` | One magic cue; do not emit one per missile/damage event |
| `defeated` | One unit-defeat cue per batch, even if several units fall |
| `battleEnded` | Distinct victory or loss cue at the end of the sequence |
| Other events | No additional cue |

The sequence has at most four cues, with one active sound at a time. Preserve outcome and defeat feedback when normalizing a batch; do not produce redundant ability, damage and attack sounds for the same hit. A newer presentation supersedes unfinished older feedback. The brief sequence is independent of animation completion, so it cannot hold the gameplay lock.

Alternative considered: triggering from HUD rendering or the cumulative battle log. Rejected because refresh, preview, resize and resume can replay old events. Synthesizing cues inside the domain is also unnecessary coupling.

### 2. Consume tokens before checking playback eligibility

Add `src/phaser/BattleAudio.ts` with a scene-local last-considered token. `present(step.token, step.events)` ignores duplicate/older tokens and records a new token before checking enabled, loaded, visible and unlocked state. Suppressed batches are consumed permanently. A fresh adapter starts a fresh token lifetime on scene restart. Context changes, load completion and focus never replay a batch.

Call the adapter once in `BattleScene.present` beside `hud.append(step.events)`. Catch all audio-boundary failures locally; do not await audio from `present`, alter `finishPresentation`, or call the domain from an audio callback.

Alternative considered: a retained queue until audio becomes ready. Rejected because an enable gesture or resume would play obsolete enemy/player actions.

### 3. Separate user preference from browser availability

Keep a boolean preference on the existing `BattleScene` instance, initialized to false. `startProof` restarts the same scene instance, so the preference survives in-page restarts while each adapter's sounds, tokens and attempts remain scene-local. No localStorage is needed.

Expose the control through `BattleHud` callbacks and state rendering. Keep mute available during player/enemy presentation and avoid including it in gameplay action-disable logic. Give it an accessible pressed state and a short status for loading, blocked or unavailable sound; muted/enabled preference is distinct from actual context readiness. The modal's existing focus capture still applies.

Request `AudioContext.resume()` synchronously inside the user's enabling/retry handler, before yielding. The proof's two-second wall-clock unlock watchdog is the starting bound. A timeout or rejection updates sound status and permits another gesture. A successful unlock only enables future cues. HTML5 sound fallback uses Phaser's existing lock/play result checks; a no-audio manager reports unavailable without throwing.

Alternative considered: binding battle audio to `#audio-play` or persisting preference across reloads. The former is hidden in battle mode and owned by the proof adapter; the latter adds storage behavior outside this task.

### 4. Treat loading and playback as disposable optional work

After the content load has completed, start adapter-owned fetches for missing cue files, with a 6.5-second overall load/decode deadline and five-second per-request timeout. Decode with the existing manager context and populate Phaser audio cache only while the adapter is live. For HTML5 fallback, prepare owned media tags and prime them silently in the enabling gesture; their URLs/tags are released on teardown. Do not add audio to the fatal content load plan or delay `onReady`. If any required cue is unusable, report the adapter unavailable and keep the battle usable; timeout must cover a decode/completion that never arrives, not just XHR.

Use attempt/generation guards for unlock and loading callbacks. Stop active sounds, clear the pending short sequence and invalidate callbacks on mute, hide, interruption and shutdown. Abort owned requests and remove owned media/context/visibility listeners and timers; do not touch the content loader. Web Audio cache entries can survive a restart, but newly created sound instances belong to that adapter and are destroyed. Generation guards ignore decode completion after timeout or restart. No automatic retry; a new scene retries failed loading.

A completion callback starts the next cue only if its generation and eligibility still match. Bound each playback by its documented cue duration plus grace, and contain false returns/exceptions. Becoming visible or running updates status but never starts old sound. Gameplay cancellation and scene readiness remain independent.

Inspection-driven refinement: Phaser AudioFile.onProcess callbacks are unguarded and log decode errors; the shared loader complicates cancellation across scene restart. Adapter-owned requests/decode remove that coupling while retaining Phaser sound/cache APIs. Blocking scene creation on audio or awaiting playback would make optional media failures capable of freezing play.

### 5. Keep cue assets and observability small

Generate eight short mono MP3 files (move, miss, hit, critical, magic, unit-defeat, victory, loss), with fades and modest level, under `public/audio/battle/`. Target durations of 80–300 ms, with outcome cues no longer than 500 ms; total bytes must be at most 32 KiB. Document reproducible generation commands, sizes and hashes in the audio QA note. Use a fixed typed manifest and existing Phaser APIs; no runtime dependency or external asset service is required.

Add bounded battle-audio diagnostics to the existing snapshot surface, separate from proof audio: preference, load/context status, generation, consumed token, started/completed/dropped counters and a short recent cue list. Counters observe real adapter calls and errors; they must not provide a way to inject gameplay or claim audible hardware output. Keep diagnostics small and avoid a per-frame update loop.

Alternative considered: a large library or music track. Both add load and maintenance costs without serving the accepted cue scope.

## Risks / Trade-offs

- Browser gesture/interruption differences → gesture-local unlock, bounded attempts, actual-control browser tests and separately identified physical audio checks.
- Rapid turns truncate an older cue sequence → prefer current feedback; document and test the four-cue bound and outcome priority.
- Loader reuse and late promises across restarts → per-adapter generation guards, overall deadlines and repeated-restart tests while requests are stalled.
- Shared edits with PR #61 → inspect its merge status before implementation, work from merged main, reconcile only the small scene/diagnostics seams, and rerun affected checks after any reconciliation.
- Warm loading previously had only 0.1 ms headroom on a different measured build → keep optional audio out of readiness, bound bytes, measure same-environment baseline/candidate and retain failures. Do not attribute existing F1/F2 failures to this patch without comparable evidence or relax limits.
- No guaranteed physical-device availability → record each missing row honestly for #11; automated counters establish behavior, not audible output.

## Migration Plan

No saved data or public API migration is required. Land the adapter, cues and controls as one reviewed change after plan approval. Validation uses local builds and any separately authorized existing preview/release path; this task does not install or alter deployment. Rollback removes the audio integration/control and assets, leaving the existing silent battle and its state/replay behavior intact.
