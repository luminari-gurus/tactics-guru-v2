# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dungeon-exploration.spec.ts >> real traversal, art independence, keyboard locks, active battle and exact reload
- Location: tests/dungeon-exploration.spec.ts:14:1

# Error details

```
TypeError: Cannot read properties of null (reading 'width')
```

# Page snapshot

```yaml
- main [ref=e2]:
  - heading "Dungeon · Floor 1" [active] [level=1] [ref=e3]
  - paragraph [ref=e4]: "Continuing floors · Current encounter template: three battles; the third guards the stairs."
  - status [ref=e5]: "Movement refused: blockedStep. Nothing changed."
  - region "Floor exploration" [ref=e6]:
    - heading "Explore floor" [level=2] [ref=e7]
    - generic [ref=e8]:
      - text: Map art
      - combobox "Map art" [ref=e9]:
        - option "Simple" [selected]
        - option "Legacy 8-bit"
    - paragraph [ref=e10]: ● Player · 1/2 encounters · 3 guardian · ✓ cleared · ↑/↓ stairs. Reveal reaches two cells, including through walls. Tap adjacent cells or use direction controls.
    - application "Floor 1 map. Player row 3, column 15. Arrow or WASD keys move one cell." [ref=e11]:
      - generic [aria-hidden] [ref=e65]: ↑
      - generic [aria-hidden] [ref=e66]: ●
      - generic [aria-hidden] [ref=e87]: "3"
    - group "Move player" [ref=e412]:
      - button "North" [ref=e413] [cursor=pointer]
      - button "East" [ref=e414] [cursor=pointer]
      - button "South" [ref=e415] [cursor=pointer]
      - button "West" [ref=e416] [cursor=pointer]
    - status [ref=e417]: Player cell 54 · Revealed 18/400 · Visited 2.
    - list "Discovered places" [ref=e418]:
      - listitem [ref=e419]: Upstairs · row 3, column 14 · Exit unavailable · Visited
      - listitem [ref=e420]: Guardian · row 4, column 16 · Locked
  - region "Stairs" [ref=e421]:
    - heading "Stairs" [level=2] [ref=e422]
    - paragraph [ref=e423]: Walk onto the matching stair to use it. Upstairs is unavailable on floor 1.
    - paragraph [ref=e424]: Defeat the guardian and claim pending rewards to unlock descent.
    - button "Ascend" [disabled] [ref=e425]
    - button "Descend" [disabled] [ref=e426]
  - region "Party" [ref=e427]:
    - heading "Party" [level=2] [ref=e428]
    - paragraph [ref=e429]: "fighter: 18/18 HP · Accuracy 4 · Armor class 14"
    - paragraph [ref=e430]: "ranger: 12/12 HP · Accuracy 5 · Armor class 12"
    - paragraph [ref=e431]: "mage: 11/11 HP · Accuracy 3 · Armor class 11"
  - region "Owned items" [ref=e432]:
    - heading "Owned items" [level=2] [ref=e433]
    - paragraph [ref=e434]: Charms 0/6 · Discard a charm with confirmation to free space.
    - paragraph [ref=e435]: No owned items yet.
  - button "Save recovery" [ref=e436] [cursor=pointer]
  - button "Start new dungeon" [ref=e437] [cursor=pointer]
  - navigation [ref=e438]:
    - link "Three-battle scenario" [ref=e439] [cursor=pointer]:
      - /url: /run
    - link "Single battle" [ref=e440] [cursor=pointer]:
      - /url: /
    - link "Map prototype" [ref=e441] [cursor=pointer]:
      - /url: /map
  - group [ref=e442]:
    - generic "Privacy & analytics" [ref=e443] [cursor=pointer]
```

# Test source

