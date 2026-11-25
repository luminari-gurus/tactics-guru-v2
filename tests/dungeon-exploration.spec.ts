import { checkedDungeon, guardianFirstRewardFixture, dungeonSightTransition, savedBiomeEncounter, sharedGroundPile } from './helpers/dungeonFixtures';
import { expect,test } from './helpers/startupDiagnostics';
import type { Locator, Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { openSavedDungeon, openDungeonWithStorage, dungeonSnapshot, acceptedDungeonSnapshot, expectSameProgress, walkDungeon, expectDungeonResumed, openDungeonInventory } from './helpers/dungeonTraversal';
import { currentSight, neighbors, poiCell } from '../src/domain/exploration';
import { generateMap } from '../src/map/generate';
import { freshDungeon, floorDescriptor, floorMap, readDungeon, dungeonSeed, type DungeonState } from '../src/domain/dungeon';
import { dungeonContent, legacyDungeonIdentity } from '../src/content/dungeon';
import { canonical, hashJson } from '../src/domain/contentIdentity';
import { DUNGEON_KEYS } from '../src/persistence/dungeonStorage';
import { endTurn, battleTool, readSession,playCommand } from './helpers/battlePolicy';
import { installRailControls } from './helpers/forceRailControls';
import { playerDecision } from './helpers/playerPolicy';
import { dungeonBattle } from '../src/domain/dungeon';
import { atCell, atEncounter, atStairApproach, dungeonCapacityFixture, dungeonContactApproach, dungeonVictoryBoundary, dungeonGroundVictoryBoundary } from './helpers/dungeonFixtures';
import { freshExploration } from '../src/domain/exploration';
import { encodeDungeon, utf8Bytes } from '../src/domain/dungeonSaveEnvelope';
import { holdFinalRecordsWrite } from './helpers/recordsWriteGate';
import { startBattleModuleFaultServer } from './helpers/battleModuleFaultServer';
import { AUTO_COLLECT_LOOT_KEY } from '../src/ui/autoCollectLootPreference';
import { dungeonMovementGeometry, expectDungeonMovementVisible } from './helpers/dungeonLayout';

const fixedSeedTest = test.extend({ pinDungeonSeed: 28 });
const desertSeedTest = test.extend({ pinDungeonSeed: 16 });
test.beforeEach(async ({ context }) => { await installRailControls(context); });

async function loadGroundLootBoundary(page: Page, state: DungeonState) {
 const encoded=encodeDungeon(state);if(!encoded.ok)throw Error(encoded.reason);
 await openDungeonWithStorage(page, { [DUNGEON_KEYS.primary]: encoded.text, [AUTO_COLLECT_LOOT_KEY]: 'off' });
 await expectDungeonResumed(page);
}

test('ground loot: legal victory saves one item at contact and a manual pickup survives refusal and reload',async({page,isMobile})=>{
 test.setTimeout(60000);
 // Freeze unrelated elapsed-playtime checkpoints while injecting a storage refusal.
 await page.addInitScript(()=>{document.hasFocus=()=>false;});
 let witness:ReturnType<typeof dungeonGroundVictoryBoundary>=null;
 for(let seed=1;seed<=16&&!witness;seed++)witness=dungeonGroundVictoryBoundary(seed);
 if(!witness)throw Error('No legal ground-loot victory');
 await loadGroundLootBoundary(page,witness.snapshot);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const before=await dungeonSnapshot(page),entry=before.encounterEntry!;
 await playCommand(page,witness.command);await expect(page.locator('#dungeon-map')).toBeVisible();
 await expectDungeonMovementVisible(page);
 const won=await dungeonSnapshot(page),floor=won.floors[won.depth-1],loot=floor.loot!;
 expect(won).toMatchObject({phase:'ready',offer:null,activeBattle:null});
 expect(floor.position).toBe(entry.origin);expect(floor.completed).toBe(1);expect(loot).toHaveLength(1);
 expect(loot[0]).toMatchObject({slot:entry.slot,cell:entry.contact,quantity:1,remaining:1});
 expect(won.ownership).toEqual(before.ownership);
 await expect(page.getByRole('region',{name:'Rewards',exact:true})).toHaveCount(0);
 await expect(page.getByRole('button',{name:/^(Claim|Collect|Open loot)/})).toHaveCount(0);
 const tile=page.locator(`#dungeon-map [data-cell="${entry.contact}"]`),label=dungeonContent.items[loot[0].itemId].label;
 await expect(tile).toHaveAttribute('data-loot','1');await expect(tile).toHaveText('◆');
 await expect(page.locator('.dungeon-loot-guide')).toBeVisible();
 await expect(page.locator('#dungeon-map')).toHaveAccessibleDescription(new RegExp(`Loot at row .*${label}`));
 await page.screenshot({path:test.info().outputPath('ground-loot-after-victory.png'),fullPage:true});
 await page.evaluate(key=>{
  const original=Storage.prototype.setItem;
  (window as unknown as {restoreLootStorage:()=>void}).restoreLootStorage=()=>{Storage.prototype.setItem=original;};
  Storage.prototype.setItem=function(k,v){if(k===key)throw Error('ground-loot write refused');original.call(this,k,v);};
 },DUNGEON_KEYS.primary);
 const enter=async()=>{if(isMobile)await tile.tap();else await tile.click();};
 await enter();await expect(page.locator('.dungeon-status')).toContainText('Movement not published');
 await expect(page.locator('.dungeon-header .dungeon-status')).toBeInViewport({ratio:1});
 await expect(page.locator('.dungeon-save-note')).toBeHidden();
 await expect(tile).toHaveAttribute('data-loot','1');
 await page.evaluate(()=>(window as unknown as {restoreLootStorage:()=>void}).restoreLootStorage());
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();await page.locator('#dungeon-retry-save').click();
 const lootStatus=page.locator('.dungeon-loot-status');
 const statusNode=await lootStatus.elementHandle();if(!statusNode)throw Error('Missing acquisition status');
 await enter();await expect(lootStatus).toContainText(`Picked up ${label}`);
 await expect(lootStatus).toBeInViewport({ratio:1});
 await expect(page.locator('.dungeon-save-note')).toHaveText('Exploration saved on this device');
 await expect(page.locator('.dungeon-save-note')).toBeInViewport({ratio:1});
 expect(await statusNode.evaluate(node=>node.isConnected&&node===document.querySelector('.dungeon-loot-status'))).toBe(true);
 await expect(lootStatus).toHaveAttribute('role','status');
 await expect(lootStatus).toHaveAttribute('aria-atomic','true');
 expect(await lootStatus.evaluate(node=>{
  const message=node.getBoundingClientRect(), map=document.querySelector('.dungeon-map-viewport')!.getBoundingClientRect();
  const target=document.elementFromPoint(message.x+message.width/2,message.y+message.height/2);
  return message.top>=map.top&&message.bottom<=map.bottom&&map.bottom-message.bottom<=8&&!!target?.closest('#dungeon-map');
 })).toBe(true);
 await expect(tile).not.toHaveAttribute('data-loot');
 if(!isMobile){
  await page.reload();await expectDungeonResumed(page);
  await expect(tile).not.toHaveAttribute('data-loot');
 }
});

test('ground loot: full capacity keeps same-cell rewards and retries on discard without moving enemies',async({page,isMobile})=>{
 test.setTimeout(60000);
 await page.addInitScript(()=>{document.hasFocus=()=>false;});
 const {state,cell}=sharedGroundPile(6);await loadGroundLootBoundary(page,state);
 const original=state.floors[state.depth-1].loot!,tile=page.locator(`#dungeon-map [data-cell="${cell}"]`);
 await expect(tile).toHaveAttribute('data-loot','2');await expect(tile).toHaveText('◆');
 await walkDungeon(page,cell,isMobile?'touch':'keyboard');
 await expect(page.locator('.dungeon-loot-status')).toContainText('Inventory full');
 await expect(tile).toHaveAttribute('data-loot-overlay','true');
 await expect(page.locator('.dungeon-loot-here')).toBeVisible();
 await expect(page.locator('#dungeon-map')).toHaveAccessibleDescription(/Beneath the party/);
 await tile.scrollIntoViewIfNeeded();
 await page.screenshot({path:test.info().outputPath('ground-loot-capacity-6.png'),fullPage:true});
 for(const [index,pending] of original.entries()) {
  await openDungeonInventory(page);
  const discard=page.locator(`[data-instance-id="${state.ownership.equipment[index].instanceId}"]`).getByRole('button',{name:'Discard Warding Charm',exact:true});
  if(isMobile)await discard.tap();else await discard.click();
  await page.locator('#dungeon-discard-confirm').click();
  await expect(page.locator('.dungeon-loot-status')).toContainText(`Picked up ${dungeonContent.items[pending.itemId].label}`);
  if(index===0){
   await expect(tile).toHaveAttribute('data-loot','1');
   await expect(tile).toHaveAttribute('data-loot-overlay','true');
   await expect(page.locator('#dungeon-map')).toHaveAccessibleDescription(/Beneath the party/);
  }
 }
 await expect(page.locator('.dungeon-loot-here')).toBeHidden();await expect(tile).not.toHaveAttribute('data-loot');
});

test('ground loot: entering an occupied pile starts combat and closes inventory',async({page,isMobile})=>{
 const {state,cell}=sharedGroundPile(1,true);await loadGroundLootBoundary(page,state);
 const tile=page.locator(`#dungeon-map [data-cell="${cell}"]`);
 await expect(tile).toHaveAttribute('data-loot','2');await expect(tile).toHaveAttribute('data-loot-overlay','true');await expect(tile).toHaveText('M');
 await openDungeonInventory(page);
 const discard=page.getByRole('button',{name:'Discard Warding Charm',exact:true});
 await expect(discard).toBeVisible();
 if(isMobile)await tile.tap();else await tile.click();
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 await expect(discard).toHaveCount(0);
});

test('map markers respect stair availability, discovery and saved floor state',async({page,isMobile})=>{
 const base=freshDungeon('marker-browser',1),floor=base.floors[0];
 const cell=(index:number)=>page.locator(`#dungeon-map [data-cell="${index}"]`);
 const accessibleMap=page.getByRole('application',{name:/Floor \d+ map/});
 // Structural saved-state fixtures isolate rendering; they do not prove preceding battle completion.
 const revealed={...floor,exploration:{...floor.exploration,revealed:Array.from({length:400},(_,i)=>i)}};
 await openSavedDungeon(page,{...base,floors:[{...revealed,position:floor.position}]});
 await expect(page.locator('[aria-label="Discovered places"]')).toHaveCount(0);
 const firstMap = floorMap(floor.descriptor), sight = currentSight(floor.position, firstMap);
 await expect(accessibleMap).toHaveAccessibleDescription(/Guardian · Goblins at row \d+, column \d+\. Available\./);
 await expect(cell(floor.descriptor.downstairs)).toHaveClass(/explore-remembered/);
 await expect(cell(floor.position)).not.toHaveClass(/explore-remembered/);
 await expect(accessibleMap).not.toHaveAccessibleDescription(/Upstairs|Downstairs/);
 await expect(cell(floor.descriptor.downstairs)).toHaveText('');
 for (const poi of floor.exploration.pois) {
  const index = poiCell(poi, firstMap.width), visible = sight.includes(index);
  await expect(cell(index)).toHaveText(visible ? 'M' : '');
  if (!visible) {
   const location = `at row ${Math.floor(index / firstMap.width) + 1}, column ${index % firstMap.width + 1}.`;
   await expect(accessibleMap).not.toHaveAccessibleDescription(new RegExp(location.replace('.', '\\.')));
  }
 }
 await expect(page.locator('#dungeon-map')).not.toContainText(/[123]/);
 await page.locator('#dungeon-travel-summary').click();
 await expect(page.getByText('● Player · M encounter or guardian',{exact:false})).toBeVisible();
 await page.locator('#dungeon-travel-summary').click();
 await expect(page.locator('#dungeon-descend')).toHaveCount(0);
 await page.locator('#dungeon-map').screenshot({path:test.info().outputPath('markers-uncleared-map.png')});
 const firstStep=neighbors(floor.position).find(n=>firstMap.cells[n]&&!floor.exploration.pois.some(p=>poiCell(p,firstMap.width)===n))!;
 await walkDungeon(page,firstStep,isMobile?'touch':'keyboard');
 await expect(cell(floor.descriptor.upstairs)).toHaveText('');
 // Completion alone cannot reveal an undiscovered staircase.
 await openSavedDungeon(page,{...base,floors:[{...floor,completed:3}]});
 await expect(page.locator('#dungeon-encounter-progress')).toHaveText('Encounters: 3 / 3 cleared');
 await expect(page.locator('#dungeon-stair-descend')).toHaveText('Downstairs: unlocked · walk onto the stairs');
 await expect(cell(floor.descriptor.downstairs)).toHaveClass('explore-hidden');
 await expect(accessibleMap).not.toHaveAccessibleDescription(/Downstairs at/);
 const hiddenPoi = floor.exploration.pois.map(p=>poiCell(p,firstMap.width)).find(i=>!floor.exploration.revealed.includes(i))!;
 await expect(cell(hiddenPoi)).toHaveClass('explore-hidden');
 await expect(accessibleMap).not.toHaveAccessibleDescription(new RegExp(`at row ${Math.floor(hiddenPoi / firstMap.width) + 1}, column ${hiddenPoi % firstMap.width + 1}\\.`));
 await openSavedDungeon(page,{...base,floors:[{...revealed,position:floor.position,completed:3}]});
 await expect(cell(floor.descriptor.downstairs)).toHaveText('↓');
 const downstairs = new RegExp(`Downstairs at row ${Math.floor(floor.descriptor.downstairs / firstMap.width) + 1}, column ${floor.descriptor.downstairs % firstMap.width + 1}\\.$`);
 await expect(accessibleMap).toHaveAccessibleDescription(/Guardian · Goblins at row \d+, column \d+\. Cleared\./);
 for(const poi of floor.exploration.pois)await expect(cell(poiCell(poi))).toHaveText('✓');
 await expect(accessibleMap).toHaveAccessibleDescription(downstairs);
 await page.locator('#dungeon-map').scrollIntoViewIfNeeded();
 await page.locator('#dungeon-map').screenshot({path:test.info().outputPath('markers-cleared-map.png')});
 const descriptor=floorDescriptor(base.seed,2),exploration=freshExploration(descriptor.seed,descriptor.upstairs,floorMap(descriptor));
 const second={descriptor,completed:0,position:descriptor.upstairs,exploration};
 await openSavedDungeon(page,{...base,depth:2,floors:[{...floor,completed:3},second]});
 const map=floorMap(descriptor),adjacent=neighbors(descriptor.upstairs,map.width,map.height).find(n=>map.cells[n]&&!exploration.pois.some(p=>poiCell(p,map.width)===n))!;
 await walkDungeon(page,adjacent,isMobile?'touch':'keyboard');await expect(cell(descriptor.upstairs)).toHaveText('↑');
 await expect(accessibleMap).toHaveAccessibleDescription(/^Upstairs at row \d+, column \d+\./);
 await page.reload();await expectDungeonResumed(page);await expect(cell(descriptor.upstairs)).toHaveText('↑');
 await page.locator('#dungeon-map').scrollIntoViewIfNeeded();
 await page.locator('#dungeon-map').screenshot({path:test.info().outputPath('markers-upper-floor-map.png')});
 if(isMobile){await page.setViewportSize({width:320,height:740});await page.locator('#dungeon-progress').scrollIntoViewIfNeeded();}
 await expect(page.locator('#dungeon-progress')).not.toContainText(/row|column/);
 expect(await page.locator('#dungeon-screen').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
 await page.screenshot({path:test.info().outputPath('floor-progress-narrow.png'),fullPage:true});
});

test('live markers follow current sight across movement, art changes and reload', async ({ page, isMobile }) => {
 for (const entering of [true, false]) {
  const { before, after, slot } = dungeonSightTransition(entering);
  const map = floorMap(before.floors[0].descriptor);
  const encounterCell = (state: DungeonState) => poiCell(state.floors[0].exploration.pois[slot], map.width);
  const marker = page.locator(`#dungeon-map [data-poi="enemy-${slot + 1}"]`);
  const accessibleMap = page.getByRole('application', { name: /Floor 1 map/ });
  const label = slot === 2 ? 'Guardian · Goblins' : `encounter ${slot + 1}`;
  const check = async (state: DungeonState, visible: boolean) => {
   await expect(marker).toHaveCount(visible ? 1 : 0);
   if (visible) {
    const index = encounterCell(state);
    await expect(marker).toHaveText('M');
    await expect(marker).toHaveAttribute('data-cell', String(index));
    await expect(accessibleMap).toHaveAccessibleDescription(new RegExp(
     `${label} at row ${Math.floor(index / map.width) + 1}, column ${index % map.width + 1}\\. Available\\.`));
   } else {
    await expect(accessibleMap).not.toHaveAccessibleDescription(new RegExp(label));
   }
  };
  await openSavedDungeon(page, before);
  const expectIdle = async () => {
   const snapshot = await dungeonSnapshot(page);
   await page.clock.runFor(5000);
   expect(await dungeonSnapshot(page)).toEqual(snapshot);
  };
  await check(before, !entering);
  if (entering) {
   const saved = await page.evaluate(key => localStorage.getItem(key), DUNGEON_KEYS.primary);
   await page.clock.install();
   await expectIdle();
   expect(await page.evaluate(key => localStorage.getItem(key), DUNGEON_KEYS.primary)).toBe(saved);
   const cell = page.locator(`#dungeon-map [data-cell="${after.floors[0].position}"]`);
   if (isMobile) await cell.tap();
   else await cell.click();
  } else {
   await walkDungeon(page, after.floors[0].position, isMobile ? 'touch' : 'keyboard');
  }
  await check(after, entering);
  if (entering) await expectIdle();
  const previousSight = currentSight(before.floors[0].position, map);
  const nextSight = currentSight(after.floors[0].position, map);
  const remembered = previousSight.find(cell => !nextSight.includes(cell));
  if (remembered === undefined) throw Error('Missing remembered cell');
  const rememberedCell = page.locator(`#dungeon-map [data-cell="${remembered}"]`);
  await expect(rememberedCell).toHaveClass(/explore-remembered/);
  await page.locator('#dungeon-art').selectOption('legacy-8bit');
  await check(after, entering);
  expectSameProgress(await dungeonSnapshot(page), after);
  await page.reload();
  await expectDungeonResumed(page);
  await check(after, entering);
  await expect(rememberedCell).toHaveClass(/explore-remembered/);
  expectSameProgress(await dungeonSnapshot(page), after);
  if (entering) await expectIdle();
 }
});

test('stairs travel once per entry with keyboard, compass and cell controls, and stay on arrival and restore',async({page,isMobile})=>{
 test.setTimeout(240000);
 const base=freshDungeon('stairs-browser',6074),cleared={...base,floors:[{...base.floors[0],completed:3}]};
 const reload=async()=>{await page.reload();await expectDungeonResumed(page);};
 const move=async(destination:number,control:'arrows'|'wasd'|'compass'|'cell')=>{
  if(control==='compass')await expectDungeonMovementVisible(page);
  const before=await dungeonSnapshot(page),delta=destination-before.floors[before.depth-1].position, width=before.floors[before.depth-1].descriptor.size ?? 20;
  const direction=delta===-width?'north':delta===width?'south':delta===1?'east':'west';
  if(control==='arrows'||control==='wasd'){
   await page.locator('#dungeon-map').focus();
   const key=control==='arrows'?{north:'ArrowUp',south:'ArrowDown',east:'ArrowRight',west:'ArrowLeft'}[direction]:{north:'w',south:'s',east:'d',west:'a'}[direction];
   await page.keyboard.press(key);
  }else{
   const target=control==='compass'?page.locator(`#dungeon-step-${direction}`):page.locator(`#dungeon-map [data-cell="${destination}"]`);
   if(isMobile)await target.tap();else await target.click();
  }
  await expect.poll(async()=> (await dungeonSnapshot(page)).revision).toBe(before.revision+1);
  if(control==='compass')await expectDungeonMovementVisible(page);
 };
 // Structural clear-floor input isolates traversal. The legal guardian journey separately proves unlock.
 const approach=atStairApproach(cleared);await openSavedDungeon(page,approach);
 const travelHint = page.locator('.dungeon-header');
 await expect(travelHint).toContainText('Encounters: 3 / 3 cleared');
 await expect(travelHint).toContainText('Downstairs: unlocked · walk onto the stairs');
 await move(approach.floors[0].descriptor.downstairs,'arrows');
 const second=await dungeonSnapshot(page),upper=second.floors[1];expect(second.depth).toBe(2);expect(second.revision).toBe(approach.revision+1);
 await expect(page.locator('#dungeon-screen h1')).toHaveText('Dungeon · Floor 2 · Desert');
 await expect(page.getByRole('application',{name:/^Floor 2 map\./})).toBeVisible();
 await expect(travelHint).toContainText('Encounters: 0 / 3 cleared');
 await expect(travelHint).toContainText('Downstairs: locked · clear 3 more encounters');
 await expect(travelHint).toContainText('Upstairs: available');
 expect(upper.position).toBe(upper.descriptor.upstairs);expect(second.party).toEqual(approach.party);expect(second.ownership).toEqual(approach.ownership);
 await expect(page.locator('#dungeon-map')).toHaveAttribute('data-position',String(upper.position));
 await expect(page.locator('#dungeon-ascend, #dungeon-descend')).toHaveCount(0);
 await expect(travelHint).toContainText('Step off the upstairs and back onto it to ascend.');
 if(!isMobile){
  await reload();
  await expect(page.locator('#dungeon-map')).toHaveAttribute('data-position',String(second.floors[second.depth-1].position));
  await expect(travelHint).toContainText('Step off the upstairs and back onto it to ascend.');
 }
 const off=atStairApproach(second,'ascend').floors[1].position;
 await move(off,'compass');expect((await dungeonSnapshot(page)).depth).toBe(2);
 await move(upper.descriptor.upstairs,'wasd');
 const first=await dungeonSnapshot(page);expect(first.depth).toBe(1);expect(first.revision).toBe(second.revision+2);
 await expect(travelHint).toContainText('Encounters: 3 / 3 cleared');
 expect(first.floors[0].position).toBe(first.floors[0].descriptor.downstairs);
 await expect(travelHint).toContainText('Step off the downstairs and back onto it to descend.');
 if(isMobile){
  await reload();
  await expect(page.locator('#dungeon-map')).toHaveAttribute('data-position',String(first.floors[first.depth-1].position));
  await expect(travelHint).toContainText('Step off the downstairs and back onto it to descend.');
 }
 await page.screenshot({path:test.info().outputPath('stairs-arrival.png'),fullPage:true});
 // Cross the same stair boundary using the two pointer controls as well.
 await move(atStairApproach(first).floors[0].position,'wasd');
 await move(first.floors[0].descriptor.downstairs,'compass');
 const revisited=await dungeonSnapshot(page);expect(revisited.depth).toBe(2);
 await move(atStairApproach(revisited,'ascend').floors[1].position,'arrows');
 await move(upper.descriptor.upstairs,'cell');expect((await dungeonSnapshot(page)).depth).toBe(1);
});

test('map-edge direction controls, focus, touch targets and unavailable states',async({page,isMobile,browserName})=>{
 const fresh=freshDungeon('compass-browser',1),base={...fresh,floors:[{...fresh.floors[0],completed:3}]},floor=base.floors[0],map=generateMap(floor.descriptor.seed,'rooms');
 const directions=[['North',-20],['East',1],['South',20],['West',-1]] as const;
 const safe=(cell:number)=>map.cells[cell]&&!floor.exploration.pois.some(p=>poiCell(p)===cell);
 const center=map.cells.findIndex((_,cell)=>safe(cell)&&neighbors(cell).length===4&&neighbors(cell).every(safe));
 expect(center).toBeGreaterThanOrEqual(0);
 await openSavedDungeon(page,atCell(base,center));
 const compass=page.getByRole('group',{name:'Move player',exact:true});
 await expect(compass.getByRole('button')).toHaveCount(4);
 await expectDungeonMovementVisible(page);
 const boxes=[];
 for(const [name] of directions){
  const button=compass.getByRole('button',{name,exact:true});await expect(button).toBeEnabled();
  const box=(await button.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);boxes.push(box);
  expect(await button.evaluate(node=>{
   const rect=node.getBoundingClientRect(),cx=rect.x+rect.width/2,cy=rect.y+rect.height/2;
   return [[0,0],[20,0],[-20,0],[0,20],[0,-20]].every(([dx,dy])=>node.contains(document.elementFromPoint(cx+dx,cy+dy)));
  })).toBe(true);
 }
 expect(boxes[0].y).toBeLessThan(boxes[1].y);expect(boxes[2].y).toBeGreaterThan(boxes[1].y);expect(boxes[3].x).toBeLessThan(boxes[0].x);expect(boxes[1].x).toBeGreaterThan(boxes[0].x);
 const region=(await compass.locator('.dungeon-map-viewport').boundingBox())!;
 expect(boxes[0].y+boxes[0].height).toBeLessThanOrEqual(region.y);
 expect(boxes[1].x).toBeGreaterThanOrEqual(region.x+region.width);
 expect(boxes[2].y).toBeGreaterThanOrEqual(region.y+region.height);
 expect(boxes[3].x+boxes[3].width).toBeLessThanOrEqual(region.x);
 const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
 await page.locator('#dungeon-map').focus();
 for(const [name] of directions){
  await page.keyboard.press(tab);
  await expect(compass.getByRole('button',{name,exact:true})).toBeFocused();
 }
 const party = page.getByRole('region', { name: 'Party', exact: true });
 for (const hero of ['Fighter', 'Ranger', 'Mage']) {
  await page.keyboard.press(tab);
  await expect(party.getByRole('button', { name: hero, exact: true })).toBeFocused();
 }
 await compass.getByRole('button',{name:'North',exact:true}).focus();
 await expect(compass.getByRole('button',{name:'North',exact:true})).toBeFocused();
 expect(await compass.getByRole('button',{name:'North',exact:true}).evaluate(node=>node.matches(':focus-visible')&&getComputedStyle(node).outlineStyle==='solid')).toBe(true);
 await page.screenshot({path:test.info().outputPath('compass-focus.png')});
 for(const [name,delta] of directions){
  const before=await dungeonSnapshot(page),button=compass.getByRole('button',{name,exact:true});
  const geometry=await expectDungeonMovementVisible(page),target=geometry.buttons.find(control=>control.id===`dungeon-step-${name.toLowerCase()}`)!;
  if(isMobile)await page.touchscreen.tap(target.x,target.y);else {await button.focus();await page.keyboard.press(name==='North'?'Enter':'Space');}
  await expect.poll(async () => (await dungeonSnapshot(page)).floors[0].position).toBe(center+delta);
  expect((await dungeonSnapshot(page)).revision).toBe(before.revision+1);
  expect((await expectDungeonMovementVisible(page)).scrollTop).toBe(geometry.scrollTop);
  const reverse=directions.find(([,offset])=>offset===-delta)![0];
  const back=compass.getByRole('button',{name:reverse,exact:true}),reverseTarget=(await dungeonMovementGeometry(page)).buttons.find(control=>control.id===`dungeon-step-${reverse.toLowerCase()}`)!;
  if(isMobile)await page.touchscreen.tap(reverseTarget.x,reverseTarget.y);else await back.click();
  await expect.poll(async () => (await dungeonSnapshot(page)).floors[0].position).toBe(center);
 }
 if(!isMobile){
  const north=compass.getByRole('button',{name:'North',exact:true});await north.hover();await page.mouse.down();
  expect(await north.evaluate(node=>getComputedStyle(node).boxShadow)).not.toBe('none');
  await page.screenshot({path:test.info().outputPath('compass-pressed.png')});await page.mouse.up();
 }
 const wallPosition=map.cells.findIndex((_,cell)=>safe(cell)&&neighbors(cell).some(next=>!map.cells[next]));
 await openSavedDungeon(page,atCell(base,wallPosition));const before=await dungeonSnapshot(page);
 for(const [name,delta] of directions){
  const unavailable=!neighbors(wallPosition).includes(wallPosition+delta)||!map.cells[wallPosition+delta];
  const button=compass.getByRole('button',{name,exact:true});
  if(unavailable){await expect(button).toBeDisabled();await button.evaluate(node=>(node as HTMLButtonElement).click());}
  else await expect(button).toBeEnabled();
 }
 expect(await dungeonSnapshot(page)).toEqual(before);
 await expectDungeonMovementVisible(page);await page.screenshot({path:test.info().outputPath('compass-unavailable.png')});
 if(isMobile){await page.setViewportSize({width:320,height:740});await expectDungeonMovementVisible(page);}
 expect(await page.locator('#dungeon-screen').evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
 const compassBox=(await compass.boundingBox())!;expect(compassBox.x).toBeGreaterThanOrEqual(0);expect(compassBox.x+compassBox.width).toBeLessThanOrEqual(page.viewportSize()!.width);
 await openSavedDungeon(page,dungeonCapacityFixture());
 for(const [name] of directions)await expect(compass.getByRole('button',{name,exact:true})).toBeDisabled();
 const reward=await dungeonSnapshot(page);await page.locator('#dungeon-map').focus();await page.keyboard.press('ArrowUp');expect(await dungeonSnapshot(page)).toEqual(reward);
});

test('movement controls stay visible with the player without scrolling on entry and resize',async({page,isMobile})=>{
 const fresh=freshDungeon('visible-controls-browser',1),base={...fresh,floors:[{...fresh.floors[0],completed:3}]};
 const terrain=floorMap(base.floors[0].descriptor),stairs=[base.floors[0].descriptor.upstairs,base.floors[0].descriptor.downstairs];
 const origin=terrain.cells.findIndex((open,cell)=>open===1&&!stairs.includes(cell)&&neighbors(cell,terrain.width).some(next=>terrain.cells[next]&&!stairs.includes(next)));
 const destination=neighbors(origin,terrain.width).find(next=>terrain.cells[next]&&!stairs.includes(next));
 if(origin<0||destination===undefined)throw Error('No safe visibility witness');
 await openSavedDungeon(page,atCell(base,origin));
 const originalViewport=page.viewportSize()!;
 const party=await page.getByRole('region',{name:'Party',exact:true}).elementHandle();
 if(!party)throw Error('Missing party summary');
 const portrait=[{width:320,height:568},{width:393,height:684},{width:393,height:852}];
 const landscape=[{width:568,height:320},{width:667,height:375},{width:740,height:360}];
 // Desktop exercises every size with a mouse. Each touch profile rotates into
 // the opposite orientation, covers its three sizes, then returns to native.
 const resized = isMobile
  ? (originalViewport.width < originalViewport.height ? landscape : portrait)
  : [...portrait, ...landscape];
 const sizes=[originalViewport,...resized,originalViewport];
 const delta=destination-origin,name=delta===-terrain.width?'north':delta===terrain.width?'south':delta===1?'east':'west';
 const reverse={north:'south',south:'north',east:'west',west:'east'}[name];
 const activate=async(id:string)=>{
  const geometry=await expectDungeonMovementVisible(page),target=geometry.buttons.find(control=>control.id===id)!;
  expect(target.disabled).toBe(false);
  // Coordinate input deliberately cannot invoke locator auto-scroll.
  if(isMobile)await page.touchscreen.tap(target.x,target.y);else await page.mouse.click(target.x,target.y);
  return geometry.scrollTop;
 };
 for(const [index,size] of sizes.entries()){
  if(index)await page.setViewportSize(size);
  const initial=await expectDungeonMovementVisible(page);
  expect(initial.scrollTop,'Exploration should stay at its initial outer scroll position').toBe(0);
  await page.screenshot({path:test.info().outputPath(`map-edge-${index}-${size.width}x${size.height}.png`)});
  const before=await dungeonSnapshot(page),scrollTop=await activate(`dungeon-step-${name}`);
  await expect.poll(async()=>(await dungeonSnapshot(page)).floors[0].position).toBe(destination);
  await expect(page.locator('.dungeon-save-note')).toHaveText('Exploration saved on this device');
  await expect(page.locator('.dungeon-save-note')).toBeInViewport({ratio:1});
  expect(await party.evaluate(node=>node.isConnected),'Ordinary movement keeps the unchanged party mounted').toBe(true);
  expect((await dungeonSnapshot(page)).revision).toBe(before.revision+1);
  expect((await expectDungeonMovementVisible(page)).scrollTop).toBe(scrollTop);
  await activate(`dungeon-step-${reverse}`);
  await expect.poll(async()=>(await dungeonSnapshot(page)).floors[0].position).toBe(origin);
  expect((await expectDungeonMovementVisible(page)).scrollTop).toBe(scrollTop);
 }
 await page.screenshot({path:test.info().outputPath('map-edge-movement-visible.png')});
 const beforeReload=await dungeonSnapshot(page);await page.reload();await expectDungeonResumed(page);
 expectSameProgress(await dungeonSnapshot(page),beforeReload);
 expect((await expectDungeonMovementVisible(page)).scrollTop).toBe(0);
});

test('compass keeps keyboard focus when movement disables the activated direction', { tag: '@desktop-keyboard' }, async({page})=>{
 const fresh=freshDungeon('compass-browser',1),initial=atCell({...fresh,floors:[{...fresh.floors[0],completed:3}]},27);
 await openSavedDungeon(page,initial);
 const west=page.getByRole('button',{name:'West',exact:true}),map=page.locator('#dungeon-map');
 let revision=initial.revision;
 for(const key of ['Enter','Space']){
  await expect(west).toBeEnabled();await west.focus();await page.keyboard.press(key);
  await expect.poll(async () => (await dungeonSnapshot(page)).floors[0].position).toBe(26);
  const moved=await dungeonSnapshot(page);expect(moved.revision).toBe(revision+1);
  await expect(west).toBeDisabled();await expect(map).toBeFocused();
  expect(await map.evaluate(node=>node.matches(':focus-visible')&&getComputedStyle(node).outlineStyle==='solid')).toBe(true);
  await page.screenshot({path:test.info().outputPath(`compass-focus-fallback-${key}.png`)});
  await page.keyboard.press('ArrowLeft');expect(await dungeonSnapshot(page)).toEqual(moved);await expect(map).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await dungeonSnapshot(page)).floors[0].position).toBe(27);
  const returned=await dungeonSnapshot(page);
  expect(returned.revision).toBe(revision+2);await expect(map).toBeFocused();await expect(west).toBeEnabled();
  revision=returned.revision;
 }
});

fixedSeedTest('map shortcuts work on entry and outside the map without taking over other controls', { tag: '@desktop-keyboard' }, async ({page}) => {
 await page.goto('./?game=dungeon&entry=new');
 await expect(page.locator('#dungeon-map')).toBeVisible();
 const initial = await dungeonSnapshot(page);
 const floor = initial.floors[0], terrain = floorMap(floor.descriptor);
 const direction = [
  {offset:1, arrow:'ArrowRight', reverseArrow:'ArrowLeft', reverse:'a'},
  {offset:-1, arrow:'ArrowLeft', reverseArrow:'ArrowRight', reverse:'d'},
  {offset:terrain.width, arrow:'ArrowDown', reverseArrow:'ArrowUp', reverse:'w'},
  {offset:-terrain.width, arrow:'ArrowUp', reverseArrow:'ArrowDown', reverse:'s'},
 ].find(({offset}) => neighbors(floor.position,terrain.width,terrain.height).includes(floor.position+offset) &&
  terrain.cells[floor.position+offset] && floor.position+offset!==floor.descriptor.downstairs);
 if (!direction) throw Error('Expected a walkable cell next to the dungeon entrance');
 const grid = page.locator('#dungeon-map');
 await expect(grid).not.toBeFocused();
 await page.keyboard.press(direction.arrow);
 await expect.poll(async()=>(await dungeonSnapshot(page)).floors[0].position).toBe(floor.position+direction.offset);
 const moved = await dungeonSnapshot(page);
 expect(moved.floors[0].position).toBe(floor.position + direction.offset);
 expect(moved.revision).toBe(initial.revision + 1);

 const art = page.getByRole('combobox',{name:'Map art',exact:true});
 await art.focus();
 await page.keyboard.press(direction.reverse);
 expectSameProgress(await dungeonSnapshot(page), moved);
 await page.evaluate(() => {
  const input = document.createElement('input');
  input.id = 'shortcut-test-input';
  document.querySelector('#dungeon-screen')!.append(input);
  input.focus();
 });
 await page.keyboard.press(direction.reverse);
 await expect(page.locator('#shortcut-test-input')).toHaveValue(direction.reverse);
 expectSameProgress(await dungeonSnapshot(page), moved);
 const restart = page.getByRole('button',{name:'Start new dungeon',exact:true});
 await restart.click();
 await page.keyboard.press(direction.reverse);
 expectSameProgress(await dungeonSnapshot(page), moved);
 await page.locator('#dungeon-cancel-new').click();

 await restart.focus();
 await page.keyboard.press(direction.reverse);
 await expect.poll(async()=>(await dungeonSnapshot(page)).floors[0].position).toBe(floor.position);
 const returned = await dungeonSnapshot(page);
 expect(returned.floors[0].position).toBe(floor.position);
 expect(returned.revision).toBe(moved.revision + 1);
 await expect(restart).toBeFocused();

 const menu = page.getByRole('link',{name:'Main menu',exact:true});
 await menu.focus();
 await page.keyboard.press(direction.arrow);
 await expect.poll(async()=>(await dungeonSnapshot(page)).floors[0].position).toBe(floor.position+direction.offset);
 const movedAgain = await dungeonSnapshot(page);
 expect(movedAgain.revision).toBe(returned.revision + 1);
 await expect(menu).toBeFocused();

 const wasd = page.getByRole('checkbox',{name:'Enable WASD movement'});
 await expect(wasd).toBeChecked();
 await wasd.uncheck();
 await expect(grid).toHaveAccessibleName(/Arrow keys move one cell/);
 await restart.focus();
 await page.keyboard.press(direction.reverse);
 expectSameProgress(await dungeonSnapshot(page), movedAgain);
 await grid.focus();
 await page.keyboard.press(direction.reverse);
 expectSameProgress(await dungeonSnapshot(page), movedAgain);
 await expect(grid).toBeFocused();

 await page.reload();
 await expectDungeonResumed(page);
 await expect(wasd).not.toBeChecked();
 await restart.focus();
 await page.keyboard.press(direction.reverseArrow);
 await expect.poll(async()=>(await dungeonSnapshot(page)).floors[0].position).toBe(floor.position);
 const arrowOnly = await dungeonSnapshot(page);
 expect(arrowOnly.floors[0].position).toBe(floor.position);
 expect(arrowOnly.revision).toBe(movedAgain.revision + 1);
 await expect(restart).toBeFocused();
});

desertSeedTest('Desert 8-bit dungeon markers have a dark edge over sand', async ({ page }) => {
  await page.goto('./?game=dungeon&entry=new');
  const grid = page.locator('#dungeon-map');
  const player = grid.locator('[data-player]');
  const encounter = grid.locator('[data-poi]').filter({ hasText: /^M$/ });
  await expect(player).toHaveText('●');
  await expect(encounter).toHaveCount(1);
  await page.getByRole('combobox', { name: 'Map art', exact: true }).selectOption('legacy-8bit');
  await expect(grid).toHaveAttribute('data-art', 'legacy-8bit');
  for (const marker of [player, encounter]) {
    await expect(marker).toHaveAttribute('data-terrain', 'desert-open');
    await expect(marker).toHaveCSS('background-image', /\/desert-open\.png/);
    await expect(marker).toHaveCSS('text-shadow', /rgb\(17, 26, 36\)/);
  }
  await expect(player).toHaveCSS('box-shadow', /rgb\(17, 26, 36\).*inset/);
});

fixedSeedTest('real traversal, art independence, keyboard locks, active battle and exact reload',async({page,isMobile})=>{
 test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 // Qualify input/art/reload on a traversable witness, independently of fresh entropy.
 await page.goto('./?game=dungeon&entry=new');
 await expect(page.locator('#dungeon-map')).toBeVisible();
 const initial=await dungeonSnapshot(page),f=initial.floors[0],map=generateMap(f.descriptor.seed,'rooms');
 await expect(page.locator('#dungeon-start-encounter')).toHaveCount(0);await expect(page.locator('#dungeon-map')).not.toContainText('↑');
 const adjacent=neighbors(f.position).find(n=>map.cells[n])!;
 await walkDungeon(page,adjacent,isMobile?'touch':'pointer');const stepped=await dungeonSnapshot(page);expect(stepped.revision).toBe(initial.revision+1);
 await page.locator('#dungeon-map').focus();await page.keyboard.down('ArrowUp');await page.keyboard.up('ArrowUp');const after=await dungeonSnapshot(page);
 await page.locator('#dungeon-map').dispatchEvent('keydown',{key:'ArrowUp',repeat:true});expectSameProgress(await dungeonSnapshot(page), after);
 await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await page.keyboard.press('ArrowDown');expectSameProgress(await dungeonSnapshot(page), after);await page.locator('#dungeon-cancel-new').click();
 await page.locator('#dungeon-map').evaluate(n=>n.dataset.identity='retained');
 await page.getByRole('combobox',{name:'Map art',exact:true}).selectOption('legacy-8bit');await expect(page.locator('#dungeon-map')).toHaveAttribute('data-art','legacy-8bit');
 await expect(page.locator('#dungeon-map-feedback')).not.toContainText('fallback');expectSameProgress(await dungeonSnapshot(page), after);
 await page.getByRole('combobox',{name:'Map art',exact:true}).selectOption('simple');expectSameProgress(await dungeonSnapshot(page), after);
 await expect(page.locator('#dungeon-map')).toHaveAttribute('data-identity','retained');
 await expect.poll(()=>page.locator('.dungeon-directions button').evaluateAll(nodes=>nodes.length===4&&nodes.every(n=>{const b=n.getBoundingClientRect();return b.width>=44&&b.height>=44;}))).toBe(true);
 await page.locator('#dungeon-map').scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath('exploration-revealed.png'),fullPage:true});
 expect(await page.locator('#dungeon-screen').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
 await walkDungeon(page,undefined,isMobile?'touch':'keyboard');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const battle=await dungeonSnapshot(page);expect(battle.phase).toBe('battle');
 const contact=poiCell(battle.floors[0].exploration.pois[battle.floors[0].exploration.active!]);
 expect(battle.encounterEntry).toEqual({origin:battle.floors[0].position,contact,slot:battle.floors[0].exploration.active});
 expect(neighbors(battle.floors[0].position,map.width,map.height)).toContain(contact);
 const command=playerDecision((await readSession(page)).state,dungeonBattle(battle)!.catalog);await playCommand(page,command);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');const saved=await dungeonSnapshot(page);
 await page.reload();await expectDungeonResumed(page);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');expectSameProgress(await dungeonSnapshot(page), saved);
 writeFileSync(test.info().outputPath('spatial-battle-receipt.json'),JSON.stringify({initial,stepped,saved},null,2));expect(errors).toEqual([]);
});
test('cold progression-format Continue retains a long saved history within the startup budget',async({page})=>{
 const base=freshDungeon('cold-browser',13),floors=Array.from({length:250},(_,i)=>{
  const descriptor=floorDescriptor(base.seed,i+1);
  return {descriptor,completed:i===249?0:3,position:descriptor.upstairs,exploration:freshExploration(descriptor.seed,descriptor.upstairs,floorMap(descriptor))};
 });
 const encoded=encodeDungeon({...base,depth:250,floors});if(!encoded.ok)throw Error(encoded.reason);
 await page.goto('./');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
 const begin=Date.now();await page.goto('./?game=dungeon');await expectDungeonResumed(page);
 await expect(page.locator('#dungeon-map')).toBeVisible();const coldUsableMs=Date.now()-begin;
 expect(coldUsableMs).toBeLessThanOrEqual(2500);
 const state=await dungeonSnapshot(page);expect(state.depth).toBe(250);expect(state.floors).toHaveLength(250);
 expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary)).toBe(encoded.text);
 writeFileSync(test.info().outputPath('cold-current-history.json'),JSON.stringify({floors:250,bytes:utf8Bytes(encoded.text),coldUsableMs,budgetMs:2500,rawRetained:true}));
 await page.screenshot({path:test.info().outputPath('cold-current-history.png')});
 const floor = state.floors[state.depth - 1], map = floorMap(floor.descriptor);
 const cells = page.locator('#dungeon-map [data-cell]');
 await expect(cells).toHaveCount(floor.exploration.revealed.length);
 const next = neighbors(floor.position, map.width, map.height).find(cell => map.cells[cell] && !floor.exploration.pois.some(p => poiCell(p, map.width) === cell));
 if (next === undefined) throw Error('No clear step on the deep floor');
 await walkDungeon(page, next);
 const moved = await dungeonSnapshot(page);
 expect(moved.floors[state.depth - 1].position).toBe(next);
 await expect(cells).toHaveCount(moved.floors[state.depth - 1].exploration.revealed.length);
 await expect(page.locator(`#dungeon-map [data-cell="${next}"]`)).toHaveAttribute('data-player', 'true');
});

