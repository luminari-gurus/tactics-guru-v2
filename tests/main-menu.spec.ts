import { readFile } from 'node:fs/promises';
import { menuFixture } from './helpers/menuFixtures';
import { generateMap } from '../src/map/generate';
import { readFileSync } from 'node:fs';
import { type Page, type Response } from '@playwright/test';
import { test as base, expect } from './helpers/dungeonEntropy';
import { encodeDungeon } from '../src/domain/dungeonSaveEnvelope';
import { freshRunStats } from '../src/domain/runStats';
import { BATTLE_STORAGE_KEYS } from '../src/persistence/battleStorage';
import { RUN_STORAGE_KEYS } from '../src/persistence/runStorage';
import { DUNGEON_KEYS } from '../src/persistence/dungeonStorage';
import { appendRunRecord, emptyRunRecords, type RunRecord } from '../src/domain/runRecords';
import { encodeRunRecords, RUN_RECORD_KEYS } from '../src/persistence/runRecordsStorage';
import { readSession, playerDecision } from './helpers/battlePolicy';
import { BattleSession } from '../src/app/BattleSession';
import { encodeBattleSave } from '../src/domain/saveEnvelope';
import { standaloneCatalog as battleCatalog } from './helpers/playerPolicy';
import { startApplicationLoadDiagnostics, type ApplicationLoadDiagnostics } from './helpers/applicationLoadDiagnostics';
import { startBattleModuleFaultServer } from './helpers/battleModuleFaultServer';
import { holdFinalRecordsWrite } from './helpers/recordsWriteGate';

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
  const first=list.getByRole('listitem').first();
  await expect(first.locator('[data-stat=battlesWon] dd')).toHaveText('6');
  await expect(first.locator('[data-stat=floorsCleared] dd')).toHaveText('2');
  await expect(first).toContainText('Deepest floor: 3');
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
  const newGame=async()=>{const target=page.getByRole('button',{name:'New Game',exact:true});if(isMobile)await target.tap();else await target.click();};
  await newGame();await expect(page.locator('#dungeon-map')).toBeVisible();
  const previous=JSON.parse((await page.locator('#game').getAttribute('data-dungeon-snapshot'))!).id;
  await page.getByRole('link',{name:'Main menu',exact:true}).last().click();await newGame();
  const confirm=page.getByRole('dialog').getByRole('button',{name:'Start new dungeon',exact:true});
  if(isMobile)await confirm.tap();else await confirm.click();
  await expect(page.locator('#dungeon-map')).toBeVisible();
  const current=JSON.parse((await page.locator('#game').getAttribute('data-dungeon-snapshot'))!);
  expect(current.id).not.toBe(previous);
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).payload.id,DUNGEON_KEYS.primary)).toBe(current.id);
  await expect(page.locator('#dungeon-screen')).toContainText('Run history could not be confirmed');
});

test('main menu: records dungeon replacement withholds exploration until final history finishes', async ({ page }) => {
  await page.goto('./'); await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.locator('#dungeon-map')).toBeVisible();
  const map = await page.locator('#dungeon-map').elementHandle(); if (!map) throw Error('Missing exploration map');
  await page.evaluate(key => navigator.locks.request(key, () => {}), RUN_RECORD_KEYS.primary);
  const releaseHistory = await holdFinalRecordsWrite(page);
  await page.getByRole('button', { name: 'Start new dungeon', exact: true }).click();
  await page.locator('#dungeon-confirm-new').click();
  await expect(page.locator('html')).toHaveAttribute('data-records-held', 'yes');
  const before = await page.locator('#game').getAttribute('data-dungeon-snapshot');
  // A queued event from the detached old map must not move the newly installed journey.
  await map.evaluate(node => { for (const key of ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft']) {
    node.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  } });
  expect(await page.locator('#game').getAttribute('data-dungeon-snapshot')).toBe(before);
  await expect(page.getByRole('heading', { name: 'Starting new dungeon', exact: true })).toBeVisible();
  await expect(page.locator('#dungeon-map')).not.toBeVisible();
  await releaseHistory();
  await expect(page.locator('#dungeon-map')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Starting new dungeon', exact: true })).toHaveCount(0);
  await expect(page.locator('.dungeon-directions button:enabled').first()).toBeEnabled();
  await page.locator('.dungeon-directions button:enabled').first().click();
  expect(await page.locator('#game').getAttribute('data-dungeon-snapshot')).not.toBe(before);
});

