# Hero progression

Source audit: `b343ab02ae033a57f8c5f613f07883764f0752c0`, extended by qualified Shaman source `f4616ae301da4be133455334d4c2b38e3583c8f7`. Historical evidence retains its original revision and test limits.

The initial #160 slice supports Fighter, Ranger and Mage levels 1–5 in short runs
and dungeons. Standalone battles retain level-1 rules. Canonical hero records carry
cumulative XP, level, current/max HP and the sorted learned implemented ability IDs;
readers reject inconsistent derived values. Definitions live in
`src/content/progression.ts`; pure projection and awards live in
`src/domain/progression.ts`.

| Level | Total XP | Fighter max HP | Ranger max HP | Mage max HP |
| --- | ---: | ---: | ---: | ---: |
| 1 | 0 | 18 | 12 | 11 |
| 2 | 60 | 24 | 17 | 15 |
| 3 | 180 | 30 | 22 | 19 |
| 4 | 360 | 36 | 27 | 23 |
| 5 | 600 | 42 | 32 | 27 |

Accepted normal/elite/vault/boss victories grant living participants 30/55/70/90
XP. Short-run encounters use normal/normal/boss. Dungeon awards use their saved,
validated encounter kind, including legacy opponent policy. Final victories award
XP even when no reward follows. Level-up heals a living hero to new max HP; ordinary
awards preserve current HP. Defeated heroes gain nothing and stay defeated. There
is no revival mechanic. XP saturates at 600; later awards do not heal a capped hero.
Completion phase/revision checks prevent repeated callbacks, reward claims, reload
and backtracking from awarding twice. No award consumes battle RNG.

Projection starts from immutable baseline definitions, applies progression, then
existing equipment once. Preparation healing uses progressed max HP. Levels do
not grant power, accuracy, AC, Dexterity, Will, movement or extra actions. Equipment
and Guarded retain their rules. Mage level becomes Magic Missile caster level:
the approved capped `floor((casterLevel + 1) / 2)` formula yields 1/2/3 missiles at
levels 1/3/5, with the existing individual damage rolls and range.

Implemented abilities can declare a validated `requiredLevel` from 1–5 (default 1).
The shared projection controls both learned state and authoritative command access;
UI does not independently unlock actions. Existing signatures remain level 1.
Second Wind unlocks at Fighter level 2 and Taunt at level 3 under #163; see
[their rules](signature-abilities.md#fighter-progression-163). Ranger level 2
unlocks Mark Target and level 3 unlocks Pinning Shot under #164; see
[their rules](signature-abilities.md#ranger-progression-164). Mage level 3 unlocks Frost Snare under #165; Arc Bolt is consolidated into level-1
Magic Missile, without a separate level-2 skill. See [Mage rules](signature-abilities.md#mage-progression-165). Broader non-HP class
advancement remains #185.

The HP increments and level boundaries adapt the
[pinned legacy table](https://github.com/luminari-gurus/tactics-guru/blob/e9433f6b608ae6b2d95418615cce9cf17dadcf74/scripts/run/UnitProgressionService.gd).
This version uses cumulative XP capped at 600, while legacy stored a within-level
remainder and cleared it at cap. Legacy non-HP growth and Ember Burst are not
imported into this slice.

## Save compatibility

Run state format 2 / envelope 7 and dungeon envelope 9 bind progression rules to
save identities. Older run/dungeon formats are incompatible: inspection preserves
raw primary/backup bytes for export/recovery instead of reconstructing past awards
or silently resetting heroes. Return to the originating build to continue an old
save; export it before explicitly replacing it. Older code cannot be assumed to
read the new formats. Standalone catalogs explicitly project the level-1 party;
battle state format 5 / rules 6 apply across routes, while the standalone save
wrapper remains format 1. Mark, shared Pin/Snare and Weakened source references are battle-local and do not
enter the carried progression records.

Party and battle inspection show level, XP/next threshold (or MAX), learned actions
and current/max HP. Accepted level-ups report healing and newly learned implemented
actions. Loading a save does not replay a level-up award or announcement.
