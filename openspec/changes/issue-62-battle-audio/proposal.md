# Proposal

## Why

The replayable battle on main has no audio feedback even though the proof scene already handles browser audio unlock and lifecycle failures. [Issue #62](https://github.com/luminari-gurus/tactics-guru-v2/issues/62), a child of [#57](https://github.com/luminari-gurus/tactics-guru-v2/issues/57), addresses the missing battle-audio work supporting the acceptance gate in [#11](https://github.com/luminari-gurus/tactics-guru-v2/issues/11).

## What Changes

- Add short, distinct movement, attack-result, magic-missile, unit-defeat and battle-outcome cues derived from accepted event batches, with bounded playback and no replay of old events.
- Add an accessible Enable sound / Mute control. Sound starts disabled, requests unlock in the activation gesture, and retains the preference across in-page restarts only.
- Make optional audio loading and playback nonfatal; suppress stale or duplicate cues through mute, interruption, backgrounding, unlock and scene teardown.
- Add focused policy/lifecycle tests, actual-control browser checks, a small reproducible MP3 asset set, and an audio QA/budget handoff to #11.

## Capabilities

### New Capabilities

- `battle-audio`: Accepted-event feedback cues, user sound preference, and failure-tolerant browser audio lifecycle for the playable battle.

### Modified Capabilities

None. Existing battle/session behavior and proof-audio requirements remain unchanged.

## Impact

New presentation modules are proposed at `src/audio/battleCues.ts` and `src/phaser/BattleAudio.ts`, with small integration changes in `src/phaser/BattleScene.ts` and `src/ui/hud.ts`. Add cue assets under `public/audio/battle/`, focused tests, and `docs/qa/issue-62-battle-audio.md`. `BattleSession` supplies existing committed event batches and presentation tokens; the pure domain and RNG need no changes.

Owner: `moshehbenavraham`. Planned branch: `work/issue-62-battle-audio`. Base: `origin/main` at `9f785dfd3e9ce703ff8ab46210f84c38890c6f2a`. Human plan: [`docs/ongoing-projects/plan.md`](../../../docs/ongoing-projects/plan.md).

Prerequisites #10/PR #55 and #19/PR #31 are merged. Unmerged PR #61 is measurement context, not a code dependency; PR #12 is outside scope. No runtime dependency, music, voice, renderer rewrite, save system, combat changes or deployment changes are proposed. Physical-device acceptance and existing F1/F2 failures remain visible in #11; this change does not close #57 or #1 by proxy.
