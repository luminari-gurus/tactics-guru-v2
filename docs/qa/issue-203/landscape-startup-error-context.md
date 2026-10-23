# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: battle-persistence.spec.ts >> default Move Continue is read-only and confirmed movement keeps the remaining-action flow
- Location: tests/battle-persistence.spec.ts:40:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  locator('#game')
Expected: "player"
Received: ""
Timeout:  5000ms

Call log:
  - Expect "toHaveAttribute" locator('#game') with timeout 5000ms
  - waiting for locator('#game')
    - locator resolved to <main id="game" data-ready="false" aria-label="Tactics Guru game canvas"></main>
    - unexpected value "null"

```

```yaml
- main "Tactics Guru game canvas"
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | import { readFileSync } from 'node:fs';
  3   | import { BATTLE_STORAGE_KEYS as keys } from '../src/persistence/battleStorage';
  4   | import { decodeBattleSave, encodeBattleSave } from '../src/domain/saveEnvelope';
  5   | import { battleCatalog as catalog } from '../src/content/catalog';
  6   | import { confirmRestart, playCommand, playerDecision, readSession } from './helpers/battlePolicy';
  7   | import { BattleSession } from '../src/app/BattleSession';
  8   | import { previewMovement } from '../src/domain/grid';
  9   | import { RULE_BOUNDS } from '../src/domain/constants';
  10  | import type { BattleState } from '../src/domain/types';
  11  | 
  12  | // Playwright disables BFCache by default; persistence coverage must include cached documents.
  13  | test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,ignoreDefaultArgs:['--disable-back-forward-cache']}});
  14  | 
