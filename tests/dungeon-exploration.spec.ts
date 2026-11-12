import { dungeonOffer } from '../src/domain/dungeon';
import { checkedDungeon } from './helpers/dungeonFixtures';
import { expect,test } from './helpers/startupDiagnostics';
import type { Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dungeonSnapshot, walkDungeon, continueSavedDungeon } from './helpers/dungeonTraversal';
import { currentSight, neighbors, poiCell } from '../src/domain/exploration';
import { generateMap } from '../src/map/generate';
import { freshDungeon, floorDescriptor, floorMap, readDungeon, dungeonSeed, stepDungeon, type DungeonState } from '../src/domain/dungeon';
import { legacyDungeonIdentity } from '../src/content/dungeon';
import { canonical, hashJson } from '../src/domain/contentIdentity';
import { DUNGEON_KEYS } from '../src/persistence/dungeonStorage';
import { readSession,playCommand } from './helpers/battlePolicy';
import { installRailControls } from './helpers/forceRailControls';
import { playerDecision } from './helpers/playerPolicy';
import { dungeonBattle } from '../src/domain/dungeon';
import { atCell, atEncounter, atStairApproach, dungeonCapacityFixture, priorDungeonEnvelope, dungeonContactApproach, dungeonVictoryBoundary } from './helpers/dungeonFixtures';
import { LEGACY_ENCOUNTER_POLICY } from '../src/domain/dungeonEncounters';
import { freshExploration, movableExploration } from '../src/domain/exploration';
import { encodeDungeon, utf8Bytes } from '../src/domain/dungeonSaveEnvelope';
import { holdFinalRecordsWrite } from './helpers/recordsWriteGate';
import { startBattleModuleFaultServer } from './helpers/battleModuleFaultServer';

const fixedSeedTest = test.extend({ pinDungeonSeed: 28 });
test.beforeEach(async ({ context }) => { await installRailControls(context); });
test('map markers respect stair availability, discovery and saved floor state',async({page,isMobile})=>{
 const base=freshDungeon('marker-browser',1),floor=base.floors[0];
 const load=async(state:DungeonState)=>{
  const encoded=encodeDungeon(state);if(!encoded.ok)throw Error(encoded.reason);
  await page.goto('./?game=dungeon');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
  await page.reload();await continueSavedDungeon(page);
 };
 const reload=async()=>{await page.reload();await continueSavedDungeon(page);};
 const cell=(index:number)=>page.locator(`#dungeon-map [data-cell="${index}"]`);
 const accessibleMap=page.getByRole('application',{name:/Floor \d+ map/});
 // Structural saved-state fixtures isolate rendering; they do not prove preceding battle completion.
 const revealed={...floor,exploration:{...floor.exploration,revealed:Array.from({length:400},(_,i)=>i)}};
 await load({...base,floors:[{...revealed,position:floor.position}]});
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
 await expect(page.getByText('● Player · M encounter (including guardian)',{exact:false})).toBeVisible();
 await expect(page.locator('#dungeon-descend')).toHaveCount(0);
 await page.locator('#dungeon-map').screenshot({path:test.info().outputPath('markers-uncleared-map.png')});
 const firstStep=neighbors(floor.position).find(n=>firstMap.cells[n]&&!floor.exploration.pois.some(p=>poiCell(p,firstMap.width)===n))!;
 await walkDungeon(page,firstStep,isMobile?'touch':'keyboard');
 await expect(cell(floor.descriptor.upstairs)).toHaveText('');
 await reload();await expect(cell(floor.descriptor.upstairs)).toHaveText('');
 // Completion alone cannot reveal an undiscovered staircase.
 await load({...base,floors:[{...floor,completed:3}]});
 await expect(cell(floor.descriptor.downstairs)).toHaveClass('explore-hidden');
 await expect(accessibleMap).not.toHaveAccessibleDescription(/Downstairs at/);
 const hiddenPoi = floor.exploration.pois.map(p=>poiCell(p,firstMap.width)).find(i=>!floor.exploration.revealed.includes(i))!;
 await expect(cell(hiddenPoi)).toHaveClass('explore-hidden');
 await expect(accessibleMap).not.toHaveAccessibleDescription(new RegExp(`at row ${Math.floor(hiddenPoi / firstMap.width) + 1}, column ${hiddenPoi % firstMap.width + 1}\\.`));
 await load({...base,floors:[{...revealed,position:floor.position,completed:3}]});
 await expect(cell(floor.descriptor.downstairs)).toHaveText('↓');
 const downstairs = new RegExp(`Downstairs at row ${Math.floor(floor.descriptor.downstairs / firstMap.width) + 1}, column ${floor.descriptor.downstairs % firstMap.width + 1}\\.$`);
 await expect(accessibleMap).toHaveAccessibleDescription(/Guardian · Goblins at row \d+, column \d+\. Cleared\./);
 for(const poi of floor.exploration.pois)await expect(cell(poiCell(poi))).toHaveText('✓');
 await reload();await expect(cell(floor.descriptor.downstairs)).toHaveText('↓');
 await expect(accessibleMap).toHaveAccessibleDescription(downstairs);
 await page.locator('#dungeon-map').scrollIntoViewIfNeeded();
 await page.locator('#dungeon-map').screenshot({path:test.info().outputPath('markers-cleared-map.png')});
 const descriptor=floorDescriptor(base.seed,2),exploration=freshExploration(descriptor.seed,descriptor.upstairs,floorMap(descriptor));
 const second={descriptor,completed:0,position:descriptor.upstairs,exploration};
 await load({...base,depth:2,floors:[{...floor,completed:3},second]});
 const map=floorMap(descriptor),adjacent=neighbors(descriptor.upstairs,map.width,map.height).find(n=>map.cells[n]&&!exploration.pois.some(p=>poiCell(p,map.width)===n))!;
 await walkDungeon(page,adjacent,isMobile?'touch':'keyboard');await expect(cell(descriptor.upstairs)).toHaveText('↑');
 await expect(accessibleMap).toHaveAccessibleDescription(/^Upstairs at row \d+, column \d+\./);
 await reload();await expect(cell(descriptor.upstairs)).toHaveText('↑');
 await page.locator('#dungeon-map').scrollIntoViewIfNeeded();
 await page.locator('#dungeon-map').screenshot({path:test.info().outputPath('markers-upper-floor-map.png')});
 if(isMobile){await page.setViewportSize({width:320,height:740});await page.locator('#dungeon-map').scrollIntoViewIfNeeded();}
 expect(await page.locator('#dungeon-screen').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
});

test('live markers follow current sight across movement, art changes and reload', async ({ page, isMobile }) => {
 const base = freshDungeon('sight-movement', 1), map = floorMap(base.floors[0].descriptor);
 const encounterCell = (state: DungeonState, slot: number) => poiCell(state.floors[0].exploration.pois[slot], map.width);
 for (const entering of [true, false]) {
  let witness: { before: DungeonState; after: DungeonState; slot: number } | undefined;
  for (const [position, open] of map.cells.entries()) {
   if (!open || base.floors[0].exploration.pois.some(poi => poiCell(poi, map.width) === position)) continue;
   const before = atCell(base, position);
   for (const destination of neighbors(position, map.width, map.height)) {
    const result = stepDungeon(before, { id: before.id, depth: before.depth, revision: before.revision, destination });
    if (!result.ok || result.state.phase !== 'ready') continue;
    const beforeSight = currentSight(position, map), afterSight = currentSight(destination, map);
    const slot = before.floors[0].exploration.pois.findIndex((_, i) => {
     const oldCell = encounterCell(before, i), newCell = encounterCell(result.state, i);
     return beforeSight.includes(oldCell) === !entering &&
      afterSight.includes(oldCell) === !entering && afterSight.includes(newCell) === entering;
    });
    if (slot >= 0) {
     witness = { before, after: result.state, slot };
     break;
    }
   }
   if (witness) break;
  }
  if (!witness) throw Error('Missing encounter sight transition');
  const { before, after, slot } = witness, encoded = encodeDungeon(before);
  if (!encoded.ok) throw Error(encoded.reason);
  const marker = page.locator(`#dungeon-map [data-poi="enemy-${slot + 1}"]`);
  const accessibleMap = page.getByRole('application', { name: /Floor 1 map/ });
  const label = slot === 2 ? 'Guardian · Goblins' : `encounter ${slot + 1}`;
  const check = async (state: DungeonState, visible: boolean) => {
   await expect(marker).toHaveCount(visible ? 1 : 0);
   if (visible) {
    const index = encounterCell(state, slot);
    await expect(marker).toHaveText('M');
    await expect(marker).toHaveAttribute('data-cell', String(index));
    await expect(accessibleMap).toHaveAccessibleDescription(new RegExp(
     `${label} at row ${Math.floor(index / map.width) + 1}, column ${index % map.width + 1}\\.`));
   } else {
    await expect(accessibleMap).not.toHaveAccessibleDescription(new RegExp(label));
   }
  };
  await page.goto('./?game=dungeon');
  await page.evaluate(({ key, text }) => localStorage.setItem(key, text), { key: DUNGEON_KEYS.primary, text: encoded.text });
  await page.reload();
  await continueSavedDungeon(page);
  await check(before, !entering);
  await walkDungeon(page, after.floors[0].position, isMobile ? 'touch' : 'keyboard');
  await check(after, entering);
  const previousSight = currentSight(before.floors[0].position, map);
  const nextSight = currentSight(after.floors[0].position, map);
  const remembered = previousSight.find(cell => !nextSight.includes(cell));
  if (remembered === undefined) throw Error('Missing remembered cell');
  const rememberedCell = page.locator(`#dungeon-map [data-cell="${remembered}"]`);
  await expect(rememberedCell).toHaveClass(/explore-remembered/);
  await page.locator('#dungeon-art').selectOption('legacy-8bit');
  await check(after, entering);
  expect(await dungeonSnapshot(page)).toEqual(after);
  await page.reload();
  await continueSavedDungeon(page);
  await check(after, entering);
  await expect(rememberedCell).toHaveClass(/explore-remembered/);
  expect(await dungeonSnapshot(page)).toEqual(after);
 }
});

test('stairs remain visible under cleared saved markers and live markers stay visible',async({page})=>{
 const base=freshDungeon('stair-overlap',1), descriptor=floorDescriptor(base.seed,2), initial=freshExploration(descriptor.seed,descriptor.upstairs,floorMap(descriptor));
 const map=floorMap(descriptor), from=neighbors(descriptor.upstairs,map.width,map.height).find(n=>map.cells[n]&&!initial.pois.some(p=>poiCell(p,map.width)===n));
 if(from===undefined)throw Error('No safe approach');
 const explore=movableExploration(initial,descriptor.seed,0,'ready');
 const pois=explore.pois.map((p,i)=>i===0?{...p,x:descriptor.upstairs%map.width,y:Math.floor(descriptor.upstairs/map.width)}:p);
 const state=atCell({...base,depth:2,floors:[{...base.floors[0],completed:3},{descriptor,position:descriptor.upstairs,completed:0,exploration:{...explore,pois}}]},from);
 const load=async(s:DungeonState)=>{const encoded=encodeDungeon(s);if(!encoded.ok)throw Error(encoded.reason);await page.goto('./?game=dungeon');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});await page.reload();await continueSavedDungeon(page);};
 const stair=page.locator(`#dungeon-map [data-cell="${descriptor.upstairs}"]`);
 await load(state);await expect(stair).toHaveText('M');
 const floor=state.floors[1];await load({...state,floors:[state.floors[0],{...floor,completed:1,exploration:{...floor.exploration,cleared:[0]}}]});
 await expect(stair).toHaveText('↑');await page.reload();await continueSavedDungeon(page);await expect(stair).toHaveText('↑');
 const down=descriptor.downstairs, moved=pois.map((p,i)=>i===0?{...p,x:down%map.width,y:Math.floor(down/map.width)}:p);
 const all={...floor,completed:3,exploration:{...floor.exploration,pois:moved,cleared:[0,1,2],revealed:Array.from({length:map.width*map.height},(_,i)=>i)}};
 await load({...state,floors:[state.floors[0],all]});await expect(page.locator(`#dungeon-map [data-cell="${down}"]`)).toHaveText('↓');
});

