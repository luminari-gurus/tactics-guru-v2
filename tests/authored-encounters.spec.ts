import { writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { authoredEncounters } from '../src/content/encounters';
import { projectTile, tileFaces, type Tile } from '../src/geometry/iso';
import { pickTile, screenToBoard } from '../src/geometry/picking';
import { unitBounds } from '../src/geometry/canopy';

const entry='tests/fixtures/encounters/index.html';
async function report(page:Page) { return page.locator('#game').evaluate(e=>JSON.parse((e as HTMLElement).dataset.battleReport!)); }
async function ready(page:Page,id:string) { await page.goto(`${entry}?encounter=${id}`);await expect(page.locator('#game')).toHaveAttribute('data-ready','true'); }
async function selectVisible(page:Page, side=false) {
  const r=await report(page);
  let chosen: {tile:Tile;point:{x:number;y:number}}|undefined;
  for(const tile of r.tiles as Tile[]) {
    if(tile.elevation===0)continue;
    const faces=tileFaces(tile), p=side ? {x:(faces.right[0].x+faces.right[2].x)/2,y:(faces.right[0].y+faces.right[2].y)/2} : projectTile(tile);
    // This helper verifies terrain; living sprite pixels now select their unit.
    if(r.units.some((unit:any)=>{
      if(unit.health.hp<=0)return false;
      const bounds=unitBounds(unit.tile,unit.origin);
      return p.x>=bounds.left&&p.x<bounds.right&&p.y>=bounds.top&&p.y<bounds.bottom;
    }))continue;
    const point={x:r.transform.x+p.x*r.transform.scale,y:r.transform.y+p.y*r.transform.scale};
    if(point.x<20||point.x>r.viewport.width-20||point.y<50||point.y>r.viewport.height-20)continue;
    const picked=pickTile(r.tiles,screenToBoard(point,r.transform));
    if(picked?.x===tile.x && picked?.y===tile.y){chosen={tile,point};break;}
  }
  expect(chosen,side?'visible elevated side':'visible elevated top').toBeDefined();
  const {tile,point}=chosen!;
  if(test.info().project.name==='desktop') await page.mouse.click(point.x,point.y); else await page.touchscreen.tap(point.x,point.y);
  await expect.poll(async()=> (await report(page)).selected).toEqual({x:tile.x,y:tile.y,elevation:tile.elevation});
}

for(const e of authoredEncounters) test(`${e.id}: render, resize and transformed picking`,async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await ready(page,e.id);
  const initial=await report(page);
  expect(initial.tiles).toHaveLength(144);expect(initial.units).toHaveLength(6);
  expect(initial.reachable.length).toBeGreaterThan(1);
  expect(initial.surfaceCornerError).toBeLessThan(0.001);
  expect(initial.units.every((u:any)=>u.anchorError<0.001)).toBe(true);
  expect(initial.depthOrder).toEqual([...initial.depthOrder].sort((a:number,b:number)=>a-b));
  for(const [orientation,viewport] of Object.entries({portrait:{width:412,height:915},landscape:{width:915,height:412}})) {
    await page.setViewportSize(viewport);
    await expect.poll(async()=>(await report(page)).viewport).toEqual(viewport);
    await selectVisible(page);await selectVisible(page,true);
    await page.screenshot({path:info.outputPath(`${e.mapId.slice(4)}-${orientation}-fitted.png`)});
    const r=await report(page),x=viewport.width/2,y=viewport.height/2;
    await page.mouse.move(x,y);await page.mouse.wheel(0,-300);
    await expect.poll(async()=>(await report(page)).transform.scale).toBeGreaterThan(r.transform.scale);
    const beforePan=(await report(page)).transform;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+30,y+20,{steps:5});await page.mouse.up();
    await expect.poll(async()=>(await report(page)).transform).not.toEqual(beforePan);
    await selectVisible(page);
    await page.screenshot({path:info.outputPath(`${e.mapId.slice(4)}-${orientation}.png`)});
    const final=await report(page);
    expect(final.commandCount).toBe(0);
    await writeFile(info.outputPath(`${e.mapId.slice(4)}-${orientation}.json`),JSON.stringify({
      capturedAt:new Date().toISOString(),project:info.project.name,browser:await page.context().browser()!.version(),
      fixture:await page.locator('#game').evaluate(el=>JSON.parse((el as HTMLElement).dataset.fixture!)),report:final,
    },null,2));
  }
  expect(await page.evaluate(()=>Object.keys(localStorage))).toEqual([]);
  expect(errors).toEqual([]);
});

test('unknown encounter fails before board construction',async({page})=>{
  await page.goto(`${entry}?encounter=encounter:missing`);
  await expect(page.getByRole('status')).toHaveText('Error: Unknown encounter');
  expect(await page.locator('#game').getAttribute('data-battle-report')).toBeNull();
});
for(const failure of ['missing','decode'])test(`required asset ${failure} produces controlled error`,async({page})=>{
  await page.route('**/proof/fighter.png',route=>failure==='missing'?route.fulfill({status:404,body:''}):route.fulfill({status:200,contentType:'image/png',body:'invalid png'}));
  await page.goto(`${entry}?encounter=encounter:woodland_crossing`);
  await expect(page.getByRole('status')).toContainText('Error: Asset load failed');
  await expect(page.locator('#game')).toHaveAttribute('data-ready','false');
  expect(await page.locator('#game').getAttribute('data-battle-report')).toBeNull();
});

test('forced desert fallback uses production assets and pointer picking',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${entry}?encounter=${authoredEncounters[0].id}&generated=1&fallback=1`);
 await expect(page.locator('#game')).toHaveAttribute('data-ready','true');
 const fixture=JSON.parse((await page.locator('#game').getAttribute('data-fixture'))!);
 expect(fixture.diagnostics.fallback).toBe(true);expect(fixture.diagnostics.failures).toHaveLength(4);
 const r=await report(page);expect(r.tiles).toHaveLength(144);expect(r.tiles.every((t:any)=>t.elevation===0&&t.terrain==='sand')).toBe(true);
 const cell={x:5,y:6},point=projectTile({...cell,elevation:0});
 await page.mouse.click(r.transform.x+point.x*r.transform.scale,r.transform.y+point.y*r.transform.scale);
 expect((await report(page)).selected).toMatchObject(cell);
 await page.screenshot({path:test.info().outputPath('desert-fallback.png')});expect(errors).toEqual([]);
});

test('representative generated layouts retain readable open desert terrain',async({page})=>{
 for(const seed of [0,1,2]){
  await page.goto(`${entry}?encounter=${authoredEncounters[0].id}&generated=1&seed=${seed}`);
  await expect(page.locator('#game')).toHaveAttribute('data-ready','true');
  const r=await report(page);expect(r.tiles.filter((t:any)=>t.terrain==='sand'&&t.elevation===0).length).toBeGreaterThanOrEqual(116);
  await page.screenshot({path:test.info().outputPath(`desert-seed-${seed}.png`)});
 }
});
