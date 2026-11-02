import { test as base, expect } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';
export { expect };

/** Sequential uint32 draws for `crypto.getRandomValues(new Uint32Array(1))`, matching the #272 pin. */
export function pinDungeonEntropy() {
  const original=crypto.getRandomValues.bind(crypto);
  crypto.getRandomValues=((array:ArrayBufferView<ArrayBuffer>)=>{
   if(array instanceof Uint32Array && array.length===1){
    const next=Number(sessionStorage.getItem('test-dungeon-entropy')??'100');
    sessionStorage.setItem('test-dungeon-entropy',String(next+1));array[0]=next;return array;
   }
   return original(array);
  }) as typeof crypto.getRandomValues;
}

export async function applyPinnedDungeonSeed(context: BrowserContext, pinDungeonSeed: boolean) {
  if (pinDungeonSeed) await context.addInitScript(pinDungeonEntropy);
}

/** Default on. Specs that need live `crypto.getRandomValues` can `test.use({ pinDungeonSeed: false })`. */
export const test = base.extend<{ pinDungeonSeed: boolean }>({
  pinDungeonSeed: [true, { option: true }],
  context: async ({ context, pinDungeonSeed }, use) => {
    await applyPinnedDungeonSeed(context, pinDungeonSeed);
    await use(context);
  },
});
