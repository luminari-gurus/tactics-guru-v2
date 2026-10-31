import { expect, type Page } from '@playwright/test';
import type { DungeonState } from '../../src/domain/dungeon';
import { generateMap } from '../../src/map/generate';
import { neighbors, poiCell } from '../../src/domain/exploration';
import { clearedDungeonSlots } from '../../src/domain/dungeon';
export async function dungeonSnapshot(page: Page): Promise<DungeonState> { return JSON.parse((await page.locator('#game').getAttribute('data-dungeon-snapshot'))!); }
/** Phaser.Game construction runs before startup render, so Continue is absent until the heading appears. */
export async function continueSavedDungeon(page: Page) {
  const ready = { timeout: 15_000 };
  await expect(page.getByRole('heading', { name: 'Dungeon floors', exact: true })).toBeVisible(ready);
  const resume = page.getByRole('button', { name: 'Continue saved dungeon', exact: true });
  await expect(resume).toBeEnabled(ready);
  await resume.click();
}
export async function walkDungeon(page: Page, target?: number, mode: 'keyboard'|'touch'|'pointer' = 'keyboard') {
  await expect(page.locator('#dungeon-screen')).toBeVisible();
  const initial=await dungeonSnapshot(page), floor=initial.floors[initial.depth-1];
  const targetPoi=target===undefined ? undefined : floor.exploration.pois.find(p=>poiCell(p)===target&&!clearedDungeonSlots(floor).includes(p.encounterSlot));
  const path:number[]=[];
  for(let attempt=0;attempt<400;attempt++) {
    const s=await dungeonSnapshot(page), f=s.floors[s.depth-1];
    if(s.depth!==initial.depth||s.phase!=='ready')return path;
    const live=f.exploration.pois.filter(p=>!clearedDungeonSlots(f).includes(p.encounterSlot));
    let destination=targetPoi ? poiCell(f.exploration.pois.find(p=>p.id===targetPoi.id)!) : target;
    if(f.position===destination)return path;
    const blocked=new Set(live.filter(p=>p.id!==targetPoi?.id).map(poiCell));
    // Entering an available stair changes floors, so only route through the requested stair.
    for(const stair of [...(s.depth>1?[f.descriptor.upstairs]:[]),...(f.completed===3?[f.descriptor.downstairs]:[])])if(stair!==destination)blocked.add(stair);
    const map=generateMap(f.descriptor.seed,'rooms'), previous=new Map<number,number>(), queue=[f.position];previous.set(f.position,-1);
    for(let i=0;i<queue.length&&(destination===undefined||!previous.has(destination));i++)for(const n of neighbors(queue[i]))if(map.cells[n]&&!previous.has(n)){
      if(blocked.has(n)){if(target===undefined&&live.some(p=>poiCell(p)===n)){previous.set(n,queue[i]);destination=n;break;}continue;}
      previous.set(n,queue[i]);queue.push(n);
    }
    // A moving enemy can temporarily block the only route. Take a safe step to
    // advance the simulation, then plan again against the new positions.
    let n: number;
    if(destination===undefined||!previous.has(destination)) {
      const choices=neighbors(f.position).filter(cell=>map.cells[cell]&&!blocked.has(cell));
      if(!choices.length)throw Error('No safe step toward fixture destination');
      n=choices[attempt%choices.length];
    } else { n=destination;while(previous.get(n)!==f.position)n=previous.get(n)!; }
    const delta=n-f.position,name=delta===-20?'north':delta===20?'south':delta===1?'east':'west';

    if(mode==='keyboard'){await page.locator('#dungeon-map').focus();await page.keyboard.press(delta===-20?'ArrowUp':delta===20?'ArrowDown':delta===1?'ArrowRight':'ArrowLeft');}
    else if(mode==='touch')await page.locator(`#dungeon-step-${name}`).tap();
    else await page.locator(`#dungeon-map [data-cell="${n}"]`).click();
    const after=await dungeonSnapshot(page);expect(after.floors[s.depth-1].position).toBe(n);path.push(n);
  }
  throw Error('Could not reach moving encounter within 400 steps');
}

/** Arrival is inert: leave the staircase and enter it again through normal input. */
export async function reenterDungeonStair(page: Page, direction: 'ascend'|'descend', mode: 'keyboard'|'touch'|'pointer' = 'keyboard') {
  const s=await dungeonSnapshot(page),f=s.floors[s.depth-1],map=generateMap(f.descriptor.seed,'rooms');
  const stair=direction==='ascend'?f.descriptor.upstairs:f.descriptor.downstairs;
  expect(f.position).toBe(stair);
  const adjacent=neighbors(stair).find(n=>map.cells[n]&&!f.exploration.pois.some(p=>poiCell(p)===n));
  if(adjacent===undefined)throw Error('No safe staircase exit');
  await walkDungeon(page,adjacent,mode);expect((await dungeonSnapshot(page)).depth).toBe(s.depth);
  await walkDungeon(page,stair,mode);
}