test('fresh descent leaves room to move off the arrival stairs before battle', async ({page,isMobile})=>{
 // Seed 6074 previously placed the Desert Guardian immediately east of the landing.
 const base=freshDungeon('safe-arrival',6074);
 const approach=atStairApproach({...base,floors:[{...base.floors[0],completed:3}]});
 const encoded=encodeDungeon(approach);
 if(!encoded.ok)throw Error(encoded.reason);
 await page.goto('./?game=dungeon');
 await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
 await page.reload();await continueSavedDungeon(page);

 const mode=isMobile?'touch':'keyboard';
 await walkDungeon(page,approach.floors[0].descriptor.downstairs,mode);
 const arrived=await dungeonSnapshot(page), floor=arrived.floors[1], map=floorMap(floor.descriptor);
 expect(arrived).toMatchObject({depth:2,phase:'ready',activeBattle:null,party:approach.party});
 expect(floor.position).toBe(floor.descriptor.upstairs);
 const east=floor.position+1;
 expect(map.cells[east]).toBe(1);
 await expect(page.getByRole('heading',{name:'Explore Desert · Floor 2'})).toBeVisible();
 await page.reload();await continueSavedDungeon(page);
 expect(await dungeonSnapshot(page)).toEqual(arrived);

 await walkDungeon(page,east,mode);
 const moved=await dungeonSnapshot(page);
 expect(moved).toMatchObject({depth:2,phase:'ready',activeBattle:null});
 expect(moved.floors[1].position).toBe(east);
 const landing=[floor.position,...neighbors(floor.position,map.width,map.height)];
 expect(floor.exploration.pois.every(p=>!landing.includes(poiCell(p,map.width)))).toBe(true);
});

for(const control of ['arrows','wasd','compass','cell'] as const)test(`stairs travel once per entry with ${control}, stay on arrival and restore, and respect locks`,async({page,isMobile})=>{
 test.setTimeout(240000);
 const base=freshDungeon('stairs-browser',1),cleared={...base,floors:[{...base.floors[0],completed:3}]};
 const load=async(state:DungeonState)=>{
  const encoded=encodeDungeon(state);if(!encoded.ok)throw Error(encoded.reason);
  await page.goto('./?game=dungeon');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
  await page.reload();await continueSavedDungeon(page);
 };
 const reload=async()=>{await page.reload();await continueSavedDungeon(page);};
 const move=async(destination:number)=>{
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
 };
 // Structural clear-floor input isolates traversal. The legal guardian journey separately proves unlock.
 const approach=atStairApproach(cleared);await load(approach);
 await move(approach.floors[0].descriptor.downstairs);
 const second=await dungeonSnapshot(page),upper=second.floors[1];expect(second.depth).toBe(2);expect(second.revision).toBe(approach.revision+1);
 expect(upper.position).toBe(upper.descriptor.upstairs);expect(second.party).toEqual(approach.party);expect(second.ownership).toEqual(approach.ownership);
 await expect(page.locator('#dungeon-map')).toHaveAttribute('data-position',String(upper.position));
 await expect(page.locator('#dungeon-ascend, #dungeon-descend')).toHaveCount(0);
 await reload();expect(await dungeonSnapshot(page)).toEqual(second);
 const off=atStairApproach(second,'ascend').floors[1].position;
 await move(off);expect((await dungeonSnapshot(page)).depth).toBe(2);
 await move(upper.descriptor.upstairs);
 const first=await dungeonSnapshot(page);expect(first.depth).toBe(1);expect(first.revision).toBe(second.revision+2);
 expect(first.floors[0].position).toBe(first.floors[0].descriptor.downstairs);
 await reload();expect(await dungeonSnapshot(page)).toEqual(first);
 await page.screenshot({path:test.info().outputPath(`stairs-${control}-arrival.png`),fullPage:true});
 // Floor-one upstairs and uncleared downstairs remain ordinary walkable cells.
 for(const direction of ['ascend','descend'] as const){
  const locked=atStairApproach(base,direction);await load(locked);
  const cell=direction==='ascend'?base.floors[0].descriptor.upstairs:base.floors[0].descriptor.downstairs;
  await move(cell);const after=await dungeonSnapshot(page);expect(after.depth).toBe(1);expect(after.floors[0].position).toBe(cell);
  await reload();expect(await dungeonSnapshot(page)).toEqual(after);
 }
});

