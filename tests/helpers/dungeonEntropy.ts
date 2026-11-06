import { test as base, expect } from './coreGraphics';
import { installRailControls } from './forceRailControls';
export type { Page } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';
export { expect };

/** Sequential uint32 draws for `crypto.getRandomValues(new Uint32Array(1))`, matching the #272 pin. */
export function pinDungeonEntropy(seed: boolean | number = true) {
  const original=crypto.getRandomValues.bind(crypto);
  crypto.getRandomValues=((array:ArrayBufferView<ArrayBuffer>)=>{
   if(array instanceof Uint32Array && array.length===1){
    const next=typeof seed==='number'?seed:Number(sessionStorage.getItem('test-dungeon-entropy')??'100');
    if(typeof seed!=='number')sessionStorage.setItem('test-dungeon-entropy',String(next+1));
    array[0]=next;return array;
   }
   return original(array);
  }) as typeof crypto.getRandomValues;
}

export async function applyPinnedDungeonSeed(context: BrowserContext, pinDungeonSeed: boolean | number) {
  if (pinDungeonSeed !== false) await context.addInitScript(pinDungeonEntropy, pinDungeonSeed);
}

/** True selects sequential draws; a number selects a fixed seed. Specs that need live `crypto.getRandomValues` can `test.use({ pinDungeonSeed: false })`. */
export const test = base.extend<{ pinDungeonSeed: boolean | number }>({
  pinDungeonSeed: [true, { option: true }],
  context: async ({ context, pinDungeonSeed }, use) => {
    await applyPinnedDungeonSeed(context, pinDungeonSeed);
    await use(context);
  },
});

/** Preserve the rail-control fixture for existing battle interaction specs. */
export const railTest = test.extend({
  context: async ({ context }, use) => {
    await installRailControls(context);
    await use(context);
  },
});
