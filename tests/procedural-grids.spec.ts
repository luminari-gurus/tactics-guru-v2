import { writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { preparedSnapshot, runContext } from './helpers/runItemFixtures';
import { encodeRunSave, runBattleCatalog } from '../src/domain/runSaveEnvelope';
import { RUN_STORAGE_KEYS } from '../src/persistence/runStorage';
import { previewMovement } from '../src/domain/grid';
import { readSession, playCommand } from './helpers/battlePolicy';

test('generated production board picks, moves and resumes the same desert after camera changes',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/run');await page.locator('#run-start').click();await page.locator('#run-start-encounter').click();
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const snapshot=JSON.parse((await page.locator('#game').getAttribute('data-run-snapshot'))!);
 expect(snapshot.battlefield.kind).toBe('generated');
 const catalog=runBattleCatalog(snapshot.items,runContext)!;
 expect(catalog.maps[snapshot.activeBattle.mapId].cells.every(c=>c.terrainId==='sand'||c.terrainId==='rock')).toBe(true);
 const region=await page.locator('#battle-board-region').boundingBox();expect(region).not.toBeNull();
 await page.mouse.move(region!.x+region!.width/2,region!.y+region!.height/2);await page.mouse.wheel(0,-100);
 await page.mouse.down();await page.mouse.move(region!.x+region!.width/2+18,region!.y+region!.height/2+12);await page.mouse.up();
 await page.setViewportSize({width:page.viewportSize()!.width,height:page.viewportSize()!.height+20});
 const report=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);

 // Select a known flat central cell through production pointer picking.
 const cell={x:5,y:6};
 await page.mouse.click(report.transform.x+(cell.x-cell.y)*40*report.transform.scale,report.transform.y+(cell.x+cell.y)*20*report.transform.scale);
 expect(JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!).selected).toMatchObject(cell);
 const session=await readSession(page),actor=session.state.initiative[session.state.activeIndex];
 const reach=previewMovement(session.state,actor,catalog);expect(reach.ok).toBe(true);
 if(!reach.ok)throw Error('Movement unavailable');
 expect(report.reachable).toEqual(reach.cells.map(c=>c.cell));
 const destination=reach.cells.find(c=>c.cost>0)!;
 await playCommand(page,{type:'move',unitId:actor,to:destination.cell});
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const committed=JSON.parse((await page.locator('#game').getAttribute('data-run-snapshot'))!);
 await page.screenshot({path:test.info().outputPath('desert-grid.png')});
 await page.reload();await page.locator('#run-continue').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 expect((await readSession(page)).state).toEqual(committed.activeBattle);
 expect(JSON.parse((await page.locator('#game').getAttribute('data-run-snapshot'))!).battlefield).toEqual(committed.battlefield);
 expect((await readSession(page)).events).toEqual([]);expect(errors).toEqual([]);
});


test('authored final entry preserves carried heroes and equipped projection',async({page})=>{
 const snapshot=preparedSnapshot();
 const items={...snapshot.items,run:{...snapshot.items.run,encounterIndex:2,revision:4},ownership:{...snapshot.items.ownership,assignments:[{instanceId:snapshot.items.ownership.equipment[0].instanceId,heroId:'fighter' as const,slot:'charm' as const}]}};
 const encoded=encodeRunSave({...snapshot,items},runContext);expect(encoded.ok).toBe(true);if(!encoded.ok)throw Error('Invalid final fixture');
 await page.goto('/run');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:RUN_STORAGE_KEYS.primary,text:encoded.text});await page.reload();
 await page.locator('#run-continue').click();await page.locator('#run-start-encounter').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const current=JSON.parse((await page.locator('#game').getAttribute('data-run-snapshot'))!);
 expect(current.battlefield.kind).toBe('authored');expect(current.activeBattle.mapId).toBe('map:ruined_approach');
 expect(current.activeBattle.units.filter((u:any)=>u.side==='player').map((u:any)=>({heroId:u.defId,hp:u.hp}))).toEqual(items.run.party.filter(h=>h.hp>0));
 expect(runBattleCatalog(current.items,runContext)!.heroes.fighter.stats.armorClass).toBe(runContext.catalog.heroes.fighter.stats.armorClass+1);
 await page.screenshot({path:test.info().outputPath('authored-final.png')});
});


test('repeated generated restarts keep the static shape cache bounded',async({page})=>{
 await page.goto('/run');await page.locator('#run-start').click();await page.locator('#run-start-encounter').click();
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const captures=[];
 for(let restart=0;restart<4;restart++){
  const report=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
  const snapshot=JSON.parse((await page.locator('#game').getAttribute('data-run-snapshot'))!);
  captures.push({restart,seed:snapshot.items.run.seed,battlefield:snapshot.battlefield,viewport:page.viewportSize(),textures:report.shapeTextures,objectCount:report.objectCount});
  expect(report.shapeTextures.filter((t:any)=>t.key.includes('column'))).toHaveLength(2);
  expect(report.shapeTextures.length).toBeLessThanOrEqual(18);
  if(restart>0)expect(report.shapeTextures).toEqual(captures[0].textures);
  if(restart===3)break;
  await page.locator('#fit-restart').click();await page.locator('#run-confirm-new').click();await page.locator('#run-start-encounter').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 }
 writeFileSync(test.info().outputPath('static-textures.json'),JSON.stringify(captures,null,2));
});


test('missing desert surface fails through the controlled asset error',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/battle/terrain/sand.png',route=>route.abort());
 await page.goto('/run');await page.locator('#run-start').click();await page.locator('#run-start-encounter').click();
 await expect(page.locator('#fit-status')).toContainText('Error: Asset load failed');
 await expect(page.locator('#game')).toHaveAttribute('data-ready','false');
 expect(errors).toEqual([]);
});
