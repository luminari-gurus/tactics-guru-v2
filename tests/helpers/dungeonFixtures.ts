import { freshExploration, neighbors, poiCell, visit } from '../../src/domain/exploration';
import { freshDungeon, floorDescriptor, dungeonOffer, readDungeon, startDungeonBattle, dungeonBattle, acceptDungeonBattle, dungeonItem, dungeonBoundary, travelDungeon, stepDungeon, clearedDungeonSlots, type DungeonState, type DungeonResult, type DungeonItemCommand } from '../../src/domain/dungeon';
import { generateMap } from '../../src/map/generate';
import { BattleSession } from '../../src/app/BattleSession';
import { playerDecision, fighterDecision, rangerDecision, mageDecision } from './playerPolicy';
import type { Command } from '../../src/domain/types';
import { DUNGEON_ENCOUNTER_POLICY, LEGACY_ENCOUNTER_POLICY, type DungeonEncounterPolicy } from '../../src/domain/dungeonEncounters';
import { legacyDungeonIdentity, priorDungeonIdentity } from '../../src/content/dungeon';
import { canonical, hashJson } from '../../src/domain/contentIdentity';
import { dungeonContent } from '../../src/content/dungeon';
/** Exact previous wire shapes, only from the fixed/unscaled policy they actually supported. */
export function priorDungeonPayload(s: DungeonState, format: 1 | 2) {
  if (s.encounterPolicy !== LEGACY_ENCOUNTER_POLICY) throw Error('Prior fixtures must use legacy opponents');
  const { encounterPolicy, ...state } = s;
  return { ...state, party: s.party.map(({heroId,hp})=>({heroId,hp})), floors: s.floors.map(f => {
    const { encounters, ...descriptor } = f.descriptor;
    return format === 1 ? { descriptor, position: f.position === descriptor.downstairs ? f.position : descriptor.upstairs, completed: f.completed } : { ...f, descriptor };
  }) };
}
export function priorDungeonEnvelope(s: DungeonState, format: 1 | 2) {
  const body = { kind: 'tactics-guru:dungeon', format, identity: format === 1 ? legacyDungeonIdentity : priorDungeonIdentity, payload: priorDungeonPayload(s, format) };
  return canonical({ ...body, digest: hashJson(body) });
}
export const checkedDungeon = (r: DungeonResult) => { if(!r.ok)throw Error(r.reason);return r.state; };
/** Legal pure-domain play fixture, not a claim that all preceding turns used browser input. */
export function dungeonVictoryBoundary(seed: number, slot = 0) {
  let dungeon=freshDungeon('dungeon-browser-fixture',seed);
  const histories: unknown[]=[];
  for(let index=0;index<=slot;index++) {
    dungeon=checkedDungeon(startDungeonBattle(atEncounter(dungeon)));
    const built=dungeonBattle(dungeon)!;
    const battle=new BattleSession(built.catalog,dungeon.activeBattle!,dungeon.activeBattle!.seed,undefined,true,built.battlefield);
    let last: { snapshot: DungeonState; command: Command }|null=null;
    for(let step=0;step<500&&battle.state.outcome==='ongoing';step++) {
      if(battle.phase==='enemy'){const p=battle.nextEnemy();if(!p)throw Error('enemy stalled');battle.finishPresentation(p.token);continue;}
      const command=playerDecision(battle.state,built.catalog);
      const before=battle.state;
      if(!battle.prepare(command).ok)throw Error('policy rejected');
      const p=battle.confirm();if(!p)throw Error('policy failed');
      if(p.after.outcome==='playerWin')last={snapshot:{...dungeon,activeBattle:before},command};
      battle.finishPresentation(p.token);
    }
    if(battle.state.outcome!=='playerWin'||!last)return null;
    histories.push({ replay: battle.replay, entry: dungeon });
    if(index===slot)return {...last,histories};
    dungeon=checkedDungeon(acceptDungeonBattle(dungeon,battle.state));
    const offer=dungeon.offer!;
    const itemId=offer.options.find(o=>o.itemId==='item:healing_draught')?.itemId??offer.options[0].itemId;
    dungeon=checkedDungeon(dungeonItem(dungeon,{...dungeonBoundary(dungeon),type:'claimReward',offerId:offer.id,itemId}));
    for(const hero of dungeon.party)if(hero.hp>0&&hero.hp<hero.maxHp&&dungeon.ownership.consumables.length) {
      const used=dungeonItem(dungeon,{...dungeonBoundary(dungeon),type:'useItem',itemId:'item:healing_draught',heroId:hero.heroId});if(used.ok)dungeon=used.state;
    }
  }
  return null;
}

