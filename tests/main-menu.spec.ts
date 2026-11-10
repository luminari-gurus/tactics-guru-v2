import { generateMap } from '../src/map/generate';
import { readFileSync } from 'node:fs';
import { type Page, type Response } from '@playwright/test';
import { test as base, expect } from './helpers/dungeonEntropy';
import { preparedSnapshot, rewardSnapshot, runContext } from './helpers/runItemFixtures';
import { encodeRunSave, type RunSnapshot } from '../src/domain/runSaveEnvelope';
import { readFile } from 'node:fs/promises';
import { menuFixture, terminalMenuBattle, rewardRunFixture } from './helpers/menuFixtures';
import { BATTLE_STORAGE_KEYS } from '../src/persistence/battleStorage';
import { RUN_STORAGE_KEYS } from '../src/persistence/runStorage';
import { DUNGEON_KEYS } from '../src/persistence/dungeonStorage';
import { emptyRunRecords, type RunRecord } from '../src/domain/runRecords';
import { encodeRunRecords, RUN_RECORD_KEYS } from '../src/persistence/runRecordsStorage';
import { readSession, reviewDraught, playerDecision } from './helpers/battlePolicy';
import { BattleSession } from '../src/app/BattleSession';
import { encodeBattleSave } from '../src/domain/saveEnvelope';
import { standaloneCatalog as battleCatalog } from './helpers/playerPolicy';
import { startApplicationLoadDiagnostics, type ApplicationLoadDiagnostics } from './helpers/applicationLoadDiagnostics';
import { startBattleModuleFaultServer } from './helpers/battleModuleFaultServer';

const test = base.extend<{ applicationLoadDiagnostics: ApplicationLoadDiagnostics }>({
 applicationLoadDiagnostics: [async ({page},use,info) => {
  const diagnostics = await startApplicationLoadDiagnostics(page,info);
  try { await use(diagnostics); } finally { await diagnostics.finalize(); }
 }, {auto:true}],
});
const keys={battle:BATTLE_STORAGE_KEYS,run:RUN_STORAGE_KEYS,dungeon:DUNGEON_KEYS};

test('main menu: records empty state is read-only and keyboard focus returns to the invoker', async ({ page }) => {
  await page.goto('./');
  const invoker = page.getByRole('button', { name: 'Hall of Records', exact: true });
  await invoker.focus(); await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Hall of Records', exact: true });
  await expect(dialog.getByRole('status')).toHaveText('No finished journeys recorded yet.');
  await expect(dialog).toContainText('Records stay on this device and browser');
  expect(await page.evaluate(slots => [localStorage.getItem(slots.primary), localStorage.getItem(slots.backup)], RUN_RECORD_KEYS)).toEqual([null, null]);
  await dialog.getByRole('button', { name: 'Close', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(invoker).toBeFocused(); await expect(dialog).not.toBeVisible();
});

test('main menu: records display and reviewed export restore reset preserve active saves', async ({ page, isMobile }, info) => {
  const rows: RunRecord[] = [
    { mode: 'run', id: 'authored-example', outcome: 'defeat', recordedAt: Date.UTC(2026, 10, 10, 12), battlesWon: 1, floorsCleared: null, deepestFloor: null },
    { mode: 'dungeon', id: 'dungeon-example', outcome: 'abandoned', recordedAt: Date.UTC(2026, 10, 10, 13), battlesWon: 6, floorsCleared: 2, deepestFloor: 3 },
  ];
  const encoded = encodeRunRecords({ ...emptyRunRecords(), records: rows })!;
  const saved = menuFixture('run');
  await page.addInitScript(({ records, encoded, run, saved }) => {
    if (sessionStorage.getItem('test:records-seeded')) return;
    localStorage.setItem(records.primary, 'preserved corrupt history'); localStorage.setItem(records.backup, encoded);
    localStorage.setItem(run.primary, saved); localStorage.setItem(run.backup, saved);
    sessionStorage.setItem('test:records-seeded', 'yes');
  }, { records: RUN_RECORD_KEYS, encoded, run: keys.run, saved });
  await page.goto('./');
  const activate = async (label: string) => {
    const target = page.getByRole('button', { name: label, exact: true });
    if (isMobile) await target.tap(); else await target.click();
  };
  await activate('Hall of Records');
  const dialog = page.getByRole('dialog', { name: 'Hall of Records', exact: true });
  const list = dialog.getByRole('list', { name: 'Recent journeys' });
  await expect(dialog.getByRole('status')).toContainText('History needs recovery');
  await expect(list.getByRole('listitem')).toHaveCount(2);
  await expect(list.getByRole('listitem').first()).toContainText('Dungeon · Abandoned');
  await expect(list.getByRole('listitem').first()).toContainText('Battles won: 6 · Floors cleared: 2 · Deepest floor: 3');
  const stored = () => page.evaluate(({ records, run }) => ({ primary: localStorage.getItem(records.primary), backup: localStorage.getItem(records.backup),
    runPrimary: localStorage.getItem(run.primary), runBackup: localStorage.getItem(run.backup) }), { records: RUN_RECORD_KEYS, run: keys.run });
  const before = await stored(); expect(before).toEqual({ primary: 'preserved corrupt history', backup: encoded, runPrimary: saved, runBackup: saved });
  await page.screenshot({ path: info.outputPath('records-recovery.png'), fullPage: true });
  expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  const download = page.waitForEvent('download'); await activate('Export primary history');
  const exported = await download; expect(exported.suggestedFilename()).toBe('tactics-guru-records-primary.json');
  expect(await readFile((await exported.path())!, 'utf8')).toBe('preserved corrupt history');
  expect(await stored()).toEqual(before);
  await activate('Reset records'); await activate('Cancel'); expect(await stored()).toEqual(before);
  await activate('Restore reviewed history'); await expect(dialog.getByRole('status')).toContainText('Run history updated');
  expect(await stored()).toEqual({ primary: encoded, backup: encoded, runPrimary: saved, runBackup: saved });
  await activate('Reset records'); await activate('Confirm reset records');
  await expect(dialog.getByRole('status')).toContainText('No finished journeys recorded yet.');
  const cleared = await stored(); expect(cleared.primary).toBe(encodeRunRecords(emptyRunRecords())); expect(cleared.backup).toBe(cleared.primary);
  expect(cleared.runPrimary).toBe(saved); expect(cleared.runBackup).toBe(saved);
  await activate('Close'); await expect(page.getByRole('button', { name: 'Hall of Records', exact: true })).toBeFocused();
});

test('main menu: records unavailable storage is honest and leaves gameplay navigation usable', async ({ page, isMobile }) => {
  await page.addInitScript(slots => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function(key) {
      if (key === slots.primary || key === slots.backup) throw new DOMException('Blocked', 'SecurityError');
      return original.call(this, key);
    };
  }, RUN_RECORD_KEYS);
  await page.goto('./');
  const invoker = page.getByRole('button', { name: 'Hall of Records', exact: true });
  if (isMobile) await invoker.tap(); else await invoker.click();
  const dialog = page.getByRole('dialog', { name: 'Hall of Records', exact: true });
  await expect(dialog.getByRole('status')).toHaveText('Run history storage is unavailable. You can still play.');
  await expect(dialog.getByRole('button', { name: 'Reset records', exact: true })).toHaveCount(0);
  if (isMobile) await dialog.getByRole('button', { name: 'Close', exact: true }).tap(); else await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeEnabled();
});

test('main menu: records authored replacement waits for confirmation and freezes the old journey', async ({ page, isMobile }) => {
  const saved = preparedSnapshot(), text = encodeRunSave(saved, runContext); if (!text.ok) throw Error('Invalid run fixture');
  const battle = menuFixture('battle');
  await page.addInitScript(({ run, battleKeys, text, battle }) => {
    if (sessionStorage.getItem('test:replacement-seeded')) return;
    localStorage.setItem(run.primary, text); localStorage.setItem(run.backup, text);
    localStorage.setItem(battleKeys.primary, battle); sessionStorage.setItem('test:replacement-seeded', 'yes');
  }, { run: keys.run, battleKeys: keys.battle, text: text.text, battle });
  await page.goto('./?game=run'); await page.locator('#run-continue').click(); await page.locator('#run-start-encounter').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  const history = () => page.evaluate(slots => {
    const value = localStorage.getItem(slots.primary); return value ? JSON.parse(value).records : [];
  }, RUN_RECORD_KEYS);
  const activate = async (selector: string) => { const target = page.locator(selector); if (isMobile) await target.tap(); else await target.click(); };
  const before = await page.evaluate(slots => [localStorage.getItem(slots.primary), localStorage.getItem(slots.backup)], keys.run);
  await activate('#fit-restart'); await activate('#run-cancel-new'); expect(await history()).toEqual([]);
  expect(await page.evaluate(slots => [localStorage.getItem(slots.primary), localStorage.getItem(slots.backup)], keys.run)).toEqual(before);
  await activate('#fit-restart'); await activate('#run-confirm-new');
  await expect(page.locator('#run-start-encounter')).toBeVisible();
  expect(await history()).toMatchObject([{ id: saved.items.run.id, outcome: 'abandoned', battlesWon: 1 }]);
  const recorded = await history();
  await page.reload(); await page.locator('#run-continue').click(); expect(await history()).toEqual(recorded);
  expect(await page.evaluate(key => localStorage.getItem(key), keys.battle.primary)).toBe(battle);
  await page.getByRole('link', { name: 'Main menu', exact: true }).last().click();
  await page.getByRole('button', { name: 'Hall of Records', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('dialog')).toContainText('Three-encounter run · Abandoned');
});

test('main menu: startup hides proof tools before application modules run',async({page})=>{
 let release!:()=>void;
 let held:Promise<void>;
 await page.route('**/*',async route=>{
  if(route.request().resourceType()==='script'){await held;await route.abort();}
  else if(route.request().resourceType()==='stylesheet')await route.abort();
  else await route.continue();
 });
 try{
  for(const route of ['', '?game=battle', '?game=run', '?game=dungeon', 'battle', 'run', 'dungeon', 'map', 'qbert']){
   held=new Promise<void>(resolve=>{release=resolve;});
   await page.goto('./'+route,{waitUntil:'commit'});
   await expect(page.locator('#fit-status')).toBeVisible();
   await expect(page.locator('#fit-status')).toHaveText('Loading');
   await expect(page.getByRole('button',{name:'Restart proof scene',exact:true})).not.toBeVisible();
   await expect(page.getByText('Board controls',{exact:true})).not.toBeVisible();
   await expect(page.getByText('Measurements',{exact:true})).not.toBeVisible();
   await expect(page.getByRole('complementary',{name:'Proof scene diagnostics'})).toHaveCount(0);
   await expect(page.getByRole('complementary',{name:'Game status',exact:true})).toBeVisible();
   await expect(page.locator('#fit-restart')).not.toBeVisible();
   await expect(page.locator('#board-caption')).not.toBeVisible();
   // WebKit waits for navigation to settle before capturing a screenshot.
   // Reject the held modules after asserting the shell; no app code can run.
   release();await page.waitForLoadState('load');
   if(!route)await page.screenshot({path:test.info().outputPath('neutral-startup.png')});
  }
 }finally{release();await page.unrouteAll({behavior:'wait'});}
});

test('main menu: failed gameplay imports retain visible recovery without proof tools',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route(/\/start(?:Battle|Run|Dungeon)App(?:-[^/]+\.js|\.ts)(?:\?|$)/,route=>route.abort());
 for(const mode of ['battle','run','dungeon']){
  await page.goto('./?game='+mode);
  await expect(page.getByRole('alert')).toHaveText('Error: Could not load the application. Reload the page to retry.');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText('Board controls',{exact:true})).not.toBeVisible();
  await expect(page.getByText('Measurements',{exact:true})).not.toBeVisible();
  await expect(page.getByRole('complementary',{name:'Proof scene diagnostics'})).toHaveCount(0);
 }
 expect(errors).toEqual([]);
});

