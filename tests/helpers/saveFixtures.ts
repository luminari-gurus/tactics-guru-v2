import { BattleSession } from '../../src/app/BattleSession';
import { battleCatalog } from '../../src/content/catalog';
import { CONTENT_BOUNDS } from '../../src/content/constants';
import type { ContentCatalog, MapRecord } from '../../src/content/types';
import { validateContent } from '../../src/content/validate';
import { RULE_BOUNDS } from '../../src/domain/constants';
import { createBattle, dispatch, replayBattle } from '../../src/domain/turns';
import { canonical } from '../../src/domain/contentIdentity';
import type { BattleState, Command, Replay } from '../../src/domain/types';
import { playerDecision } from './battlePolicy';

export interface SaveFixture {
  name: string;
  catalog: ContentCatalog;
  state: BattleState;
  replay: Replay;
}

/** Shared by the contract tests and comparison harness; never imported by the application. */
export function saveFixtures(): SaveFixture[] {
  const fixtures: SaveFixture[] = [];
  for (const seed of [1, 2]) {
    const session = new BattleSession(battleCatalog, 'map:forest_ruins', seed);
    const capture = (name: string) => fixtures.push({ name, catalog: battleCatalog, state: session.state, replay: session.replay });
    capture(`start-${seed}`);
    const captured = new Set<string>();
    for (let i = 0; session.phase !== 'ended' && i < 300; i++) {
      const side = session.active.side;
      if (session.phase === 'player' && !session.prepare(playerDecision(session.state)).ok) throw Error('Player policy rejected');
      const step = session.phase === 'player' ? session.confirm() : session.nextEnemy();
      if (!step || session.phase !== 'presenting') throw Error('Expected accepted presentation boundary');
      // Capture the committed state before acknowledging any presentation token.
      if (seed === 2 && !captured.has(side)) { capture(`${side}-presenting`); captured.add(side); }
      if (seed === 2 && session.state.units.some(u => u.guarded) && !captured.has('guarded')) {
        capture('guarded-presenting'); captured.add('guarded');
      }
      session.finishPresentation(step.token);
    }
    if (session.state.outcome !== (seed === 1 ? 'playerLoss' : 'playerWin')) throw Error('Authored fixture outcome changed');
    capture(session.state.outcome);
    if (seed === 2 && captured.size !== 3) throw Error('Missing accepted-boundary fixture');
  }

  // Same 32x32/six-unit/seed-7 Wait workload as turns.test.ts's existing 10,000-command gate.
  const side = CONTENT_BOUNDS.mapWidth.max;
  const map: MapRecord = {
    id: 'map:largest_fixture', width: side, height: side,
    cells: Array.from({ length: side * side }, (_, i) => ({ x: i % side, y: Math.floor(i / side), elevation: 0, terrainId: 'grass' })),
    spawns: [
      { id: 1, side: 'heroes', unitId: 'fighter', x: 0, y: 0 },
      { id: 2, side: 'heroes', unitId: 'ranger', x: 1, y: 0 },
      { id: 3, side: 'heroes', unitId: 'mage', x: 0, y: 1 },
      { id: 4, side: 'enemies', unitId: 'goblin_grunt', x: side - 1, y: side - 1 },
      { id: 5, side: 'enemies', unitId: 'goblin_grunt', x: side - 2, y: side - 1 },
      { id: 6, side: 'enemies', unitId: 'goblin_archer', x: side - 1, y: side - 2 },
    ],
  };
  const content = validateContent({ ...battleCatalog, maps: { [map.id]: map } });
  if (!content.ok) throw Error(JSON.stringify(content.errors));
  const created = createBattle(map.id, 7, content.catalog);
  if (!created.ok) throw Error(created.reason);
  let state = created.state;
  const commands: Command[] = [];
  for (let i = 0; i < RULE_BOUNDS.commandCount.max; i++) {
    const command: Command = { type: 'endTurn', unitId: state.initiative[state.activeIndex] };
    const result = dispatch(state, command, content.catalog);
    if (!result.ok) throw Error(result.reason);
    state = result.state; commands.push(command);
  }
  fixtures.push({ name: 'maximum-commands', catalog: content.catalog, state,
    replay: { format: created.state.format, versions: created.state.versions, initial: created.state, commands } });
  // Fail fixture construction if the independently retained state/log disagree.
  for (const fixture of fixtures) {
    const replayed = replayBattle(fixture.replay, fixture.catalog);
    if (!replayed.ok || canonical(replayed.state) !== canonical(fixture.state)) throw Error(`Invalid fixture: ${fixture.name}`);
  }
  return fixtures;
}
