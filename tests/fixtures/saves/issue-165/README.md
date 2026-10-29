# Exact previous-format fixtures

Captured before any application changes from commit
`e2f0cddd5037cd36d24442ebb099b5225fd9bc33` on 2026-10-28 using the original
encoders, not by rewriting new-format payloads:

- `battle.json`: `createBattle('map:forest_ruins',17,battleCatalog)` and
  `encodeBattleSave`; state 3, rules 4, standalone wrapper 1.
- `run.json`: existing `activeSnapshot()` / `runContext` fixture and
  `encodeRunSave`; envelope 5 with the original progression/content identity.
- `dungeon.json`: `freshDungeon('issue165-prior',190)` and `encodeDungeon`;
  envelope 6 with the original progression/content identity.

The temporary capture unit passed before removal. Keep these bytes immutable.
Recovery tests must reject them as incompatible and preserve the exact text.