test('main menu: application import failure preserves battle saves and reload resumes without historical effects',async({page,browserName,applicationLoadDiagnostics},info)=>{
 test.skip(process.env.PLAYWRIGHT_SERVER_MODE==='dev','Requires emitted production chunks and the build manifest.');
 // Reach a real accepted High Shot boundary, retaining different valid primary
 // and backup bytes so a reload cannot silently replace either saved slot.
 const session=new BattleSession(battleCatalog,'map:forest_ruins',2);
 let saved:{primary:string;backup:string;state:typeof session.state}|undefined;
 try {
  for(let i=0;i<200 && session.state.outcome==='ongoing';i++){
   const command=session.phase==='player'?playerDecision(session.state):null;
   if(command && !session.prepare(command).ok)throw Error('Recovery fixture policy rejected');
   const step=command?session.confirm():session.nextEnemy();
   if(!step)throw Error('Recovery fixture did not advance');
   session.finishPresentation(step.token);
   if(command?.type==='useAbility' && command.abilityId==='ability:high_shot'){
    const primary=encodeBattleSave(step.after,battleCatalog),backup=encodeBattleSave(step.before,battleCatalog);
    if(!primary.ok || !backup.ok)throw Error('Recovery fixture could not be encoded');
    saved={primary:primary.text,backup:backup.text,state:step.after};break;
   }
  }
 } finally { session.dispose(); }
 if(!saved)throw Error('No legal saved High Shot boundary');
 expect(saved.primary).not.toBe(saved.backup);
 const bytes={primary:saved.primary,backup:saved.backup};
 const stored=()=>page.evaluate(slots=>({primary:localStorage.getItem(slots.primary),backup:localStorage.getItem(slots.backup)}),keys.battle);
 await page.addInitScript(({slots,bytes})=>{
  if(!sessionStorage.getItem('test:application-load-seeded')){
   localStorage.setItem(slots.primary,bytes.primary);localStorage.setItem(slots.backup,bytes.backup);
   sessionStorage.setItem('test:application-load-seeded','yes');
  }
 },{slots:keys.battle,bytes});
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.clock.install();
 const faultServer=await startBattleModuleFaultServer();
 let failedResponses=0,recoveryVerified=false;
 const observeEntryResponse=(response:Response)=>{if(faultServer.isModuleURL(response.url()) && response.status()===503)failedResponses++;};
 page.on('response',observeEntryResponse);
 // The first document receives a real server HTTP 503 with the legal save seeded.
 // The origin stays fixed; recovery serves the unchanged build through Vite.
 try {
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  await page.goto(faultServer.battleURL);
  await expect.poll(()=>faultServer.receipt().blocked).toBeGreaterThan(0);
  await expect.poll(()=>failedResponses).toBeGreaterThan(0);
  await expect(page.getByRole('alert')).toHaveText('Error: Could not load the application. Reload the page to retry.');
  await expect(page.getByRole('alert')).toBeVisible();await expect(page.locator('#save-continue')).toHaveCount(0);
  expect(await stored()).toEqual(bytes);
  await expect.poll(()=>applicationLoadDiagnostics.failures().length).toBe(1);
  const [failure]=applicationLoadDiagnostics.failures();
  expect(failure).toMatchObject({route:'battle',name:'TypeError',category:'module-fetch'});
  // Chromium includes the failed module URL in the caught error. Check that
  // both the browser and host allowlists retain the real emitted filename.
  if(browserName==='chromium'){
   expect(failure.frames).toEqual(expect.arrayContaining([{file:faultServer.receipt().assets[0].file}]));
  }
  // The error path stays inert. Recovery remains the user's explicit reload and
  // Continue, with the paused-clock interaction from the original failing test.
  const allowedBeforeRecovery=faultServer.receipt().allowed;faultServer.allowImport();
  await page.reload();await page.clock.resume();await expect(page.locator('#save-continue')).toBeVisible();
  expect(faultServer.receipt().allowed).toBeGreaterThan(allowedBeforeRecovery);
  await expect.poll(()=>faultServer.receipt().assets.reduce((sum,asset)=>sum+asset.responses['200']+asset.responses['304'],0)).toBeGreaterThan(0);
  expect(await stored()).toEqual(bytes);await page.locator('#save-continue').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const resumed=await readSession(page);
  expect(resumed.state).toEqual(saved.state);expect(resumed.events).toEqual([]);
  expect(resumed.continuation).toEqual({snapshot:saved.state,commands:[],events:[]});expect(resumed.pending).toBeNull();
  expect(JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!).effect).toBeNull();
  expect(await stored()).toEqual(bytes);expect(errors).toEqual([]);
  await expect(page.locator('link[rel="modulepreload"][href*="/assets/startBattleApp-"]')).toHaveCount(0);
  recoveryVerified=true;
 } finally {
  page.off('response',observeEntryResponse);
  try {
   await info.attach('application-load-recovery',{body:JSON.stringify({...faultServer.receipt(),recoveryVerified,
    injectedResponse:{status:503,cacheControl:'no-store',observed:failedResponses},failures:applicationLoadDiagnostics.failures()},null,2),contentType:'application/json'});
  } finally { await faultServer.close(); }
 }
});

