import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dungeonSnapshot, walkDungeon } from './helpers/dungeonTraversal';
import { neighbors, poiCell } from '../src/domain/exploration';
import { generateMap } from '../src/map/generate';
import { freshDungeon, floorDescriptor, readDungeon, dungeonSeed, type DungeonState } from '../src/domain/dungeon';
import { legacyDungeonIdentity } from '../src/content/dungeon';
import { canonical, hashJson } from '../src/domain/contentIdentity';
import { DUNGEON_KEYS } from '../src/persistence/dungeonStorage';
import { readSession,playCommand } from './helpers/battlePolicy';
import { playerDecision } from './helpers/playerPolicy';
import { dungeonBattle } from '../src/domain/dungeon';
import { atCell, atStairApproach, dungeonCapacityFixture, priorDungeonEnvelope } from './helpers/dungeonFixtures';
import { LEGACY_ENCOUNTER_POLICY } from '../src/domain/dungeonEncounters';
import { freshExploration } from '../src/domain/exploration';
import { encodeDungeon, utf8Bytes } from '../src/domain/dungeonSaveEnvelope';
test('map markers respect stair availability, discovery and saved floor state',async({page,isMobile})=>{
 const base=freshDungeon('marker-browser',1),floor=base.floors[0];
 const load=async(state:DungeonState)=>{
  const encoded=encodeDungeon(state);if(!encoded.ok)throw Error(encoded.reason);
  await page.goto('dungeon');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
  await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
 };
 const reload=async()=>{await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();};
 const cell=(index:number)=>page.locator(`#dungeon-map [data-cell="${index}"]`);
 const places=page.getByRole('list',{name:'Discovered places',exact:true});
 // Structural saved-state fixtures isolate rendering; they do not prove preceding battle completion.
 const revealed={...floor,exploration:{...floor.exploration,revealed:Array.from({length:400},(_,i)=>i)}};
 await load({...base,floors:[{...revealed,position:floor.position}]});
 await expect(places.locator('[data-poi-id="stairs-up"]')).toHaveCount(0);
 await expect(places.locator('[data-poi-id="stairs-down"]')).toHaveCount(0);
 await expect(cell(floor.descriptor.downstairs)).toHaveText('');
 for(const poi of floor.exploration.pois)await expect(cell(poiCell(poi))).toHaveText('M');
 await expect(page.locator('#dungeon-map')).not.toContainText(/[123]/);
 await expect(page.getByText('● Player · M encounter (including guardian)',{exact:false})).toBeVisible();
 await expect(page.locator('#dungeon-descend')).toHaveCount(0);
 await page.locator('#dungeon-map').screenshot({path:test.info().outputPath('markers-uncleared-map.png')});
 const firstMap=generateMap(floor.descriptor.seed,'rooms');
 const firstStep=neighbors(floor.position).find(n=>firstMap.cells[n]&&!floor.exploration.pois.some(p=>poiCell(p)===n))!;
 await walkDungeon(page,firstStep,isMobile?'touch':'keyboard');
 await expect(cell(floor.descriptor.upstairs)).toHaveText('');
 await reload();await expect(cell(floor.descriptor.upstairs)).toHaveText('');await expect(places.locator('[data-poi-id="stairs-up"]')).toHaveCount(0);
 // Completion alone cannot reveal an undiscovered staircase.
 await load({...base,floors:[{...floor,completed:3}]});
 await expect(cell(floor.descriptor.downstairs)).toHaveClass('explore-hidden');
 await expect(places.locator('[data-poi-id="stairs-down"]')).toHaveCount(0);
 await load({...base,floors:[{...revealed,position:floor.position,completed:3}]});
 await expect(cell(floor.descriptor.downstairs)).toHaveText('↓');
 await expect(places.locator('[data-poi-id="stairs-down"]')).toContainText('Unlocked');
 for(const poi of floor.exploration.pois)await expect(cell(poiCell(poi))).toHaveText('✓');
 await reload();await expect(cell(floor.descriptor.downstairs)).toHaveText('↓');
 await page.locator('#dungeon-map').scrollIntoViewIfNeeded();
 await page.locator('#dungeon-map').screenshot({path:test.info().outputPath('markers-cleared-map.png')});
 const descriptor=floorDescriptor(base.seed,2),exploration=freshExploration(descriptor.seed,descriptor.upstairs);
 const second={descriptor,completed:0,position:descriptor.upstairs,exploration};
 await load({...base,depth:2,floors:[{...floor,completed:3},second]});
 await expect(places.locator('[data-poi-id="stairs-up"]')).toContainText('Upstairs');
 await expect(places.locator('[data-poi-id="stairs-down"]')).toHaveCount(0);
 const map=generateMap(descriptor.seed,'rooms'),adjacent=neighbors(descriptor.upstairs).find(n=>map.cells[n]&&!exploration.pois.some(p=>poiCell(p)===n))!;
 await walkDungeon(page,adjacent,isMobile?'touch':'keyboard');await expect(cell(descriptor.upstairs)).toHaveText('↑');
 await reload();await expect(cell(descriptor.upstairs)).toHaveText('↑');
 await page.locator('#dungeon-map').scrollIntoViewIfNeeded();
 await page.locator('#dungeon-map').screenshot({path:test.info().outputPath('markers-upper-floor-map.png')});
 if(isMobile){await page.setViewportSize({width:320,height:740});await page.locator('#dungeon-map').scrollIntoViewIfNeeded();}
 expect(await page.locator('#dungeon-screen').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
});

for(const control of ['arrows','wasd','compass','cell'] as const)test(`stairs travel once per entry with ${control}, stay on arrival and restore, and respect locks`,async({page,isMobile})=>{
 const base=freshDungeon('stairs-browser',1),cleared={...base,floors:[{...base.floors[0],completed:3}]};
 const load=async(state:DungeonState)=>{
  const encoded=encodeDungeon(state);if(!encoded.ok)throw Error(encoded.reason);
  await page.goto('dungeon');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
  await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
 };
 const reload=async()=>{await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();};
 const move=async(destination:number)=>{
  const before=await dungeonSnapshot(page),delta=destination-before.floors[before.depth-1].position;
  const direction=delta===-20?'north':delta===20?'south':delta===1?'east':'west';
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
  await page.goto('dungeon');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
  await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
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
  await page.goto('dungeon');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
  await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
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

test('real traversal, art independence, keyboard locks, active battle and exact reload',async({page,isMobile})=>{
 test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('dungeon');await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await page.locator('#dungeon-confirm-new').click();
 const initial=await dungeonSnapshot(page),f=initial.floors[0],map=generateMap(f.descriptor.seed,'rooms');
 await expect(page.locator('#dungeon-start-encounter')).toHaveCount(0);await expect(page.locator('[aria-label="Discovered places"]')).not.toContainText('Upstairs');
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
 await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');expect(await dungeonSnapshot(page)).toEqual(saved);
 writeFileSync(test.info().outputPath('spatial-battle-receipt.json'),JSON.stringify({initial,stepped,saved},null,2));expect(errors).toEqual([]);
});
test('pre-progression dungeon remains incompatible and exportable',async({page})=>{
 const raw=priorDungeonEnvelope(freshDungeon('legacy-browser',13,LEGACY_ENCOUNTER_POLICY),1);
 await page.goto('dungeon');await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:DUNGEON_KEYS.primary,raw});await page.reload();
 await expect(page.getByRole('button',{name:'Continue saved dungeon',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export primary save',exact:true}).click();await download;
 expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary)).toBe(raw);
});

test('cold progression-format Continue retains a long saved history within the startup budget',async({page})=>{
 const base=freshDungeon('cold-browser',13),floors=Array.from({length:250},(_,i)=>{
  const descriptor=floorDescriptor(base.seed,i+1);
  return {descriptor,completed:i===249?0:3,position:descriptor.upstairs,exploration:freshExploration(descriptor.seed,descriptor.upstairs)};
 });
 const encoded=encodeDungeon({...base,depth:250,floors});if(!encoded.ok)throw Error(encoded.reason);
 await page.goto('dungeon');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
 const begin=Date.now();await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
 await expect(page.locator('#dungeon-map')).toBeVisible();const coldUsableMs=Date.now()-begin;
 expect(coldUsableMs).toBeLessThanOrEqual(2500);
 const state=await dungeonSnapshot(page);expect(state.depth).toBe(250);expect(state.floors).toHaveLength(250);
 expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary)).toBe(encoded.text);
 writeFileSync(test.info().outputPath('cold-current-history.json'),JSON.stringify({floors:250,bytes:utf8Bytes(encoded.text),coldUsableMs,budgetMs:2500,rawRetained:true}));
 await page.screenshot({path:test.info().outputPath('cold-current-history.png')});
});

test('map input stays inert while hidden and retains discovery through resize and failed art',async({page})=>{
 await page.route('**/map-art/**',route=>route.abort());await page.goto('dungeon');await page.getByRole('button',{name:'Play unsaved dungeon',exact:true}).click();
 const before=await dungeonSnapshot(page);await page.locator('#dungeon-art').selectOption('legacy-8bit');await expect(page.locator('#dungeon-map-feedback')).toContainText('fallback');expect(await dungeonSnapshot(page)).toEqual(before);
 await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:true}));await page.locator('#dungeon-map').focus();await page.keyboard.press('ArrowRight');expect(await dungeonSnapshot(page)).toEqual(before);
 await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));const size=page.viewportSize()!;await page.setViewportSize({width:size.height,height:size.width});expect(await dungeonSnapshot(page)).toEqual(before);
 await page.screenshot({path:test.info().outputPath('exploration-rotated-fallback.png'),fullPage:true});
});
test('records route transfer and map responsiveness against established budgets',async({page,request})=>{
 const begin=Date.now();await page.goto('dungeon');await expect(page.getByRole('heading',{name:'Dungeon floors',exact:true})).toBeVisible();const coldUsableMs=Date.now()-begin;
 await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();
 const floorCreationMs=await page.locator('#dungeon-confirm-new').evaluate(button=>{const begin=performance.now();(button as HTMLButtonElement).click();return performance.now()-begin;});const timings:number[]=[];
 const created=await dungeonSnapshot(page),cleared={...created,floors:[{...created.floors[0],completed:3}]};
 const encoded=encodeDungeon(cleared);if(!encoded.ok)throw Error(encoded.reason);
 await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
 const start=await dungeonSnapshot(page),f=start.floors[0],map=generateMap(f.descriptor.seed,'rooms'),neighbor=neighbors(f.position).find(n=>map.cells[n]&&n!==f.descriptor.downstairs&&!f.exploration.pois.some(p=>poiCell(p)===n))!;
 for(let i=0;i<20;i++)timings.push(await page.evaluate(destination=>{const begin=performance.now();const cell=document.querySelector<HTMLElement>(`#dungeon-map [data-cell="${destination}"]`)!;cell.click();return performance.now()-begin;},i%2===0?neighbor:f.position));
 const frames=await page.evaluate(async({a,b})=>{
   const idle:number[]=[],steps:number[]=[];
   for(const [count,output] of [[30,idle],[40,steps]] as const){let previous=await new Promise<number>(r=>requestAnimationFrame(r));for(let i=0;i<count;i++){if(output===steps)document.querySelector<HTMLElement>(`#dungeon-map [data-cell="${i%2===0?b:a}"]`)!.click();const now=await new Promise<number>(r=>requestAnimationFrame(r));output.push(now-previous);previous=now;}}
   const p=(v:number[],q:number)=>[...v].sort((a,b)=>a-b)[Math.ceil(v.length*q)-1];return {idle,steps,idleP50:p(idle,.5),idleP95:p(idle,.95),stepP95:p(steps,.95)};
 },{a:f.position,b:neighbor});
 await page.locator('#dungeon-art').selectOption('legacy-8bit');if(f.descriptor.biome==='desert-v1')await expect(page.locator('#dungeon-map-feedback')).toContainText('fallback');else await expect(page.locator('#dungeon-map-feedback')).not.toContainText('fallback');
 const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(e=>({name:e.name,encodedBodySize:(e as PerformanceResourceTiming).encodedBodySize})));
 const code=[];for(const r of resources.filter(r=>/\.(js|css)$/.test(r.name))){const response=await request.get(r.name),body=await response.body();code.push({url:new URL(r.name).pathname,raw:body.length,gzip:gzipSync(body).length});}
 timings.sort((a,b)=>a-b);const p95=timings[Math.ceil(timings.length*.95)-1],gzip=code.reduce((n,r)=>n+r.gzip,0),assets=resources.filter(r=>!r.name.match(/\.(js|css)$/)).reduce((n,r)=>n+r.encodedBodySize,0);
 const diagnostics=await page.evaluate(()=>window.fitDiagnostics()),saveBytes=utf8Bytes((await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary))??'');
 const receipt={frames,frameBudgets:{idleP50:16.7,idleP95:20,stepP95:33.4},framePasses:{idleP50:frames.idleP50<=16.7,idleP95:frames.idleP95<=20,stepP95:frames.stepP95<=33.4},commit:diagnostics.build.commit,dirty:diagnostics.build.dirty,viewport:diagnostics.viewport,userAgent:diagnostics.userAgent,floorCreationMs,descriptorBytes:utf8Bytes(canonical(f.descriptor)),saveBytes,coldUsableMs,stepP95Ms:p95,codeGzipBytes:gzip,observedAssetBytes:assets,budgets:{coldUsableMs:2500,stepP95Ms:33.4,codeGzipBytes:400000,assetBytes:1500000},passes:{cold:coldUsableMs<=2500,step:p95<=33.4,code:gzip<=400000,assets:assets<=1500000},code,timings,resources};
 writeFileSync(test.info().outputPath('exploration-performance.json'),JSON.stringify(receipt,null,2));expect(timings).toHaveLength(20);expect((await dungeonSnapshot(page)).floors[0].position).toBe(f.position);
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
   const candidate={...base,depth:2,floors:[{...base.floors[0],completed:3},{descriptor,position:descriptor.upstairs,completed:slot,exploration:freshExploration(descriptor.seed,descriptor.upstairs)}]};
   const read=readDungeon(candidate);if(!read.ok)throw Error(read.reason);state=read.state;
  }
  if(!state)throw Error('No kind fixture');
  const floor=state.floors[1],target=poiCell(floor.exploration.pois[slot]),map=generateMap(floor.descriptor.seed,'rooms');
  const prior=neighbors(target).find(n=>map.cells[n]&&!floor.exploration.pois.some(p=>poiCell(p)===n));if(prior===undefined)throw Error('No safe approach');
  state=atCell(state,prior);const encoded=encodeDungeon(state);if(!encoded.ok)throw Error(encoded.reason);
  await page.goto('dungeon');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
  await expect(page.locator('#dungeon-map')).toHaveAttribute('data-biome',biome);
  expect(await page.locator('#dungeon-screen').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
  await expect(page.locator('#dungeon-screen h1')).toHaveText(`Dungeon · Floor 2 · ${biome==='forest'?'Forest':'Desert'}`);
  const undiscovered=state.floors[1].exploration.pois.filter(p=>!state!.floors[1].exploration.revealed.includes(poiCell(p)));
  for(const p of undiscovered)await expect(page.locator(`[data-poi-id="${p.id}"]`)).toHaveCount(0);
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
  await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  expect(await dungeonSnapshot(page)).toEqual(before);await expect(page.locator('#battle-heading h1')).toContainText(label);
 }
});

 test('exploration cells stay square across viewport sizes and art styles',async({page})=>{
 await page.goto('dungeon');await page.getByRole('button',{name:'Play unsaved dungeon',exact:true}).click();
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
 const base=freshDungeon('unordered-moving-browser',1), encoded=encodeDungeon(base);if(!encoded.ok)throw Error(encoded.reason);
 await page.goto('dungeon');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
 await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
 const before=await dungeonSnapshot(page), savedBefore=await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary);
 await page.clock.install();await page.clock.runFor(5000);
 expect(await dungeonSnapshot(page)).toEqual(before);expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary)).toBe(savedBefore);
 const f=before.floors[0],map=generateMap(f.descriptor.seed,'rooms');
 const destination=neighbors(f.position).find(n=>map.cells[n]&&!f.exploration.pois.some(p=>poiCell(p)===n));if(destination===undefined)throw Error('No safe step');
 const cell=page.locator(`#dungeon-map [data-cell="${destination}"]`);if(isMobile)await cell.tap();else await cell.click();
 const after=await dungeonSnapshot(page);expect(after.revision).toBe(before.revision+1);expect(after.floors[0].exploration.movement!.step).toBe(1);
 expect(after.floors[0].exploration.pois).not.toEqual(before.floors[0].exploration.pois);
 await page.clock.runFor(5000);expect(await dungeonSnapshot(page)).toEqual(after);
 await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
 expect(await dungeonSnapshot(page)).toEqual(after);await page.clock.runFor(5000);expect(await dungeonSnapshot(page)).toEqual(after);
});