for (const completion of ['finished', 'interrupted'] as const)
test(`main menu: records replacing distinct saved and unsaved dungeon preserves both after ${completion} history`, async ({ page, isMobile }, info) => {
  const mode = 'dungeon', slots = keys.dungeon, savedPayload = {...JSON.parse(menuFixture(mode)).payload,
    stats:{...freshRunStats(),enemiesKilled:0,movesTaken:6,activeMs:5000}};
  const encoded=encodeDungeon(savedPayload);
  if(!encoded.ok)throw Error('Invalid paired statistics fixture');const saved=encoded.text;
  const savedId = savedPayload.id, battle = menuFixture('battle');
  await page.goto('./');
  await page.evaluate(({ slots, saved, battleKeys, battle }) => {
    localStorage.setItem(slots.primary, saved); localStorage.setItem(slots.backup, saved);
    localStorage.setItem(battleKeys.primary, battle);
  }, { slots, saved, battleKeys: keys.battle, battle });
  await page.goto(`./?game=${mode}`);
  const activate = async (target: ReturnType<Page['locator']>) => { if (isMobile) await target.tap(); else await target.click(); };
  await activate(page.getByRole('button', { name: `Play unsaved ${mode}`, exact: true }));
  await expect(page.locator('#dungeon-map')).toBeVisible();
  const snapshot = () => page.locator('#game').getAttribute('data-dungeon-snapshot');
  const live = JSON.parse((await snapshot())!), liveId = live.id;
  expect(liveId).not.toBe(savedId);
  const history = () => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{"records":[]}'), RUN_RECORD_KEYS.primary);
  const activeSlots = () => page.evaluate(slots => [localStorage.getItem(slots.primary), localStorage.getItem(slots.backup)], slots);
  const before = await activeSlots(); expect(before).toEqual([saved, saved]);
  const request = () => activate(page.getByRole('button', { name: 'Start new dungeon', exact: true }));
  await request(); await activate(page.locator('#dungeon-cancel-new'));
  expect((await history()).records).toEqual([]); expect(await activeSlots()).toEqual(before);
  const releaseHistory = await holdFinalRecordsWrite(page);
  await request(); await activate(page.locator('#dungeon-confirm-new'));
  await expect(page.locator('html')).toHaveAttribute('data-records-held', 'yes');
  const pending = (await history()).receipts[mode];
  expect(pending).toMatchObject({ kind: 'pending', record: { id: savedId }, other: { id: liveId } });
  const {boundary:_,...savedStats}=savedPayload.stats;
  expect(pending.record.stats).toEqual(savedStats);
  expect(pending.other.stats).toMatchObject({coverage:'whole-run',enemiesKilled:live.stats.enemiesKilled,movesTaken:live.stats.movesTaken});
  expect(pending.other.stats.activeMs).toBeGreaterThanOrEqual(live.stats.activeMs);
  expect((await history()).records).toEqual([]);
  const nextPayload = JSON.parse((await activeSlots())[0]!).payload;
  const nextId = nextPayload.id;
  expect([savedId, liveId]).not.toContain(nextId);
  const continueCurrent = async () => {
    await activate(page.getByRole('button', { name: `Continue saved ${mode}`, exact: true }));
    await expect(page.locator('#dungeon-map')).toBeVisible();
  };
  if (completion === 'interrupted') {
    await page.reload(); expect((await history()).records).toEqual([]); await continueCurrent();
  } else {
    await releaseHistory(); await expect(page.locator('#dungeon-map')).toBeVisible();
  }
  await expect.poll(async () => (await history()).records).toHaveLength(2);
  const recorded = (await history()).records;
  expect(recorded.map((row: RunRecord) => row.id).sort()).toEqual([savedId, liveId].sort());
  expect(recorded.every((row: RunRecord) => row.mode === mode && row.outcome === 'abandoned')).toBe(true);
  expect(recorded.find((row:RunRecord)=>row.id===savedId).stats).toEqual(savedStats);
  expect(recorded.find((row:RunRecord)=>row.id===liveId).stats).toEqual(pending.other.stats);
  expect((await history()).bests[mode].movesTaken.id).toBe(savedId);
  await page.reload(); await continueCurrent(); expect((await history()).records).toEqual(recorded);
  expect(await page.evaluate(key => localStorage.getItem(key), keys.battle.primary)).toBe(battle);
  await page.getByRole('link', { name: 'Main menu', exact: true }).last().click();
  await activate(page.getByRole('button', { name: 'Hall of Records', exact: true }));
  await expect(page.getByRole('dialog').getByRole('listitem')).toHaveCount(2);
  await page.screenshot({ path: info.outputPath('paired-records.png'), fullPage: true });
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

test('main menu: application import failure preserves legacy bytes and reload starts a fresh battle',async({page,browserName,applicationLoadDiagnostics},info)=>{
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
  const allowedBeforeRecovery=faultServer.receipt().allowed;faultServer.allowImport();
  await page.reload();await page.clock.resume();
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  expect(faultServer.receipt().allowed).toBeGreaterThan(allowedBeforeRecovery);
  await expect.poll(()=>faultServer.receipt().assets.reduce((sum,asset)=>sum+asset.responses['200']+asset.responses['304'],0)).toBeGreaterThan(0);
  const fresh=await readSession(page);
  expect(fresh.state.seed).toBe(1);
  expect(fresh.continuation).toBeNull();expect(fresh.pending).toBeNull();
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
test('main menu: legacy battle and run slots are ignored through launch and dungeon Continue',async({page})=>{
  await page.goto('./');
  const seed = {
    [keys.battle.primary]: menuFixture('battle'),
    [keys.battle.backup]: 'damaged battle backup',
    [keys.run.primary]: menuFixture('run'),
    [keys.run.backup]: 'damaged run backup',
    [RUN_RECORD_KEYS.primary]: encodeRunRecords(emptyRunRecords())!,
    'tactics-guru:combat-controls': 'rail',
  };
  await page.evaluate(values=>{
    for (const [key,text] of Object.entries(values)) localStorage.setItem(key,text);
    window.dispatchEvent(new Event('storage'));
  },seed);
  const menu = page.getByRole('button',{name:'Continue',exact:true});
  await expect(menu).toBeDisabled();
  await expect(page.getByRole('button',{name:'Save recovery',exact:true})).not.toBeVisible();

  await page.getByRole('button',{name:'New Game',exact:true}).click();
  await expect(page.locator('#dungeon-map')).toBeVisible();
  await page.getByRole('link',{name:'Main menu',exact:true}).click();
  await expect(menu).toBeEnabled();
  const getValues = (names: string[]) => page.evaluate(names=>Object.fromEntries(names.map(key=>[key,localStorage.getItem(key)])),names);
  const watched = [...Object.keys(seed),...Object.values(keys.dungeon),RUN_RECORD_KEYS.backup];
  const before = await getValues(watched);

  for (const [name,mode] of [['Standalone battle','battle'],['Three-encounter run','run']] as const) {
    await page.getByRole('link',{name,exact:true}).click();
    await expect(page).toHaveURL(new RegExp('[?]game='+mode+'$'));
    if(mode==='run'){
      await page.locator('#run-start').click();
      await page.locator('#run-start-encounter').click();
    }
    await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    await expect(page.getByText('Progress resets on reload or when you leave.',{exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:/Continue saved|Save recovery/})).toHaveCount(0);
    await page.getByRole('link',{name:'Main menu',exact:true}).click();
    await expect(menu).toBeEnabled();
    expect(await getValues(watched)).toEqual(before);
  }

  await menu.click();
  await expect(page).toHaveURL(/[?]game=dungeon$/);
  await expect(page.locator('#dungeon-map')).toBeVisible();
  const dungeonId = JSON.parse(before[keys.dungeon.primary]!).payload.id;
  expect(JSON.parse((await page.locator('#game').getAttribute('data-dungeon-snapshot'))!).id).toBe(dungeonId);
  await page.reload();
  await page.getByRole('button',{name:'Continue saved dungeon',exact:true}).click();
  await expect(page.locator('#dungeon-map')).toBeVisible();
  expect(JSON.parse((await page.locator('#game').getAttribute('data-dungeon-snapshot'))!).id).toBe(dungeonId);
  expect(await getValues(Object.keys(seed))).toEqual(seed);
});

test('main menu: save recovery lists only the dungeon backup',async({page})=>{
  await page.addInitScript(({keys,battle,run,dungeon})=>{
    localStorage.setItem(keys.battle.primary,battle);
    localStorage.setItem(keys.run.primary,run);
    localStorage.setItem(keys.dungeon.primary,'broken');
    localStorage.setItem(keys.dungeon.backup,dungeon);
  },{keys,battle:menuFixture('battle'),run:menuFixture('run'),dungeon:menuFixture('dungeon')});
  await page.goto('./');
  await page.getByRole('button',{name:'Save recovery',exact:true}).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('a')).toHaveCount(1);
  await expect(dialog.locator('a')).toHaveText('Dungeon · backup (some progress may be lost) · recovery needed');
  await dialog.locator('a').click();
  await expect(page.getByRole('dialog')).toContainText('Dungeon save recovery');
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
  await Promise.all([page.waitForURL(/\?game=dungeon/,{waitUntil:'domcontentloaded'}),other.waitForURL(/\?game=dungeon/,{waitUntil:'domcontentloaded'}),
    activate(page,'Start new dungeon'),activate(other,'Start new dungeon')]);
  for(const tab of [page,other])await expect(tab.locator('#dungeon-screen')).toHaveAttribute('data-boot','ready');
  const history=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'{"records":[]}').records,RUN_RECORD_KEYS.primary);
  await expect.poll(history).toMatchObject([{id,mode:'dungeon',outcome:'abandoned'}]);
  const currentId=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'{"payload":{}}').payload.id,DUNGEON_KEYS.primary);
  await expect.poll(currentId).toMatch(/^[A-Za-z0-9-]{1,64}$/);expect(await currentId()).not.toBe(id);
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
test('main menu: stale Continue and unknown intents preserve dungeon saves',async({page})=>{
 await page.goto('./?game=dungeon&entry=continue');await expect(page.getByRole('dialog')).toContainText('Dungeon save recovery');
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.includes(':dungeon:')))).toEqual([]);
 await page.goto('./?game=dungeon&entry=unrecognized');await expect(page.locator('dialog')).not.toBeVisible();
 await expect(page).toHaveURL(/[?]game=dungeon$/);
});
test('main menu: failed new-game write retains exportable recovery copies',async({page})=>{
 const text=menuFixture('dungeon');
 await page.addInitScript(({key,text})=>{
  localStorage.setItem(key,text);const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){if(key.includes(':dungeon:'))throw new DOMException('full','QuotaExceededError');original.call(this,key,value);};
 },{key:keys.dungeon.primary,text});
 await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Start new dungeon',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Dungeon save recovery');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:/^Export retained primary save/}).click();
 const file=await (await download).path();expect(readFileSync(file!,'utf8')).toBe(text);
 await expect(page.locator('#dungeon-screen')).toContainText('Progress unsaved');
});

