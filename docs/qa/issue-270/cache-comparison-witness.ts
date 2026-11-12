import {test,expect,type Page} from '../helpers/forceRailControls';
import {RUN_STORAGE_KEYS} from '../../src/persistence/runStorage';
test.use({launchOptions:async({browserName},use)=>await use({executablePath:browserName==='chromium'?process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE:undefined,ignoreDefaultArgs:['--disable-back-forward-cache']})});
for(const departure of ['typed navigation','normal link'])test(`actual active run cache boundary: ${departure}`,async({page,context,baseURL},info)=>{
 await page.addInitScript(()=>window.addEventListener('pageshow',event=>{if(event.persisted)sessionStorage.setItem('issue270:cache-witness','yes');}));
 await page.goto('/?game=run');await page.locator('#run-start').click();await page.locator('#run-start-encounter').click();
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 await expect(page.locator('#battle-persistence')).toContainText('Run saved on this device');
 if(departure==='typed navigation'){await page.goto(new URL('map',baseURL).href);await expect(page.locator('#map-grid span')).toHaveCount(400);}
 else {await page.getByRole('link',{name:'Single battle',exact:true}).first().click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');}
 const replacement=await context.newPage();await replacement.goto('/?game=run');await replacement.locator('#run-start').click();await replacement.locator('#run-confirm-new').click();
 await expect(replacement.locator('#run-item-status')).toHaveText('Run saved on this device');
 const before=await replacement.evaluate(keys=>[localStorage.getItem(keys.primary),localStorage.getItem(keys.backup)],RUN_STORAGE_KEYS);
 await replacement.close();await page.goBack({waitUntil:'commit'});await expect(page.locator('#run-continue')).toBeVisible();
 const evidence=await page.evaluate(()=>({persisted:sessionStorage.getItem('issue270:cache-witness'),navigation:(performance.getEntriesByType('navigation')[0] as any)?.toJSON()}));
 await info.attach('native-cache-diagnostic',{body:JSON.stringify(evidence),contentType:'application/json'});
 expect(await page.evaluate(keys=>[localStorage.getItem(keys.primary),localStorage.getItem(keys.backup)],RUN_STORAGE_KEYS)).toEqual(before);
 expect(evidence.persisted).toBe('yes');
});