for(const mode of ['run','dungeon'] as const)test(`main menu: post-mount ${mode} failure remains visible and preserves saves`,async({page},info)=>{
 const saved=menuFixture(mode);
 const backup='preserved recovery bytes';
 await page.addInitScript(({slots,saved,backup})=>{localStorage.setItem(slots.primary,saved);localStorage.setItem(slots.backup,backup);},{slots:keys[mode],saved,backup});
 await page.route(/\/start(?:Run|Dungeon)App(?:-[^/]+\.js|\.ts)(?:\?|$)/,async route=>{
  const response=await route.fetch();
  await route.fulfill({response,body:(await response.text())+'\nthrow new Error("review: post-mount initialization failed");\n'});
 });
 await page.goto('./?game='+mode);
 await expect(page.getByRole('alert')).toHaveText('Error: Could not load the application. Reload the page to retry.');
 await expect(page.getByRole('alert')).toBeInViewport();
 await expect(page.locator('#fit-board-controls')).not.toBeVisible();
 await expect(page.locator('#fit-measurements')).not.toBeVisible();
 expect(await page.evaluate(slots=>({primary:localStorage.getItem(slots.primary),backup:localStorage.getItem(slots.backup)}),keys[mode])).toEqual({primary:saved,backup});
 await page.screenshot({path:info.outputPath(`${mode}-post-mount-error.png`)});
});

test('main menu: run preparation runtime errors use one visible alert and preserve saves',async({page},info)=>{
 const saved=menuFixture('run');
 const backup='preserved recovery bytes';
 await page.addInitScript(({slots,saved,backup})=>{localStorage.setItem(slots.primary,saved);localStorage.setItem(slots.backup,backup);},{slots:keys.run,saved,backup});
 await page.goto('./?game=run');await expect(page.locator('#run-start')).toBeVisible();
 for(let i=0;i<2;i++){
  await page.evaluate(()=>window.dispatchEvent(new ErrorEvent('error',{message:'review: renderer initialization failed'})));
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(page.getByRole('alert')).toHaveText('Error: The run encountered a runtime error. Reload to retry.');
  await expect(page.getByRole('alert')).toBeInViewport();
 }
 await expect(page.locator('#fit-board-controls')).not.toBeVisible();
 await expect(page.locator('#fit-measurements')).not.toBeVisible();
 expect(await page.evaluate(slots=>({primary:localStorage.getItem(slots.primary),backup:localStorage.getItem(slots.backup)}),keys.run)).toEqual({primary:saved,backup});
 await page.screenshot({path:info.outputPath('run-preparation-error.png')});
});

