import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dungeonSnapshot, walkDungeon } from './helpers/dungeonTraversal';
import { neighbors, poiCell } from '../src/domain/exploration';
import { generateMap } from '../src/map/generate';
import { freshDungeon } from '../src/domain/dungeon';
import { legacyDungeonIdentity } from '../src/content/dungeon';
import { canonical, hashJson } from '../src/domain/contentIdentity';
import { DUNGEON_KEYS } from '../src/persistence/dungeonStorage';
import { readSession,playCommand } from './helpers/battlePolicy';
import { playerDecision } from './helpers/playerPolicy';
import { dungeonBattle } from '../src/domain/dungeon';
test('real traversal, art independence, keyboard locks, active battle and exact reload',async({page,isMobile})=>{
 test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('dungeon');await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await page.locator('#dungeon-confirm-new').click();
 const initial=await dungeonSnapshot(page),f=initial.floors[0],map=generateMap(f.descriptor.seed,'rooms');
 await expect(page.locator('#dungeon-start-encounter')).toHaveCount(0);await expect(page.locator('[aria-label="Discovered places"]')).toContainText('Upstairs');
 const adjacent=neighbors(f.position).find(n=>map.cells[n])!;
 await walkDungeon(page,adjacent,isMobile?'touch':'pointer');const stepped=await dungeonSnapshot(page);expect(stepped.revision).toBe(initial.revision+1);
 await page.locator('#dungeon-map').focus();await page.keyboard.down('ArrowUp');await page.keyboard.up('ArrowUp');const after=await dungeonSnapshot(page);
 await page.locator('#dungeon-map').dispatchEvent('keydown',{key:'ArrowUp',repeat:true});expect(await dungeonSnapshot(page)).toEqual(after);
 await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await page.keyboard.press('ArrowDown');expect(await dungeonSnapshot(page)).toEqual(after);await page.locator('#dungeon-cancel-new').click();
 await page.locator('#dungeon-map').evaluate(n=>n.dataset.identity='retained');
 await page.getByRole('combobox',{name:'Map art',exact:true}).selectOption('legacy-8bit');await expect(page.locator('#dungeon-map')).toHaveAttribute('data-art','legacy-8bit');
 await expect(page.locator('#dungeon-map-feedback')).not.toContainText('fallback');expect(await dungeonSnapshot(page)).toEqual(after);
 await page.getByRole('combobox',{name:'Map art',exact:true}).selectOption('simple');expect(await dungeonSnapshot(page)).toEqual(after);
 await expect(page.locator('#dungeon-map')).toHaveAttribute('data-identity','retained');
 await expect.poll(()=>page.locator('.dungeon-directions button').evaluateAll(nodes=>nodes.length===4&&nodes.every(n=>{const b=n.getBoundingClientRect();return b.width>=44&&b.height>=44;}))).toBe(true);
 await page.locator('#dungeon-map').scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath('exploration-revealed.png'),fullPage:true});
 expect(await page.locator('#dungeon-screen').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
 await walkDungeon(page,poiCell(f.exploration.pois[0]),isMobile?'touch':'keyboard');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const battle=await dungeonSnapshot(page);expect(battle.phase).toBe('battle');expect(battle.floors[0].position).toBe(poiCell(f.exploration.pois[0]));
 const command=playerDecision((await readSession(page)).state,dungeonBattle(battle)!.catalog);await playCommand(page,command);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');const saved=await dungeonSnapshot(page);
 await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');expect(await dungeonSnapshot(page)).toEqual(saved);
 writeFileSync(test.info().outputPath('spatial-battle-receipt.json'),JSON.stringify({initial,stepped,saved},null,2));expect(errors).toEqual([]);
});
test('v1 Continue preserves raw bytes until a v2 spatial save',async({page,isMobile})=>{
 const s=freshDungeon('legacy-browser',13),payload={...s,floors:s.floors.map(({exploration,...f})=>f)},body={kind:'tactics-guru:dungeon',format:1,identity:legacyDungeonIdentity,payload},raw=canonical({...body,digest:hashJson(body)});
 await page.goto('dungeon');await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:DUNGEON_KEYS.primary,raw});await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
 expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary)).toBe(raw);
 const before=await dungeonSnapshot(page),f=before.floors[0],map=generateMap(f.descriptor.seed,'rooms'),n=neighbors(f.position).find(n=>map.cells[n])!;
 await walkDungeon(page,n,isMobile?'touch':'keyboard');expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.backup)).toBe(raw);
 const saved=await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary);expect(JSON.parse(saved!).format).toBe(2);
 await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();expect((await dungeonSnapshot(page)).floors[0].position).toBe(n);
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
 await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await page.locator('#dungeon-confirm-new').click();const timings:number[]=[];
 const start=await dungeonSnapshot(page),f=start.floors[0],map=generateMap(f.descriptor.seed,'rooms'),neighbor=neighbors(f.position).find(n=>map.cells[n]&&!f.exploration.pois.some(p=>poiCell(p)===n))!;
 for(let i=0;i<20;i++)timings.push(await page.evaluate(destination=>{const begin=performance.now();const cell=document.querySelector<HTMLElement>(`#dungeon-map [data-cell="${destination}"]`)!;cell.click();return performance.now()-begin;},i%2===0?neighbor:f.position));
 const frames=await page.evaluate(async({a,b})=>{
   const idle:number[]=[],steps:number[]=[];
   for(const [count,output] of [[30,idle],[40,steps]] as const){let previous=await new Promise<number>(r=>requestAnimationFrame(r));for(let i=0;i<count;i++){if(output===steps)document.querySelector<HTMLElement>(`#dungeon-map [data-cell="${i%2===0?b:a}"]`)!.click();const now=await new Promise<number>(r=>requestAnimationFrame(r));output.push(now-previous);previous=now;}}
   const p=(v:number[],q:number)=>[...v].sort((a,b)=>a-b)[Math.ceil(v.length*q)-1];return {idle,steps,idleP50:p(idle,.5),idleP95:p(idle,.95),stepP95:p(steps,.95)};
 },{a:f.position,b:neighbor});
 await page.locator('#dungeon-art').selectOption('legacy-8bit');await expect(page.locator('#dungeon-map-feedback')).not.toContainText('fallback');
 const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(e=>({name:e.name,encodedBodySize:(e as PerformanceResourceTiming).encodedBodySize})));
 const code=[];for(const r of resources.filter(r=>/\.(js|css)$/.test(r.name))){const response=await request.get(r.name),body=await response.body();code.push({url:new URL(r.name).pathname,raw:body.length,gzip:gzipSync(body).length});}
 timings.sort((a,b)=>a-b);const p95=timings[Math.ceil(timings.length*.95)-1],gzip=code.reduce((n,r)=>n+r.gzip,0),assets=resources.filter(r=>!r.name.match(/\.(js|css)$/)).reduce((n,r)=>n+r.encodedBodySize,0);
 const receipt={frames,frameBudgets:{idleP50:16.7,idleP95:20,stepP95:33.4},framePasses:{idleP50:frames.idleP50<=16.7,idleP95:frames.idleP95<=20,stepP95:frames.stepP95<=33.4},commit:await page.locator('#game').getAttribute('data-commit'),coldUsableMs,stepP95Ms:p95,codeGzipBytes:gzip,observedAssetBytes:assets,budgets:{coldUsableMs:2500,stepP95Ms:33.4,codeGzipBytes:400000,assetBytes:1500000},passes:{cold:coldUsableMs<=2500,step:p95<=33.4,code:gzip<=400000,assets:assets<=1500000},code,timings,resources};
 writeFileSync(test.info().outputPath('exploration-performance.json'),JSON.stringify(receipt,null,2));expect(timings).toHaveLength(20);expect((await dungeonSnapshot(page)).floors[0].position).toBe(f.position);
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
