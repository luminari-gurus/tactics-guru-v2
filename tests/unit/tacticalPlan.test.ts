import { describe, expect, it } from 'vitest';
import { battleCatalog } from '../../src/content/catalog';
import { BattleSession } from '../../src/app/BattleSession';
import { previewMove, previewMovement } from '../../src/domain/grid';
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
    const unreachable = catalog.maps[state.mapId].cells.find(cell => {
      const result = previewMove(state, { ...move, to: { x: cell.x, y: cell.y } }, catalog);
      return !result.ok && result.reason === 'unreachable';
    });
    expect(unreachable).toBeDefined();
    expect(previewTacticalPlan(state, { ...move, to: { x: unreachable!.x, y: unreachable!.y } }, ability, catalog))
      .toEqual({ ok: false, reason: 'unreachable' });
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
        const interrupted = new BattleSession(catalog,state,state.seed);
        expect(interrupted.preparePlan(move,ability).ok).toBe(true);
        const prefix=interrupted.confirmPlan()!;interrupted.cancel();interrupted.finishPresentation(prefix.token);
        expect(interrupted.confirmPlannedAbility()).toBeNull();
        expect(interrupted.continuation!.commands).toEqual([move]);
        expect(interrupted.state).toEqual(prefix.after);
        const undo = interrupted.undoMove();
        expect(undo).not.toBeNull();
        interrupted.finishPresentation(undo!.token);
        expect(interrupted.state.units.find(u=>u.id===fighter.id)!.cell).toEqual(fighter.cell);
        expect(interrupted.confirmPlannedAbility()).toBeNull();
        const session = new BattleSession(catalog, state, state.seed);
        expect(session.preparePlan(move, ability).ok).toBe(true);
        session.cancel();
        expect(session.confirmPlan()).toBeNull();
        expect(session.state).toEqual(before);
        expect(session.preparePlan(move, ability).ok).toBe(true);
        // Simulate an intervening authoritative update after review. Confirmation
        // must preflight both commands again and leave the updated state intact.
        const staleState = { ...state, units: state.units.map(u => u.id === enemy.id ? { ...u, hp: 0 } : u) };
        const staleSession = new BattleSession(catalog, state, state.seed);
        expect(staleSession.preparePlan(move, ability).ok).toBe(true);
        (staleSession as unknown as { current: typeof staleState }).current = staleState;
        expect(staleSession.confirmPlan()).toBeNull();
        expect(staleSession.state).toEqual(staleState);
        expect(staleSession.continuation!.commands).toEqual([]);
        const moved = session.confirmPlan();
        expect(moved).not.toBeNull();
        expect(session.confirmPlannedAbility()).toBeNull();
        session.finishPresentation(moved!.token);
        expect(session.canUndoMove).toBe(true);
        const acted = session.confirmPlannedAbility();
        expect(acted).not.toBeNull();
        expect(session.confirmPlannedAbility()).toBeNull();
        session.finishPresentation(acted!.token);
        expect(session.canUndoMove).toBe(false);
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
