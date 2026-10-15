# Spec Delta

## MODIFIED Requirements

### Requirement: Responsive battle feedback
The HUD SHALL show hero portraits, HP, active side/unit, round, spent move/action budgets, Guarded status, selected target, bounded event log and victory/defeat feedback. Interactive targets SHALL be at least 44 CSS pixels in both dimensions, respect safe areas and remain reachable in portrait and landscape. Desktop and short landscape SHALL use a right rail; portrait SHALL use a bounded bottom dock with persistent actor information and scrollable controls.

#### Scenario: Short landscape HUD
- **WHEN** the viewport becomes short landscape
- **THEN** controls remain reachable without horizontal overflow, a usable board area remains visible, and log overflow scrolls within its bounded region

#### Scenario: Accepted layouts and text scaling
- **WHEN** the battle is viewed at 1280x720, 412x915, 915x412, 320x568 or 568x320, including 200% text and safe-area insets
- **THEN** actor information and all controls remain reachable within their bounded scroll regions, the rail or dock follows the accepted layout, and the page has no horizontal overflow

## ADDED Requirements

### Requirement: Independent actor and inspection feedback
The HUD SHALL derive actor identity, current/max HP, relevant stats/status, move/action availability and signature names from the live session and catalog. Inspection and selected-target information SHALL be distinct from the actor and action preview. Inspection SHALL NOT change the active turn, pending command, budgets or RNG.

#### Scenario: Inspect another unit while preparing an action
- **WHEN** the player inspects an ally or enemy while a preview is pending
- **THEN** the inspected unit is explicitly labelled, its current information is shown, the actor remains identifiable, and closing inspection preserves the preview and authoritative battle state

#### Scenario: Guarded reflects actual status
- **WHEN** a fighter spends an action on Basic attack or Guarded Strike
- **THEN** actor and inspection displays agree with actual status and effective armor class; spending an action alone never implies Guarded

### Requirement: Drawable board region and stable navigation
The board SHALL fit and constrain navigation within one drawable region that excludes controls, safe areas and captions. Outside modals, its height SHALL retain at least 30% of viewport height, or 55% in landscape at heights up to 500 CSS pixels. HUD changes SHALL preserve navigation subject to valid bounds; actual viewport changes SHALL refit while preserving relative zoom.

#### Scenario: Panel content changes after navigation
- **WHEN** a player has panned or zoomed and actor, target, preview, log or storage text changes
- **THEN** navigation remains unchanged except for necessary bounds/zoom-limit clamping, and controls never overlap the drawable board

#### Scenario: Orientation change and fresh battle
- **WHEN** the viewport changes orientation or a fresh battle starts
- **THEN** the settled region is used for fitting and transformed selection; orientation preserves relative zoom, a fresh battle resets to fit, and units, raised tiles and action feedback remain usable within the unobscured region

### Requirement: Explicit control availability
Idle, action selection, valid/invalid preview, review, spent resources, enemy turn, presentation, ended and error states SHALL expose understandable control availability without reliance on hover or color. Wait SHALL commit immediately through the existing authoritative command path. Only authoritative presentation completion SHALL release gameplay input; a display timer SHALL NOT do so.

#### Scenario: Invalid and locked actions
- **WHEN** a target is invalid, a resource is spent, the enemy is acting, or an accepted action is presenting
- **THEN** unavailable controls have visible explanations, invalid intent cannot dispatch, and input stays locked for the authoritative phase while secondary recovery/log/sound/restart controls remain reachable as appropriate

### Requirement: Nonmodal cancellation focus
Escape outside a dialog and the visible Cancel action SHALL clear the same pending intent without changing battle state or RNG, then focus enabled Move or, when movement is spent, enabled Wait. Existing modal focus capture, callback-before-focus restoration, replacement-modal focus and held Enter/Space protections SHALL remain intact.

#### Scenario: Cancel with movement available or spent
- **WHEN** a player cancels nonmodal targeting with Escape or Cancel
- **THEN** both paths discard the intent, preserve state and RNG, focus Move when enabled or Wait when movement is spent, and do not pass the dismissal gesture to the board

#### Scenario: Held activation crosses a focus change
- **WHEN** Enter or Space remains held across action confirmation, cancellation or reset-dialog focus changes
- **THEN** repeated keydowns cannot activate another button, reset the battle or alter either save slot; a fresh activation after release still works