/** Structural capacity fixture; not evidence of a preceding legal full playthrough. */
export function dungeonCapacityFixture(policy: DungeonEncounterPolicy = DUNGEON_ENCOUNTER_POLICY): DungeonState {
  for(let seed=1;seed<=100;seed++){
    const base=freshDungeon('dungeon-capacity-fixture',seed,policy);
    const floors=Array.from({length:4},(_,i)=>{const descriptor=floorDescriptor(seed,i+1,undefined,policy);return {descriptor,position:descriptor.upstairs,completed:i===3?1:3,exploration:freshExploration(descriptor.seed,descriptor.upstairs)};});
    const equipment=Array.from({length:6},(_,i)=>({instanceId:`${base.id}:floor:${Math.floor(i/2)+1}:reward:${i%2}:option:0`,itemId:'item:warding_charm' as const}));
    const candidate:DungeonState={...base,revision:100,depth:4,floors,phase:'reward',ownership:{consumables:[],equipment,assignments:[{heroId:'fighter',slot:'charm',instanceId:equipment[0].instanceId}]}};
    const offer=dungeonOffer(candidate);
    if(offer.options.every(o=>o.itemId!=='item:healing_draught'))return checkedDungeon(readDungeon({...atEncounter(candidate,0),offer}));
  }
  throw Error('No two-charm capacity fixture');
}

/** Structural position fixture, not evidence of UI traversal. */
export function atCell(s: DungeonState, position: number): DungeonState {
  const floors = [...s.floors], f = floors[s.depth-1];
  floors[s.depth-1] = { ...f, position, exploration: visit(f.exploration,position) };
  return { ...s, floors };
}
export function atEncounter(s: DungeonState, slot = s.floors[s.depth-1].completed): DungeonState {
  return slot >= 3 ? s : atCell(s, poiCell(s.floors[s.depth-1].exploration.pois[slot]));
}
/** Structural adjacent position for exercising the real stair-entry command. */
export function atStairApproach(s: DungeonState, direction: 'ascend' | 'descend' = 'descend') {
  const f = s.floors[s.depth-1], stair = direction === 'ascend' ? f.descriptor.upstairs : f.descriptor.downstairs;
  const map = generateMap(f.descriptor.seed, 'rooms');
  const cell = neighbors(stair).find(n => map.cells[n] && !f.exploration.pois.some(p => poiCell(p) === n));
  if (cell === undefined) throw Error('No safe stair approach');
  return atCell(s, cell);
}
export const atDownstairs = (s: DungeonState) => atCell(s,s.floors[s.depth-1].descriptor.downstairs);

/** Deliberate existing reward/equipment/healing choices, shared by pure witness search and UI play. */
export function journeyPreparation(s: DungeonState): DungeonItemCommand | null {
  const boundary = dungeonBoundary(s);
  if (s.offer) return { ...boundary, type:'claimReward', offerId:s.offer.id,
    itemId:s.offer.options.find(o=>o.itemId==='item:healing_draught')?.itemId??s.offer.options[0].itemId };
  if (s.phase !== 'ready') return null;
  const hero = s.party.find(h=>h.hp>0&&!s.ownership.assignments.some(a=>a.heroId===h.heroId));
  const item = s.ownership.equipment.find(e=>!s.ownership.assignments.some(a=>a.instanceId===e.instanceId));
  if (hero && item) return {...boundary,type:'equipItem',instanceId:item.instanceId,heroId:hero.heroId,slot:'charm'};
  const hurt = [...s.party].filter(h=>h.hp>0&&h.hp<h.maxHp)
    .sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
  return hurt&&s.ownership.consumables.some(c=>c.itemId==='item:healing_draught')?{...boundary,type:'useItem',itemId:'item:healing_draught',heroId:hurt.heroId}:null;
}

