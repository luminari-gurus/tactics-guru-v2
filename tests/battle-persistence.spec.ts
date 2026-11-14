import { test as baseTest } from '@playwright/test';
import { walkDungeon } from './helpers/dungeonTraversal';
import { expect, test,  } from './helpers/forceRailControls';
import { BATTLE_STORAGE_KEYS as keys } from '../src/persistence/battleStorage';
import { confirmRestart, readSession, combatSkin } from './helpers/battlePolicy';
import { menuFixture } from './helpers/menuFixtures';
import { RUN_STORAGE_KEYS } from '../src/persistence/runStorage';
import { DUNGEON_KEYS } from '../src/persistence/dungeonStorage';
import { RUN_RECORD_KEYS, encodeRunRecords } from '../src/persistence/runRecordsStorage';
import { emptyRunRecords } from '../src/domain/runRecords';
import type { RunSnapshot } from '../src/domain/runSaveEnvelope';

// Playwright disables BFCache by default; persistence coverage must include cached documents.
test.use({launchOptions:async({browserName},use)=>{
  await use({executablePath:browserName==='chromium'?process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE:undefined,ignoreDefaultArgs:['--disable-back-forward-cache']});
}});


declare global {
  interface Window {
    testingSaveAudit: { calls: string[]; snapshot: () => Record<string, string | null> };
  }
}
for(const group of ['journeys','diagnostics','qbert'] as const)
for(const condition of ['missing','valid','corrupt','backup-only','unavailable'] as const) test(group==='journeys'
  ?`testing routes: fresh play never accesses ${condition} saved games`
  :group==='qbert'?`testing routes: Qbert never accesses ${condition} saved games`
  :`testing routes: diagnostic play never accesses ${condition} saved games`,async({page})=>{
  const families={battle:keys,run:RUN_STORAGE_KEYS,dungeon:DUNGEON_KEYS};
  const values:Record<string,string>={'isolation-unrelated':'preserve'};
  for(const mode of ['battle','run','dungeon'] as const)for(const slot of ['primary','backup'] as const){
    if(condition==='missing'||condition==='backup-only'&&slot==='primary')continue;
    values[families[mode][slot]]=condition==='corrupt'?'broken saved bytes':menuFixture(mode);
  }
  for(const slot of ['primary','backup'] as const){
    if(condition==='missing'||condition==='backup-only'&&slot==='primary')continue;
    values[RUN_RECORD_KEYS[slot]]=condition==='corrupt'?'broken history bytes':encodeRunRecords(emptyRunRecords())!;
  }
  // Harness setup precedes the application spy; subsequent assertion reads bypass it explicitly.
  await page.goto('./');
  await page.evaluate(values=>{
    for(const [key,text]of Object.entries(values))localStorage.setItem(key,text);
    sessionStorage.setItem('tactics-guru:menu-new-dungeon-review','review sentinel');
  },values);
  const progressKeys=[...Object.values(families).flatMap(slots=>Object.values(slots)),...Object.values(RUN_RECORD_KEYS)];
  const expected=Object.fromEntries([...progressKeys,'isolation-unrelated'].map(key=>[key,values[key]??null]));
  expected['tactics-guru:menu-new-dungeon-review']='review sentinel';
  await page.addInitScript(({progressKeys,unavailable})=>{
    const local=window.localStorage,session=window.sessionStorage;
    const get=Storage.prototype.getItem,set=Storage.prototype.setItem,remove=Storage.prototype.removeItem,clear=Storage.prototype.clear;
    const watched=new Set([...progressKeys,'tactics-guru:menu-new-dungeon-review']);
    const calls:string[]=[];
    window.testingSaveAudit={calls,snapshot:()=>Object.fromEntries([
      ...[...progressKeys,'isolation-unrelated'].map(key=>[key,get.call(local,key)]),
      ['tactics-guru:menu-new-dungeon-review',get.call(session,'tactics-guru:menu-new-dungeon-review')],
    ])};
    Storage.prototype.getItem=function(key){if(watched.has(String(key)))calls.push(`read:${key}`);return get.call(this,key);};
    Storage.prototype.setItem=function(key,value){if(watched.has(String(key)))calls.push(`write:${key}`);set.call(this,key,value);};
    Storage.prototype.removeItem=function(key){if(watched.has(String(key)))calls.push(`remove:${key}`);remove.call(this,key);};
    Storage.prototype.clear=function(){calls.push('clear');clear.call(this);};
    if(unavailable)Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError');}});
  },{progressKeys,unavailable:condition==='unavailable'});
  const audit=async()=>{
    expect(await page.evaluate(()=>window.testingSaveAudit.calls)).toEqual([]);
    expect(await page.evaluate(()=>window.testingSaveAudit.snapshot())).toEqual(expected);
    await expect(page.getByRole('button',{name:/Continue saved|Save recovery|Play unsaved/})).toHaveCount(0);
  };
  const entries={journeys:[
    ['battle','./?game=battle&entry=continue'],['run','./?game=run&entry=recovery'],
    ['battle','./battle/?game=dungeon&entry=continue'],['run','./run?game=battle&entry=recovery'],
    ['dungeon','./dungeon?game=run&entry=new'],['map','./map?game=dungeon&entry=new'],
  ],diagnostics:[
    ['battle','./?scene=battle&game=run&entry=continue'],['proof','./?scene=proof&game=dungeon&entry=new'],
    ['content-smoke','./?scene=content-smoke&game=run&entry=recovery'],
  ],qbert:[['qbert','./qbert?game=run&entry=continue']]}[group];
  for(const [mode,url]of entries)await test.step(mode+' '+url,async()=>{
    await page.goto(url);
    const ready=async()=>{
      if(mode==='battle'||mode==='qbert')await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
      else if(mode==='run')await expect(page.locator('#run-start')).toBeVisible();
      else if(mode==='dungeon')await expect(page.getByRole('button',{name:'Start new dungeon',exact:true})).toBeVisible();
      else if(mode==='map')await expect(page.locator('#map-grid span')).toHaveCount(400);
      else await expect(page.locator('#fit-status')).toHaveText(mode==='proof'?'Ready':'Content ready');
    };
    await ready();await audit();
    if(mode==='battle'){
      const before=await readSession(page);await page.locator('#battle-next').click();
      await expect.poll(async()=>(await readSession(page)).state.commandCount).toBeGreaterThan(before.state.commandCount);
      await page.locator('#fit-restart').click();
      if(new URL(page.url()).searchParams.get('game')==='battle')await confirmRestart(page);
      await expect.poll(async()=>JSON.parse(await page.locator('#game').getAttribute('data-session')??'null')?.state.seed).toBe(2);
    }else if(mode==='qbert'){
      const before=await readSession(page);await page.locator('#battle-next').click();
      await expect.poll(async()=>(await readSession(page)).state.commandCount).toBeGreaterThan(before.state.commandCount);
      await page.locator('#fit-restart').click();await ready();
    }else if(mode==='run'){
      await page.locator('#run-start').click();await page.locator('#run-start-encounter').click();
      await expect(page.locator('#game')).toHaveAttribute('data-phase','player');await page.locator('#battle-next').click();
      await page.locator('#fit-restart').click();
      if(new URL(page.url()).searchParams.get('game')==='run')await page.locator('#run-confirm-restart').click();
      await expect(page.locator('#run-start-encounter')).toBeVisible();
    }else if(mode==='dungeon'){
      await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();
      await expect(page.locator('#dungeon-map')).toBeVisible();
      await page.locator('.dungeon-directions button:not(:disabled)').first().click();
      // A legal exploration step can enter an encounter. Wait for its actual
      // screen rather than clicking the loading screen's transient restart.
      const stepped=JSON.parse((await page.locator('#game').getAttribute('data-dungeon-snapshot'))!);
      if(stepped.phase==='battle'){
        await expect(page.locator('#game')).toHaveAttribute('data-ready','true');
        await page.locator('#fit-restart').click();
      }else await page.locator('#dungeon-screen').getByRole('button',{name:'Start new dungeon',exact:true}).click();
      await expect.poll(async()=>JSON.parse((await page.locator('#game').getAttribute('data-dungeon-snapshot'))!).id).not.toBe(stepped.id);
      await expect(page.locator('#dungeon-map')).toBeVisible();
    }else if(mode==='proof')await page.locator('#fit-restart').click();
    if(mode==='run'||mode==='dungeon') {
      const snapshot=await page.locator('#game').getAttribute(`data-${mode}-snapshot`);
      expect(JSON.parse(snapshot??'null')?.stats).toBeUndefined();
    }
    await audit();
    await page.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));});
    await audit();await page.reload();await ready();await audit();
    if(mode==='battle'){
      const fresh=(await readSession(page)).state;expect(fresh.seed).toBe(1);
      await page.locator('#battle-next').click();
      await expect.poll(async()=>(await readSession(page)).state.commandCount).toBeGreaterThan(fresh.commandCount);await audit();
      await page.goto('./map');await expect(page.locator('#map-grid span')).toHaveCount(400);await audit();
      await page.goBack({waitUntil:'commit'});await ready();await audit();
      expect((await readSession(page)).state).toEqual(fresh);
    }
    if(mode==='run')expect(JSON.parse(await page.locator('#game').getAttribute('data-run-snapshot')??'null').items.run.encounterIndex).toBe(0);
  });
  await page.goto('./');
  expect(await page.evaluate(()=>window.testingSaveAudit.snapshot())).toEqual(expected);
  if(condition==='valid'||condition==='backup-only'){
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await expect(page.locator('#dungeon-screen')).toContainText('Floor 1');
    const after=await page.evaluate(()=>window.testingSaveAudit.snapshot());
    for(const slots of [families.battle,families.run,RUN_RECORD_KEYS])for(const key of Object.values(slots))expect(after[key]).toBe(expected[key]);
  }else await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
});
test.beforeEach(async({page})=>{
  await page.addInitScript(()=>window.addEventListener('pageshow',event=>{
    if(event.persisted)sessionStorage.setItem('test:bfcache-return',location.href);
  }));
});
test('testing routes: browser Back resets the three-encounter run', async ({ page, browserName }) => {
  const legacy = { [RUN_STORAGE_KEYS.primary]: menuFixture('run'), [RUN_STORAGE_KEYS.backup]: 'damaged run backup' };
  await page.goto('./');
  await page.evaluate(values => {
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
  }, legacy);
  await page.getByRole('link', { name: 'Three-encounter run', exact: true }).click();
  const runUrl = page.url();
  const snapshot = async (): Promise<RunSnapshot> =>
    JSON.parse((await page.locator('#game').getAttribute('data-run-snapshot'))!);
  await page.locator('#run-start').click();
  await page.locator('#run-start-encounter').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  const before = await readSession(page);
  await page.locator('#battle-next').click();
  await expect.poll(async () => (await readSession(page)).state.commandCount).toBeGreaterThan(before.state.commandCount);
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  const oldId = (await snapshot()).items.run.id;

  await page.getByRole('link', { name: 'Single battle', exact: true }).click();
  await expect(page).toHaveURL(/\/battle$/);
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  await page.goBack({ waitUntil: 'commit' });
  await expect(page).toHaveURL(runUrl);
  await expect(page.locator('#run-start')).toBeVisible();
  // Chromium's regression profile enables BFCache. WebKit also covers a cold history return.
  if (browserName === 'chromium') {
    expect(await page.evaluate(() => sessionStorage.getItem('test:bfcache-return'))).toBe(runUrl);
  }

  const fresh = await snapshot();
  expect(fresh.items.run.id).not.toBe(oldId);
  expect(fresh.items.run.encounterIndex).toBe(0);
  expect(fresh.activeBattle).toBeNull();
  expect(await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])),
    Object.keys(legacy))).toEqual(legacy);
});