test('diamond compass directions, focus, touch targets and unavailable states',async({page,isMobile,browserName})=>{
 const fresh=freshDungeon('compass-browser',1),base={...fresh,floors:[{...fresh.floors[0],completed:3}]},floor=base.floors[0],map=generateMap(floor.descriptor.seed,'rooms');
 const directions=[['North',-20],['East',1],['South',20],['West',-1]] as const;
 const safe=(cell:number)=>map.cells[cell]&&!floor.exploration.pois.some(p=>poiCell(p)===cell);
 const center=map.cells.findIndex((_,cell)=>safe(cell)&&neighbors(cell).length===4&&neighbors(cell).every(safe));
 expect(center).toBeGreaterThanOrEqual(0);
 const load=async(state:DungeonState)=>{
  const encoded=encodeDungeon(state);if(!encoded.ok)throw Error(encoded.reason);
  await page.goto('./?game=dungeon');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
  await page.reload();await continueSavedDungeon(page);
 };
 await load(atCell(base,center));
 const compass=page.getByRole('group',{name:'Move player',exact:true});
 await expect(compass.getByRole('button')).toHaveCount(4);
 await expect(compass.locator('.dungeon-compass-center')).toHaveAttribute('aria-hidden','true');
 expect(await compass.locator('.dungeon-compass-center').evaluate(node=>getComputedStyle(node).pointerEvents)).toBe('none');
 await compass.scrollIntoViewIfNeeded();
 const boxes=[];
 for(const [name] of directions){
  const button=compass.getByRole('button',{name,exact:true});await expect(button).toHaveText(name[0]);await expect(button).toBeEnabled();
  const box=(await button.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);boxes.push(box);
  expect(await button.evaluate(node=>{
   const rect=node.getBoundingClientRect(),cx=rect.x+rect.width/2,cy=rect.y+rect.height/2;
   return [[0,0],[20,0],[-20,0],[0,20],[0,-20]].every(([dx,dy])=>node.contains(document.elementFromPoint(cx+dx,cy+dy)));
  })).toBe(true);
  const upright=await button.locator('span').evaluate(node=>({button:getComputedStyle(node.parentElement!).transform,label:getComputedStyle(node).transform}));
  expect(upright.button).toBe('matrix(0.707107, 0.707107, -0.707107, 0.707107, 0, 0)');
  expect(upright.label).toBe('matrix(0.707107, -0.707107, 0.707107, 0.707107, 0, 0)');
 }
 expect(boxes[0].y).toBeLessThan(boxes[1].y);expect(boxes[2].y).toBeGreaterThan(boxes[1].y);expect(boxes[3].x).toBeLessThan(boxes[0].x);expect(boxes[1].x).toBeGreaterThan(boxes[0].x);
 await page.locator('#dungeon-map').focus();await page.keyboard.press(browserName==='webkit'?'Alt+Tab':'Tab');
 await expect(compass.getByRole('button',{name:'North',exact:true})).toBeFocused();
 expect(await compass.getByRole('button',{name:'North',exact:true}).evaluate(node=>node.matches(':focus-visible')&&getComputedStyle(node).outlineStyle==='solid')).toBe(true);
 await page.screenshot({path:test.info().outputPath('compass-focus.png')});
 for(const [name,delta] of directions){
  const before=await dungeonSnapshot(page),button=compass.getByRole('button',{name,exact:true});
  if(isMobile)await button.tap();else {await button.focus();await page.keyboard.press(name==='North'?'Enter':'Space');}
  expect((await dungeonSnapshot(page)).floors[0].position).toBe(center+delta);
  expect((await dungeonSnapshot(page)).revision).toBe(before.revision+1);
  const reverse=directions.find(([,offset])=>offset===-delta)![0];
  const back=compass.getByRole('button',{name:reverse,exact:true});if(isMobile)await back.tap();else await back.click();
  expect((await dungeonSnapshot(page)).floors[0].position).toBe(center);
 }
 if(!isMobile){
  const north=compass.getByRole('button',{name:'North',exact:true});await north.hover();await page.mouse.down();
  expect(await north.evaluate(node=>getComputedStyle(node).boxShadow)).not.toBe('none');
  await page.screenshot({path:test.info().outputPath('compass-pressed.png')});await page.mouse.up();
 }
 const wallPosition=map.cells.findIndex((_,cell)=>safe(cell)&&neighbors(cell).some(next=>!map.cells[next]));
 await load(atCell(base,wallPosition));const before=await dungeonSnapshot(page);
 for(const [name,delta] of directions){
  const unavailable=!neighbors(wallPosition).includes(wallPosition+delta)||!map.cells[wallPosition+delta];
  const button=compass.getByRole('button',{name,exact:true});
  if(unavailable){await expect(button).toBeDisabled();await button.evaluate(node=>(node as HTMLButtonElement).click());}
  else await expect(button).toBeEnabled();
 }
 expect(await dungeonSnapshot(page)).toEqual(before);
 await compass.scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath('compass-unavailable.png')});
 if(isMobile){await page.setViewportSize({width:320,height:740});await compass.scrollIntoViewIfNeeded();}
 expect(await page.locator('#dungeon-screen').evaluate(node=>node.scrollWidth<=node.clientWidth)).toBe(true);
 const compassBox=(await compass.boundingBox())!;expect(compassBox.x).toBeGreaterThanOrEqual(0);expect(compassBox.x+compassBox.width).toBeLessThanOrEqual(page.viewportSize()!.width);
 await load(dungeonCapacityFixture());
 for(const [name] of directions)await expect(compass.getByRole('button',{name,exact:true})).toBeDisabled();
 const reward=await dungeonSnapshot(page);await page.locator('#dungeon-map').focus();await page.keyboard.press('ArrowUp');expect(await dungeonSnapshot(page)).toEqual(reward);
});

test('compass keeps keyboard focus when movement disables the activated direction',async({page})=>{
 const fresh=freshDungeon('compass-browser',1),initial=atCell({...fresh,floors:[{...fresh.floors[0],completed:3}]},27),encoded=encodeDungeon(initial);
 if(!encoded.ok)throw Error(encoded.reason);
 for(const key of ['Enter','Space']){
  await page.goto('./?game=dungeon');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
  await page.reload();await continueSavedDungeon(page);
  const west=page.getByRole('button',{name:'West',exact:true}),map=page.locator('#dungeon-map');
  await expect(west).toBeEnabled();await west.focus();await page.keyboard.press(key);
  const moved=await dungeonSnapshot(page);expect(moved.floors[0].position).toBe(26);expect(moved.revision).toBe(initial.revision+1);
  await expect(west).toBeDisabled();await expect(map).toBeFocused();
  expect(await map.evaluate(node=>node.matches(':focus-visible')&&getComputedStyle(node).outlineStyle==='solid')).toBe(true);
  await page.screenshot({path:test.info().outputPath(`compass-focus-fallback-${key}.png`)});
  await page.keyboard.press('ArrowLeft');expect(await dungeonSnapshot(page)).toEqual(moved);await expect(map).toBeFocused();
  await page.keyboard.press('ArrowRight');const returned=await dungeonSnapshot(page);
  expect(returned.floors[0].position).toBe(27);expect(returned.revision).toBe(initial.revision+2);await expect(map).toBeFocused();await expect(west).toBeEnabled();
 }
});

