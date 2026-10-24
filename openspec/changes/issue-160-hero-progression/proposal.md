# Proposal

## Why

Heroes currently carry only HP between encounters, so dungeon depth does not advance their level or learned actions. [Issue #160](https://github.com/luminari-gurus/tactics-guru-v2/issues/160) provides the HP/XP foundation for class abilities (#163–#165), equipment/rewards (#173–#174), and later class-stat progression (#185).

## What Changes

- Add validated level-1–5 progression: cumulative XP thresholds 0/60/180/360/600; HP growth per level of Fighter +6, Ranger +5, Mage +4; full healing on level-up for living victory participants.
- Award normal/elite/vault/boss victories 30/55/70/90 XP at accepted encounter completion, once per boundary, including the final encounter. Use normal/normal/boss for the short run and authoritative encounter kind for dungeon battles.
- Project max HP, learned implemented abilities and Mage caster level from canonical progression, then apply existing equipment once. Preserve all non-HP baseline stats and approved signature rules.
- Add data-driven required-level definitions and learned-state validation. Existing signatures remain level 1; later ability content stays in #163–#165. Prove unlock transitions using legal fixture content, without shipping inert future abilities.
- Display level, XP progress/cap and learned actions in party/inspection and outcome feedback across run/dungeon flows.
- **BREAKING**: version progression-bearing run/dungeon saves and their identities; retain incompatible old bytes with existing export/recovery controls instead of inventing past XP or resetting player saves. Standalone level-1 battle semantics remain unchanged.

## Capabilities

### New Capabilities
- `hero-progression`: bounded hero advancement, award ownership, shared projection, persistence and player feedback.

### Modified Capabilities
None. Existing battle-session action, replay and presentation requirements remain applicable unchanged.

## Impact

Content progression definitions/validation; domain run/dungeon, item projection and save readers; RunItemSession/DungeonSession; party/inspection/outcome UI; focused unit/session/browser contracts and rule documentation. No dependencies, assets, recruitment, revival mechanic, new class abilities, non-HP stat growth, broader effects framework, deployment or telemetry taxonomy expansion.

Issue assigned to `dubstylee`; branch `work/issue-160-hero-progression` published from main `5a8802753811663957ea38bb828773866b000f95` (merged #236). #157/#159 are closed and merged; #162 picker is integrated. Other assigned/active backlog work is excluded. No new readiness promotions were justified in this pass. Local `.env` is absent: physical capability is `none`; physical testing is not required, and browser/device emulation is sufficient.

Caller approved these artifacts on 2026-10-23. Implementation and qualification are tracked in tasks.md and docs/qa/issue-160/README.md.
