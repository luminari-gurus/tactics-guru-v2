import { assert, describe, expect, it, vi } from 'vitest';
import { BattlePersistence } from '../../src/app/BattlePersistence';
import { BattleSession } from '../../src/app/BattleSession';
import { battleCatalog as catalog } from '../../src/content/catalog';
import { encodeBattleSave } from '../../src/domain/saveEnvelope';
import { BATTLE_STORAGE_KEYS as keys, createBattleStorage, type BattleStorageSlot } from '../../src/persistence/battleStorage';

const mapId='map:forest_ruins';
function encoded(seed=1) {const value=encodeBattleSave(new BattleSession(catalog,mapId,seed).state,catalog);assert(value.ok);return value.text;}
function setup(primary?:string,backup?:string) {
  const data=new Map<string,string>([['unrelated','keep'],['godot-save','legacy']]);
  if(primary!==undefined)data.set(keys.primary,primary);if(backup!==undefined)data.set(keys.backup,backup);
  const calls:string[]=[];let failAt=0;let kind='SecurityError';
  const op=(label:string)=>{calls.push(label);if(calls.length===failAt)throw Object.assign(Error('injected'),{name:kind});};
  const storage=createBattleStorage(catalog,()=>{
    op('acquire');return {
      getItem:key=>{op(`read:${key}`);return data.get(key)??null;},
      setItem:(key,text)=>{op(`write:${key}`);data.set(key,text);},
      removeItem:key=>{op(`remove:${key}`);data.delete(key);},
    };
  });
  const app=new BattlePersistence(catalog,mapId,storage);
  return {app,storage,data,calls,fail:(at:number,error='SecurityError')=>{calls.length=0;failAt=at;kind=error;}};
}

describe('startup and recovery',()=>{
  it('creates and saves only when both slots are known absent',()=>{
    const h=setup();const s=h.app.startup();assert(s);expect(s.state.seed).toBe(1);expect(s.state.commandCount).toBe(0);
    expect(h.storage.load()).toMatchObject({ok:true,selected:{slot:'primary',state:s.state}});
    const count=h.calls.length;expect(h.app.startup()).toBe(s);expect(h.calls).toHaveLength(count);
  });
  it.each(['SecurityError','QuotaExceededError','Error'])('initial save %s keeps a playable session after known absence',error=>{
    const h=setup();h.fail(7,error);const s=h.app.startup();assert(s);expect(h.app.status).toContain('unsaved');expect(h.app.hasUnsavedProgress).toBe(true);expect(s.nextEnemy()).not.toBeNull();
  });
  it.each([
    [encoded(2),encoded(1),'primary'],[encoded(2),'broken','primary'],[undefined,encoded(1),'backup'],['broken',encoded(1),'backup'],
  ] as const)('inspects without writes and continues the selected slot', (primary,backup,slot)=>{
    const h=setup(primary,backup),before=new Map(h.data);expect(h.app.startup()).toBeNull();
    const review=h.app.inspection!;expect(review).toMatchObject({ok:true,selected:{slot}});
    const s=h.app.continue(review);assert(s);expect(s.replay).toBeNull();expect(s.events).toEqual([]);
    expect(h.data).toEqual(before);expect(h.calls.some(c=>c.startsWith('write'))).toBe(false);
    if(primary==='broken' || backup==='broken') {expect(h.app.status).toContain('unsaved');expect(h.app.hasUnsavedProgress).toBe(true);h.app.save();expect(h.data).toEqual(before);expect(h.app.hasUnsavedProgress).toBe(true);}
    else {expect(h.app.hasUnsavedProgress).toBe(false);}
  });
  it.each([1,2,3])('does not silently start when startup read/acquisition %i fails',at=>{
    const h=setup();h.fail(at);expect(h.app.startup()).toBeNull();expect(h.app.session).toBeNull();expect(h.data.has(keys.primary)).toBe(false);
    h.fail(0);h.app.retry();expect(h.app.session).not.toBeNull();
  });
  it('offers a valid backup even when primary is unreadable, without overwriting primary',()=>{
    const h=setup('private',encoded());h.fail(2);expect(h.app.startup()).toBeNull();
    const review=h.app.inspection!;expect(review).toMatchObject({ok:true,selected:{slot:'backup'}});
    assert(h.app.continue(review));expect(h.app.status).toContain('unsaved');expect(h.data.get(keys.primary)).toBe('private');
  });
  it.each(['{bad','\ud800\u0000'+'x'.repeat(20000),JSON.stringify({kind:'future',format:9000})])('retains exact invalid text for export and explicit removal',raw=>{
    const h=setup(raw);expect(h.app.startup()).toBeNull();const review=h.app.inspection!;
    const exported=JSON.parse(JSON.stringify(h.app.recoveryTexts()));expect(exported).toEqual([{slot:'primary',text:raw}]);
    expect(h.app.remove('primary',review)).toBe(true);expect(h.data.has(keys.primary)).toBe(false);
    expect(h.data.get('unrelated')).toBe('keep');expect(h.data.get('godot-save')).toBe('legacy');
    h.app.retry();expect(h.app.session?.state.seed).toBe(1);
  });
  it('refuses removal under a stale choice and retains both exact copies',()=>{
    const h=setup('first');h.app.startup();const review=h.app.inspection!;h.data.set(keys.primary,'second');
    expect(h.app.remove('primary',review)).toBe(false);expect(h.data.get(keys.primary)).toBe('second');
    expect(h.app.recoveryTexts()).toEqual(expect.arrayContaining([{slot:'primary',text:'first'},{slot:'primary',text:'second'}]));
    expect(h.app.remove('primary',review)).toBe(false);
  });
});

