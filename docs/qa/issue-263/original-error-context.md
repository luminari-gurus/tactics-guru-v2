# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dungeon-exploration.spec.ts >> stairs travel once per entry with wasd, stay on arrival and restore, and respect locks
- Location: tests/dungeon-exploration.spec.ts:86:66

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: locator('#dungeon-screen')
Expected: "ready"
Timeout: 60000ms
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" locator('#dungeon-screen') with timeout 60000ms
  - waiting for locator('#dungeon-screen')

```

```yaml
- main "Tactics Guru game canvas"
- complementary "Proof scene diagnostics":
  - status: Loading
  - button "Restart proof scene" [disabled]
  - group:
    - text: Board controls
    - 'button "Ground: Behind" [disabled]'
    - 'button "Ground: In front" [disabled]'
    - 'button "Raised: Behind" [disabled]'
    - 'button "Raised: In front" [disabled]'
    - text: Tree opacity (unit behind)
    - slider "Tree opacity (unit behind)" [disabled]: "40"
    - text: 40% Move destination
    - combobox "Move destination" [disabled]:
      - option "Choose a tile" [disabled] [selected]
      - option "Raised tile (2, 2)"
    - button "Start diagnostic move" [disabled]
    - text: Idle
    - button "Play test sound" [disabled]
    - text: Loading
  - paragraph: Elevated board · Tap to select · Drag to pan · Wheel/pinch to zoom
  - group: Measurements
```

# Test source

```ts
  1  | import { expect, type Page } from '@playwright/test';
  2  | import type { DungeonState } from '../../src/domain/dungeon';
  3  | import { generateMap } from '../../src/map/generate';
  4  | import { neighbors, poiCell } from '../../src/domain/exploration';
  5  | import { clearedDungeonSlots } from '../../src/domain/dungeon';
  6  | export async function dungeonSnapshot(page: Page): Promise<DungeonState> { return JSON.parse((await page.locator('#game').getAttribute('data-dungeon-snapshot'))!); }
  7  | /** Wait for Phaser READY (`#dungeon-screen[data-boot=ready]`), then heading and an enabled Continue. */
  8  | export async function continueSavedDungeon(page: Page) {
  9  |   const boot = { timeout: 60_000 };
> 10 |   await expect(page.locator('#dungeon-screen')).toHaveAttribute('data-boot', 'ready', boot);
     |                                                 ^ Error: expect(locator).toHaveAttribute(expected) failed
  11 |   await expect(page.getByRole('heading', { name: 'Dungeon floors', exact: true })).toBeVisible();
  12 |   const resume = page.getByRole('button', { name: 'Continue saved dungeon', exact: true });
  13 |   await expect(resume).toBeEnabled();
  14 |   await resume.click();
  15 | }
  16 | export async function walkDungeon(page: Page, target?: number, mode: 'keyboard'|'touch'|'pointer' = 'keyboard') {
  17 |   await expect(page.locator('#dungeon-screen')).toBeVisible();
  18 |   const initial=await dungeonSnapshot(page), floor=initial.floors[initial.depth-1];
  19 |   const targetPoi=target===undefined ? undefined : floor.exploration.pois.find(p=>poiCell(p)===target&&!clearedDungeonSlots(floor).includes(p.encounterSlot));
  20 |   const path:number[]=[];
  21 |   for(let attempt=0;attempt<400;attempt++) {
  22 |     const s=await dungeonSnapshot(page), f=s.floors[s.depth-1];
  23 |     if(s.depth!==initial.depth||s.phase!=='ready')return path;
  24 |     const live=f.exploration.pois.filter(p=>!clearedDungeonSlots(f).includes(p.encounterSlot));
  25 |     let destination=targetPoi ? poiCell(f.exploration.pois.find(p=>p.id===targetPoi.id)!) : target;
  26 |     if(f.position===destination)return path;
  27 |     const blocked=new Set(live.filter(p=>p.id!==targetPoi?.id).map(poiCell));
  28 |     // Entering an available stair changes floors, so only route through the requested stair.
  29 |     for(const stair of [...(s.depth>1?[f.descriptor.upstairs]:[]),...(f.completed===3?[f.descriptor.downstairs]:[])])if(stair!==destination)blocked.add(stair);
  30 |     const map=generateMap(f.descriptor.seed,'rooms'), previous=new Map<number,number>(), queue=[f.position];previous.set(f.position,-1);
  31 |     for(let i=0;i<queue.length&&(destination===undefined||!previous.has(destination));i++)for(const n of neighbors(queue[i]))if(map.cells[n]&&!previous.has(n)){
  32 |       if(blocked.has(n)){if(target===undefined&&live.some(p=>poiCell(p)===n)){previous.set(n,queue[i]);destination=n;break;}continue;}
  33 |       previous.set(n,queue[i]);queue.push(n);
  34 |     }
  35 |     // A moving enemy can temporarily block the only route. Take a safe step to
  36 |     // advance the simulation, then plan again against the new positions.
  37 |     let n: number;
  38 |     if(destination===undefined||!previous.has(destination)) {
  39 |       const choices=neighbors(f.position).filter(cell=>map.cells[cell]&&!blocked.has(cell));
  40 |       if(!choices.length)throw Error('No safe step toward fixture destination');
  41 |       n=choices[attempt%choices.length];
  42 |     } else { n=destination;while(previous.get(n)!==f.position)n=previous.get(n)!; }
  43 |     const delta=n-f.position,name=delta===-20?'north':delta===20?'south':delta===1?'east':'west';
  44 | 
  45 |     if(mode==='keyboard'){await page.locator('#dungeon-map').focus();await page.keyboard.press(delta===-20?'ArrowUp':delta===20?'ArrowDown':delta===1?'ArrowRight':'ArrowLeft');}
  46 |     else if(mode==='touch')await page.locator(`#dungeon-step-${name}`).tap();
  47 |     else await page.locator(`#dungeon-map [data-cell="${n}"]`).click();
  48 |     const after=await dungeonSnapshot(page);expect(after.floors[s.depth-1].position).toBe(n);path.push(n);
  49 |   }
  50 |   throw Error('Could not reach moving encounter within 400 steps');
  51 | }
  52 | 
  53 | /** Arrival is inert: leave the staircase and enter it again through normal input. */
  54 | export async function reenterDungeonStair(page: Page, direction: 'ascend'|'descend', mode: 'keyboard'|'touch'|'pointer' = 'keyboard') {
  55 |   const s=await dungeonSnapshot(page),f=s.floors[s.depth-1],map=generateMap(f.descriptor.seed,'rooms');
  56 |   const stair=direction==='ascend'?f.descriptor.upstairs:f.descriptor.downstairs;
  57 |   expect(f.position).toBe(stair);
  58 |   const adjacent=neighbors(stair).find(n=>map.cells[n]&&!f.exploration.pois.some(p=>poiCell(p)===n));
  59 |   if(adjacent===undefined)throw Error('No safe staircase exit');
  60 |   await walkDungeon(page,adjacent,mode);expect((await dungeonSnapshot(page)).depth).toBe(s.depth);
  61 |   await walkDungeon(page,stair,mode);
  62 | }
  63 | 
```