test('map input stays inert while hidden and retains discovery through resize and failed art',async({page})=>{
 await page.route('**/map-art/**',route=>route.abort());await page.goto('./?game=dungeon&entry=recovery');await page.getByRole('button',{name:'Play unsaved dungeon',exact:true}).click();
 const before=await dungeonSnapshot(page);await page.locator('#dungeon-art').selectOption('legacy-8bit');await expect(page.locator('#dungeon-map-feedback')).toContainText('fallback');expect(await dungeonSnapshot(page)).toEqual(before);
 await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:true}));await page.locator('#dungeon-map').focus();await page.keyboard.press('ArrowRight');expect(await dungeonSnapshot(page)).toEqual(before);
 await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));const size=page.viewportSize()!;await page.setViewportSize({width:size.height,height:size.width});expect(await dungeonSnapshot(page)).toEqual(before);
 await page.screenshot({path:test.info().outputPath('exploration-rotated-fallback.png'),fullPage:true});
});
test('records route transfer and map responsiveness against established budgets',async({page,request})=>{
 const begin=Date.now();await page.goto('./');
 await expect(page.locator('#main-menu')).toBeVisible();const coldUsableMs=Date.now()-begin;
 const createStart=performance.now();
 await page.getByRole('button',{name:'New Game',exact:true}).click();
 await expect(page.locator('#dungeon-map')).toBeVisible();
 const floorCreationMs=performance.now()-createStart,timings:number[]=[];
 const created=await dungeonSnapshot(page),cleared={...created,floors:[{...created.floors[0],completed:3}]};
 const encoded=encodeDungeon(cleared);if(!encoded.ok)throw Error(encoded.reason);
 await page.goto('./');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
 await page.goto('./?game=dungeon');await expectDungeonResumed(page);
 const start=await dungeonSnapshot(page),f=start.floors[0],map=generateMap(f.descriptor.seed,'rooms'),neighbor=neighbors(f.position).find(n=>map.cells[n]&&n!==f.descriptor.downstairs&&!f.exploration.pois.some(p=>poiCell(p,map.width)===n))!;
 for(let i=0;i<20;i++)timings.push(await page.evaluate(destination=>{const begin=performance.now();const cell=document.querySelector<HTMLElement>(`#dungeon-map [data-cell="${destination}"]`)!;cell.click();return performance.now()-begin;},i%2===0?neighbor:f.position));
 const frames=await page.evaluate(async({a,b})=>{
   const idle:number[]=[],steps:number[]=[];
   for(const [count,output] of [[30,idle],[40,steps]] as const){let previous=await new Promise<number>(r=>requestAnimationFrame(r));for(let i=0;i<count;i++){if(output===steps)document.querySelector<HTMLElement>(`#dungeon-map [data-cell="${i%2===0?b:a}"]`)!.click();const now=await new Promise<number>(r=>requestAnimationFrame(r));output.push((Math.round(now*1000)-Math.round(previous*1000))/1000);previous=now;}}
   const p=(v:number[],q:number)=>[...v].sort((a,b)=>a-b)[Math.ceil(v.length*q)-1];return {idle,steps,idleP50:p(idle,.5),idleP95:p(idle,.95),stepP95:p(steps,.95)};
 },{a:f.position,b:neighbor});
 await page.locator('#dungeon-art').selectOption('legacy-8bit');if(f.descriptor.biome==='desert-v1')await expect(page.locator('#dungeon-map-feedback')).toContainText('fallback');else await expect(page.locator('#dungeon-map-feedback')).not.toContainText('fallback');
 const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(e=>({name:e.name,encodedBodySize:(e as PerformanceResourceTiming).encodedBodySize})));
 const code=[];for(const r of resources.filter(r=>/\.(js|css)$/.test(r.name))){const response=await request.get(r.name),body=await response.body();code.push({url:new URL(r.name).pathname,raw:body.length,gzip:gzipSync(body).length});}
 timings.sort((a,b)=>a-b);const p95=timings[Math.ceil(timings.length*.95)-1],gzip=code.reduce((n,r)=>n+r.gzip,0),assets=resources.filter(r=>!r.name.match(/\.(js|css)$/)).reduce((n,r)=>n+r.encodedBodySize,0);
 const diagnostics=await page.evaluate(()=>window.fitDiagnostics()),saveBytes=utf8Bytes((await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary))??'');
 const receipt={frames,frameBudgets:{idleP50:16.7,idleP95:20,stepP95:33.4},framePasses:{idleP50:frames.idleP50<=16.7,idleP95:frames.idleP95<=20,stepP95:frames.stepP95<=33.4},commit:diagnostics.build.commit,dirty:diagnostics.build.dirty,viewport:diagnostics.viewport,userAgent:diagnostics.userAgent,floorCreationMs,descriptorBytes:utf8Bytes(canonical(f.descriptor)),saveBytes,coldUsableMs,stepP95Ms:p95,codeGzipBytes:gzip,observedAssetBytes:assets,budgets:{coldUsableMs:2500,stepP95Ms:33.4,codeGzipBytes:400000,assetBytes:1500000},passes:{cold:coldUsableMs<=2500,step:p95<=33.4,code:gzip<=400000,assets:assets<=1500000},code,timings,resources};
 writeFileSync(test.info().outputPath('exploration-performance.json'),JSON.stringify(receipt,null,2));expect(timings).toHaveLength(20);expect((await dungeonSnapshot(page)).floors[0].position).toBe(f.position);
 expect.soft(coldUsableMs,'Cold exploration readiness').toBeLessThanOrEqual(2500);
 expect.soft(p95,'Synchronous exploration step P95').toBeLessThanOrEqual(33.4);
 expect.soft(gzip,'Compressed exploration route code').toBeLessThanOrEqual(400000);
 expect.soft(assets,'Observed exploration route assets').toBeLessThanOrEqual(1500000);
 expect.soft(frames.idleP50,'Idle exploration frame P50').toBeLessThanOrEqual(16.7);
 expect.soft(frames.idleP95,'Idle exploration frame P95').toBeLessThanOrEqual(20);
 expect.soft(frames.stepP95,'Exploration movement-frame P95').toBeLessThanOrEqual(33.4);
});

