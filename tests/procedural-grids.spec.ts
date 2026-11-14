import { writeFileSync } from 'node:fs';
import { expect, test } from './helpers/forceRailControls';
import { test as standardTest } from './helpers/coreGraphics';
import { runContext } from './helpers/runItemFixtures';
import { runBattleCatalog } from '../src/domain/runSaveEnvelope';
import { previewMovement } from '../src/domain/grid';
import { readSession, playCommand } from './helpers/battlePolicy';
import { pickTile } from '../src/geometry/picking';
import { projectTile, type Tile } from '../src/geometry/iso';

test('generated production board picks, moves and starts a fresh session after camera changes',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?game=run');await page.locator('#run-start').click();await page.locator('#run-start-encounter').click();
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const snapshot=JSON.parse((await page.locator('#game').getAttribute('data-run-snapshot'))!);
 expect(snapshot.battlefield.kind).toBe('generated');
 const catalog=runBattleCatalog(snapshot.items,runContext)!;
 expect(catalog.maps[snapshot.activeBattle.mapId].cells.every(c=>c.terrainId==='sand'||c.terrainId==='rock')).toBe(true);
 const region=await page.locator('#battle-board-region').boundingBox();expect(region).not.toBeNull();
 await page.mouse.move(region!.x+region!.width/2,region!.y+region!.height/2);await page.mouse.wheel(0,-100);
 await page.mouse.down();await page.mouse.move(region!.x+region!.width/2+18,region!.y+region!.height/2+12);await page.mouse.up();
 const resized={width:page.viewportSize()!.width,height:page.viewportSize()!.height+20};
 await page.setViewportSize(resized);
 // Browser resize resolves before Phaser's next fit/report; use the settled camera.
 await expect.poll(async()=>JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!).viewport).toEqual(resized);
 const report=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);

 // Select a known flat central cell through production pointer picking.
 const cell={x:5,y:6};
 await page.mouse.click(report.transform.x+(cell.x-cell.y)*40*report.transform.scale,report.transform.y+(cell.x+cell.y)*20*report.transform.scale);
 const clicked=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
 await test.info().attach('resize-picking.json',{contentType:'application/json',body:JSON.stringify({
  expectedViewport:resized,before:{viewport:report.viewport,region:report.region,transform:report.transform},
  after:{viewport:clicked.viewport,region:clicked.region,transform:clicked.transform},cell,
  tile:catalog.maps[snapshot.activeBattle.mapId].cells.find(c=>c.x===cell.x&&c.y===cell.y),selected:clicked.selected,
 })});
 expect(clicked.selected).toMatchObject(cell);
 const session=await readSession(page),actor=session.state.initiative[session.state.activeIndex];
 const reach=previewMovement(session.state,actor,catalog);expect(reach.ok).toBe(true);
 if(!reach.ok)throw Error('Movement unavailable');
 expect(report.reachable).toEqual(reach.cells.map(c=>c.cell));
 const destination=reach.cells.find(c=>c.cost>0)!;
 await playCommand(page,{type:'move',unitId:actor,to:destination.cell});
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const committed=JSON.parse((await page.locator('#game').getAttribute('data-run-snapshot'))!);
 await page.screenshot({path:test.info().outputPath('desert-grid.png')});
 await page.reload();await expect(page.locator('#run-start')).toBeVisible();
 await page.locator('#run-start').click();await page.locator('#run-start-encounter').click();
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const fresh=JSON.parse((await page.locator('#game').getAttribute('data-run-snapshot'))!);
 expect(fresh.items.run.id).not.toBe(committed.items.run.id);
 expect(fresh.battlefield.mapHash).toBe(committed.battlefield.mapHash);
 expect(fresh.activeBattle).toEqual(snapshot.activeBattle);
 expect(errors).toEqual([]);
});

standardTest('desert landmarks distinguish blocked ground in the battle view', async ({ page }) => {
  await page.goto('/?game=run');
  await page.locator('#run-start').click();
  await page.locator('#run-start-encounter').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  const report = JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
  const tiles: (Tile & { desertLandmark?: string })[] = report.tiles;
  const landmarks = tiles.filter(tile => tile.desertLandmark);
  expect(new Set(landmarks.map(tile => tile.desertLandmark))).toEqual(new Set(['sandstone', 'cactus']));
  await page.locator('#battle-board-region').screenshot({ path: standardTest.info().outputPath('desert-landmarks.png') });

  const cactus = landmarks.find(tile => tile.x === 10 && tile.y === 4 && tile.desertLandmark === 'cactus');
  if (!cactus) throw new Error('Expected a cactus at (10, 4) on the default run board');
  const center = projectTile(cactus);
  const tip = { x: center.x, y: center.y - 25 };
  expect(pickTile(tiles, tip)).toMatchObject({ x: 9, y: 3, terrain: 'sand' });
  expect(report.reachable).not.toContainEqual({ x: cactus.x, y: cactus.y });
  const { x, y, scale } = report.transform;
  const screen = { x: x + tip.x * scale, y: y + tip.y * scale };
  if (standardTest.info().project.use.hasTouch) await page.touchscreen.tap(screen.x, screen.y);
  else await page.mouse.click(screen.x, screen.y);
  const selected = JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!).selected;
  expect(selected).toMatchObject({ x: cactus.x, y: cactus.y });
  await expect(page.locator('#battle-preview')).toBeVisible();
  await expect(page.locator('#battle-preview')).toHaveText('Rocky ground blocks movement and line of sight');
  expect((await readSession(page)).pending).toBeNull();
});


test('repeated generated restarts keep the static shape cache bounded',async({page})=>{
 await page.goto('/?game=run');await page.locator('#run-start').click();await page.locator('#run-start-encounter').click();
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
  await page.locator('#fit-restart').click();await page.locator('#run-confirm-restart').click();await page.locator('#run-start-encounter').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 }
 writeFileSync(test.info().outputPath('static-textures.json'),JSON.stringify(captures,null,2));
});


test('missing desert surface fails through the controlled asset error',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/battle/terrain/sand.png',route=>route.abort());
 await page.goto('/?game=run');await page.locator('#run-start').click();await page.locator('#run-start-encounter').click();
 await expect(page.locator('#fit-status')).toContainText('Error: Asset load failed');
 await expect(page.locator('#game')).toHaveAttribute('data-ready','false');
 expect(errors).toEqual([]);
});