test('main menu: repeated scene selectors use the first value throughout startup',async({page})=>{
 await page.goto('./?scene=unknown&scene=proof');
 await expect(page.locator('[data-menu-action]')).toHaveCount(4);
 await expect(page.locator('canvas')).toHaveCount(0);
 await page.goto('./?game=run&scene=unknown&scene=proof');
 await expect(page.locator('#run-start')).toBeVisible();
 for(const scene of ['proof','content-smoke']){
  await page.goto(`./?game=run&scene=${scene}&scene=unknown`);
  await expect(page.locator('#fit-status')).toHaveText(scene==='proof'?'Ready':'Content ready');
  await expect(page.locator('#game')).not.toHaveAttribute('data-session',/.+/);
 }
 await page.screenshot({path:test.info().outputPath('repeated-scene.png')});
});
test('main menu: read-only root, separate artwork and isolated loading',async({page})=>{
 const requests:string[]=[];page.on('request',r=>requests.push(r.url()));
 await page.addInitScript(()=>{Storage.prototype.setItem=function(k,v){throw Error(`Unexpected menu write ${k}`);};});
 await page.goto('./');
 await expect(page.locator('[data-menu-action]')).toHaveText(['Continue','New Game','Hall of Records','Settings']);
 await expect(page.getByText('A path through the forgotten realms')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
 const image=page.getByRole('img',{name:'Tactics Guru'});await expect(image).toBeVisible();
 expect(await image.evaluate(n=>(n as HTMLImageElement).naturalWidth/(n as HTMLImageElement).naturalHeight)).toBe(3);
 await expect(page.locator('canvas')).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Standalone battle',exact:true})).toHaveAttribute('href',/\?game=battle$/);
 await expect(page.getByRole('link',{name:'Three-encounter run',exact:true})).toHaveAttribute('href',/\?game=run$/);
 await expect(page.getByRole('link',{name:'Map inspection',exact:true})).toHaveAttribute('href',/\/map$/);
 expect(requests.some(url=>/\/start-[^/]+\.js|\.mp3|\.ogg|\/battle\/audio/.test(url))).toBe(false);
 await page.getByRole('button',{name:'Hall of Records'}).click();await expect(page.getByRole('dialog')).toContainText('No finished journeys recorded yet');
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Hall of Records'})).toBeFocused();
 await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Sound controls');
 await expect(page.getByRole('dialog')).toContainText('Combat controls');
 await expect(page.getByRole('radio',{name:'Auto'})).toBeChecked();
 await page.getByRole('dialog').locator('summary').focus();await page.keyboard.press('Tab');
 await expect(page.getByRole('button',{name:'Close',exact:true})).toBeFocused();await page.keyboard.press('Shift+Tab');
 await expect(page.getByRole('dialog').locator('summary')).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Settings',exact:true})).toBeFocused();
 await page.screenshot({path:test.info().outputPath('menu.png'),fullPage:true});
});
for(const mode of ['battle','run','dungeon'] as const)test(`main menu: Continue resumes ${mode} through its owner`,async({page})=>{
 const text=menuFixture(mode);await page.addInitScript(({key,text})=>{
  if(!new URLSearchParams(location.search).has('game'))localStorage.setItem(key,text);
 },{key:keys[mode].primary,text});
 await page.goto('./');await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page).toHaveURL(new RegExp(`\\/\\?game=${mode}$`));
 if(mode==='battle')await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 else if(mode==='run')await expect(page.locator('#run-start-encounter')).toBeVisible();
 else await expect(page.locator('#dungeon-screen')).toContainText('Floor 1');
 await expect(page.getByRole('link',{name:'Main menu',exact:true}).first()).toBeVisible();
 const saved=await page.evaluate(key=>localStorage.getItem(key),keys[mode].primary);
 await page.reload();
 await expect(page).toHaveURL(new RegExp(`\\/\\?game=${mode}$`));
 if(mode==='battle')await page.locator('#save-continue').click();
 else await page.getByRole('button',{name:`Continue saved ${mode}`,exact:true}).click();
 if(mode==='battle')await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 else if(mode==='run')await expect(page.locator('#run-start-encounter')).toBeVisible();
 else await expect(page.locator('#dungeon-screen')).toContainText('Floor 1');
 expect(await page.evaluate(key=>localStorage.getItem(key),keys[mode].primary)).toBe(saved);
});
test('main menu: multiple modes, backup warning, recovery and fresh save inspection',async({page})=>{
 const battle=menuFixture('battle'),run=menuFixture('run');
 await page.addInitScript(({keys,battle,run})=>{localStorage.setItem(keys.battle.primary,'broken');localStorage.setItem(keys.battle.backup,battle);localStorage.setItem(keys.run.primary,run);localStorage.setItem('godot:save','legacy');},{keys,battle,run});
 await page.goto('./');await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Standalone battle · backup (some progress may be lost)');
 expect(await page.getByRole('dialog').locator('a').allTextContents()).toEqual(['Three-encounter run','Standalone battle · backup (some progress may be lost) · recovery needed']);
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeFocused();
 await page.evaluate(keys=>{localStorage.removeItem(keys.run.primary);localStorage.removeItem(keys.battle.backup);window.dispatchEvent(new Event('storage'));},keys);
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Save recovery',exact:true}).click();await expect(page.getByRole('dialog').locator('a')).toHaveCount(3);
 expect(await page.evaluate(()=>localStorage.getItem('godot:save'))).toBe('legacy');
});
test('main menu: New Game confirms over the menu and preserves other save families',async({page})=>{
 const text=menuFixture('dungeon');await page.addInitScript(({keys,text})=>{localStorage.setItem(keys.dungeon.primary,text);localStorage.setItem(keys.battle.primary,'battle sentinel');},{keys,text});
 await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();
 await expect(page.locator('#main-menu')).toBeVisible();await expect(page.getByRole('dialog')).toContainText('Start new dungeon?');
 await page.getByRole('button',{name:'Close',exact:true}).click();await expect(page.getByRole('button',{name:'New Game',exact:true})).toBeFocused();
 expect(await page.evaluate(key=>localStorage.getItem(key),keys.dungeon.primary)).toBe(text);
 expect(await page.evaluate(key=>localStorage.getItem(key),RUN_RECORD_KEYS.primary)).toBeNull();
 await page.getByRole('button',{name:'New Game',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Start new dungeon',exact:true}).click();
 await expect(page.locator('#dungeon-screen')).toContainText('Floor 1');await expect(page.locator('dialog')).not.toBeVisible();
 expect(await page.evaluate(key=>localStorage.getItem(key),keys.battle.primary)).toBe('battle sentinel');
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'{"records":[]}').records,RUN_RECORD_KEYS.primary))
  .toMatchObject([{id:JSON.parse(text).payload.id,mode:'dungeon',outcome:'abandoned'}]);
});