for(const biome of ['forest','desert'] as const)test(`${biome} saved kinds, scaled inspection and reload use actual selected definitions`,async({page,isMobile})=>{
 test.setTimeout(120000);
 // Structural depth/slot fixtures isolate presentation, not preceding battle completion.
 const kinds = biome === 'forest' ? ['elite', 'vault'] as const : ['normal', 'boss'] as const;
 for(const kind of kinds){
  if(kind==='vault')await page.setViewportSize({width:320,height:568});
  if(kind==='boss')await page.setViewportSize({width:568,height:320});
  const { slot, state: saved } = savedBiomeEncounter(biome, kind);
  const floor=saved.floors[1],map=floorMap(floor.descriptor),target=poiCell(floor.exploration.pois[slot],map.width);
  const prior=neighbors(target,map.width,map.height).find(n=>map.cells[n]&&!floor.exploration.pois.some(p=>poiCell(p,map.width)===n));if(prior===undefined)throw Error('No safe approach');
  const state=atCell(saved,prior);
  await openSavedDungeon(page,state);
  await expect(page.locator('#dungeon-map')).toHaveAttribute('data-biome',biome);
  expect(await page.locator('#dungeon-screen').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
  await expect(page.locator('#dungeon-screen h1')).toHaveText(`Dungeon · Floor 2 · ${biome==='forest'?'Forest':'Desert'}`);
  const undiscovered=state.floors[1].exploration.pois.filter(p=>!state.floors[1].exploration.revealed.includes(poiCell(p,map.width)));
  for(const p of undiscovered)await expect(page.locator(`#dungeon-map [data-poi="${p.id}"]`)).toHaveCount(0);
  await walkDungeon(page,target,isMobile?'touch':'keyboard');
  try {
   await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  } catch (error) {
   const snapshot = await page.locator('#game').getAttribute('data-session', { timeout: 1000 }).catch(() => null);
   const opening: Awaited<ReturnType<typeof readSession>> | null = snapshot ? JSON.parse(snapshot) : null;
   await test.info().attach('encounter-opening', {
    body: JSON.stringify({
     biome, kind, seed: state.seed, phase: opening?.phase,
     commandCount: opening?.state.commandCount,
     activeUnit: opening?.state.initiative[opening.state.activeIndex],
    }),
    contentType: 'application/json',
   });
   throw error;
  }
  const label=kind==='boss'?'Guardian · Goblins':`${kind[0].toUpperCase()}${kind.slice(1)} encounter ${slot+1}`;
  await expect(page.locator('#battle-heading h1')).toHaveText(`Dungeon · Floor 2 · ${biome==='forest'?'Forest':'Desert'} · ${label}`);
  expect(await page.locator('#battle-shell').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
  const before=await dungeonSnapshot(page),session=await readSession(page),built=dungeonBattle(before)!,enemy=session.state.units.find(u=>u.side==='enemy')!;
  const stats=built.catalog.enemies[enemy.defId as 'goblin_grunt'|'goblin_archer'].stats;
  await (await battleTool(page, '#battle-party')).click();await page.locator(`#inspect-unit-${enemy.id}`).click();
  await expect(page.locator('#battle-dialog-message')).toContainText(`HP ${enemy.hp}/${stats.maxHp}`);await expect(page.locator('#battle-dialog-message')).toContainText(`AC ${stats.armorClass}`);
  await page.locator('#battle-dialog-title').scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath(`${biome}-${kind}-scaled-inspection.png`)});await page.locator('#inspection-close').click();
  expectSameProgress(await dungeonSnapshot(page), before);
  // Vitest restores all eight biome/kind combinations. Check the browser
  // reload once per biome, at the narrow inspection viewport.
  if(kind==='vault'||kind==='boss'){
   await page.reload();await expectDungeonResumed(page);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
   expectSameProgress(await dungeonSnapshot(page), before);await expect(page.locator('#battle-heading h1')).toContainText(label);
  }
 }
});

