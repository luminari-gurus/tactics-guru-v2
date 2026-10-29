import { describe, expect, it } from 'vitest';
import { BattleSession } from '../../src/app/BattleSession';
import { battleCatalog as catalog } from '../../src/content/catalog';
import { previewAttack } from '../../src/domain/combat';
import { enemyThreats } from '../../src/domain/threat';

const initial = () => new BattleSession(catalog, 'map:forest_ruins', 2).state;

describe('enemy threat inspection', () => {
  it('reports legal direct attacks while respecting action budget and keeping state and RNG unchanged', () => {
    const base = initial(), enemy = base.units.find(u => u.defId === 'goblin_archer')!, hero = base.units.find(u => u.side === 'player')!;
    const ability = { type:'useAbility' as const, unitId:enemy.id, abilityId:'ability:shortbow_shot' as const, target:{unitId:hero.id} };
    const isolated = { ...base, activeIndex:base.initiative.indexOf(enemy.id), units:base.units.map(u => u.side === 'enemy' ? { ...u, hasMoved:true, hasActed:u.id !== enemy.id } : u) };
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
        const spent = {...state, units:state.units.map(u => u.id === enemy.id ? {...u,hasActed:true} : u)};
        expect(enemyThreats(spent,catalog)).toEqual({ok:true,targets:[]});
      }
      if (legal) break;
    }
    expect(legal).toBe(true);

  });
  it('includes reachable attacks and excludes them when movement is spent', () => {
    const base = initial(), enemy = base.units.find(u => u.defId === 'goblin_grunt')!, hero = base.units.find(u => u.side === 'player')!;
    const isolated = {...base, activeIndex:base.initiative.indexOf(enemy.id), units:base.units.map(u =>
      u.side === 'enemy' ? {...u,hasMoved:false,hasActed:u.id !== enemy.id} : u)};
    let found = false;
    for (const tile of catalog.maps[base.mapId].cells) {
      if (!catalog.terrains[tile.terrainId].walkable || isolated.units.some(u => u.id !== hero.id && u.hp > 0 && u.cell.x === tile.x && u.cell.y === tile.y)) continue;
      const state = {...isolated,units:isolated.units.map(u => u.id === hero.id ? {...u,cell:{x:tile.x,y:tile.y}} : u)};
      const moving = enemyThreats(state,catalog);
      const spent = enemyThreats({...state,units:state.units.map(u => u.id === enemy.id ? {...u,hasMoved:true} : u)},catalog);
      if (moving.ok && spent.ok && moving.targets.includes(hero.id) && !spent.targets.includes(hero.id)) {
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
      u.id === enemy.id ? {...u,cell:{x:0,y:3},hasMoved:true,hasActed:false} : u.id === hero.id ? {...u,cell:{x:2,y:3}} :
      u.side === 'enemy' ? {...u,hasActed:true} : u)};
    const attack = previewAttack(state, {type:'useAbility',unitId:enemy.id,abilityId:'ability:shortbow_shot',target:{unitId:hero.id}}, catalog);
    expect(attack).toEqual({ok:false,reason:'blockedLos'});
    const result = enemyThreats(state,catalog);
    expect(result.ok && result.targets.includes(hero.id)).toBe(false);
  });
});