for(const path of ['unsaved play','failed replacement'] as const)test(`main menu: dungeon departure after rejected movement retains ${path} warning`,async({page})=>{
 // Departure flushes playtime independently of rejected movement and export.
 await page.addInitScript(()=>{document.hasFocus=()=>false;});
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
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export current progress',exact:true}).click();
 const file=await (await download).path();expect(JSON.parse(readFileSync(file!,'utf8')).payload).toEqual(JSON.parse(before!));
 const accept=page.waitForEvent('dialog');const leave=page.getByRole('link',{name:'Main menu',exact:true}).click();
 await (await accept).accept();await leave;await expect(page.locator('#main-menu')).toBeVisible();
});
for (const route of ['nonexistent', '?game=zzz', '?game=run&game=battle']) test(`main menu: invalid entry ${route} returns to the root`, async ({ page }) => {
 await page.goto('./'+route);
 await expect(page).toHaveURL(new URL('./', test.info().project.use.baseURL!).href);
 await expect(page.locator('[data-menu-action]')).toHaveCount(4);
 await expect(page.locator('canvas')).toHaveCount(0);
});

test('main menu: counter-only dungeon upgrades known counters without inventing complete playtime',async({page})=>{
  const mode='dungeon', raw=readFileSync(`tests/fixtures/saves/issue-270/counter-${mode}-v1.json`,'utf8'),old=JSON.parse(raw).payload,slots=keys[mode],oldId=old.id;
  await page.addInitScript(({slots,raw,mode})=>{const flag=`test:counter-upgrade:${mode}`;if(sessionStorage.getItem(flag))return;localStorage.setItem(slots.primary,raw);localStorage.setItem(slots.backup,raw);sessionStorage.setItem(flag,'yes');},{slots,raw,mode});
  await page.goto(`./?game=${mode}`);await page.getByRole('button',{name:`Continue saved ${mode}`,exact:true}).click();
  const attribute='data-dungeon-snapshot';
  const snapshot=()=>page.locator('#game').getAttribute(attribute).then(text=>JSON.parse(text!));
  await expect.poll(async()=>(await snapshot()).stats?.version).toBe(2);
  expect((await snapshot()).stats).toMatchObject({coverage:'whole-run',timeCoverage:'since-upgrade',enemiesKilled:old.stats.enemiesKilled,movesTaken:old.stats.movesTaken});
  expect(await page.evaluate(slots=>[localStorage.getItem(slots.primary),localStorage.getItem(slots.backup)],slots)).toEqual([raw,raw]);
  await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await page.locator('#dungeon-confirm-new').click();await expect(page.locator('#dungeon-map')).toBeVisible();
  await expect.poll(async()=>(await snapshot()).id).not.toBe(oldId);
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)??'{"records":[]}').records,RUN_RECORD_KEYS.primary)).toMatchObject([{id:oldId,stats:{version:2,coverage:'whole-run',timeCoverage:'since-upgrade',enemiesKilled:old.stats.enemiesKilled,movesTaken:old.stats.movesTaken}}]);
  const history=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),RUN_RECORD_KEYS.primary);
  expect(history.bests[mode].enemiesKilled.id).toBe(oldId);expect(history.bests[mode].movesTaken.id).toBe(oldId);expect(history.bests[mode].activeMs).toBeUndefined();
  const next=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),slots.primary);expect(next.format).toBe(13);expect(next.payload.stats).toMatchObject({version:2,coverage:'whole-run',timeCoverage:'whole-run'});
});