/** Legal domain witness search; browser acceptance enacts every turn and spatial step independently. */
export function dungeonJourney(seed: number, floorCount = 1, finishTargets = false) {
  let state = freshDungeon('biome-journey',seed);
  const battles: {selection: NonNullable<ReturnType<typeof dungeonBattle>>['selection']; commands:number; party: DungeonState['party']}[] = [];
  for(let depth=1;depth<=floorCount;depth++) {
    for(let slot=0;slot<3;slot++) {
      state=checkedDungeon(startDungeonBattle(atEncounter(state)));
      const built=dungeonBattle(state)!,battle=new BattleSession(built.catalog,state.activeBattle!,state.activeBattle!.seed,undefined,true,built.battlefield);
      for(let i=0;i<500&&battle.state.outcome==='ongoing';i++) {
        const p=battle.phase==='enemy'?battle.nextEnemy():(battle.prepare(playerDecision(battle.state,built.catalog,finishTargets)),battle.confirm());
        if(!p)throw Error('Journey policy stalled');battle.finishPresentation(p.token);
      }
      state=checkedDungeon(acceptDungeonBattle(state,battle.state));
      battles.push({selection:built.selection,commands:battle.state.commandCount,party:state.party});
      if(battle.state.outcome!=='playerWin')return {seed,battles,state,won:false};
      for(let i=0;i<20;i++){const command=journeyPreparation(state);if(!command)break;state=checkedDungeon(dungeonItem(state,command));}
    }
    if(depth<floorCount)state=checkedDungeon(travelDungeon(atDownstairs(state),'descend',state.revision));
  }
  return {seed,battles,state,won:true};
}

/** Single production Shaman encounter from an unplayed seed; UI tests enact traversal and all commands. */
export function shamanJourney(seed = 31) {
  const entry=walkWitness(freshDungeon('shaman-production-journey',seed));
  const built=dungeonBattle(entry)!;
  if(!entry.activeBattle!.units.some(u=>u.defId==='goblin_shaman'))throw Error('Shaman witness selected another composition');
  const battle=new BattleSession(built.catalog,entry.activeBattle!,entry.activeBattle!.seed,undefined,true,built.battlefield);
  for(let step=0;step<500&&battle.state.outcome==='ongoing';step++) {
    const p=battle.phase==='enemy'?battle.nextEnemy():(battle.prepare(playerDecision(battle.state,built.catalog)),battle.confirm());
    if(!p)throw Error('Shaman witness stalled');battle.finishPresentation(p.token);
  }
  if(battle.state.outcome==='ongoing')throw Error('Shaman witness did not finish');
  return {seed,entry,state:battle.state,commands:battle.replay?.commands??battle.continuation!.commands,events:battle.events};
}

