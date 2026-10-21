import { atEncounter } from '../helpers/dungeonFixtures';
import { freshDungeon, startDungeonBattle, readDungeon } from '../../src/domain/dungeon';
import { guardedBoundary } from '../helpers/guardedBoundary';
import { combatStats } from '../../src/domain/effects';
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

it('continues a legally reached Guarded dungeon boundary through exact save/resume and expiry', () => {
  let reached = false;
  for (let seed = 1; seed <= 10 && !reached; seed++) {
    const started = startDungeonBattle(atEncounter(freshDungeon('guarded-save', seed))); if (!started.ok) throw Error(started.reason);
    const built = dungeonBattle(started.state)!;
    let fixture; try { fixture = guardedBoundary(built.catalog, started.state.activeBattle!); } catch { continue; }
    const cast = dispatch(fixture.before, fixture.command, built.catalog); if (!cast.ok) throw Error(cast.reason);
    const snapshot = { ...started.state, activeBattle: cast.state };
    const encoded = encodeDungeon(snapshot); if (!encoded.ok) throw Error(encoded.reason);
    const decoded = decodeDungeon(encoded.text); if (!decoded.ok) throw Error(decoded.reason);
    expect(decoded.state).toEqual(snapshot); expect(encodeDungeon(decoded.state)).toEqual(encoded);
    const fighter = decoded.state.activeBattle!.units.find(u => u.defId === 'fighter')!;
    expect(combatStats(fighter, built.catalog).armorClass).toBe(built.catalog.heroes.fighter.stats.armorClass + 2);
    let live = cast.state, resumed = decoded.state.activeBattle!;
    for (let i = 0; i < live.units.length; i++) {
      const command = { type: 'endTurn', unitId: live.initiative[live.activeIndex] };
      const a = dispatch(live, command, built.catalog), b = dispatch(resumed, command, built.catalog); expect(a).toEqual(b);
      if (!a.ok || !b.ok) throw Error('Wait rejected'); live = a.state; resumed = b.state;
    }
    expect(live.units.find(u => u.defId === 'fighter')!.guarded).toBeUndefined();
    for (const field of ['statuses', 'resources']) {
      const bad = { ...snapshot, activeBattle: { ...cast.state, units: cast.state.units.map((u, i) => i ? u : { ...u, [field]: [] }) } };
      expect(readDungeon(bad).ok).toBe(false);
    }
    reached = true;
  }
  expect(reached).toBe(true);
});
