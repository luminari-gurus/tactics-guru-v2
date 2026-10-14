import { assert, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { authoredEncounters, authoredRun, projectEncounterSpawns, readEncounters, runCatalog } from '../../src/content/encounters';
import { battleCatalog } from '../../src/content/catalog';
import { HERO_IDS } from '../../src/content/constants';
import { contentVersion, readBattleState } from '../../src/domain/battle';
import { hashJson } from '../../src/domain/contentIdentity';
import { createBattle, dispatch, replayBattle } from '../../src/domain/turns';
import { createRun, describeRunBattle } from '../../src/domain/run';
import { previewMovement, moveUnit } from '../../src/domain/grid';
import { previewAttack } from '../../src/domain/combat';
import type { BattleState } from '../../src/domain/types';

it('resolves the ordered run and reuses immutable single-battle definitions and assets', () => {
  expect(authoredRun.encounters).toEqual(['encounter:forest_ruins', 'encounter:woodland_crossing', 'encounter:ruined_approach']);
  expect(Object.keys(battleCatalog.maps)).toEqual(['map:forest_ruins']);
  expect(runCatalog.maps['map:forest_ruins']).toBe(battleCatalog.maps['map:forest_ruins']);
  for (const group of ['heroes', 'enemies', 'abilities', 'assets', 'terrains'] as const) expect(runCatalog[group]).toBe(battleCatalog[group]);
  for (const asset of Object.values(runCatalog.assets)) expect(existsSync(`public${asset.runtimePath}`)).toBe(true);
  const created = createRun('fixture', 1, authoredRun, runCatalog); assert(created.ok);
  expect(describeRunBattle(created.state)?.encounterId).toBe(authoredRun.encounters[0]);
  expect(contentVersion(battleCatalog)).toMatchSnapshot('unchanged single-battle identity');
  expect(authoredEncounters.map(e => hashJson(runCatalog.maps[e.mapId]))).toMatchSnapshot('fixed authored maps');
  for (const e of authoredEncounters) {
    const start = createBattle(e.mapId, 1, runCatalog); assert(start.ok);
    expect(createBattle(e.mapId, 1, runCatalog)).toEqual(start);
    expect(replayBattle({ format: start.state.format, versions: start.state.versions, initial: start.state, commands: [] }, runCatalog).ok).toBe(true);
  }
});

it.each(['unknown-map','duplicate-id','duplicate-map','missing-hero','duplicate-hero','no-enemy','overlap','blocked','coordinate','height','cells','asset','unit','terrain','record-id','shape','sparse','accessor','long-id'])('rejects malformed encounter input: %s', problem => {
  const roster: any = structuredClone(authoredEncounters), catalog: any = structuredClone(runCatalog);
  const map = catalog.maps[roster[1].mapId];
  if (problem === 'unknown-map') roster[1].mapId = 'map:missing';
  if (problem === 'duplicate-id') roster[1].id = roster[0].id;
  if (problem === 'duplicate-map') roster[1].mapId = roster[0].mapId;
  if (problem === 'missing-hero') map.spawns.splice(1,1);
  if (problem === 'duplicate-hero') map.spawns[1].unitId = 'fighter';
  if (problem === 'no-enemy') map.spawns = map.spawns.filter((s:any) => s.side === 'heroes');
  if (problem === 'overlap') Object.assign(map.spawns[1], map.spawns[0], {id:2,unitId:'ranger'});
  if (problem === 'blocked') map.cells.find((c:any) => c.x===3 && c.y===9).terrainId = 'forest';
  if (problem === 'coordinate') map.spawns[0].x = 12;
  if (problem === 'height') map.cells[0].elevation = 999;
  if (problem === 'cells') map.cells.pop();
  if (problem === 'asset') catalog.heroes.mage.spriteAssetId = 'asset:missing';
  if (problem === 'unit') map.spawns[0].unitId = 'missing';
  if (problem === 'terrain') map.cells[0].terrainId = 'missing';
  if (problem === 'record-id') map.id = 'map:wrong';
  if (problem === 'shape') roster[0].extra = true;
  if (problem === 'sparse') delete roster[1];
  if (problem === 'accessor') Object.defineProperty(roster[0], 'id', {enumerable:true,get(){throw Error('must not read');}});
  if (problem === 'long-id') roster[0].id = 'encounter:' + 'a'.repeat(65);
  const result = readEncounters(roster, catalog);
  expect(result.ok).toBe(false); if (!result.ok) expect(result.errors.length).toBeGreaterThan(0);
});

it.each([null, [], [{heroId:'fighter',hp:0}], [{heroId:'fighter',hp:-1}], [{heroId:'fighter',hp:19}], [{heroId:'fighter',hp:1.5}], [{heroId:'mage',hp:NaN}], [{heroId:'unknown',hp:1}], [{heroId:'fighter',hp:1},{heroId:'fighter',hp:1}], [{heroId:'mage',hp:1,extra:true}]])('rejects invalid carried party %#', party => {
  expect(projectEncounterSpawns(authoredRun.encounters[0], party)).toEqual({ok:false,reason:'invalidParty'});
});
it('rejects an unknown encounter without mutating party data', () => {
  expect(projectEncounterSpawns('encounter:missing', [{heroId:'fighter',hp:1}])).toEqual({ok:false,reason:'invalidEncounter'});
});

// Test-only route exploration: enemies stay at authored positions, turns are legally
// advanced without attacks. This proves navigability/target eligibility, not a win or balance.
function canEngage(initial: BattleState, actorId: number, catalog: typeof runCatalog): boolean {
  const takeTurn = (input: BattleState) => {
    let state = input;
    for (let i=0; state.initiative[state.activeIndex] !== actorId; i++) {
      assert(i < state.units.length);
      const next = dispatch(state, {type:'endTurn',unitId:state.initiative[state.activeIndex]}, catalog); assert(next.ok); state = next.state;
    }
    return state;
  };
  const queue = [takeTurn(initial)], seen = new Set<string>();
  while (queue.length) {
    const state = queue.shift()!, actor = state.units.find(u => u.id === actorId)!;
    const key = `${actor.cell.x},${actor.cell.y}`; if (seen.has(key)) continue; seen.add(key);
    if (state.units.some(u => u.side === 'enemy' && previewAttack(state,{type:'useAbility',unitId:actorId,abilityId:'ability:basic_attack',target:{unitId:u.id}},catalog).ok)) return true;
    const reach = previewMovement(state, actorId, catalog); assert(reach.ok);
    for (const {cell} of reach.cells) {
      if (cell.x === actor.cell.x && cell.y === actor.cell.y || seen.has(`${cell.x},${cell.y}`)) continue;
      const moved = moveUnit(state, {type:'move',unitId:actorId,to:cell}, catalog); assert(moved.ok);
      const ended = dispatch(moved.state,{type:'endTurn',unitId:actorId},catalog); assert(ended.ok);
      queue.push(takeTurn(ended.state));
    }
  }
  return false;
}

describe.each(authoredEncounters)('$id survivor eligibility', encounter => {
  it.each([1,2,3,4,5,6,7])('constructs a legal injured-party fixture and engagement route for subset %i', mask => {
    const party = HERO_IDS.map((heroId,i) => ({heroId,hp:mask & (1<<i) ? 1 : 0}));
    const before = structuredClone(runCatalog), copy = structuredClone(party);
    const projected = projectEncounterSpawns(encounter.id, party); assert(projected.ok);
    const living = party.filter(h => h.hp > 0);
    expect(projectEncounterSpawns(encounter.id,living)).toEqual(projected);
    expect(projected.map.spawns.filter(s=>s.side==='heroes').map(s=>s.unitId)).toEqual(living.map(h=>h.heroId));
    expect(projected.map.spawns.filter(s=>s.side==='enemies')).toEqual(runCatalog.maps[encounter.mapId].spawns.filter(s=>s.side==='enemies'));
    const catalog = {...runCatalog,maps:{...runCatalog.maps,[encounter.mapId]:projected.map}};
    const validated = readEncounters(authoredEncounters, runCatalog); assert(validated.ok);
    const start = createBattle(encounter.mapId, 1, catalog); assert(start.ok);
    const state = {...start.state,units:start.state.units.map(u=>u.side==='player'?{...u,hp:living.find(h=>h.heroId===u.defId)!.hp}:u)};
    expect(readBattleState(state,catalog).ok).toBe(true);
    for (const hero of state.units.filter(u=>u.side==='player')) expect(canEngage(state,hero.id,catalog)).toBe(true);
    expect(projected.map.cells[0]).not.toBe(runCatalog.maps[encounter.mapId].cells[0]);
    expect(party).toEqual(copy); expect(runCatalog).toEqual(before);
  });
});