test('exploration keeps the map first on narrow screens and cells square across art styles',async({page,isMobile,viewport})=>{
 await page.goto('./?game=dungeon&entry=recovery');await page.getByRole('button',{name:'Play unsaved dungeon',exact:true}).click();
 const map = page.locator('#dungeon-map');
 const party = page.getByRole('region', { name: 'Party', exact: true });
 // Split the seven layout sizes among the three profiles in each engine.
 const sizes = !isMobile ? [{width:1280,height:800}]
  : viewport!.width < viewport!.height ? [{width:320,height:568},{width:393,height:852}]
  : [{width:667,height:375},{width:740,height:360},{width:812,height:375},{width:915,height:412}];
 for(const size of sizes){
  await page.setViewportSize(size);
  await page.locator('#dungeon-screen').evaluate(screen => { screen.scrollTop = 0; });
  await expect(map).toBeInViewport();
  if (size.width < size.height) {
   const layout = await page.locator('#dungeon-screen').evaluate(screen => {
    const map = screen.querySelector('#dungeon-map')!.getBoundingClientRect();
    const party = screen.querySelector('[aria-label="Party"]')!.getBoundingClientRect();
    return { mapTop: map.top, partyTop: party.top };
   });
   expect(layout.mapTop).toBeLessThan(layout.partyTop);
  } else {
   await expect(party).toBeInViewport({ ratio: 1 });
   for (const hero of ['Fighter', 'Ranger', 'Mage']) {
    await expect(party.locator(`meter[aria-label="${hero} health"]`)).toBeInViewport({ ratio: 1 });
   }
   expect(await page.locator('#dungeon-screen').evaluate(screen => screen.scrollWidth <= screen.clientWidth)).toBe(true);
  }
  for(const art of ['simple','legacy-8bit']){
   await page.locator('#dungeon-art').selectOption(art);
   const geometry = await map.locator('span').evaluateAll(cells => {
    const referenceHeight = cells[0]?.getBoundingClientRect().height;
    for (const [index, cell] of cells.entries()) {
     const { width, height } = cell.getBoundingClientRect();
     if (!(width > 0 && Math.abs(width - height) < 0.1 && Math.abs(height - referenceHeight) < 0.1)) {
      return { count: cells.length, invalid: { index, width, height, referenceHeight } };
     }
    }
    return { count: cells.length, invalid: null };
   });
   expect(geometry, `${art} cells at ${size.width}×${size.height}`).toEqual({ count: 400, invalid: null });
  }
 }
 await page.setViewportSize({width:393,height:852});await page.locator('#dungeon-map').scrollIntoViewIfNeeded();
 await page.screenshot({path:test.info().outputPath('square-overworld-mobile.png')});
});

