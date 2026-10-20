# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: run-progression.spec.ts >> accepted player presentation reload preserves exact boundary without old cues
- Location: tests/run-progression.spec.ts:93:1

# Error details

```
Error: page.reload: net::ERR_HTTP_RESPONSE_CODE_FAILURE
Call log:
  - waiting for navigation until "load"

```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - generic [ref=f1e6]:
    - heading "This 127.0.0.1 page can’t be found" [level=1] [ref=f1e7]
    - paragraph [ref=f1e9]:
      - text: "No webpage was found for the web address:"
      - strong [ref=f1e10]: http://127.0.0.1:4173/run
    - generic [ref=f1e11]: HTTP ERROR 404
  - button "Reload" [ref=f1e14] [cursor=pointer]
```

# Test source

```ts
  1   | import {expect,test,type Page} from '@playwright/test';
  2   | import {readFileSync,writeFileSync} from 'node:fs';
  3   | import {readSession,playCommand} from './helpers/battlePolicy';
  4   | import {playerDecision} from './helpers/playerPolicy';
  5   | import {runContext} from './helpers/runItemFixtures';
  6   | import {runBattleCatalog,type RunSnapshot} from '../src/domain/runSaveEnvelope';
  7   | import {replayRunBattle} from '../src/domain/runBattle';
  8   | // Exercise actual BFCache rather than Playwright's default disabled cache.
  9   | test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,ignoreDefaultArgs:['--disable-back-forward-cache']}});
  10  | import {RUN_STORAGE_KEYS} from '../src/persistence/runStorage';
  11  | async function snapshot(page:Page):Promise<RunSnapshot>{return JSON.parse((await page.locator('#game').getAttribute('data-run-snapshot'))!);}
  12  | async function start(page:Page){
  13  |  await page.goto('/run');await page.locator('#run-start').click();await page.locator('#run-start-encounter').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  14  |  await expect(page.locator('#battle-actor')).toBeVisible();
  15  |  const drawable=await page.locator('#battle-board-region').boundingBox();
  16  |  expect(drawable!.width).toBeGreaterThan(0);
  17  |  expect(drawable!.height).toBeGreaterThanOrEqual(page.viewportSize()!.height*0.3-1);
  18  | }
  19  | async function ready(page:Page){await expect.poll(async()=>await page.locator('#game').getAttribute('data-phase')??'boundary',{timeout:15000}).toMatch(/player|ended|boundary/);}
  20  | async function fight(page:Page,wait=false){
  21  |  for(let i=0;i<500;i++){
  22  |   await ready(page);const current=await snapshot(page);if(current.items.run.phase!=='battle')break;
  23  |   const battle=await readSession(page);expect(battle.phase).toBe('player');const catalog=runBattleCatalog(current.items,runContext)!;
  24  |   await playCommand(page,wait?{type:'endTurn',unitId:battle.state.initiative[battle.state.activeIndex]}:playerDecision(battle.state,catalog));
  25  |  }
  26  |  await expect(page.locator('#run-screen')).toBeVisible();
  27  | }
  28  | async function prepare(page:Page){
  29  |  const current=await snapshot(page),offer=current.items.offer!;
  30  |  const choice=offer.options.find(o=>o.itemId==='item:healing_draught')??offer.options[0];
  31  |  await page.getByRole('button',{name:`Claim ${runContext.items[choice.itemId].label}`,exact:true}).click();await page.locator('#item-confirm').click();
  32  |  await expect(page.locator('#run-start-encounter')).toBeVisible();
  33  |  for(const equipment of (await snapshot(page)).items.ownership.equipment){
  34  |   const now=await snapshot(page);if(now.items.ownership.assignments.some(a=>a.instanceId===equipment.instanceId))continue;
  35  |   const def=runContext.items[equipment.itemId];const hero=now.items.run.party.find(h=>h.hp>0 && def.eligibleHeroes.includes(h.heroId));
  36  |   if(hero){await page.locator(`[id="target-${equipment.instanceId}"]`).selectOption(hero.heroId);await page.getByRole('button',{name:`Equip ${def.label}`,exact:true}).click();await page.locator('#item-confirm').click();}
  37  |  }
  38  |  for(const hero of (await snapshot(page)).items.run.party){
  39  |   const now=await snapshot(page);if(hero.hp===0 || hero.hp===runContext.catalog.heroes[hero.heroId].stats.maxHp || !now.items.ownership.consumables.length)continue;
  40  |   await page.locator('[id="target-item:healing_draught"]').selectOption(hero.heroId);
  41  |   await page.getByRole('button',{name:'Use Healing Draught',exact:true}).click();await page.locator('#item-confirm').click();
  42  |  }
  43  | }
  44  | test('legal run outcomes, earned rewards, terminal resume and fresh restart',async({page})=>{
  45  |  test.setTimeout(300000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await start(page);await page.locator('#battle-sound').click();const records=[];
  46  |  for(let index=0;index<3;index++){
  47  |   // Each encounter constructs a fresh shared renderer; prior selections cannot leak.
  48  |   const board=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
  49  |   expect(board.selected).toBeNull();expect(board.selectionEvents).toBe(0);
  50  |   const runBefore=await snapshot(page);
  51  |   const corner=board.tiles.find((t:{x:number;y:number})=>t.x===11&&t.y===11);
  52  |   const x=(corner.x-corner.y)*40,y=(corner.x+corner.y)*20-corner.elevation*24;
  53  |   await page.mouse.click(board.transform.x+x*board.transform.scale,board.transform.y+y*board.transform.scale);
  54  |   expect(JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!).selected).toEqual({x:11,y:11,elevation:corner.elevation});
  55  |   expect(await snapshot(page)).toEqual(runBefore);
  56  |   // Each new scene owns exactly its current actor cue; a finished encounter tears it down.
  57  |   await expect.poll(async()=>{
  58  |    const report=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
  59  |    const actor=report.units.find((unit:any)=>unit.id===report.activeId);
  60  |    expect(report.units.filter((unit:any)=>unit.id!==report.activeId).every((unit:any)=>unit.bobOffset===0)).toBe(true);
  61  |    return actor.bobOffset;
  62  |   }).toBeLessThan(-0.2);
  63  |   const beforeBob=await snapshot(page);
  64  |   await page.screenshot({path:test.info().outputPath(`encounter-${index+1}-active-bob.png`)});
  65  |   expect(await snapshot(page)).toEqual(beforeBob);
  66  |   await fight(page);
  67  |   await expect(page.locator('#game')).not.toHaveAttribute('data-battle-report');if(index===0)await page.screenshot({path:test.info().outputPath('run-reward.png')});const current=await snapshot(page);expect(index===2?['victory','defeat']:['reward','defeat']).toContain(current.items.run.phase);expect(current.items.run.encounterIndex).toBe(index);
  68  |   const record=JSON.parse((await page.locator('#game').getAttribute('data-run-battle-record'))!);const replay=replayRunBattle(record.replay,record.entry,runContext);expect(replay.ok).toBe(true);if(replay.ok){expect(replay.state).toEqual(record.state);expect(replay.events).toEqual(record.events);}records.push(record);
  69  |   if(current.items.run.phase==='defeat')break;
  70  |   if(index<2){
  71  |    // The pending offer and claimed/prepared boundary survive the real Continue path.
  72  |    if(index===1){await page.reload();await page.locator('#run-continue').click();expect(await snapshot(page)).toEqual(current);}
  73  |    await prepare(page);const prepared=await snapshot(page);if(index===1){await page.reload();await page.locator('#run-continue').click();expect(await snapshot(page)).toEqual(prepared);}
  74  |    await page.locator('#run-start-encounter').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  75  |    await expect(page.locator('#battle-sound')).toHaveAttribute('aria-pressed',index===0?'true':'false');
  76  |   }
  77  |  }
  78  |  const final=await snapshot(page);await expect(page.getByRole('heading',{name:final.items.run.phase==='victory'?'Run victory':'Run defeat',exact:true})).toBeVisible();
  79  |  await page.screenshot({path:test.info().outputPath('run-terminal.png')});
  80  |  writeFileSync(test.info().outputPath('run-records.json'),JSON.stringify(records,null,2));
  81  |  await page.reload();await page.locator('#run-continue').click();expect(await snapshot(page)).toEqual(final);
  82  |  await page.locator('#run-new').dblclick();const fresh=await snapshot(page);expect(fresh.items.run.seed).toBe(14);expect(fresh.items.run.id).not.toBe(final.items.run.id);expect(fresh.items.ownership).toEqual({consumables:[],equipment:[],assignments:[]});expect(fresh.items.run.party.every(h=>h.hp===runContext.catalog.heroes[h.heroId].stats.maxHp)).toBe(true);
  83  |  expect(errors).toEqual([]);
  84  | });
  85  | test('legal defeat reload, native keyboard restart and isolated single-battle save',async({page})=>{
  86  |  test.setTimeout(180000);await start(page);await fight(page,true);await expect(page.getByRole('heading',{name:'Run defeat',exact:true})).toBeVisible();
  87  |  const ended=await snapshot(page);await page.reload();await page.locator('#run-continue').click();expect(await snapshot(page)).toEqual(ended);
  88  |  await page.locator('#run-new').focus();await page.keyboard.press('Enter');await expect(page.locator('#run-start-encounter')).toBeVisible();
  89  |  await page.getByRole('link',{name:'Single battle',exact:true}).click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  90  |  const run=await page.evaluate(key=>localStorage.getItem(key),RUN_STORAGE_KEYS.primary);expect(JSON.parse(run!).payload.items.run.encounterIndex).toBe(0);
  91  |  await page.getByRole('link',{name:'Play three-encounter run'}).click();await page.locator('#run-continue').click();await expect(page.locator('#run-start-encounter')).toBeVisible();
  92  | });
  93  | test('accepted player presentation reload preserves exact boundary without old cues',async({page})=>{
  94  |  await start(page);await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption({index:1});await page.locator('#battle-review').click();
  95  |  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));await page.locator('#dialog-confirm').click({force:true});
  96  |  await expect(page.locator('#game')).toHaveAttribute('data-phase','presenting');const committed=await snapshot(page);
