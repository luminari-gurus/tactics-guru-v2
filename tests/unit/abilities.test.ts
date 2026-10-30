import { STATE_FORMAT_VERSION, RNG_WARMUP_DRAWS, RULE_BOUNDS, UINT32_RANGE } from '../../src/domain/constants';
import { guardedEffect, combatStats } from '../../src/domain/effects';
import { unitFeedback } from '../../src/ui/hud';
import { BattleSession } from '../../src/app/BattleSession';
import { assert, expect, it } from 'vitest';
import { battleCatalog } from '../../src/content/catalog';
import { contentVersion, readBattleState } from '../../src/domain/battle';
import { previewAttack, previewMagicMissile, previewAbility, previewFighterAbility, previewControlAbility, previewSupportAbility } from '../../src/domain/combat';
import { createBattle, dispatch, endTurn, replayBattle } from '../../src/domain/turns';
import { validateContent } from '../../src/content/validate';
import { rollDie, seedRng } from '../../src/domain/rng';
import { abilityPresentation } from '../../src/phaser/abilityPresentation';
import { previewMove, previewMovement } from '../../src/domain/grid';
import { planEnemyTurn, runEnemyTurn } from '../../src/domain/ai';
import { decodeBattleSave, encodeBattleSave } from '../../src/domain/saveEnvelope';
import { eventText, previewText } from '../../src/ui/hud';
import type { BattleState } from '../../src/domain/types';
import { battleCues } from '../../src/audio/battleCues';

