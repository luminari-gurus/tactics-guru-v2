import { dungeonContent } from '../src/content/dungeon';
import { walkDungeon, reenterDungeonStair } from './helpers/dungeonTraversal';
import { atStairApproach } from './helpers/dungeonFixtures';
import { expect,test,type Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { dungeonCapacityFixture, dungeonVictoryBoundary } from './helpers/dungeonFixtures';
import { dungeonBattle, acceptDungeonBattle, freshDungeon, type DungeonState } from '../src/domain/dungeon';
import { encodeDungeon } from '../src/domain/dungeonSaveEnvelope';
import { DUNGEON_KEYS } from '../src/persistence/dungeonStorage';
import { readSession,playCommand,playUndo } from './helpers/battlePolicy';
import { playerDecision } from './helpers/playerPolicy';
import { journeyPreparation, healedFighterBoundary, shamanJourney } from './helpers/dungeonFixtures';
import { dispatch } from '../src/domain/turns';
import type { Command, BattleEvent } from '../src/domain/types';
async function snapshot(page:Page):Promise<DungeonState>{return JSON.parse((await page.locator('#game').getAttribute('data-dungeon-snapshot'))!);}

test('Shaman production journey uses Hex and ally healing, reloads Weakened and replays a complete legal battle',async({page,isMobile},info)=>{
 test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const witness=shamanJourney(31),catalog=dungeonBattle(witness.entry)!.catalog;
 // This is the canonical unplayed save: level 1, full HP, no fabricated inventory or combat boundary.
 await seed(page,freshDungeon('shaman-production-journey',31));
 await walkDungeon(page,undefined,isMobile?'touch':'keyboard');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const first=await readSession(page);expect(first.state.units.find(u=>u.id===6)?.defId).toBe('goblin_shaman');
 const board=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
 const shaman=board.units.find((u:any)=>u.unitId==='goblin_shaman');
 expect(shaman).toMatchObject({assetId:'asset:goblin_shaman_sprite'});expect(shaman.anchorError).toBeLessThan(0.001);
 await page.screenshot({path:info.outputPath('shaman-production-board.png')});
 await page.locator('#battle-party').click();await page.locator('#inspect-unit-6').click();
 await expect(page.getByRole('dialog')).toContainText('Weakening Hex range 2–4');
 await expect(page.getByRole('dialog')).toContainText('Heal Goblin range 1–4');
 await expect(page.getByRole('dialog')).toContainText('Fighter #1 50%');
 await expect(page.getByRole('dialog')).toContainText('Ranger #2 45%');
 await expect(page.getByRole('dialog')).toContainText('Mage #3 55%');
 await page.screenshot({path:info.outputPath('shaman-abilities-inspection.png')});await page.locator('#inspection-close').click();
 let reloaded=false;let prefixCommands:readonly Command[]=[],prefixEvents:readonly BattleEvent[]=[];
 for(let step=0;(await snapshot(page)).phase==='battle'&&step<500;step++) {
  await expect.poll(async()=>{const s=await snapshot(page);return s.phase!=='battle'||(await readSession(page)).phase==='player';}).toBe(true);
  if((await snapshot(page)).phase!=='battle')break;
  const before=await readSession(page),weak=before.state.units.find(u=>u.weakenedBy!==undefined);
  if(weak&&!reloaded) {
   const saved=await snapshot(page);
   await page.locator('#battle-log-open').click();await expect(page.getByRole('dialog')).toContainText('Will save fails');
   await expect(page.getByRole('dialog')).toContainText('45% save chance');
   await page.screenshot({path:info.outputPath('shaman-will-save-log.png')});await page.locator('#log-close').click();
   await page.locator('#battle-party').click();await page.locator(`#inspect-unit-${weak.id}`).click();
   await expect(page.getByRole('dialog')).toContainText('Weakened by Goblin Shaman #6');
   await expect(page.getByRole('dialog')).toContainText('−2 accuracy');
   await page.screenshot({path:info.outputPath('shaman-weakened-inspection.png')});await page.locator('#inspection-close').click();
   const commands=before.replay?.commands??before.continuation!.commands;
   if(commands.some(c=>c.type==='undoMove'))throw Error('Unexpected undo in Shaman witness');
   prefixCommands=commands as readonly Command[];prefixEvents=before.events;
   expect(prefixEvents.some(e=>e.type==='saveRolled'&&!e.saved)).toBe(true);
   await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
   await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
   expect((await snapshot(page)).activeBattle).toEqual(saved.activeBattle);
   expect((await readSession(page)).events).toEqual([]);reloaded=true;continue;
  }
  await playCommand(page,playerDecision(before.state,catalog));
  await expect.poll(async()=>{const s=await snapshot(page);return s.phase!=='battle'||(await readSession(page)).state.commandCount>before.state.commandCount;}).toBe(true);
 }
 expect(reloaded).toBe(true);
 const record=JSON.parse((await page.locator('#game').getAttribute('data-dungeon-battle-record'))!);
 const commands=[...prefixCommands,...(record.replay?.commands??record.continuation.commands)],events=[...prefixEvents,...record.events];
 // The HUD submits one automatic missile as unitId; the pure policy uses its equivalent one-entry array.
 const expectedCommands=witness.commands.map(c=>c.type==='useAbility'&&c.abilityId==='ability:magic_missile'&&'missileTargets' in c.target&&c.target.missileTargets.length===1
  ?{...c,target:{unitId:c.target.missileTargets[0]}}:c);
 expect(commands).toEqual(expectedCommands);expect(record.state).toEqual(witness.state);
 expect(events.filter(e=>e.type==='healed')).toHaveLength(2);expect(events.some(e=>e.type==='weakenedExpired')).toBe(true);
 let replayed=witness.entry.activeBattle!;const replayEvents:BattleEvent[]=[];
 for(const command of commands){const r=dispatch(replayed,command,catalog);if(!r.ok)throw Error(r.reason);replayed=r.state;replayEvents.push(...r.events);}
 expect({state:replayed,events:replayEvents}).toEqual({state:record.state,events});
 expect(record.state.outcome).toBe('playerWin');expect((await snapshot(page)).party.every(h=>!Object.hasOwn(h,'weakenedBy'))).toBe(true);
 expect(errors).toEqual([]);
 writeFileSync(info.outputPath('shaman-production-journey.json'),JSON.stringify({seed:31,entry:witness.entry,commands,events,state:record.state,reloaded,final:await snapshot(page)},null,2));
 await page.screenshot({path:info.outputPath('shaman-terminal.png'),fullPage:true});
});

test('automatic stairs preserve healed Fighter carry and fresh battle resources',async({page,isMobile})=>{
 test.setTimeout(90000);
 // Generate the legal boundary under current rules; the historical #163 receipt remains immutable.
 const record=healedFighterBoundary();expect(record.state.units.find(u=>u.defId==='fighter')!.secondWindUsed).toBe(true);
 const completed=acceptDungeonBattle(record.entry,record.state);if(!completed.ok)throw Error(completed.reason);
 const approach=atStairApproach(completed.state),party=approach.party,ownership=approach.ownership;
 expect(party.find(h=>h.heroId==='fighter')!.hp).toBeGreaterThan(0);expect(party.find(h=>h.heroId==='fighter')!.learned).toContain('ability:second_wind');
 await seed(page,approach);await walkDungeon(page,approach.floors[0].descriptor.downstairs,isMobile?'touch':'keyboard');
 const arrived=await snapshot(page);expect(arrived.depth).toBe(2);expect(arrived.revision).toBe(approach.revision+1);expect(arrived.party).toEqual(party);expect(arrived.ownership).toEqual(ownership);
 expect(arrived.party.every(h=>!Object.hasOwn(h,'secondWindUsed')&&!Object.hasOwn(h,'tauntedBy'))).toBe(true);
 await page.screenshot({path:test.info().outputPath('healed-party-automatic-arrival.png'),fullPage:true});
 await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();expect(await snapshot(page)).toEqual(arrived);
 await walkDungeon(page,undefined,isMobile?'touch':'keyboard');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const entry=await snapshot(page),built=dungeonBattle(entry)!;expect(built.state.units.find(u=>u.defId==='fighter')!.hp).toBe(party.find(h=>h.heroId==='fighter')!.hp);
 expect((await readSession(page)).state.units.every(u=>!u.secondWindUsed&&u.tauntedBy===undefined)).toBe(true);
 await page.locator('#battle-party').click();await page.locator('#inspect-unit-1').click();await expect(page.getByRole('dialog')).toContainText('Second Wind 1/1');
 await page.screenshot({path:test.info().outputPath('fresh-resource-after-automatic-stairs.png')});
});
async function seed(page:Page,s:DungeonState){const encoded=encodeDungeon(s);if(!encoded.ok)throw Error(encoded.reason);await page.goto('dungeon');await page.evaluate(({key,text})=>{localStorage.setItem(key,text);}, {key:DUNGEON_KEYS.primary,text:encoded.text});await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();}
function fixture(slot:number){for(let seed=1;seed<=50;seed++){const f=dungeonVictoryBoundary(seed,slot);if(f)return f;}throw Error('No legal fixture');}
test('dungeon battle undo survives reload and a legal defeat journey',async({page,isMobile})=>{
 test.setTimeout(300000);await page.goto('dungeon');
 await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await page.locator('#dungeon-confirm-new').click();
 await walkDungeon(page,undefined,isMobile?'touch':'keyboard');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const entry=await snapshot(page);const restored=await playUndo(page,dungeonBattle(entry)!.catalog,isMobile);
 await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');expect((await readSession(page)).state).toEqual(restored);
 await expect(page.locator('#battle-undo')).toBeDisabled();
 for(let i=0;i<100;i++){
  if((await snapshot(page)).phase!=='battle')break;
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  if(isMobile)await page.locator('#battle-next').tap();else await page.locator('#battle-next').click();
  await expect.poll(async()=>{const state=await snapshot(page);return state.phase!=='battle'||(await readSession(page)).phase==='player';}).toBe(true);
 }
 await expect(page.getByRole('heading',{name:/Dungeon defeat/})).toBeVisible();
 await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
 await expect(page.getByRole('heading',{name:/Dungeon defeat/})).toBeVisible();
 await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await page.locator('#dungeon-confirm-new').click();
 await expect(page.getByRole('heading',{name:/Dungeon · Floor 1/})).toBeVisible();
});
test('read-only entry, keyboard new dungeon, real action and active resume',async({page,isMobile})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('dungeon');
 await expect(page.getByRole('button',{name:'Continue saved dungeon',exact:true})).toBeDisabled();
 expect(await page.evaluate(()=>localStorage.length)).toBe(0);
 await page.getByRole('button',{name:'Start new dungeon',exact:true}).focus();await page.keyboard.press('Enter');await page.locator('#dungeon-confirm-new').click();
 await expect(page.locator('#dungeon-descend')).toHaveCount(0);await expect(page.locator('#dungeon-ascend')).toHaveCount(0);
 const frame=await page.locator('#dungeon-screen').boundingBox();expect(frame!.y).toBe(0);expect(frame!.height).toBe(page.viewportSize()!.height);
 expect(await page.locator('#dungeon-screen').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
 await page.screenshot({path:test.info().outputPath('floor-entry.png'),fullPage:true});
 await walkDungeon(page);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 await page.locator('#battle-party').focus();
 if(isMobile)await page.locator('#fit-restart').tap();else await page.locator('#fit-restart').click();
 await page.locator('#dungeon-cancel-new').click();await expect(page.locator('#fit-restart')).toBeFocused();
 const before=await snapshot(page),cmd=playerDecision((await readSession(page)).state,dungeonBattle(before)!.catalog);
 await playCommand(page,cmd);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const saved=await snapshot(page);await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');expect((await readSession(page)).state).toEqual(saved.activeBattle);expect((await readSession(page)).events).toEqual([]);
 await page.screenshot({path:test.info().outputPath('battle-resumed.png')});expect(errors).toEqual([]);
});
test('legal reward and guardian boundaries, travel reload, backtracking and isolated saves',async({page})=>{
 test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const slot of [0,1,2]){
  const f=fixture(slot);writeFileSync(test.info().outputPath(`legal-boundary-${slot}.json`),JSON.stringify(f));
  await seed(page,f.snapshot);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  await playCommand(page,f.command);await expect(page.locator('#dungeon-screen')).toBeVisible();
  const s=await snapshot(page),result=dispatch(f.snapshot.activeBattle!,f.command,dungeonBattle(f.snapshot)!.catalog);expect(result.ok).toBe(true);
  if(result.ok){const expected=acceptDungeonBattle(f.snapshot,result.state);expect(expected.ok).toBe(true);if(expected.ok)expect(s).toEqual(expected.state);}
  if(slot<2){
   await expect(page.locator('#dungeon-descend')).toHaveCount(0);await expect(page.getByRole('heading',{name:'Choose one reward'})).toBeVisible();
   await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();expect(await snapshot(page)).toEqual(s);
   await page.getByRole('button',{name:/^Claim /}).first().click();await page.locator('#dungeon-item-cancel').click();expect(await snapshot(page)).toEqual(s);
   await page.getByRole('button',{name:/^Claim /}).first().click();await page.locator('#dungeon-item-confirm').click();expect((await snapshot(page)).phase).toBe('ready');
  }else{
   await page.evaluate(()=>localStorage.setItem('tactics-guru:phaser:run:primary:v1','preserved-short-run'));
   await walkDungeon(page,s.floors[s.depth-1].descriptor.downstairs);expect((await snapshot(page)).depth).toBe(2);const second=await snapshot(page);
   await page.screenshot({path:test.info().outputPath('automatic-descent.png'),fullPage:true});
   await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();expect(await snapshot(page)).toEqual(second);
   await reenterDungeonStair(page,'ascend');const returned=await snapshot(page);expect(returned.depth).toBe(1);expect(returned.floors[0].completed).toBe(3);expect(returned.ownership).toEqual(second.ownership);expect(returned.floors[0].position).toBe(returned.floors[0].descriptor.downstairs);
   await expect(page.locator('#dungeon-start-encounter')).toHaveCount(0);await reenterDungeonStair(page,'descend');const revisited=await snapshot(page);expect(revisited.floors.map(f=>f.descriptor)).toEqual(second.floors.map(f=>f.descriptor));expect(revisited.floors.map(f=>f.completed)).toEqual(second.floors.map(f=>f.completed));
   expect((await snapshot(page)).depth).toBe(2);expect((await snapshot(page)).party).toEqual(second.party);expect((await snapshot(page)).ownership).toEqual(second.ownership);
   expect(await page.evaluate(()=>localStorage.getItem('tactics-guru:phaser:run:primary:v1'))).toBe('preserved-short-run');
   await page.screenshot({path:test.info().outputPath('floor-two-revisited.png'),fullPage:true});
  }
 }
 expect(errors).toEqual([]);
});
test('corrupt bytes stay exportable and uncertain travel requires explicit recovery',async({page})=>{
 test.setTimeout(90000);const f=fixture(2),result=dispatch(f.snapshot.activeBattle!,f.command,dungeonBattle(f.snapshot)!.catalog);if(!result.ok)throw Error('fixture failed');
 const cleared=acceptDungeonBattle(f.snapshot,result.state);if(!cleared.ok)throw Error(cleared.reason);
 const approach=atStairApproach(cleared.state);await seed(page,approach);await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){original.call(this,k,v);if(k==='tactics-guru:phaser:dungeon:primary:v1')throw Error('uncertain primary write');};});
 await page.locator(`#dungeon-map [data-cell="${approach.floors[0].descriptor.downstairs}"]`).click();expect(await snapshot(page)).toEqual(approach);await expect(page.locator('.dungeon-status')).toContainText('Travel not published');
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();await page.locator('#dungeon-continue-primary').click();expect((await snapshot(page)).depth).toBe(2);
 await page.evaluate(key=>localStorage.setItem(key,'broken save bytes'),DUNGEON_KEYS.primary).catch(()=>{});await page.reload();
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export primary save',exact:true}).click();await downloadPromise;
 expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary)).toBe('broken save bytes');
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();await page.locator('#dungeon-remove-primary').click();await page.locator('#dungeon-remove-cancel').click();
 expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary)).toBe('broken save bytes');
});

