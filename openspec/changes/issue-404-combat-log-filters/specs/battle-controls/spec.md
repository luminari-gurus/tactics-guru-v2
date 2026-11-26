# Spec Delta

## ADDED Requirements

### Requirement: Filter and hide the battle log

The battle log SHALL offer All, Actions, Damage & Healing, and Status & Saves views of one bounded encounter history. Players SHALL be able to switch filters, hide the log, and reopen it through keyboard or touch while retaining the history and the associated battle state.

#### Scenario: Filter ordered recent history
- **WHEN** a player switches filters in an encounter with mixed events
- **THEN** the selected filter is announced, only matching lines appear in their recorded order, and returning to All restores the full retained list

#### Scenario: Empty filter
- **WHEN** the selected category has no lines in the retained history
- **THEN** the log shows a readable empty state and the other filters remain available

#### Scenario: Dismiss and reopen
- **WHEN** a player closes the log with Hide or Escape
- **THEN** normal battle focus resumes without accepting an action, and reopening the log selects All and shows the current retained history
