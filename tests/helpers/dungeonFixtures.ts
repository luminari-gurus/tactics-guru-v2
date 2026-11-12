import { freshExploration, neighbors, poiCell, reveal, visit } from '../../src/domain/exploration';
import { freshDungeon, floorDescriptor, floorMap, dungeonOffer, readDungeon, startDungeonBattle, dungeonBattle, acceptDungeonBattle, dungeonItem, dungeonBoundary, travelDungeon, stepDungeon, clearedDungeonSlots, type DungeonState, type DungeonResult, type DungeonItemCommand } from '../../src/domain/dungeon';
import { generateMap } from '../../src/map/generate';
import { BattleSession } from '../../src/app/BattleSession';
import { playerDecision, fighterDecision, rangerDecision, mageDecision } from './playerPolicy';
import type { Command, ReplayCommand } from '../../src/domain/types';
import { dispatch } from '../../src/domain/turns';
import { previewAbility } from '../../src/domain/combat';
import { progressHero } from '../../src/domain/progression';
import type { ContentCatalog } from '../../src/content/types';
function witnessCommands(commands:readonly ReplayCommand[]):readonly Command[] {
  if(commands.some(command=>command.type==='undoMove')) throw Error('Unexpected undo in witness history');
  return commands.filter((command):command is Command=>command.type!=='undoMove');
}
import { DUNGEON_ENCOUNTER_POLICY, LEGACY_ENCOUNTER_POLICY, type DungeonEncounterPolicy } from '../../src/domain/dungeonEncounters';
import { legacyDungeonIdentity, priorDungeonIdentity } from '../../src/content/dungeon';
import { canonical, hashJson } from '../../src/domain/contentIdentity';
import { dungeonContent } from '../../src/content/dungeon';
/** Rebuild the terrain memory that the through-wall discovery rule would have saved. */
export function withLegacySight(state: DungeonState): DungeonState {
  const floors = state.floors.map(floor => {
    const { sightVersion, ...exploration } = floor.exploration;
    const { width, height } = floorMap(floor.descriptor);
    const revealed = [...new Set(exploration.visited.flatMap(cell => reveal(cell, width, height)))].sort((a, b) => a - b);
    return { ...floor, exploration: { ...exploration, revealed } };
  });
  return { ...state, floors };
}
/** Exact previous wire shapes, only from the fixed/unscaled policy they actually supported. */
export function priorDungeonPayload(s: DungeonState, format: 1 | 2) {
  if (s.encounterPolicy !== LEGACY_ENCOUNTER_POLICY) throw Error('Prior fixtures must use legacy opponents');
  const { encounterPolicy, ...state } = format === 2 ? withLegacySight(s) : s;
  return { ...state, party: s.party.map(({heroId,hp})=>({heroId,hp})), floors: state.floors.map(f => {
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
    const floors=Array.from({length:4},(_,i)=>{const descriptor=floorDescriptor(seed,i+1,undefined,policy);return {descriptor,position:descriptor.upstairs,completed:i===3?1:3,exploration:freshExploration(descriptor.seed,descriptor.upstairs,floorMap(descriptor))};});
    const equipment=Array.from({length:6},(_,i)=>({instanceId:`${base.id}:floor:${Math.floor(i/2)+1}:reward:${i%2}:option:0`,itemId:'item:warding_charm' as const}));
    const candidate:DungeonState={...base,revision:100,depth:4,floors,phase:'reward',ownership:{consumables:[],equipment,assignments:[{heroId:'fighter',slot:'charm',instanceId:equipment[0].instanceId}]}};
    const offer=dungeonOffer(candidate);
    if(offer.options.every(o=>dungeonContent.items[o.itemId].kind==='equipment'))return checkedDungeon(readDungeon({...atEncounter(candidate,0),offer}));
  }
  throw Error('No two-charm capacity fixture');
}

/** Structural position fixture, not evidence of UI traversal. */
export function atCell(s: DungeonState, position: number): DungeonState {
  const floors = [...s.floors], f = floors[s.depth-1];
  floors[s.depth-1] = { ...f, position, exploration: visit(f.exploration,position,floorMap(f.descriptor)) };
  return { ...s, floors };
}
export function atEncounter(s: DungeonState, slot = s.floors[s.depth-1].completed): DungeonState {
  return slot >= 3 ? s : atCell(s, poiCell(s.floors[s.depth-1].exploration.pois[slot], s.floors[s.depth-1].descriptor.size ?? 20));
}
/** Structural adjacent position for exercising the real stair-entry command. */
export function atStairApproach(s: DungeonState, direction: 'ascend' | 'descend' = 'descend') {
  const f = s.floors[s.depth-1], stair = direction === 'ascend' ? f.descriptor.upstairs : f.descriptor.downstairs;
  const map = floorMap(f.descriptor);
  const cell = neighbors(stair,map.width,map.height).find(n => map.cells[n] && !f.exploration.pois.some(p => poiCell(p,map.width) === n));
  if (cell === undefined) throw Error('No safe stair approach');
  return atCell(s, cell);
}
export const atDownstairs = (s: DungeonState) => atCell(s,s.floors[s.depth-1].descriptor.downstairs);

/** Deliberate existing reward/equipment/healing choices, shared by pure witness search and UI play. */
export function journeyPreparation(s: DungeonState): DungeonItemCommand | null {
  const boundary = dungeonBoundary(s);
  const fallen = s.party.find(h=>h.hp===0);
  const kit = 'item:revive_kit';
  if (['ready','reward'].includes(s.phase) && fallen && s.party.some(h=>h.hp>0) && s.ownership.consumables.some(c=>c.itemId===kit))
    return {...boundary,type:'useItem',itemId:kit,heroId:fallen.heroId};
  if (s.offer) return { ...boundary, type:'claimReward', offerId:s.offer.id,
    itemId:s.offer.options.find(o=>o.itemId===(fallen?kit:'item:healing_draught'))?.itemId??
      s.offer.options.find(o=>o.itemId==='item:healing_draught')?.itemId??
      s.offer.options.find(o=>dungeonContent.items[o.itemId].kind==='equipment')?.itemId??s.offer.options[0].itemId };
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
      records.push({entry,state:battle.state,commands:witnessCommands(battle.replay?.commands??battle.continuation!.commands),events:battle.events});
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
    const width=f.descriptor.size ?? 20;
    const blocked=new Set(live.map(p => poiCell(p,width)));
    if(state.depth>1)blocked.add(f.descriptor.upstairs);
    if(f.completed===3)blocked.add(f.descriptor.downstairs);
    const map=floorMap(f.descriptor),previous=new Map<number,number>([[f.position,-1]]),queue=[f.position];
    let destination:number|undefined;
    for(let i=0;i<queue.length&&destination===undefined;i++)for(const n of neighbors(queue[i],width))if(map.cells[n]&&!previous.has(n)){
      if(blocked.has(n)){if(live.some(p=>poiCell(p,width)===n)){previous.set(n,queue[i]);destination=n;break;}continue;}
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
      records.push({entry,state:battle.state,commands:witnessCommands(battle.replay?.commands??battle.continuation!.commands),events:battle.events});
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
        // Once both earned abilities are witnessed, wait legally to a terminal
        // defeat instead of adding unrelated floors to this bounded witness.
        const command=used.snare&&used.missiles?{type:'endTurn' as const,unitId:battle.active.id}:mageDecision(battle.state,built.catalog,used.snare);if(!battle.prepare(command).ok)throw Error('Mage witness rejected');
        const p=battle.confirm();if(!p)throw Error('Mage witness stalled');battle.finishPresentation(p.token);
        if(command.type==='useAbility'&&command.abilityId==='ability:frost_snare')used.snare=true;
        if(p.events.filter(e=>e.type==='missileRolled').length>=2)used.missiles=true;
      }
      records.push({entry,state:battle.state,commands:witnessCommands(battle.replay?.commands??battle.continuation!.commands),events:battle.events});
      state=checkedDungeon(acceptDungeonBattle(state,battle.state));
      if(battle.state.outcome!=='playerWin')return {seed,records,state,used};
      for(let i=0;i<20;i++){const command=journeyPreparation(state);if(!command)break;state=checkedDungeon(dungeonItem(state,command));}
    }
    if(depth<3)state=checkedDungeon(travelDungeon(atDownstairs(state),'descend',state.revision));
  }
  return {seed,records,state,used};
}

