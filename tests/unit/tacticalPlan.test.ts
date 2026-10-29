import { describe, expect, it } from 'vitest';
import { battleCatalog } from '../../src/content/catalog';
import { BattleSession } from '../../src/app/BattleSession';
import { previewMovement } from '../../src/domain/grid';
import { previewTacticalPlan } from '../../src/domain/tacticalPlan';

const catalog = battleCatalog;

describe('tactical plan preview', () => {
  it('checks both commands without changing the original snapshot or consuming RNG', () => {
    const initial = new BattleSession(catalog, 'map:forest_ruins', 2).state;
    const fighter = initial.units.find(u => u.defId === 'fighter')!;
    const enemy = initial.units.find(u => u.side === 'enemy')!;
    const state = { ...initial, activeIndex: initial.initiative.indexOf(fighter.id) };
    const before = structuredClone(state);
    const reach = previewMovement(state, fighter.id, catalog);
    expect(reach.ok).toBe(true);
    if (!reach.ok) return;
    const move = { type: 'move' as const, unitId: fighter.id, to: reach.cells.find(c => c.cost > 0)!.cell };
    const ability = { type: 'useAbility' as const, unitId: fighter.id, abilityId: 'ability:basic_attack' as const, target: { unitId: enemy.id } };
    previewTacticalPlan(state, move, ability, catalog);
    expect(state).toEqual(before);
    expect(previewTacticalPlan(state, { ...move, to: { x: 999, y: 999 } }, ability, catalog).ok).toBe(false);
    expect(previewTacticalPlan(state, move, { ...ability, unitId: enemy.id }, catalog)).toEqual({ ok: false, reason: 'notActiveUnit' });
    expect(state).toEqual(before);
  });

  it('accepts a reachable move followed by a legal attack and rejects a stale defeated target', () => {
    const initial = new BattleSession(catalog, 'map:forest_ruins', 2).state;
    const fighter = initial.units.find(u => u.defId === 'fighter')!;
    const enemy = initial.units.find(u => u.side === 'enemy')!;
    const base = { ...initial, activeIndex: initial.initiative.indexOf(fighter.id) };
    const ability = { type: 'useAbility' as const, unitId: fighter.id, abilityId: 'ability:basic_attack' as const, target: { unitId: enemy.id } };
    let found = false;
    for (const tile of catalog.maps[base.mapId].cells) {
      if (!catalog.terrains[tile.terrainId].walkable || base.units.some(u => u.id !== enemy.id && u.hp > 0 && u.cell.x === tile.x && u.cell.y === tile.y)) continue;
      const state = { ...base, units: base.units.map(u => u.id === enemy.id ? { ...u, cell: { x: tile.x, y: tile.y } } : u) };
      const reach = previewMovement(state, fighter.id, catalog);
      if (!reach.ok) continue;
      for (const { cell, cost } of reach.cells) {
        if (!cost) continue;
        const move = { type: 'move' as const, unitId: fighter.id, to: cell };
        if (!previewTacticalPlan(state, move, ability, catalog).ok) continue;
        const before = structuredClone(state);
        const session = new BattleSession(catalog, state, state.seed);
        expect(session.preparePlan(move, ability).ok).toBe(true);
        session.cancel();
        expect(session.confirmPlan()).toBeNull();
        expect(session.state).toEqual(before);
        expect(session.preparePlan(move, ability).ok).toBe(true);
        const moved = session.confirmPlan();
        expect(moved).not.toBeNull();
        expect(session.confirmPlannedAbility()).toBeNull();
        session.finishPresentation(moved!.token);
        const acted = session.confirmPlannedAbility();
        expect(acted).not.toBeNull();
        expect(session.confirmPlannedAbility()).toBeNull();
        expect(session.continuation!.commands).toEqual([move, ability]);
        const stale = { ...state, units: state.units.map(u => u.id === enemy.id ? { ...u, hp: 0 } : u) };
        expect(previewTacticalPlan(stale, move, ability, catalog).ok).toBe(false);
        expect(state).toEqual(before);
        found = true;
        break;
      }
      if (found) break;
    }
    expect(found).toBe(true);
  });
});
