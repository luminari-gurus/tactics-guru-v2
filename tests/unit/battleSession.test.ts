import { describe, expect, it } from 'vitest';
import { BattleSession } from '../../src/app/BattleSession';
import { battleCatalog as catalog } from '../../src/content/catalog';
import { previewMovement } from '../../src/domain/grid';
import { replayBattle } from '../../src/domain/turns';
import { assert } from 'vitest';
import { saveFixtures } from '../helpers/saveFixtures';
import { nextUint32 } from '../../src/domain/rng';
import { targetOverlays, hoverPreview } from '../../src/ui/targetPreview';

const make = (seed = 1) => new BattleSession(catalog, 'map:forest_ruins', seed);
const finishEnemies = (s: BattleSession) => {
  for (let i = 0; s.phase === 'enemy' && i < 30; i++) {
    const step = s.nextEnemy();
    if (step) s.finishPresentation(step.token);
  }
};
describe('battle session', () => {
  it('hover reach includes Magic Missile targets without adding movement cells or mutating the session',()=>{
    const initial=make(2).state,mage=initial.units.find(u=>u.defId==='mage')!,enemy=initial.units.find(u=>u.side==='enemy')!;
    const state={...initial,activeIndex:initial.initiative.indexOf(mage.id),units:initial.units.map(u=>u.id===enemy.id?{...u,cell:{x:7,y:6}}:u)};
    const s=new BattleSession(catalog,state,state.seed),origin={x:4,y:8};
    s.prepare({type:'endTurn',unitId:mage.id});const pending=s.pending,before=s.state;
    const hover=hoverPreview(s,origin)!;
    expect(hover.cells).toContainEqual({x:7,y:6});expect(hover.targets).toContainEqual({x:7,y:6});
    expect(hover.cells).toContainEqual({x:6,y:8}); // Water is in spell reach even though it cannot be walked on.
    expect(s.state).toBe(before);expect(s.pending).toBe(pending);expect(s.events).toEqual([]);
    const blockedState={...state,units:state.units.map(u=>u.id===enemy.id?{...u,cell:{x:2,y:3}}:u)};
    const blocked=new BattleSession(catalog,blockedState,state.seed);
    expect(hoverPreview(blocked,{x:0,y:3})!.targets).not.toContainEqual({x:2,y:3});
    const spent=new BattleSession(catalog,{...state,units:state.units.map(u=>u.id===mage.id?{...u,hasActed:true}:u)},state.seed);
    expect(hoverPreview(spent,origin)).toBeNull();
    const fighter=initial.units.find(u=>u.defId==='fighter')!;
    const melee=new BattleSession(catalog,{...initial,activeIndex:initial.initiative.indexOf(fighter.id)},initial.seed);
    const meleePreview=hoverPreview(melee,{x:11,y:11})!;
    expect(meleePreview.cells).toHaveLength(2);
    expect(meleePreview.cells).toEqual(expect.arrayContaining([{x:10,y:11},{x:11,y:10}]));
    expect(meleePreview.cells).not.toContainEqual({x:9,y:11}); // Within Move 4, outside every fighter ability's range 1.
    expect(meleePreview.cells).not.toContainEqual({x:11,y:11}); // Origin is a marker, not ability range.
  });
  it('target overlays retain domain rejection reasons and never prepare, resolve or consume RNG', () => {
    const initial = make(2).state;
    const ranger = initial.units.find(u=>u.defId==='ranger')!;
    const enemy = initial.units.find(u=>u.side==='enemy')!;
    // A validated snapshot on the authored map with a forest cell between ranger and enemy.
    const state = {...initial,activeIndex:initial.initiative.indexOf(ranger.id),units:initial.units.map(u=>
      u.id===ranger.id?{...u,cell:{x:0,y:3}}:u.id===enemy.id?{...u,cell:{x:2,y:3}}:u)};
    const s = new BattleSession(catalog,state,state.seed);
    expect(s.phase).toBe('player');
    const before=s.state;
    expect(targetOverlays(s,'ability:high_shot',{x:2,y:3}).find(t=>t.selected))
      .toMatchObject({valid:false,reason:'blockedLos'});
    expect(targetOverlays(s,'basic',null).find(t=>t.cell.x===2&&t.cell.y===3))
      .toMatchObject({valid:false,reason:'outOfRange'});
    expect(targetOverlays(s,'ability:high_shot',s.active.cell).find(t=>t.selected))
      .toMatchObject({valid:false,reason:'sameSide'});
    expect(targetOverlays(s,'ability:high_shot',{x:0,y:0}).find(t=>t.selected))
      .toMatchObject({valid:false,reason:'missingTarget'});
    expect(targetOverlays(s,'move',null)).toEqual([]);
    expect(targetOverlays(s,null,null)).toEqual([]);
    expect(s.pending).toBeNull();expect(s.state).toBe(before);expect(s.events).toEqual([]);
    s.prepare({type:'endTurn',unitId:s.active.id});const step=s.confirm()!;
    expect(targetOverlays(s,'ability:high_shot',null)).toEqual([]);
    s.finishPresentation(step.token);s.dispose();expect(targetOverlays(s,'ability:high_shot',null)).toEqual([]);
  });
  it('automatically exposes enemy-first turns, locks player commands, records accepted commands and replays', () => {
    const s = make();
    expect(s.phase).toBe('enemy');
    const initial = s.state;
    expect(s.prepare({type:'endTurn', unitId:s.active.id}).ok).toBe(false);
    expect(s.state).toEqual(initial);
    finishEnemies(s);
    expect(s.phase).toBe('player');
    const replay = replayBattle(s.replay, catalog);
    expect(replay.ok).toBe(true);
    if (replay.ok) { expect(replay.state).toEqual(s.state); expect(replay.events).toEqual(s.events); }
  });
  it('preview/cancel leaves budgets and RNG untouched and rejects invalid targets', () => {
    const s = make(); finishEnemies(s);
    const initial = s.state;
    const reach = previewMovement(s.state, s.active.id, catalog);
    if (!reach.ok) throw Error(reach.reason);
    const cell = reach.cells.find(c=>c.cost>0)!.cell;
    expect(s.prepare({type:'move', unitId:s.active.id,to:cell}).ok).toBe(true);
    expect(s.state).toEqual(initial);
    s.cancel(); expect(s.pending).toBeNull(); expect(s.state).toEqual(initial);
    expect(s.prepare({type:'move', unitId:s.active.id,to:{x:-1,y:-1}}).ok).toBe(false);
    expect(s.state).toEqual(initial);
  });
  it('confirmation is exactly once and obsolete/disposed completion cannot unlock a session', () => {
    const s = make(); finishEnemies(s);
    expect(s.prepare({type:'endTurn',unitId:s.active.id}).ok).toBe(true);
    const n = s.replay!.commands.length;
    const step = s.confirm()!;
    expect(s.phase).toBe('presenting');
    expect(s.confirm()).toBeNull(); expect(s.replay!.commands).toHaveLength(n+1);
    s.finishPresentation(step.token+1); expect(s.phase).toBe('presenting');
    s.dispose(); s.finishPresentation(step.token); expect(s.phase).toBe('disposed');
    expect(s.nextEnemy()).toBeNull();
  });
  it('records a fresh initial boundary independently of previous sessions', () => {
    const old = make(); finishEnemies(old); old.dispose();
    const fresh = make(2);
    expect(fresh.state.seed).toBe(2); expect(fresh.replay!.commands).toEqual([]);
    expect(fresh.pending).toBeNull(); expect(fresh.events).toEqual([]);
  });
});