export const MAGE_JOURNEY_SEEDS = [64,79] as const;
/** Node-side search only. The optional simulator keeps negative tests independent of lucky real seeds. */
export function selectMageJourney(range:readonly [number,number]=MAGE_JOURNEY_SEEDS,simulate= mageJourney) {
  const [first,last]=range;
  if(!Number.isInteger(first)||!Number.isInteger(last)||first<0||last>0xffffffff||first>last||last-first>=16)
    throw Error('Mage seed range must contain 1–16 ascending uint32 candidates');
  const attempts:{seed:number;missing:string[]}[]=[];
  for(let seed=first;seed<=last;seed++) {
    const witness=simulate(seed),missing:string[]=[];
    if(witness.seed!==seed)throw Error(`Mage witness seed mismatch: requested ${seed}, received ${witness.seed}`);
    if(witness.state.party.find(h=>h.heroId==='mage')!.level<3)missing.push('earned level three');
    if(!witness.used.snare)missing.push('Frost Snare');
    if(!witness.used.missiles)missing.push('multiple missiles');
    if(witness.state.phase!=='defeat'||witness.state.activeBattle!==null)missing.push('terminal cleanup');
    if(missing.length){attempts.push({seed,missing});continue;}
    let blocked=false,expiredAtTurnEnd=false;
    for(const record of witness.records) {
      const catalog=dungeonBattle(record.entry)!.catalog;
      let state=record.entry.activeBattle!;
      const events:import('../../src/domain/types').BattleEvent[]=[];
      for(const command of record.commands) {
        if(state.units.find(u=>u.id===command.unitId)?.movementBlock?.abilityId==='ability:frost_snare'){
          blocked=true;if(command.type==='move')throw Error(`Mage seed ${seed} moved a Snared unit`);
        }
        const result=dispatch(state,command,catalog);
        if(!result.ok)throw Error(`Mage seed ${seed} replay rejected: ${result.reason}`);
        expiredAtTurnEnd ||= command.type==='endTurn'&&result.events.some(e=>e.type==='movementBlockExpired'&&e.unitId===command.unitId&&e.abilityId==='ability:frost_snare');
        state=result.state;events.push(...result.events);
      }
      if(canonical({state,events})!==canonical({state:record.state,events:record.events}))throw Error(`Mage seed ${seed} replay diverged`);
      if(state.units.some(u=>u.movementBlock!==undefined))missing.push('terminal status cleanup');
    }
    if(!blocked||!expiredAtTurnEnd)missing.push('Snared target turn and expiry');
    attempts.push({seed,missing});
    if(!missing.length)return {range:[first,last] as const,attempts,witness};
  }
  throw Error(`No qualifying Mage journey in ${first}–${last}: ${attempts.map(a=>`${a.seed}: ${a.missing.join(', ')}`).join('; ')}`);
}

