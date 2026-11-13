# Counter-only compatibility fixtures

These files were written by literal counter-only commit
`49ad112e7539542a88c73a7e76788b33ce8402a8` (PR #365), using the existing session
owners and legal player/enemy commands through one battle. Dungeon entry is staged
at a valid encounter position; this is a schema/continuation fixture, not proof of
a complete exploration journey. The generation check is retained under
`docs/qa/issue-270/counter-fixture-generation.ts`.

Run envelope 10 and dungeon envelope 12 contain stats v1: complete known kill/move
counters, but reserved zero playtime that was never measured. Timed stats v2 must
preserve those counters while marking time since upgrade. Inspection/Continue
cannot rewrite these bytes. Accepted mutations write run 11 / dungeon 13.
