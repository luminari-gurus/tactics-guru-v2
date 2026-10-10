import { describe, expect, it } from 'vitest';
import { BattleSession } from '../../src/app/BattleSession';
import { battleCatalog as catalog } from '../../src/content/catalog';
import { previewMovement } from '../../src/domain/grid';
import { replayBattle } from '../../src/domain/turns';

const make = (seed = 1) => new BattleSession(catalog, 'map:forest_ruins', seed);
const finishEnemies = (s: BattleSession) => {
  for (let i = 0; s.phase === 'enemy' && i < 30; i++) {
    const step = s.nextEnemy();
    if (step) s.finishPresentation(step.token);
  }
};
describe('battle session', () => {
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
    const n = s.replay.commands.length;
    const step = s.confirm()!;
    expect(s.phase).toBe('presenting');
    expect(s.confirm()).toBeNull(); expect(s.replay.commands).toHaveLength(n+1);
    s.finishPresentation(step.token+1); expect(s.phase).toBe('presenting');
    s.dispose(); s.finishPresentation(step.token); expect(s.phase).toBe('disposed');
    expect(s.nextEnemy()).toBeNull();
  });
  it('records a fresh initial boundary independently of previous sessions', () => {
    const old = make(); finishEnemies(old); old.dispose();
    const fresh = make(2);
    expect(fresh.state.seed).toBe(2); expect(fresh.replay.commands).toEqual([]);
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
  if(seed===2) expect(s.replay.commands.filter(c=>c.type==='useAbility').map(c=>c.abilityId)).toEqual(expect.arrayContaining(['ability:guarded_strike','ability:high_shot','ability:magic_missile']));
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
