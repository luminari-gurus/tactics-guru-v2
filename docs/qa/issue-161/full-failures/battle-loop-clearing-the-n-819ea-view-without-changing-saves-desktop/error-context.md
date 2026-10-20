# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: battle-loop.spec.ts >> clearing the native movement destination clears intent and preview without changing saves
- Location: tests/battle-loop.spec.ts:66:1

# Error details

```
Error: expect(locator).toBeEnabled() failed

Locator:  locator('#battle-review')
Expected: enabled
Received: disabled
Timeout:  5000ms

Call log:
  - Expect "toBeEnabled" locator('#battle-review') with timeout 5000ms
  - waiting for locator('#battle-review')
    14 × locator resolved to <button disabled id="battle-review">Review action</button>
       - unexpected value "disabled"

```

```yaml
- button "Review action" [disabled]
```

# Test source

```ts
  1   | import { confirmRestart } from './helpers/battlePolicy';
  2   | import { expect, test } from '@playwright/test';
  3   | import { writeFileSync } from 'node:fs';
  4   | import { previewMove, previewMovement } from '../src/domain/grid';
  5   | import { BattleSession } from '../src/app/BattleSession';
  6   | 
  7   | test('default Move initializes once per usable player turn and preserves explicit choices',async({page})=>{
  8   |   await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  9   |   const move=page.locator('#battle-move'),target=page.locator('#battle-target');
  10  |   await expect(move).toHaveAttribute('aria-pressed','true');await expect(move).toBeEnabled();
  11  |   const initial=await session(page),actor=initial.state.units.find(u=>u.id===initial.state.initiative[initial.state.activeIndex])!;
  12  |   expect(initial.replay.commands.every(c=>initial.state.units.find(u=>u.id===c.unitId)!.side==='enemy')).toBe(true);
  13  |   const saved=await page.evaluate(()=>JSON.stringify(localStorage));
  14  |   const reach=previewMovement(initial.state,actor.id,catalog);if(!reach.ok)throw Error(reach.reason);
  15  |   expect(await target.locator('option').evaluateAll(options=>options.map(o=>(o as HTMLOptionElement).value).filter(Boolean)))
  16  |     .toEqual(reach.cells.filter(c=>c.cost>0).map(c=>`${c.cell.x},${c.cell.y}`));
  17  |   const report=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
  18  |   expect(report.reachable).toEqual(reach.cells.map(c=>c.cell));expect(report.selected).toBeNull();
  19  |   await expect(target).toHaveValue('');await expect(page.locator('#battle-review')).toBeDisabled();
  20  |   expect(JSON.parse((await page.locator('#game').getAttribute('data-session'))!).pending).toBeNull();
  21  |   await page.screenshot({path:test.info().outputPath('default-move.png')});
  22  |   for(const action of ['basic','signature']){
  23  |     await page.locator(`[data-action=${action}]`).click();await target.selectOption({index:1});
  24  |     const selected=await target.inputValue(),before=await page.locator('#game').getAttribute('data-session');
  25  |     const overlays=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!).targets;
  26  |     await page.locator('#battle-party').click();await page.locator('#inspection-close').click();
  27  |     await page.locator('#battle-log-open').click();await page.locator('#log-close').click();
  28  |     const box=(await page.locator('#battle-board-region').boundingBox())!;
  29  |     await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  30  |     const viewport=page.viewportSize()!;await page.setViewportSize({width:viewport.width-1,height:viewport.height});await page.setViewportSize(viewport);
  31  |     await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  32  |     await expect(page.locator(`[data-action=${action}]`)).toHaveAttribute('aria-pressed','true');await expect(move).toHaveAttribute('aria-pressed','false');
  33  |     await expect(target).toHaveValue(selected);expect(await page.locator('#game').getAttribute('data-session')).toBe(before);
  34  |     expect(JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!).targets).toEqual(overlays);
  35  |   }
  36  |   await page.locator('#battle-scroll').evaluate(e=>{e.scrollTop=0;});
  37  |   await page.screenshot({path:test.info().outputPath('explicit-override.png')});
  38  |   expect((await session(page)).state).toEqual(initial.state);expect((await session(page)).replay).toEqual(initial.replay);
  39  |   expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(saved);
  40  |   await page.locator('#battle-cancel').click();await page.locator('#battle-party').click();await page.locator('#inspection-close').click();
  41  |   await expect(move).toHaveAttribute('aria-pressed','false');await expect(target).toBeDisabled();
  42  |   expect(JSON.parse((await page.locator('#game').getAttribute('data-session'))!).pending).toBeNull();
  43  |   // Leave an explicit action selected, then progress through actual Wait/enemy turns.
  44  |   await page.locator('[data-action=basic]').click();
  45  |   let otherActor=false,wrapped=false;
  46  |   for(let i=0;i<12 && !wrapped;i++){
  47  |     await page.locator('#battle-next').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  48  |     const current=await session(page),id=current.state.initiative[current.state.activeIndex];
  49  |     await expect(move).toHaveAttribute('aria-pressed','true');await expect(target).toHaveValue('');await expect(page.locator('#battle-review')).toBeDisabled();
  50  |     if(id!==actor.id)otherActor=true;if(id===actor.id && current.state.round>initial.state.round)wrapped=true;
  51  |   }
  52  |   expect(otherActor).toBe(true);expect(wrapped).toBe(true);
  53  |   const final=await session(page),replayed=replayBattle(final.replay,catalog);expect(replayed.ok).toBe(true);
  54  |   if(replayed.ok){expect(replayed.state).toEqual(final.state);expect(replayed.events).toEqual(final.events);}
  55  |   const playerFirstSeed=Array.from({length:20},(_,i)=>i+2).find(seed=>new BattleSession(catalog,'map:forest_ruins',seed).phase==='player');
  56  |   expect(playerFirstSeed).toBeDefined();
  57  |   for(let seed=2;seed<=playerFirstSeed!;seed++){
  58  |     await page.locator('#fit-restart').click();await confirmRestart(page);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  59  |     await expect(move).toHaveAttribute('aria-pressed','true');
  60  |   }
  61  |   const fresh=await session(page);expect(fresh.state.seed).toBe(playerFirstSeed);expect(fresh.replay.commands).toEqual([]);
  62  |   expect(fresh.replay.initial.units.find(u=>u.id===fresh.replay.initial.initiative[0])!.side).toBe('player');
  63  |   await expect(move).toHaveAttribute('aria-pressed','true');
  64  | });
  65  | 
  66  | test('clearing the native movement destination clears intent and preview without changing saves',async({page})=>{
  67  |   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  68  |   await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  69  |   const target=page.locator('#battle-target'),review=page.locator('#battle-review');
  70  |   const initial=await session(page),saved=await page.evaluate(()=>JSON.stringify(localStorage));
  71  |   await target.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');
> 72  |   await expect(review).toBeEnabled();
      |                        ^ Error: expect(locator).toBeEnabled() failed
  73  |   const pending=(await session(page)).pending;expect(pending?.type).toBe('move');
  74  |   await target.focus();await page.keyboard.press('Home');
  75  |   await expect(target).toHaveValue('');
  76  |   expect((await session(page)).pending).toBeNull();await expect(review).toBeDisabled();
  77  |   await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','true');
  78  |   await expect(page.locator('#battle-selection')).toHaveText('Select a tile');
  79  |   await expect(page.locator('#battle-preview')).toHaveText('Select a destination');
  80  |   const report=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
  81  |   expect(report.selected).toBeNull();expect(report.hover).toBeNull();
  82  |   expect((await session(page)).state).toEqual(initial.state);expect((await session(page)).replay).toEqual(initial.replay);
  83  |   expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(saved);
  84  |   await review.scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath('destination-cleared.png')});
  85  |   // A real new choice remains usable and still requires deliberate confirmation.
  86  |   await target.focus();await page.keyboard.press('ArrowDown');await expect(review).toBeEnabled();
  87  |   expect((await session(page)).pending).toEqual(pending);
  88  |   await review.click();await page.locator('#dialog-confirm').click();
  89  |   await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  90  |   expect((await session(page)).state.commandCount).toBe(initial.state.commandCount+1);
  91  |   expect(errors).toEqual([]);
  92  | });
  93  | 
  94  | for(const dismissal of ['Cancel','Escape'] as const){
  95  |   test(`movement confirmation ${dismissal} resets destination and permits native same-destination retry`,async({page})=>{
  96  |     const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  97  |     await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  98  |     const target=page.locator('#battle-target'),review=page.locator('#battle-review');
  99  |     const initial=await session(page),saved=await page.evaluate(()=>JSON.stringify(localStorage));
  100 |     await target.focus();await page.keyboard.press('Space');await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  101 |     await expect(review).toBeEnabled();
  102 |     const destination=await target.inputValue(),pending=(await session(page)).pending;
  103 |     expect(pending?.type).toBe('move');
  104 |     await review.click();await expect(page.getByRole('dialog')).toBeVisible();
  105 |     if(dismissal==='Cancel')await page.locator('#dialog-cancel').click();else await page.keyboard.press('Escape');
  106 |     await expect(page.getByRole('dialog')).not.toBeVisible();
  107 |     // Re-select using the native popup: selectOption dispatches change for unchanged values.
  108 |     await target.focus();await page.keyboard.press('Space');await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  109 |     await expect(target).toHaveValue(destination);await expect(review).toBeEnabled();
  110 |     expect((await session(page)).pending).toEqual(pending);
  111 |     expect((await session(page)).state).toEqual(initial.state);expect((await session(page)).replay).toEqual(initial.replay);
  112 |     expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(saved);
  113 |     // Dismiss a second time to inspect the cleared UI before confirming the retry.
  114 |     await review.click();if(dismissal==='Cancel')await page.locator('#dialog-cancel').click();else await page.keyboard.press('Escape');
  115 |     await expect(target).toHaveValue('');await expect(review).toBeDisabled();expect((await session(page)).pending).toBeNull();
  116 |     await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','true');
  117 |     const report=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
  118 |     expect(report.selected).toBeNull();expect(report.hover).toBeNull();
  119 |     await review.scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath('movement-cancelled.png')});
  120 |     await target.focus();await page.keyboard.press('ArrowDown');await expect(review).toBeEnabled();
  121 |     await review.click();await page.locator('#dialog-confirm').click();
  122 |     await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  123 |     const confirmed=await session(page);expect(confirmed.state.commandCount).toBe(initial.state.commandCount+1);
  124 |     expect(confirmed.replay.commands.at(-1)).toEqual(pending);expect(errors).toEqual([]);
  125 |   });
  126 | }
  127 | 
  128 | test('player HUD and preview cancellation preserve state and modal capture', async ({page})=>{
  129 |   await page.goto('/');
  130 |   await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  131 |   await expect(page.locator('#battle-portraits img:visible')).toBeVisible();
  132 |   await expect(page.locator('#battle-party')).toHaveText('Inspect party');
  133 |   await expect(page.getByRole('button',{name:'Basic attack',exact:true})).toBeVisible();
  134 |   const before = await page.locator('#game').getAttribute('data-session');
  135 |   await page.getByRole('button',{name:'Move',exact:true}).click();
  136 |   await page.locator('#battle-target').selectOption({index:1});
  137 |   await page.getByRole('button',{name:'Review action'}).click();
  138 |   await expect(page.getByRole('dialog')).toBeVisible();
  139 |   await page.keyboard.press('Escape');
  140 |   await expect(page.getByRole('dialog')).not.toBeVisible();
  141 |   const after = JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
  142 |   const initial = JSON.parse(before!);
  143 |   expect(after.state).toEqual(initial.state); expect(after.replay).toEqual(initial.replay);
  144 |   // WebKit pointer activation leaves focus on the usable scroll region. Other
  145 |   // browsers focus Review and need the Restart fallback after it is disabled.
  146 |   await expect(page.locator('#fit-restart:focus, #battle-scroll:focus')).toHaveCount(1);
  147 |   // Keyboard activation makes Review the invoker on every browser, so Cancel
  148 |   // must use the fallback rather than leave focus on the now-disabled button.
  149 |   await page.locator('#battle-target').selectOption({index:1});
  150 |   await page.getByRole('button',{name:'Review action'}).focus();
  151 |   await page.keyboard.press('Enter');
  152 |   await page.locator('#dialog-cancel').click();
  153 |   await expect(page.locator('#fit-restart')).toBeFocused();
  154 |   const cancelled=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
  155 |   expect(cancelled.state).toEqual(initial.state);expect(cancelled.replay).toEqual(initial.replay);
  156 | });
  157 | 
  158 | import { playerDecision, session, readSession, playCommand } from './helpers/battlePolicy';
  159 | import { battleCatalog as catalog } from '../src/content/catalog';
  160 | import { replayBattle } from '../src/domain/turns';
  161 | import type { Command } from '../src/domain/types';
  162 | 
  163 | for(const [seed,outcome] of [[1,'playerLoss'],[2,'playerWin']] as const){
  164 |   test(`complete legal authored battle seed ${seed} reaches ${outcome} through controls and replays`,async({page})=>{
  165 |     test.setTimeout(180000);const errors:string[]=[];
  166 |     page.on('pageerror',e=>errors.push(e.message));
  167 |     await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  168 |     if(seed===2){await page.getByRole('button',{name:'Restart battle',exact:true}).click();await confirmRestart(page);await expect.poll(async()=> (await session(page)).state.seed).toBe(2);}
  169 |     await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  170 |     const boardObjects=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!).objectCount;
  171 |     for(let i=0;i<200;i++){
  172 |       await expect.poll(async()=> (await session(page)).phase,{timeout:10000}).toMatch(/^(player|ended|error)$/);
```