fixedSeedTest('map shortcuts work on entry and outside the map without taking over other controls', async ({page}) => {
 await page.goto('./?game=dungeon');
 await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();
 await page.locator('#dungeon-confirm-new').click();
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
 const moved = await dungeonSnapshot(page);
 expect(moved.floors[0].position).toBe(floor.position + direction.offset);
 expect(moved.revision).toBe(initial.revision + 1);

 const art = page.getByRole('combobox',{name:'Map art',exact:true});
 await art.focus();
 await page.keyboard.press(direction.reverse);
 expect(await dungeonSnapshot(page)).toEqual(moved);
 await page.evaluate(() => {
  const input = document.createElement('input');
  input.id = 'shortcut-test-input';
  document.querySelector('#dungeon-screen')!.append(input);
  input.focus();
 });
 await page.keyboard.press(direction.reverse);
 await expect(page.locator('#shortcut-test-input')).toHaveValue(direction.reverse);
 expect(await dungeonSnapshot(page)).toEqual(moved);
 const restart = page.getByRole('button',{name:'Start new dungeon',exact:true});
 await restart.click();
 await page.keyboard.press(direction.reverse);
 expect(await dungeonSnapshot(page)).toEqual(moved);
 await page.locator('#dungeon-cancel-new').click();

 await restart.focus();
 await page.keyboard.press(direction.reverse);
 const returned = await dungeonSnapshot(page);
 expect(returned.floors[0].position).toBe(floor.position);
 expect(returned.revision).toBe(moved.revision + 1);
 await expect(restart).toBeFocused();

 const menu = page.getByRole('link',{name:'Main menu',exact:true});
 await menu.focus();
 await page.keyboard.press(direction.arrow);
 const movedAgain = await dungeonSnapshot(page);
 expect(movedAgain.revision).toBe(returned.revision + 1);
 await expect(menu).toBeFocused();

 const wasd = page.getByRole('checkbox',{name:'Enable WASD movement'});
 await expect(wasd).toBeChecked();
 await wasd.uncheck();
 await expect(grid).toHaveAccessibleName(/Arrow keys move one cell/);
 await restart.focus();
 await page.keyboard.press(direction.reverse);
 expect(await dungeonSnapshot(page)).toEqual(movedAgain);
 await grid.focus();
 await page.keyboard.press(direction.reverse);
 expect(await dungeonSnapshot(page)).toEqual(movedAgain);
 await expect(grid).toBeFocused();

 await page.reload();
 await continueSavedDungeon(page);
 await expect(wasd).not.toBeChecked();
 await restart.focus();
 await page.keyboard.press(direction.reverseArrow);
 const arrowOnly = await dungeonSnapshot(page);
 expect(arrowOnly.floors[0].position).toBe(floor.position);
 expect(arrowOnly.revision).toBe(movedAgain.revision + 1);
 await expect(restart).toBeFocused();
});

fixedSeedTest('real traversal, art independence, keyboard locks, active battle and exact reload',async({page,isMobile})=>{
 test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 // Qualify input/art/reload on a traversable witness, independently of fresh entropy.
 await page.goto('./?game=dungeon');await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await page.locator('#dungeon-confirm-new').click();
 const initial=await dungeonSnapshot(page),f=initial.floors[0],map=generateMap(f.descriptor.seed,'rooms');
 await expect(page.locator('#dungeon-start-encounter')).toHaveCount(0);await expect(page.locator('#dungeon-map')).not.toContainText('↑');
 const adjacent=neighbors(f.position).find(n=>map.cells[n])!;
 await walkDungeon(page,adjacent,isMobile?'touch':'pointer');const stepped=await dungeonSnapshot(page);expect(stepped.revision).toBe(initial.revision+1);
 await page.locator('#dungeon-map').focus();await page.keyboard.down('ArrowUp');await page.keyboard.up('ArrowUp');const after=await dungeonSnapshot(page);
 await page.locator('#dungeon-map').dispatchEvent('keydown',{key:'ArrowUp',repeat:true});expect(await dungeonSnapshot(page)).toEqual(after);
 await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await page.keyboard.press('ArrowDown');expect(await dungeonSnapshot(page)).toEqual(after);await page.locator('#dungeon-cancel-new').click();
 await page.locator('#dungeon-map').evaluate(n=>n.dataset.identity='retained');
 await page.getByRole('combobox',{name:'Map art',exact:true}).selectOption('legacy-8bit');await expect(page.locator('#dungeon-map')).toHaveAttribute('data-art','legacy-8bit');
 if(f.descriptor.biome==='desert-v1')await expect(page.locator('#dungeon-map-feedback')).toContainText('fallback');else await expect(page.locator('#dungeon-map-feedback')).not.toContainText('fallback');expect(await dungeonSnapshot(page)).toEqual(after);
 await page.getByRole('combobox',{name:'Map art',exact:true}).selectOption('simple');expect(await dungeonSnapshot(page)).toEqual(after);
 await expect(page.locator('#dungeon-map')).toHaveAttribute('data-identity','retained');
 await expect.poll(()=>page.locator('.dungeon-directions button').evaluateAll(nodes=>nodes.length===4&&nodes.every(n=>{const b=n.getBoundingClientRect();return b.width>=44&&b.height>=44;}))).toBe(true);
 await page.locator('#dungeon-map').scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath('exploration-revealed.png'),fullPage:true});
 expect(await page.locator('#dungeon-screen').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
 await walkDungeon(page,undefined,isMobile?'touch':'keyboard');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const battle=await dungeonSnapshot(page);expect(battle.phase).toBe('battle');expect(battle.floors[0].position).toBe(poiCell(battle.floors[0].exploration.pois[battle.floors[0].exploration.active!]));
 const command=playerDecision((await readSession(page)).state,dungeonBattle(battle)!.catalog);await playCommand(page,command);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');const saved=await dungeonSnapshot(page);
 await page.reload();await continueSavedDungeon(page);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');expect(await dungeonSnapshot(page)).toEqual(saved);
 writeFileSync(test.info().outputPath('spatial-battle-receipt.json'),JSON.stringify({initial,stepped,saved},null,2));expect(errors).toEqual([]);
});
test('pre-progression dungeon remains incompatible and exportable',async({page})=>{
 const raw=priorDungeonEnvelope(freshDungeon('legacy-browser',13,LEGACY_ENCOUNTER_POLICY),1);
 await page.goto('./?game=dungeon');await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:DUNGEON_KEYS.primary,raw});await page.reload();
 await expect(page.getByRole('button',{name:'Continue saved dungeon',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export primary save',exact:true}).click();await download;
 expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary)).toBe(raw);
});

test('cold progression-format Continue retains a long saved history within the startup budget',async({page})=>{
 const base=freshDungeon('cold-browser',13),floors=Array.from({length:250},(_,i)=>{
  const descriptor=floorDescriptor(base.seed,i+1);
  return {descriptor,completed:i===249?0:3,position:descriptor.upstairs,exploration:freshExploration(descriptor.seed,descriptor.upstairs,floorMap(descriptor))};
 });
 const encoded=encodeDungeon({...base,depth:250,floors});if(!encoded.ok)throw Error(encoded.reason);
 await page.goto('./?game=dungeon');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
 const begin=Date.now();await page.reload();await continueSavedDungeon(page);
 await expect(page.locator('#dungeon-map')).toBeVisible();const coldUsableMs=Date.now()-begin;
 expect(coldUsableMs).toBeLessThanOrEqual(2500);
 const state=await dungeonSnapshot(page);expect(state.depth).toBe(250);expect(state.floors).toHaveLength(250);
 expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary)).toBe(encoded.text);
 writeFileSync(test.info().outputPath('cold-current-history.json'),JSON.stringify({floors:250,bytes:utf8Bytes(encoded.text),coldUsableMs,budgetMs:2500,rawRetained:true}));
 await page.screenshot({path:test.info().outputPath('cold-current-history.png')});
});

