import { expect, type Page } from '@playwright/test';
import type { DungeonState } from '../../src/domain/dungeon';
import { generateMap } from '../../src/map/generate';
import { neighbors, poiCell } from '../../src/domain/exploration';
export async function dungeonSnapshot(page: Page): Promise<DungeonState> { return JSON.parse((await page.locator('#game').getAttribute('data-dungeon-snapshot'))!); }
export async function walkDungeon(page: Page, target?: number, mode: 'keyboard'|'touch'|'pointer' = 'keyboard') {
  const s=await dungeonSnapshot(page),f=s.floors[s.depth-1],destination=target??poiCell(f.exploration.pois[f.completed]);
  // Enabled stairs change floors on entry. They are only a valid path when requested.
  const transit=new Set([...(s.depth>1?[f.descriptor.upstairs]:[]),...(f.completed===3?[f.descriptor.downstairs]:[])].filter(cell=>cell!==destination));
  const map=generateMap(f.descriptor.seed,'rooms'),previous=new Map<number,number>();const queue=[f.position];previous.set(f.position,-1);
  for(let i=0;i<queue.length&&!previous.has(destination);i++)for(const n of neighbors(queue[i]))if(map.cells[n]&&!transit.has(n)&&!previous.has(n)){previous.set(n,queue[i]);queue.push(n);}
  if(!previous.has(destination))throw Error('Unreachable fixture destination');
  const path:number[]=[];for(let n=destination;n!==f.position;n=previous.get(n)!)path.unshift(n);
  let current=f.position;
  for(const n of path){const delta=n-current,name=delta===-20?'north':delta===20?'south':delta===1?'east':'west';
    if(mode==='keyboard'){await page.locator('#dungeon-map').focus();await page.keyboard.press(delta===-20?'ArrowUp':delta===20?'ArrowDown':delta===1?'ArrowRight':'ArrowLeft');}
    else if(mode==='touch')await page.locator(`#dungeon-step-${name}`).tap();
    else await page.locator(`#dungeon-map [data-cell="${n}"]`).click();
    const after=await dungeonSnapshot(page);
    expect(after.floors[s.depth-1].position).toBe(n);
    if(after.depth!==s.depth){expect(n).toBe(destination);break;}
    current=n;
  }
  return path;
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
