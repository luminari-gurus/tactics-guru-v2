import { assert, describe, expect, it } from 'vitest';
import { battleCatalog } from '../../src/content/catalog';
import { createBattle, dispatch, replayBattle } from '../../src/domain/turns';
import type { BattleEvent, Command } from '../../src/domain/types';
import { validateContent } from '../../src/content/validate';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

describe('authored first battle', () => {
  it('accepts the actual catalog and complete fixed map', () => {
    expect(validateContent(battleCatalog)).toEqual({ ok: true, catalog: battleCatalog });
    const map = battleCatalog.maps['map:forest_ruins'];
    expect(map.cells).toHaveLength(144);
    expect(map.spawns.map(s => s.unitId)).toEqual(['fighter', 'ranger', 'mage', 'goblin_grunt', 'goblin_archer', 'goblin_grunt']);
    expect(map.cells.filter(c => c.elevation === 1)).toHaveLength(15);
    expect(map.cells.filter(c => c.elevation === 2)).toHaveLength(9);
    expect(Object.keys(battleCatalog.assets)).toHaveLength(17);
    expect(battleCatalog.heroes.fighter.stats.maxHp).toBe(18);
    expect(battleCatalog.heroes.ranger.stats.accuracy).toBe(5);
    expect(battleCatalog.heroes.mage.stats.power).toBe(4);
  });
  it('admits the source-backed Shaman and verifies its packaged sprite/portrait exports', () => {
    expect(battleCatalog.enemies.goblin_shaman.stats).toEqual({ maxHp: 10, move: 4, jump: 1,
      accuracy: 3, armorClass: 11, power: 2, dexterity: 1, will: 3 });
    expect(battleCatalog.abilities['ability:basic_attack'].owners).toContain('goblin_shaman');
    let runtimeBytes = 0;
    for (const id of ['asset:goblin_shaman_sprite', 'asset:goblin_shaman_portrait'] as const) {
      const asset = battleCatalog.assets[id], source = readFileSync(asset.sourcePath), runtime = readFileSync(`public${asset.runtimePath}`);
      expect(createHash('sha256').update(source).digest('hex')).toBe(asset.provenance.sourceSha256);
      expect([source.readUInt32BE(16), source.readUInt32BE(20)]).toEqual([asset.sourceWidth, asset.sourceHeight]);
      expect([runtime.readUInt32BE(16), runtime.readUInt32BE(20)]).toEqual([asset.runtimeWidth, asset.runtimeHeight]);
      if (asset.kind === 'unit-sprite') expect(runtime).toEqual(source);
      runtimeBytes += runtime.length;
    }
    expect(runtimeBytes).toBe(28208);
    for (const change of [(c: any) => { delete c.enemies.goblin_shaman; },
      (c: any) => { c.enemies.goblin_shaman.stats.will = NaN; },
      (c: any) => { c.enemies.goblin_shaman.spriteAssetId = 'asset:missing'; }]) {
      const catalog: any = structuredClone(battleCatalog); change(catalog);
      expect(validateContent(catalog).ok).toBe(false);
    }
  });
  it.each(['reference', 'occupiedSpawn', 'coordinate', 'walkability', 'number', 'cells'])('rejects an authored-content %s regression', code => {
    const c: any = structuredClone(battleCatalog);
    const map = c.maps['map:forest_ruins'];
    if (code === 'reference') c.heroes.fighter.spriteAssetId = 'asset:missing';
    if (code === 'occupiedSpawn') Object.assign(map.spawns[1], { x: 1, y: 8 });
    if (code === 'coordinate') map.spawns[0].x = 12;
    if (code === 'walkability') c.terrains.grass.walkable = false;
    if (code === 'number') c.heroes.mage.stats.maxHp = 101;
    if (code === 'cells') map.cells.pop();
    const result = validateContent(c);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.some(e => e.code === code)).toBe(true);
  });
});

it('scripts elevation and forest LOS on the authored map and replays every accepted command', () => {
  const created = createBattle('map:forest_ruins', 1, battleCatalog);
  assert(created.ok);
  const initial = created.state;
  let state = initial;
  const commands: Command[] = [];
  const events: BattleEvent[] = [];
  const apply = (command: Command) => {
    const result = dispatch(state, command, battleCatalog);
    assert(result.ok, JSON.stringify({ command, result }));
    commands.push(command);
    events.push(...result.events);
    state = result.state;
    return result.events;
  };
  const turn = (unitId: number) => {
    for (let skipped = 0; state.initiative[state.activeIndex] !== unitId; skipped++) {
      assert(skipped < initial.units.length);
      apply({ type: 'endTurn', unitId: state.initiative[state.activeIndex] });
    }
  };
  const move = (unitId: number, x: number, y: number) => {
    turn(unitId);
    apply({ type: 'move', unitId, to: { x, y } });
    apply({ type: 'endTurn', unitId });
  };

  // Grunt approaches the ledge; Ranger attacks from elevation 1 onto elevation 0.
  move(6, 7, 7);
  move(6, 4, 7);
  move(6, 3, 7);
  move(2, 3, 8);
  turn(2);
  const attackEvents = apply({ type: 'useAbility', unitId: 2, abilityId: 'ability:basic_attack', target: { unitId: 6 } });
  expect(attackEvents).toContainEqual(expect.objectContaining({ type: 'attackRolled', unitId: 2, targetId: 6, bonus: 7 }));
  apply({ type: 'endTurn', unitId: 2 });

  // Archer and Fighter approach opposite sides of the forest at (1,3).
  move(5, 6, 2);
  move(5, 3, 2);
  move(1, 2, 6);
  move(1, 2, 3);
  move(1, 0, 3);
  move(5, 2, 3);
  turn(5);
  const before = structuredClone(state);
  const blocked: Command = { type: 'useAbility', unitId: 5, abilityId: 'ability:shortbow_shot', target: { unitId: 1 } };
  expect(dispatch(state, blocked, battleCatalog)).toEqual({ ok: false, reason: 'blockedLos' });
  expect(state).toEqual(before);
  // Rejected attempts are not part of the accepted replay log.
  apply({ type: 'endTurn', unitId: 5 });
  expect(replayBattle({ format: initial.format, versions: initial.versions, initial, commands }, battleCatalog))
    .toEqual({ ok: true, state, events });
});
