## ADDED Requirements

### Requirement: Battle action shortcuts
An active battle SHALL support M for Move, A for Basic attack, S for the selected rail ability or offered radial Special, 1–9 for ordered learned abilities, W for immediate Wait, C for confirmation and Escape for cancellation. Selection SHALL NOT execute an action. Disabled actions and invalid previews SHALL NOT dispatch commands.

#### Scenario: Select and confirm in the rail
- **WHEN** a player selects an available action or learned ability with its shortcut and chooses a legal target
- **THEN** the normal preview appears without changing state, RNG, saves or command count until C or native confirmation accepts exactly one command

#### Scenario: Target first in the radial skin
- **WHEN** a player chooses M/A/S or a numbered ability at the current radial target or board cursor
- **THEN** the matching available slice or special is aimed and focused with its preview, without executing it, and C or native activation uses that same enabled control

#### Scenario: Stable learned ability numbering
- **WHEN** an actor's abilities or a target's legality change
- **THEN** numbered hints match the actor's ordered learned list in both skins, an unavailable number cannot fall through to another ability, and unlearned abilities remain unavailable
- **AND** radial S aims the legal ability currently offered by Special, even when the first learned ability is illegal at this target

#### Scenario: Existing confirmation and planning
- **WHEN** shortcuts are used with a prepared move, ability, compound plan or follow-up target
- **THEN** the existing preview, confirmation, cancellation and atomic rejection rules remain effective, and W retains its documented immediate end-turn behavior

#### Scenario: Focus and pointer handoff
- **WHEN** native Tab, pointer aiming or a held gesture changes the reviewed radial action
- **THEN** the full HUD and compact hub describe the action that C, native activation or release will accept, without spending state or RNG while reviewing

#### Scenario: Complete plan and friendly-target review
- **WHEN** a self-heal plan or friendly-target ability is reviewed
- **THEN** the full review includes the move/heal consequences or shared friendly-fire warning before confirmation, while offensive plans retain their target-choice step
- **AND** radial friendly damage requires an explicit dialog confirmation bound to the displayed state and pending command or plan; cancellation and stale confirmation accept no command

#### Scenario: Plan ordering and current cursor
- **WHEN** a player is still choosing a planned destination or moves the board cursor after changing control skins
- **THEN** non-move shortcuts cannot bypass the destination step, and keyboard actions use the latest cursor rather than the retained earlier selection

### Requirement: Context-safe shortcut ownership
Action shortcuts SHALL apply only to a ready, visible, player-controlled battle. They SHALL yield to handled events, IME composition, repeated keydowns, modifier combinations, editable controls and open dialogs. Existing native arrows, Enter/Space, Tab navigation and modal Escape behavior SHALL remain available.

#### Scenario: Editing and native controls
- **WHEN** a player types in an input, textarea, select, textbox or editable descendant, composes text or uses Ctrl/Alt/Meta/Shift combinations
- **THEN** action shortcuts do not alter selection or gameplay and do not suppress native editing or browser behavior

#### Scenario: Input locks and held keys
- **WHEN** an action is spent, unavailable, animating, loading, in an enemy or terminal phase, or a shortcut is held across a turn transition
- **THEN** no unavailable or duplicate command is accepted

#### Scenario: Modal capture and scene replacement
- **WHEN** a dialog opens, the page is hidden, a battle restarts or a hosted encounter is replaced
- **THEN** gameplay shortcuts cannot activate modal choices or obsolete scenes, and one later keypress invokes at most one current action

### Requirement: Discoverable shortcut map
Battle controls SHALL expose compact shortcut hints and a keyboard-accessible full-map disclosure. Hints SHALL stay consistent with the active skin and current learned abilities, remain readable on narrow screens and preserve usable pointer/touch targets and visible focus.

#### Scenario: Hints through lifecycle and layouts
- **WHEN** the actor, learned abilities, skin, layout or battle scene changes
- **THEN** the displayed bindings match the available controls, the disclosure remains keyboard accessible, and the playfield and actions remain usable on desktop and portrait/landscape mobile layouts