test('main menu: records concurrent confirmed dungeon replacements retain one immutable old result',async({page,context,isMobile})=>{
 const saved=menuFixture('dungeon'),id=JSON.parse(saved).payload.id;
 await page.goto('./');await page.evaluate(({keys,saved})=>{
  localStorage.setItem(keys.primary,saved);localStorage.setItem(keys.backup,saved);
 },{keys:DUNGEON_KEYS,saved});
 const other=await context.newPage(),errors:string[]=[];
 for(const tab of [page,other])tab.on('pageerror',error=>errors.push(error.message));
 const activate=async(tab:Page,label:string)=>{const target=tab.getByRole('button',{name:label,exact:true});if(isMobile)await target.tap();else await target.click();};
 try{
  await Promise.all([page.reload(),other.goto('./')]);
  await Promise.all([activate(page,'New Game'),activate(other,'New Game')]);
  for(const tab of [page,other])await expect(tab.getByRole('dialog')).toContainText('Start new dungeon?');
  await Promise.all([activate(page,'Start new dungeon'),activate(other,'Start new dungeon')]);
  const history=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'{"records":[]}').records,RUN_RECORD_KEYS.primary);
  await expect.poll(history).toMatchObject([{id,mode:'dungeon',outcome:'abandoned'}]);
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'{"payload":{}}').payload.id,DUNGEON_KEYS.primary)).not.toBe(id);
  await page.goto('./');await activate(page,'Hall of Records');
  await expect(page.getByRole('dialog').getByRole('listitem')).toHaveCount(1);
  expect(await history()).toHaveLength(1);expect(errors).toEqual([]);
 }finally{await other.close();}
});
test('main menu: New Game starts immediately when no dungeon save exists',async({page})=>{
 await page.addInitScript(({keys})=>{localStorage.setItem(keys.battle.primary,'battle sentinel');localStorage.setItem(keys.run.primary,'run sentinel');},{keys});
 await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();
 await expect(page.locator('#dungeon-screen')).toContainText('Floor 1');
 await expect(page.locator('dialog')).not.toBeVisible();
 await expect.poll(()=>page.evaluate(key=>localStorage.getItem(key),keys.dungeon.primary)).not.toBeNull();
 expect(await page.evaluate(key=>localStorage.getItem(key),keys.battle.primary)).toBe('battle sentinel');
 expect(await page.evaluate(key=>localStorage.getItem(key),keys.run.primary)).toBe('run sentinel');
});
test('main menu: New Game starts a fresh dungeon layout',async({page})=>{
 await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();
 await expect(page.locator('#dungeon-screen')).toContainText('Floor 1');
 const first=JSON.parse((await page.locator('#game').getAttribute('data-dungeon-snapshot'))!);
 await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Start new dungeon',exact:true}).click();
 await expect(page.locator('#dungeon-screen')).toContainText('Floor 1');
 const second=JSON.parse((await page.locator('#game').getAttribute('data-dungeon-snapshot'))!);
 expect(second.seed).not.toBe(first.seed);
 expect(generateMap(second.floors[0].descriptor.seed,'rooms').cells).not.toEqual(generateMap(first.floors[0].descriptor.seed,'rooms').cells);
});
test('main menu: a dungeon save appearing during navigation requires confirmation',async({page})=>{
 await page.addInitScript(key=>{if(new URLSearchParams(location.search).get('game')==='dungeon')localStorage.setItem(key,'newly arrived save');},keys.dungeon.primary);
 await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Start new dungeon?');
 expect(await page.evaluate(key=>localStorage.getItem(key),keys.dungeon.primary)).toBe('newly arrived save');
});
test('main menu: changed dungeon save requires a fresh confirmation',async({page})=>{
 const text=menuFixture('dungeon');await page.goto('./');await page.evaluate(({key,text})=>localStorage.setItem(key,text),{key:keys.dungeon.primary,text});
 await page.getByRole('button',{name:'New Game',exact:true}).click();
 await page.evaluate(key=>localStorage.setItem(key,'changed while confirming'),keys.dungeon.primary);
 await page.getByRole('dialog').getByRole('button',{name:'Start new dungeon',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Start new dungeon?');
 expect(await page.evaluate(key=>localStorage.getItem(key),keys.dungeon.primary)).toBe('changed while confirming');
});
test('main menu: a backup-only dungeon still requires confirmation',async({page})=>{
 const text=menuFixture('dungeon');await page.addInitScript(({key,text})=>localStorage.setItem(key,text),{key:keys.dungeon.backup,text});
 await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Start new dungeon?');
 expect(await page.evaluate(key=>localStorage.getItem(key),keys.dungeon.backup)).toBe(text);
});
test('main menu: unavailable storage and failed artwork keep native actions usable',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError');}}));
 await page.route('**/menu/*',route=>route.abort());await page.goto('./');
 await expect(page.getByRole('heading',{name:'Tactics Guru'})).toBeVisible();await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'Save recovery',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByText('Privacy & analytics', {exact:true}).click();
 await expect(page.getByRole('dialog').locator('[data-telemetry-status]')).toBeVisible();await page.getByRole('checkbox').uncheck();await expect(page.getByRole('dialog')).toContainText('could not save your preference');
});
test('main menu: portrait composition scrolls at narrow, short and enlarged text sizes',async({page})=>{
 await page.goto('./');
 for(const [width,height] of [[320,568],[915,412],[1280,720]]){
  await page.setViewportSize({width,height});
  await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const bounds=await page.locator('#main-menu').boundingBox();expect(bounds!.width).toBeLessThanOrEqual(512);
  for(const button of await page.locator('[data-menu-action]').all())expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.getByRole('link',{name:'Map inspection'}).scrollIntoViewIfNeeded();await expect(page.getByRole('link',{name:'Map inspection'})).toBeInViewport();
  await page.screenshot({path:test.info().outputPath(`menu-${width}x${height}.png`),fullPage:true});
 }
});
test('main menu: supplied background compositions remain independent of controls',async({page})=>{
 await page.goto('./');
 for(const art of ['dawn','midnight']){
  await page.locator('.menu-backdrop').evaluate((node,name)=>{(node as HTMLImageElement).src=`${(node as HTMLImageElement).src.replace(/[^/]+$/,'')}${name}.webp`;},art);
  await expect.poll(()=>page.locator('.menu-backdrop').evaluate(n=>(n as HTMLImageElement).complete&&(n as HTMLImageElement).naturalWidth>0)).toBe(true);
  await page.screenshot({path:test.info().outputPath(`background-${art}.png`),fullPage:true});
  await expect(page.locator('[data-menu-action]')).toHaveText(['Continue','New Game','Hall of Records','Settings']);
 }
});
test('main menu: stale Continue and closed-set intents preserve missing or damaged saves',async({page})=>{
 await page.goto('./?game=battle&entry=continue');await expect(page.getByRole('dialog')).toContainText('Saved battle');
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.includes(':battle:')))).toEqual([]);
 await page.goto('./?game=run&entry=continue');await expect(page.getByRole('dialog')).toContainText('Run save recovery');
 await page.goto('./?game=dungeon&entry=continue');await expect(page.getByRole('dialog')).toContainText('Dungeon save recovery');
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.includes(':dungeon:')||key.includes(':run:')))).toEqual([]);
 await page.goto('./?game=dungeon&entry=unrecognized');await expect(page.locator('dialog')).not.toBeVisible();
 await expect(page).toHaveURL(/\/\?game=dungeon$/);
 await page.goto('./?game=battle&entry=new');await expect(page.getByRole('dialog')).toContainText('Start a new battle?');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.goto('./?game=run&entry=new');await expect(page.getByRole('dialog')).toContainText('Start new run?');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.goto('./?game=battle&entry=unrecognized');await expect(page.locator('dialog')).not.toBeVisible();
 await expect(page).toHaveURL(/\/\?game=battle$/);
 await page.goto('./?game=run&entry=unrecognized');await expect(page.locator('dialog')).not.toBeVisible();
 await expect(page).toHaveURL(/\/\?game=run$/);
});
test('main menu: failed new-game write retains exportable recovery copies',async({page})=>{
 const text=menuFixture('dungeon');
 await page.addInitScript(({key,text})=>{
  localStorage.setItem(key,text);const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){if(key.includes(':dungeon:'))throw new DOMException('full','QuotaExceededError');original.call(this,key,value);};
 },{key:keys.dungeon.primary,text});
 await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Start new dungeon',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Dungeon save recovery');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:/Export primary/}).click();
 const file=await (await download).path();expect(readFileSync(file!,'utf8')).toBe(text);
 await expect(page.locator('#dungeon-screen')).toContainText('Progress unsaved');
});