test('depth 8 saved floor renders and accepts a step after reload', async ({page,isMobile,browserName}) => {
 const depth=8;
 const base=freshDungeon('large-floor-browser',19);
 const floors=Array.from({length:depth},(_,i)=>{const descriptor=floorDescriptor(base.seed,i+1),map=floorMap(descriptor);return {descriptor,position:descriptor.upstairs,completed:i===depth-1?0:3,exploration:freshExploration(descriptor.seed,descriptor.upstairs,map)};});
 await openSavedDungeon(page,{...base,depth,floors});
 const map=page.locator('#dungeon-map'); await expect(map.locator('[data-cell]')).toHaveCount(36 * 39);
 const assertLayout=async()=>{
  await expectDungeonMovementVisible(page);
  const geometry=await map.evaluate(grid=>{
   const bounds=grid.getBoundingClientRect();
   const cells=[...grid.querySelectorAll<HTMLElement>('[data-cell]')].map(cell=>cell.getBoundingClientRect());
   const screen=document.querySelector<HTMLElement>('#dungeon-screen')!;
   const controls=[...screen.querySelectorAll<HTMLElement>('.dungeon-directions button')];
   const region=grid.parentElement!,regionBounds=region.getBoundingClientRect();
   const clip={left:regionBounds.left+region.clientLeft,top:regionBounds.top+region.clientTop,right:regionBounds.left+region.clientLeft+region.clientWidth,bottom:regionBounds.top+region.clientTop+region.clientHeight};
   const visibleCells=cells.map(cell=>({left:Math.max(cell.left,clip.left),top:Math.max(cell.top,clip.top),right:Math.min(cell.right,clip.right),bottom:Math.min(cell.bottom,clip.bottom)}))
    .filter(cell=>cell.right>cell.left&&cell.bottom>cell.top);
   return {
    count:cells.length,
    outside:cells.filter(cell=>cell.left<bounds.left-.1||cell.right>bounds.right+.1||cell.top<bounds.top-.1||cell.bottom>bounds.bottom+.1).length,
    squareError:Math.max(...cells.map(cell=>Math.abs(cell.width-cell.height))),
    overlappingControls:controls.filter(control=>{const button=control.getBoundingClientRect();return visibleCells.some(cell=>Math.min(cell.right,button.right)-Math.max(cell.left,button.left)>.1&&Math.min(cell.bottom,button.bottom)-Math.max(cell.top,button.top)>.1);}).map(control=>control.id),
    screenOverflow:screen.scrollWidth-screen.clientWidth,
   };
  });
  expect(geometry.count).toBe(36 * 39);
  expect(geometry.outside,'Every cell must fit inside the map border box').toBe(0);
  expect(geometry.squareError).toBeLessThan(.1);
  expect(geometry.overlappingControls,'Direction controls must not cover a visible map cell').toEqual([]);
  expect(geometry.screenOverflow,'Only the exploration region should scroll horizontally').toBe(0);
 };
 await assertLayout();
 const viewport=page.viewportSize()!;
 await page.setViewportSize({width:740,height:360});
 await assertLayout();
 for (const width of [760, 800, 840, 915]) {
  await page.setViewportSize({width,height:740});
  const overflow=await map.evaluate(grid=>grid.parentElement!.scrollWidth-grid.parentElement!.clientWidth);
  expect(overflow,`The largest floor should fit at ${width}px`).toBe(0);
 }
 await page.setViewportSize({width:320,height:740});
 await assertLayout();
 if(isMobile&&browserName==='chromium'){
  const beforeSwipe=await dungeonSnapshot(page),geometry=await dungeonMovementGeometry(page);
  const swipe=await map.evaluate(grid=>{
   const region=grid.parentElement!,bounds=region.getBoundingClientRect();
   const increase=region.scrollWidth-region.clientWidth-region.scrollLeft>=region.scrollLeft;
   const start=bounds.left+region.clientLeft+region.clientWidth*(increase?.8:.2);
   const finish=bounds.left+region.clientLeft+region.clientWidth*(increase?.2:.8);
   return {start,finish,y:bounds.top+region.clientTop+region.clientHeight/2};
  });
  const session=await page.context().newCDPSession(page);
  try{
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:swipe.start,y:swipe.y,id:1}]});
   for(let step=1;step<=8;step++){
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:swipe.start+(swipe.finish-swipe.start)*step/8,y:swipe.y,id:1}]});
   }
   // Observe native scrolling, then hold the finger still so release does not add kinetic motion.
   await expect.poll(async()=>Math.abs((await dungeonMovementGeometry(page,false)).mapScroll.left-geometry.mapScroll.left)).toBeGreaterThan(1);
   await page.waitForTimeout(150);
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }finally{await session.detach();}
  const afterSwipe=await expectDungeonMovementVisible(page,false),stateAfterSwipe=await dungeonSnapshot(page);
  expect(afterSwipe.buttons,'A native map swipe must not move the direction controls').toEqual(geometry.buttons);
  expect(afterSwipe.scrollTop).toBe(geometry.scrollTop);
  expect(stateAfterSwipe.revision,'Swiping the map must not issue a movement command').toBe(beforeSwipe.revision);
  expect(stateAfterSwipe.floors).toEqual(beforeSwipe.floors);
 }
 const beforePan=await dungeonMovementGeometry(page);
 const horizontal=await map.evaluate(grid=>{
  const region=grid.parentElement!;
  region.scrollLeft=region.scrollWidth;
  const last=grid.lastElementChild!.getBoundingClientRect(), bounds=region.getBoundingClientRect();
  const result={scrollLeft:region.scrollLeft,lastColumnVisible:last.left>=bounds.left-.1&&last.right<=bounds.right+.1};
  return result;
 });
 expect(horizontal.scrollLeft).toBeGreaterThan(0);
 expect(horizontal.lastColumnVisible,'The final column must be reachable by scrolling').toBe(true);
 const afterPan=await expectDungeonMovementVisible(page,false);
 expect(afterPan.buttons,'Panning the map must not move its controls').toEqual(beforePan.buttons);
 expect(afterPan.scrollTop).toBe(beforePan.scrollTop);
 await page.evaluate(async()=>{
  window.dispatchEvent(new Event('resize'));
  await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
 });
 expect((await dungeonMovementGeometry(page,false)).mapScroll,'A resize notification without new map dimensions must preserve manual inspection').toEqual(afterPan.mapScroll);
 await page.locator('#dungeon-art').selectOption('legacy-8bit');
 expect((await dungeonMovementGeometry(page,false)).mapScroll,'Changing art must preserve manual map inspection').toEqual(afterPan.mapScroll);
 await page.setViewportSize(viewport);
 await page.locator('#dungeon-screen').evaluate(screen=>{screen.scrollTop=0;});
 await expectDungeonMovementVisible(page);
 await map.evaluate(grid=>{const state={grid,controls:[...document.querySelectorAll<HTMLElement>('#dungeon-art, .dungeon-directions button')],removed:false};(window as unknown as {__floorMount:typeof state}).__floorMount=state;new MutationObserver(records=>{if(records.some(record=>[...record.removedNodes].some(node=>node===grid || node.contains(grid))))state.removed=true;}).observe(document.querySelector('#dungeon-screen')!,{childList:true,subtree:true});});
 const before=await dungeonSnapshot(page), floor=before.floors[depth-1], layout=floorMap(floor.descriptor);
 const destination=neighbors(floor.position,layout.width,layout.height).find(n=>layout.cells[n]&&!floor.exploration.pois.some(p=>poiCell(p,layout.width)===n));
 if(destination===undefined) throw Error('No safe step on maximum floor');
 await walkDungeon(page,destination,isMobile?'touch':'keyboard');
 const after=await dungeonSnapshot(page);expect(after.floors[depth-1].position).toBe(destination);
 expect(await page.evaluate(()=>(window as unknown as {__floorMount:{removed:boolean}}).__floorMount.removed)).toBe(false);
 expect(await page.evaluate(()=>{const controls=(window as unknown as {__floorMount:{controls:HTMLElement[]}}).__floorMount.controls;return controls.length===5&&controls.every(control=>control.isConnected&&control===document.getElementById(control.id));})).toBe(true);
 await expect(page.locator('#dungeon-map-feedback')).toContainText(`Player cell ${destination}`);
 for(const [name,delta] of [['north',-layout.width],['east',1],['south',layout.width],['west',-1]] as const){
  const enabled=neighbors(destination,layout.width,layout.height).includes(destination+delta)&&Boolean(layout.cells[destination+delta]);
  await expect(page.locator(`#dungeon-step-${name}`)).toBeEnabled({enabled});
 }
 await assertLayout();
 await page.reload(); await expectDungeonResumed(page);
 await expect(map).toHaveAttribute('data-position',String(destination));
 await assertLayout();
});

