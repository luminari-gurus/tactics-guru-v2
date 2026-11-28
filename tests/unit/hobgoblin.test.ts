import { assert, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { battleCatalog } from '../../src/content/catalog';
import { dungeonBattleCatalog, dungeonEncounterCatalog, dungeonEncounterIdentity, hobgoblinDungeonBattleCatalog,
  hobgoblinDungeonEncounterCatalog, readDungeonEncounterCatalog } from '../../src/content/dungeonEncounters';
import { hobgoblinAssets, hobgoblinBattleContent } from '../../src/content/hobgoblin';
import { validateContent } from '../../src/content/validate';
import type { CellPosition, MapCell, MapRecord } from '../../src/content/types';
import { hobgoblinDungeonBoundary } from '../helpers/dungeonFixtures';
import { dungeonBattle, acceptDungeonBattle } from '../../src/domain/dungeon';
import { decodeDungeon, encodeDungeon } from '../../src/domain/dungeonSaveEnvelope';
import { planEnemyTurn, runEnemyTurn } from '../../src/domain/ai';
import { previewAttack } from '../../src/domain/combat';
import { DUNGEON_ENCOUNTER_POLICY, encounterBattleCatalog, readDungeonEncounterSelection, selectDungeonEncounter } from '../../src/domain/dungeonEncounters';
import { formationAccuracy } from '../../src/domain/effects';
import { previewPush } from '../../src/domain/forcedMovement';
import { rollDie } from '../../src/domain/rng';
import { decodeBattleSave, encodeBattleSave } from '../../src/domain/saveEnvelope';
import { createBattle, dispatch, replayBattle } from '../../src/domain/turns';
import { REPLAY_FORMAT_VERSION } from '../../src/domain/constants';

const bash = { type: 'useAbility', unitId: 3, abilityId: 'ability:shield_bash', target: { unitId: 1 } } as const;
function setup({ natural = 15, target = { x: 2, y: 1 }, foe = { x: 1, y: 1 },
  second = { x: 1, y: 0 }, cells = [] }: {natural?: number; target?: CellPosition; foe?: CellPosition;
    second?: CellPosition; cells?: readonly (CellPosition & Partial<MapCell>)[]} = {}) {
  const map: MapRecord = { id: 'map:bash_test', width: 5, height: 4,
    cells: Array.from({ length: 20 }, (_, i) => {
      const x = i % 5, y = Math.floor(i / 5);
      return { x, y, elevation: 0, terrainId: 'grass', ...cells.find(cell => cell.x === x && cell.y === y) };
    }),
    spawns: [
      { id: 1, side: 'heroes', unitId: 'fighter', ...target },
      { id: 2, side: 'heroes', unitId: 'ranger', ...second },
      { id: 3, side: 'enemies', unitId: 'hobgoblin_warrior', ...foe },
      { id: 4, side: 'enemies', unitId: 'hobgoblin_warrior', x: 1, y: 2 },
    ] };
  const catalog = hobgoblinBattleContent({ ...battleCatalog, maps: { [map.id]: map } });
  for (let seed = 0; seed < 1000; seed++) {
    const created = createBattle(map.id, seed, catalog);
    assert(created.ok);
    if (created.state.initiative[0] === 3 && rollDie(created.state.rng, 20).value === natural)
      return { state: created.state, catalog };
  }
  throw Error('No natural roll in fixture corpus');
}

it('packages illustrated Hobgoblin sprite and portrait exports like the other goblin units', () => {
  let runtimeBytes = 0;
  for (const id of ['asset:hobgoblin_warrior_sprite', 'asset:hobgoblin_warrior_portrait'] as const) {
    const asset = hobgoblinAssets[id], source = readFileSync(asset.sourcePath), runtime = readFileSync(`public${asset.runtimePath}`);
    expect(createHash('sha256').update(source).digest('hex')).toBe(asset.provenance.sourceSha256);
    expect([source.readUInt32BE(16), source.readUInt32BE(20)]).toEqual([asset.sourceWidth, asset.sourceHeight]);
    expect([runtime.readUInt32BE(16), runtime.readUInt32BE(20)]).toEqual([asset.runtimeWidth, asset.runtimeHeight]);
    if (asset.kind === 'unit-sprite') {
      expect(runtime).toEqual(source);
      expect(asset.anchor).toEqual({ x: 32, y: 76 });
    }
    runtimeBytes += runtime.length;
  }
  expect(runtimeBytes).toBe(26970);
});

it('validates scoped production content and preserves the saved older forest selection', () => {
  expect(validateContent(hobgoblinDungeonBattleCatalog).ok).toBe(true);
  expect(readDungeonEncounterCatalog(hobgoblinDungeonEncounterCatalog, hobgoblinDungeonBattleCatalog).ok).toBe(true);
  const invalid = { ...hobgoblinDungeonBattleCatalog, abilities: { ...hobgoblinDungeonBattleCatalog.abilities,
    [bash.abilityId]: { ...hobgoblinDungeonBattleCatalog.abilities[bash.abilityId], rangeMax: 2 } } };
  expect(validateContent(invalid).ok).toBe(false);
  const selection = Array.from({ length: 64 }, (_, seed) => selectDungeonEncounter(seed, 2, 1))
    .find(value => value.mapId === 'hobgoblin_formation');
  assert(selection);
  expect(selection.encounter.roster.filter(s => s.side === 'enemies').map(s => s.unitId))
    .toEqual(['hobgoblin_warrior', 'hobgoblin_warrior']);
  expect(encounterBattleCatalog(selection)).toBe(hobgoblinDungeonBattleCatalog);
  expect(hobgoblinDungeonBattleCatalog.abilities['ability:basic_attack'].owners).toContain('hobgoblin_warrior');
  const read = (input: unknown) => readDungeonEncounterSelection(input, 2, 1, 'forest', DUNGEON_ENCOUNTER_POLICY);
  expect(read(selection)).toEqual(selection);
  expect(read({ ...selection, catalogIdentity: dungeonEncounterIdentity })).toBeNull();
  const legacyMap = dungeonEncounterCatalog.pools.find(p => p.id === 'forest')!.maps.find(m => m.id === 'woodland_crossing')!;
  const legacy = { ...selection, catalogIdentity: dungeonEncounterIdentity, mapId: legacyMap.id, compositionId: legacyMap.compositionIds[0],
    encounter: { id: 'encounter:woodland_crossing', source: legacyMap.source, roster: dungeonBattleCatalog.maps['map:woodland_crossing'].spawns } };
  expect(read(legacy)).toEqual(legacy);
  expect(encounterBattleCatalog(read(legacy)!)).toBe(dungeonBattleCatalog);
});

it('evaluates formation from living, cardinal allies without stacking', () => {
  const { state, catalog } = setup({ natural: 8 });
  const actor = state.units.find(u => u.id === 3)!;
  const ally = state.units.find(u => u.id === 4)!;
  expect(formationAccuracy(actor, [...state.units, { ...ally, id: 9, cell: { x: 0, y: 1 } }])).toBe(1);
  const preview = previewAttack(state, bash, catalog);
  expect(preview).toMatchObject({ ok: true, formationBonus: 1, bonus: 6 });
  for (const changed of [{ ...ally, hp: 0 }, { ...ally, cell: { x: 2, y: 2 } }, { ...ally, cell: { x: 0, y: 0 } }]) {
    const units = state.units.map(unit => unit.id === ally.id ? changed : unit);
    const separated = { ...state, units };
    expect(previewAttack(separated, bash, catalog)).toMatchObject({ ok: true, bonus: 5 });
    const miss = dispatch(separated, bash, catalog);
    assert(miss.ok);
    expect(miss.events).toContainEqual(expect.objectContaining({ type: 'attackRolled', result: 'miss' }));
    expect(miss.events.some(event => event.type === 'pushed')).toBe(false);
  }
});

it.each([15, 20])('applies damage before displacement on roll %i and replays/resumes the same cell', natural => {
  const { state, catalog } = setup({ natural });
  const before = structuredClone(state);
  const preview = previewAttack(state, bash, catalog);
  expect(preview).toMatchObject({ ok: true, push: { ok: true, from: { x: 2, y: 1 }, to: { x: 3, y: 1 } } });
  const result = dispatch(state, bash, catalog);
  assert(result.ok);
  expect(result.events.map(e => e.type)).toEqual(['abilityUsed', 'attackRolled', 'damaged', 'pushed']);
  expect(result.state.units[0]).toMatchObject({ cell: { x: 3, y: 1 }, hasMoved: false, hasActed: false });
  expect(state).toEqual(before);
  expect(replayBattle({ format: REPLAY_FORMAT_VERSION, versions: state.versions, initial: state, commands: [bash] }, catalog)).toEqual(result);
  const saved = encodeBattleSave(result.state, catalog);
  assert(saved.ok);
  expect(decodeBattleSave(saved.text, catalog)).toEqual({ ok: true, state: result.state });
});

it('a natural miss or lethal hit never displaces the target', () => {
  for (const [natural, hp] of [[1, 18], [20, 1]]) {
    const { state, catalog } = setup({ natural });
    const result = dispatch({ ...state, units: state.units.map(u => u.id === 1 ? { ...u, hp } : u) }, bash, catalog);
    assert(result.ok);
    expect(result.events.some(e => e.type === 'pushed')).toBe(false);
    expect(result.state.units[0].cell).toEqual(state.units[0].cell);
  }
});

it.each([
  ['edge', { target: { x: 0, y: 1 } }],
  ['occupied', { second: { x: 3, y: 1 } }],
  ['terrain', { cells: [{ x: 3, y: 1, terrainId: 'forest' }] }],
  ['elevation', { cells: [{ x: 3, y: 1, elevation: 1 }] }],
  ['elevation', { cells: [{ x: 2, y: 1, elevation: 2 }] }],
] as const)('a %s stops the push while damage and the action still apply', (reason, options) => {
  const { state, catalog } = setup(options);
  expect(previewAttack(state, bash, catalog)).toMatchObject({ ok: true, push: { ok: false, reason } });
  const result = dispatch(state, bash, catalog);
  assert(result.ok);
  expect(result.events.some(e => e.type === 'damaged')).toBe(true);
  expect(result.events.some(e => e.type === 'pushed')).toBe(false);
  expect(result.state.units[0].cell).toEqual(state.units[0].cell);
  expect(result.state.units[2].hasActed).toBe(true);
});

it('permits a one-step drop and ignores defeated occupants, rejects non-cardinal attacks atomically', () => {
  const { state, catalog } = setup({ cells: [{ x: 2, y: 1, elevation: 1 }], second: { x: 3, y: 1 } });
  const copy = { ...state, units: state.units.map(u => u.id === 2 ? { ...u, hp: 0 } : u) };
  expect(previewAttack(copy, bash, catalog)).toMatchObject({ ok: true, push: { ok: true } });
  expect(previewPush(copy, copy.units[2], copy.units[1], catalog)).toEqual({ ok: false, reason: 'direction' });
  expect(dispatch(state, { ...bash, target: { unitId: 2 } }, catalog)).toEqual({ ok: false, reason: 'outOfRange' });
  expect(state.commandCount).toBe(0);
});

it('AI values a legal push and keeps a living ally beside the chosen attack position', () => {
  const { catalog, state } = setup({ target: { x: 3, y: 1 }, second: { x: 4, y: 3 } });
  const positioned = { ...state, units: state.units.map(u => u.id === 4 ? { ...u, cell: { x: 2, y: 2 } } : u) };
  const plan = planEnemyTurn(positioned, 3, catalog);
  assert(plan.ok);
  expect(plan.commands).toEqual([{ type: 'move', unitId: 3, to: { x: 2, y: 1 } }, bash, { type: 'endTurn', unitId: 3 }]);
  const moved = dispatch(positioned, plan.commands[0], catalog);
  assert(moved.ok);
  expect(previewAttack(moved.state, bash, catalog)).toMatchObject({ ok: true, formationBonus: 1, push: { ok: true } });
});

it('restores a dungeon battle after the production AI bashes and displaces the Fighter', () => {
  const { entry, initial } = hobgoblinDungeonBoundary();
  const battle = dungeonBattle(entry);
  assert(battle);
  const wait = dispatch(initial, { type: 'endTurn', unitId: 1 }, battle.catalog);
  assert(wait.ok);
  const turn = runEnemyTurn(wait.state, 4, battle.catalog);
  assert(turn.ok);
  expect(turn.state.commandCount).toBe(3);
  expect(turn.events).toContainEqual({ type: 'pushed', unitId: 1, path: [{ x: 3, y: 4 }, { x: 3, y: 5 }] });
  expect(turn.events).toContainEqual(expect.objectContaining({ type: 'attackRolled', unitId: 4,
    bonus: battle.catalog.enemies.hobgoblin_warrior.stats.accuracy + 1 }));
  const saved = acceptDungeonBattle(entry, turn.state);
  assert(saved.ok);
  const encoded = encodeDungeon(saved.state);
  assert(encoded.ok);
  expect(decodeDungeon(encoded.text)).toEqual(saved);
});