test('map input stays inert while hidden and retains discovery through resize and failed art',async({page})=>{
 await page.route('**/map-art/**',route=>route.abort());await page.goto('./?game=dungeon');await page.getByRole('button',{name:'Play unsaved dungeon',exact:true}).click();
 const before=await dungeonSnapshot(page);await page.locator('#dungeon-art').selectOption('legacy-8bit');await expect(page.locator('#dungeon-map-feedback')).toContainText('fallback');expect(await dungeonSnapshot(page)).toEqual(before);
 await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:true}));await page.locator('#dungeon-map').focus();await page.keyboard.press('ArrowRight');expect(await dungeonSnapshot(page)).toEqual(before);
 await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));const size=page.viewportSize()!;await page.setViewportSize({width:size.height,height:size.width});expect(await dungeonSnapshot(page)).toEqual(before);
 await page.screenshot({path:test.info().outputPath('exploration-rotated-fallback.png'),fullPage:true});
});
test('records route transfer and map responsiveness against established budgets',async({page,request})=>{
 const begin=Date.now();await page.goto('./?game=dungeon');await expect(page.getByRole('heading',{name:'Dungeon floors',exact:true})).toBeVisible();const coldUsableMs=Date.now()-begin;
 await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();
 const floorCreationMs=await page.locator('#dungeon-confirm-new').evaluate(button=>{const begin=performance.now();(button as HTMLButtonElement).click();return performance.now()-begin;});const timings:number[]=[];
 const created=await dungeonSnapshot(page),cleared={...created,floors:[{...created.floors[0],completed:3}]};
 const encoded=encodeDungeon(cleared);if(!encoded.ok)throw Error(encoded.reason);
 await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});await page.reload();await continueSavedDungeon(page);
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
 for(const kind of ['normal','elite','vault','boss'] as const){
  if(kind==='vault')await page.setViewportSize({width:320,height:568});
  if(kind==='boss')await page.setViewportSize({width:568,height:320});
  const slot=kind==='normal'?0:kind==='boss'?2:1;
  let state: DungeonState|null=null;
  for(let seed=0;seed<128&&!state;seed++){
   const base=freshDungeon('biome-view',seed),descriptor=floorDescriptor(seed,2),selection=descriptor.encounters[slot].selection;
   if(descriptor.biome!==`${biome}-v1`||selection.kind!==kind)continue;
   const candidate={...base,depth:2,floors:[{...base.floors[0],completed:3},{descriptor,position:descriptor.upstairs,completed:slot,exploration:freshExploration(descriptor.seed,descriptor.upstairs,floorMap(descriptor))}]};
   const read=readDungeon(candidate);if(!read.ok)throw Error(read.reason);state=read.state;
  }
  if(!state)throw Error('No kind fixture');
  const floor=state.floors[1],map=floorMap(floor.descriptor),target=poiCell(floor.exploration.pois[slot],map.width);
  const prior=neighbors(target,map.width,map.height).find(n=>map.cells[n]&&!floor.exploration.pois.some(p=>poiCell(p,map.width)===n));if(prior===undefined)throw Error('No safe approach');
  state=atCell(state,prior);const encoded=encodeDungeon(state);if(!encoded.ok)throw Error(encoded.reason);
  await page.goto('./?game=dungeon');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});await page.reload();await continueSavedDungeon(page);
  await expect(page.locator('#dungeon-map')).toHaveAttribute('data-biome',biome);
  expect(await page.locator('#dungeon-screen').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
  await expect(page.locator('#dungeon-screen h1')).toHaveText(`Dungeon · Floor 2 · ${biome==='forest'?'Forest':'Desert'}`);
  const undiscovered=state.floors[1].exploration.pois.filter(p=>!state!.floors[1].exploration.revealed.includes(poiCell(p,map.width)));
  for(const p of undiscovered)await expect(page.locator(`#dungeon-map [data-poi="${p.id}"]`)).toHaveCount(0);
  await walkDungeon(page,target,isMobile?'touch':'keyboard');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const label=kind==='boss'?'Guardian · Goblins':`${kind[0].toUpperCase()}${kind.slice(1)} encounter ${slot+1}`;
  await expect(page.locator('#battle-heading h1')).toHaveText(`Dungeon · Floor 2 · ${biome==='forest'?'Forest':'Desert'} · ${label}`);
  expect(await page.locator('#battle-shell').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
  const before=await dungeonSnapshot(page),session=await readSession(page),built=dungeonBattle(before)!,enemy=session.state.units.find(u=>u.side==='enemy')!;
  const stats=built.catalog.enemies[enemy.defId as 'goblin_grunt'|'goblin_archer'].stats;
  await page.locator('#battle-party').click();await page.locator(`#inspect-unit-${enemy.id}`).click();
  await expect(page.locator('#battle-dialog-message')).toContainText(`HP ${enemy.hp}/${stats.maxHp}`);await expect(page.locator('#battle-dialog-message')).toContainText(`AC ${stats.armorClass}`);
  await page.locator('#battle-dialog-title').scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath(`${biome}-${kind}-scaled-inspection.png`)});await page.locator('#inspection-close').click();
  expect(await dungeonSnapshot(page)).toEqual(before);
  await page.reload();await continueSavedDungeon(page);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  expect(await dungeonSnapshot(page)).toEqual(before);await expect(page.locator('#battle-heading h1')).toContainText(label);
 }
});

 test('exploration cells stay square across viewport sizes and art styles',async({page})=>{
 await page.goto('./?game=dungeon');await page.getByRole('button',{name:'Play unsaved dungeon',exact:true}).click();
 for(const viewport of [{width:320,height:740},{width:393,height:852},{width:915,height:412},{width:1280,height:800}]){
  await page.setViewportSize(viewport);
  for(const art of ['simple','legacy-8bit']){
   await page.locator('#dungeon-art').selectOption(art);
   const sizes=await page.locator('#dungeon-map span').evaluateAll(cells=>cells.map(cell=>{const r=cell.getBoundingClientRect();return {width:r.width,height:r.height};}));
   expect(sizes).toHaveLength(400);
   for(const size of sizes){expect(size.width).toBeGreaterThan(0);expect(Math.abs(size.width-size.height)).toBeLessThan(0.1);expect(Math.abs(size.height-sizes[0].height)).toBeLessThan(0.1);}
  }
 }
 await page.setViewportSize({width:393,height:852});await page.locator('#dungeon-map').scrollIntoViewIfNeeded();
 await page.screenshot({path:test.info().outputPath('square-overworld-mobile.png')});
});

test('dungeon enemies move only after a player step and persist across reload', async ({page,isMobile})=>{
 const base=freshDungeon('unordered-moving-browser',1), floor=base.floors[0], map=floorMap(floor.descriptor);
 const revealed=Array.from({length:map.cells.length},(_,i)=>i);
 const encoded=encodeDungeon({...base,floors:[{...floor,exploration:{...floor.exploration,revealed}}]});if(!encoded.ok)throw Error(encoded.reason);
 await page.goto('./?game=dungeon');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
 await page.reload();await continueSavedDungeon(page);
 const before=await dungeonSnapshot(page), savedBefore=await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary);
 await page.clock.install();await page.clock.runFor(5000);
 expect(await dungeonSnapshot(page)).toEqual(before);expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary)).toBe(savedBefore);
 const f=before.floors[0];
 const destination=neighbors(f.position).find(n=>map.cells[n]&&!f.exploration.pois.some(p=>poiCell(p,map.width)===n));if(destination===undefined)throw Error('No safe step');
 const cell=page.locator(`#dungeon-map [data-cell="${destination}"]`);if(isMobile)await cell.tap();else await cell.click();
 const after=await dungeonSnapshot(page);expect(after.revision).toBe(before.revision+1);expect(after.floors[0].exploration.movement!.step).toBe(1);
 expect(after.floors[0].exploration.pois).not.toEqual(before.floors[0].exploration.pois);
 const moved=after.floors[0].exploration.pois.find(p=>poiCell(p,map.width)!==poiCell(f.exploration.pois.find(old=>old.id===p.id)!,map.width))!;
 const markerCell=poiCell(moved,map.width);
 const location=new RegExp(`at row ${Math.floor(markerCell / map.width) + 1}, column ${markerCell % map.width + 1}\\. Available\\.`);
 const accessibleMap=page.getByRole('application',{name:/Floor 1 map/});
 await expect(accessibleMap).toHaveAccessibleDescription(location);
 await page.clock.runFor(5000);expect(await dungeonSnapshot(page)).toEqual(after);
 await page.reload();await continueSavedDungeon(page);
 await expect(accessibleMap).toHaveAccessibleDescription(location);
 expect(await dungeonSnapshot(page)).toEqual(after);await page.clock.runFor(5000);expect(await dungeonSnapshot(page)).toEqual(after);
});

