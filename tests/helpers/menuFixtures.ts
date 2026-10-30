import { BattleSession } from '../../src/app/BattleSession';
import { playerDecision } from './battlePolicy';
import { standaloneCatalog as battleCatalog } from './playerPolicy';
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

/** Legal terminal boundary, using the established browser combat policy. */
export function terminalMenuBattle(): string {
  const session = new BattleSession(battleCatalog, 'map:forest_ruins', 2);
  for (let i=0;session.phase!=='ended' && i<600;i++) {
    if(session.phase==='player' && !session.prepare(playerDecision(session.state,session.catalog)).ok)throw Error('Menu fixture policy rejected');
    const step=session.phase==='player'?session.confirm():session.nextEnemy();
    if(!step)throw Error('Menu fixture missing presentation');session.finishPresentation(step.token);
  }
  if(session.phase!=='ended')throw Error('Menu fixture did not terminate');
  const saved=encodeBattleSave(session.state,battleCatalog);session.dispose();
  if(!saved.ok)throw Error(saved.reason);return saved.text;
}