test('maximum-size floor step responsiveness meets the established budget', async ({page}) => {
 const base=freshDungeon('large-floor-performance',19);
 const floors=Array.from({length:5},(_,i)=>{const descriptor=floorDescriptor(base.seed,i+1),map=floorMap(descriptor);return {descriptor,position:descriptor.upstairs,completed:3,exploration:freshExploration(descriptor.seed,descriptor.upstairs,map)};});
 const floor=floors[4],map=floorMap(floor.descriptor), stairs=[floor.descriptor.upstairs,floor.descriptor.downstairs];
 const first=map.cells.findIndex((v,i)=>v===1&&!stairs.includes(i)&&neighbors(i,map.width).some(n=>map.cells[n]&&!stairs.includes(n)));
 const second=neighbors(first,map.width).find(n=>map.cells[n]&&!stairs.includes(n));if(first<0||second===undefined)throw Error('No safe timing pair');
 const state=atCell({...base,depth:5,floors},first),encoded=encodeDungeon(state);if(!encoded.ok)throw Error(encoded.reason);
 await page.goto('./');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});await page.goto('./?game=dungeon');await expectDungeonResumed(page);
 const idleFrames=await page.evaluate(async()=>{const samples:number[]=[];let previous=await new Promise<number>(resolve=>requestAnimationFrame(resolve));for(let i=0;i<40;i++){const now=await new Promise<number>(resolve=>requestAnimationFrame(resolve));samples.push((Math.round(now*1000)-Math.round(previous*1000))/1000);previous=now;}return samples;});
 const times:number[]=[];
 for(let i=0;i<20;i++)times.push(await page.evaluate(destination=>{const start=performance.now();document.querySelector<HTMLElement>(`#dungeon-map [data-cell="${destination}"]`)!.click();return performance.now()-start;},i%2===0?second:first));
 const frames=await page.evaluate(async({a,b})=>{const samples:number[]=[];let previous=await new Promise<number>(resolve=>requestAnimationFrame(resolve));for(let i=0;i<40;i++){document.querySelector<HTMLElement>(`#dungeon-map [data-cell="${i%2===0?b:a}"]`)!.click();const now=await new Promise<number>(resolve=>requestAnimationFrame(resolve));samples.push((Math.round(now*1000)-Math.round(previous*1000))/1000);previous=now;}return samples;},{a:first,b:second});
 const percentile=(values:number[],q:number)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*q)-1];
 const p95=percentile(times,.95),frameP95=percentile(frames,.95);
 writeFileSync(test.info().outputPath('maximum-floor-step-performance.json'),JSON.stringify({idleFrames,times,p95,frames,frameP95,budgetMs:33.4,dimension:map.width},null,2));
 expect((await dungeonSnapshot(page)).floors[4].position).toBe(first);expect(p95).toBeLessThanOrEqual(33.4);expect(frameP95).toBeLessThanOrEqual(33.4);
});

test('closing on the guardian first holds contact and resumes its battle', { tag: '@desktop-chromium-portrait-webkit' }, async ({page,isMobile})=>{
 const slot=2;
 const {state,approach,target}=dungeonContactApproach(slot);
 await openSavedDungeon(page,state);
 await walkDungeon(page,approach,isMobile?'touch':'keyboard');
 await expect(page.locator('#dungeon-map')).toHaveAttribute('data-position',String(approach));
 await expect(page.locator(`#dungeon-map [data-cell="${target}"]`)).toHaveAttribute('data-poi',`enemy-${slot+1}`);
 // Use the reported WASD input on desktop, and the real compass tap on mobile.
 const delta=target-approach;
 if(isMobile)await page.locator(`#dungeon-step-${delta===-20?'north':delta===20?'south':delta===1?'east':'west'}`).tap();
 else {await page.locator('#dungeon-map').focus();await page.keyboard.press(delta===-20?'w':delta===20?'s':delta===1?'d':'a');}
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const entered=await dungeonSnapshot(page);
 await expect(page.locator('#battle-heading h1')).toContainText('Guardian');
 await expect(await battleTool(page, '#battle-party')).toBeVisible();
 await page.reload();await expectDungeonResumed(page);
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 expectSameProgress(await dungeonSnapshot(page),entered);
 await expect(page.locator('#battle-heading h1')).toContainText('Guardian');
 await expect(await battleTool(page, '#battle-party')).toBeVisible();
});

const dungeonEngineModule=/\/(?:start|BattleScene)-[^/]+\.js(?:\?.*)?$|\/src\/phaser\/(?:start|BattleScene)\.ts(?:\?.*)?$/;
async function loadEncounterWithoutEngine(page:Page,id:string,url='./?game=dungeon'){
 const initial=atEncounter(freshDungeon(id,1));
 await openSavedDungeon(page,initial,url);
 await expect(page.locator('#dungeon-map')).toBeVisible();
 await expect(page.locator('canvas')).toHaveCount(0);
 return initial;
}
const dungeonSlots=(page:Page)=>page.evaluate(keys=>({primary:localStorage.getItem(keys.primary),backup:localStorage.getItem(keys.backup)}),DUNGEON_KEYS);

async function finishRequestedDungeonModules(page:Page,requested:Set<string>){
 // Vite requests the entry chunks and their shared chunks through modulepreload.
 // Join only those observed requests; a prior navigation's networkidle flag is not proof of evaluation.
 const hints=await page.locator('link[rel="modulepreload"]').evaluateAll(links=>links.map(link=>(link as HTMLLinkElement).href));
 const urls=[...new Set([...requested,...hints.filter(url=>dungeonEngineModule.test(url))])];
 expect(urls.length).toBeGreaterThan(0);
 await expect.poll(()=>urls.every(url=>requested.has(url))).toBe(true);
 await page.evaluate(async urls=>{
  await Promise.all(urls.map(url=>import(url)));
  await new Promise<void>(resolve=>queueMicrotask(resolve));
 },urls);
}

test('unavailable battle modules preserve dungeon exploration, recovery and the saved encounter', { tag: '@mobile-landscape' }, async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const server=await startBattleModuleFaultServer('dungeon-engine');
 try {
 const initial=await loadEncounterWithoutEngine(page,'lazy-engine-unavailable',server.dungeonURL);
 expect(server.receipt().blocked).toBe(0);
 await page.getByRole('button',{name:'Enter encounter',exact:true}).click();
 await expect(page.locator('#dungeon-load-error')).toContainText('Could not load the encounter');
 expect(server.receipt().blocked).toBeGreaterThan(0);
 expect(server.receipt().assets.some(asset=>asset.responses['503']>0)).toBe(true);
 const pending=await dungeonSnapshot(page),saved=await dungeonSlots(page);
 expect(pending.id).toBe(initial.id);expect(pending.phase).toBe('battle');expect(pending.revision).toBe(initial.revision+1);
 expect(JSON.parse(saved.primary!).payload).toEqual(pending);
 await expect(page.getByRole('button',{name:'Save recovery',exact:true})).toBeEnabled();
 await expect(page.getByRole('button',{name:'Start new dungeon',exact:true})).toBeEnabled();
 await page.locator('#dungeon-map').focus();await page.keyboard.press('ArrowRight');
 expect(await dungeonSnapshot(page)).toEqual(pending);expect(await dungeonSlots(page)).toEqual(saved);
 await expect(page.locator('canvas')).toHaveCount(0);
 server.allowImport();
 await page.getByRole('button',{name:'Reload page',exact:true}).click();
 await expectDungeonResumed(page);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const resumed=await dungeonSnapshot(page);
 expect(resumed.id).toBe(pending.id);expect(resumed.depth).toBe(pending.depth);
 expect(resumed.activeBattle!.seed).toBe(pending.activeBattle!.seed);
 expect(server.receipt().allowed).toBeGreaterThan(0);
 expect(server.receipt().assets.filter(asset=>asset.blocked>0).every(asset=>asset.responses['200']+asset.responses['304']>0)).toBe(true);
 expect(errors).toEqual([]);
 }finally {
  writeFileSync(info.outputPath('module-http-fault.json'),JSON.stringify(server.receipt(),null,2));
  await server.close();
 }
});

test('delayed dungeon loading locks repeated entry and waits for recovery to close', { tag: '@mobile-portrait' }, async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 let release!:()=>void;const requests=new Set<string>();
 const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route(dungeonEngineModule,async route=>{requests.add(route.request().url());await gate;await route.continue();});
 try {
  const initial=await loadEncounterWithoutEngine(page,'lazy-engine-recovery');
  await page.getByRole('button',{name:'Enter encounter',exact:true}).evaluate(button=>{(button as HTMLButtonElement).click();(button as HTMLButtonElement).click();});
  await expect.poll(()=>requests.size).toBeGreaterThan(0);
  await expect(page.getByRole('heading',{name:'Loading encounter',exact:true})).toBeVisible();
  await expect(page.locator('#game')).toHaveAttribute('data-ready','false');
  await expect(page.locator('#game')).not.toHaveAttribute('data-phase','player');
  const pending=await dungeonSnapshot(page),saved=await dungeonSlots(page);
  expect(pending.revision).toBe(initial.revision+1);
  await page.getByRole('button',{name:'Save recovery',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Dungeon save recovery');
  release();
  // Drain the deferred module graph before asserting that no engine mounted behind the modal.
  await finishRequestedDungeonModules(page,requests);
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await dungeonSnapshot(page)).toEqual(pending);expect(await dungeonSlots(page)).toEqual(saved);
  await page.locator('#dungeon-close-recovery').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  expect((await dungeonSnapshot(page)).id).toBe(pending.id);
  await expect(page.locator('canvas')).toHaveCount(1);expect(errors).toEqual([]);
 }finally {release();}
});

for(const interruption of ['restart','pagehide','visible'] as const)test(interruption==='visible'?'hidden dungeon engine resumes once when visible':`pending dungeon engine cannot mount after ${interruption}`, { tag: interruption === 'visible' ? '@mobile-landscape' : '@mobile-portrait' }, async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 let release!:()=>void;const requests=new Set<string>();
 const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route(dungeonEngineModule,async route=>{requests.add(route.request().url());await gate;await route.continue();});
 try {
  const initial=await loadEncounterWithoutEngine(page,`lazy-engine-${interruption}`);
  await page.getByRole('button',{name:'Enter encounter',exact:true}).click();
  await expect.poll(()=>requests.size).toBeGreaterThan(0);
  if(interruption==='restart'){
   await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();
   await page.locator('#dungeon-confirm-new').click();
   await expect(page.locator('#dungeon-map')).toBeVisible();
   const fresh=await dungeonSnapshot(page);expect(fresh.id).not.toBe(initial.id);expect(fresh.seed).not.toBe(initial.seed);expect(fresh.phase).toBe('ready');
  }else {
   await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:true}));
  }
  const retained=await dungeonSnapshot(page),saved=await dungeonSlots(page);
  release();await finishRequestedDungeonModules(page,requests);
  await expect(page.locator('canvas')).toHaveCount(0);
  if(interruption==='pagehide'){
   // This exercises disposal callbacks and deferred visibility work, not an actual BFCache traversal.
   await page.evaluate(()=>{
    window.dispatchEvent(new Event('pagehide'));
    Object.defineProperty(document,'hidden',{configurable:true,value:false});
    document.dispatchEvent(new Event('visibilitychange'));
   });
  }
  expect(await dungeonSnapshot(page)).toEqual(retained);expect(await dungeonSlots(page)).toEqual(saved);
  if(interruption==='visible'){
   await page.evaluate(()=>{
    Object.defineProperty(document,'hidden',{configurable:true,value:false});
    document.dispatchEvent(new Event('visibilitychange'));
   });
   await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
   const resumed=await dungeonSnapshot(page);
   expect(resumed.id).toBe(retained.id);expect(resumed.activeBattle!.seed).toBe(retained.activeBattle!.seed);
   await expect(page.locator('canvas')).toHaveCount(1);
  }else await expect(page.locator('canvas')).toHaveCount(0);
  if(interruption==='restart'){
   await page.reload();await expectDungeonResumed(page);
   expectSameProgress(await dungeonSnapshot(page),retained);
  }
  expect(errors).toEqual([]);
 }finally {release();}
});

