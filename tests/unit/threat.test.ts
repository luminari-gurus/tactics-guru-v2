import { describe, expect, it } from 'vitest';
import { BattleSession } from '../../src/app/BattleSession';
import { battleCatalog as catalog } from '../../src/content/catalog';
import { previewAttack } from '../../src/domain/combat';
import { catalogFixture } from './fixtures/contentContract';
import { contentVersion } from '../../src/domain/battle';
import { STATE_FORMAT_VERSION, RULES_VERSION } from '../../src/domain/constants';
import { seedRng } from '../../src/domain/rng';
import { enemyThreats } from '../../src/domain/threat';

const initial = () => new BattleSession(catalog, 'map:forest_ruins', 2).state;

describe('enemy threat inspection', () => {
  it('reports attacks on the next turn even when action and movement were spent, without changing state or RNG', () => {
    const base = initial(), enemy = base.units.find(u => u.defId === 'goblin_archer')!, hero = base.units.find(u => u.side === 'player')!;
    const ability = { type:'useAbility' as const, unitId:enemy.id, abilityId:'ability:shortbow_shot' as const, target:{unitId:hero.id} };
    const isolated = { ...base, activeIndex:base.initiative.indexOf(enemy.id), units:base.units.map(u => u.side === 'enemy' ? u.id === enemy.id ? { ...u, hasMoved:false, hasActed:false } : { ...u, hp:0 } : u) };
    let legal = false;
    for (const tile of catalog.maps[base.mapId].cells) {
      if (!catalog.terrains[tile.terrainId].walkable || isolated.units.some(u => u.id !== hero.id && u.hp > 0 && u.cell.x === tile.x && u.cell.y === tile.y)) continue;
      const state = { ...isolated, units:isolated.units.map(u => u.id === hero.id ? {...u,cell:{x:tile.x,y:tile.y}} : u) };
      const attack = previewAttack(state, ability, catalog);
      if (!attack.ok && attack.reason !== 'blockedLos') continue;
      const before = structuredClone(state), threats = enemyThreats(state, catalog);
      expect(threats.ok).toBe(true);
      if (!threats.ok) continue;
      expect(threats.targets.includes(hero.id)).toBe(attack.ok);
      expect(state).toEqual(before);
      if (attack.ok) {
        legal = true;
        const spent = {...state, units:state.units.map(u => u.id === enemy.id ? {...u,hasMoved:true,hasActed:true} : u)};
        expect(enemyThreats(spent,catalog)).toEqual(threats);
      }
      if (legal) break;
    }
    expect(legal).toBe(true);

  });
  it('includes reachable attacks after movement was spent and respects movement blocks', () => {
    const base = initial(), enemy = base.units.find(u => u.defId === 'goblin_grunt')!, hero = base.units.find(u => u.side === 'player')!;
    const isolated = {...base, activeIndex:base.initiative.indexOf(enemy.id), units:base.units.map(u =>
      u.side === 'enemy' && u.id !== enemy.id ? {...u,hp:0} : u)};
    let found = false;
    for (const tile of catalog.maps[base.mapId].cells) {
      if (!catalog.terrains[tile.terrainId].walkable || isolated.units.some(u => u.id !== hero.id && u.hp > 0 && u.cell.x === tile.x && u.cell.y === tile.y)) continue;
      const state = {...isolated,units:isolated.units.map(u => u.id === hero.id ? {...u,cell:{x:tile.x,y:tile.y}} : u)};
      const moving = enemyThreats(state,catalog);
      const spent = enemyThreats({...state,units:state.units.map(u => u.id === enemy.id ? {...u,hasMoved:true} : u)},catalog);
      if (moving.ok && spent.ok && moving.targets.includes(hero.id)) {
        expect(spent).toEqual(moving);
        const ranger = state.units.find(u => u.defId === 'ranger')!;
        const pinned = enemyThreats({...state,units:state.units.map(u => u.id === enemy.id ?
          {...u,movementBlock:{sourceId:ranger.id,abilityId:'ability:pinning_shot' as const}} : u)},catalog);
        expect(pinned.ok && pinned.targets.includes(hero.id)).toBe(false);
        found = true; break;
      }
    }
    expect(found).toBe(true);
  });
  it('excludes attacks blocked by line of sight', () => {
    const base = initial(), enemy = base.units.find(u => u.defId === 'goblin_archer')!, hero = base.units.find(u => u.defId === 'ranger')!;
    const state = {...base, activeIndex:base.initiative.indexOf(enemy.id), units:base.units.map(u =>
      u.id === enemy.id ? {...u,cell:{x:0,y:3},hasMoved:false,hasActed:false,movementBlock:{sourceId:hero.id,abilityId:'ability:pinning_shot' as const}} : u.id === hero.id ? {...u,cell:{x:2,y:3}} :
      u.side === 'enemy' ? {...u,hp:0} : u)};
    const attack = previewAttack(state, {type:'useAbility',unitId:enemy.id,abilityId:'ability:shortbow_shot',target:{unitId:hero.id}}, catalog);
    expect(attack).toEqual({ok:false,reason:'blockedLos'});
    const result = enemyThreats(state,catalog);
    expect(result.ok && result.targets.includes(hero.id)).toBe(false);
  });
});