```ts
  1  | import { expect,test } from '@playwright/test';
  2  | import { writeFileSync } from 'node:fs';
  3  | import { gzipSync } from 'node:zlib';
  4  | import { dungeonSnapshot, walkDungeon } from './helpers/dungeonTraversal';
  5  | import { neighbors, poiCell } from '../src/domain/exploration';
  6  | import { generateMap } from '../src/map/generate';
  7  | import { freshDungeon } from '../src/domain/dungeon';
  8  | import { legacyDungeonIdentity } from '../src/content/dungeon';
  9  | import { canonical, hashJson } from '../src/domain/contentIdentity';
  10 | import { DUNGEON_KEYS } from '../src/persistence/dungeonStorage';
  11 | import { readSession,playCommand } from './helpers/battlePolicy';
  12 | import { playerDecision } from './helpers/playerPolicy';
  13 | import { dungeonBattle } from '../src/domain/dungeon';
  14 | test('real traversal, art independence, keyboard locks, active battle and exact reload',async({page,isMobile})=>{
  15 |  test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  16 |  await page.goto('dungeon');await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await page.locator('#dungeon-confirm-new').click();
  17 |  const initial=await dungeonSnapshot(page),f=initial.floors[0],map=generateMap(f.descriptor.seed,'rooms');
  18 |  await expect(page.locator('#dungeon-start-encounter')).toHaveCount(0);await expect(page.locator('[aria-label="Discovered places"]')).toContainText('Upstairs');
  19 |  const adjacent=neighbors(f.position).find(n=>map.cells[n])!;
  20 |  await walkDungeon(page,adjacent,isMobile?'touch':'pointer');const stepped=await dungeonSnapshot(page);expect(stepped.revision).toBe(initial.revision+1);
  21 |  await page.locator('#dungeon-map').focus();await page.keyboard.down('ArrowUp');await page.keyboard.up('ArrowUp');const after=await dungeonSnapshot(page);
  22 |  await page.locator('#dungeon-map').dispatchEvent('keydown',{key:'ArrowUp',repeat:true});expect(await dungeonSnapshot(page)).toEqual(after);
  23 |  await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await page.keyboard.press('ArrowDown');expect(await dungeonSnapshot(page)).toEqual(after);await page.locator('#dungeon-cancel-new').click();
  24 |  await page.getByRole('combobox',{name:'Map art',exact:true}).selectOption('legacy-8bit');await expect(page.locator('#dungeon-map')).toHaveAttribute('data-art','legacy-8bit');
  25 |  await page.waitForFunction(()=>![...document.images].some(i=>!i.complete));expect(await dungeonSnapshot(page)).toEqual(after);
  26 |  await page.getByRole('combobox',{name:'Map art',exact:true}).selectOption('simple');expect(await dungeonSnapshot(page)).toEqual(after);
> 27 |  for(const b of await page.locator('.dungeon-directions button').all()){const box=await b.boundingBox();expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);}
     |                                                                                                                     ^ TypeError: Cannot read properties of null (reading 'width')
  28 |  await page.screenshot({path:test.info().outputPath('exploration-revealed.png'),fullPage:true});
  29 |  expect(await page.locator('#dungeon-screen').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
  30 |  await walkDungeon(page,poiCell(f.exploration.pois[0]),isMobile?'touch':'keyboard');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  31 |  const battle=await dungeonSnapshot(page);expect(battle.phase).toBe('battle');expect(battle.floors[0].position).toBe(poiCell(f.exploration.pois[0]));
  32 |  const command=playerDecision((await readSession(page)).state,dungeonBattle(battle)!.catalog);await playCommand(page,command);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');const saved=await dungeonSnapshot(page);
  33 |  await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');expect(await dungeonSnapshot(page)).toEqual(saved);
  34 |  writeFileSync(test.info().outputPath('spatial-battle-receipt.json'),JSON.stringify({initial,stepped,saved},null,2));expect(errors).toEqual([]);
  35 | });
  36 | test('v1 Continue preserves raw bytes until a v2 spatial save',async({page,isMobile})=>{
  37 |  const s=freshDungeon('legacy-browser',13),payload={...s,floors:s.floors.map(({exploration,...f})=>f)},body={kind:'tactics-guru:dungeon',format:1,identity:legacyDungeonIdentity,payload},raw=canonical({...body,digest:hashJson(body)});
  38 |  await page.goto('dungeon');await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:DUNGEON_KEYS.primary,raw});await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
  39 |  expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary)).toBe(raw);
  40 |  const before=await dungeonSnapshot(page),f=before.floors[0],map=generateMap(f.descriptor.seed,'rooms'),n=neighbors(f.position).find(n=>map.cells[n])!;
  41 |  await walkDungeon(page,n,isMobile?'touch':'keyboard');expect(await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.backup)).toBe(raw);
  42 |  const saved=await page.evaluate(key=>localStorage.getItem(key),DUNGEON_KEYS.primary);expect(JSON.parse(saved!).format).toBe(2);
  43 |  await page.reload();await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();expect((await dungeonSnapshot(page)).floors[0].position).toBe(n);
  44 | });
  45 | test('map input stays inert while hidden and retains discovery through resize and failed art',async({page})=>{
  46 |  await page.route('**/map-art/**',route=>route.abort());await page.goto('dungeon');await page.getByRole('button',{name:'Play unsaved dungeon',exact:true}).click();
  47 |  const before=await dungeonSnapshot(page);await page.locator('#dungeon-art').selectOption('legacy-8bit');await expect(page.locator('#dungeon-map-feedback')).toContainText('fallback');expect(await dungeonSnapshot(page)).toEqual(before);
  48 |  await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:true}));await page.locator('#dungeon-map').focus();await page.keyboard.press('ArrowRight');expect(await dungeonSnapshot(page)).toEqual(before);
  49 |  await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));const size=page.viewportSize()!;await page.setViewportSize({width:size.height,height:size.width});expect(await dungeonSnapshot(page)).toEqual(before);
  50 |  await page.screenshot({path:test.info().outputPath('exploration-rotated-fallback.png'),fullPage:true});
  51 | });
  52 | test('records route transfer and map responsiveness against established budgets',async({page,request})=>{
  53 |  const begin=Date.now();await page.goto('dungeon');await expect(page.getByRole('heading',{name:'Dungeon floors',exact:true})).toBeVisible();const coldUsableMs=Date.now()-begin;
  54 |  await page.getByRole('button',{name:'Play unsaved dungeon',exact:true}).click();const timings:number[]=[];
  55 |  const start=await dungeonSnapshot(page),f=start.floors[0],map=generateMap(f.descriptor.seed,'rooms'),neighbor=neighbors(f.position).find(n=>map.cells[n]&&!f.exploration.pois.some(p=>poiCell(p)===n))!;
  56 |  for(let i=0;i<20;i++)timings.push(await page.evaluate(destination=>{const begin=performance.now();const cell=document.querySelector<HTMLElement>(`#dungeon-map [data-cell="${destination}"]`)!;cell.click();return performance.now()-begin;},i%2===0?neighbor:f.position));
  57 |  const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(e=>({name:e.name,encodedBodySize:(e as PerformanceResourceTiming).encodedBodySize})));
  58 |  const code=[];for(const r of resources.filter(r=>/\.(js|css)$/.test(r.name))){const response=await request.get(r.name),body=await response.body();code.push({url:new URL(r.name).pathname,raw:body.length,gzip:gzipSync(body).length});}
  59 |  timings.sort((a,b)=>a-b);const p95=timings[Math.ceil(timings.length*.95)-1],gzip=code.reduce((n,r)=>n+r.gzip,0),assets=resources.filter(r=>!r.name.match(/\.(js|css)$/)).reduce((n,r)=>n+r.encodedBodySize,0);
  60 |  const receipt={commit:await page.locator('#game').getAttribute('data-commit'),coldUsableMs,stepP95Ms:p95,codeGzipBytes:gzip,observedAssetBytes:assets,budgets:{coldUsableMs:2500,stepP95Ms:33.4,codeGzipBytes:400000,assetBytes:1500000},passes:{cold:coldUsableMs<=2500,step:p95<=33.4,code:gzip<=400000,assets:assets<=1500000},code,timings,resources};
  61 |  writeFileSync(test.info().outputPath('exploration-performance.json'),JSON.stringify(receipt,null,2));expect(timings).toHaveLength(20);expect((await dungeonSnapshot(page)).floors[0].position).toBe(f.position);
  62 | });
  63 | 
```