test('main menu: terminal battle saves resume their existing outcome UI',async({page})=>{
 const text=terminalMenuBattle();await page.addInitScript(({key,text})=>localStorage.setItem(key,text),{key:keys.battle.primary,text});
 await page.goto('./');await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.locator('#game')).toHaveAttribute('data-phase','ended');
 await expect(page.getByRole('dialog')).toContainText(/Victory|Defeat/);
 await page.getByRole('dialog').getByRole('button',{name:'Main menu',exact:true}).focus();
 await page.keyboard.press('Enter');
 await expect(page.locator('#main-menu')).toBeVisible();
 expect(await page.evaluate(key=>localStorage.getItem(key),keys.battle.primary)).toBe(text);
});
test('main menu: unsaved run still warns after a rejected reward command',async({page})=>{
 const text=rewardRunFixture();
 await page.addInitScript(({key,text})=>{
  localStorage.setItem(key,text);const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){if(String(key).includes(':run:'))throw new DOMException('full','QuotaExceededError');original.call(this,key,value);};
 },{key:keys.run.primary,text});
 await page.goto('./?game=run');await page.getByRole('button',{name:'Continue saved run',exact:true}).click();
 const claim=page.getByRole('button',{name:'Claim Healing Draught',exact:true});
 await expect(claim).toBeVisible();await claim.click();await page.locator('#item-confirm').click();
 await expect(page.locator('#run-item-status')).toContainText(/unsaved/i);
 const select=page.getByRole('combobox',{name:'Healing Draught target',exact:true});
 const mage=select.locator('option[value="mage"]');await expect(mage).toBeDisabled();
 await mage.evaluate(option=>{const target=option as HTMLOptionElement;target.disabled=false;target.selected=true;});
 const before=await menuItemReport(page);
 await page.getByRole('button',{name:'Use Healing Draught',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Mage cannot use this item (defeated).');
 await page.locator('#item-confirm').click();
 await expect(page.locator('#run-item-status')).toContainText('Nothing changed');
 expect(await menuItemReport(page)).toEqual(before);
 page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('link',{name:'Main menu',exact:true}).last().click();
 await expect(page.getByRole('dialog')).toContainText('Run save recovery');
});
test('main menu: unsaved return cancellation opens recovery and accepted leave reaches menu',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError');}}));
 await page.goto('./?game=run');await page.getByRole('button',{name:'Play unsaved run',exact:true}).click();
 page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('link',{name:'Main menu',exact:true}).last().click();
 await expect(page.getByRole('dialog')).toContainText('Run save recovery');
 await page.locator('#run-close-recovery').click();
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('link',{name:'Main menu',exact:true}).last().click();
 await expect(page.locator('#main-menu')).toBeVisible();await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
});

for(const path of ['unsaved play','failed replacement'] as const)test(`main menu: dungeon departure after rejected movement retains ${path} warning`,async({page})=>{
 if(path==='failed replacement')await page.addInitScript(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.includes(':dungeon:'))throw new DOMException('full','QuotaExceededError');set.call(this,key,value);};});
 // This checks departure after a rejected exploration command, not encounter
 // placement. An arbitrary first compass step can enter a battle and hide the map.
 if(path==='unsaved play')await page.addInitScript(()=>{
  const draw=crypto.getRandomValues.bind(crypto);
  crypto.getRandomValues=((array:ArrayBufferView<ArrayBuffer>)=>{
   if(array instanceof Uint32Array&&array.length===1){array[0]=13;return array;}
   return draw(array);
  }) as typeof crypto.getRandomValues;
 });
 await page.goto('./?game=dungeon');
 if(path==='unsaved play'){
  await page.getByRole('button',{name:'Play unsaved dungeon',exact:true}).click();
  const map=page.locator('#dungeon-map');await expect(map).toBeVisible();
  const position=Number(await map.getAttribute('data-position'));
  await page.getByRole('button',{name:'East',exact:true}).click();
  await expect(map).toBeVisible();await expect(map).toHaveAttribute('data-position',String(position+1));
 }else{
  await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await page.locator('#dungeon-confirm-new').click();
  await expect(page.getByRole('dialog')).toContainText('Dungeon save recovery');
  await page.locator('#dungeon-close-recovery').click();
 }
 const before=await page.locator('#game').getAttribute('data-dungeon-snapshot');
 expect(JSON.parse(before!).phase).toBe('ready');await expect(page.locator('#dungeon-map')).toBeVisible();
 const blocked=await page.locator('.dungeon-directions button:disabled').first().getAttribute('aria-label');
 const arrows:Record<string,string>={North:'ArrowUp',East:'ArrowRight',South:'ArrowDown',West:'ArrowLeft'};
 await page.locator('#dungeon-map').press(arrows[blocked!]);
 await expect(page.locator('.dungeon-status')).toContainText('Movement refused');
 const cancel=page.waitForEvent('dialog');
 const departure=page.getByRole('link',{name:'Main menu',exact:true}).click();
 await (await cancel).dismiss();await departure;
 await expect(page.getByRole('dialog')).toContainText('Dungeon save recovery');
 expect(await page.locator('#game').getAttribute('data-dungeon-snapshot')).toBe(before);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export current progress',exact:true}).last().click();
 const file=await (await download).path();expect(JSON.parse(readFileSync(file!,'utf8')).payload).toEqual(JSON.parse(before!));
 const accept=page.waitForEvent('dialog');const leave=page.getByRole('link',{name:'Main menu',exact:true}).click();
 await (await accept).accept();await leave;await expect(page.locator('#main-menu')).toBeVisible();
});
for(const condition of ['missing','invalid','unavailable'] as const)test(`main menu: startup battle recovery can return with ${condition} storage`,async({page})=>{
 if(condition==='invalid')await page.addInitScript(key=>localStorage.setItem(key,'invalid preserved battle'),keys.battle.primary);
 if(condition==='unavailable')await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError');}}));
 await page.goto('./?game=battle&entry=recovery');await expect(page.getByRole('dialog')).toContainText('Saved battle');
 await page.getByRole('dialog').getByRole('button',{name:'Main menu',exact:true}).click();
 await expect(page.locator('#main-menu')).toBeVisible();
 if(condition!=='unavailable')expect(await page.evaluate(key=>localStorage.getItem(key),keys.battle.primary)).toBe(condition==='invalid'?'invalid preserved battle':null);
});