test('cached dungeon record history preserves the replacement and one old result',async({page,baseURL})=>{
  const mode='dungeon',slots=DUNGEON_KEYS,text=menuFixture(mode);
  const old=JSON.parse(text).payload,oldId=old.id;
  const first=new URL(`./?game=${mode}&history=records-first`,baseURL).href,map=new URL('map',baseURL).href;
  await page.goto('./');await page.evaluate(({slots,text})=>{localStorage.setItem(slots.primary,text);localStorage.setItem(slots.backup,text);},{slots,text});
  await page.goto(first);
  const continueJourney=async()=>{
    await page.getByRole('button',{name:`Continue saved ${mode}`,exact:true}).click();
    await expect(page.locator('#dungeon-map')).toBeVisible();
  };
  await continueJourney();await page.goto(map);await expect(page.locator('#map-grid span')).toHaveCount(400);
  await page.goto(new URL(`./?game=${mode}`,baseURL).href);
  await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();
  await page.locator('#dungeon-confirm-new').click();
  await expect(page.locator('#dungeon-map')).toBeVisible();
    // Capture reviewed bytes after the legitimate exploration-time checkpoint.
    await page.getByRole('button',{name:'Save recovery',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Dungeon save recovery',exact:true})).toBeVisible();
  const saved=await page.evaluate(slots=>[localStorage.getItem(slots.primary),localStorage.getItem(slots.backup)],slots);
  const history=await page.evaluate(key=>localStorage.getItem(key),RUN_RECORD_KEYS.primary);
  expect(JSON.parse(history!).records).toMatchObject([{id:oldId,outcome:'abandoned'}]);
  await page.goBack({waitUntil:'commit'});await expect(page).toHaveURL(map);await page.goBack({waitUntil:'commit'});
  await expect(page.getByRole('button',{name:`Continue saved ${mode}`,exact:true})).toBeVisible();
  expect(await page.evaluate(()=>sessionStorage.getItem('test:bfcache-return'))).toBe(first);
  expect(await page.evaluate(key=>localStorage.getItem(key),RUN_RECORD_KEYS.primary)).toBe(history);
  await continueJourney();
  expect(await page.evaluate(slots=>[localStorage.getItem(slots.primary),localStorage.getItem(slots.backup)],slots)).toEqual(saved);
  expect(await page.evaluate(key=>localStorage.getItem(key),RUN_RECORD_KEYS.primary)).toBe(history);
});

// Exercise Radial inside this file's existing real BFCache harness.
const radialTest=baseTest.extend({context:async({context},use)=>{
  await context.addInitScript(()=>{
    (globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls='radial';
    try {localStorage.setItem('tactics-guru:combat-controls','radial');} catch { /* private mode */ }
  });
  await use(context);
}});
radialTest('radial testing routes preserve saved games through actions restart reload and Back',async({page,isMobile})=>{
    const families={battle:keys,run:RUN_STORAGE_KEYS,dungeon:DUNGEON_KEYS};
    const values:Record<string,string>={'radial-unrelated':'preserve'};
    for(const mode of ['battle','run','dungeon'] as const)for(const slot of ['primary','backup'] as const)values[families[mode][slot]]=menuFixture(mode);
    await page.goto('./');
    await page.evaluate(values=>{for(const [key,text]of Object.entries(values))localStorage.setItem(key,text);sessionStorage.setItem('tactics-guru:menu-new-dungeon-review','radial review');},values);
    const progressKeys=Object.values(families).flatMap(slots=>Object.values(slots));
    const expected={...values,'tactics-guru:menu-new-dungeon-review':'radial review'};
    await page.addInitScript(progressKeys=>{
      const local=window.localStorage,session=window.sessionStorage;
      const get=Storage.prototype.getItem,set=Storage.prototype.setItem,remove=Storage.prototype.removeItem,clear=Storage.prototype.clear;
      const watched=new Set([...progressKeys,'tactics-guru:menu-new-dungeon-review']),calls:string[]=[];
      window.testingSaveAudit={calls,snapshot:()=>Object.fromEntries([...progressKeys,'radial-unrelated'].map(key=>[key,get.call(local,key)]).concat([['tactics-guru:menu-new-dungeon-review',get.call(session,'tactics-guru:menu-new-dungeon-review')]]))};
      Storage.prototype.getItem=function(key){if(watched.has(String(key)))calls.push(`read:${key}`);return get.call(this,key);};
      Storage.prototype.setItem=function(key,value){if(watched.has(String(key)))calls.push(`write:${key}`);set.call(this,key,value);};
      Storage.prototype.removeItem=function(key){if(watched.has(String(key)))calls.push(`remove:${key}`);remove.call(this,key);};
      Storage.prototype.clear=function(){calls.push('clear');clear.call(this);};
      const draw=crypto.getRandomValues.bind(crypto);
      crypto.getRandomValues=((array:ArrayBufferView<ArrayBuffer>)=>{if(array instanceof Uint32Array&&array.length===1){array[0]=28;return array;}return draw(array);}) as typeof crypto.getRandomValues;
    },progressKeys);
    const audit=async()=>{
      expect(await page.evaluate(()=>window.testingSaveAudit.calls)).toEqual([]);
      expect(await page.evaluate(()=>window.testingSaveAudit.snapshot())).toEqual(expected);
      await expect(page.getByRole('button',{name:/Continue saved|Save recovery|Play unsaved/})).toHaveCount(0);
    };
    for(const mode of ['battle','run','dungeon'] as const){
      await page.goto(`./${mode}`);
      if(mode==='run'){await page.locator('#run-start').click();await page.locator('#run-start-encounter').click();}
      if(mode==='dungeon'){await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await walkDungeon(page,undefined,isMobile?'touch':'keyboard');}
      await expect(page.locator('#game')).toHaveAttribute('data-phase','player');await expect.poll(()=>combatSkin(page)).toBe('radial');
      const fresh=(await readSession(page)).state;
      await page.getByRole('button',{name:'End turn',exact:true}).click();
      await expect.poll(async()=>(await readSession(page)).state.commandCount).toBeGreaterThan(fresh.commandCount);
      await expect(page.locator('#game')).toHaveAttribute('data-phase','player');await audit();
      if(mode==='battle'){
        await page.goto('./map');await page.goBack({waitUntil:'commit'});
        await expect.poll(async()=>(await readSession(page))?.state).toEqual(fresh);await audit();
      }
      await page.locator('#fit-restart').click();
      if(mode==='battle')await expect.poll(async()=>(await readSession(page))?.state.seed).toBe(2);
      else await expect(page.locator(mode==='run'?'#run-start-encounter':'#dungeon-map')).toBeVisible();
      await audit();await page.reload();
      if(mode==='battle'){await expect(page.locator('#game')).toHaveAttribute('data-phase','player');expect((await readSession(page)).state).toEqual(fresh);}
      else await expect(mode==='run'?page.locator('#run-start'):page.getByRole('button',{name:'Start new dungeon',exact:true})).toBeVisible();
      await audit();
    }
    await page.getByRole('link',{name:'Main menu',exact:true}).click();
    expect(await page.evaluate(()=>window.testingSaveAudit.snapshot())).toEqual(expected);
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await expect(page.locator('#dungeon-screen')).toContainText('Floor 1');
    expect(await page.evaluate(()=>window.testingSaveAudit.snapshot())).toEqual(expected);
  });
