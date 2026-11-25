import { expect, test } from './helpers/forceRailControls';
import { menuFixture } from './helpers/menuFixtures';
import { DUNGEON_KEYS } from '../src/persistence/dungeonStorage';
import { RUN_RECORD_KEYS } from '../src/persistence/runRecordsStorage';

test.use({ launchOptions: async ({ browserName }, use) => {
  await use({
    executablePath: browserName === 'chromium' ? process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE : undefined,
    ignoreDefaultArgs: ['--disable-back-forward-cache'],
  });
} });

test('cached dungeon record history preserves the replacement and one old result',async({page,baseURL})=>{
  const mode='dungeon',slots=DUNGEON_KEYS,text=menuFixture(mode);
  const old=JSON.parse(text).payload,oldId=old.id;
  const first=new URL(`./?game=${mode}&history=records-first`,baseURL).href;
  const restoreMessage=`test:dungeon-bfcache-restored ${first}`;
  await page.addInitScript(({first,restoreMessage})=>{
    window.addEventListener('pageshow',event=>{
      if(event.persisted&&location.href===first)console.debug(restoreMessage);
    });
  },{first,restoreMessage});
  await page.goto('./');await page.evaluate(({slots,text})=>{localStorage.setItem(slots.primary,text);localStorage.setItem(slots.backup,text);},{slots,text});
  await page.goto(first);
  const expectCurrentMap=()=>expect(page.locator('#dungeon-map')).toBeVisible();
  await expectCurrentMap();
  // The menu link finishes the old dungeon's pending playtime checkpoint before caching it.
  await page.getByRole('link',{name:'Main menu',exact:true}).click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expectCurrentMap();
  await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();
  await page.locator('#dungeon-confirm-new').click();
  await expect(page.locator('#dungeon-map')).toBeVisible();
  // Capture reviewed bytes after the legitimate exploration-time checkpoint.
  await page.getByRole('button',{name:'Save recovery',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Dungeon save recovery',exact:true})).toBeVisible();
  const saved=await page.evaluate(slots=>[localStorage.getItem(slots.primary),localStorage.getItem(slots.backup)],slots);
  const newId=JSON.parse(saved[0]!).payload.id;
  expect(newId).not.toBe(oldId);
  const savedRecords=await page.evaluate(key=>localStorage.getItem(key),RUN_RECORD_KEYS.primary);
  expect(JSON.parse(savedRecords!).records).toMatchObject([{id:oldId,outcome:'abandoned'}]);
  // Use the browser's history directly because a BFCache restore skips Playwright's navigation lifecycle.
  // Observe pageshow before evaluating anything in the restored document, which immediately reloads.
  await Promise.all([
    page.waitForEvent('console',{predicate:message=>message.text()===restoreMessage,timeout:5000}),
    // Go back past the menu to the original dungeon entry.
    page.evaluate(()=>{setTimeout(()=>window.history.go(-2),0);}),
  ]);
  await expect(page.locator('#game')).toHaveAttribute('data-dungeon-snapshot', new RegExp(`"id":"${newId}"`));
  await expectCurrentMap();
  await expect(page).toHaveURL(first);
  expect(await page.evaluate(slots=>[localStorage.getItem(slots.primary),localStorage.getItem(slots.backup)],slots)).toEqual(saved);
  expect(await page.evaluate(key=>localStorage.getItem(key),RUN_RECORD_KEYS.primary)).toBe(savedRecords);
});