// Item durability uses the menu's real run owner; the dev fixture stays transient.
async function menuItemReport(page:Page) { return {snapshot:JSON.parse(await page.locator('#game').getAttribute('data-run-snapshot')??'null')}; }
async function openMenuRunItems(page:Page,snapshot:RunSnapshot) {
 const encoded=encodeRunSave(snapshot,runContext);if(!encoded.ok)throw Error(encoded.reason);
 await page.goto('./?game=run');
 await page.evaluate(({keys,text})=>{localStorage.setItem(keys.primary,text);localStorage.setItem(keys.backup,text);},{keys:RUN_STORAGE_KEYS,text:encoded.text});
 await reloadMenuRunItems(page);
}
async function reloadMenuRunItems(page:Page) {
 await page.reload();await page.locator('#run-continue').click();await expect(page.locator('#run-item-status')).toBeVisible();
}
async function confirmMenuItem(page:Page, waitForSave=true) {
 await page.locator('#item-confirm').click();
 await expect(page.locator('dialog')).not.toBeVisible();
 if(waitForSave)await expect(page.locator('#run-item-status')).not.toHaveText('Saving run…');
}
async function activateMenuItem(page:Page,name:string,touch:boolean) {
 const button=page.getByRole('button',{name,exact:true});if(touch)await button.tap();else await button.click();
}
test('main menu: a stale run tab waits for the save lock and preserves both newer slots', async ({page,context,isMobile}) => {
  await openMenuRunItems(page,preparedSnapshot());
  const stale=await context.newPage();
  await stale.goto('./?game=run');
  await stale.locator('#run-continue').click();
  const use=async (tab:Page, hero:string, waitForSave=true)=>{
    await tab.getByRole('combobox',{name:'Healing Draught target'}).selectOption(hero);
    await activateMenuItem(tab,'Use Healing Draught',isMobile);
    await confirmMenuItem(tab,waitForSave);
  };
  await use(page,'fighter');
  await expect(page.locator('#run-item-status')).toHaveText('Run saved on this device');
  const slots=()=>page.evaluate(keys=>[localStorage.getItem(keys.primary),localStorage.getItem(keys.backup)],RUN_STORAGE_KEYS);
  const saved=await slots();
  await page.evaluate(key=>{
    void navigator.locks.request(key,()=>new Promise<void>(resolve=>{
      window.addEventListener('release-run-test-lock',()=>resolve(),{once:true});
      document.body.dataset.testRunLock='held';
    }));
  },RUN_STORAGE_KEYS.primary);
  await expect(page.locator('body')).toHaveAttribute('data-test-run-lock','held');
  try {
    await use(stale,'ranger',false);
    await expect.poll(()=>stale.evaluate(async key=>(await navigator.locks.query()).pending?.some(lock=>lock.name===key),RUN_STORAGE_KEYS.primary)).toBe(true);
    expect(await slots()).toEqual(saved);
  } finally { await page.evaluate(()=>window.dispatchEvent(new Event('release-run-test-lock'))); }
  await expect(stale.locator('#run-item-status')).toContainText('another tab changed the run save');
  expect(await slots()).toEqual(saved);
  await stale.getByRole('button',{name:'Save recovery',exact:true}).click();
  await expect(stale.getByRole('button',{name:'Export unsaved run'})).toBeVisible();
  await stale.getByRole('dialog').getByRole('button',{name:'Continue saved run'}).click();
  expect(await menuItemReport(stale)).toEqual(await menuItemReport(page));
  await stale.close();
});
test('main menu: reward claim advances exactly once and survives pending/claimed reload', async ({ page }, info) => {
  const seed = Array.from({ length: 100 }, (_, i) => i).find(s => rewardSnapshot(s).items.offer!.options.some(o => o.itemId === 'item:healing_draught'))!;
  await openMenuRunItems(page,rewardSnapshot(seed)); const pending = (await menuItemReport(page)).snapshot;
  await reloadMenuRunItems(page); expect((await menuItemReport(page)).snapshot).toEqual(pending);
  await activateMenuItem(page, 'Claim Healing Draught', info.project.name !== 'desktop');
  if (info.project.name === 'desktop') await page.getByRole('button', { name: 'Confirm', exact: true }).dblclick();
  else {
    const box = await page.getByRole('button', { name: 'Confirm', exact: true }).boundingBox();
    for (let i = 0; i < 2; i++) await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
    if (await page.locator('dialog').isVisible()) await page.keyboard.press('Escape');
  }
  await expect(page.getByRole('heading', { name: 'Party items', exact: true })).toBeVisible();
  await expect(page.locator('#run-item-status')).toHaveText('Run saved on this device');
  const claimed = (await menuItemReport(page)).snapshot;
  expect(claimed.items.run.encounterIndex).toBe(1); expect(claimed.items.itemRevision).toBe(1);
  expect(claimed.items.ownership.consumables).toEqual([{ itemId: 'item:healing_draught', quantity: 1 }]);
  await reloadMenuRunItems(page); expect((await menuItemReport(page)).snapshot).toEqual(claimed);
});
test('main menu: real item use, equip and unequip preserve ownership/stats across reload', async ({ page }, info) => {
  await openMenuRunItems(page,preparedSnapshot());
  const select = page.getByRole('combobox', { name: 'Healing Draught target' });
  await expect(select.locator('option', { hasText: 'Mage (defeated)' })).toBeDisabled();
  await select.selectOption('ranger');
  await activateMenuItem(page, 'Use Healing Draught', info.project.name !== 'desktop'); await confirmMenuItem(page);
  const used = (await menuItemReport(page)).snapshot;
  expect(used.items.run.party[1].hp).toBe(10); expect(used.items.ownership.consumables[0].quantity).toBe(1);
  await reloadMenuRunItems(page); expect((await menuItemReport(page)).snapshot).toEqual(used);
  await page.getByRole('combobox', { name: 'Warding Charm target' }).selectOption('ranger');
  await activateMenuItem(page, 'Equip Warding Charm', info.project.name !== 'desktop'); await confirmMenuItem(page);
  const equipped = (await menuItemReport(page)).snapshot;
  expect(equipped.items.ownership.assignments).toHaveLength(1);
  const fighter = await page.getByRole('region', { name: 'Party', exact: true }).textContent();
  await reloadMenuRunItems(page); expect((await menuItemReport(page)).snapshot).toEqual(equipped);
  expect(await page.getByRole('region', { name: 'Party', exact: true }).textContent()).toBe(fighter);
  await page.getByRole('button', { name: 'Continue saved run', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  expect((await menuItemReport(page)).snapshot).toEqual(equipped);
  await page.getByRole('button', { name: 'Unequip Warding Charm' }).click(); await confirmMenuItem(page);
  expect((await menuItemReport(page)).snapshot.items.ownership.assignments).toEqual([]);
});
test('main menu: claim and use a Revive Kit before the next run encounter', async ({ page, isMobile }) => {
  const seed = Array.from({ length: 100 }, (_, i) => i).find(s => rewardSnapshot(s).items.offer!.options.some(o => o.itemId === 'item:revive_kit'))!;
  await openMenuRunItems(page, rewardSnapshot(seed));
  await activateMenuItem(page, 'Claim Revive Kit', isMobile); await confirmMenuItem(page);
  const targets = page.getByRole('combobox', { name: 'Revive Kit target' });
  await expect(targets).toHaveValue('mage');
  await expect(targets.locator('option', { hasText: 'Fighter (still standing)' })).toBeDisabled();
  const use = page.getByRole('button', { name: 'Use Revive Kit', exact: true });
  if (isMobile) await use.tap();
  else { await use.focus(); await page.keyboard.press('Enter'); }
  await expect(page.getByRole('dialog')).toContainText('Mage will have 3/11 HP');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect((await menuItemReport(page)).snapshot.items.run.party[2].hp).toBe(0);
  await activateMenuItem(page, 'Use Revive Kit', isMobile); await confirmMenuItem(page);
  await expect(use).toHaveCount(0);
  await reloadMenuRunItems(page);
  expect((await menuItemReport(page)).snapshot.items.run.party[2].hp).toBe(3);
  await page.locator('#run-start-encounter').click();
  await expect(page.locator('#game')).toHaveAttribute('data-session', /"defId":"mage"/);
  const battle = JSON.parse((await page.locator('#game').getAttribute('data-session'))!).state;
  expect(battle.units.find((unit: { defId: string }) => unit.defId === 'mage')?.hp).toBe(3);
});
for (const skin of ['rail', 'radial'] as const) test('main menu: an earned Healing Draught spends the active turn action and survives Continue (' + skin + ')', async ({ page, isMobile }) => {
  await page.addInitScript(value => { (window as unknown as Record<string, unknown>).__tacticsGuruCombatControls = value; }, skin);
  await openMenuRunItems(page, rewardSnapshot(123));
  await activateMenuItem(page, 'Claim Healing Draught', isMobile); await confirmMenuItem(page);
  await page.locator('#run-start-encounter').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  const before = (await readSession(page)).state;
  const actor = before.units.find(unit => unit.id === before.initiative[before.activeIndex])!;
  const button = page.locator('#battle-draught');
  await reviewDraught(page);
  await expect(page.getByRole('dialog')).toContainText('heal 6 HP');
  await expect(page.getByRole('dialog')).toContainText('0 left after use');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  if (!isMobile) await expect(button).toBeFocused();
  expect((await readSession(page)).state).toEqual(before);
  await reviewDraught(page);
  const confirm = page.locator('#battle-draught-confirm');
  if (isMobile) await confirm.tap(); else { await confirm.focus(); await page.keyboard.press('Enter'); }
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(button).toBeDisabled();
  await expect(button).toHaveText('Healing Draught ×0 · None left');
  const after = (await readSession(page)).state;
  expect(after.commandCount).toBe(before.commandCount + 1);
  expect(after.rng).toEqual(before.rng);
  expect(after.activeIndex).toBe(before.activeIndex);
  expect(after.units.find(unit => unit.id === actor.id)).toEqual({ ...actor, hp: actor.hp + 6, hasActed: true });
  await expect(page.locator('#battle-persistence')).toContainText('Run saved on this device');
  await page.reload(); await page.locator('#run-continue').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  expect((await readSession(page)).state).toEqual(after);
  await expect(button).toBeDisabled();
});
test('main menu: corruption preserves bytes, exports raw data and requires reviewed removal before saving', async ({ page }) => {
  await openMenuRunItems(page,preparedSnapshot());
  const backup = await page.evaluate(key => localStorage.getItem(key), RUN_STORAGE_KEYS.backup);
  await page.evaluate(key => localStorage.setItem(key, '  {broken raw\n\ud800'), RUN_STORAGE_KEYS.primary);
  await reloadMenuRunItems(page);
  await expect(page.locator('#run-item-status')).toContainText('Continued backup');
  await page.getByRole('button', { name: 'Use Healing Draught' }).click(); await confirmMenuItem(page);
  await expect(page.locator('#run-item-status')).toContainText('unsaved');
  expect(await page.evaluate(key => localStorage.getItem(key), RUN_STORAGE_KEYS.primary)).toBe('  {broken raw\n\ud800');
  expect(await page.evaluate(key => localStorage.getItem(key), RUN_STORAGE_KEYS.backup)).toBe(backup);
  await page.getByRole('button', { name: 'Save recovery', exact: true }).click();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export primary save' }).click();
  const file = await download; expect(JSON.parse(await readFile((await file.path())!, 'utf8'))).toEqual({ slot: 'primary', text: '  {broken raw\n\ud800' });
  await page.getByRole('button', { name: 'Save recovery', exact: true }).click();
  await page.getByRole('button', { name: 'Remove primary save' }).click();
  await page.getByRole('button', { name: 'Remove reviewed save' }).click();
  await expect.poll(()=>page.evaluate(key => localStorage.getItem(key), RUN_STORAGE_KEYS.primary)).toBeNull();
  await page.locator('#run-close-recovery').click();
  await page.getByRole('button', { name: 'Save recovery', exact: true }).click();
  await page.getByRole('button', { name: 'Retry saving' }).click();
  await expect(page.locator('#run-item-status')).toContainText('Run saved');
  const saved = (await menuItemReport(page)).snapshot; await reloadMenuRunItems(page); expect((await menuItemReport(page)).snapshot).toEqual(saved);
});
test('main menu: reviewed removal of a primary corrupted during play permits retry', async ({ page }) => {
  await openMenuRunItems(page,preparedSnapshot());
  const use=page.getByRole('button',{name:'Use Healing Draught',exact:true});
  await use.click();await confirmMenuItem(page);
  await expect(page.locator('#run-item-status')).toHaveText('Run saved on this device');
  await page.evaluate(key=>localStorage.setItem(key,'corrupt during play'),RUN_STORAGE_KEYS.primary);
  await page.getByRole('combobox',{name:'Healing Draught target'}).selectOption('ranger');
  await use.click();await confirmMenuItem(page);
  await expect(page.locator('#run-item-status')).toContainText('needs recovery');
  const accepted=await menuItemReport(page);
  await page.getByRole('button',{name:'Save recovery',exact:true}).click();
  await page.getByRole('button',{name:'Remove primary save',exact:true}).click();
  await page.locator('#run-confirm-remove').click();
  await expect(page.locator('#battle-dialog-message')).toContainText('primary: missing');
  await page.locator('#run-retry-save').click();
  await expect(page.locator('#run-item-status')).toHaveText('Run saved on this device');
  await reloadMenuRunItems(page);
  expect(await menuItemReport(page)).toEqual(accepted);
});
test('main menu: stale recovery review refuses changed bytes', async ({ page }) => {
  await openMenuRunItems(page,preparedSnapshot());
  await page.getByRole('button', { name: 'Save recovery', exact: true }).click();
  await page.getByRole('button', { name: 'Remove primary save' }).click();
  // Simulate a different tab writing after the review, without editing session state.
  await page.evaluate(key => localStorage.setItem(key, 'newer foreign bytes'), RUN_STORAGE_KEYS.primary);
  await page.getByRole('button', { name: 'Remove reviewed save' }).click();
  await expect(page.getByRole('dialog')).toContainText('primary: invalid');
  expect(await page.evaluate(key => localStorage.getItem(key), RUN_STORAGE_KEYS.primary)).toBe('newer foreign bytes');
});
test('main menu: unavailable storage remains playable with owned items', async ({ page }) => {
  await openMenuRunItems(page,preparedSnapshot());
  await page.evaluate(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError');}}));
  await page.getByRole('button', { name: 'Use Healing Draught' }).click(); await confirmMenuItem(page);
  await expect(page.locator('#run-item-status')).toContainText('unsaved');
  expect((await menuItemReport(page)).snapshot.items.ownership.consumables[0].quantity).toBe(1);
  await page.getByRole('button', { name: 'Save recovery', exact: true }).click();
  await expect(page.locator('dialog')).toContainText('Storage security');
  await page.keyboard.press('Escape');
});

for (const mode of ['battle','run','dungeon'] as const) test(`temporary ${mode} explains saved mode without creating a save`,async({page})=>{
 await page.goto(`./${mode}`);
 const link=page.getByRole('link',{name:`Open saved ${mode} mode`,exact:true});
 await expect(link).toBeVisible();
 await expect(link).toHaveAttribute('href',`/?game=${mode}`);
 await expect(page.getByText('This is a temporary session.',{exact:false}).first()).toBeVisible();
 expect(await page.evaluate(key=>localStorage.getItem(key),keys[mode].primary)).toBeNull();
 await page.goto('./');
 await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
 await page.goto(`./${mode}`);await link.click();
 await expect(page).toHaveURL(new RegExp(`\\?game=${mode}$`));
});

for (const route of ['nonexistent', '?game=zzz', '?game=run&game=battle']) test(`main menu: invalid entry ${route} returns to the root`, async ({ page }) => {
 await page.goto('./'+route);
 await expect(page).toHaveURL(new URL('./', test.info().project.use.baseURL!).href);
 await expect(page.locator('[data-menu-action]')).toHaveCount(4);
 await expect(page.locator('canvas')).toHaveCount(0);
});
