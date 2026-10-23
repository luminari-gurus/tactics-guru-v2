import { RunItemSession } from '../../src/app/RunItemSession';
import { freshRunSnapshot, replayRunBattle } from '../../src/domain/runBattle';
import { decodeRunSave } from '../../src/domain/runSaveEnvelope';
import { createRunStorage, RUN_STORAGE_KEYS } from '../../src/persistence/runStorage';
import { runContext } from './runItemFixtures';

/** Full-health seed-13 defeat, using the same Wait policy as the browser journey.
 * Real storage rotation retains the last ongoing accepted command as the backup.
 * No hand-edited snapshots, HP, RNG, commands or envelopes are used here.
 */
export function legalDefeatSaves() {
  const data = new Map<string, string>();
  const storage = createRunStorage(runContext, () => ({
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: key => { data.delete(key); },
  }));
  const initial = freshRunSnapshot('recovery-fixture', 13, runContext);
  const controller = new RunItemSession(initial, runContext, storage);
  try {
    const battle = controller.startEncounter();
    if (!battle) throw Error('Missing legal battle');
    for (let i = 0; battle.phase !== 'ended' && i < 500; i++) {
      if (battle.phase === 'player' && !battle.prepare({ type: 'endTurn', unitId: battle.active.id }).ok) {
        throw Error('Wait policy rejected');
      }
      const step = battle.phase === 'enemy' ? battle.nextEnemy() : battle.confirm();
      if (!step) throw Error('Missing accepted command');
      battle.finishPresentation(step.token);
    }
    if (controller.snapshot.items.run.phase !== 'defeat') throw Error('Expected legal defeat');
    const replay = battle.replay!;
    const repeated = replayRunBattle(replay, initial.items, runContext);
    if (!repeated.ok || JSON.stringify(repeated.state) !== JSON.stringify(battle.state)) throw Error('Fixture replay diverged');
    const primary = data.get(RUN_STORAGE_KEYS.primary)!;
    const backup = data.get(RUN_STORAGE_KEYS.backup)!;
    const ended = decodeRunSave(primary, runContext), ongoing = decodeRunSave(backup, runContext);
    if (!ended.ok || !ongoing.ok || ongoing.state.activeBattle?.outcome !== 'ongoing') throw Error('Invalid saved boundary');
    return { primary, backup, ended: ended.state, ongoing: ongoing.state, replay, entry: initial.items, events: battle.events, finalBattle: battle.state };
  } finally {
    controller.dispose();
  }
}
