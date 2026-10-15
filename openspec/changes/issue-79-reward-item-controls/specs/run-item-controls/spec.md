## Purpose

Provide accessible between-encounter reward and party-item choices backed by authoritative ownership and encounter boundaries.

## ADDED Requirements

### Requirement: Catalog driven boundary controls
Controls SHALL derive item names, effects, quantities, equipment slots and eligible living targets from validated catalogs and current owned state. Claim, use, equip and unequip SHALL obey the accepted between-encounter rules; active battles and terminal runs SHALL reject item mutations.

#### Scenario: Choose a reward and prepare the party
- **WHEN** a player claims one pending offer option and uses or equips an owned item before the next battle starts
- **THEN** controls show the resulting ownership, HP and projected stats with the approved next encounter identity

#### Scenario: Unavailable target
- **WHEN** an item cannot affect a selected hero or the current phase forbids it
- **THEN** controls explain the rejection without changing state, action budgets or RNG

### Requirement: At most once interactions
Each confirmation SHALL carry its reviewed run, encounter, boundary and item revision. Duplicate or stale submissions SHALL be rejected visibly without partial mutation, repeated consumption or additional encounter advancement.

#### Scenario: Rapid or obsolete confirmation
- **WHEN** a player double clicks, double taps, repeats a confirmation key or confirms a dialog from an older boundary
- **THEN** at most one operation succeeds and rejected operations preserve the committed state and RNG

### Requirement: Accessible isolated input
Controls SHALL support native mouse, touch and keyboard activation, visible focus, meaningful labels, 44 CSS pixel targets and safe-area-aware portrait/landscape layouts. Confirmation dialogs SHALL capture focus and prevent board input; dismissal SHALL restore usable focus without dispatching gameplay.

#### Scenario: Cancel in short landscape
- **WHEN** a keyboard or touch player reviews then cancels an item operation in short landscape
- **THEN** all controls remain reachable without horizontal overflow, focus returns to a usable control and no state change or board action occurs