it('honors a narrow occupied route and an impassable climb', () => {
  const make = (blocked: boolean, high: boolean) => {
    const map = {id:'map:threat_corridor' as const,width:4,height:1,
      cells:Array.from({length:4},(_,x)=>({x,y:0,elevation:high && x===1?4:0,terrainId:'grass' as const})),
      spawns:[{id:1,side:'heroes' as const,unitId:'fighter' as const,x:0,y:0},
        {id:2,side:'enemies' as const,unitId:'goblin_grunt' as const,x:3,y:0},
        ...(blocked?[{id:3,side:'heroes' as const,unitId:'ranger' as const,x:2,y:0}]:[])]};
    const c = {...catalogFixture,maps:{[map.id]:map}};
    const units = [{id:1,side:'player' as const,defId:'fighter' as const,cell:{x:0,y:0},hp:18,hasMoved:false,hasActed:false},
      {id:2,side:'enemy' as const,defId:'goblin_grunt' as const,cell:{x:3,y:0},hp:18,hasMoved:false,hasActed:false},
      ...(blocked?[{id:3,side:'player' as const,defId:'ranger' as const,cell:{x:2,y:0},hp:18,hasMoved:false,hasActed:false}]:[])];
    return {c,state:{format:STATE_FORMAT_VERSION,versions:{rules:RULES_VERSION,rng:1 as const,content:contentVersion(c)},seed:1,rng:seedRng(1),mapId:map.id,
      units,initiative:units.map(u=>u.id),activeIndex:0,round:1,outcome:'ongoing',commandCount:0} as import('../../src/domain/types').BattleState};
  };
  for (const [blocked,high,threatened] of [[false,false,true],[true,false,false],[false,true,false]] as const) {
    const {c,state}=make(blocked,high), result=enemyThreats(state,c);
    expect(result.ok && result.targets.includes(1)).toBe(threatened);
  }
});

it('attributes each threatened hero to every legal enemy exactly once', async () => {
  const {createBattle}=await import('../../src/domain/turns');
  const map={id:'map:threat_sources' as const,width:5,height:2,
    cells:Array.from({length:10},(_,i)=>({x:i%5,y:Math.floor(i/5),elevation:0,terrainId:'grass' as const})),
    spawns:[{id:1,side:'heroes' as const,unitId:'fighter' as const,x:0,y:0},
      {id:2,side:'enemies' as const,unitId:'goblin_grunt' as const,x:2,y:0},
      {id:3,side:'enemies' as const,unitId:'goblin_grunt' as const,x:3,y:1}]};
  const c={...catalogFixture,maps:{[map.id]:map}};
  const created=createBattle(map.id,1,c);expect(created.ok).toBe(true);if(!created.ok)return;
  const result=enemyThreats(created.state,c);
  expect(result).toEqual({ok:true,targets:[1],threats:[{targetId:1,enemyIds:[2,3]}]});
  const oneDead={...created.state,units:created.state.units.map(u=>u.id===3?{...u,hp:0}:u),activeIndex:created.state.initiative.indexOf(1)};
  expect(enemyThreats(oneDead,c)).toEqual({ok:true,targets:[1],threats:[{targetId:1,enemyIds:[2]}]});
});