test('confirmed charm discard frees full capacity without cancelling or duplicating the pending reward',async({page,isMobile})=>{
 const initial=dungeonCapacityFixture();await seed(page,initial);
 const target=initial.ownership.equipment[0].instanceId;
 const discard=()=>page.locator(`[data-instance-id="${target}"]`).getByRole('button',{name:'Discard Warding Charm',exact:true});
 const saved=await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary);
 for(const cancellation of ['Cancel','Escape']){
  if(isMobile)await discard().tap();else await discard().click();
  await expect(page.getByRole('dialog')).toContainText('unequip it from fighter');await expect(page.locator('#dungeon-discard-cancel')).toBeFocused();
  if(cancellation==='Cancel'){await page.screenshot({path:test.info().outputPath('discard-confirmation.png')});await page.locator('#dungeon-discard-cancel').click();}else await page.keyboard.press('Escape');
  expect(await snapshot(page)).toEqual(initial);expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary)).toBe(saved);
 }
 await discard().click();await page.locator('#dungeon-discard-confirm').click();
 const disposed=await snapshot(page);expect(disposed.ownership.equipment).toHaveLength(5);expect(disposed.ownership.assignments).toEqual([]);expect(disposed.offer).toEqual(initial.offer);expect(disposed.party).toEqual(initial.party);expect(disposed.phase).toBe('reward');
 await expect(page.locator('#dungeon-descend')).toHaveCount(0);
 await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();expect(await snapshot(page)).toEqual(disposed);
 await page.getByRole('button',{name:/^Claim /}).first().click();await page.locator('#dungeon-item-confirm').click();
 const claimed=await snapshot(page);expect(claimed.ownership.equipment).toHaveLength(6);expect(claimed.ownership.equipment.some(e=>e.instanceId===target)).toBe(false);expect(claimed.phase).toBe('ready');expect(claimed.offer).toBeNull();
 await page.screenshot({path:test.info().outputPath('discard-capacity-recovered.png'),fullPage:true});
 await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();expect(await snapshot(page)).toEqual(claimed);
 await page.getByRole('button',{name:/^Discard /}).first().click();await page.locator('#dungeon-discard-confirm').click();
 const prepared=await snapshot(page);expect(prepared.phase).toBe('ready');expect(prepared.ownership.equipment).toHaveLength(5);
 await walkDungeon(page);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 await expect(page.getByRole('button',{name:/^Discard /})).toHaveCount(0);
});