import { playerDecision } from '../helpers/battlePolicy';
it.each([1,2,42])('plays and replays legal authored battle seed %i using basic attacks and signatures', seed=>{
  const s=make(seed);
  for(let i=0;i<300 && !['ended','error'].includes(s.phase);i++){
    if(s.phase==='enemy'){const step=s.nextEnemy();if(step)s.finishPresentation(step.token);}
    else if(s.phase==='player'){const command=playerDecision(s.state);expect(s.prepare(command).ok).toBe(true);const step=s.confirm()!;s.finishPresentation(step.token);}
  }
  expect(s.phase).toBe('ended');
  expect(s.state.outcome).toBe(seed===1?'playerLoss':'playerWin');
  if(seed===2) expect(s.replay!.commands.filter(c=>c.type==='useAbility').map(c=>c.abilityId)).toEqual(expect.arrayContaining(['ability:guarded_strike','ability:high_shot','ability:magic_missile']));
  const replay=replayBattle(s.replay,catalog);expect(replay.ok).toBe(true);
  if(replay.ok){expect(replay.state).toEqual(s.state);expect(replay.events).toEqual(s.events);}
});
it('failed player resolution keeps accepted record intact and can be cancelled',()=>{
  const s=make();finishEnemies(s);
  expect(s.prepare({type:'endTurn',unitId:s.active.id}).ok).toBe(true);
  const before=s.state;
  const intent=s.pending!;
  expect(()=>{(intent as {unitId:number}).unitId=999;}).toThrow();
  s.cancel();expect(s.confirm()).toBeNull();expect(s.state).toEqual(before);
});

import { vi } from 'vitest';
import * as turns from '../../src/domain/turns';
it('stops enemy execution on rejection and preserves its accepted prefix without retries',()=>{
  const s=make();const first=s.nextEnemy()!;s.finishPresentation(first.token);
  const before=s.state,record=s.replay,events=s.events;
  const dispatch=vi.spyOn(turns,'dispatch').mockReturnValue({ok:false,reason:'invalidState'});
  try {
    expect(s.nextEnemy()).toBeNull();expect(s.phase).toBe('error');expect(s.error).toBe('invalidState');
    expect(s.state).toEqual(before);expect(s.replay).toEqual(record);expect(s.events).toEqual(events);
    expect(s.nextEnemy()).toBeNull();expect(dispatch).toHaveBeenCalledTimes(1);
  } finally {dispatch.mockRestore();}
});
it('revalidates confirmation without recording a rejected intent or advancing RNG',()=>{
  const s=make();finishEnemies(s);s.prepare({type:'endTurn',unitId:s.active.id});
  const before=s.state,record=s.replay;
  const dispatch=vi.spyOn(turns,'dispatch').mockReturnValue({ok:false,reason:'commandLimit'});
  try {expect(s.confirm()).toBeNull();expect(s.error).toBe('commandLimit');expect(s.state).toEqual(before);expect(s.replay).toEqual(record);expect(s.phase).toBe('player');}
  finally {dispatch.mockRestore();}
});

