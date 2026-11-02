# battle-controls Specification

## MODIFIED Requirements

### Requirement: Preview then confirm
Movement, basic attack and signature actions SHALL display a legal preview before explicit confirmation. Cancel SHALL discard the intent without changing battle state, budgets or RNG. Invalid targets SHALL show a reason without dispatching commands. On the rail skin, confirmation is the Confirm action control. On the radial skin, confirmation is releasing on (or tapping) a slice; releasing in the hub cancels.

#### Scenario: Cancel a move or attack
- **WHEN** a selected action is previewed and cancelled
- **THEN** no command is recorded and state and RNG remain identical

#### Scenario: Confirm a stale intent
- **WHEN** an intent becomes invalid before confirmation
- **THEN** it is rejected visibly and atomically by authoritative rules

#### Scenario: Clear a movement destination
- **WHEN** a player returns the native destination selector to Choose target after preparing a move
- **THEN** destination, pending intent and preview are cleared together, Confirm is disabled, Move remains selected and battle state, replay and save bytes stay unchanged

#### Scenario: Retry a cancelled movement destination
- **WHEN** a player dismisses movement confirmation with Cancel or Escape
- **THEN** the destination selector returns to Choose target and selection, intent and hover preview clear while Move remains selected, allowing native re-selection of the same destination to prepare one fresh intent without accepting a command until confirmation

## ADDED Requirements

### Requirement: Shared action and target model
Rail and radial skins SHALL read and write one framework-free selection model that holds the selected cell, selected action (`move`, `basic`, or an owned ability id), the current preview, and confirm, cancel and end-turn operations that go through the existing session. Fine-pointer Auto behaviour SHALL match the current rail.

#### Scenario: Both skins share pending intent
- **WHEN** a legal destination is prepared and the combat-controls skin changes
- **THEN** the pending command, budgets and RNG are unchanged and the newly shown skin reflects that preview

### Requirement: Combat controls setting
The settings menu SHALL offer Auto (default), Radial and Rail. Auto SHALL use the Option C radial on every `(pointer: coarse)` device, including landscape tablets, and the rail on fine-pointer devices. The choice SHALL persist and override Auto. Changing it SHALL NOT drop a prepared action.

#### Scenario: Auto on a coarse pointer
- **WHEN** the preference is Auto and `(pointer: coarse)` matches
- **THEN** the radial skin is used regardless of viewport size or orientation

#### Scenario: Explicit Rail on a phone
- **WHEN** the player chooses Rail
- **THEN** the rail and dock are used even on a coarse-pointer device, and the choice is restored on a later visit

### Requirement: Mobile radial hold and tap
On the radial skin, a 300 ms still press on a unit or tile SHALL open a labelled radial with slices from the held cell. A drag past the pan threshold before 300 ms SHALL pan and SHALL NOT open the radial. A lift before 300 ms with little movement SHALL open the same radial (tap fallback). `prefers-reduced-motion: reduce` SHALL skip the hold timer and radial animation. Holding SHALL never be the only path.

#### Scenario: Empty reachable tile
- **WHEN** the radial opens on an empty reachable tile
- **THEN** Move is the default slice, Inspect is available, and Attack and Special are disabled with a reason

#### Scenario: Enemy
- **WHEN** the radial opens on a living enemy
- **THEN** Attack is the default slice, Special expands to legal specials, Inspect is available, and Move is available when movement remains

#### Scenario: Own unit
- **WHEN** the radial opens on the acting unit
- **THEN** Inspect is the default slice, Move is available when the standing tile is a reachable destination, and Special appears only with a legal self preview

#### Scenario: Hub cancel
- **WHEN** the player releases in the hub after leaving a slice, or taps the hub on the tap path
- **THEN** no command is recorded and state, budgets and RNG stay unchanged

#### Scenario: Dismiss without commit
- **WHEN** a second finger, pinch, pointer cancel, lost capture, hidden page, dialog, enemy/presentation/ended phase, or restart occurs
- **THEN** the radial closes with no command and restart leaves no stale radial or duplicate listeners

### Requirement: Special sub-ring
The Special slice SHALL show the last-used special’s name and a count of specials whose preview is legal for that target. Opening it SHALL list only those legal specials, with the last-used one preselected. Illegal specials SHALL NOT appear. A unit with one legal special SHALL commit that special without an extra choice step.

#### Scenario: Far Shot omitted
- **WHEN** a special would be rejected by target preview for the current cell
- **THEN** it has no chip and cannot be aimed or committed from the radial

### Requirement: Docked End turn
Wait / End turn SHALL be a docked control at least 48 CSS pixels tall, always reachable, never a radial slice, and SHALL commit immediately as it does on the rail.

#### Scenario: End turn from the dock
- **WHEN** the player activates End turn on the radial skin
- **THEN** the turn ends through the existing end-turn command with no radial slice involved

### Requirement: Touch pan threshold
Board pan SHALL use a 10 CSS-pixel threshold for touch pointers and the existing 6 CSS-pixel threshold for mouse and pen.

#### Scenario: Finger drift during hold
- **WHEN** a touch pointer moves 9 px during the hold timer
- **THEN** the radial can still open and the board does not pan

#### Scenario: Mouse pan unchanged
- **WHEN** a mouse pointer moves 6 px
- **THEN** the board pans as it does today

### Requirement: Plan move from the radial
Plan move SHALL be a radial slice. Choosing it SHALL enter destination picking; tapping a reachable tile SHALL reopen the radial at that tile so the player can choose the ability. The combined plan SHALL preview through `previewTacticalPlan` and commit once through `confirmPlan`. Cancelling at either step SHALL commit nothing.

#### Scenario: Cancel after choosing the tile
- **WHEN** a plan destination is stored and the player cancels
- **THEN** no move or ability is accepted and budgets and RNG stay unchanged

### Requirement: Mobile Magic Missile
On the radial skin, Magic Missile SHALL target one living creature; every missile SHALL hit that creature. Desktop rail targeting SHALL stay unchanged.

#### Scenario: Single enemy takes every missile
- **WHEN** the player commits Magic Missile from the radial onto one enemy
- **THEN** the command uses the single-target form and each missile resolves against that enemy
