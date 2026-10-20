import { expect,it } from 'vitest';
import { dungeonVictoryBoundary } from '../helpers/dungeonFixtures';
import { dungeonBattle, acceptDungeonBattle } from '../../src/domain/dungeon';
import { encodeDungeon,decodeDungeon } from '../../src/domain/dungeonSaveEnvelope';
import { dungeonContent } from '../../src/content/dungeon';
import { resolveBattlefield } from '../../src/domain/battlefield';
import { dispatch } from '../../src/domain/turns';
it('legally reaches guardian victory with next-command/RNG equivalence after save/resume',()=>{
  let fixture:ReturnType<typeof dungeonVictoryBoundary>=null,seed=0;
  for(seed=1;seed<=50&&!fixture;seed++)fixture=dungeonVictoryBoundary(seed,2);
  expect(fixture).not.toBeNull();if(!fixture)return;
  expect(seed-1).toBeGreaterThan(0);
  const encoded=encodeDungeon(fixture.snapshot);expect(encoded.ok).toBe(true);if(!encoded.ok)return;
  const decoded=decodeDungeon(encoded.text);expect(decoded.ok).toBe(true);if(!decoded.ok)return;
  const catalog=dungeonBattle(fixture.snapshot)!.catalog;
  const a=dispatch(fixture.snapshot.activeBattle!,fixture.command,catalog),b=dispatch(decoded.state.activeBattle!,fixture.command,catalog);
  expect(a).toEqual(b);expect(a.ok).toBe(true);
  if(a.ok){expect(a.state.outcome).toBe('playerWin');const result=acceptDungeonBattle(decoded.state,a.state);expect(result.ok).toBe(true);if(result.ok){expect(result.state.phase).toBe('ready');expect(result.state.floors[0].completed).toBe(3);}}
},120000);

it('retains the accepted-command history through every legal encounter',()=>{
  let fixture:ReturnType<typeof dungeonVictoryBoundary>=null;
  for(let seed=1;seed<=50&&!fixture;seed++)fixture=dungeonVictoryBoundary(seed,2);
  expect(fixture).not.toBeNull();if(!fixture)return;
  for(const value of fixture.histories){
    const record=value as import('../../src/domain/types').Replay & {battlefield:import('../../src/domain/battlefield').BattlefieldDescriptor};
    const encounter=dungeonContent.encounters.find(e=>e.id===record.battlefield.encounterId)!;
    const resolved=resolveBattlefield(encounter,record.initial.seed,dungeonContent.catalog);expect(resolved.ok).toBe(true);if(!resolved.ok)continue;
    const living=new Set(record.initial.units.filter(u=>u.side==='player').map(u=>u.defId));
    const map={...resolved.map,spawns:resolved.map.spawns.filter(s=>s.side==='enemies'||living.has(s.unitId))};
    const catalog={...dungeonContent.catalog,maps:{...dungeonContent.catalog.maps,[map.id]:map}};
    let state=record.initial;
    for(const command of record.commands){const next=dispatch(state,command,catalog);expect(next.ok).toBe(true);if(!next.ok)throw Error(next.reason);state=next.state;}
    expect(state.outcome).toBe('playerWin');
  }
},120000);
