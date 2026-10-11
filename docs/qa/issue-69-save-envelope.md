# Issue #69: bounded battle-save contract evidence

## Scope and provenance

Implementation started 2026-10-11 from planning head `cc4859d`, based on merged main `e955e9d9f182a76f057ea69057c7a1ac6c0bd682`. This report covers a pure unused-by-UI contract, not browser persistence or physical-device acceptance. Parent #58 remains open.

`tests/helpers/saveFixtures.ts` is shared by tests and the measurement harness. Authored seeds 1 and 2 use the existing `BattleSession` and `playerDecision` policy. It captures empty starts, the first accepted enemy/player commands during presentation, the first active Guarded boundary, and legal seed-1 loss/seed-2 win. The maximum fixture uses the existing turn test's 32x32, six-spawn, seed-7 setup with 10,000 accepted Wait commands, retaining the independently dispatched final state. It uses the authored catalog's stats, validates its synthetic map, and carries a separate catalog digest. Every fixture is semantically replayed and compared to its retained state during construction.

## Progress

- Fixture construction and initial comparison succeeded for eight fixtures; application typecheck passed.
- Preliminary measurements select snapshots: about 1.1 KB versus 301 KB at the command limit, and about 0.07 ms versus 564 ms median decode on this host. Final pinned raw measurements follow after committing the harness. These are host observations, not mobile budgets.
- Codec, rejection/continuation tests and integrated verification remain pending.

## Reproduction

Run from the issue worktree with Node on PATH:

```text
node --experimental-strip-types scripts/measure-save-envelope.ts docs/qa/issue-69/comparison.json
```

The existing Vite loader resolves source TypeScript without adding a dependency. Each candidate uses the same outer shape, canonical serialization and SHA-256 digest, one discarded warmup and five serial samples per fixture. Snapshot validation includes its owned-state reconstruction; the separate snapshot reconstruction timing measures only returning that state. Replay reconstruction includes `replayBattle`'s repeated structural validation and command execution. Encode validates shape; semantic replay cost is in decode. Fixture generation and catalog-hash warmup are outside timings. Each output records exact source/tree, dirty paths, runtime/OS/CPU, catalog and state/log hashes, sizes and every timing sample.