describe('validated continuation',()=>{
  it('rejects malformed and incompatible snapshots without exposing a partial session',()=>{
    for(const input of [null,{}, {...make().state,seed:-1}, {...make().state,versions:{}}])
      expect(BattleSession.fromSnapshot(catalog,input)).toEqual({ok:false,reason:'invalidState'});
  });
  it('owns frozen state and starts with no historical presentation or fake replay',()=>{
    const input=structuredClone(make().state), restored=BattleSession.fromSnapshot(catalog,input);assert(restored.ok);
    const s=restored.session;
    expect(s.state).toEqual(input);expect(s.state).not.toBe(input);
    (input.units[0] as {hp:number}).hp=0;expect(s.state.units[0].hp).not.toBe(0);
    expect(()=>{(s.state.units[0] as {hp:number}).hp=0;}).toThrow();
    expect(s.phase).toBe('enemy');expect(s.pending).toBeNull();expect(s.events).toEqual([]);expect(s.replay).toBeNull();
    expect(s.continuation).toEqual({snapshot:s.state,commands:[],events:[]});
    s.finishPresentation(1);expect(s.phase).toBe('enemy');
  });
  it.each([1,2,3,4,5])('matches the actual uninterrupted queue at every accepted boundary for seed %i',seed=>{
    const original=make(seed);let checkedAttackWait=false;
    for(let i=0;original.phase!=='ended' && i<300;i++){
      const result=BattleSession.fromSnapshot(catalog,original.state);assert(result.ok);const resumed=result.session;
      if(seed===2 && original.state.commandCount===29)checkedAttackWait=true;
      for(const s of [original,resumed])if(s.phase==='player')expect(s.prepare(playerDecision(s.state)).ok).toBe(true);
      const a=original.phase==='player'?original.confirm():original.nextEnemy();
      const b=resumed.phase==='player'?resumed.confirm():resumed.nextEnemy();assert(a);assert(b);
      expect(b.after).toEqual(a.after);expect(b.events).toEqual(a.events);
      expect(resumed.continuation!.commands).toEqual([original.replay!.commands.at(-1)]);
      expect(resumed.continuation!.events).toEqual(a.events);
      expect(nextUint32(b.after.rng)).toEqual(nextUint32(a.after.rng));
      const mid=BattleSession.fromSnapshot(catalog,original.state);assert(mid.ok);
      expect(mid.session.state).toEqual(a.after);expect(mid.session.events).toEqual([]);
      expect(mid.session.phase).not.toBe('presenting');
      original.finishPresentation(a.token);
    }
    expect(original.phase).toBe('ended');if(seed===2)expect(checkedAttackWait).toBe(true);
  });
  it('preserves fixture outcomes, Guarded and the command limit without extra commands',()=>{
    for(const f of saveFixtures()){
      const result=BattleSession.fromSnapshot(f.catalog,f.state);assert(result.ok);const s=result.session;
      expect(s.state).toEqual(f.state);expect(s.events).toEqual([]);expect(s.pending).toBeNull();
      if(f.state.outcome!=='ongoing'){expect(s.phase).toBe('ended');expect(s.nextEnemy()).toBeNull();expect(s.confirm()).toBeNull();}
      if(f.name==='maximum-commands'){
        if(s.phase==='enemy')expect(s.nextEnemy()).toBeNull();
        else {expect(s.prepare({type:'endTurn',unitId:s.active.id}).ok).toBe(false);expect(s.confirm()).toBeNull();}
        expect(s.state).toEqual(f.state);expect(s.continuation!.commands).toEqual([]);
      }
    }
  },15000);
});

it('observes each accepted boundary before presentation exactly once and contains observer failure',()=>{
  const observed:unknown[]=[];
  const s=new BattleSession(catalog,'map:forest_ruins',1,state=>{expect(s.phase).toBe('presenting');observed.push(state);throw Error('observer failed');});
  const step=s.nextEnemy();assert(step);expect(observed).toEqual([step.after]);
  s.finishPresentation(step.token);s.finishPresentation(step.token);expect(observed).toHaveLength(1);
  finishEnemies(s);const count=observed.length;
  s.prepare({type:'move',unitId:s.active.id,to:{x:-1,y:-1}});s.cancel();s.confirm();expect(observed).toHaveLength(count);
  s.prepare({type:'endTurn',unitId:s.active.id});const player=s.confirm();assert(player);
  expect(observed).toHaveLength(count+1);expect(observed.at(-1)).toBe(s.state);
});
