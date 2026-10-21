import { expect, type Page } from '@playwright/test';
import type { DungeonState } from '../../src/domain/dungeon';
import { generateMap } from '../../src/map/generate';
import { neighbors, poiCell } from '../../src/domain/exploration';
export async function dungeonSnapshot(page: Page): Promise<DungeonState> { return JSON.parse((await page.locator('#game').getAttribute('data-dungeon-snapshot'))!); }
export async function walkDungeon(page: Page, target?: number, mode: 'keyboard'|'touch'|'pointer' = 'keyboard') {
  const s=await dungeonSnapshot(page),f=s.floors[s.depth-1],destination=target??poiCell(f.exploration.pois[f.completed]);
  const map=generateMap(f.descriptor.seed,'rooms'),previous=new Map<number,number>();const queue=[f.position];previous.set(f.position,-1);
  for(let i=0;i<queue.length&&!previous.has(destination);i++)for(const n of neighbors(queue[i]))if(map.cells[n]&&!previous.has(n)){previous.set(n,queue[i]);queue.push(n);}
  if(!previous.has(destination))throw Error('Unreachable fixture destination');
  const path:number[]=[];for(let n=destination;n!==f.position;n=previous.get(n)!)path.unshift(n);
  let current=f.position;
  for(const n of path){const delta=n-current,name=delta===-20?'north':delta===20?'south':delta===1?'east':'west';
    if(mode==='keyboard'){await page.locator('#dungeon-map').focus();await page.keyboard.press(delta===-20?'ArrowUp':delta===20?'ArrowDown':delta===1?'ArrowRight':'ArrowLeft');}
    else if(mode==='touch')await page.locator(`#dungeon-step-${name}`).tap();
    else await page.locator(`#dungeon-map [data-cell="${n}"]`).click();
    expect((await dungeonSnapshot(page)).floors[s.depth-1].position).toBe(n);current=n;
  }
  return path;
}
