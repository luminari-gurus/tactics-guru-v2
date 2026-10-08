import { describe, expect, it, vi } from 'vitest';
import { catalogFixture } from './fixtures/contentContract';
import type { MapRecord } from '../../src/content/types';
import { nextUint32, seedRng } from '../../src/domain/rng';
const path = '../../src/domain/battle';
const battle = await import(/* @vite-ignore */ path).catch(() => null);
const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const battleMap = {
  id: 'map:battle_fixture', width: 2, height: 1,
  cells: [{ x:0,y:0,elevation:0,terrainId:'grass' }, { x:1,y:0,elevation:0,terrainId:'grass' }],
  spawns: [{id:1,side:'heroes',unitId:'fighter',x:0,y:0}, {id:2,side:'enemies',unitId:'goblin_grunt',x:1,y:0}],
} as const satisfies MapRecord;
const catalog = { ...copy(catalogFixture), maps: { [battleMap.id]: battleMap } };
// The content validator (#28) is not required: synthetic input checked by runtime boundaries.
const fixture = () => ({ format: 1, versions: { rules: 1, rng: 1, content: battle!.contentVersion(catalog) }, seed: 1,
  rng: seedRng(1), mapId: battleMap.id, units: [{ id: 1, defId: 'fighter', side: 'player', cell: { x: 0, y: 0 }, hp: 18, hasMoved: false, hasActed: false }, {id:2,defId:'goblin_grunt',side:'enemy',cell:{x:1,y:0},hp:18,hasMoved:false,hasActed:false}],
  initiative: [1,2], activeIndex: 0, round: 1, outcome: 'ongoing', commandCount: 0 });
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value;
}
describe('battle foundation boundary', () => {
  it('provides the pure battle foundation', () => expect(battle).not.toBeNull());
  it('round-trips untrusted JSON to isolated deeply nested state', () => {
    const input = freeze(fixture()); const before = JSON.stringify(input);
    const result = battle!.readBattleState(input, freeze(copy(catalog)));
    expect(result.ok).toBe(true); expect(result.state).toEqual(input);
    expect(result.state).not.toBe(input); expect(result.state.units[0].cell).not.toBe(input.units[0].cell);
    result.state.units[0].cell.x = 1; result.state.rng.words[0] = 0; result.state.initiative[0] = 2;
    result.state.versions.rules = 7;
    expect(JSON.stringify(input)).toBe(before);
    expect(battle!.readBattleState(copy(input), catalog)).toEqual(battle!.readBattleState(input, catalog));
  });
  it('hashes canonical catalog data, not insertion order or external entropy', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => { throw Error('entropy'); });
    vi.spyOn(Date, 'now').mockImplementation(() => { throw Error('clock'); });
    try {
      const reordered = Object.fromEntries(Object.entries(catalog).reverse());
      expect(battle!.contentVersion(reordered)).toBe(battle!.contentVersion(catalog));
      const changed = { ...catalog, heroes: { ...catalog.heroes, fighter: { ...catalog.heroes.fighter, stats: { ...catalog.heroes.fighter.stats, maxHp: 19 } } } };
      expect(battle!.contentVersion(changed)).not.toBe(battle!.contentVersion(catalog));
      expect(battle!.readBattleState(fixture(), catalog).ok).toBe(true);
      expect(battle!.previewCommand(fixture(), { type: 'endTurn', unitId: 1 }, catalog).ok).toBe(true);
    } finally { vi.restoreAllMocks(); }
  });
  it('rejects unsafe numbers, identifiers, unknown fields and broken invariants', () => {
    const mutations: ((s: any) => void)[] = [
      s => s.seed = -1, s => s.round = 0, s => s.round = 1.5, s => s.commandCount = Number.MAX_SAFE_INTEGER + 1,
      s => s.activeIndex = 2, s => s.activeIndex = NaN, s => s.rng.words[0] = Infinity,
      s => s.rng.words.push(0), s => s.rng.cursor = -1,
      s => s.units[0].hp = 19, s => s.units[0].hp = -1, s => s.units[0].cell.x = 2,
      s => s.units[0].cell.y = 0.5, s => s.units[0].id = 65, s => s.units[0].defId = 'missing',
      s => s.units[0].side = 'enemy', s => s.units[0].hasMoved = 0,
      s => s.units.push(copy(s.units[0])), s => s.initiative = [], s => s.initiative = [2],
      s => s.mapId = 'map:', s => s.mapId = 'map:not_here', s => s.versions.rules++, s => s.versions.content = 'invalid',
      s => s.extra = {}, s => s.units[0].cell.extra = 1, s => s.units[0].statuses = ['guarded'],
      s => s.format++, s => s.outcome = 'victory', s => s.units[0].hp = 0,
    ];
    for (const mutate of mutations) { const input = fixture(); mutate(input); expect(battle!.readBattleState(input, catalog).ok, mutate.toString()).toBe(false); }
    for (const v of [null, [], new Date(), {}, { ...fixture(), units: new Set() }]) expect(battle!.readBattleState(v, catalog).ok).toBe(false);
  });
  it('rejects living overlap and non-total initiative order', () => {
    const s = fixture(); s.units[1].cell = {x:0,y:0};
    expect(battle!.readBattleState(s, catalog).ok).toBe(false);
    s.units[1].hp = 0; s.outcome = 'playerWin'; expect(battle!.readBattleState(s, catalog).ok).toBe(true);
    s.initiative = [1,1]; expect(battle!.readBattleState(s, catalog).ok).toBe(false);
    s.initiative = [1,2]; s.units.reverse(); expect(battle!.readBattleState(s, catalog).ok).toBe(false);
  });
  it('validates command intent and returns isolated previews without advancing RNG', () => {
    const state = freeze(fixture()); const before = JSON.stringify(state);
    const command = freeze({ type: 'move', unitId: 1, to: { x: 0, y: 0 } });
    const result = battle!.previewCommand(state, command, catalog);
    expect(result).toEqual({ ok: true, command }); expect(result.command.to).not.toBe(command.to);
    for (const cmd of [null, { type:'restart' }, { type:'endTurn', unitId: 1, damage: 5 }, { type:'endTurn', unitId: 1.5 }, { type:'move', unitId:1, to:{x:NaN,y:0} }, { type:'useAbility', unitId:1, abilityId:'', target:{unitId:1} }])
      expect(battle!.previewCommand(state, cmd, catalog)).toEqual({ ok: false, reason: 'malformedCommand' });
    expect(battle!.previewCommand(state, { type:'endTurn', unitId:3 }, catalog)).toEqual({ ok:false, reason:'unknownUnit' });
    expect(JSON.stringify(state)).toBe(before);
  });
  it('rejects identifier suffixes outside stable snake_case', () => {
    for (const abilityId of ['ability:bad-id','ability:Bad','ability:bad__id','ability:','basic_attack'])
      expect(battle!.previewCommand(fixture(),{type:'useAbility',unitId:1,abilityId,target:{unitId:2}},catalog)).toEqual({ok:false,reason:'malformedCommand'});
  });
  it('validates target discriminants and numeric bounds', () => {
    for (const command of [ {type:'useAbility',unitId:1,abilityId:'ability:basic_attack',target:{unitId:1}}, {type:'useAbility',unitId:1,abilityId:'ability:basic_attack',target:{cell:{x:0,y:0}}} ])
      expect(battle!.previewCommand(fixture(), command, catalog).ok).toBe(true);
    for (const target of [{}, {unitId:0}, {unitId:1,cell:{x:0,y:0}}, {cell:{x:32,y:0}}, {cell:{x:0,y:0},extra:0}])
      expect(battle!.previewCommand(fixture(), {type:'useAbility',unitId:1,abilityId:'ability:basic_attack',target},catalog).reason).toBe('malformedCommand');
  });
  it('rejects sparse and decorated arrays in state and replay', () => {
    for (const field of ['units','initiative']) {
      const input: any = fixture(); input[field] = new Array(2);
      expect(battle!.readBattleState(input,catalog).ok).toBe(false);
      input[field] = Object.assign(fixture()[field as 'units' | 'initiative'], {extra:1});
      expect(battle!.readBattleState(input,catalog).ok).toBe(false);
    }
    for (const commands of [new Array(2),Object.assign([{type:'endTurn',unitId:1}],{extra:1})]) {
      const initial = fixture();
      expect(battle!.readReplay({format:1,versions:initial.versions,initial,commands},catalog).ok).toBe(false);
    }
  });
  it('rejects inconsistent outcomes, spawn references and blocked living cells', () => {
    for (const mutate of [(s:any)=>s.outcome='playerWin', (s:any)=>s.outcome='playerLoss', (s:any)=>s.units[1].hp=0, (s:any)=>s.units[0].defId='ranger', (s:any)=>s.units[1].id=3]) {
      const s=fixture(); mutate(s); expect(battle!.readBattleState(s,catalog).ok).toBe(false);
    }
    const blocked = {...catalog, terrains:{...catalog.terrains,grass:{...catalog.terrains.grass,walkable:false}}};
    const s=fixture(); s.versions.content=battle!.contentVersion(blocked);
    expect(battle!.readBattleState(s,blocked).ok).toBe(false);
  });
  it('validates seeded counter consistency while preserving nonzero continuation', () => {
    const input = fixture(); input.rng = nextUint32(input.rng).rng;
    const roundtrip = battle!.readBattleState(copy(input),catalog);
    expect(roundtrip.ok).toBe(true);
    expect(nextUint32(roundtrip.state.rng)).toEqual(nextUint32(input.rng));
    input.rng = {...input.rng,cursor:2};
    expect(battle!.readBattleState(input,catalog).ok).toBe(false);
  });
  it('accepts replay initial snapshot after initiative has consumed RNG', () => {
    const initial=fixture(); initial.rng=nextUint32(nextUint32(initial.rng).rng).rng;
    expect(battle!.readReplay({format:1,versions:initial.versions,initial,commands:[]},catalog).ok).toBe(true);
  });
  it('replay envelope pins versions, seed, initial cursor and accepted commands', () => {
    const initial = fixture(); const input = freeze({ format: 1, versions: initial.versions, initial, commands: [{type:'endTurn',unitId:1}] });
    const a = battle!.readReplay(input,catalog); const b = battle!.readReplay(copy(input),catalog);
    expect(a.ok).toBe(true); expect(a).toEqual(b); expect(a.replay.initial).not.toBe(input.initial);
    expect(a.replay.commands[0]).not.toBe(input.commands[0]);
    for (const mutate of [(r:any)=>r.versions.rng++, (r:any)=>r.initial.seed++, (r:any)=>r.initial.rng.cursor=-1, (r:any)=>r.commands[0].unitId=0, (r:any)=>r.commands=Array(10001).fill({type:'endTurn',unitId:1}), (r:any)=>r.extra=1]) {
      const bad = copy(input); mutate(bad); expect(battle!.readReplay(bad,catalog).ok).toBe(false);
    }
  });
});
