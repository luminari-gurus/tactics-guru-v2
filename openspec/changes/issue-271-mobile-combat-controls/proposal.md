# Proposal

## Why

Phones and other coarse-pointer devices still use the desktop rail: Ability and target `<select>`s, Confirm/Cancel, and a dock that steals board space. Issue [#271](https://github.com/luminari-gurus/tactics-guru-v2/issues/271) ships the accepted Option C skin from design PR #237 (commit `b1dc2dd`): hold or tap a cell for a radial, with a docked End turn, without changing rules, legality, or fine-pointer behaviour.

## What Changes

- Extract the action/target selection model from `BattleScene` into a framework-free module both the rail and the mobile radial read.
- Add a persistent **Combat controls** setting: Auto (default), Radial, Rail. Auto uses Option C on every `(pointer: coarse)` device, including landscape tablets, and the rail on fine pointers.
- Implement the Option C radial (hold 300 ms, tap fallback, Special sub-ring of legal specials only, hub cancel, Plan move slice that reopens at the chosen tile) and a 48 px docked End turn.
- Use a 10 px pan threshold for touch and keep 6 px for mouse/pen. On mobile, Magic Missile is a single-target special (all missiles hit that enemy).
- Cover the shared model and gestures with unit tests, and cover hold/tap/cancel/End turn with Playwright on Chromium mobile projects and WebKit device-acceptance.

## Capabilities

### New Capabilities

None. Mobile radial is a skin of existing battle controls.

### Modified Capabilities

- `battle-controls`: mobile radial, tap fallback, docked End turn, combat-controls setting, leftover "Review" wording.

## Impact

Battle HUD, board input, selection state, settings persistence, unit and Playwright coverage. Domain rules, command shapes, RNG, and save formats stay the same. Desktop Option B is out of scope. Mockup files from PR #237 are not copied into `src/`.
