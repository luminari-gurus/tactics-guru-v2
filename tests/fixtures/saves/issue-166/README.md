# Exact pre-support saved bytes

Captured with unchanged encoders at `56b0c8c3b568f7524d7886a17d6ffdf8af867525`
before support runtime edits on 2026-10-29 (Asia/Jerusalem). The temporary capture
unit passed and was removed; these payloads were not manufactured by rewriting
new-format data. Keep their bytes immutable.

- `battle.json`: createBattle('map:forest_ruins',17,battleCatalog) and encodeBattleSave;
  state 4, rules 5, outer wrapper 1.
- `run.json`: existing activeSnapshot()/runContext and encodeRunSave; envelope 6.
- `dungeon.json`: freshDungeon('issue166-prior',190) and encodeDungeon; envelope 7.

Recovery tests must classify these as incompatible and preserve/export exact text.