test('walking onto a guardian before other enemies starts and resumes its own encounter', async ({page,isMobile})=>{
 const base=freshDungeon('unordered-guardian-browser',1),f=base.floors[0],target=poiCell(f.exploration.pois[2]);
 const map=generateMap(f.descriptor.seed,'rooms');
 const prior=neighbors(target,map.width,map.height).find(n=>map.cells[n]&&!f.exploration.pois.some(p=>poiCell(p,map.width)===n));
 if(prior===undefined)throw Error('No safe adjacent cell');
 const state=atCell(base,prior), encoded=encodeDungeon(state);if(!encoded.ok)throw Error(encoded.reason);
 await page.goto('./?game=dungeon');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
 await page.reload();await continueSavedDungeon(page);
 const cell=page.locator(`#dungeon-map [data-cell="${target}"]`);if(isMobile)await cell.tap();else await cell.click();
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const started=await dungeonSnapshot(page);expect(started.phase).toBe('battle');expect(started.floors[0].completed).toBe(0);
 expect(started.floors[0].exploration.active).toBe(2);
 expect(started.activeBattle!.seed).toBe(dungeonSeed(started.seed,started.depth,'battle',2));
 await expect(page.locator('#battle-heading h1')).toContainText('Guardian');
 await page.reload();await continueSavedDungeon(page);
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 expect((await dungeonSnapshot(page)).floors[0].exploration.active).toBe(2);
});

test('chase follows the previous cell while block targets the resulting cell', async ({page,isMobile})=>{
 for(const [slot, expectedDelta] of [[1,[-2,-1]],[2,[-1,0]]] as const){
  let selected: {state:DungeonState; destination:number; expected:number}|undefined;
  for(let seed=0;seed<100&&!selected;seed++){
   const base=freshDungeon(`pursuit-browser-${slot}`,seed), f=base.floors[0], map=generateMap(f.descriptor.seed,'rooms');
   const exploration=movableExploration(f.exploration,f.descriptor.seed,0,'ready');
   for(let y=3;y<17&&!selected;y++)for(let x=4;x<16&&!selected;x++){
    const old=(y-1)*20+x, dest=y*20+x, enemy=y*20+x-2;
    const required=[old,dest,enemy,(y-1)*20+x-2,(y-1)*20+x-1,y*20+x-1];
    if(required.some(c=>!map.cells[c]||c===f.descriptor.downstairs||c===f.descriptor.upstairs))continue;
    const reserved=new Set(required);
    const spare=map.cells.flatMap((v,i)=>v&&!reserved.has(i)&&i!==f.descriptor.downstairs&&i!==f.descriptor.upstairs&&Math.abs(i%20-x)+Math.abs(Math.floor(i/20)-y)>11?[i]:[]);
    if(spare.length<2)continue;
    let other=0;
    const pois=exploration.pois.map((p,i)=>{const cell=i===slot?enemy:spare[other++];return {...p,x:cell%20,y:Math.floor(cell/20)};});
    const state=atCell({...base,floors:[{...f,exploration:{...exploration,pois}}]},old);
    if(!readDungeon(state).ok)continue;
    selected={state,destination:dest,expected:(y+expectedDelta[1])*20+x+expectedDelta[0]};
   }
  }
  if(!selected)throw Error('No legal pursuit fixture');
  const encoded=encodeDungeon(selected.state);if(!encoded.ok)throw Error(encoded.reason);
  await page.goto('./?game=dungeon');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
  await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
  await walkDungeon(page,selected.destination,isMobile?'touch':'keyboard');
  const after=await dungeonSnapshot(page);
  expect(poiCell(after.floors[0].exploration.pois[slot])).toBe(selected.expected);
  await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
  expect(await dungeonSnapshot(page)).toEqual(after);
 }
});

test('maximum-size saved floor renders and accepts a step after reload', async ({page,isMobile}) => {
 const base=freshDungeon('large-floor-browser',19);
 const floors=Array.from({length:5},(_,i)=>{const descriptor=floorDescriptor(base.seed,i+1),map=floorMap(descriptor);return {descriptor,position:descriptor.upstairs,completed:i===4?0:3,exploration:freshExploration(descriptor.seed,descriptor.upstairs,map)};});
 const state={...base,depth:5,floors}, encoded=encodeDungeon(state); if(!encoded.ok)throw Error(encoded.reason);
 await page.goto('./?game=dungeon'); await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
 await page.reload(); await continueSavedDungeon(page);
 const map=page.locator('#dungeon-map'); await expect(map.locator('[data-cell]')).toHaveCount(36*36);
 const assertLayout=async()=>{
  const geometry=await map.evaluate(grid=>{
   const bounds=grid.getBoundingClientRect(), region=grid.parentElement!;
   const cells=[...grid.querySelectorAll<HTMLElement>('[data-cell]')].map(cell=>cell.getBoundingClientRect());
   const controls=[...region.querySelectorAll<HTMLElement>('.dungeon-directions button')];
   const screen=document.querySelector<HTMLElement>('#dungeon-screen')!;
   return {
    count:cells.length,
    outside:cells.filter(cell=>cell.left<bounds.left-.1||cell.right>bounds.right+.1||cell.top<bounds.top-.1||cell.bottom>bounds.bottom+.1).length,
    squareError:Math.max(...cells.map(cell=>Math.abs(cell.width-cell.height))),
    overlappingControls:controls.filter(control=>{const button=control.getBoundingClientRect();return cells.some(cell=>Math.min(cell.right,button.right)-Math.max(cell.left,button.left)>.1&&Math.min(cell.bottom,button.bottom)-Math.max(cell.top,button.top)>.1);}).map(control=>control.id),
    screenOverflow:screen.scrollWidth-screen.clientWidth,
   };
  });
  expect(geometry.count).toBe(36*36);
  expect(geometry.outside,'Every cell must fit inside the map border box').toBe(0);
  expect(geometry.squareError).toBeLessThan(.1);
  expect(geometry.overlappingControls,'The compass must not cover any map cell').toEqual([]);
  expect(geometry.screenOverflow,'Only the exploration region should scroll horizontally').toBe(0);
 };
 await assertLayout();
 const viewport=page.viewportSize()!;
 await page.setViewportSize({width:320,height:740});
 await assertLayout();
 const horizontal=await map.evaluate(grid=>{
  const region=grid.parentElement!;
  region.scrollLeft=region.scrollWidth;
  const last=grid.lastElementChild!.getBoundingClientRect(), bounds=region.getBoundingClientRect();
  const result={scrollLeft:region.scrollLeft,lastColumnVisible:last.left>=bounds.left-.1&&last.right<=bounds.right+.1};
  region.scrollLeft=0;return result;
 });
 expect(horizontal.scrollLeft).toBeGreaterThan(0);
 expect(horizontal.lastColumnVisible,'The final column must be reachable by scrolling').toBe(true);
 await page.setViewportSize(viewport);
 await map.evaluate(grid=>{const state={grid,controls:[...document.querySelectorAll<HTMLElement>('#dungeon-art, .dungeon-directions button')],removed:false};(window as unknown as {__floorMount:typeof state}).__floorMount=state;new MutationObserver(records=>{if(records.some(record=>[...record.removedNodes].some(node=>node===grid || node.contains(grid))))state.removed=true;}).observe(document.querySelector('#dungeon-screen')!,{childList:true,subtree:true});});
 const before=await dungeonSnapshot(page), floor=before.floors[4], layout=floorMap(floor.descriptor);
 const destination=neighbors(floor.position,layout.width).find(n=>layout.cells[n]&&!floor.exploration.pois.some(p=>poiCell(p,layout.width)===n));
 if(destination===undefined) throw Error('No safe step on maximum floor');
 await walkDungeon(page,destination,isMobile?'touch':'keyboard');
 const after=await dungeonSnapshot(page);expect(after.floors[4].position).toBe(destination);
 expect(await page.evaluate(()=>(window as unknown as {__floorMount:{removed:boolean}}).__floorMount.removed)).toBe(false);
 expect(await page.evaluate(()=>{const controls=(window as unknown as {__floorMount:{controls:HTMLElement[]}}).__floorMount.controls;return controls.length===5&&controls.every(control=>control.isConnected&&control===document.getElementById(control.id));})).toBe(true);
 await expect(page.locator('#dungeon-map-feedback')).toContainText(`Player cell ${destination}`);
 for(const [name,delta] of [['north',-layout.width],['east',1],['south',layout.width],['west',-1]] as const){
  const enabled=neighbors(destination,layout.width).includes(destination+delta)&&Boolean(layout.cells[destination+delta]);
  await expect(page.locator(`#dungeon-step-${name}`)).toBeEnabled({enabled});
 }
 await assertLayout();
 await page.reload(); await continueSavedDungeon(page); expect(await dungeonSnapshot(page)).toEqual(after);
 await assertLayout();
});