test('walking onto a guardian before other enemies starts and resumes its own encounter', async ({page,isMobile})=>{
 const base=freshDungeon('unordered-guardian-browser',1),f=base.floors[0],target=poiCell(f.exploration.pois[2]);
 const map=generateMap(f.descriptor.seed,'rooms');
 const prior=neighbors(target).find(n=>map.cells[n]&&!f.exploration.pois.some(p=>poiCell(p)===n));
 if(prior===undefined)throw Error('No safe adjacent cell');
 const state=atCell(base,prior), encoded=encodeDungeon(state);if(!encoded.ok)throw Error(encoded.reason);
 await page.goto('dungeon');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:DUNGEON_KEYS.primary,text:encoded.text});
 await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
 const cell=page.locator(`#dungeon-map [data-cell="${target}"]`);if(isMobile)await cell.tap();else await cell.click();
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const started=await dungeonSnapshot(page);expect(started.phase).toBe('battle');expect(started.floors[0].completed).toBe(0);
 expect(started.floors[0].exploration.active).toBe(2);
 expect(started.activeBattle!.seed).toBe(dungeonSeed(started.seed,started.depth,'battle',2));
 await expect(page.locator('#battle-heading h1')).toContainText('Guardian');
 await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 expect((await dungeonSnapshot(page)).floors[0].exploration.active).toBe(2);
});