test('pending dungeon engine cannot mount during the final replacement history write', { tag: '@mobile-landscape' }, async ({ page }) => {
 let release!:()=>void; const requests=new Set<string>();
 const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route(dungeonEngineModule,async route=>{requests.add(route.request().url());await gate;await route.continue();});
 try {
  const initial=await loadEncounterWithoutEngine(page,'lazy-engine-records-replacement');
  await page.getByRole('button',{name:'Enter encounter',exact:true}).click();
  await expect.poll(()=>requests.size).toBeGreaterThan(0);
  const releaseHistory=await holdFinalRecordsWrite(page);
  await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();
  await page.locator('#dungeon-confirm-new').click();
  await expect(page.locator('html')).toHaveAttribute('data-records-held','yes');
  const retained=await dungeonSnapshot(page); expect(retained.id).not.toBe(initial.id);
  release();await finishRequestedDungeonModules(page,requests);
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await dungeonSnapshot(page)).toEqual(retained);
  await releaseHistory();
  await expect(page.locator('#dungeon-map')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await dungeonSnapshot(page)).toEqual(retained);
 }finally {release();}
});

test('adopting a recovered dungeon invalidates the pending encounter load', { tag: '@mobile-portrait' }, async({page,isMobile})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 let release!:()=>void;const requests=new Set<string>();
 const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route(dungeonEngineModule,async route=>{requests.add(route.request().url());await gate;await route.continue();});
 try {
  const initial=await loadEncounterWithoutEngine(page,'lazy-engine-before-adoption');
  await page.getByRole('button',{name:'Enter encounter',exact:true}).click();
  await expect.poll(()=>requests.size).toBeGreaterThan(0);
  const adopted=freshDungeon('lazy-engine-adopted',7),encoded=encodeDungeon(adopted);
  if(!encoded.ok)throw Error(encoded.reason);
  await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.backup,text:encoded.text});
  await page.getByRole('button',{name:'Save recovery',exact:true}).click();
  await page.locator('#dungeon-continue-backup').click();
  const retained=await dungeonSnapshot(page),saved=await dungeonSlots(page);
  expect(retained).toEqual(adopted);expect(retained.id).not.toBe(initial.id);
  release();await finishRequestedDungeonModules(page,requests);
  await expect(page.locator('#dungeon-map')).toBeVisible();await expect(page.locator('canvas')).toHaveCount(0);
  expect(await dungeonSnapshot(page)).toEqual(retained);expect(await dungeonSlots(page)).toEqual(saved);
  const floor=retained.floors[0],map=floorMap(floor.descriptor);
  const next=neighbors(floor.position,map.width).find(cell=>map.cells[cell]&&cell!==floor.descriptor.downstairs&&!floor.exploration.pois.some(p=>poiCell(p,map.width)===cell));
  if(next===undefined)throw Error('No safe recovered-floor step');
  await walkDungeon(page,next,isMobile?'touch':'keyboard');
  const stepped=await dungeonSnapshot(page);
  expect(stepped.id).toBe(adopted.id);expect(stepped.phase).toBe('ready');expect(stepped.floors[0].position).toBe(next);
  expect(JSON.parse((await dungeonSlots(page)).primary!).payload).toEqual(stepped);
  await expect(page.locator('canvas')).toHaveCount(0);expect(errors).toEqual([]);
 }finally {release();}
});

fixedSeedTest('class guidance: unsaved dungeon keeps dismissals in memory until saving and resuming the same run',async({page,isMobile})=>{
 test.setTimeout(90000);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const key='tactics-guru:class-guidance';
 const sentinel={runId:'dungeon:saved-guidance-sentinel',ids:['skill:ability:taunt:v1']};
 await page.addInitScript(({key,sentinel})=>{
  if(localStorage.getItem(key)===null)localStorage.setItem(key,JSON.stringify({version:1,enabled:true,seen:[],dismissedRuns:[sentinel],resetRevision:0}));
 },{key,sentinel});
 const preferences=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);
 const activate=async(control:Locator)=>{
  if(isMobile)await control.tap();else {await control.focus();await page.keyboard.press('Enter');}
 };
 await page.goto('./?game=dungeon&entry=recovery');
 await activate(page.getByRole('button',{name:'Play unsaved dungeon',exact:true}));
 await expect(page.locator('#dungeon-map')).toBeVisible();
 const runId=(await dungeonSnapshot(page)).id;
 await walkDungeon(page,undefined,isMobile?'touch':'keyboard');
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const guidance=page.locator('#battle-class-guidance'),tip=page.locator('#battle-class-tip');
 await expect(guidance).toBeVisible();
 const tipId=await tip.getAttribute('data-tutorial-id');expect(tipId).toBeTruthy();
 const before=await readSession(page),dungeonBefore=await dungeonSnapshot(page);
 expect(dungeonBefore.id).toBe(runId);expect(await dungeonSlots(page)).toEqual({primary:null,backup:null});
 await activate(page.locator('#battle-guidance-dismiss'));
 await expect(guidance).toBeHidden();await expect(page.locator('#battle-move')).toBeFocused();
 expect(await readSession(page)).toEqual(before);expectSameProgress(await dungeonSnapshot(page),dungeonBefore);
 // A throwaway attempt may acknowledge lessons without consuming a durable
 // dismissal-history slot belonging to a saved dungeon.
 expect((await preferences()).seen).toContain(tipId);
 expect((await preferences()).dismissedRuns).toEqual([sentinel]);
 expect(await dungeonSlots(page)).toEqual({primary:null,backup:null});
 await activate(page.getByRole('button',{name:'Save recovery',exact:true}));
 await activate(page.locator('#dungeon-retry-save'));
 await expect(page.locator('#battle-dialog')).toBeHidden();
 await expect.poll(async()=>JSON.parse((await dungeonSlots(page)).primary??'null')?.payload?.id).toBe(runId);
 const expectedDismissals=[sentinel,{runId:`dungeon:${runId}`,ids:[tipId]}];
 await expect.poll(async()=>(await preferences()).dismissedRuns).toEqual(expectedDismissals);
 expect((await readSession(page)).state).toEqual(before.state);await expect(guidance).toBeHidden();
 expectSameProgress(JSON.parse((await dungeonSlots(page)).primary!).payload,dungeonBefore);
 await page.reload();await expectDungeonResumed(page);
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 expect((await dungeonSnapshot(page)).id).toBe(runId);expect((await readSession(page)).state).toEqual(before.state);
 await expect(guidance).toBeHidden();expect((await preferences()).dismissedRuns).toEqual(expectedDismissals);
 expect(errors).toEqual([]);
});

test('a second dungeon encounter reuses the engine after a legal victory without reloading', { tag: '@desktop-chromium-portrait-webkit' }, async({page,isMobile})=>{
 test.setTimeout(90000);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 // The fixture reaches this ongoing battle through legal domain commands; the browser enacts its final attack.
 const witness=dungeonVictoryBoundary(1,0);if(!witness)throw Error('Missing legal victory boundary');
 await openSavedDungeon(page,witness.snapshot);
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 expect((await readSession(page)).state).toEqual(witness.snapshot.activeBattle);
 const guidance=page.locator('#battle-class-guidance'),tip=page.locator('#battle-class-tip');
 await expect(guidance).toBeVisible();
 const beforeDismiss=await readSession(page),beforeDungeon=await dungeonSnapshot(page);
 const dismissedActor=beforeDismiss.state.units.find(unit=>unit.id===beforeDismiss.state.initiative[beforeDismiss.state.activeIndex])!;
 const dismissedTip=await tip.getAttribute('data-tutorial-id');expect(dismissedTip).toBeTruthy();
 const dismiss=page.locator('#battle-guidance-dismiss');
 if(isMobile)await dismiss.tap();else {await dismiss.focus();await page.keyboard.press('Enter');}
 // This legal victory boundary has already used movement; focus returns to
 // the enabled End turn control, not the unavailable Move control.
 expect(dismissedActor.hasMoved).toBe(true);
 await expect(guidance).toBeHidden();await expect(page.locator('#battle-move')).toBeDisabled();
 await expect(page.locator('#battle-next')).toBeFocused();
 expect(await readSession(page)).toEqual(beforeDismiss);expectSameProgress(await dungeonSnapshot(page),beforeDungeon);
 // Continuing the same saved dungeon must retain this run's dismissal, even
 // though it reconstructs the battle HUD. Both encounters below then reuse
 // the resumed engine without another page load.
 await page.reload();await expectDungeonResumed(page);
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 expect((await dungeonSnapshot(page)).id).toBe(witness.snapshot.id);
 expect((await readSession(page)).state).toEqual(beforeDismiss.state);
 await expect(guidance).toBeHidden();
 await expect(page.locator('canvas')).toHaveCount(1);
 const canvas=await page.locator('#game canvas').elementHandle();if(!canvas)throw Error('Missing initial battle canvas');
 await playCommand(page,witness.command);
 await expect(page.getByRole('heading',{name:'Saved reward choice',exact:true})).toBeVisible();
 const won=await dungeonSnapshot(page);
 expect(won.phase).toBe('reward');expect(won.floors[0].completed).toBe(1);expect(won.activeBattle).toBeNull();
 const decline=page.getByRole('button',{name:'Decline reward',exact:true});
 if(isMobile)await decline.tap();else await decline.click();
 await page.locator('#dungeon-item-confirm').click();
 const ready=await acceptedDungeonSnapshot(page,won);
 expect(ready.phase).toBe('ready');expect(ready.offer).toBeNull();expect(ready.ownership).toEqual(won.ownership);
 const floor=ready.floors[0],next=floor.exploration.pois.find(p=>p.encounterSlot===1)!;
 await walkDungeon(page,poiCell(next,floor.descriptor.size??20),isMobile?'touch':'keyboard');
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const second=await dungeonSnapshot(page),session=await readSession(page);
 expect(second.phase).toBe('battle');expect(second.id).toBe(witness.snapshot.id);
 expect(second.floors[0].exploration.active).toBe(1);
 expect(second.activeBattle!.seed).toBe(dungeonSeed(second.seed,second.depth,'battle',1));
 expect(second.activeBattle!.seed).not.toBe(witness.snapshot.activeBattle!.seed);
 expect(session.state).toEqual(second.activeBattle);
 await expect(page.locator('canvas')).toHaveCount(1);
 expect(await canvas.evaluate(node=>node.isConnected&&node===document.querySelector('#game canvas'))).toBe(true);
 const command=playerDecision(session.state,dungeonBattle(second)!.catalog),beforeCommands=session.replay?.commands??session.continuation!.commands;
 await playCommand(page,command);
 await expect.poll(async()=>(await readSession(page)).state.commandCount).toBeGreaterThan(session.state.commandCount);
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const after=await readSession(page),saved=await dungeonSnapshot(page);
 // The HUD represents a single automatic missile by unitId, as in the Shaman journey.
 const accepted=command.type==='useAbility'&&command.abilityId==='ability:magic_missile'&&'missileTargets' in command.target&&command.target.missileTargets.length===1
  ?{...command,target:{unitId:command.target.missileTargets[0]}}:command;
 expect((after.replay?.commands??after.continuation!.commands)[beforeCommands.length]).toEqual(accepted);
 expect(after.state).toEqual(saved.activeBattle);
 const persisted=JSON.parse((await dungeonSlots(page)).primary!).payload as DungeonState;
 // Playtime checkpoints can run between the persisted and rendered snapshots.
 expect({...persisted,stats:{...persisted.stats!,activeMs:saved.stats!.activeMs}}).toEqual(saved);
 // The normal first encounter leaves this class at level one. Its only tip
 // remains dismissed in the next encounter, while other classes still teach.
 expect(second.party.find(hero=>hero.heroId===dismissedActor.defId)!.level).toBe(1);
 let current=after;
 for(let turns=0;turns<second.activeBattle!.initiative.length;turns++){
  const actor=current.state.units.find(unit=>unit.id===current.state.initiative[current.state.activeIndex])!;
  if(actor.defId===dismissedActor.defId)break;
  await expect(guidance).toBeVisible();await expect(tip).not.toHaveAttribute('data-tutorial-id',dismissedTip!);
  const commands=current.state.commandCount;
  await endTurn(page, selector=>isMobile?page.locator(selector).tap():page.locator(selector).press('Enter'));
  await expect.poll(async()=>(await readSession(page)).state.commandCount).toBeGreaterThan(commands);
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');current=await readSession(page);
 }
 expect(current.state.units.find(unit=>unit.id===current.state.initiative[current.state.activeIndex])!.defId).toBe(dismissedActor.defId);
 await expect(guidance).toBeHidden();
 await expect(page.locator('canvas')).toHaveCount(1);
 expect(await canvas.evaluate(node=>node.isConnected&&node===document.querySelector('#game canvas'))).toBe(true);
 expect(errors).toEqual([]);
});

