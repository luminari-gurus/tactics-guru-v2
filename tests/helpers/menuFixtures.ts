import { battleCatalog } from '../../src/content/catalog';
import { createBattle } from '../../src/domain/turns';
import { encodeBattleSave } from '../../src/domain/saveEnvelope';
import { encodeDungeon } from '../../src/domain/dungeonSaveEnvelope';
import { freshDungeon } from '../../src/domain/dungeon';
import { encodeRunSave } from '../../src/domain/runSaveEnvelope';
import { preparedSnapshot } from './runItemFixtures';
import { runSaveContext } from '../../src/app/runContext';
export function menuFixture(mode: 'battle' | 'run' | 'dungeon') {
  const battle = createBattle('map:forest_ruins', 17, battleCatalog); if (!battle.ok) throw Error(battle.reason);
  const saved = mode === 'battle' ? encodeBattleSave(battle.state, battleCatalog)
    : mode === 'dungeon' ? encodeDungeon(freshDungeon('menu-test', 190)) : encodeRunSave(preparedSnapshot(), runSaveContext);
  if (!saved.ok) throw Error(saved.reason);
  return saved.text;
}