test('hero progression commits once, heals at a threshold and survives inspection and reload',async({page})=>{
 test.setTimeout(90000);
 const f=fixture(1),built=dungeonBattle(f.snapshot)!;
 const resolved=dispatch(f.snapshot.activeBattle!,f.command,built.catalog);if(!resolved.ok)throw Error(resolved.reason);
 const completed=acceptDungeonBattle(f.snapshot,resolved.state);if(!completed.ok)throw Error(completed.reason);
 const leveled=completed.state.party.filter((h,i)=>h.level>f.snapshot.party[i].level);
 expect(leveled.length).toBeGreaterThan(0);for(const h of leveled)expect(h.hp).toBe(h.maxHp);
 await seed(page,f.snapshot);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 await page.locator('#battle-party').click();await expect(page.getByRole('dialog')).toContainText('Level 1');await page.locator('#inspection-close').click();
 await playCommand(page,f.command);
 await expect(page.locator('#dungeon-screen')).toBeVisible();
 expect((await snapshot(page)).party).toEqual(completed.state.party);
 await expect(page.locator('section[aria-label="Party"]')).toContainText('Level 2');
 await expect(page.locator('section[aria-label="Party"]')).toContainText('XP');
 await expect(page.locator('.dungeon-status')).toContainText('reached level 2');
 await page.locator('section[aria-label="Party"]').scrollIntoViewIfNeeded();
 await expect(page.locator('section[aria-label="Party"]')).toBeVisible();
 expect(await page.locator('#dungeon-screen').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
 await page.screenshot({path:test.info().outputPath('hero-level-up.png'),fullPage:true});
 const saved=await snapshot(page);await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
 expect((await snapshot(page)).party).toEqual(saved.party);
 await expect(page.locator('.dungeon-status')).not.toContainText('reached level');
 const offer=saved.offer!;await page.getByRole('button',{name:`Claim ${dungeonContent.items[offer.options[0].itemId].label}`,exact:true}).click();await page.locator('#dungeon-item-confirm').click();
 expect((await snapshot(page)).party).toEqual(saved.party);
});
