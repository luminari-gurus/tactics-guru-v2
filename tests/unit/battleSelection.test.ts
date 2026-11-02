import { expect, it } from 'vitest';
import { BattleSession } from '../../src/app/BattleSession';
import { battleCatalog } from '../../src/content/catalog';
import { abilityCatalog, abilitySession } from '../helpers/abilityCatalog';
import { BattleSelection, classifyCell, legalSpecials } from '../../src/ui/battleSelection';
import { previewMovement } from '../../src/domain/grid';
import { previewTacticalPlan } from '../../src/domain/tacticalPlan';

function playerSession() {
  const session = new BattleSession(battleCatalog, 'map:forest_ruins', 2);
  while (session.phase === 'enemy') {
    const step = session.nextEnemy();
    if (!step) break;
    session.finishPresentation(step.token);
  }
  expect(session.phase).toBe('player');
  return session;
}

it('selects, previews, confirms, cancels and waits through the session', () => {
  const session = playerSession();
  const model = new BattleSelection(session);
  model.applyTurnDefault();
  expect(model.selectedAction).toBe('move');
  expect(session.pending).toBeNull();
  const actor = session.active;
  const reach = previewMovement(session.state, actor.id, session.catalog);
  expect(reach.ok).toBe(true);
  if (!reach.ok) return;
  const cell = reach.cells.find(entry => entry.cost > 0)!.cell;
  const before = structuredClone({ state: session.state, rng: session.state.rng, commands: session.replay!.commands });
  model.selectCell(cell);
  expect(session.pending).toMatchObject({ type: 'move', to: cell });
  expect(model.preview?.ok).toBe(true);
  model.clear();
  expect(session.pending).toBeNull();
  expect(model.selectedCell).toEqual(cell);
  expect(session.state).toEqual(before.state);
  expect(session.state.rng).toEqual(before.rng);
  model.setAction('move');
  model.selectCell(cell);
  const step = session.confirm();
  expect(step).not.toBeNull();
  session.finishPresentation(step!.token);
  expect(session.state.commandCount).toBe(before.state.commandCount + 1);
  const waiting = new BattleSelection(session);
  waiting.applyTurnDefault();
  waiting.endTurn();
  expect(session.pending?.type).toBe('endTurn');
});

it('plans a move then ability and cancels without committing', () => {
  const session = playerSession();
  const model = new BattleSelection(session);
  const actor = session.active;
  const enemies = session.state.units.filter(unit => unit.side === 'enemy' && unit.hp > 0);
  const reach = previewMovement(session.state, actor.id, session.catalog);
  expect(reach.ok).toBe(true);
  if (!reach.ok) return;
  let chosen: { cell: { x: number; y: number }; enemy: typeof enemies[number] } | null = null;
  for (const destination of reach.cells.filter(entry => entry.cost > 0)) {
    for (const enemy of enemies) {
      const move = { type: 'move' as const, unitId: actor.id, to: destination.cell };
      const ability = { type: 'useAbility' as const, unitId: actor.id, abilityId: 'ability:basic_attack' as const, target: { unitId: enemy.id } };
      if (previewTacticalPlan(session.state, move, ability, session.catalog).ok) {
        chosen = { cell: destination.cell, enemy };
        break;
      }
    }
    if (chosen) break;
  }
  expect(chosen).not.toBeNull();
  if (!chosen) return;
  const before = structuredClone({ state: session.state, rng: session.state.rng });
  model.startPlan();
  expect(model.choosePlanDestination(chosen.cell)).toBe(true);
  model.setAction('basic');
  model.selectCell(chosen.enemy.cell);
  expect(session.pendingPlan).not.toBeNull();
  model.clear();
  expect(session.pendingPlan).toBeNull();
  expect(session.state).toEqual(before.state);
  expect(session.state.rng).toEqual(before.rng);
});

it('builds radial slices from the held cell and omits illegal specials', () => {
  const catalog = abilityCatalog();
  const session = abilitySession('fighter', catalog);
  const model = new BattleSelection(session);
  const enemy = session.state.units.find(unit => unit.side === 'enemy')!;
  expect(classifyCell(session, enemy.cell)).toBe('enemy');
  const slices = model.slices(enemy.cell);
  expect(slices.find(slice => slice.id === 'attack')?.isDefault).toBe(true);
  expect(slices.find(slice => slice.id === 'attack')?.disabled).toBe(false);
  const legal = legalSpecials(session, enemy.cell);
  expect(legal.length).toBeGreaterThan(0);
  expect(legal.every(ability => ability.id !== 'ability:missing')).toBe(true);
  const occupied = new Set(session.state.units.map(unit => `${unit.cell.x},${unit.cell.y}`));
  const empty = session.catalog.maps[session.state.mapId].cells.find(cell => !occupied.has(`${cell.x},${cell.y}`));
  expect(empty).toBeDefined();
  const emptySlices = model.slices(empty!);
  expect(emptySlices.find(slice => slice.id === 'move')?.isDefault).toBe(true);
  expect(emptySlices.find(slice => slice.id === 'attack')?.disabled).toBe(true);
  expect(emptySlices.find(slice => slice.id === 'inspect')?.disabled).toBe(false);
  const self = model.slices(session.active.cell);
  expect(self.find(slice => slice.id === 'inspect')?.isDefault).toBe(true);
});

it('allocates every Magic Missile to one radial target', () => {
  const session = abilitySession('mage');
  const model = new BattleSelection(session);
  const enemy = session.state.units.find(unit => unit.side === 'enemy')!;
  const missile = legalSpecials(session, enemy.cell).find(ability => ability.kind === 'magicMissile' && ability.casterLevel >= 3)
    ?? legalSpecials(session, enemy.cell).find(ability => ability.kind === 'magicMissile')!;
  const result = model.commitSpecial(enemy.cell, missile.id);
  expect(result.commit).toBe(true);
  expect(session.pending).toMatchObject({ type: 'useAbility', abilityId: missile.id, target: { unitId: enemy.id } });
  const preview = session.preview(session.pending!);
  expect(preview.ok && 'missileCount' in preview).toBe(true);
  if (!preview.ok || !('missileCount' in preview)) return;
  expect(preview.missileCount).toBeGreaterThan(0);
  expect(preview.targetIds.every(id => id === enemy.id)).toBe(true);
});

it('omits an illegal special such as High Shot at range 1', () => {
  const session = abilitySession('ranger');
  const enemy = session.state.units.find(unit => unit.side === 'enemy')!;
  const ids = legalSpecials(session, enemy.cell).map(ability => ability.id);
  expect(ids).not.toContain('ability:high_shot');
  expect(ids.length).toBeGreaterThan(0);
});