test('maximum-size floor step responsiveness meets the established budget', async ({page}) => {
 const base=freshDungeon('large-floor-performance',19);
 const floors=Array.from({length:5},(_,i)=>{const descriptor=floorDescriptor(base.seed,i+1),map=floorMap(descriptor);return {descriptor,position:descriptor.upstairs,completed:3,exploration:freshExploration(descriptor.seed,descriptor.upstairs,map)};});
 const floor=floors[4],map=floorMap(floor.descriptor), stairs=[floor.descriptor.upstairs,floor.descriptor.downstairs];
 const first=map.cells.findIndex((v,i)=>v===1&&!stairs.includes(i)&&neighbors(i,map.width).some(n=>map.cells[n]&&!stairs.includes(n)));
 const second=neighbors(first,map.width).find(n=>map.cells[n]&&!stairs.includes(n));if(first<0||second===undefined)throw Error('No safe timing pair');
 const state=atCell({...base,depth:5,floors},first),encoded=encodeDungeon(state);if(!encoded.ok)throw Error(encoded.reason);
 await page.goto('./?game=dungeon');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});await page.reload();await continueSavedDungeon(page);
 const idleFrames=await page.evaluate(async()=>{const samples:number[]=[];let previous=await new Promise<number>(resolve=>requestAnimationFrame(resolve));for(let i=0;i<40;i++){const now=await new Promise<number>(resolve=>requestAnimationFrame(resolve));samples.push((Math.round(now*1000)-Math.round(previous*1000))/1000);previous=now;}return samples;});
 const times:number[]=[];
 for(let i=0;i<20;i++)times.push(await page.evaluate(destination=>{const start=performance.now();document.querySelector<HTMLElement>(`#dungeon-map [data-cell="${destination}"]`)!.click();return performance.now()-start;},i%2===0?second:first));
 const frames=await page.evaluate(async({a,b})=>{const samples:number[]=[];let previous=await new Promise<number>(resolve=>requestAnimationFrame(resolve));for(let i=0;i<40;i++){document.querySelector<HTMLElement>(`#dungeon-map [data-cell="${i%2===0?b:a}"]`)!.click();const now=await new Promise<number>(resolve=>requestAnimationFrame(resolve));samples.push((Math.round(now*1000)-Math.round(previous*1000))/1000);previous=now;}return samples;},{a:first,b:second});
 const percentile=(values:number[],q:number)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*q)-1];
 const p95=percentile(times,.95),frameP95=percentile(frames,.95);
 writeFileSync(test.info().outputPath('maximum-floor-step-performance.json'),JSON.stringify({idleFrames,times,p95,frames,frameP95,budgetMs:33.4,dimension:map.width},null,2));
 expect((await dungeonSnapshot(page)).floors[4].position).toBe(first);expect(p95).toBeLessThanOrEqual(33.4);expect(frameP95).toBeLessThanOrEqual(33.4);
});

test('closing on each wandering encounter holds contact and saves the matching battle', async ({page,isMobile})=>{
 for(const slot of [0,1,2]) {
  const {state,approach,target}=dungeonContactApproach(slot);
  const encoded=encodeDungeon(state);if(!encoded.ok)throw Error(encoded.reason);
  await page.goto('./?game=dungeon');
  await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
  await page.reload();await continueSavedDungeon(page);
  await walkDungeon(page,approach,isMobile?'touch':'keyboard');
  const adjacent=await dungeonSnapshot(page);
  expect(adjacent.phase).toBe('ready');
  expect(poiCell(adjacent.floors[0].exploration.pois[slot])).toBe(target);
  await page.reload();await continueSavedDungeon(page);
  expect(await dungeonSnapshot(page)).toEqual(adjacent);
  // Use the reported WASD input on desktop, and the real compass tap on mobile.
  const delta=target-approach;
  if(isMobile)await page.locator(`#dungeon-step-${delta===-20?'north':delta===20?'south':delta===1?'east':'west'}`).tap();
  else {await page.locator('#dungeon-map').focus();await page.keyboard.press(delta===-20?'w':delta===20?'s':delta===1?'d':'a');}
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const entered=await dungeonSnapshot(page);
  expect(entered.phase).toBe('battle');
  expect(entered.floors[0].position).toBe(target);
  expect(entered.floors[0].exploration.active).toBe(slot);
  expect(entered.activeBattle!.seed).toBe(dungeonSeed(state.seed,1,'battle',slot));
  // Automatic enemy opening turns can add revisions after the atomic entry.
  expect(entered.revision).toBeGreaterThanOrEqual(state.revision+2);
  expect(entered.floors[0].exploration.movement!.step).toBe(1);
  await expect(page.locator('#battle-party')).toBeVisible();
  await page.reload();await continueSavedDungeon(page);
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  expect(await dungeonSnapshot(page)).toEqual(entered);
  await expect(page.locator('#battle-party')).toBeVisible();
 }

});