> 97  |  await page.reload();await page.clock.resume();await page.locator('#run-continue').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
      |             ^ Error: page.reload: net::ERR_HTTP_RESPONSE_CODE_FAILURE
  98  |  expect((await readSession(page)).state).toEqual(committed.activeBattle);expect((await readSession(page)).events).toEqual([]);expect(await page.evaluate(()=>window.fitDiagnostics().battleAudio?.lastToken)).toBe(0);
  99  | });
  100 | test('enemy presentation reload resumes the same commands and RNG as an uninterrupted run',async({page,browser,baseURL})=>{
  101 |  const other=await browser.newContext({viewport:page.viewportSize(),baseURL});const control=await other.newPage();
  102 |  try {
  103 |   for(const p of [page,control]){
  104 |    await p.clock.install();await start(p);await p.clock.pauseAt(await p.evaluate(()=>Date.now()+1000));
  105 |    for(let i=0;i<100;i++){
  106 |     const s=await readSession(p),last=s.replay?.commands.at(-1);
  107 |     if(s.phase==='presenting' && last && s.state.units.find(u=>u.id===last.unitId)!.side==='enemy')break;
  108 |     if(s.phase==='player')await p.locator('#battle-next').click({force:true});
  109 |     await p.clock.runFor(32);
  110 |    }
  111 |   }
  112 |   const boundary=await readSession(page);expect(boundary.phase).toBe('presenting');const last=boundary.replay!.commands.at(-1)!;expect(boundary.state.units.find(u=>u.id===last.unitId)!.side).toBe('enemy');
  113 |   expect((await readSession(control)).state).toEqual(boundary.state);
  114 |   await page.reload();await page.clock.resume();await page.locator('#run-continue').click();await control.clock.resume();
  115 |   for(const p of [page,control])await expect(p.locator('#game')).toHaveAttribute('data-phase','player');
  116 |   const resumed=await readSession(page),uninterrupted=await readSession(control);expect(resumed.state).toEqual(uninterrupted.state);
  117 |   const catalog=runBattleCatalog((await snapshot(page)).items,runContext)!;const command=playerDecision(resumed.state,catalog);
  118 |   for(const p of [page,control]){await playCommand(p,command);await expect(p.locator('#game')).toHaveAttribute('data-phase','player');}
  119 |   expect((await readSession(page)).state).toEqual((await readSession(control)).state);
  120 |  }finally{await other.close();}
  121 | });
  122 | test('run startup preserves corrupt bytes, recovery captures input, and unavailable storage permits unsaved play',async({page})=>{
  123 |  await page.goto('/run');
  124 |  await expect(page.locator('#run-start')).toBeVisible();
  125 |  expect(await page.evaluate(keys=>keys.map(key=>localStorage.getItem(key)),Object.values(RUN_STORAGE_KEYS))).toEqual([null,null]);
  126 |  expect((await snapshot(page)).activeBattle).toBeNull();
  127 |  await page.evaluate(key=>localStorage.setItem(key,'{bad'),RUN_STORAGE_KEYS.primary);await page.reload();
  128 |  expect(await page.evaluate(key=>localStorage.getItem(key),RUN_STORAGE_KEYS.primary)).toBe('{bad');
  129 |  await page.locator('#run-recovery').click();await expect(page.getByRole('dialog')).toContainText('primary: invalid');
  130 |  const visited=new Set<string>();
  131 |  for(const key of ['Tab','Shift+Tab'])for(let i=0;i<8;i++){
  132 |   await page.keyboard.press(key);expect(await page.evaluate(()=>!!document.activeElement?.closest('dialog'))).toBe(true);
  133 |   visited.add(await page.evaluate(()=>document.activeElement!.id));
  134 |  }
  135 |  for(const id of await page.getByRole('dialog').getByRole('button').evaluateAll(buttons=>buttons.map(b=>b.id)))expect(visited.has(id)).toBe(true);
  136 |  await page.locator('#run-close-recovery').click();await page.locator('#run-start').click();await page.locator('#run-confirm-new').click();await expect(page.locator('#run-start-encounter')).toBeVisible();
  137 |  await page.reload();await page.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError');}});});await page.reload();
  138 |  await page.locator('#run-unsaved').click();await page.locator('#run-start-encounter').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');await expect(page.locator('#battle-persistence')).toContainText('unsaved');
  139 | });
  140 | test('run preparation and dialogs retain 44px controls, native touch and narrow layout',async({page},info)=>{
  141 |  await page.goto('/run');const activate=async(selector:string)=>{if(info.project.use.hasTouch)await page.locator(selector).tap();else await page.locator(selector).click();};
  142 |  await activate('#run-start');await expect(page.locator('#run-start-encounter')).toBeVisible();
  143 |  for(const viewport of [{width:320,height:568},{width:915,height:412},{width:412,height:915}]){
  144 |   await page.setViewportSize(viewport);
  145 |   const boxes=await page.locator('#run-screen button,#run-screen a,#run-screen select').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>{n.scrollIntoView({block:'nearest'});const r=n.getBoundingClientRect();return{width:r.width,height:r.height,left:r.left,right:r.right};}));
  146 |   for(const box of boxes){expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(viewport.width);}
  147 |   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  148 |  }
  149 |  await activate('#run-start-encounter');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  150 |  await page.locator('#fit-restart').click();await expect(page.getByRole('dialog')).toBeVisible();const before=await snapshot(page);await page.mouse.click(3,3);expect(await snapshot(page)).toEqual(before);await page.locator('#run-cancel-new').click();
  151 |  await expect(page.locator('#fit-restart')).toBeFocused();
  152 |  await page.locator('#battle-sound').click();await page.locator('#fit-restart').click();await page.locator('#run-confirm-new').click();await page.locator('#run-start-encounter').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');await expect(page.locator('#battle-sound')).toHaveAttribute('aria-pressed','true');
  153 | });
  154 |
  155 | test('cached run return cannot overwrite either slot of a newer replacement',async({page,context,baseURL})=>{
  156 |  await start(page);const first=(await snapshot(page)).items.run.id;
  157 |  await page.goto(new URL('map',baseURL).href);await expect(page.locator('#map-grid span')).toHaveCount(400);
  158 |  const replacement=await context.newPage();await replacement.goto('/run');
  159 |  await replacement.locator('#run-start').click();await replacement.locator('#run-confirm-new').click();
  160 |  const fresh=await snapshot(replacement);expect(fresh.items.run.id).not.toBe(first);expect(fresh.items.run.seed).toBe(14);
  161 |  const stored=()=>page.evaluate(keys=>({primary:localStorage.getItem(keys.primary),backup:localStorage.getItem(keys.backup)}),RUN_STORAGE_KEYS);
  162 |  const before=await stored();await replacement.close();await page.goBack({waitUntil:'commit'});
  163 |  await expect(page.locator('#run-continue')).toBeVisible();expect(await stored()).toEqual(before);
  164 |  await page.locator('#run-continue').click();expect(await snapshot(page)).toEqual(fresh);
  165 | });
  166 |
  167 | test('review: in-flow Continue resumes an ongoing backup battle after legal defeat',async({page})=>{
  168 |  test.setTimeout(90000);await start(page);await fight(page,true);
  169 |  await expect(page.getByRole('heading',{name:'Run defeat',exact:true})).toBeVisible();
  170 |  const backup=await page.evaluate(key=>localStorage.getItem(key),RUN_STORAGE_KEYS.backup);
  171 |  const expected=JSON.parse(backup!).payload.activeBattle;expect(expected.outcome).toBe('ongoing');
  172 |  await page.getByRole('button',{name:'Save recovery',exact:true}).click();
  173 |  await page.getByRole('dialog').getByRole('button',{name:'Remove primary save',exact:true}).click();
  174 |  await page.getByRole('dialog').getByRole('button',{name:'Remove reviewed save',exact:true}).click();
  175 |  if(await page.getByRole('dialog').isVisible())await page.getByRole('dialog').getByRole('button',{name:/^(Close|Cancel)$/}).click();
  176 |  await page.getByRole('button',{name:'Continue saved run',exact:true}).click();
  177 |  await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  178 |  await page.getByRole('dialog').getByRole('button',{name:'Continue',exact:true}).click({force:true});
  179 |  await page.clock.runFor(32);
  180 |  await expect(page.locator('#run-screen')).toBeHidden();await expect(page.locator('#game')).toHaveCSS('visibility','visible');
  181 |  expect((await readSession(page)).continuation?.snapshot).toEqual(expected);expect(await page.locator('canvas').count()).toBe(1);
  182 |  await page.clock.resume();await expect(page.getByRole('heading',{name:'Run defeat',exact:true})).toBeVisible();
  183 | });
  184 | test('review: read-level SecurityError permits explicit unsaved play without changing inaccessible bytes',async({page})=>{
  185 |  await page.goto('/run');await page.evaluate(keys=>{localStorage.setItem(keys.primary,'preserve primary');localStorage.setItem(keys.backup,'preserve backup');},RUN_STORAGE_KEYS);
  186 |  await page.addInitScript(keys=>{
  187 |   const read=Storage.prototype.getItem,write=Storage.prototype.setItem,remove=Storage.prototype.removeItem,calls:string[]=[];
  188 |   const owns=(key:string)=>Object.values(keys).some(value=>value===key);
  189 |   Storage.prototype.getItem=function(key){if(owns(key))throw new DOMException('Read denied','SecurityError');return read.call(this,key);};
  190 |   Storage.prototype.setItem=function(key,value){if(owns(key))calls.push('write:'+key);return write.call(this,key,value);};
  191 |   Storage.prototype.removeItem=function(key){if(owns(key))calls.push('remove:'+key);return remove.call(this,key);};
  192 |   Object.assign(window,{reviewReadEvidence:()=>({primary:read.call(localStorage,keys.primary),backup:read.call(localStorage,keys.backup),calls})});
  193 |  },RUN_STORAGE_KEYS);
  194 |  await page.reload();await expect(page.locator('#run-continue')).toHaveCount(0);
  195 |  await page.locator('#run-recovery').click();await expect(page.getByRole('dialog')).toContainText('primary: unavailable. backup: unavailable');await page.getByRole('button',{name:'Close',exact:true}).click();
  196 |  await page.locator('#run-unsaved').click();await page.locator('#run-start-encounter').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  197 |  await page.locator('#battle-next').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');await expect(page.locator('#battle-persistence')).toContainText('unsaved');
```