> 15  | const ready=(page:Page)=>expect(page.locator('#game')).toHaveAttribute('data-phase','player');
      |                                                        ^ Error: expect(locator).toHaveAttribute(expected) failed
  16  | const stored=(page:Page)=>page.evaluate(keys=>({primary:localStorage.getItem(keys.primary),backup:localStorage.getItem(keys.backup)}),keys);
  17  | async function seedTwo(page:Page) {
  18  |   await page.goto('/');await ready(page);await page.locator('#fit-restart').click();await confirmRestart(page);await ready(page);
  19  | }
  20  | async function freeze(page:Page) {await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));}
  21  | async function chooseMove(page:Page) {
  22  |   await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption({index:1});await page.locator('#battle-review').click();
  23  | }
  24  | async function touch(page:Page,selector:string) {
  25  |   const element=page.locator(selector);await element.scrollIntoViewIfNeeded();const box=(await element.boundingBox())!;
  26  |   if(test.info().project.use.hasTouch){await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);return;}
  27  |   const cdp=await page.context().newCDPSession(page);
  28  |   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});
  29  |   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  30  | }
  31  | 
  32  | async function continueSnapshot(page:Page,state:BattleState){
  33  |   const save=encodeBattleSave(state,catalog);if(!save.ok)throw Error(save.reason);
  34  |   await page.addInitScript(({key,text})=>localStorage.setItem(key,text),{key:keys.primary,text:save.text});
  35  |   await page.goto('/');await page.locator('#save-continue').click();await ready(page);
  36  |   expect((await readSession(page)).state).toEqual(state);
  37  |   return save.text;
  38  | }
  39  | 
  40  | test('default Move Continue is read-only and confirmed movement keeps the remaining-action flow',async({page})=>{
  41  |   await page.goto('/');await ready(page);const before=await readSession(page),saved=await stored(page);
  42  |   await page.reload();await page.locator('#save-continue').click();await ready(page);
  43  |   await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','true');
  44  |   await expect(page.locator('#fit-restart')).toBeFocused();
  45  |   expect((await readSession(page)).state).toEqual(before.state);expect(await stored(page)).toEqual(saved);
  46  |   await page.locator('#battle-target').selectOption({index:1});await page.locator('#battle-review').click();await page.locator('#dialog-cancel').click();
  47  |   await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','true');
  48  |   await expect(page.locator('#battle-review')).toBeDisabled();expect(await stored(page)).toEqual(saved);
  49  |   await page.locator('#battle-target').selectOption({index:1});await page.locator('#battle-review').click();await page.locator('#dialog-confirm').click();await ready(page);
  50  |   const moved=await readSession(page);expect(moved.state.commandCount).toBe(before.state.commandCount+1);
  51  |   expect(moved.continuation!.commands).toHaveLength(1);expect(moved.continuation!.commands[0].type).toBe('move');
  52  |   expect(moved.state.units.find(u=>u.id===moved.state.initiative[moved.state.activeIndex])).toMatchObject({hasMoved:true,hasActed:false});
  53  |   await expect(page.locator('#battle-move')).toBeDisabled();await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','false');
  54  |   await expect(page.locator('[data-action=basic]')).toBeEnabled();await expect(page.locator('#battle-target')).toBeDisabled();
  55  |   await page.locator('#battle-scroll').evaluate(e=>{e.scrollTop=0;});
  56  |   await page.screenshot({path:test.info().outputPath('post-move.png')});
  57  |   const committed=await stored(page);await page.reload();await page.locator('#save-continue').click();await ready(page);
  58  |   expect((await readSession(page)).state).toEqual(moved.state);expect(await stored(page)).toEqual(committed);
  59  |   await expect(page.locator('#battle-move')).toBeDisabled();await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','false');
  60  |   await expect(page.locator('#battle-target')).toBeDisabled();await expect(page.locator('#battle-review')).toBeDisabled();
  61  | });
  62  | 
  63  | test('default Move does not return after a legally reached attack before movement',async({page})=>{
  64  |   const fixture=new BattleSession(catalog,'map:forest_ruins',2);
  65  |   for(let i=0;i<200;i++){
  66  |     const command=fixture.phase==='player'?playerDecision(fixture.state):null;
  67  |     if(command?.type==='useAbility' && !fixture.active.hasMoved && !fixture.active.hasActed)break;
  68  |     if(command)expect(fixture.prepare(command).ok).toBe(true);
  69  |     const step=command?fixture.confirm():fixture.nextEnemy();if(!step)throw Error('Missing legal attack boundary');fixture.finishPresentation(step.token);
  70  |   }
  71  |   const command=playerDecision(fixture.state);expect(command.type).toBe('useAbility');expect(fixture.active.hasMoved).toBe(false);
  72  |   await continueSnapshot(page,fixture.state);await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','true');
  73  |   await playCommand(page,command);await ready(page);
  74  |   const after=await readSession(page);expect(after.state.round).toBe(fixture.state.round);expect(after.state.activeIndex).toBe(fixture.state.activeIndex);
  75  |   expect(after.state.units.find(u=>u.id===fixture.active.id)).toMatchObject({hasMoved:false,hasActed:true});
  76  |   await expect(page.locator('#battle-move')).toBeEnabled();await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','false');
  77  |   await expect(page.locator('#battle-target')).toBeDisabled();await expect(page.locator('#battle-review')).toBeDisabled();
  78  |   await page.locator('#battle-log-open').click();await page.locator('#log-close').click();await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','false');
  79  |   await page.locator('#battle-move').click();await expect(page.locator('#battle-target')).toBeEnabled();
  80  |   expect(fixture.prepare(command).ok).toBe(true);const step=fixture.confirm()!;fixture.finishPresentation(step.token);expect(after.state).toEqual(fixture.state);
  81  | });
  82  | 
  83  | for(const boundary of ['command limit','origin only'] as const)test(`default Move respects ${boundary} without an intent or save mutation`,async({page})=>{
  84  |   // Validated artificial snapshots isolate domain boundaries; they are not legal-play claims.
  85  |   const fixture=new BattleSession(catalog,'map:forest_ruins',2);
  86  |   while(fixture.phase==='enemy'){const step=fixture.nextEnemy()!;fixture.finishPresentation(step.token);}
  87  |   const actor=fixture.active;
  88  |   let state:BattleState;
  89  |   if(boundary==='command limit')state={...fixture.state,commandCount:RULE_BOUNDS.commandCount.max};
  90  |   else {
  91  |     const blockers=fixture.state.units.filter(u=>u.id!==actor.id).slice(0,2);
  92  |     state={...fixture.state,units:fixture.state.units.map(u=>({...u,cell:u.id===actor.id?{x:0,y:0}:u.id===blockers[0].id?{x:1,y:0}:u.id===blockers[1].id?{x:0,y:1}:u.cell}))};
  93  |   }
  94  |   const reach=previewMovement(state,actor.id,catalog);
  95  |   if(boundary==='origin only'){expect(reach).toEqual({ok:true,cells:[{cell:{x:0,y:0},cost:0}]});}
  96  |   else expect(reach).toEqual({ok:false,reason:'commandLimit'});
  97  |   const text=await continueSnapshot(page,state);
  98  |   await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed',boundary==='origin only'?'true':'false');
  99  |   if(boundary==='command limit')await expect(page.locator('#battle-move')).toBeDisabled();
  100 |   else {await expect(page.locator('#battle-move')).toBeEnabled();await expect(page.locator('#battle-target option')).toHaveCount(1);}
  101 |   await expect(page.locator('#battle-target')).toHaveValue('');await expect(page.locator('#battle-review')).toBeDisabled();
  102 |   expect(JSON.parse((await page.locator('#game').getAttribute('data-session'))!).pending).toBeNull();
  103 |   expect((await stored(page)).primary).toBe(text);expect((await readSession(page)).state).toEqual(state);
  104 | });
  105 | 
  106 | test('startup is read-only, keyboard Continue rebuilds no historical presentation, and recovery captures touch/focus',async({page})=>{
  107 |   await seedTwo(page);await playCommand(page,playerDecision((await readSession(page)).state));await ready(page);
  108 |   const before=await readSession(page),saved=await stored(page);
  109 |   await page.reload();await expect(page.locator('#save-continue')).toBeVisible();
  110 |   expect(await stored(page)).toEqual(saved);expect(await page.locator('#game').getAttribute('data-session')).toBeNull();
  111 |   expect(await page.evaluate(()=>window.fitDiagnostics().battleAudio)).toBeNull();
  112 |   await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toBeVisible();
  113 |   for(let i=0;i<9;i++){await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('dialog'))).toBe(true);}
  114 |   await page.screenshot({path:test.info().outputPath('continue.png')});
  115 |   await page.locator('#save-continue').focus();await page.keyboard.press('Enter');await ready(page);
```