/** Explicit level-three/position staging; this is not evidence of earned progression or exploration. */
export function stagedMageAbility(abilityId:'ability:frost_snare'|'ability:magic_missile') {
  const fresh=freshDungeon('mage-focused-ability',190),party=fresh.party.map(h=>{
    const hero=progressHero(h.heroId,180,h.hp,dungeonContent.catalog);return {...hero,hp:hero.maxHp};
  });
  const entry=checkedDungeon(startDungeonBattle(atEncounter({...fresh,party}))),built=dungeonBattle(entry)!;
  const catalog:ContentCatalog=built.catalog;
  const initial=entry.activeBattle!,mage=initial.units.find(u=>u.defId==='mage')!,map=catalog.maps[initial.mapId];
  for(const target of initial.units.filter(u=>u.side==='enemy'))for(const cell of map.cells) {
    if(!built.catalog.terrains[cell.terrainId].walkable||initial.units.some(u=>u.id!==mage.id&&u.cell.x===cell.x&&u.cell.y===cell.y))continue;
    const battle={...initial,activeIndex:initial.initiative.indexOf(mage.id),units:initial.units.map(u=>u.id===mage.id?{...u,cell:{x:cell.x,y:cell.y}}:u)};
    const command={type:'useAbility' as const,unitId:mage.id,abilityId,target:{unitId:target.id}};
    if(!previewAbility(battle,command,built.catalog).ok)continue;
    return {state:checkedDungeon(readDungeon({...entry,activeBattle:battle})),command};
  }
  throw Error(`No legal staged Mage target for ${abilityId}`);
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

/** Two real cardinal steps into a live encounter; only the starting position is staged. */
export function dungeonContactApproach(slot: number, seed = 13) {
  const base = freshDungeon(`contact-${slot}-${seed}`, seed), floor = base.floors[0];
  const map = floorMap(floor.descriptor), target = poiCell(floor.exploration.pois[slot], map.width);
  const live = new Set(floor.exploration.pois.map(p => poiCell(p, map.width)));
  for (const approach of neighbors(target, map.width, map.height).filter(cell => map.cells[cell] && !live.has(cell))) {
    const from = neighbors(approach, map.width, map.height).find(cell => map.cells[cell] && !live.has(cell) && !neighbors(target, map.width, map.height).includes(cell));
    if (from !== undefined) return { state: atCell(base, from), approach, target };
  }
  throw Error('No two-step contact approach');
}
