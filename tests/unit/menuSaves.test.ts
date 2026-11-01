import { describe, expect, it, vi } from 'vitest';
import { inspectMenuSaves } from '../../src/app/menuSaves';
import { BATTLE_STORAGE_KEYS } from '../../src/persistence/battleStorage';
import { RUN_STORAGE_KEYS } from '../../src/persistence/runStorage';
import { DUNGEON_KEYS } from '../../src/persistence/dungeonStorage';
import { menuFixture } from '../helpers/menuFixtures';
const families = [ ['dungeon',DUNGEON_KEYS,'dungeon.json'], ['run',RUN_STORAGE_KEYS,'run.json'], ['battle',BATTLE_STORAGE_KEYS,'battle.json'] ] as const;
describe('read-only menu save discovery',()=>{
 for(const [mode,keys,file] of families)for(const slot of ['primary','backup'] as const) {
  it(`validates ${mode} ${slot} without RNG or writes`,()=>{
   const text=menuFixture(mode);
   const data=new Map([[keys[slot],text],['legacy','untouched']]);
   const setItem=vi.fn(),removeItem=vi.fn(), random=vi.spyOn(Math,'random').mockImplementation(()=>{throw Error('RNG');});
   try {
    const result=inspectMenuSaves(()=>({getItem:key=>data.get(key)??null,setItem,removeItem}));
    expect(result.find(s=>s.mode===mode)).toMatchObject({resumable:true,fromBackup:slot==='backup'});
    expect(setItem).not.toHaveBeenCalled();expect(removeItem).not.toHaveBeenCalled();expect(data.get('legacy')).toBe('untouched');
   }finally{random.mockRestore();}
  });
 }
 it('retains invalid and unavailable slots separately from eligibility',()=>{
  const saves=inspectMenuSaves(()=>({getItem:key=>key===BATTLE_STORAGE_KEYS.backup?menuFixture('battle'):'broken',setItem:vi.fn(),removeItem:vi.fn()}));
  expect(saves.find(s=>s.mode==='battle')).toMatchObject({resumable:true,needsRecovery:true,fromBackup:true});
  expect(saves.find(s=>s.mode==='run')).toMatchObject({resumable:false,needsRecovery:true});
  expect(inspectMenuSaves(()=>{throw Error('denied');}).every(s=>s.needsRecovery&&!s.resumable)).toBe(true);
  expect(inspectMenuSaves(()=>null).every(s=>s.primary==='unavailable')).toBe(true);
 });
 it('empty storage never creates placeholder saves',()=>{
  const setItem=vi.fn(),removeItem=vi.fn();
  expect(inspectMenuSaves(()=>({getItem:()=>null,setItem,removeItem})).every(s=>!s.resumable&&!s.needsRecovery)).toBe(true);
  expect(setItem).not.toHaveBeenCalled();expect(removeItem).not.toHaveBeenCalled();
 });
});

it('all primary/backup slot combinations preserve eligibility and warnings',()=>{
 const states=['missing','valid','invalid','unavailable'] as const;
 for(const [mode,keys] of families)for(const primary of states)for(const backup of states){
  const text=menuFixture(mode);
  const status=(key:string)=>key===keys.primary?primary:key===keys.backup?backup:'missing';
  const result=inspectMenuSaves(()=>({getItem(key){const value=status(key);if(value==='unavailable')throw Error('denied');return value==='missing'?null:value==='valid'?text:'invalid';},setItem(){throw Error('write');},removeItem(){throw Error('remove');}})).find(s=>s.mode===mode)!;
  expect(result).toMatchObject({primary,backup,resumable:primary==='valid'||backup==='valid',fromBackup:primary!=='valid'&&backup==='valid',needsRecovery:[primary,backup].some(s=>s==='invalid'||s==='unavailable')});
 }
});
