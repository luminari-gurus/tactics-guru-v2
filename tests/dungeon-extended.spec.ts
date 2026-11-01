import { expect, test, type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { dungeonContent } from '../src/content/dungeon';
import { dungeonBattle, freshDungeon, type DungeonState } from '../src/domain/dungeon';
import { encodeDungeon } from '../src/domain/dungeonSaveEnvelope';
import { DUNGEON_KEYS } from '../src/persistence/dungeonStorage';
import { dispatch } from '../src/domain/turns';
import { walkDungeon, continueSavedDungeon } from './helpers/dungeonTraversal';
import { readSession, playCommand } from './helpers/battlePolicy';
import { fighterDecision, rangerDecision, mageDecision } from './helpers/playerPolicy';
import { journeyPreparation, rangerJourney, mageJourney, fighterJourney } from './helpers/dungeonFixtures';

async function snapshot(page:Page):Promise<DungeonState>{return JSON.parse((await page.locator('#game').getAttribute('data-dungeon-snapshot'))!);}
async function seed(page:Page,s:DungeonState){const encoded=encodeDungeon(s);if(!encoded.ok)throw Error(encoded.reason);await page.goto('dungeon');await page.evaluate(({key,text})=>{localStorage.setItem(key,text);}, {key:DUNGEON_KEYS.primary,text:encoded.text});await page.reload();await continueSavedDungeon(page);}

test('Mage legal progression journey earns level three uses Frost Snare and multiple missiles and resumes',async({page,isMobile})=>{
 test.setTimeout(600000);page.setDefaultTimeout(10000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const witness=mageJourney(12),used={snare:false,missiles:false};expect(witness.used).toEqual({snare:true,missiles:true});expect(witness.state.phase).toBe('defeat');
 await seed(page,freshDungeon('mage-production-journey',12));
 const records:unknown[]=[];let expired=false,blocked=false;
 for(const expected of witness.records) {
  const position=await snapshot(page);
  if(position.depth<expected.entry.depth){await walkDungeon(page,position.floors[position.depth-1].descriptor.downstairs,isMobile?'touch':'keyboard');expect((await snapshot(page)).depth).toBe(expected.entry.depth);}
  await walkDungeon(page,undefined,isMobile?'touch':'keyboard');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const entry=await snapshot(page);expect(entry.floors[entry.depth-1].exploration.active).toBe(expected.entry.floors[entry.depth-1].exploration.active);expect(entry.party).toEqual(expected.entry.party);expect(entry.activeBattle!.units.every(u=>u.movementBlock===undefined)).toBe(true);
  let steps=0;
  while((await snapshot(page)).phase==='battle'&&steps++<500) {
   await expect.poll(async()=>{const s=await snapshot(page);return s.phase!=='battle'||(await readSession(page)).phase==='player';}).toBe(true);
   const current=await snapshot(page);if(current.phase!=='battle')break;
   const before=await readSession(page),built=dungeonBattle(current)!,command=mageDecision(before.state,built.catalog,used.snare);
   await playCommand(page,command);
   await expect.poll(async()=>{const s=await snapshot(page);return s.phase!=='battle'||(await readSession(page)).state.commandCount>before.state.commandCount;}).toBe(true);
   await expect.poll(async()=>{const s=await snapshot(page);return s.phase!=='battle'||(await readSession(page)).phase==='player';}).toBe(true);
   if(command.type==='useAbility'&&command.abilityId==='ability:magic_missile') {
    const profile=built.catalog.abilities[command.abilityId];if(profile.kind==='magicMissile'&&profile.casterLevel>=3)used.missiles=true;
   }
   if(command.type==='useAbility'&&command.abilityId==='ability:frost_snare') {
    used.snare=true;const after=await readSession(page),targetId='unitId' in command.target?command.target.unitId:0;
    expect(current.party.find(h=>h.heroId==='mage')!.level).toBeGreaterThanOrEqual(3);
    expect(after.state.rng).toEqual(before.state.rng);expect(after.state.units.map(u=>u.hp)).toEqual(before.state.units.map(u=>u.hp));
    expect(after.state.units.find(u=>u.id===targetId)?.movementBlock).toEqual({sourceId:command.unitId,abilityId:command.abilityId});
    await page.locator('#battle-party').click();await page.locator(`#inspect-unit-${targetId}`).click();await expect(page.getByRole('dialog')).toContainText('Snared by Mage');
    await page.screenshot({path:test.info().outputPath('production-mage-snare-inspection.png')});await page.locator('#inspection-close').click();
    const saved=await snapshot(page);await page.reload();await continueSavedDungeon(page);
    await expect(page.locator('#game')).toHaveAttribute('data-phase','player');expect((await snapshot(page)).activeBattle).toEqual(saved.activeBattle);expect((await readSession(page)).events).toEqual([]);
   }
  }
  const record=JSON.parse((await page.locator('#game').getAttribute('data-dungeon-battle-record'))!);
  expect(record.state).toEqual(expected.state);let replayed=record.replay?.initial??record.continuation.snapshot;const events:unknown[]=[];
  for(const c of record.replay?.commands??record.continuation.commands){
   const target=replayed.units.find((u:import('../src/domain/types').UnitState)=>u.id===c.unitId);
   if(target?.movementBlock?.abilityId==='ability:frost_snare'){blocked=true;expect(c.type).not.toBe('move');}
   const r=dispatch(replayed,c,dungeonBattle(record.entry)!.catalog);if(!r.ok)throw Error(r.reason);replayed=r.state;events.push(...r.events);
   expired ||= r.events.some(e=>e.type==='movementBlockExpired'&&e.abilityId==='ability:frost_snare');
  }
  expect(replayed).toEqual(record.state);expect(events).toEqual(record.events);records.push(record);
  for(let i=0;i<20;i++) {
   const s=await snapshot(page),command=journeyPreparation(s);if(!command)break;
   if(command.type==='claimReward')await page.getByRole('button',{name:`Claim ${dungeonContent.items[command.itemId].label}`,exact:true}).click();
   else if(command.type==='useItem'){await page.getByRole('combobox',{name:'Healing Draught target',exact:true}).selectOption(command.heroId);await page.getByRole('button',{name:'Use Healing Draught',exact:true}).click();}
   else if(command.type==='equipItem'){const row=page.locator(`[data-instance-id="${command.instanceId}"]`);await row.locator('select').selectOption(command.heroId);const item=s.ownership.equipment.find(e=>e.instanceId===command.instanceId)!;await row.getByRole('button',{name:`Equip ${dungeonContent.items[item.itemId].label}`,exact:true}).click();}
   else throw Error('Unexpected preparation command');await page.locator('#dungeon-item-confirm').click();
  }
 }
 const final=await snapshot(page);writeFileSync(test.info().outputPath('mage-production-journey.json'),JSON.stringify({seed:12,records,final,used,blocked,expired}));
 expect(final.phase).toBe('defeat');expect(final.party).toEqual(witness.state.party);expect(used).toEqual({snare:true,missiles:true});expect(blocked&&expired).toBe(true);expect(errors).toEqual([]);
 await page.screenshot({path:test.info().outputPath('mage-terminal-journey.png'),fullPage:true});
});

test('Ranger legal progression journey earns level three uses Mark and Pin and resumes',async({page,isMobile})=>{
 test.setTimeout(600000);page.setDefaultTimeout(10000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const witness=rangerJourney(2),used={mark:false,pin:false};expect(witness.used).toEqual({mark:true,pin:true});expect(witness.state.phase).toBe('defeat');
 await seed(page,freshDungeon('ranger-production-journey',2));
 const records:unknown[]=[];let consumed=false;
 for(const expected of witness.records) {
  const position=await snapshot(page);
  if(position.depth<expected.entry.depth){await walkDungeon(page,position.floors[position.depth-1].descriptor.downstairs,isMobile?'touch':'keyboard');expect((await snapshot(page)).depth).toBe(expected.entry.depth);}
  await walkDungeon(page,undefined,isMobile?'touch':'keyboard');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const entry=await snapshot(page);expect(entry.floors[entry.depth-1].exploration.active).toBe(expected.entry.floors[entry.depth-1].exploration.active);expect(entry.party).toEqual(expected.entry.party);
  expect(entry.activeBattle!.units.every(u=>u.markedBy===undefined&&u.movementBlock===undefined)).toBe(true);
  let steps=0;
  while((await snapshot(page)).phase==='battle'&&steps++<500) {
   await expect.poll(async()=>{const s=await snapshot(page);return s.phase!=='battle'||(await readSession(page)).phase==='player';}).toBe(true);
   const current=await snapshot(page);if(current.phase!=='battle')break;
   const before=await readSession(page),built=dungeonBattle(current)!,command=rangerDecision(before.state,built.catalog,used);
   await playCommand(page,command);
   await expect.poll(async()=>{const s=await snapshot(page);return s.phase!=='battle'||(await readSession(page)).state.commandCount>before.state.commandCount;}).toBe(true);
   await expect.poll(async()=>{const s=await snapshot(page);return s.phase!=='battle'||(await readSession(page)).phase==='player';}).toBe(true);
   if((await snapshot(page)).phase==='battle')consumed ||= (await readSession(page)).events.some(e=>e.type==='markConsumed');
   if(command.type==='useAbility'&&(command.abilityId==='ability:mark_target'||command.abilityId==='ability:pinning_shot')) {
    const kind=command.abilityId==='ability:mark_target'?'mark':'pin';used[kind]=true;
    const after=await readSession(page),targetId='unitId' in command.target?command.target.unitId:0;
    expect(after.state.rng).toEqual(before.state.rng);expect(after.state.units.map(u=>u.hp)).toEqual(before.state.units.map(u=>u.hp));
    expect(current.party.find(h=>h.heroId==='ranger')!.level).toBeGreaterThanOrEqual(kind==='mark'?2:3);
    const affected=after.state.units.find(u=>u.id===targetId)!;
    if(kind==='mark')expect(affected.markedBy).toBe(command.unitId);
    else expect(affected.movementBlock).toEqual({sourceId:command.unitId,abilityId:'ability:pinning_shot'});
    await page.locator('#battle-party').click();await page.locator(`#inspect-unit-${targetId}`).click();
    await expect(page.getByRole('dialog')).toContainText(kind==='mark'?'Marked by Ranger':'Pinned by Ranger');
    await page.screenshot({path:test.info().outputPath(`production-ranger-${kind}-inspection.png`)});await page.locator('#inspection-close').click();
    const saved=await snapshot(page);await page.reload();await continueSavedDungeon(page);
    await expect(page.locator('#game')).toHaveAttribute('data-phase','player');expect((await snapshot(page)).activeBattle).toEqual(saved.activeBattle);expect((await readSession(page)).events).toEqual([]);
   }
  }
  const record=JSON.parse((await page.locator('#game').getAttribute('data-dungeon-battle-record'))!);
  expect(record.state).toEqual(expected.state);let replayed=record.replay?.initial??record.continuation.snapshot;const events:unknown[]=[];
  for(const c of record.replay?.commands??record.continuation.commands){const r=dispatch(replayed,c,dungeonBattle(record.entry)!.catalog);if(!r.ok)throw Error(r.reason);replayed=r.state;events.push(...r.events);}
  expect(replayed).toEqual(record.state);expect(events).toEqual(record.events);records.push(record);
  for(let i=0;i<20;i++) {
   const s=await snapshot(page),command=journeyPreparation(s);if(!command)break;
   if(command.type==='claimReward')await page.getByRole('button',{name:`Claim ${dungeonContent.items[command.itemId].label}`,exact:true}).click();
   else if(command.type==='useItem'){await page.getByRole('combobox',{name:'Healing Draught target',exact:true}).selectOption(command.heroId);await page.getByRole('button',{name:'Use Healing Draught',exact:true}).click();}
   else if(command.type==='equipItem'){const row=page.locator(`[data-instance-id="${command.instanceId}"]`);await row.locator('select').selectOption(command.heroId);const item=s.ownership.equipment.find(e=>e.instanceId===command.instanceId)!;await row.getByRole('button',{name:`Equip ${dungeonContent.items[item.itemId].label}`,exact:true}).click();}
   else throw Error('Unexpected preparation command');await page.locator('#dungeon-item-confirm').click();
  }
 }
 const final=await snapshot(page);writeFileSync(test.info().outputPath('ranger-production-journey.json'),JSON.stringify({seed:2,records,final,used,consumed}));
 expect(final.phase).toBe('defeat');expect(final.party).toEqual(witness.state.party);expect(used).toEqual({mark:true,pin:true});expect(consumed).toBe(true);expect(errors).toEqual([]);
 await page.screenshot({path:test.info().outputPath('ranger-terminal-journey.png'),fullPage:true});
});

test('Fighter legal progression journey earns level three uses both abilities and resumes',async({page,isMobile})=>{
 test.setTimeout(600000);page.setDefaultTimeout(10000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const witness=fighterJourney(28);expect(witness.healed&&witness.taunted).toBe(true);
 // Canonical unplayed level-1 seed, with no fabricated progression, inventory or combat boundary.
 await seed(page,freshDungeon('fighter-production-journey',28));
 const records:unknown[]=[];let healed=false,taunted=false;
 for(let depth=1;depth<=witness.state.depth;depth++) {
  for(let slot=0;slot<3;slot++) {
   await walkDungeon(page,undefined,isMobile?'touch':'keyboard');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
   const entry=await snapshot(page);expect(entry.depth).toBe(depth);expect(entry.floors[depth-1].completed).toBe(slot);
   expect(entry.activeBattle!.units.every(u=>!u.secondWindUsed && u.tauntedBy===undefined)).toBe(true);
   let steps=0;
   while((await snapshot(page)).phase==='battle' && steps++<500) {
    await expect.poll(async()=>{const s=await snapshot(page);return s.phase!=='battle'||(await readSession(page)).phase==='player';}).toBe(true);
    const s=await snapshot(page);if(s.phase!=='battle')break;
    const before=await readSession(page),built=dungeonBattle(s)!;
    const command=fighterDecision(before.state,built.catalog,taunted);
    await playCommand(page,command);
    await expect.poll(async()=>{const current=await snapshot(page);return current.phase!=='battle'||(await readSession(page)).state.commandCount>before.state.commandCount;}).toBe(true);
    await expect.poll(async()=>{const current=await snapshot(page);return current.phase!=='battle'||(await readSession(page)).phase==='player';}).toBe(true);
    if(command.type==='useAbility' && (command.abilityId==='ability:second_wind'&&!healed || command.abilityId==='ability:taunt'&&!taunted)) {
     const after=await readSession(page);expect(after.state.rng).toEqual(before.state.rng);
     const fighter=after.state.units.find(u=>u.defId==='fighter')!;
     expect(s.party.find(h=>h.heroId==='fighter')!.level).toBeGreaterThanOrEqual(command.abilityId==='ability:taunt'?3:2);
     if(command.abilityId==='ability:second_wind'){healed=true;expect(fighter.secondWindUsed).toBe(true);expect(fighter.hp).toBeGreaterThan(before.state.units.find(u=>u.id===fighter.id)!.hp);}
     else {taunted=true;expect(after.state.units.some(u=>u.tauntedBy===fighter.id)).toBe(true);}
     await page.locator('#battle-log-open').click();await expect(page.getByRole('dialog')).toContainText(command.abilityId==='ability:second_wind'?'heals':'taunted by');
     await page.screenshot({path:test.info().outputPath(command.abilityId==='ability:second_wind'?'production-heal-log.png':'production-taunt-log.png')});await page.locator('#log-close').click();
     const saved=await snapshot(page);await page.reload();await continueSavedDungeon(page);
     await expect(page.locator('#game')).toHaveAttribute('data-phase','player');expect((await snapshot(page)).activeBattle).toEqual(saved.activeBattle);expect((await readSession(page)).events).toEqual([]);
     await page.locator('#battle-party').click();await expect(page.getByRole('dialog')).toContainText('Second Wind');await page.screenshot({path:test.info().outputPath(command.abilityId==='ability:second_wind'?'production-heal-resumed.png':'production-taunt-resumed.png')});await page.locator('#inspection-close').click();
    }
   }
   await expect(page.locator('#dungeon-screen')).toBeVisible();const completed=await snapshot(page);
   // The movement-aware witness ends at a terminal defeat after both unlocks.
   if(completed.phase==='defeat'){expect(depth).toBe(witness.state.depth);expect(healed&&taunted).toBe(true);}
   else expect(completed.floors[depth-1].completed).toBe(slot+1);
   const record=JSON.parse((await page.locator('#game').getAttribute('data-dungeon-battle-record'))!);
   let replayed=record.replay?.initial??record.continuation.snapshot;const events:unknown[]=[];
   for(const c of record.replay?.commands??record.continuation.commands){const r=dispatch(replayed,c,dungeonBattle(record.entry)!.catalog);if(!r.ok)throw Error(r.reason);replayed=r.state;events.push(...r.events);}
   expect(replayed).toEqual(record.state);expect(events).toEqual(record.events);records.push(record);
   if(completed.phase==='defeat')break;
   for(let i=0;i<20;i++) {
    const s=await snapshot(page),command=journeyPreparation(s);if(!command)break;
    if(command.type==='claimReward')await page.getByRole('button',{name:`Claim ${dungeonContent.items[command.itemId].label}`,exact:true}).click();
    else if(command.type==='useItem'){await page.getByRole('combobox',{name:'Healing Draught target',exact:true}).selectOption(command.heroId);await page.getByRole('button',{name:'Use Healing Draught',exact:true}).click();}
    else if(command.type==='equipItem'){const row=page.locator(`[data-instance-id="${command.instanceId}"]`);await row.locator('select').selectOption(command.heroId);const item=s.ownership.equipment.find(e=>e.instanceId===command.instanceId)!;await row.getByRole('button',{name:`Equip ${dungeonContent.items[item.itemId].label}`,exact:true}).click();}
    else throw Error('Unexpected preparation command');
    await page.locator('#dungeon-item-confirm').click();
   }
  }
  if(depth<witness.state.depth){const s=await snapshot(page);await walkDungeon(page,s.floors[depth-1].descriptor.downstairs,isMobile?'touch':'keyboard');expect((await snapshot(page)).depth).toBe(depth+1);}
 }
 const final=await snapshot(page);expect(final.floors.map(f=>f.completed)).toEqual([3,2]);expect(final.phase).toBe('defeat');expect(final.party.find(h=>h.heroId==='fighter')!.level).toBeGreaterThanOrEqual(3);expect(healed).toBe(true);expect(taunted).toBe(true);expect(errors).toEqual([]);
 expect(final.party).toEqual(witness.state.party);
 writeFileSync(test.info().outputPath('fighter-production-journey.json'),JSON.stringify({seed:28,records,final,healed,taunted}));await page.screenshot({path:test.info().outputPath('fighter-terminal-journey.png'),fullPage:true});
});

