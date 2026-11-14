# Spec Delta

## Purpose

Help dungeon players understand current-floor encounter progress and stair
availability at a glance without exposing undiscovered locations.

## ADDED Requirements

### Requirement: Current floor progress
The exploration HUD SHALL display cleared and total encounters from accepted
current-floor state after victories, reward resolution, floor changes and Continue.

#### Scenario: Victory and reward resolution
- **WHEN** an encounter is won
- **THEN** the cleared count increases before the reward is resolved and remains correct after claim or decline and Continue

#### Scenario: Travel and backtracking
- **WHEN** the player descends to a new floor or returns to a cleared floor
- **THEN** progress describes that floor, including after Continue

### Requirement: Contextual stair feedback
The HUD SHALL label both stairs using the same progression rules as travel and
map eligibility. Text SHALL explain remaining encounters, pending rewards,
floor-one ascent restrictions and defeat where relevant. Active combat SHALL
hide the exploration HUD. Eligible arrival/restored stairs SHALL retain re-entry guidance.

#### Scenario: Remaining encounters and pending reward
- **WHEN** descent is locked by uncleared encounters or a pending reward, including a reward at full completion
- **THEN** the HUD names the applicable reason and does not claim travel is available

#### Scenario: Ready and defeated floors
- **WHEN** a ready floor is complete, or the player is defeated
- **THEN** descent is labeled unlocked only in the ready state, ascent is unavailable on floor one, and defeat does not advertise travel

#### Scenario: Arrival and restored stairs
- **WHEN** a ready player arrives or continues on an eligible stair
- **THEN** the HUD explains stepping off and back onto that stair without automatically traveling

### Requirement: Readable feedback without discovery leaks
Progress and stair text SHALL be readable without color alone, wrap on narrow
screens without page overflow, preserve rewards and exploration controls, and
SHALL NOT reveal undiscovered coordinates, cells or enemy positions.

#### Scenario: Unseen downstairs and narrow viewport
- **WHEN** a complete floor has undiscovered downstairs or the HUD is viewed on a narrow touch viewport
- **THEN** general eligibility is readable while map discovery stays unchanged and rewards, party, map and compass remain usable