const shot = { type: 'useAbility', unitId: 2, abilityId: 'ability:high_shot', target: { unitId: 4 } } as const;
function freeze<T>(value:T):T {
  if(value && typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;
}

it('maps frozen accepted signature events to affected units without changing state or the next RNG draw',()=>{
  for(const natural of [1,12,20]){
    const {catalog,state}=guardSetup(natural);
    const before=freeze(state),result=dispatch(before,guardedStrike,catalog);assert(result.ok);
    freeze(result);const copy=structuredClone({before,result}),next=rollDie(result.state.rng,20);
    const view=abilityPresentation(result.events);
    expect(view.signature).toEqual({kind:'guarded_strike',actorId:1,targetId:4,missed:natural===1,guarded:true});
    expect(view.feedback).toEqual([
      {unitId:4,kind:'result',text:natural===1?'Miss':natural===20?'Critical · −10':'Hit · −5'},
      ...(natural===20?[{unitId:4,kind:'defeat',text:'Defeated'}]:[]),
      {unitId:1,kind:'guard',text:'Guarded'},
    ]);
    expect({before,result}).toEqual(copy);expect(rollDie(result.state.rng,20)).toEqual(next);
  }
  const {catalog,state}=setup(3,2);
  let seed=0;while(rollDie(seedRng(seed),20).value!==20)seed++;
  const critical=dispatch(freeze({...state,rng:seedRng(seed)}),shot,catalog);assert(critical.ok);freeze(critical);
  const view=abilityPresentation(critical.events);
  expect(view.signature).toMatchObject({kind:'high_shot',actorId:2,targetId:4,missed:false});
  expect(view.feedback).toEqual([{unitId:4,kind:'result',text:'Critical · −12'},{unitId:4,kind:'defeat',text:'Defeated'}]);
  for(let seed=0;seed<12;seed++){
    const {catalog,state}=missileSetup();
    const result=dispatch(freeze({...state,rng:seedRng(seed)}),missile,catalog);assert(result.ok);freeze(result);
    const copy=structuredClone(result),view=abilityPresentation(result.events);
    const damage=result.events.find(e=>e.type==='damaged')!;
    expect(view.signature).toEqual({kind:'magic_missile',actorId:3,targetId:4,missed:false,guarded:false});
    expect(view.feedback).toEqual([{unitId:4,kind:'result',text:`−${damage.damage}`}]);
    expect(result).toEqual(copy);expect(result.events.some(e=>e.type==='attackRolled')).toBe(false);
  }
  expect(abilityPresentation([])).toEqual({signature:null,feedback:[]});
  const basic=dispatch(guardSetup(12).state,{...guardedStrike,abilityId:'ability:basic_attack'},guardSetup(12).catalog);
  assert(basic.ok);expect(abilityPresentation(basic.events).signature).toBeNull();
});
function setup(distance = 3, rise = 0) {
  const catalog = { ...battleCatalog, maps: { 'map:forest_ruins': { ...battleCatalog.maps['map:forest_ruins'],
    cells: battleCatalog.maps['map:forest_ruins'].cells.map(c => ({ ...c, terrainId: 'grass' as const,
      elevation: c.x === 0 && c.y === 0 ? rise : 0 })) } } };
  const created = createBattle('map:forest_ruins', 17, catalog); assert(created.ok);
  const state = { ...created.state, activeIndex: created.state.initiative.indexOf(2),
    units: created.state.units.map(u => u.id === 2 ? { ...u, cell: { x: 0, y: 0 } } :
      u.id === 4 ? { ...u, cell: { x: distance, y: 0 } } : u) };
  return { catalog, state };
}
it('High Shot uses the real Ranger stats and elevation in shared preview and dispatch', () => {
  for (const rise of [0, 1, 4]) {
    const { catalog, state } = setup(3, rise); const before = structuredClone(state);
    const contentBefore = structuredClone(catalog);
    const preview = previewAttack(state, shot, catalog); assert(preview.ok);
    expect(preview).toMatchObject({ bonus: rise ? 7 : 5, damage: rise ? 6 : 4, criticalDamage: rise ? 12 : 8 });
    expect(state).toEqual(before);
    expect(catalog).toEqual(contentBefore);
    const result = dispatch(state, shot, catalog); assert(result.ok);
    expect(result.events.find(e => e.type === 'attackRolled')).toMatchObject({ bonus: preview.bonus });
    expect(result.state.units.find(u => u.id === 2)?.hasActed).toBe(true);
    expect(state).toEqual(before);
  }
});
const guardedStrike = { type: 'useAbility', unitId: 1, abilityId: 'ability:guarded_strike', target: { unitId: 4 } } as const;
const secondWind = {type:'useAbility',unitId:1,abilityId:'ability:second_wind',target:{unitId:1}} as const;
const taunt = {...guardedStrike,abilityId:'ability:taunt'} as const;
const mark = { type: 'useAbility', unitId: 2, abilityId: 'ability:mark_target', target: { unitId: 4 } } as const;
const pin = { ...mark, abilityId: 'ability:pinning_shot' } as const;
const snare = { ...pin, unitId:3, abilityId:'ability:frost_snare' } as const;
function rangerSetup() {
  const { catalog, state } = setup();
  const cells = [{x:2,y:0},{x:0,y:0},{x:1,y:0},{x:3,y:0},{x:5,y:0},{x:7,y:0}];
  return { catalog, state: { ...state, units: state.units.map((u,i) => ({ ...u, cell: cells[i] })) } };
}
function activate(state: BattleState, id: number): BattleState {
  return { ...state, activeIndex: state.initiative.indexOf(id), units: state.units.map(u =>
    u.id === id ? { ...u, hasActed: false, hasMoved: false } : u) };
}
function naturalState(state: BattleState, natural: number): BattleState {
  let seed=0; while (rollDie(seedRng(seed),20).value !== natural) seed++;
  return { ...state, rng: seedRng(seed) };
}

const hex = { type: 'useAbility', unitId: 6, abilityId: 'ability:weakening_hex', target: { unitId: 1 } } as const;
const healGoblin = { ...hex, abilityId: 'ability:heal_goblin', target: { unitId: 4 } } as const;
function shamanSetup(secondShaman = false) {
  const source = battleCatalog.maps['map:forest_ruins'];
  const map = { ...source, cells: source.cells.map(c => ({ ...c, elevation: 0, terrainId: 'grass' as const })),
    spawns: source.spawns.map(s => s.side === 'enemies' && (s.id === 6 || secondShaman && s.id === 5)
      ? { ...s, unitId: 'goblin_shaman' as const } : s) };
  const catalog = { ...battleCatalog, maps: { [map.id]: map } };
  const created = createBattle(map.id, 17, catalog); assert(created.ok);
  const cells = [{x:0,y:0},{x:2,y:0},{x:4,y:0},{x:1,y:1},{x:3,y:1},{x:0,y:2}];
  const state = activate({ ...created.state, units: created.state.units.map((u,i) => ({ ...u, cell: cells[i] })) }, 6);
  assert(readBattleState(state, catalog).ok); return { catalog, state };
}
it('Hex previews every face exactly, saves on equality, spends one action/d20 and otherwise changes only accuracy', () => {
  for (let natural = 1; natural <= 20; natural++) {
    const { catalog, state } = shamanSetup(), before = freeze(naturalState(state, natural));
    const snapshot = structuredClone(before), preview = previewSupportAbility(before, hex, catalog); assert(preview.ok);
    expect(preview).toMatchObject({ kind:'weakeningHex',modifier:1,dc:12,savedFaces:10,failedSaveFaces:10 });
    expect(previewText(preview)).toContain('Will save 50% (10/20 faces)');
    const result = dispatch(before, hex, catalog); assert(result.ok);
    expect(result.events).toEqual([{type:'abilityUsed',unitId:6,abilityId:hex.abilityId,target:hex.target},
      {type:'saveRolled',unitId:1,natural,modifier:1,total:natural+1,dc:12,saved:natural>=11},
      ...(natural<11?[{type:'weakened',unitId:1,sourceId:6}]:[])]);
    expect(result.state.rng).toEqual(rollDie(before.rng,20).rng);
    const save=result.events.find(e=>e.type==='saveRolled')!;
    expect(eventText(save,id=>`Unit ${id}`)).toContain(`Will save ${natural>=11?'succeeds':'fails'}`);
    expect(eventText(save,id=>`Unit ${id}`)).toContain('50% save chance');
    expect(battleCues(result.events,catalog)).toEqual([]);
    expect(result.state.commandCount).toBe(before.commandCount+1);
    expect(result.state.units.find(u=>u.id===6)).toMatchObject({hasActed:true,hasMoved:false});
    const target = result.state.units.find(u=>u.id===1)!;
    expect(target.weakenedBy).toBe(natural<11?6:undefined);
    expect(combatStats(target,catalog)).toEqual({accuracy:natural<11?2:4,armorClass:14});
    expect(result.state.units.map(u=>u.hp)).toEqual(before.units.map(u=>u.hp));
    expect(result.state.activeIndex).toBe(before.activeIndex); expect(before).toEqual(snapshot);
    expect(readBattleState(result.state,catalog).ok).toBe(true);
  }
});
it('Hex uses projected power/Will and never automatic natural save outcomes', () => {
  for (const [power,will,natural,saved,faces] of [[0,20,1,true,20],[20,-10,20,false,0],[5,2,13,true,8]] as const) {
    const {catalog:base,state:initial}=shamanSetup();
    const catalog={...base,heroes:{...base.heroes,fighter:{...base.heroes.fighter,stats:{...base.heroes.fighter.stats,will}}},
      enemies:{...base.enemies,goblin_shaman:{...base.enemies.goblin_shaman,stats:{...base.enemies.goblin_shaman.stats,power}}}};
    const state=naturalState({...initial,versions:{...initial.versions,content:contentVersion(catalog)}},natural);
    const preview=previewAbility(state,hex,catalog);assert(preview.ok);
    expect(preview).toMatchObject({dc:10+power,modifier:will,savedFaces:faces});
    const result=dispatch(state,hex,catalog);assert(result.ok);
    expect(result.events.find(e=>e.type==='saveRolled')).toMatchObject({saved});
  }
});
it('Weakened refreshes one source, preserves it on save, combines once with Guard/Mark, and expires at target turn end', () => {
  const {catalog,state}=shamanSetup(true);
  const first=dispatch(naturalState(state,1),hex,catalog);assert(first.ok);
  const fromOther={...hex,unitId:5};
  const second=dispatch(naturalState(activate(first.state,5),1),fromOther,catalog);assert(second.ok);
  expect(second.state.units.find(u=>u.id===1)?.weakenedBy).toBe(5);
  const saved=dispatch(naturalState(activate(second.state,6),20),hex,catalog);assert(saved.ok);
  expect(saved.state.units.find(u=>u.id===1)?.weakenedBy).toBe(5);
  expect(saved.events.some(e=>e.type==='weakened')).toBe(false);
  let active=activate({...saved.state,units:saved.state.units.map(u=>u.id===1?{...u,guarded:true as const}:
    u.id===4?{...u,markedBy:2,cell:{x:1,y:0}}:u)},1);
  const attack={type:'useAbility' as const,unitId:1,abilityId:'ability:guarded_strike' as const,target:{unitId:4}};
  const preview=previewAttack(active,attack,catalog);assert(preview.ok);
  expect(preview.bonus).toBe(2); // baseline 4 - Guard 2 - Weakened 2 + Mark 2
  expect(combatStats(active.units[0],catalog,true)).toEqual({accuracy:0,armorClass:16});
  const encoded=encodeBattleSave(active,catalog);assert(encoded.ok);
  const decoded=decodeBattleSave(encoded.text,catalog);assert(decoded.ok);expect(decoded.state).toEqual(active);
  const ended=endTurn(decoded.state,{type:'endTurn',unitId:1},catalog);assert(ended.ok);
  expect(ended.events).toContainEqual({type:'weakenedExpired',unitId:1,sourceId:5});
  expect(ended.state.units[0].weakenedBy).toBeUndefined();
  expect(combatStats(ended.state.units[0],catalog).accuracy).toBe(2); // Guard remains until next turn start
});
it('Hex and healing reject invalid casts atomically, including immunity and exhausted RNG', () => {
  for (const ability of [hex,healGoblin]) {
    const base=shamanSetup();
    const healthy={...base.state,units:base.state.units.map(u=>u.id===4?{...u,hp:2}:u)};
    const cases:[BattleState,unknown,string][]=[
      [healthy,{...ability,target:{unitId:63}},'missingTarget'],
      [healthy,{...ability,target:{cell:{x:0,y:0}}},'wrongTargetKind'],
      [healthy,{...ability,unitId:1},'notActiveUnit'],
      [healthy,{...ability,abilityId:'ability:missing'},'unknownAbility'],
      [{...healthy,units:healthy.units.map(u=>u.id===6?{...u,hasActed:true}:u)},ability,'alreadyActed'],
      [{...healthy,units:healthy.units.map(u=>u.id===ability.target.unitId?{...u,hp:0}:u)},ability,'targetDefeated'],
      [{...healthy,units:healthy.units.map(u=>u.id===ability.target.unitId?{...u,cell:{x:10,y:10}}:u)},ability,'outOfRange'],
    ];
    for(const [snapshot,input,reason] of cases) {
      const before=structuredClone(snapshot);freeze(snapshot);
      expect(previewSupportAbility(snapshot,input,base.catalog)).toEqual({ok:false,reason});
      expect(dispatch(snapshot,input,base.catalog)).toEqual({ok:false,reason});expect(snapshot).toEqual(before);
    }
    const catalog={...base.catalog,maps:{...base.catalog.maps,'map:forest_ruins':{...base.catalog.maps['map:forest_ruins'],
      cells:base.catalog.maps['map:forest_ruins'].cells.map(c=>c.x===0&&c.y===1?{...c,terrainId:'forest' as const}:c)}}};
    const snapshot={...healthy,versions:{...healthy.versions,content:contentVersion(catalog)}};
    const blocked=ability===hex?ability:{...healGoblin,target:{unitId:5}};
    // Target archer is relocated behind the same blocking forest cell.
    const adjusted=ability===hex?snapshot:{...snapshot,units:snapshot.units.map(u=>u.id===5?{...u,cell:{x:0,y:0},hp:2}:u.id===1?{...u,cell:{x:7,y:0}}:u)};
    expect(dispatch(adjusted,blocked,catalog)).toEqual({ok:false,reason:'blockedLos'});
  }
  for(const id of ['weakened','debuff'] as const) {
    const {catalog:base,state:initial}=shamanSetup(),catalog={...base,heroes:{...base.heroes,fighter:{...base.heroes.fighter,immunities:[id]}}};
    assert(validateContent(catalog).ok);const state={...initial,versions:{...initial.versions,content:contentVersion(catalog)}};
    const before=structuredClone(state);expect(dispatch(freeze(state),hex,catalog)).toEqual({ok:false,reason:'immune'});expect(state).toEqual(before);
  }
  const {catalog,state}=shamanSetup();
  const cursor=RULE_BOUNDS.cursor.max,rng={...state.rng,cursor,words:[state.rng.words[0],state.rng.words[1],state.rng.words[2],(cursor%UINT32_RANGE+RNG_WARMUP_DRAWS+1)%UINT32_RANGE] as const};
  const exhausted={...state,rng};assert(readBattleState(exhausted,catalog).ok);
  expect(dispatch(exhausted,hex,catalog)).toEqual({ok:false,reason:'invalidState'});
});
it('Heal Goblin heals only injured living allies by four or missing HP, without rolls or use counters', () => {
  for(const second of [false,true]) for(const targetId of [4,5]) for(const missing of [1,4,7]) {
    const {catalog,state}=shamanSetup(second),target=state.units.find(u=>u.id===targetId)!;
    const maxHp=catalog.enemies[target.defId as 'goblin_grunt'|'goblin_archer'|'goblin_shaman'].stats.maxHp;
    const initial=freeze({...state,units:state.units.map(u=>u.id===targetId?{...u,hp:maxHp-missing}:u)});
    const command={...healGoblin,target:{unitId:targetId}},preview=previewAbility(initial,command,catalog);assert(preview.ok);
    expect(preview).toMatchObject({kind:'healGoblin',healing:Math.min(4,missing),hp:maxHp-missing+Math.min(4,missing)});
    expect(previewText(preview)).not.toContain('battle use');expect(previewText(preview)).toContain('no roll');
    const result=dispatch(initial,command,catalog);assert(result.ok);
    expect(result.state.rng).toEqual(initial.rng);expect(result.state.units.find(u=>u.id===targetId)?.hp).toBe(maxHp-Math.max(0,missing-4));
    expect(battleCues(result.events,catalog)).toEqual([]);
    expect(result.state.units.find(u=>u.id===6)).toMatchObject({hasActed:true,hasMoved:false});
    expect(result.state.units.find(u=>u.id===6)?.secondWindUsed).toBeUndefined();
    expect(result.events).toEqual([{type:'abilityUsed',unitId:6,abilityId:healGoblin.abilityId,target:command.target},
      {type:'healed',unitId:targetId,healing:Math.min(4,missing),hp:maxHp-Math.max(0,missing-4)}]);
    assert(readBattleState(result.state,catalog).ok);
  }
  const {catalog,state}=shamanSetup();
  expect(dispatch(state,healGoblin,catalog)).toEqual({ok:false,reason:'fullHealth'});
  expect(dispatch(state,{...healGoblin,target:{unitId:1}},catalog)).toEqual({ok:false,reason:'ineligibleAlly'});
  const injuredSelf={...state,units:state.units.map(u=>u.id===6?{...u,hp:2}:u)};
  expect(dispatch(injuredSelf,{...healGoblin,target:{unitId:6}},catalog)).toEqual({ok:false,reason:'outOfRange'});
  expect(dispatch(state,{...hex,target:{unitId:4}},catalog)).toEqual({ok:false,reason:'sameSide'});
});
it('accepted attack and missile damage clear Weakened on source or target defeat', () => {
  for(const defeat of ['source','target','missile'] as const) {
    const {catalog,state}=shamanSetup();
    const initial=naturalState(activate({...state,units:state.units.map(u=>u.id===1?{...u,weakenedBy:6,hp:defeat==='target'?1:u.hp}:
      u.id===6?{...u,cell:{x:0,y:1},hp:defeat==='target'?10:1}:u.id===3?{...u,cell:{x:1,y:0}}:u)},defeat==='target'?6:defeat==='missile'?3:1),20);
    const command=defeat==='target'?{...hex,abilityId:'ability:basic_attack' as const}:
      {type:'useAbility' as const,unitId:defeat==='missile'?3:1,abilityId:defeat==='missile'?'ability:magic_missile' as const:'ability:basic_attack' as const,target:{unitId:6}};
    const result=dispatch(initial,command,catalog);assert(result.ok,JSON.stringify(result));
    expect(result.events).toContainEqual({type:'weakenedExpired',unitId:1,sourceId:6});
    expect(result.state.units[0].weakenedBy).toBeUndefined();assert(readBattleState(result.state,catalog).ok);
  }
});
it('admits only a living opposing learned Shaman source and rejects forged or immune Weakened snapshots',()=>{
  const {catalog,state}=shamanSetup();
  const valid={...state,units:state.units.map(u=>u.id===1?{...u,weakenedBy:6}:u)};
  assert(readBattleState(valid,catalog).ok);
  for(const weakenedBy of [undefined,null,'6',0,65,1,2,4,5]) {
    const input={...state,units:state.units.map(u=>u.id===1?{...u,weakenedBy}:u)};
    expect(readBattleState(input,catalog)).toEqual({ok:false,reason:'invalidState'});
  }
  for(const defeatedId of [1,6]) expect(readBattleState({...valid,units:valid.units.map(u=>u.id===defeatedId?{...u,hp:0}:u)},catalog).ok).toBe(false);
  const enemyTarget={...state,units:state.units.map(u=>u.id===4?{...u,weakenedBy:6}:u)};
  expect(readBattleState(enemyTarget,catalog).ok).toBe(false);
  const immune={...catalog,heroes:{...catalog.heroes,fighter:{...catalog.heroes.fighter,immunities:['debuff'] as const}}};
  expect(readBattleState({...valid,versions:{...valid.versions,content:contentVersion(immune)}},immune).ok).toBe(false);
  const absent={...catalog,abilities:Object.fromEntries(Object.entries(catalog.abilities).filter(([,a])=>a.kind!=='weakeningHex'))};
  expect(readBattleState({...valid,versions:{...valid.versions,content:contentVersion(absent)}},absent).ok).toBe(false);
});
it('a Weakened Mage keeps identical automatic missiles and an injured last ally can heal at RNG exhaustion',()=>{
  const {catalog,state}=shamanSetup(),mage=activate({...state,units:state.units.map(u=>u.id===3?{...u,cell:{x:1,y:0}}:u)},3);
  const command={type:'useAbility' as const,unitId:3,abilityId:'ability:magic_missile' as const,target:{unitId:6}};
  const weak={...mage,units:mage.units.map(u=>u.id===3?{...u,weakenedBy:6}:u)};
  expect(previewMagicMissile(weak,command,catalog)).toEqual(previewMagicMissile(mage,command,catalog));
  const ordinary=dispatch(mage,command,catalog),weakened=dispatch(weak,command,catalog);assert(ordinary.ok&&weakened.ok);
  expect(ordinary.events).toEqual(weakened.events);expect(ordinary.state.rng).toEqual(weakened.state.rng);
  const cursor=RULE_BOUNDS.cursor.max,rng={...state.rng,cursor,words:[state.rng.words[0],state.rng.words[1],state.rng.words[2],(cursor%UINT32_RANGE+RNG_WARMUP_DRAWS+1)%UINT32_RANGE] as const};
  const exhausted={...state,rng,units:state.units.map(u=>u.id===4?{...u,hp:1}:u.id===5?{...u,hp:0}:u)};
  const healed=dispatch(exhausted,healGoblin,catalog);assert(healed.ok);expect(healed.state.rng).toEqual(rng);
  expect(healed.state.units.find(u=>u.id===4)?.hp).toBe(5);
});

it('Frost Snare uses one action and shared immobilization for both real goblins without rolls or Mark consumption',()=>{
  for(const targetId of [4,5]) {
    const {catalog,state}=rangerSetup(),snapshot=activate({...state,units:state.units.map(u=>u.id===targetId?{...u,markedBy:2}:u)},3);
    const input={...snare,target:{unitId:targetId}},before=structuredClone(snapshot),preview=previewAbility(freeze(snapshot),input,catalog);assert(preview.ok);
    expect(previewText(preview)).toContain('Snared by Mage #3');expect(previewText(preview)).toContain('no damage or roll');
    const result=dispatch(snapshot,input,catalog);assert(result.ok);
    expect(result.state.rng).toEqual(snapshot.rng);expect(result.state.activeIndex).toBe(snapshot.activeIndex);
    expect(result.state.units.map(u=>u.hp)).toEqual(snapshot.units.map(u=>u.hp));
    expect(result.state.units.find(u=>u.id===3)).toMatchObject({hasActed:true,hasMoved:false});
    expect(result.state.units.find(u=>u.id===targetId)).toMatchObject({markedBy:2,movementBlock:{sourceId:3,abilityId:snare.abilityId}});
    expect(result.events).toEqual([{type:'abilityUsed',unitId:3,abilityId:snare.abilityId,target:input.target},{type:'movementBlocked',unitId:targetId,sourceId:3,abilityId:snare.abilityId}]);
    expect(abilityPresentation(result.events)).toEqual({signature:null,feedback:[{unitId:targetId,kind:'guard',text:'Snared'}]});expect(battleCues(result.events,catalog)).toEqual([]);
    expect(unitFeedback(new BattleSession(catalog,result.state,result.state.seed),result.state.units.find(u=>u.id===targetId)!).status).toContain('Snared by Mage #3');
    const enemy=activate(result.state,targetId),cell=enemy.units.find(u=>u.id===targetId)!.cell;
    expect(previewMovement(enemy,targetId,catalog)).toEqual({ok:true,cells:[{cell,cost:0}]});
    expect(dispatch(enemy,{type:'move',unitId:targetId,to:{x:cell.x,y:1}},catalog)).toEqual({ok:false,reason:'immobilized'});
    const plan=planEnemyTurn(enemy,targetId,catalog);assert(plan.ok);expect(plan.commands.some(c=>c.type==='move')).toBe(false);
    const ai=runEnemyTurn(enemy,targetId,catalog);assert(ai.ok);expect(ai.state.units.find(u=>u.id===targetId)?.movementBlock).toBeUndefined();
    const isolated={...enemy,units:enemy.units.map(u=>u.side==='player'?{...u,cell:{x:u.id,y:8}}:u)};
    expect(planEnemyTurn(isolated,targetId,catalog)).toEqual({ok:true,commands:[{type:'endTurn',unitId:targetId}]});
    expect(snapshot).toEqual(before);expect(readBattleState(result.state,catalog).ok).toBe(true);
  }
});

it('Frost Snare rejects invalid targeting, ownership, budgets, LOS and every Pin/Snare duplicate atomically',()=>{
  const {catalog,state}=rangerSetup(),initial=activate(state,3);
  for(const [input,reason] of [[{...snare,target:{unitId:1}},'sameSide'],[{...snare,target:{unitId:64}},'missingTarget'],
    [{...snare,target:{cell:{x:3,y:0}}},'wrongTargetKind'],[{...snare,unitId:2},'abilityNotOwned']] as const){
    const snapshot=activate(initial,input.unitId),before=structuredClone(snapshot);expect(previewAbility(freeze(snapshot),input,catalog)).toEqual({ok:false,reason});expect(dispatch(snapshot,input,catalog)).toEqual({ok:false,reason});expect(snapshot).toEqual(before);
  }
  for(const [id,patch,reason] of [[3,{hasActed:true},'alreadyActed'],[4,{hp:0},'targetDefeated']] as const){
    const snapshot={...initial,units:initial.units.map(u=>u.id===id?{...u,...patch}:u)},before=structuredClone(snapshot);
    expect(dispatch(freeze(snapshot),snare,catalog)).toEqual({ok:false,reason});expect(snapshot).toEqual(before);
  }
  for(const distance of [1,2,4,5]){
    const snapshot={...initial,units:initial.units.map(u=>u.id===3?{...u,cell:{x:0,y:0}}:u.id===4?{...u,cell:{x:distance,y:0}}:{...u,cell:{x:u.id,y:2}})};
    const before=structuredClone(snapshot);expect(previewAbility(freeze(snapshot),snare,catalog).ok).toBe(distance>=2&&distance<=4);expect(snapshot).toEqual(before);
  }
  const blocked={...catalog,maps:{...catalog.maps,'map:forest_ruins':{...catalog.maps['map:forest_ruins'],cells:catalog.maps['map:forest_ruins'].cells.map(c=>c.x===2&&c.y===0?{...c,terrainId:'forest' as const}:c)}}};
  expect(dispatch({...initial,versions:{...initial.versions,content:contentVersion(blocked)},units:initial.units.map(u=>u.id===1?{...u,cell:{x:2,y:1}}:u)},snare,blocked)).toEqual({ok:false,reason:'blockedLos'});
  for(const first of [pin,snare])for(const second of [pin,snare]){
    const cast=dispatch(activate(state,first.unitId),first,catalog);assert(cast.ok);
    const snapshot=activate(cast.state,second.unitId),before=structuredClone(snapshot);
    expect(dispatch(freeze(snapshot),second,catalog)).toEqual({ok:false,reason:'alreadyImmobilized'});expect(snapshot).toEqual(before);
  }
});

it('Frost Snare survives unrelated turns, round wrap, range and LOS changes and expires only on accepted target endTurn',()=>{
  const {catalog,state}=rangerSetup(),cast=dispatch(activate(state,3),snare,catalog);assert(cast.ok);
  const snapshot={...cast.state,initiative:[4,1,2,5,6,3],activeIndex:5,round:9,units:cast.state.units.map(u=>u.id===3?{...u,cell:{x:8,y:8}}:u)};
  const unrelated=endTurn(snapshot,{type:'endTurn',unitId:3},catalog);assert(unrelated.ok);expect(unrelated.state.round).toBe(10);
  expect(unrelated.state.units.find(u=>u.id===4)?.movementBlock).toEqual({sourceId:3,abilityId:snare.abilityId});
  const blocked={...catalog,maps:{...catalog.maps,'map:forest_ruins':{...catalog.maps['map:forest_ruins'],cells:catalog.maps['map:forest_ruins'].cells.map(c=>c.x===7&&c.y===8?{...c,terrainId:'forest' as const}:c)}}};
  const current={...unrelated.state,versions:{...unrelated.state.versions,content:contentVersion(blocked)}};
  expect(dispatch(current,{type:'endTurn',unitId:3},blocked)).toEqual({ok:false,reason:'notActiveUnit'});
  const ended=endTurn(current,{type:'endTurn',unitId:4},blocked);assert(ended.ok);
  expect(ended.state.units.find(u=>u.id===4)?.movementBlock).toBeUndefined();expect(ended.events).toContainEqual({type:'movementBlockExpired',unitId:4,sourceId:3,abilityId:snare.abilityId});
});

it('Frost Snare cleans source and target defeat for ordinary attacks and missiles including friendly source damage',()=>{
  for(const sourceDeath of [false,true])for(const automatic of [false,true]){
    const {catalog,state}=rangerSetup();
    // A second real Mage is used only for the friendly-missile source-death case.
    const map=catalog.maps['map:forest_ruins'],copy=automatic&&sourceDeath?{...catalog,maps:{...catalog.maps,[map.id]:{...map,spawns:map.spawns.map(s=>s.id===2?{...s,unitId:'mage' as const,side:'heroes' as const}:s)}}}:catalog;
    const targetId=sourceDeath?3:4,actorId=automatic?sourceDeath?2:3:sourceDeath?6:1;
    const snapshot=naturalState(activate({...state,versions:{...state.versions,content:contentVersion(copy)},units:state.units.map(u=>u.id===4?{...u,movementBlock:{sourceId:3,abilityId:snare.abilityId},...(!sourceDeath?{hp:1}:{})}:u.id===3&&sourceDeath?{...u,hp:1}:u.id===6&&sourceDeath?{...u,cell:{x:1,y:1}}:automatic&&sourceDeath&&u.id===2?{...u,side:'player' as const,defId:'mage' as const,hp:10}:u)},actorId),20);
    const result=dispatch(freeze(snapshot),{type:'useAbility',unitId:actorId,abilityId:automatic?'ability:magic_missile':'ability:basic_attack',target:{unitId:targetId}},copy);assert(result.ok);
    expect(result.state.units.find(u=>u.id===targetId)?.hp).toBe(0);expect(result.state.units.find(u=>u.id===4)?.movementBlock).toBeUndefined();
    expect(result.events).toContainEqual({type:'movementBlockExpired',unitId:4,sourceId:3,abilityId:snare.abilityId});expect(readBattleState(result.state,copy).ok).toBe(true);
  }
});

it('admits only exact learned movement-block references and roundtrips active Snare without refresh',()=>{
  const {catalog,state}=rangerSetup(),snapshot={...state,units:state.units.map(u=>u.id===4?{...u,movementBlock:{sourceId:3,abilityId:snare.abilityId}}:u)};
  for(const movementBlock of [null,undefined,{},3,{sourceId:3},{sourceId:3,abilityId:'ability:taunt'},{sourceId:2,abilityId:snare.abilityId},{sourceId:64,abilityId:snare.abilityId},{sourceId:3,abilityId:snare.abilityId,extra:1}])expect(readBattleState({...snapshot,units:snapshot.units.map(u=>u.id===4?{...u,movementBlock}:u)},catalog).ok).toBe(false);
  for(const id of [3,4])expect(readBattleState({...snapshot,units:snapshot.units.map(u=>u.id===id?{...u,hp:0}:u)},catalog).ok).toBe(false);
  const {['ability:frost_snare']:_,...abilities}=catalog.abilities,locked={...catalog,abilities};
  expect(readBattleState({...snapshot,versions:{...snapshot.versions,content:contentVersion(locked)}},locked).ok).toBe(false);
  const encoded=encodeBattleSave(snapshot,catalog);assert(encoded.ok);const decoded=decodeBattleSave(encoded.text,catalog);assert(decoded.ok);expect(decoded.state).toEqual(snapshot);
  const active=activate(snapshot,4),restored=activate(decoded.state,4);expect(dispatch(restored,{type:'endTurn',unitId:4},catalog)).toEqual(dispatch(active,{type:'endTurn',unitId:4},catalog));
  const fresh=createBattle('map:forest_ruins',17,catalog);assert(fresh.ok);expect(fresh.state.units.every(u=>u.movementBlock===undefined)).toBe(true);
});

it('applies Mark and Pin through pure previews and dispatch without HP, movement or RNG changes', () => {
  for (const command of [mark,pin]) for (const targetId of [4,5]) {
    const {catalog,state}=rangerSetup(),before=structuredClone(state),input={...command,target:{unitId:targetId}};
    const preview=previewControlAbility(freeze(state),input,catalog);assert(preview.ok);
    expect(previewText(preview)).toContain('no damage or roll');
    expect(previewText(preview)).not.toContain('Taunt');
    const result=dispatch(state,input,catalog);assert(result.ok);
    expect(result.state.rng).toEqual(state.rng);expect(result.state.activeIndex).toBe(state.activeIndex);
    expect(result.state.units.map(u=>u.hp)).toEqual(state.units.map(u=>u.hp));
    expect(result.state.units.find(u=>u.id===2)).toMatchObject({hasActed:true,hasMoved:false});
    const event=command===mark?{type:'marked',unitId:targetId,sourceId:2}:{type:'movementBlocked',unitId:targetId,sourceId:2,abilityId:'ability:pinning_shot'};
    expect(result.events).toEqual([{type:'abilityUsed',unitId:2,abilityId:command.abilityId,target:{unitId:targetId}},event]);
    expect(abilityPresentation(result.events)).toEqual({signature:null,feedback:[{unitId:targetId,kind:'guard',text:command===mark?'Marked':'Pinned'}]});
    expect(battleCues(result.events,catalog)).toEqual([]);
    expect(readBattleState(result.state,catalog).ok).toBe(true);expect(state).toEqual(before);
  }
});

it('rejects Ranger target, ownership, action, range and LOS failures atomically', () => {
  const {catalog,state}=rangerSetup();
  for (const command of [mark,pin]) {
    for (const [input,reason] of [[{...command,target:{unitId:2}},'sameSide'],[{...command,target:{unitId:1}},'sameSide'],
      [{...command,target:{unitId:64}},'missingTarget'],[{...command,target:{cell:{x:3,y:0}}},'wrongTargetKind'],
      [{...command,unitId:1},'abilityNotOwned']] as const) {
      const snapshot=activate(state,input.unitId),before=structuredClone(snapshot);
      expect(dispatch(freeze(snapshot),input,catalog)).toEqual({ok:false,reason});expect(snapshot).toEqual(before);
    }
    expect(dispatch({...state,units:state.units.map(u=>u.id===2?{...u,hasActed:true}:u)},command,catalog)).toEqual({ok:false,reason:'alreadyActed'});
    expect(dispatch({...state,units:state.units.map(u=>u.id===4?{...u,hp:0}:u)},command,catalog)).toEqual({ok:false,reason:'targetDefeated'});
    for(const distance of [1,2,5,6]) {
      // Keep other living units away from the tested ray and target.
      const snapshot={...state,units:state.units.map(u=>u.id===4?{...u,cell:{x:distance,y:0}}:u.id===2?u:{...u,cell:{x:u.id,y:2}})};
      expect(previewControlAbility(snapshot,command,catalog).ok).toBe(distance>=2&&distance<=5);
    }
    const blocked={...catalog,maps:{...catalog.maps,'map:forest_ruins':{...catalog.maps['map:forest_ruins'],
      cells:catalog.maps['map:forest_ruins'].cells.map(c=>c.x===1&&c.y===0?{...c,terrainId:'forest' as const}:c)}}};
    expect(dispatch({...state,versions:{...state.versions,content:contentVersion(blocked)},units:state.units.map(u=>u.id===3?{...u,cell:{x:1,y:1}}:u)},command,blocked)).toEqual({ok:false,reason:'blockedLos'});
  }
});

it('grants and consumes Mark exactly once on each supported player attack roll, including natural misses', () => {
  for (const [unitId,abilityId] of [[1,'ability:basic_attack'],[1,'ability:guarded_strike'],[2,'ability:high_shot']] as const)
    for (const natural of [1,7,9,20]) {
      const {catalog,state}=rangerSetup();
      const command={type:'useAbility',unitId,abilityId,target:{unitId:4}} as const;
      const snapshot=naturalState(activate({...state,units:state.units.map(u=>u.id===4?{...u,markedBy:2}:u)},unitId),natural);
      const before=structuredClone(snapshot),plain={...snapshot,units:snapshot.units.map(u=>{const {markedBy,...rest}=u;return rest;})};
      const preview=previewAttack(freeze(snapshot),command,catalog),without=previewAttack(plain,command,catalog);assert(preview.ok&&without.ok);
      expect(preview.bonus).toBe(without.bonus+2);expect(preview.markBonus).toBe(2);
      expect(preview.damage).toBe(without.damage);expect(previewText(preview)).toContain('Mark +2');
      expect(previewAttack(snapshot,command,catalog)).toEqual(preview);
      const result=dispatch(snapshot,command,catalog);assert(result.ok);
      expect(result.events.filter(e=>e.type==='markConsumed')).toEqual([{type:'markConsumed',unitId:4,sourceId:2}]);
      expect(result.state.units.find(u=>u.id===4)?.markedBy).toBeUndefined();
      expect(result.events.find(e=>e.type==='attackRolled')).toMatchObject({natural,bonus:preview.bonus,...(natural===1?{result:'miss'}:natural===20?{result:'critical'}:{})});
      expect(readBattleState(result.state,catalog).ok).toBe(true);expect(snapshot).toEqual(before);
    }
});

it('keeps simultaneous marks independent, replaces without stacking, and does not consume on cancel or rejected attacks', () => {
  const {catalog,state}=rangerSetup();
  const first=dispatch(state,mark,catalog);assert(first.ok);
  const second=dispatch(activate(first.state,2),{...mark,target:{unitId:5}},catalog);assert(second.ok);
  const replaced=dispatch(activate(second.state,2),mark,catalog);assert(replaced.ok);
  expect(replaced.state.units.filter(u=>u.markedBy===2).map(u=>u.id)).toEqual([4,5]);
  const snapshot=activate(replaced.state,1),session=new BattleSession(catalog,snapshot,snapshot.seed),before=structuredClone(session.state);
  for(let i=0;i<3;i++){expect(session.prepare({...guardedStrike,abilityId:'ability:basic_attack'}).ok).toBe(true);session.cancel();}
  expect(session.state).toEqual(before);expect(session.events).toEqual([]);
  const invalid={...guardedStrike,target:{unitId:5}};
  expect(dispatch(freeze(snapshot),invalid,catalog)).toEqual({ok:false,reason:'outOfRange'});
  const consumed=dispatch(snapshot,guardedStrike,catalog);assert(consumed.ok);
  expect(consumed.state.units.find(u=>u.id===4)?.markedBy).toBeUndefined();
  expect(consumed.state.units.find(u=>u.id===5)?.markedBy).toBe(2);
  const exhausted={...snapshot,rng:{...snapshot.rng,cursor:RULE_BOUNDS.cursor.max,words:[...snapshot.rng.words] as [number,number,number,number]}};
  // Use the same valid terminal RNG word/cursor relation as the existing cursor-boundary tests.
  exhausted.rng.words[3]=(exhausted.rng.cursor%UINT32_RANGE+RNG_WARMUP_DRAWS+1)%UINT32_RANGE;
  expect(readBattleState(exhausted,catalog).ok).toBe(true);
  const saved=structuredClone(exhausted);expect(dispatch(exhausted,guardedStrike,catalog)).toEqual({ok:false,reason:'invalidState'});expect(exhausted).toEqual(saved);
});

it('does not consume Mark on automatic multi-missiles, enemy rolls or turn transitions', () => {
  const {catalog:base,state}=rangerSetup();
  const catalog={...base,abilities:{...base.abilities,'ability:magic_missile':{...base.abilities['ability:magic_missile'],casterLevel:3}}};
  const snapshot={...state,versions:{...state.versions,content:contentVersion(catalog)},units:state.units.map(u=>u.id===4?{...u,markedBy:2}:u)};
  const cast=dispatch(activate(snapshot,3),{...missile,target:{missileTargets:[4,5]}},catalog);assert(cast.ok);
  expect(cast.events.filter(e=>e.type==='missileRolled')).toHaveLength(2);expect(cast.events.some(e=>e.type==='markConsumed')).toBe(false);
  expect(cast.state.units.find(u=>u.id===4)?.markedBy).toBe(2);
  const enemy=dispatch(naturalState(activate(snapshot,4),1),{type:'useAbility',unitId:4,abilityId:'ability:basic_attack',target:{unitId:1}},catalog);assert(enemy.ok);
  expect(enemy.state.units.find(u=>u.id===4)?.markedBy).toBe(2);
  const wait=endTurn(activate(snapshot,4),{type:'endTurn',unitId:4},catalog);assert(wait.ok);expect(wait.state.units.find(u=>u.id===4)?.markedBy).toBe(2);
});

it('pins movement while preserving legal enemy attacks or Wait, and expires at target endTurn across round wrap', () => {
  const {catalog,state}=rangerSetup(),cast=dispatch(state,pin,catalog);assert(cast.ok);
  const snapshot=activate(cast.state,4),before=structuredClone(snapshot),cell=snapshot.units.find(u=>u.id===4)!.cell;
  expect(previewMovement(freeze(snapshot),4,catalog)).toEqual({ok:true,cells:[{cell,cost:0}]});
  const move={type:'move',unitId:4,to:{x:3,y:1}} as const;
  expect(previewMove(snapshot,move,catalog)).toEqual({ok:false,reason:'immobilized'});
  expect(dispatch(snapshot,move,catalog)).toEqual({ok:false,reason:'immobilized'});expect(snapshot).toEqual(before);
  const plan=planEnemyTurn(snapshot,4,catalog);assert(plan.ok);expect(plan.commands.some(c=>c.type==='move')).toBe(false);expect(plan.commands.some(c=>c.type==='useAbility')).toBe(true);
  const run=runEnemyTurn(snapshot,4,catalog);assert(run.ok);expect(run.state.units.find(u=>u.id===4)?.movementBlock).toBeUndefined();
  const isolated={...snapshot,units:snapshot.units.map(u=>u.side==='player'?{...u,cell:{x:u.id,y:8}}:u)};
  expect(planEnemyTurn(isolated,4,catalog)).toEqual({ok:true,commands:[{type:'endTurn',unitId:4}]});
  const wrapped={...snapshot,initiative:[1,2,3,5,6,4],activeIndex:5,round:9,units:snapshot.units.map(u=>u.id===4?{...u,markedBy:2}:u)};
  const ended=endTurn(wrapped,{type:'endTurn',unitId:4},catalog);assert(ended.ok);expect(ended.state.round).toBe(10);
  expect(ended.state.units.find(u=>u.id===4)).toMatchObject({markedBy:2});expect(ended.state.units.find(u=>u.id===4)?.movementBlock).toBeUndefined();
  expect(ended.events).toContainEqual({type:'movementBlockExpired',abilityId:'ability:pinning_shot',unitId:4,sourceId:2});
  expect(dispatch(activate(cast.state,2),pin,catalog)).toEqual({ok:false,reason:'alreadyImmobilized'});
  expect(dispatch(activate(ended.state,2),pin,catalog).ok).toBe(true);
});

it('cleans both Ranger effects when source or target is defeated through ordinary or automatic damage', () => {
  for(const sourceDeath of [false,true])for(const automatic of [false,true]) {
    const {catalog,state}=rangerSetup();
    const targetId=sourceDeath?2:4,actorId=automatic?3:sourceDeath?6:1;
    const snapshot=naturalState(activate({...state,units:state.units.map(u=>u.id===4?{...u,markedBy:2,movementBlock:{sourceId:2,abilityId:'ability:pinning_shot' as const},...(!sourceDeath?{hp:1}:{})}:
      u.id===2&&sourceDeath?{...u,hp:1}:u.id===6&&sourceDeath?{...u,cell:{x:0,y:1}}:u)},actorId),20);
    const result=dispatch(snapshot,{type:'useAbility',unitId:actorId,abilityId:automatic?'ability:magic_missile':'ability:basic_attack',target:{unitId:targetId}},catalog);assert(result.ok);
    expect(result.state.units.find(u=>u.id===targetId)?.hp).toBe(0);
    expect(result.state.units.find(u=>u.id===4)?.markedBy).toBeUndefined();expect(result.state.units.find(u=>u.id===4)?.movementBlock).toBeUndefined();
    expect(result.events).toContainEqual({type:'movementBlockExpired',abilityId:'ability:pinning_shot',unitId:4,sourceId:2});
    expect(result.events).toContainEqual({type:!sourceDeath&&!automatic?'markConsumed':'markExpired',unitId:4,sourceId:2});
    expect(readBattleState(result.state,catalog).ok).toBe(true);
  }
});

it('validates bounded living Ranger references and the current susceptible-enemy content policy', () => {
  const {catalog,state}=rangerSetup();
  for(const field of ['markedBy','movementBlock']) {
    for(const source of [undefined,0,1,3,4,64,1.5,'2',null]) {
      const invalid={...state,units:state.units.map(u=>u.id===4?{...u,[field]:source}:u)};
      expect(readBattleState(invalid,catalog).ok).toBe(false);
    }
    for(const id of [1,2,3])expect(readBattleState({...state,units:state.units.map(u=>u.id===id?{...u,[field]:field==='markedBy'?2:{sourceId:2,abilityId:'ability:pinning_shot'}}:u)},catalog).ok).toBe(false);
    for(const deadId of [2,4])expect(readBattleState({...state,units:state.units.map(u=>({...u,...(u.id===4?{[field]:field==='markedBy'?2:{sourceId:2,abilityId:'ability:pinning_shot'}}:{}),...(u.id===deadId?{hp:0}:{})}))},catalog).ok).toBe(false);
  }
  for(const [id,patch] of [['ability:mark_target',{accuracyBonus:3}],['ability:mark_target',{requiredLevel:1}],['ability:pinning_shot',{duration:'sourceTurnStart'}],['ability:pinning_shot',{owners:['fighter']}]] as const)
    expect(validateContent({...catalog,abilities:{...catalog.abilities,[id]:{...catalog.abilities[id],...patch}}}).ok).toBe(false);
  for(const id of ['goblin_grunt','goblin_archer'] as const) {
    expect(catalog.enemies[id]).not.toHaveProperty('immunities');
    expect(validateContent({...catalog,enemies:{...catalog.enemies,[id]:{...catalog.enemies[id],immunities:['marked','pinned']}}}).ok).toBe(false);
  }
});

it('round-trips live Mark/Pin and rejects the previous battle format without rewriting input', () => {
  const {catalog,state}=rangerSetup(),snapshot={...state,units:state.units.map(u=>u.id===4?{...u,markedBy:2,movementBlock:{sourceId:2,abilityId:'ability:pinning_shot' as const}}:u)};
  const encoded=encodeBattleSave(snapshot,catalog);assert(encoded.ok);const restored=decodeBattleSave(encoded.text,catalog);assert(restored.ok);
  expect(restored.state).toEqual(snapshot);expect(encodeBattleSave(restored.state,catalog)).toEqual(encoded);
  expect(dispatch(restored.state,mark,catalog)).toEqual(dispatch(snapshot,mark,catalog));
  const old=JSON.stringify({...JSON.parse(encoded.text),payload:{...snapshot,format:2,versions:{...snapshot.versions,rules:3}}});
  expect(decodeBattleSave(old,catalog)).toEqual({ok:false,reason:'incompatible'});
  const made=createBattle('map:forest_ruins',17,catalog);assert(made.ok);expect(made.state.units.every(u=>u.markedBy===undefined&&u.movementBlock===undefined)).toBe(true);
  const feedback=unitFeedback(new BattleSession(catalog,snapshot,snapshot.seed),snapshot.units.find(u=>u.id===4)!);
  expect(feedback.status).toContain('Marked by Ranger #2');expect(feedback.status).toContain('Pinned by Ranger #2');
});

it('replaces a Mark source with the newest Ranger without stacking', () => {
  const base=rangerSetup(),map=base.catalog.maps['map:forest_ruins'];
  const catalog={...base.catalog,maps:{...base.catalog.maps,[map.id]:{...map,spawns:map.spawns.map(s=>s.id===3?{...s,side:'heroes' as const,unitId:'ranger' as const}:s)}}};
  const state={...base.state,versions:{...base.state.versions,content:contentVersion(catalog)},units:base.state.units.map(u=>u.id===3?{...u,side:'player' as const,defId:'ranger' as const,hp:12}:u)};
  const first=dispatch(state,mark,catalog);assert(first.ok);
  const second=dispatch(activate(first.state,3),{...mark,unitId:3},catalog);assert(second.ok);
  expect(second.state.units.find(u=>u.id===4)?.markedBy).toBe(3);
  const preview=previewAttack(activate(second.state,1),guardedStrike,catalog);assert(preview.ok);expect(preview.markBonus).toBe(2);
  const oldSourceDeath=naturalState(activate({...second.state,units:second.state.units.map(u=>u.id===2?{...u,hp:1}:u.id===6?{...u,cell:{x:0,y:1}}:u)},6),20);
  const killed=dispatch(oldSourceDeath,{type:'useAbility',unitId:6,abilityId:'ability:basic_attack',target:{unitId:2}},catalog);assert(killed.ok);
  expect(killed.state.units.find(u=>u.id===2)?.hp).toBe(0);expect(killed.state.units.find(u=>u.id===4)?.markedBy).toBe(3);
});

it('replays Ranger actions and Frost Snare from canonical creation with identical state, events and RNG', () => {
  const base=rangerSetup(),map=base.catalog.maps['map:forest_ruins'];
  const catalog={...base.catalog,maps:{...base.catalog.maps,[map.id]:{...map,spawns:map.spawns.map(s=>({...s,...base.state.units.find(u=>u.id===s.id)!.cell}))}}};
  const created=createBattle(map.id,17,catalog);assert(created.ok);let state=created.state;
  const commands:import('../../src/domain/types').Command[]=[],events:import('../../src/domain/types').BattleEvent[]=[];
  const apply=(command:import('../../src/domain/types').Command)=>{const result=dispatch(state,command,catalog);assert(result.ok);commands.push(command);events.push(...result.events);state=result.state;};
  for(const command of [mark,pin,snare]) {
    while(state.initiative[state.activeIndex]!==command.unitId)apply({type:'endTurn',unitId:state.initiative[state.activeIndex]});
    apply(command);
    if(command===pin)expect(state.units.find(u=>u.id===4)).toMatchObject({markedBy:2,movementBlock:{sourceId:2,abilityId:'ability:pinning_shot' as const}});
    apply({type:'endTurn',unitId:command.unitId});
  }
  const replay=replayBattle({format:state.format,versions:state.versions,initial:created.state,commands},catalog);assert(replay.ok);
  expect(replay).toEqual({ok:true,state,events});
});

it('heals projected missing HP atomically once with no RNG and resets only in a fresh battle',()=>{
  for(const missing of [1,7,12]) {
    const base=guardSetup(1),catalog={...base.catalog,heroes:{...base.catalog.heroes,fighter:{...base.catalog.heroes.fighter,stats:{...base.catalog.heroes.fighter.stats,maxHp:30,power:5}}}};
    const state=freeze({...base.state,versions:{...base.state.versions,content:contentVersion(catalog)},units:base.state.units.map(u=>u.id===1?{...u,hp:30-missing}:u)});
    const before=structuredClone(state),preview=previewAbility(state,secondWind,catalog);assert(preview.ok && 'healing' in preview);
    expect(preview.healing).toBe(Math.min(missing,9));expect(state).toEqual(before);
    const session=new BattleSession(catalog,state,state.seed);
    for(let i=0;i<3;i++){expect(session.prepare(secondWind)).toEqual(preview);session.cancel();expect(session.state).toEqual(state);}
    session.prepare(secondWind);const used=session.confirm();assert(used);expect(session.confirm()).toBeNull();
    expect(used.after.units.find(u=>u.id===1)).toMatchObject({hp:30-missing+Math.min(missing,9),hasActed:true,secondWindUsed:true});
    expect(used.after.rng).toEqual(state.rng);expect(used.events).toContainEqual({type:'healed',unitId:1,healing:Math.min(missing,9),hp:preview.hp});
    expect(abilityPresentation(used.events).feedback).toContainEqual({unitId:1,kind:'result',text:`+${preview.healing} HP`});
    const resumed=BattleSession.fromSnapshot(catalog,used.after);assert(resumed.ok);expect(resumed.session.state).toEqual(used.after);
    let next=used.after;
    do {const ended=endTurn(next,{type:'endTurn',unitId:next.initiative[next.activeIndex]},catalog);assert(ended.ok);next=ended.state;}while(next.initiative[next.activeIndex]!==1);
    expect(next.units.find(u=>u.id===1)?.secondWindUsed).toBe(true);
    expect(dispatch(next,secondWind,catalog)).toEqual({ok:false,reason:'useExhausted'});
    const fresh=createBattle(state.mapId,2,catalog);assert(fresh.ok);expect(fresh.state.units.find(u=>u.id===1)?.secondWindUsed).toBeUndefined();
    expect(state).toEqual(before);
  }
});

it('rejects invalid healing without partial mutation, including defeated, foreign and spent targets',()=>{
  const {catalog,state}=guardSetup(1);
  const hurt={...state,units:state.units.map(u=>u.id===1?{...u,hp:2}:u)};
  for(const [snapshot,command,reason] of [
    [state,secondWind,'fullHealth'],[hurt,{...secondWind,target:{unitId:2}},'selfTargetRequired'],
    [hurt,{...secondWind,target:{unitId:64}},'missingTarget'],[hurt,{...secondWind,target:{cell:{x:2,y:0}}},'wrongTargetKind'],
    [{...hurt,units:hurt.units.map(u=>u.id===1?{...u,hasActed:true}:u)},secondWind,'alreadyActed'],
    [{...hurt,units:hurt.units.map(u=>u.id===2?{...u,hp:0}:u)},{...secondWind,target:{unitId:2}},'targetDefeated'],
    [{...hurt,activeIndex:hurt.initiative.indexOf(2)},{...secondWind,unitId:2,target:{unitId:2}},'abilityNotOwned'],
  ] as const) {
    const before=structuredClone(snapshot);expect(dispatch(freeze(snapshot),command,catalog)).toEqual({ok:false,reason});expect(snapshot).toEqual(before);
  }
});

it('applies no-roll Taunt irrespective of accuracy and expires only after the target turn ends',()=>{
  for(const natural of [1,20]) {
    const {catalog,state}=guardSetup(natural),before=structuredClone(state);
    const preview=previewFighterAbility(freeze(state),taunt,catalog);assert(preview.ok);
    const used=dispatch(state,taunt,catalog);assert(used.ok);
    expect(used.state.rng).toEqual(state.rng);expect(used.events).toEqual([
      {type:'abilityUsed',unitId:1,abilityId:'ability:taunt',target:{unitId:4}},{type:'taunted',unitId:4,sourceId:1}]);
    expect(used.state.units.find(u=>u.id===4)).toMatchObject({tauntedBy:1,hp:9});
    let next=used.state;
    while(next.initiative[next.activeIndex]!==4) {
      const ended=endTurn(next,{type:'endTurn',unitId:next.initiative[next.activeIndex]},catalog);assert(ended.ok);next=ended.state;
      expect(next.units.find(u=>u.id===4)?.tauntedBy).toBe(1);
    }
    const bad={type:'useAbility',unitId:4,abilityId:'ability:basic_attack',target:{unitId:2}} as const;
    expect(previewAttack(next,bad,catalog)).toEqual({ok:false,reason:'tauntedTargetRequired'});
    expect(dispatch(next,bad,catalog)).toEqual({ok:false,reason:'tauntedTargetRequired'});
    const ended=endTurn(next,{type:'endTurn',unitId:4},catalog);assert(ended.ok);
    expect(ended.state.units.find(u=>u.id===4)?.tauntedBy).toBeUndefined();expect(ended.events).toContainEqual({type:'tauntExpired',unitId:4,sourceId:1});
    expect(state).toEqual(before);
  }
});

it('rejects invalid Taunt targets and malformed saved resources/source references',()=>{
  const {catalog,state}=guardSetup(1);
  for(const [command,reason] of [[{...taunt,target:{unitId:1}},'sameSide'],[{...taunt,target:{unitId:2}},'sameSide'],
    [{...taunt,target:{unitId:5}},'outOfRange'],[{...taunt,target:{unitId:64}},'missingTarget']] as const)
    expect(dispatch(freeze(state),command,catalog)).toEqual({ok:false,reason});
  for(const patch of [{secondWindUsed:0},{secondWindUsed:2},{secondWindUsed:false},{tauntedBy:4}])
    expect(readBattleState({...state,units:state.units.map(u=>u.id===1?{...u,...patch}:u)},catalog).ok).toBe(false);
  for(const source of [0,2,4,64,1.5])expect(readBattleState({...state,units:state.units.map(u=>u.id===4?{...u,tauntedBy:source}:u)},catalog).ok).toBe(false);
  const applied=dispatch(state,taunt,catalog);assert(applied.ok);
  const deadSource={...applied.state,activeIndex:applied.state.initiative.indexOf(4),units:applied.state.units.map(u=>u.id===1?{...u,hp:0}:u)};
  expect(readBattleState(deadSource,catalog).ok).toBe(false);
});

it('replaces a Taunt source without stacking and clears it when a friendly missile defeats that source',()=>{
  const base=guardSetup(1),map=base.catalog.maps['map:forest_ruins'];
  const catalog={...base.catalog,maps:{[map.id]:{...map,spawns:map.spawns.map(s=>s.id===2?{...s,side:'heroes' as const,unitId:'fighter' as const}:s)}}};
  const state={...base.state,versions:{...base.state.versions,content:contentVersion(catalog)},units:base.state.units.map(u=>u.id===2?{...u,side:'player' as const,defId:'fighter' as const,cell:{x:4,y:0}}:u)};
  const first=dispatch(state,taunt,catalog);assert(first.ok);
  const second=dispatch({...first.state,activeIndex:first.state.initiative.indexOf(2)},{...taunt,unitId:2},catalog);assert(second.ok);
  expect(second.state.units.find(u=>u.id===4)?.tauntedBy).toBe(2);
  expect(readBattleState(second.state,catalog).ok).toBe(true);
  const mage={...second.state,activeIndex:second.state.initiative.indexOf(3),units:second.state.units.map(u=>u.id===2?{...u,hp:1}:u.id===3?{...u,cell:{x:1,y:0}}:u)};
  const killed=dispatch(mage,{type:'useAbility',unitId:3,abilityId:'ability:magic_missile',target:{unitId:2}},catalog);assert(killed.ok);
  expect(killed.state.units.find(u=>u.id===4)?.tauntedBy).toBeUndefined();expect(readBattleState(killed.state,catalog).ok).toBe(true);
});
function guardSetup(natural: number) {
  const { catalog, state } = setup();
  let seed = 0; while (rollDie(seedRng(seed), 20).value !== natural) seed++;
  return { catalog, state: { ...state, rng: seedRng(seed), activeIndex: state.initiative.indexOf(1),
    units: state.units.map(u => u.id === 1 ? { ...u, cell: { x: 2, y: 0 } } : u) } };
}
it('Guarded Strike trades two accuracy for defense on a miss, hit or critical without changing damage', () => {
  for (const natural of [1, 9, 10, 11, 12, 20]) {
    const { catalog, state } = guardSetup(natural); const before = structuredClone(state);
    const preview = previewAttack(state, guardedStrike, catalog); assert(preview.ok);
    expect(preview).toMatchObject({ bonus: 2, damage: 5, criticalDamage: 10 });
    const result = dispatch(state, guardedStrike, catalog); assert(result.ok);
    expect(result.events.find(e => e.type === 'attackRolled')).toMatchObject({ bonus: 2,
      result: natural === 20 ? 'critical' : natural >= 10 ? 'hit' : 'miss' });
    expect(result.state.units.find(u => u.id === 1)).toMatchObject({ guarded: true, hasActed: true });
    expect(result.events).toContainEqual({ type: 'guarded', unitId: 1 });
    expect(result.state.rng).toEqual(rollDie(state.rng, 20).rng);
    expect(readBattleState(result.state, catalog).ok).toBe(true);
    expect(state).toEqual(before);
  }
});
it('Guarded raises the same AC used by preview and resolution, lasts across a round wrap, and expires at the Fighter turn', () => {
  const { catalog, state } = guardSetup(1);
  const guard = dispatch(state, guardedStrike, catalog); assert(guard.ok);
  let current = guard.state;
  do {
    const active = current.initiative[current.activeIndex];
    const next = endTurn(current, { type: 'endTurn', unitId: active }, catalog); assert(next.ok); current = next.state;
    if (current.initiative[current.activeIndex] !== 1) expect(current.units.find(u => u.id === 1)?.guarded).toBe(true);
    if (current.initiative[current.activeIndex] === 4) {
      const command = { type: 'useAbility', unitId: 4, abilityId: 'ability:basic_attack', target: { unitId: 1 } } as const;
      const preview = previewAttack(current, command, catalog); assert(preview.ok);
      expect(preview.armorClass).toBe(16);
      const hit = dispatch(current, command, catalog); assert(hit.ok);
      expect(hit.events.find(e => e.type === 'attackRolled')).toMatchObject({ armorClass: 16 });
    }
    if (current.initiative[current.activeIndex] === 1) expect(next.events).toContainEqual({ type: 'guardExpired', unitId: 1 });
  } while (current.initiative[current.activeIndex] !== 1);
  expect(current.units.find(u => u.id === 1)?.guarded).toBeUndefined();
  expect(previewAttack(current, { ...guardedStrike, abilityId: 'ability:basic_attack' }, catalog)).toMatchObject({ bonus: 4 });
});
it('rejected Guarded Strike never grants defense or consumes action/RNG; snapshots reject malformed guards', () => {
  const { catalog, state } = guardSetup(1);
  for (const [command, reason] of [
    [{ ...guardedStrike, target: { unitId: 2 } }, 'sameSide'],
    [{ ...guardedStrike, target: { unitId: 5 } }, 'outOfRange'],
    [{ ...guardedStrike, target: { cell: { x: 3, y: 0 } } }, 'wrongTargetKind'],
  ] as const) {
    const before = structuredClone(state);
    expect(dispatch(state, command, catalog)).toEqual({ ok: false, reason }); expect(state).toEqual(before);
  }
  expect(dispatch({ ...state, activeIndex: state.initiative.indexOf(2) }, { ...guardedStrike, unitId: 2 }, catalog))
    .toEqual({ ok: false, reason: 'abilityNotOwned' });
  for (const [id, guarded] of [[1, false], [1, 2], [2, true]]) {
    expect(readBattleState({ ...state, units: state.units.map(u => u.id === id ? { ...u, guarded } : u) }, catalog).ok).toBe(false);
  }
});
it('validates the exact defensive tradeoff and applies its penalty only once to an already Guarded attacker', () => {
  const { catalog, state } = guardSetup(12);
  for (const patch of [{ attackPenalty: 0 }, { attackPenalty: 4 }, { attackPenalty: -2 }, { armorClassBonus: 3 }, { kind: 'attack' }]) {
    expect(validateContent({ ...catalog, abilities: { ...catalog.abilities,
      'ability:guarded_strike': { ...catalog.abilities['ability:guarded_strike'], ...patch } } }).ok).toBe(false);
  }
  const guarded = { ...state, units: state.units.map(u => u.id === 1 ? { ...u, guarded: true as const } : u) };
  const before = structuredClone(guarded); const contentBefore = structuredClone(catalog);
  for (const abilityId of ['ability:basic_attack', 'ability:guarded_strike'] as const) {
    expect(previewAttack(guarded, { ...guardedStrike, abilityId }, catalog)).toMatchObject({ ok: true, bonus: 2 });
  }
  const attacked = dispatch(guarded, guardedStrike, catalog); assert(attacked.ok);
  expect(dispatch(attacked.state, guardedStrike, catalog)).toEqual({ ok: false, reason: 'alreadyActed' });
  expect(guarded).toEqual(before); expect(catalog).toEqual(contentBefore);
});
it('replays Guarded Strike and expiry deterministically through actual commands', () => {
  const base = guardSetup(1).catalog;
  const catalog = { ...base, maps: { 'map:forest_ruins': { ...base.maps['map:forest_ruins'],
    spawns: base.maps['map:forest_ruins'].spawns.map(s => s.id === 1 ? { ...s, x: 2, y: 0 } :
      s.id === 4 ? { ...s, x: 3, y: 0 } : s) } } };
  const created = createBattle('map:forest_ruins', 31, catalog); assert(created.ok);
  const initial = created.state; let state = initial;
  const commands = [];
  while (state.initiative[state.activeIndex] !== 1) {
    const command = { type: 'endTurn', unitId: state.initiative[state.activeIndex] } as const;
    commands.push(command); const result = dispatch(state, command, catalog); assert(result.ok); state = result.state;
  }
  commands.push(guardedStrike);
  const attack = guardedStrike;
  const guarded = dispatch(state, attack, catalog); assert(guarded.ok); state = guarded.state;
  do {
    const command = { type: 'endTurn', unitId: state.initiative[state.activeIndex] } as const; commands.push(command);
    const next = dispatch(state, command, catalog); assert(next.ok); state = next.state;
  } while (state.initiative[state.activeIndex] !== 1);
  const replay = { format: STATE_FORMAT_VERSION, versions: initial.versions, initial, commands };
  const replayed = replayBattle(replay, catalog); assert(replayed.ok);
  expect(replayed.state).toEqual(state);
  expect(replayBattle(replay, catalog)).toEqual(replayed);
});
it('High Shot resolves uphill bonus on a natural critical and rejects illegal intents without RNG or action cost', () => {
  const { catalog, state } = setup(3, 2);
  let seed = 0;
  while (rollDie(seedRng(seed), 20).value !== 20) seed++;
  const criticalState = { ...state, rng: seedRng(seed) };
  const critical = dispatch(criticalState, shot, catalog); assert(critical.ok);
  expect(critical.events.find(e => e.type === 'damaged')).toMatchObject({ unitId: 4, damage: 12, hp: 0 });
  const blockedCatalog = { ...catalog, maps: { 'map:forest_ruins': { ...catalog.maps['map:forest_ruins'],
    cells: catalog.maps['map:forest_ruins'].cells.map(c => c.x === 1 && c.y === 0 ? { ...c, terrainId: 'forest' as const } : c) } } };
  const blockedState = { ...state, versions: { ...state.versions, content: contentVersion(blockedCatalog) } };
  const cases = [
    { catalog, state: { ...state, units: state.units.map(u => u.id === 2 ? { ...u, hasActed: true } : u) }, command: shot, reason: 'alreadyActed' },
    { catalog, state, command: { ...shot, target: { cell: { x: 3, y: 0 } } }, reason: 'wrongTargetKind' },
    { catalog: blockedCatalog, state: blockedState, command: shot, reason: 'blockedLos' },
  ];
  for (const c of cases) {
    const before = structuredClone(c.state);
    expect(previewAttack(c.state, c.command, c.catalog)).toEqual({ ok: false, reason: c.reason });
    expect(dispatch(c.state, c.command, c.catalog)).toEqual({ ok: false, reason: c.reason });
    expect(c.state).toEqual(before);
  }
});
it('High Shot accepts only range 2–5 and is owned only by the Ranger', () => {
  for (const distance of [1, 2, 5, 6]) {
    const { catalog, state } = setup(distance); const before = structuredClone(state);
    const result = dispatch(state, shot, catalog);
    expect(result.ok).toBe(distance >= 2 && distance <= 5);
    if (!result.ok) expect(result.reason).toBe('outOfRange');
    expect(state).toEqual(before);
  }
  const { catalog, state } = setup();
  expect(dispatch({ ...state, activeIndex: state.initiative.indexOf(1) }, { ...shot, unitId: 1 }, catalog))
    .toEqual({ ok: false, reason: 'abilityNotOwned' });
});
it('validates attack profiles and includes their numbers in the content identity', () => {
  const copy = structuredClone(battleCatalog);
  const changed = { ...copy, abilities: { ...copy.abilities,
    'ability:high_shot': { ...copy.abilities['ability:high_shot'], baseDamage: 3 } } };
  expect(validateContent(changed).ok).toBe(true);
  expect(contentVersion(changed)).not.toBe(contentVersion(battleCatalog));
  for (const patch of [{ rangeMin: 6 }, { baseDamage: NaN }, { kind: 'unknown' }, { owners: ['mage'] }, { uphillDamage: -1 }]) {
    expect(validateContent({ ...copy, abilities: { ...copy.abilities,
      'ability:high_shot': { ...copy.abilities['ability:high_shot'], ...patch } } }).ok).toBe(false);
  }
  for (const id of ['ability:Bad', '__proto__', 'constructor']) {
    const abilities = Object.fromEntries([...Object.entries(copy.abilities), [id, { ...copy.abilities['ability:high_shot'], id }]]);
    expect(validateContent({ ...copy, abilities }).ok).toBe(false);
  }
});

const missile = { type: 'useAbility', unitId: 3, abilityId: 'ability:magic_missile', target: { unitId: 4 } } as const;
function missileSetup(level = 1) {
  const { catalog, state } = setup();
  const profile = catalog.abilities['ability:magic_missile']; assert(profile.kind === 'magicMissile');
  const updated = { ...catalog, abilities: { ...catalog.abilities, 'ability:magic_missile': { ...profile, casterLevel: level } } };
  return { catalog: updated, state: { ...state, versions: { ...state.versions, content: contentVersion(updated) },
    activeIndex: state.initiative.indexOf(3), units: state.units.map(u => u.id === 3 ? { ...u, cell: { x: 1, y: 0 } } : u) } };
}
it('Magic Missile dispatch automatically hits with seeded 1d4+1 damage, pure preview and one action', () => {
  const faces = new Set<number>();
  for (let seed = 0; seed < 40; seed++) {
    const setup = missileSetup(), state = { ...setup.state, rng: seedRng(seed) }, before = structuredClone(state);
    const catalogBefore = structuredClone(setup.catalog);
    const preview = previewMagicMissile(state, missile, setup.catalog); assert(preview.ok);
    expect(preview).toMatchObject({ missileCount: 1, minDamage: 2, maxDamage: 5 });
    const roll = rollDie(state.rng, 4); faces.add(roll.value);
    const result = dispatch(state, missile, setup.catalog); assert(result.ok);
    expect(result.events).toContainEqual({ type: 'missileRolled', unitId: 3, targetId: 4, missile: 1, natural: roll.value, damage: roll.value + 1 });
    expect(result.events.some(e => e.type === 'attackRolled' || e.type === 'saveRolled')).toBe(false);
    expect(result.state.rng).toEqual(roll.rng);
    expect(result.state.units.find(u => u.id === 4)?.hp).toBe(state.units.find(u => u.id === 4)!.hp - roll.value - 1);
    expect(result.state.units.find(u => u.id === 3)?.hasActed).toBe(true);
    expect(dispatch(result.state, missile, setup.catalog)).toEqual({ ok: false, reason: 'alreadyActed' });
    expect(state).toEqual(before);
    expect(readBattleState(result.state, setup.catalog).ok).toBe(true);
    expect(setup.catalog).toEqual(catalogBefore);
  }
  expect([...faces].sort()).toEqual([1,2,3,4]);
});
it('Magic Missile follows caster-level progression and splits assigned missiles with deterministic replay', () => {
  for (const [level, count] of [[1,1],[2,1],[3,2],[5,3],[7,4],[9,5],[20,5]]) {
    const { catalog, state } = missileSetup(level);
    const command = { ...missile, target: { missileTargets: Array<number>(count).fill(4) } };
    const result = dispatch(state, command, catalog); assert(result.ok);
    expect(result.events.filter(e => e.type === 'missileRolled')).toHaveLength(count);
    expect(result.events.filter(e => e.type === 'defeated').length).toBeLessThanOrEqual(1);
    let rng=state.rng;const expected=[];
    for(let missile=1;missile<=count;missile++){const roll=rollDie(rng,4);rng=roll.rng;expected.push({type:'missileRolled',unitId:3,targetId:4,missile,natural:roll.value,damage:roll.value+1});}
    expect(result.events.filter(e=>e.type==='missileRolled')).toEqual(expected);expect(result.state.rng).toEqual(rng);
  }
  const { catalog, state } = missileSetup(3);
  const nearby = { ...state, units: state.units.map(u => u.id === 5 ? { ...u, cell: { x: 4, y: 0 } } : u) };
  const split = dispatch(nearby, { ...missile, target: { missileTargets: [4,5] } }, catalog); assert(split.ok);
  expect(split.events.filter(e => e.type === 'missileRolled').map(e => e.targetId)).toEqual([4,5]);
});
it('Magic Missile validates all targets before spending action or RNG and honors range, LOS and ownership', () => {
  const { catalog, state } = missileSetup(3), before = structuredClone(state);
  for (const [target, reason] of [[{ missileTargets: [4] }, 'wrongMissileCount'],
    [{ missileTargets: [4,64] }, 'missingTarget'], [{ cell: { x: 3, y: 0 } }, 'wrongTargetKind']] as const)
    expect(dispatch(state, { ...missile, target }, catalog)).toEqual({ ok: false, reason });
  const far = { ...state, units: state.units.map(u => u.id === 4 ? { ...u, cell: { x: 7, y: 0 } } : u) };
  expect(dispatch(far, missile, catalog)).toEqual({ ok: false, reason: 'outOfRange' });
  const fighter = { ...state, activeIndex: state.initiative.indexOf(1) };
  expect(dispatch(fighter, { ...missile, unitId: 1 }, catalog)).toEqual({ ok: false, reason: 'abilityNotOwned' });
  const blocked = { ...catalog, maps: { 'map:forest_ruins': { ...catalog.maps['map:forest_ruins'],
    cells: catalog.maps['map:forest_ruins'].cells.map(c => c.x === 2 && c.y === 0 ? { ...c, terrainId: 'forest' as const } : c) } } };
  expect(dispatch({ ...state, versions: { ...state.versions, content: contentVersion(blocked) } }, missile, blocked)).toEqual({ ok: false, reason: 'blockedLos' });
  expect(state).toEqual(before);
});

it('Magic Missile replays from the real battle creation boundary', () => {
  const setup = missileSetup();
  const catalog = { ...setup.catalog, maps: { 'map:forest_ruins': { ...setup.catalog.maps['map:forest_ruins'],
    spawns: setup.catalog.maps['map:forest_ruins'].spawns.map(u => u.id === 3 ? { ...u, x: 1, y: 0 } : u.id === 4 ? { ...u, x: 3, y: 0 } : u) } } };
  const created = createBattle('map:forest_ruins', 17, catalog); assert(created.ok);
  let state = created.state;
  const commands: Parameters<typeof dispatch>[1][] = [];
  while (state.initiative[state.activeIndex] !== 3) {
    const command = { type: 'endTurn', unitId: state.initiative[state.activeIndex] } as const;
    commands.push(command); const next = dispatch(state, command, catalog); assert(next.ok); state = next.state;
  }
  const target = state.units.find(u => u.side === 'enemy' && previewMagicMissile(state, { ...missile, target: { unitId: u.id } }, catalog).ok)!;
  expect(target).toBeDefined();
  const command = { ...missile, target: { unitId: target.id } }; commands.push(command);
  const cast = dispatch(state, command, catalog); assert(cast.ok);
  const replay = replayBattle({ format: state.format, versions: state.versions, initial: created.state, commands }, catalog);
  assert(replay.ok); expect(replay.state).toEqual(cast.state);
});

it('Magic Missile rejects cursor exhaustion atomically, validates profiles and ends battle only once', () => {
  const { catalog, state } = missileSetup(9);
  const cursor=Number.MAX_SAFE_INTEGER-2;
  const exhausted = { ...state, rng: { ...state.rng, cursor, words:[state.rng.words[0],state.rng.words[1],state.rng.words[2],(cursor%UINT32_RANGE+RNG_WARMUP_DRAWS+1)%UINT32_RANGE] as const } };
  expect(readBattleState(exhausted,catalog).ok).toBe(true);
  const before = structuredClone(exhausted);
  expect(dispatch(exhausted, missile, catalog)).toEqual({ ok: false, reason: 'invalidState' });
  expect(exhausted).toEqual(before);
  for (const patch of [{ casterLevel: 0 }, { casterLevel: 21 }, { rangeMax: 0 }, { rangeMin: 6 }, { owners: ['fighter'] }, { baseDamage: 3 }])
    expect(validateContent({ ...catalog, abilities: { ...catalog.abilities,
      'ability:magic_missile': { ...catalog.abilities['ability:magic_missile'], ...patch } } }).ok).toBe(false);
  const lastEnemy = { ...state, units: state.units.map(u => u.side === 'enemy' ? { ...u, hp: u.id === 4 ? 1 : 0 } : u) };
  const result = dispatch(lastEnemy, missile, catalog); assert(result.ok);
  expect(result.state.outcome).toBe('playerWin');
  expect(result.events.filter(e => e.type === 'defeated')).toHaveLength(1);
  expect(result.events.filter(e => e.type === 'battleEnded')).toHaveLength(1);
  expect(result.events.filter(e => e.type === 'missileRolled')).toHaveLength(5);
});

it('Magic Missile accepts its five-tile edge and rejects separated targets and malformed assignments', () => {
  const { catalog, state } = missileSetup(3);
  for (const distance of [1,5,6]) {
    const placed = { ...state, units: state.units.map(u => u.id === 4 ? { ...u, cell: { x: distance + 1, y: 0 } } : u) };
    expect(previewMagicMissile(placed, missile, catalog).ok).toBe(distance <= 5);
  }
  const separated = { ...state, units: state.units.map(u => u.id === 4 ? { ...u, cell: { x: 5, y: 0 } } :
    u.id === 5 ? { ...u, cell: { x: 1, y: 1 } } : u) };
  expect(dispatch(separated, { ...missile, target: { missileTargets: [4,5] } }, catalog)).toEqual({ ok: false, reason: 'targetsTooFarApart' });
  for (const missileTargets of [[], Array(2), [4,NaN], [4,4,4,4,4,4]])
    expect(dispatch(state, { ...missile, target: { missileTargets } }, catalog)).toEqual({ ok: false, reason: 'malformedCommand' });
});

it('Guarded Strike tradeoff changes content identity and rejects old snapshots/replays', () => {
  const legacy = structuredClone(battleCatalog);
  const profile = legacy.abilities['ability:guarded_strike']; assert(profile.kind === 'guardedAttack');
  // Deliberately model the superseded catalog, without treating it as current validated content.
  Object.assign(profile, { attackPenalty: 4 });
  const created = createBattle('map:forest_ruins', 17, battleCatalog); assert(created.ok);
  expect(contentVersion(legacy)).not.toBe(contentVersion(battleCatalog));
  const old = { ...created.state, versions: { ...created.state.versions, content: contentVersion(legacy) } };
  expect(readBattleState(old, battleCatalog)).toEqual({ ok: false, reason: 'invalidState' });
  expect(replayBattle({ format: STATE_FORMAT_VERSION, versions: old.versions, initial: old, commands: [] }, battleCatalog).ok).toBe(false);
});

it('shares Guarded projection with inspection on an already projected equipment catalog', () => {
  const base = guardSetup(12);
  // Equipment has already been projected; the evaluator must not project it again.
  const catalog = { ...base.catalog, heroes: { ...base.catalog.heroes, fighter: { ...base.catalog.heroes.fighter,
    stats: { ...base.catalog.heroes.fighter.stats, armorClass: 15, accuracy: 5 } } } };
  const state = { ...base.state, versions: { ...base.state.versions, content: contentVersion(catalog) },
    units: base.state.units.map(u => u.id === 1 ? { ...u, guarded: true as const } : u) };
  const fighter = state.units.find(u => u.id === 1)!;
  const session = new BattleSession(catalog, state, state.seed);
  expect(guardedEffect(fighter)).toEqual({ kind: 'guarded', sourceId: 1, targetId: 1 });
  expect(unitFeedback(session, fighter)).toMatchObject({ accuracy: 3, armorClass: 17, status: 'Guarded (+2 AC, −2 attack rolls; expires immediately before this unit’s next turn) · Second Wind 1/1 use this battle' });
  for (const abilityId of ['ability:basic_attack', 'ability:guarded_strike'] as const)
    expect(previewAttack(state, { ...guardedStrike, abilityId }, catalog)).toMatchObject({ ok: true, bonus: 3 });
  const before = structuredClone(state);
  for (let i = 0; i < 3; i++) { expect(session.prepare(guardedStrike).ok).toBe(true); session.cancel(); }
  expect(session.state).toEqual(before); expect(session.events).toEqual([]); expect(session.continuation!.commands).toEqual([]);
});
it('removes guard on lethal ordinary or missile damage without emitting a turn-expiry event', () => {
  for (const missileAttack of [false, true]) {
    const { catalog, state } = guardSetup(20);
    const actor = missileAttack ? 3 : 4;
    const snapshot = { ...state, activeIndex: state.initiative.indexOf(actor), units: state.units.map(u =>
      u.id === 1 ? { ...u, hp: 1, guarded: true as const } : missileAttack && u.id === 3 ? { ...u, cell: { x: 1, y: 0 } } : u) };
    const command = { type: 'useAbility', unitId: actor,
      abilityId: missileAttack ? 'ability:magic_missile' : 'ability:basic_attack', target: { unitId: 1 } } as const;
    const result = dispatch(freeze(snapshot), command, catalog); assert(result.ok);
    expect(result.state.units.find(u => u.id === 1)).toMatchObject({ hp: 0 });
    expect(result.state.units.find(u => u.id === 1)?.guarded).toBeUndefined();
    expect(result.events.filter(e => e.type === 'defeated')).toEqual([{ type: 'defeated', unitId: 1 }]);
    expect(result.events.some(e => e.type === 'guardExpired')).toBe(false);
    expect(combatStats(result.state.units[0], catalog)).toEqual({ accuracy: 4, armorClass: 14 });
  }
});
