# Spec Delta

## ADDED Requirements

### Requirement: Persistent Snared board feedback
The board SHALL show a noninteractive, recognizable snowflake badge beside each
living enemy with active Frost Snare from a living Mage. It SHALL match Guarded's
visual weight, placement, contrast and minimum readable size while keeping HP,
selection and target cues readable on desktop and mobile without hover or color
being necessary to identify the status.

#### Scenario: Cast and unrelated turns
- **WHEN** a legal Frost Snare cast finishes and unrelated units take turns
- **THEN** only the affected enemy retains the badge after transient feedback ends

#### Scenario: Camera and responsive layout
- **WHEN** the board is panned, zoomed or resized across desktop, narrow portrait and landscape
- **THEN** the badge stays attached to its unit, clips with the board and remains readable whenever the unit is visible

#### Scenario: Expiry and defeat
- **WHEN** the target finishes its next accepted turn or the source or target is defeated
- **THEN** the badge disappears with the presented effect state

#### Scenario: Saved active battle
- **WHEN** a battle resumes with active Frost Snare
- **THEN** the badge appears immediately without replaying activation or changing accepted state, RNG or save slots

#### Scenario: Cancel, invalid target, Pin and restart
- **WHEN** a cast is cancelled or rejected, a unit is only Pinned, or a battle restarts without active Snare
- **THEN** no Snared badge appears or remains stale