test('main menu: five-stat records and retained personal bests stay keyboard and touch accessible', async ({page,isMobile,context},info)=>{
  const at=Date.UTC(2026,10,11,12),oldId='old-best-'+ 'a'.repeat(55);
  const old:RunRecord={mode:'run',id:oldId,outcome:'victory',recordedAt:at-86400000,battlesWon:3,floorsCleared:null,deepestFloor:null,
    stats:{version:2,coverage:'whole-run',timeCoverage:'whole-run',enemiesKilled:900,movesTaken:800,activeMs:3661000}};
  let history=appendRunRecord(emptyRunRecords(),old);
  for(let i=0;i<101;i++)history=appendRunRecord(history,{...old,id:`recent-${i}`,outcome:'abandoned',recordedAt:at+i*1000,battlesWon:1,
    stats:{version:2,coverage:'whole-run',timeCoverage:'whole-run',enemiesKilled:i,movesTaken:i,activeMs:i*1000}});
  history=appendRunRecord(history,{mode:'dungeon',id:'dungeon-example',outcome:'abandoned',recordedAt:at+200000,battlesWon:6,floorsCleared:2,deepestFloor:3,
    stats:{version:2,coverage:'whole-run',timeCoverage:'whole-run',enemiesKilled:55,movesTaken:80,activeMs:95000}});
  history=appendRunRecord(history,{...old,id:'time-partial-example',outcome:'abandoned',battlesWon:1,recordedAt:at+250000,
    stats:{version:2,coverage:'whole-run',timeCoverage:'since-upgrade',enemiesKilled:5,movesTaken:6,activeMs:99999999}});
  history=appendRunRecord(history,{mode:'run',id:'legacy-example',outcome:'defeat',recordedAt:at+300000,battlesWon:1,floorsCleared:null,deepestFloor:null});
  history=appendRunRecord(history,{...old,id:'partial-example',outcome:'abandoned',battlesWon:1,recordedAt:at+400000,
    stats:{version:2,coverage:'since-upgrade',timeCoverage:'since-upgrade',enemiesKilled:99999,movesTaken:99999,activeMs:99999999}});
  const encoded=encodeRunRecords({...history,legacyBestCoverage:true});if(!encoded)throw Error('Invalid stats fixture');
  await page.addInitScript(({key,encoded})=>localStorage.setItem(key,encoded),{key:RUN_RECORD_KEYS.primary,encoded});
  await page.goto('./');const invoker=page.getByRole('button',{name:'Hall of Records',exact:true});
  if(!isMobile)await invoker.focus();if(isMobile)await invoker.tap();else await page.keyboard.press('Enter');
  const dialog=page.getByRole('dialog'),recent=dialog.getByRole('list',{name:'Recent journeys'});
  await expect(recent.getByRole('listitem')).toHaveCount(100);await expect(recent).not.toContainText(oldId);
  const partial=recent.getByRole('listitem').first();await expect(partial).toContainText('tracked since upgrade');
  await expect(partial.locator('[data-stat]')).toHaveCount(5);
  await expect(partial.locator('[data-stat=floorsCleared] dd')).toHaveText('N/A — authored run');
  const legacy=recent.getByRole('listitem').nth(1);await expect(legacy).toContainText('Older record');
  await expect(legacy.locator('[data-stat=enemiesKilled] dd')).toHaveText('Unavailable');
  await expect(legacy.locator('[data-stat=movesTaken] dd')).toHaveText('Unavailable');
  await expect(legacy.locator('[data-stat=activeMs] dd')).toHaveText('Unavailable');
  const timePartial=recent.getByRole('listitem').nth(2);await expect(timePartial).toContainText('Active playtime is tracked since upgrade.');
  await expect(timePartial).not.toContainText('Kills and moves are tracked');await expect(timePartial.locator('[data-stat=enemiesKilled] dd')).toHaveText('5');
  await expect(dialog).toContainText('Historical best coverage is limited');
  await page.screenshot({path:info.outputPath('records-recent.png'),fullPage:true});
  const bests=dialog.locator('.run-personal-bests > summary');
  if(isMobile)await bests.tap();else{await dialog.getByRole('button',{name:'Close',exact:true}).focus();await page.keyboard.press('Tab');await expect(bests).toBeFocused();await page.keyboard.press('Enter');}
  await expect(dialog.getByRole('heading',{name:'Three-encounter run',exact:true,level:3})).toBeVisible();
  const winner=dialog.locator('[data-best=run-enemiesKilled]');await expect(winner.locator('summary')).toHaveText('Most enemies killed: 900');
  if(isMobile)await winner.locator('summary').tap();else{await page.keyboard.press('Tab');await expect(winner.locator('summary')).toBeFocused();await page.keyboard.press('Enter');}
  // A real storage event must preserve both disclosure state and the keyboard position.
   const other=await context.newPage();await other.goto('./');
   await other.evaluate(({key,text})=>localStorage.setItem(key,' '+text),{key:RUN_RECORD_KEYS.primary,text:encoded});
   await expect.poll(()=>page.evaluate(key=>localStorage.getItem(key),RUN_RECORD_KEYS.primary)).toBe(' '+encoded);
   await expect(dialog.locator('.run-personal-bests')).toHaveAttribute('open','');
   await expect(winner).toHaveAttribute('open','');
   if(!isMobile)await expect(winner.locator('summary')).toBeFocused();
   await other.close();
   await expect(winner).toContainText(oldId);await expect(winner.locator('[data-stat]')).toHaveCount(5);
  await expect(winner.getByRole('heading',{name:'Three-encounter run · Victory',level:4})).toBeVisible();
  await expect(winner.locator('[data-stat=activeMs] dd')).toHaveText('1h 1m 1s');
  await expect(dialog.locator('[data-best=run-activeMs] > summary')).toHaveText('Longest active playtime: 1h 1m 1s');
  const bounds=await dialog.evaluate(node=>({width:node.clientWidth,scroll:node.scrollWidth}));expect(bounds.scroll).toBeLessThanOrEqual(bounds.width+1);
  await winner.locator('[data-stat=activeMs]').scrollIntoViewIfNeeded();
  await expect(winner.locator('[data-stat=activeMs] dd')).toBeInViewport();
  await page.screenshot({path:info.outputPath('records-retained-best.png'),fullPage:true});
  expect(await page.evaluate(key=>localStorage.getItem(key),RUN_RECORD_KEYS.primary)).toBe(' '+encoded);
  if(isMobile)await dialog.getByRole('button',{name:'Close',exact:true}).tap();else await page.keyboard.press('Escape');
  if(!isMobile)await expect(invoker).toBeFocused();else await expect(invoker).toBeVisible();
  if(isMobile)await invoker.tap();else await invoker.click();
  await dialog.getByRole('button',{name:'Reset records',exact:true}).click();
  await dialog.getByRole('button',{name:'Confirm reset records',exact:true}).click();
  await expect(dialog.locator('.run-personal-bests')).toHaveCount(0);await expect(dialog.getByRole('status')).toContainText('No finished journeys recorded yet.');
  const cleared=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),RUN_RECORD_KEYS.primary);
  expect(cleared.records).toEqual([]);expect(cleared.bests).toEqual({run:{},dungeon:{}});
});