const dungeonEngineModule=/\/(?:start|BattleScene)-[^/]+\.js(?:\?.*)?$|\/src\/phaser\/(?:start|BattleScene)\.ts(?:\?.*)?$/;
async function loadEncounterWithoutEngine(page:Page,id:string,url='./?game=dungeon'){
 const initial=atEncounter(freshDungeon(id,1)),encoded=encodeDungeon(initial);
 if(!encoded.ok)throw Error(encoded.reason);
 await page.goto(url);
 await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
 await page.reload();await continueSavedDungeon(page);
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

test('unavailable battle modules preserve dungeon exploration, recovery and the saved encounter',async({page},info)=>{
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
 await continueSavedDungeon(page);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
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

test('delayed dungeon loading locks repeated entry and waits for recovery to close',async({page})=>{
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

for(const interruption of ['restart','pagehide','visible'] as const)test(interruption==='visible'?'hidden dungeon engine resumes once when visible':`pending dungeon engine cannot mount after ${interruption}`,async({page})=>{
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
   const fresh=await dungeonSnapshot(page);expect(fresh.id).not.toBe(initial.id);expect(fresh.phase).toBe('ready');
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
  expect(errors).toEqual([]);
 }finally {release();}
});

test('pending dungeon engine cannot mount during the final replacement history write', async ({ page }) => {
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

test('adopting a recovered dungeon invalidates the pending encounter load',async({page,isMobile})=>{
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

test('a second dungeon encounter reuses the engine after a legal victory without reloading',async({page,isMobile})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 // The fixture reaches this ongoing battle through legal domain commands; the browser enacts its final attack.
 const witness=dungeonVictoryBoundary(1,0);if(!witness)throw Error('Missing legal victory boundary');
 const encoded=encodeDungeon(witness.snapshot);if(!encoded.ok)throw Error(encoded.reason);
 await page.goto('./?game=dungeon');
 await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
 await page.reload();await continueSavedDungeon(page);
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 expect((await readSession(page)).state).toEqual(witness.snapshot.activeBattle);
 await expect(page.locator('canvas')).toHaveCount(1);
 const canvas=await page.locator('#game canvas').elementHandle();if(!canvas)throw Error('Missing initial battle canvas');
 await playCommand(page,witness.command);
 await expect(page.getByRole('heading',{name:'Choose one reward',exact:true})).toBeVisible();
 const won=await dungeonSnapshot(page);
 expect(won.phase).toBe('reward');expect(won.floors[0].completed).toBe(1);expect(won.activeBattle).toBeNull();
 const decline=page.getByRole('button',{name:'Decline reward',exact:true});
 if(isMobile)await decline.tap();else await decline.click();
 await page.locator('#dungeon-item-confirm').click();
 const ready=await dungeonSnapshot(page);
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
 expect(JSON.parse((await dungeonSlots(page)).primary!).payload).toEqual(saved);
 await expect(page.locator('canvas')).toHaveCount(1);
 expect(await canvas.evaluate(node=>node.isConnected&&node===document.querySelector('#game canvas'))).toBe(true);
 expect(errors).toEqual([]);
});

test('warm maximum-size floor step responsiveness meets the established budget after a legal victory',async({page,isMobile})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 // Legal domain play reaches the ongoing boundary; the real HUD enacts its winning command.
 const witness=dungeonVictoryBoundary(1,0);if(!witness)throw Error('Missing legal victory boundary');
 const battleSave=encodeDungeon(witness.snapshot);if(!battleSave.ok)throw Error(battleSave.reason);
 await page.goto('./?game=dungeon');
 await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:battleSave.text});
 await page.reload();await continueSavedDungeon(page);
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 expect((await readSession(page)).state).toEqual(witness.snapshot.activeBattle);
 await expect(page.locator('canvas')).toHaveCount(1);
 const canvas=await page.locator('#game canvas').elementHandle();if(!canvas)throw Error('Missing battle canvas');
 const canvasIdentity=()=>canvas.evaluate(node=>({connected:node.isConnected,sameCanvas:node===document.querySelector('#game canvas'),count:document.querySelectorAll('canvas').length,timeOrigin:performance.timeOrigin}));
 const originalCanvas=await canvasIdentity();
 await playCommand(page,witness.command);
 await expect(page.getByRole('heading',{name:'Choose one reward',exact:true})).toBeVisible();
 const won=await dungeonSnapshot(page);
 expect(won.phase).toBe('reward');expect(won.floors[0].completed).toBe(1);expect(won.activeBattle).toBeNull();
 const decline=page.getByRole('button',{name:'Decline reward',exact:true});
 if(isMobile)await decline.tap();else await decline.click();
 await page.locator('#dungeon-item-confirm').click();
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

 // Preserve the cold case's 40 idle intervals, 20 synchronous clicks and 40 moving frames.
 const idleFrames=await page.evaluate(async()=>{const samples:number[]=[];let previous=await new Promise<number>(resolve=>requestAnimationFrame(resolve));for(let i=0;i<40;i++){const now=await new Promise<number>(resolve=>requestAnimationFrame(resolve));samples.push((Math.round(now*1000)-Math.round(previous*1000))/1000);previous=now;}return samples;});
 const times:number[]=[];
 for(let i=0;i<20;i++)times.push(await page.evaluate(destination=>{const start=performance.now();document.querySelector<HTMLElement>(`#dungeon-map [data-cell="${destination}"]`)!.click();return performance.now()-start;},i%2===0?second:first));
 const frames=await page.evaluate(async({a,b})=>{const samples:number[]=[];let previous=await new Promise<number>(resolve=>requestAnimationFrame(resolve));for(let i=0;i<40;i++){document.querySelector<HTMLElement>(`#dungeon-map [data-cell="${i%2===0?b:a}"]`)!.click();const now=await new Promise<number>(resolve=>requestAnimationFrame(resolve));samples.push((Math.round(now*1000)-Math.round(previous*1000))/1000);previous=now;}return samples;},{a:first,b:second});
 const percentile=(values:number[],q:number)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*q)-1];
 const p95=percentile(times,.95),frameP95=percentile(frames,.95),stepped=await dungeonSnapshot(page);
 const after={canvas:await canvasIdentity(),grid:await visibleGrid()};
 writeFileSync(test.info().outputPath('warm-maximum-floor-step-performance.json'),JSON.stringify({fixture:'structural five-floor history adopted through recovery; not earned floor-five progression',warmup:{seed:witness.snapshot.seed,depth:witness.snapshot.depth,command:witness.command,completed:won.floors[0].completed},dimension:map.width,first,second,before,after,idleFrames,times,p95,frames,frameP95,budgetMs:33.4,revision:{before:adopted.revision,after:stepped.revision}},null,2));
 expect(after.canvas).toEqual(originalCanvas);
 expect(after.grid.visibility).toBe('visible');expect(after.grid.focused).toBe(true);expect(after.grid.focusVisible).toBe(true);
 for(const cell of after.grid.cells){expect(cell.intersection.width).toBeGreaterThanOrEqual(cell.bounds.width-.1);expect(cell.intersection.height).toBeGreaterThanOrEqual(cell.bounds.height-.1);expect(cell.unoccluded).toBe(true);}
 expect(after.grid.cells.find(cell=>cell.player)?.index).toBe(first);
 expect(stepped.id).toBe(adopted.id);expect(stepped.depth).toBe(5);expect(stepped.phase).toBe('ready');
 expect(stepped.floors[4].position).toBe(first);expect(stepped.revision).toBe(adopted.revision+60);
 expect(JSON.parse((await dungeonSlots(page)).primary!).payload).toEqual(stepped);expect(errors).toEqual([]);
 expect(p95).toBeLessThanOrEqual(33.4);expect(frameP95).toBeLessThanOrEqual(33.4);
});

for(const depth of [1,5])test(`Guardian-first reward, map and encounter state survive claim and reload at depth ${depth}`,async({page})=>{
 // Structural reward boundary isolates marker rendering, not preceding combat.
 const fresh=freshDungeon('guardian-first',1);
 const floors=Array.from({length:depth},(_,i)=>{
  const descriptor=floorDescriptor(fresh.seed,i+1),map=floorMap(descriptor);
  return {descriptor,position:descriptor.upstairs,completed:i===depth-1?0:3,
   exploration:freshExploration(descriptor.seed,descriptor.upstairs,map)};
 });
 const base=atEncounter({...fresh,depth,floors},2),floor=base.floors[depth-1],map=floorMap(floor.descriptor);
 const staged:DungeonState={...base,phase:'reward',floors:base.floors.map((f,i)=>i!==depth-1?f:{...floor,completed:1,
  exploration:{...movableExploration(floor.exploration,floor.descriptor.seed,0,'ready'),cleared:[2],active:2,revealed:Array.from({length:map.cells.length},(_,i)=>i)}})};
 const reward=checkedDungeon(readDungeon({...staged,offer:dungeonOffer(staged)}));
 const encoded=encodeDungeon(reward);if(!encoded.ok)throw Error(encoded.reason);
 await page.goto('./?game=dungeon');
 await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
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
 await page.reload();await continueSavedDungeon(page);await checkMap();
 await expect(rewardPanel).toBeVisible();
 await expect(accessibleMap).toHaveAccessibleDescription(/Guardian · Goblins at row \d+, column \d+\. Reward pending\./);
 const pending=await dungeonSnapshot(page);
 expect(pending).toEqual(reward);
 await rewardPanel.getByRole('button',{name:/^Claim /}).first().click();
 await page.locator('#dungeon-item-confirm').click();
 await expect(rewardPanel).toHaveCount(0);
 await checkMap();
 const claimed=await dungeonSnapshot(page);
 expect(claimed.phase).toBe('ready');
 expect(claimed.revision).toBe(pending.revision+1);
 expect(claimed.ownership).not.toEqual(pending.ownership);
 expect(claimed.floors[depth-1].exploration.cleared).toEqual([2]);
 await page.reload();await continueSavedDungeon(page);await checkMap();
 await expect(rewardPanel).toHaveCount(0);
 await expect(accessibleMap).toHaveAccessibleDescription(/Guardian · Goblins at row \d+, column \d+\. Cleared\./);
 expect(await dungeonSnapshot(page)).toEqual(claimed);
});