/** Full Fighter acceptance witness; source-backed encounters may require a new deterministic seed. */
export function fighterJourney(seed:number) {
  let state=freshDungeon('fighter-production-journey',seed),healed=false,taunted=false;
  const records:{entry:DungeonState;state:import('../../src/domain/types').BattleState;commands:readonly Command[];events:readonly import('../../src/domain/types').BattleEvent[]}[]=[];
  for(let depth=1;depth<=2;depth++) {
    for(let slot=0;slot<3;slot++) {
      state=walkWitness(state);
      const entry=state,built=dungeonBattle(state)!,battle=new BattleSession(built.catalog,state.activeBattle!,state.activeBattle!.seed,undefined,true,built.battlefield);
      for(let step=0;step<500&&battle.state.outcome==='ongoing';step++) {
        if(battle.phase==='enemy'){const p=battle.nextEnemy();if(!p)throw Error('Fighter enemy stalled');battle.finishPresentation(p.token);continue;}
        const command=fighterDecision(battle.state,built.catalog,taunted);
        if(!battle.prepare(command).ok)throw Error('Fighter witness rejected');
        const p=battle.confirm();if(!p)throw Error('Fighter witness stalled');battle.finishPresentation(p.token);
        healed ||= command.type==='useAbility'&&command.abilityId==='ability:second_wind';
        taunted ||= command.type==='useAbility'&&command.abilityId==='ability:taunt';
      }
      records.push({entry,state:battle.state,commands:battle.replay?.commands??battle.continuation!.commands,events:battle.events});
      state=checkedDungeon(acceptDungeonBattle(state,battle.state));
      if(battle.state.outcome!=='playerWin')return {seed,records,state,healed,taunted,depth,slot};
      for(let i=0;i<20;i++){const command=journeyPreparation(state);if(!command)break;state=checkedDungeon(dungeonItem(state,command));}
    }
    if(depth<2)state=checkedDungeon(travelDungeon(atDownstairs(state),'descend',state.revision));
  }
  return {seed,records,state,healed,taunted,depth:2,slot:2};
}

/** Follow the nearest live marker with actual player steps and enemy movement. */
function walkWitness(initial:DungeonState):DungeonState {
  let state=initial;
  for(let attempt=0;attempt<400;attempt++) {
    const f=state.floors[state.depth-1], live=f.exploration.pois.filter(p=>!clearedDungeonSlots(f).includes(p.encounterSlot));
    const blocked=new Set(live.map(poiCell));
    if(state.depth>1)blocked.add(f.descriptor.upstairs);
    if(f.completed===3)blocked.add(f.descriptor.downstairs);
    const map=generateMap(f.descriptor.seed,'rooms'),previous=new Map<number,number>([[f.position,-1]]),queue=[f.position];
    let destination:number|undefined;
    for(let i=0;i<queue.length&&destination===undefined;i++)for(const n of neighbors(queue[i]))if(map.cells[n]&&!previous.has(n)){
      if(blocked.has(n)){if(live.some(p=>poiCell(p)===n)){previous.set(n,queue[i]);destination=n;break;}continue;}
      previous.set(n,queue[i]);queue.push(n);
    }
    if(destination===undefined)throw Error('No reachable encounter');
    let n=destination;while(previous.get(n)!==f.position)n=previous.get(n)!;
    state=checkedDungeon(stepDungeon(state,{id:state.id,depth:state.depth,revision:state.revision,destination:n}));
    if(state.phase==='battle')return state;
  }
  throw Error('Encounter not reached');
}

/** Current-source legal combat witness; its returned histories are replayable, never converted old saves. */
export function rangerJourney(seed:number) {
  let state=freshDungeon('ranger-production-journey',seed);
  const used={mark:false,pin:false},records:{entry:DungeonState;state:import('../../src/domain/types').BattleState;commands:readonly Command[];events:readonly import('../../src/domain/types').BattleEvent[]}[]=[];
  for(let depth=1;depth<=3;depth++) {
    for(let slot=0;slot<3;slot++) {
      state=walkWitness(state);
      const entry=state,built=dungeonBattle(state)!,battle=new BattleSession(built.catalog,state.activeBattle!,state.activeBattle!.seed,undefined,true,built.battlefield);
      for(let step=0;step<500&&battle.state.outcome==='ongoing';step++) {
        if(battle.phase==='enemy'){const p=battle.nextEnemy();if(!p)throw Error('Enemy stalled');battle.finishPresentation(p.token);continue;}
        const command=rangerDecision(battle.state,built.catalog,used);if(!battle.prepare(command).ok)throw Error('Ranger witness rejected');
        const p=battle.confirm();if(!p)throw Error('Ranger witness stalled');battle.finishPresentation(p.token);
        if(command.type==='useAbility'&&command.abilityId==='ability:mark_target')used.mark=true;
        if(command.type==='useAbility'&&command.abilityId==='ability:pinning_shot')used.pin=true;
      }
      records.push({entry,state:battle.state,commands:battle.replay?.commands??battle.continuation!.commands,events:battle.events});
      state=checkedDungeon(acceptDungeonBattle(state,battle.state));
      if(battle.state.outcome!=='playerWin')return {seed,records,state,used};
      for(let i=0;i<20;i++){const command=journeyPreparation(state);if(!command)break;state=checkedDungeon(dungeonItem(state,command));}
    }
    // Continue to a terminal boundary after proving both actions; a finite witness may end in victory or defeat.
    if(used.mark&&used.pin)return {seed,records,state,used};
    state=checkedDungeon(travelDungeon(atDownstairs(state),'descend',state.revision));
  }
  return {seed,records,state,used};
}