test('warm maximum-size floor step responsiveness meets the established budget after a legal victory',async({page,isMobile})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 // Legal domain play reaches the ongoing boundary; the real HUD enacts its winning command.
 const witness=dungeonVictoryBoundary(1,0);if(!witness)throw Error('Missing legal victory boundary');
 const battleSave=encodeDungeon(witness.snapshot);if(!battleSave.ok)throw Error(battleSave.reason);
 await page.goto('./');
 await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:battleSave.text});
 await page.goto('./?game=dungeon');await expectDungeonResumed(page);
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 expect((await readSession(page)).state).toEqual(witness.snapshot.activeBattle);
 await expect(page.locator('canvas')).toHaveCount(1);
 const canvas=await page.locator('#game canvas').elementHandle();if(!canvas)throw Error('Missing battle canvas');
 const canvasIdentity=()=>canvas.evaluate(node=>({connected:node.isConnected,sameCanvas:node===document.querySelector('#game canvas'),count:document.querySelectorAll('canvas').length,timeOrigin:performance.timeOrigin}));
 const originalCanvas=await canvasIdentity();
 await playCommand(page,witness.command);
 await expect(page.getByRole('heading',{name:'Saved reward choice',exact:true})).toBeVisible();
 const won=await dungeonSnapshot(page);
 expect(won.phase).toBe('reward');expect(won.floors[0].completed).toBe(1);expect(won.activeBattle).toBeNull();
 const decline=page.getByRole('button',{name:'Decline reward',exact:true});
 if(isMobile)await decline.tap();else await decline.click();
 await page.locator('#dungeon-item-confirm').click();
 await expect.poll(async()=>(await dungeonSnapshot(page)).phase).toBe('ready');
 const ready=await dungeonSnapshot(page);expect(ready.phase).toBe('ready');expect(ready.offer).toBeNull();

 // This history is structural, not earned floor-five progression. Real recovery adopts it
 // without navigation, retaining the engine created by the legally completed battle above.
 const base=freshDungeon('warm-large-floor-performance',19);
 const floors=Array.from({length:5},(_,i)=>{const descriptor=floorDescriptor(base.seed,i+1),map=floorMap(descriptor);return {descriptor,position:descriptor.upstairs,completed:3,exploration:freshExploration(descriptor.seed,descriptor.upstairs,map)};});
 const floor=floors[4],map=floorMap(floor.descriptor),stairs=[floor.descriptor.upstairs,floor.descriptor.downstairs];
 const first=map.cells.findIndex((v,i)=>v===1&&!stairs.includes(i)&&neighbors(i,map.width).some(n=>map.cells[n]&&!stairs.includes(n)));
 const second=neighbors(first,map.width).find(n=>map.cells[n]&&!stairs.includes(n));if(first<0||second===undefined)throw Error('No safe timing pair');
 const state=atCell({...base,depth:5,floors},first),encoded=encodeDungeon(state);if(!encoded.ok)throw Error(encoded.reason);
 await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
 const recover=page.getByRole('button',{name:'Save recovery',exact:true});
 if(isMobile)await recover.tap();else await recover.click();
 await page.locator('#dungeon-continue-primary').click();
 const adopted=await dungeonSnapshot(page);expect(adopted).toEqual(JSON.parse(encoded.text).payload);
 await expect(page.locator('#dungeon-map [data-cell]')).toHaveCount(36*36);
 await page.keyboard.press('Tab');
 await page.locator(`#dungeon-map [data-cell="${first}"]`).evaluate(cell=>cell.scrollIntoView({block:'center',inline:'center',behavior:'instant'}));
 await page.locator('#dungeon-map').evaluate(grid=>(grid as HTMLElement).focus({preventScroll:true}));
 const visibleGrid=()=>page.locator('#dungeon-map').evaluate((grid,{first,second})=>{
  const rect=(element:Element)=>{const b=element.getBoundingClientRect();return {left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};
  const region=grid.parentElement!,screen=document.querySelector<HTMLElement>('#dungeon-screen')!;
  const regionBounds=rect(region),screenBounds=rect(screen);
  const clip={left:Math.max(0,screenBounds.left,regionBounds.left+region.clientLeft),top:Math.max(0,screenBounds.top,regionBounds.top+region.clientTop),right:Math.min(innerWidth,screenBounds.right,regionBounds.left+region.clientLeft+region.clientWidth),bottom:Math.min(innerHeight,screenBounds.bottom,regionBounds.top+region.clientTop+region.clientHeight)};
  const intersection=(bounds:ReturnType<typeof rect>)=>({width:Math.max(0,Math.min(bounds.right,clip.right)-Math.max(bounds.left,clip.left)),height:Math.max(0,Math.min(bounds.bottom,clip.bottom)-Math.max(bounds.top,clip.top))});
  const bounds=rect(grid);
  return {visibility:document.visibilityState,focused:document.activeElement===grid,focusVisible:grid.matches(':focus-visible'),viewport:{width:innerWidth,height:innerHeight},bounds,intersection:intersection(bounds),clip,regionScroll:{left:region.scrollLeft,top:region.scrollTop},screenScroll:screen.scrollTop,cells:[first,second].map(index=>{
   const cell=grid.querySelector<HTMLElement>(`[data-cell="${index}"]`)!,bounds=rect(cell),visible=intersection(bounds);
   const hit=visible.width>0&&visible.height>0?document.elementFromPoint((Math.max(bounds.left,clip.left)+Math.min(bounds.right,clip.right))/2,(Math.max(bounds.top,clip.top)+Math.min(bounds.bottom,clip.bottom))/2):null;
   return {index,bounds,intersection:visible,player:cell.hasAttribute('data-player'),unoccluded:hit===cell||!!hit&&cell.contains(hit)};
  })};
 },{first,second});
 const before={canvas:await canvasIdentity(),grid:await visibleGrid()};
 await page.screenshot({path:test.info().outputPath('warm-maximum-floor-visible.png'),fullPage:false});
 expect(before.canvas).toEqual(originalCanvas);
 expect(before.grid.visibility).toBe('visible');expect(before.grid.focused).toBe(true);expect(before.grid.focusVisible).toBe(true);
 for(const cell of before.grid.cells){expect(cell.intersection.width).toBeGreaterThanOrEqual(cell.bounds.width-.1);expect(cell.intersection.height).toBeGreaterThanOrEqual(cell.bounds.height-.1);expect(cell.unoccluded).toBe(true);}
 expect(before.grid.cells.find(cell=>cell.player)?.index).toBe(first);

 // Measure dispatch separately from async save publication. Every sampled click must commit.
 // Retain 40 idle intervals, 20 dispatch samples and every frame across 40 accepted moves.
 const idleFrames=await page.evaluate(async()=>{const samples:number[]=[];let previous=await new Promise<number>(resolve=>requestAnimationFrame(resolve));for(let i=0;i<40;i++){const now=await new Promise<number>(resolve=>requestAnimationFrame(resolve));samples.push((Math.round(now*1000)-Math.round(previous*1000))/1000);previous=now;}return samples;});
 const times:number[]=[];
 for(let i=0;i<20;i++){
  const destination=i%2===0?second:first;
  times.push(await page.evaluate(destination=>{const start=performance.now();document.querySelector<HTMLElement>(`#dungeon-map [data-cell="${destination}"]`)!.click();return performance.now()-start;},destination));
  // Waiting is outside the dispatch-cost sample and cannot turn a refused click into a sample.
  await expect.poll(async()=>{const current=await dungeonSnapshot(page);return {id:current.id,depth:current.depth,phase:current.phase,revision:current.revision,position:current.floors[4].position};})
   .toEqual({id:adopted.id,depth:5,phase:'ready',revision:adopted.revision+i+1,position:destination});
 }
 const acceptanceTimeoutMs=5000;
 const frames=await page.evaluate(async({a,b,id,initialRevision,acceptanceTimeoutMs})=>{
  const samples:number[]=[];
  const nextFrame=(deadline:number)=>new Promise<number>((resolve,reject)=>{
   let frame=0;
   const timer=setTimeout(()=>{cancelAnimationFrame(frame);reject(Error('Timed out waiting for an accepted movement frame'));},Math.max(0,deadline-performance.now()));
   frame=requestAnimationFrame(now=>{clearTimeout(timer);resolve(now);});
  });
  let previous=await nextFrame(performance.now()+acceptanceTimeoutMs);
  for(let i=0;i<40;i++){
   const destination=i%2===0?b:a,expectedRevision=initialRevision+i+1;
   const deadline=performance.now()+acceptanceTimeoutMs;
   document.querySelector<HTMLElement>(`#dungeon-map [data-cell="${destination}"]`)!.click();
   for(;;){
    const now=await nextFrame(deadline);
    samples.push((Math.round(now*1000)-Math.round(previous*1000))/1000);previous=now;
    const current=JSON.parse(document.querySelector<HTMLElement>('#game')!.dataset.dungeonSnapshot!) as DungeonState;
    if(current.id!==id||current.depth!==5||current.phase!=='ready'||current.revision>expectedRevision)
     throw Error('Unexpected dungeon boundary while measuring accepted movement');
    if(current.revision===expectedRevision&&current.floors[4].position===destination)break;
    if(performance.now()>=deadline)throw Error(`Movement revision ${expectedRevision} was not published`);
   }
  }
  return samples;
 },{a:first,b:second,id:adopted.id,initialRevision:adopted.revision+20,acceptanceTimeoutMs});
 const percentile=(values:number[],q:number)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*q)-1];
 const p95=percentile(times,.95),frameP95=percentile(frames,.95),stepped=await dungeonSnapshot(page);
 const after={canvas:await canvasIdentity(),grid:await visibleGrid()};
 writeFileSync(test.info().outputPath('warm-maximum-floor-step-performance.json'),JSON.stringify({fixture:'structural five-floor history adopted through recovery; not earned floor-five progression',warmup:{seed:witness.snapshot.seed,depth:witness.snapshot.depth,command:witness.command,completed:won.floors[0].completed},measurement:{times:'20 synchronous click-dispatch costs; async revision and position confirmation occurs outside each sample',frames:'Every animation-frame interval across 40 sequential accepted moves, including all intervals waiting for async publication',acceptanceTimeoutMs},dimension:map.width,first,second,before,after,idleFrames,times,p95,frames,frameP95,budgetMs:33.4,revision:{before:adopted.revision,after:stepped.revision}},null,2));
 expect(after.canvas).toEqual(originalCanvas);
 expect(after.grid.visibility).toBe('visible');expect(after.grid.focused).toBe(true);expect(after.grid.focusVisible).toBe(true);
 for(const cell of after.grid.cells){expect(cell.intersection.width).toBeGreaterThanOrEqual(cell.bounds.width-.1);expect(cell.intersection.height).toBeGreaterThanOrEqual(cell.bounds.height-.1);expect(cell.unoccluded).toBe(true);}
 expect(after.grid.cells.find(cell=>cell.player)?.index).toBe(first);
 expect(stepped.id).toBe(adopted.id);expect(stepped.depth).toBe(5);expect(stepped.phase).toBe('ready');
 expect(stepped.floors[4].position).toBe(first);expect(stepped.revision).toBe(adopted.revision+60);
 expect(JSON.parse((await dungeonSlots(page)).primary!).payload).toEqual(stepped);expect(errors).toEqual([]);
 expect(p95).toBeLessThanOrEqual(33.4);expect(frameP95).toBeLessThanOrEqual(33.4);
});

test('Guardian-first reward, map and encounter state survive claim and reload at depth 5', { tag: '@desktop-chromium-portrait-webkit' }, async({page,isMobile})=>{
 const reward=guardianFirstRewardFixture();
 const floor=reward.floors[reward.depth-1],map=floorMap(floor.descriptor);
 const rewardPanel=page.getByRole('region',{name:'Rewards',exact:true});
 const accessibleMap=page.getByRole('application',{name:/Floor \d+ map/});
 const checkMap=async()=>{
  await expect(page.locator('#dungeon-map [data-cell]')).toHaveCount(map.cells.length);
  await expect(page.locator('[aria-label="Discovered places"]')).toHaveCount(0);
  const sight = currentSight(floor.position, map);
  for (const poi of floor.exploration.pois.slice(0, 2)) {
   await expect(page.locator(`#dungeon-map [data-poi="${poi.id}"]`)).toHaveCount(sight.includes(poiCell(poi, map.width)) ? 1 : 0);
  }
 };
 await openSavedDungeon(page,reward);await checkMap();
 await expect(rewardPanel).toBeVisible();
 await expect(accessibleMap).toHaveAccessibleDescription(/Guardian · Goblins at row \d+, column \d+\. Reward pending\./);
 const claim=rewardPanel.getByRole('button',{name:/^Claim /}).first();
 const confirm=page.locator('#dungeon-item-confirm');
 if(isMobile){await claim.tap();await confirm.tap();}
 else {await claim.click();await confirm.click();}
 await expect(rewardPanel).toHaveCount(0);
 await expect(accessibleMap).toHaveAccessibleDescription(/Guardian · Goblins at row \d+, column \d+\. Cleared\./);
 await page.reload();await expectDungeonResumed(page);await checkMap();
 await expect(rewardPanel).toHaveCount(0);
 await expect(accessibleMap).toHaveAccessibleDescription(/Guardian · Goblins at row \d+, column \d+\. Cleared\./);
});