describe('authoritative unsaved departure state',()=>{
  it('tracks durable save state independently of status text',()=>{
    const h=setup();const s=h.app.startup();assert(s);
    expect(h.app.hasUnsavedProgress).toBe(false);
    h.fail(1);h.app.save();
    expect(h.app.status).toContain('unsaved');
    expect(h.app.hasUnsavedProgress).toBe(true);
    h.app.inspect();
    expect(h.app.hasUnsavedProgress).toBe(true);
    h.fail(0);h.app.save();
    expect(h.app.hasUnsavedProgress).toBe(false);
    expect(h.app.remove('primary',h.app.inspect())).toBe(true);
    expect(h.app.hasUnsavedProgress).toBe(true);
  });
});

describe('accepted-boundary save binding',()=>{
  it('saves once per accepted player/enemy command, before presentation, and ignores old sessions',()=>{
    const h=setup();const s=h.app.startup()!;const save=vi.spyOn(h.storage,'save');
    while(s.phase==='enemy') {const step=s.nextEnemy();assert(step);expect(save).toHaveBeenLastCalledWith(step.after);s.finishPresentation(step.token);}
    const count=save.mock.calls.length;s.prepare({type:'endTurn',unitId:s.active.id});s.cancel();s.confirm();
    expect(save).toHaveBeenCalledTimes(count);
    s.prepare({type:'endTurn',unitId:s.active.id});const step=s.confirm();assert(step);expect(save).toHaveBeenCalledTimes(count+1);
    s.finishPresentation(step.token);s.finishPresentation(step.token);expect(save).toHaveBeenCalledTimes(count+1);
    const fresh=h.app.replace(h.app.inspect());assert(fresh);const after=save.mock.calls.length;
    s.finishPresentation(step.token);expect(s.nextEnemy()).toBeNull();expect(s.confirm()).toBeNull();expect(save).toHaveBeenCalledTimes(after);
  });
  it.each(['SecurityError','QuotaExceededError','Error'])('save and observer failures preserve accepted state: %s',kind=>{
    const h=setup();const s=h.app.startup()!;h.app.onChange=()=>{throw Error('view failed');};h.fail(1,kind);
    const step=s.nextEnemy();assert(step);expect(s.state).toBe(step.after);expect(s.phase).toBe('presenting');expect(h.app.status).toContain('unsaved');
    s.finishPresentation(step.token);expect(s.phase).not.toBe('error');
  });
});

describe('guarded replacement',()=>{
  // remove backup: acquire/read/remove; primary: acquire/read/remove; final: acquire/read/read.
  it.each(Array.from({length:9},(_,i)=>i+1))('keeps current battle/seed and copies when invalidation boundary %i fails',at=>{
    const primary=encoded(2),backup=encoded(1),h=setup(primary,backup);h.app.startup();const s=h.app.continue(h.app.inspection!)!;
    const review=h.app.inspect();h.fail(at);expect(h.app.replace(review)).toBeNull();expect(h.app.session).toBe(s);expect(s.state.seed).toBe(2);
    expect(s.phase).not.toBe('disposed');expect(h.app.status).toContain('Reset incomplete');
    expect(h.app.recoveryTexts()).toEqual(expect.arrayContaining([{slot:'primary',text:primary},{slot:'backup',text:backup}]));
    expect(h.data.get('unrelated')).toBe('keep');
    h.fail(0);const fresh=h.app.replace(h.app.inspect());assert(fresh);expect(fresh.state.seed).toBe(3);
  });
  it.each(Array.from({length:5},(_,i)=>i+10))('successful invalidation cannot resurrect old data when initial save boundary %i fails',at=>{
    const h=setup(encoded(2),encoded(1));h.app.startup();const review=h.app.inspection!;h.fail(at);
    const s=h.app.replace(review);assert(s);expect(s.state.seed).toBe(3);expect(h.app.status).toContain('unsaved');
    h.fail(0);const loaded=h.storage.load();assert(loaded.ok);
    for(const slot of ['primary','backup'] as const){const value=loaded.inspection[slot];expect(['valid','missing']).toContain(value.status);if(value.status==='valid')expect(value.state.seed).toBe(3);}
  });
  it.each(['backup','primary'] as BattleStorageSlot[])('refuses changed %s and retains the newly discovered data',slot=>{
    const h=setup(encoded(2),encoded(1));h.app.startup();const review=h.app.inspection!;h.data.set(keys[slot],'changed');
    expect(h.app.replace(review)).toBeNull();expect(h.data.get(keys[slot])).toBe('changed');expect(h.app.session).toBeNull();
    expect(h.app.replace(review)).toBeNull();
  });
  it('requires final absence even when a storage implementation silently leaves a slot',()=>{
    const h=setup(encoded(2),encoded(1));h.app.startup();vi.spyOn(h.storage,'removeSlot').mockReturnValue({ok:true});
    expect(h.app.replace(h.app.inspection!)).toBeNull();expect(h.app.session).toBeNull();
  });
  it('cancel is read-only and duplicate confirmation advances the resumed seed only once, including wrap',()=>{
    const h=setup(encoded(0xffffffff));h.app.startup();const s=h.app.continue(h.app.inspection!)!;
    const data=new Map(h.data),review=h.app.inspect();expect(h.app.session).toBe(s);expect(h.data).toEqual(data);
    const next=h.app.replace(review);assert(next);expect(next.state.seed).toBe(0);expect(next.replay).not.toBeNull();
    expect(h.app.replace(review)).toBeNull();expect(h.app.session).toBe(next);
  });
});