/** Current-source Mage combat witness; browser acceptance enacts all spatial steps and commands. */
export function mageJourney(seed:number) {
  let state=freshDungeon('mage-production-journey',seed);
  const used={snare:false,missiles:false},records:{entry:DungeonState;state:import('../../src/domain/types').BattleState;commands:readonly Command[];events:readonly import('../../src/domain/types').BattleEvent[]}[]=[];
  for(let depth=1;depth<=3;depth++) {
    for(let slot=0;slot<3;slot++) {
      state=walkWitness(state);
      const entry=state,built=dungeonBattle(state)!,battle=new BattleSession(built.catalog,state.activeBattle!,state.activeBattle!.seed,undefined,true,built.battlefield);
      for(let step=0;step<500&&battle.state.outcome==='ongoing';step++) {
        if(battle.phase==='enemy'){const p=battle.nextEnemy();if(!p)throw Error('Enemy stalled');battle.finishPresentation(p.token);continue;}
        const command=mageDecision(battle.state,built.catalog,used.snare);if(!battle.prepare(command).ok)throw Error('Mage witness rejected');
        const p=battle.confirm();if(!p)throw Error('Mage witness stalled');battle.finishPresentation(p.token);
        if(command.type==='useAbility'&&command.abilityId==='ability:frost_snare')used.snare=true;
        if(p.events.filter(e=>e.type==='missileRolled').length>=2)used.missiles=true;
      }
      records.push({entry,state:battle.state,commands:battle.replay?.commands??battle.continuation!.commands,events:battle.events});
      state=checkedDungeon(acceptDungeonBattle(state,battle.state));
      if(battle.state.outcome!=='playerWin')return {seed,records,state,used};
      for(let i=0;i<20;i++){const command=journeyPreparation(state);if(!command)break;state=checkedDungeon(dungeonItem(state,command));}
    }
    if(depth<3)state=checkedDungeon(travelDungeon(atDownstairs(state),'descend',state.revision));
  }
  return {seed,records,state,used};
}

/** Legal first-floor Fighter witness supplies the healed carry fixture in the current wire format. */
export function healedFighterBoundary() {
  let state=freshDungeon('fighter-production-journey',190);
  for(let slot=0;slot<3;slot++) {
    state=checkedDungeon(startDungeonBattle(atEncounter(state)));
    const entry=state,built=dungeonBattle(state)!,battle=new BattleSession(built.catalog,state.activeBattle!,state.activeBattle!.seed,undefined,true,built.battlefield);
    for(let step=0;step<500&&battle.state.outcome==='ongoing';step++) {
      const p=battle.phase==='enemy'?battle.nextEnemy():(battle.prepare(fighterDecision(battle.state,built.catalog,false)),battle.confirm());
      if(!p)throw Error('Fighter witness stalled');battle.finishPresentation(p.token);
    }
    if(battle.state.outcome!=='playerWin')throw Error('Fighter fixture did not win');
    if(slot===2)return {entry,state:battle.state};
    state=checkedDungeon(acceptDungeonBattle(state,battle.state));
    for(let i=0;i<20;i++){const command=journeyPreparation(state);if(!command)break;state=checkedDungeon(dungeonItem(state,command));}
  }
  throw Error('Missing healed Fighter boundary');
}
