import {expect,test,type Page} from './helpers/forceRailControls';
import { readSession, playCommand, tapBoard, boardPoint, settledReport } from './helpers/battlePolicy';
import { abilityCatalog } from './helpers/abilityCatalog';
import { progressHero, projectProgression } from '../src/domain/progression';
import { HERO_IDS } from '../src/content/constants';
import { previewMovement } from '../src/domain/grid';
import { COMBAT_CONTROLS_KEY } from '../src/ui/combatControls';

async function abilityReady(page:Page,url:string) {
  await page.goto(url);
  await expect(page.locator('#game')).toHaveAttribute('data-ready','true');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  await settledReport(page);
}

const abilityButton=(page:Page,id:string)=>page.locator(`[data-action="${id}"]`);
const learnedControls={
  fighter:[['guarded_strike','Guarded Strike'],['second_wind','Second Wind'],['taunt','Taunt']],
  ranger:[['high_shot','High Shot'],['mark_target','Mark Target'],['pinning_shot','Pinning Shot']],
  mage:[['frost_snare','Frost Snare'],['magic_missile','Magic Missile']],
} as const;

test('review356 radial Tab review matches the ability actually confirmed',async({page})=>{
  await page.addInitScript(()=>{(globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls='radial';});
  await abilityReady(page,'/tests/fixtures/abilities/index.html?hero=mage&xp=180&real');
  await page.locator('canvas').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await page.keyboard.press('1');
  await expect(page.locator('[data-radial-ability="ability:frost_snare"]')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-radial-ability="ability:magic_missile"]')).toBeFocused();
  const shown=await page.locator('#battle-preview').innerText();
  await page.screenshot({path:test.info().outputPath('radial-review-before-confirm.png')});
  await page.keyboard.press('c');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const accepted=await readSession(page);
  expect(accepted.events.some(event=>event.type==='abilityUsed'&&event.abilityId==='ability:magic_missile')).toBe(true);
  await test.info().attach('radial-review',{body:JSON.stringify({shown,events:accepted.events}),contentType:'application/json'});
  expect(shown).toContain('Magic Missile');
  expect(shown).toContain('force damage');
});

test('review356 radial ability shortcuts cannot cast before choosing a planned destination',async({page})=>{
  await page.addInitScript(()=>{(globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls='radial';});
  await abilityReady(page,'/tests/fixtures/abilities/index.html?hero=fighter&xp=180&real&injured');
  const before=await readSession(page);
  await tapBoard(page,{x:0,y:0});await page.locator('#battle-radial-plan').click();
  await page.locator('canvas').focus();await page.keyboard.press('2');await page.keyboard.press('c');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const after=await readSession(page);
  await test.info().attach('plan-shortcut',{body:JSON.stringify({before:before.state,after:after.state,events:after.events}),contentType:'application/json'});
  expect(after.state).toEqual(before.state);
});

test('review356 radial pointer aiming and native Enter share the full review',async({page})=>{
  await page.addInitScript(()=>{(globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls='radial';});
  await abilityReady(page,'/tests/fixtures/abilities/index.html?hero=mage&xp=180&real');
  await tapBoard(page,{x:1,y:0});
  await page.locator('#battle-radial-special').hover();
  const shown=await page.locator('#battle-preview').innerText();
  await page.keyboard.press('Enter');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const accepted=await readSession(page);
  await test.info().attach('mixed-input',{body:JSON.stringify({shown,events:accepted.events}),contentType:'application/json'});
  expect(accepted.events.some(event=>event.type==='abilityUsed'&&event.abilityId==='ability:magic_missile')).toBe(true);
  expect(shown).toContain('force damage');
});

test('review356 held radial aim keeps the full review aligned with release',async({page})=>{
  await page.addInitScript(()=>{(globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls='radial';});
  await abilityReady(page,'/tests/fixtures/abilities/index.html?hero=mage&xp=180&real');
  const point=await boardPoint(page,{x:1,y:0});await page.mouse.move(point.x,point.y);await page.mouse.down();
  await expect(page.locator('#battle-radial')).toBeVisible();
  const box=(await page.locator('#battle-radial-special').boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  const shown=await page.locator('#battle-preview').innerText();
  await page.mouse.up();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const accepted=await readSession(page);
  await test.info().attach('held-review',{body:JSON.stringify({shown,events:accepted.events}),contentType:'application/json'});
  expect(accepted.events.some(event=>event.type==='abilityUsed'&&event.abilityId==='ability:magic_missile')).toBe(true);
  expect(shown).toContain('force damage');
});

test('review356 radial shortcuts use the moved cursor after switching from rail',async({page})=>{
  await abilityReady(page,'/tests/fixtures/abilities/index.html?hero=mage');
  const before=await readSession(page),actor=before.state.units.find(u=>u.id===before.state.initiative[before.state.activeIndex])!;
  const cells=await page.locator('#battle-target option').evaluateAll(options=>options
    .filter(option=>!(option as HTMLOptionElement).disabled&&(option as HTMLOptionElement).value)
    .map(option=>{const [x,y]=(option as HTMLOptionElement).value.split(',').map(Number);return{x,y};}));
  const old=cells.find(c=>cells.some(n=>Math.abs(n.x-c.x)+Math.abs(n.y-c.y)===1))!;
  const next=cells.find(n=>Math.abs(n.x-old.x)+Math.abs(n.y-old.y)===1)!;
  await page.locator('#battle-target').selectOption(`${old.x},${old.y}`);
  await page.evaluate(()=>{delete (globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls;});
  await page.locator('#battle-overflow summary').click();await page.getByRole('radio',{name:'Radial',exact:true}).check();
  await expect(page.locator('body')).toHaveAttribute('data-combat-skin','radial');
  await page.locator('canvas').focus();
  await page.keyboard.press(next.x!==old.x?(next.x>old.x?'ArrowRight':'ArrowLeft'):(next.y>old.y?'ArrowDown':'ArrowUp'));
  await page.keyboard.press('m');await page.keyboard.press('c');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const after=await readSession(page),actual=after.state.units.find(u=>u.id===actor.id)!.cell;
  await test.info().attach('cursor-shortcut',{body:JSON.stringify({old,next,actual}),contentType:'application/json'});
  expect(actual).toEqual(next);
});

test('review356 self-heal plan has a complete review before confirmation',async({page})=>{
  await page.addInitScript(()=>{(globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls='radial';});
  await abilityReady(page,'/tests/fixtures/abilities/index.html?hero=fighter&xp=180&real&injured');
  const before=await readSession(page);
  await tapBoard(page,{x:0,y:0});await page.locator('#battle-radial-plan').click();
  const value=await page.locator('#battle-target option').nth(1).getAttribute('value');
  const [x,y]=value!.split(',').map(Number);await tapBoard(page,{x,y});
  await page.keyboard.press('2');const shown=await page.locator('#battle-preview').innerText();
  const chipLabel=await page.locator('[data-radial-ability="ability:second_wind"]').getAttribute('aria-label');
  await page.screenshot({path:test.info().outputPath('self-plan-before-confirm.png')});
  await page.keyboard.press('c');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const after=await readSession(page);expect(after.state.commandCount).toBe(before.state.commandCount+2);
  expect(after.events.some(event=>event.type==='healed')).toBe(true);
  await test.info().attach('self-plan-review',{body:JSON.stringify({shown,events:after.events}),contentType:'application/json'});
  expect(shown).toContain(`Move to (${x}, ${y})`);expect(shown).toContain('Heal');
  expect(chipLabel).not.toContain('Choose a target');expect(chipLabel).toContain('Heal');
});

for(const mode of ['tap','plan','hold'] as const)test(`review356 friendly radial ${mode} requires review before damage`,async({page,isMobile})=>{
  await page.addInitScript(()=>{(globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls='radial';});
  await abilityReady(page,'/tests/fixtures/abilities/index.html?hero=mage&xp=180&real');
  const before=await readSession(page),fighter=before.state.units.find(u=>u.defId==='fighter')!;
  const activate=async(selector:string)=>isMobile?page.locator(selector).tap():page.locator(selector).click();
  for(const accept of [false,true]){
    await settledReport(page);
    if(mode==='plan'){
      await tapBoard(page,{x:0,y:0});await activate('#battle-radial-plan');
      await page.locator('canvas').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
      await page.keyboard.press('2');await page.keyboard.press('c');
      await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowUp');
      await page.keyboard.press('Enter');
    }else if(mode==='hold'){
      const point=await boardPoint(page,fighter.cell);await page.mouse.move(point.x,point.y);await page.mouse.down();
      await expect(page.locator('#battle-radial')).toBeVisible();const box=(await page.locator('#battle-radial-special').boundingBox())!;
      await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.up();
    }else{
      await tapBoard(page,fighter.cell);await activate('#battle-radial-special');
    }
    await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    const requested=await readSession(page);
    await test.info().attach('friendly-activation',{body:JSON.stringify({mode,requested:requested.state,before:before.state}),contentType:'application/json'});
    expect(requested.state).toEqual(before.state);
    await expect(page.getByRole('dialog')).toHaveAccessibleName('Friendly fire?');
    await expect(page.locator('#battle-dialog-message')).toContainText('Friendly fire');
    if(accept){
      await activate('#battle-friendly-confirm');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
      const after=await readSession(page);expect(after.state.commandCount).toBe(before.state.commandCount+(mode==='plan'?2:1));
      expect(after.state.units.find(u=>u.id===fighter.id)!.hp).toBeLessThan(fighter.hp);
    }else{
      await page.keyboard.press('Escape');expect((await readSession(page)).state).toEqual(before.state);
    }
  }
});

test('review356 radial review preserves the shared friendly-fire warning',async({page})=>{
  await page.addInitScript(()=>{(globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls='radial';});
  await abilityReady(page,'/tests/fixtures/abilities/index.html?hero=mage&xp=180&real');
  const before=await readSession(page),fighter=before.state.units.find(u=>u.defId==='fighter')!;
  await page.locator('canvas').focus();for(let i=0;i<4;i++)await page.keyboard.press('ArrowRight');
  await page.keyboard.press('2');await expect(page.locator('[data-radial-ability="ability:magic_missile"]')).toBeFocused();
  const shown=await page.locator('#battle-preview').innerText();
  await page.screenshot({path:test.info().outputPath('friendly-review-before-confirm.png')});
  await page.keyboard.press('c');await expect(page.getByRole('dialog')).toHaveAccessibleName('Friendly fire?');
  expect((await readSession(page)).state).toEqual(before.state);
  await page.locator('#battle-friendly-confirm').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const after=await readSession(page);expect(after.state.units.find(u=>u.id===fighter.id)!.hp).toBeLessThan(fighter.hp);
  await test.info().attach('friendly-review',{body:JSON.stringify({shown,events:after.events}),contentType:'application/json'});
  expect(shown).toContain('Friendly fire');expect(shown).toContain('fighter');
});

test('review356 friendly confirmation rejects a replacement prepared command',async({page})=>{
  await page.addInitScript(()=>{(globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls='radial';});
  await abilityReady(page,'/tests/fixtures/abilities/index.html?hero=mage');
  const before=await readSession(page);
  await page.locator('canvas').focus();for(let i=0;i<4;i++)await page.keyboard.press('ArrowRight');
  await page.keyboard.press('2');await page.keyboard.press('c');
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Friendly fire?');
  // Model a late native control change after the modal captured its reviewed intent.
  await page.locator('#battle-ability').evaluate(select=>{(select as HTMLSelectElement).value='ability:magic_missile';select.dispatchEvent(new Event('change',{bubbles:true}));});
  expect((await readSession(page)).pending).toMatchObject({abilityId:'ability:magic_missile'});
  await page.locator('#battle-friendly-confirm').click();
  expect((await readSession(page)).state).toEqual(before.state);
});

for(const hero of ['fighter','ranger','mage'] as const)test(`direct ability controls expose ${hero} learned actions without committing`,async({page,hasTouch})=>{
  const expected=learnedControls[hero].map(([id])=>`ability:${id}`);
  await abilityReady(page,`/tests/fixtures/abilities/index.html?hero=${hero}&xp=180&real&injured`);
  const before=await readSession(page),picker=page.locator('#battle-ability');
  expect(await picker.locator('option').evaluateAll(options=>options.map(option=>(option as HTMLOptionElement).value))).toEqual(expected);
  const direct=page.locator('.battle-actions [data-action^="ability:"]');
  expect(await direct.evaluateAll(buttons=>buttons.map(button=>(button as HTMLElement).dataset.action))).toEqual(expected);
  await expect(page.locator('[data-action="signature"]')).toHaveCount(0);
  const nodes=await direct.elementHandles();
  const saves=await page.evaluate(()=>JSON.stringify(localStorage));
  for(const [index,ability] of expected.entries()){
    const button=abilityButton(page,ability),name=learnedControls[hero][index][1];
    await expect(page.getByRole('button',{name,exact:true})).toHaveCount(1);
    await expect(button).toBeVisible();await expect(button).toBeEnabled();
    if(hasTouch)await button.tap();else {await button.focus();await page.keyboard.press('Space');await expect(button).toBeFocused();}
    await expect(picker).toHaveValue(ability);await expect(button).toHaveAttribute('aria-pressed','true');
    expect((await readSession(page)).state).toEqual(before.state);
    expect(await button.evaluate((node,original)=>node===original,nodes[index])).toBe(true);
  }
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(saves);
});

for(const hero of ['fighter','ranger','mage'] as const)test(`keyboard-only shortcuts select ${hero} learned abilities and preserve resource locks`,async({page})=>{
  const expected=learnedControls[hero].map(([id])=>`ability:${id}`);
  await abilityReady(page,`/tests/fixtures/abilities/index.html?hero=${hero}&xp=180&real&injured`);
  const before=await readSession(page),picker=page.locator('#battle-ability'),canvas=page.locator('canvas');
  const saves=await page.evaluate(()=>JSON.stringify(localStorage));
  for(const [index,ability] of expected.entries()){
    await canvas.focus();await page.keyboard.press(String(index+1));
    await expect(picker).toHaveValue(ability);
    await expect(abilityButton(page,ability)).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('#battle-shortcuts ol')).toContainText(`${index+1}:`);
    expect((await readSession(page)).state).toEqual(before.state);
  }
  await page.keyboard.press('9');await expect(picker).toHaveValue(expected.at(-1)!);
  await page.keyboard.press('Escape');await page.keyboard.press('s');
  await expect(abilityButton(page,expected.at(-1)!)).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(saves);
  const ability=hero==='fighter'?'ability:second_wind':hero==='ranger'?'ability:mark_target':'ability:frost_snare';
  const index=expected.indexOf(ability);
  await canvas.focus();await page.keyboard.press(String(index+1));
  await page.locator('#battle-target').selectOption(hero==='fighter'?'0,0':'2,0');
  expect((await readSession(page)).state).toEqual(before.state);
  await canvas.focus();await page.keyboard.press('c');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const accepted=await readSession(page);
  expect(accepted.state.commandCount).toBe(before.state.commandCount+1);
  expect(accepted.events.some(event=>event.type==='abilityUsed'&&event.abilityId===ability)).toBe(true);
  await page.keyboard.press(String(index+1));await page.keyboard.press('s');await page.keyboard.press('c');
  expect((await readSession(page)).state).toEqual(accepted.state);
});

for(const hero of ['fighter','ranger','mage'] as const)test(`keyboard-only shortcuts reject ${hero} unlearned abilities at level one`,async({page})=>{
  await abilityReady(page,`/tests/fixtures/abilities/index.html?hero=${hero}&xp=0&real`);
  const picker=page.locator('#battle-ability'),direct=page.locator('.battle-actions [data-action^="ability:"]'),canvas=page.locator('canvas');
  await expect(picker.locator('option')).toHaveCount(1);
  await expect(direct).toHaveCount(1);
  const locked=await readSession(page);
  await canvas.focus();await page.keyboard.press('2');await page.keyboard.press('c');
  expect((await readSession(page)).state).toEqual(locked.state);
});

test('direct ability controls fit the desktop rail and compact touch layouts',async({page,hasTouch})=>{
  test.setTimeout(90000);
  const landscape=page.viewportSize()!.width>page.viewportSize()!.height;
  const measurements=[];
  for(const hero of ['fighter','ranger'] as const){
    await abilityReady(page,`/tests/fixtures/abilities/index.html?hero=${hero}&xp=180&real&injured`);
    if(!hasTouch){
      // Remove the file's compatibility override to exercise actual Auto on a
      // fine pointer, not merely another explicitly forced desktop Rail run.
      await page.evaluate(key=>{
        delete (globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls;
        localStorage.removeItem(key);globalThis.dispatchEvent(new Event('combat-controls-change'));
      },COMBAT_CONTROLS_KEY);
      expect(await page.evaluate(()=>matchMedia('(pointer: coarse)').matches)).toBe(false);
      expect(await page.evaluate(key=>localStorage.getItem(key),COMBAT_CONTROLS_KEY)).toBeNull();
    }
    await expect(page.locator('body')).toHaveAttribute('data-combat-skin','rail');
    const before=await readSession(page);
    const sizes=hasTouch?[landscape?[568,320]:[320,568]]:hero==='fighter'
      ?[[1280,720],[1024,768],[800,600],[1024,500]]:[[1280,720]];
    for(const [width,height] of sizes){
      await page.setViewportSize({width,height});await settledReport(page);
      const actions=page.locator('.battle-actions button:not([hidden])');
      await expect(actions).toHaveCount(6);
      expect(await actions.evaluateAll(buttons=>buttons.map(button=>(button as HTMLElement).dataset.action??button.id)))
        .toEqual(['move','basic',...learnedControls[hero].map(([id])=>`ability:${id}`),'battle-next']);
      const layout=await actions.evaluateAll(buttons=>{
        const scroll=document.querySelector('#battle-scroll')!;
        const board=document.querySelector('#battlefield')!.getBoundingClientRect();
        const panel=document.querySelector('#fit-panel')!.getBoundingClientRect();
        const controls=buttons.map(button=>{
          button.scrollIntoView({block:'nearest'});
          const bounds=button.getBoundingClientRect(),visible=scroll.getBoundingClientRect();
          const label=button.querySelector('strong')!,range=document.createRange();range.selectNodeContents(label);
          return {name:button.getAttribute('aria-label'),width:bounds.width,height:bounds.height,
            inViewport:bounds.left>=0&&bounds.right<=innerWidth,
            reachable:bounds.top>=visible.top&&bounds.bottom<=visible.bottom,
            labelFits:[...range.getClientRects()].every(r=>r.left>=bounds.left&&r.right<=bounds.right&&r.top>=bounds.top&&r.bottom<=bounds.bottom)};
        });
        return {columns:getComputedStyle(document.querySelector('.battle-actions')!).gridTemplateColumns.split(' ').length,
          overflow:document.documentElement.scrollWidth>innerWidth,
          separate:board.right<=panel.left||board.bottom<=panel.top,controls};
      });
      expect(layout.columns).toBe(2);expect(layout.overflow).toBe(false);expect(layout.separate).toBe(true);
      for(const control of layout.controls){
        expect(control.width,control.name!).toBeGreaterThanOrEqual(44);expect(control.height,control.name!).toBeGreaterThanOrEqual(66);
        expect(control.inViewport,control.name!).toBe(true);expect(control.reachable,control.name!).toBe(true);expect(control.labelFits,control.name!).toBe(true);
      }
      const ability=hero==='fighter'?'ability:second_wind':'ability:mark_target',button=abilityButton(page,ability);
      await button.scrollIntoViewIfNeeded();await button.focus();
      const scroll=await page.locator('#battle-scroll').evaluate(node=>node.scrollTop);
      if(hasTouch)await button.tap();else await page.keyboard.press('Space');
      await expect(page.locator('#battle-ability')).toHaveValue(ability);
      await expect(button).toHaveAttribute('aria-pressed','true');
      if(!hasTouch)await expect(button).toBeFocused();
      expect(await page.locator('#battle-scroll').evaluate(node=>node.scrollTop)).toBe(scroll);
      expect((await readSession(page)).state).toEqual(before.state);
      await page.locator('#battle-target').selectOption(hero==='fighter'?'0,0':'2,0');
      await expect(page.locator('#battle-review')).toBeEnabled();
      await page.locator('#battle-party').focus();
      if(hasTouch)await page.locator('#battle-party').tap();else await page.locator('#battle-party').click();
      await page.locator('#inspection-close').click();
      await expect(page.locator('#battle-party')).toBeFocused();await expect(page.locator('#battle-review')).toBeEnabled();
      await page.locator('#battle-cancel').click();expect((await readSession(page)).state).toEqual(before.state);
      await expect(page.locator('#battle-move')).toBeFocused();
      await page.locator('#battle-scroll').evaluate(node=>node.scrollTop=0);
      await page.screenshot({path:test.info().outputPath(`direct-${hero}-${width}x${height}.png`)});
      measurements.push({hero,width,height,hasTouch,...layout});
    }
  }
  await test.info().attach('direct-ability-layouts',{body:JSON.stringify(measurements,null,2),contentType:'application/json'});
});

test('direct ability controls stay hidden across radial turns and restore with the rail',async({page,hasTouch})=>{
  test.setTimeout(90000);
  const activate=async(selector:string)=>hasTouch?page.locator(selector).tap():page.locator(selector).click();
  for(const hero of ['fighter','ranger'] as const){
    await abilityReady(page,`/tests/fixtures/abilities/index.html?hero=${hero}&xp=180&real&injured`);
    const before=await readSession(page),actor=before.state.initiative[before.state.activeIndex];
    await page.evaluate(()=>{delete (globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls;});
    await page.locator('#battle-overflow summary').click();await page.getByRole('radio',{name:hasTouch?'Auto':'Radial',exact:true}).check();
    await expect(page.locator('body')).toHaveAttribute('data-combat-skin','radial');await settledReport(page);
    const direct=page.locator('.battle-actions [data-action^="ability:"]');
    expect(await direct.count()).toBeGreaterThan(0);
    for(const button of await direct.all())await expect(button).toBeHidden();
    await tapBoard(page,hero==='fighter'?{x:0,y:0}:{x:2,y:0});
    const special=page.locator('#battle-radial-special');await expect(special).toBeEnabled();
    if(hero==='fighter'){
      await expect(special).toContainText('Second Wind');
    }else{
      await activate('#battle-radial-special');
      await expect(page.locator('[data-radial-ability="ability:mark_target"]')).toBeVisible();
      await expect(page.locator('[data-radial-ability="ability:mark_target"]')).toHaveAccessibleName(/Mark Target/);
    }
    expect((await readSession(page)).state).toEqual(before.state);
    await page.screenshot({path:test.info().outputPath(`radial-named-${hero}.png`)});
    await activate(hero==='fighter'?'#battle-radial-special':'[data-radial-ability="ability:mark_target"]');
    await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    const accepted=await readSession(page);
    expect(accepted.state.commandCount).toBe(before.state.commandCount+1);
    expect(accepted.events.some(event=>event.type==='abilityUsed'&&event.abilityId===`ability:${hero==='fighter'?'second_wind':'mark_target'}`)).toBe(true);
    await activate('#battle-next');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    const next=await readSession(page);expect(next.state.initiative[next.state.activeIndex]).not.toBe(actor);
    // A different actor creates a different button set after applySkin ran.
    const ids=await page.locator('#battle-ability option').evaluateAll(options=>options.map(option=>(option as HTMLOptionElement).value));
    expect(await direct.evaluateAll(buttons=>buttons.map(button=>(button as HTMLElement).dataset.action))).toEqual(ids);
    for(const button of await direct.all())await expect(button).toBeHidden();
    if(await page.locator('#battle-overflow').getAttribute('open')===null)await activate('#battle-overflow summary');
    await page.getByRole('radio',{name:'Rail',exact:true}).check();
    await expect(page.locator('body')).toHaveAttribute('data-combat-skin','rail');
    for(const button of await direct.all())await expect(button).toBeVisible();
    const button=abilityButton(page,ids[0]);await button.click();
    await expect(page.locator('#battle-ability')).toHaveValue(ids[0]);await expect(button).toHaveAttribute('aria-pressed','true');
    expect((await readSession(page)).state).toEqual(next.state);
  }
});

test('keyboard-only shortcuts use canonical radial ability numbers without casting unavailable alternatives',async({page})=>{
  await page.addInitScript(()=>{(globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls='radial';});
  await abilityReady(page,'/tests/fixtures/abilities/index.html?hero=mage&xp=180&real');
  const before=await readSession(page),canvas=page.locator('canvas');
  await canvas.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
  await page.keyboard.press('1');
  const snare=page.locator('[data-radial-ability="ability:frost_snare"]');
  await expect(snare).toBeFocused();await expect(snare).toHaveAttribute('aria-keyshortcuts','1');
  await expect(page.locator('#battle-radial-hub')).toContainText('Frost Snare');
  await expect(page.locator('#battle-preview')).toContainText('Snared');
  await expect(page.locator('#battle-preview')).toContainText('no damage or roll');
  expect((await readSession(page)).state).toEqual(before.state);
  await page.keyboard.press('2');
  await expect(page.locator('[data-radial-ability="ability:magic_missile"]')).toBeFocused();
  expect((await readSession(page)).state).toEqual(before.state);
  await page.keyboard.press('1');await page.keyboard.press('c');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const accepted=await readSession(page);expect(accepted.state.commandCount).toBe(before.state.commandCount+1);
  expect(accepted.events.some(event=>event.type==='abilityUsed'&&event.abilityId==='ability:frost_snare')).toBe(true);
  await page.keyboard.press('1');await page.keyboard.press('2');await page.keyboard.press('c');
  expect((await readSession(page)).state).toEqual(accepted.state);
});

test('keyboard-only shortcuts keep radial S aligned with the offered Special and A with Basic attack',async({page})=>{
  await page.addInitScript(()=>{(globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls='radial';});
  await abilityReady(page,'/tests/fixtures/abilities/index.html?hero=mage&xp=180&real');
  const canvas=page.locator('canvas');
  // At range one Frost Snare is unavailable, but Magic Missile keeps key 2.
  const fresh=await readSession(page);await canvas.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('1');
  await expect(page.locator('#battle-radial')).toBeHidden();expect((await readSession(page)).state).toEqual(fresh.state);
  await page.keyboard.press('s');await expect(page.locator('[data-radial-ability="ability:magic_missile"]')).toBeFocused();
  await expect(page.locator('#battle-preview')).toContainText('force damage');
  expect((await readSession(page)).state).toEqual(fresh.state);
  await page.keyboard.press('Escape');
  await page.keyboard.press('2');await expect(page.locator('[data-radial-ability="ability:magic_missile"]')).toBeFocused();
  await page.keyboard.press('Escape');expect((await readSession(page)).state).toEqual(fresh.state);
  await page.keyboard.press('a');await expect(page.locator('#battle-radial-attack')).toBeFocused();
  await expect(page.locator('#battle-preview')).toContainText('Hit');
  expect((await readSession(page)).state).toEqual(fresh.state);
  await page.keyboard.press('c');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  expect((await readSession(page)).state.commandCount).toBe(fresh.state.commandCount+1);
});

test('Mage real learned picker consolidates Arc Bolt and gates Frost Snare at level three',async({page})=>{
  for(const [xp,count] of [[0,0],[60,0],[180,1]]) {
    await abilityReady(page,`/tests/fixtures/abilities/index.html?hero=mage&xp=${xp}&real`);
    await expect(page.locator('#battle-ability option[value="ability:magic_missile"]')).toHaveCount(1);
    await expect(page.locator('#battle-ability option[value="ability:frost_snare"]')).toHaveCount(count);
    await expect(page.locator('#battle-ability option')).toHaveCount(count+1);
    await expect(page.locator('#battle-ability-info')).toContainText('Arc Bolt consolidated into Magic Missile (level 1); Frost Snare unlocks at level 3');
  }
});

test('Mage real Frost Snare preserves keyboard touch previews cancellation inspection and fresh reload without attack audio',async({page,isMobile})=>{
  test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await abilityReady(page,'/tests/fixtures/abilities/index.html?hero=mage&xp=180&real');
  const picker=page.locator('#battle-ability'),button=abilityButton(page,'ability:frost_snare'),before=await readSession(page);
  if(isMobile)await page.locator('#battle-sound').tap();else{await page.locator('#battle-sound').focus();await page.keyboard.press('Enter');}
  await expect.poll(()=>page.evaluate(()=>window.fitDiagnostics().battleAudio)).toMatchObject({enabled:true,status:'ready',started:0});
  const storage=await page.evaluate(()=>JSON.stringify(localStorage));
  await picker.selectOption('ability:frost_snare');if(isMobile)await button.tap();else{await button.focus();await page.keyboard.press('Enter');}
  await page.locator('#battle-target').selectOption('2,0');await expect(page.locator('#battle-preview')).toContainText('Snared by Mage #3');await expect(page.locator('#battle-preview')).toContainText('no damage or roll');
  const pending=(await readSession(page)).pending;expect(pending).toMatchObject({abilityId:'ability:frost_snare'});
  const viewport=page.viewportSize()!;await page.setViewportSize({width:320,height:568});await expect(picker).toHaveValue('ability:frost_snare');expect((await readSession(page)).pending).toEqual(pending);
  await page.locator('#battle-review').scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath('mage-snare-narrow-preview.png')});
  expect((await readSession(page)).state).toEqual(before.state);expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(storage);
  await page.setViewportSize(viewport);await page.keyboard.press('Escape');expect((await readSession(page)).pending).toBeNull();
  if(isMobile)await button.tap();else await button.click();await page.locator('#battle-target').selectOption('2,0');
  if(isMobile)await page.locator('#battle-review').tap();else{await page.locator('#battle-review').focus();await page.keyboard.press('Enter');}
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');const accepted=await readSession(page);
  expect(accepted.state.units.find(u=>u.id===5)?.movementBlock).toEqual({sourceId:3,abilityId:'ability:frost_snare'});expect(accepted.state.rng).toEqual(before.state.rng);expect(accepted.state.units.map(u=>u.hp)).toEqual(before.state.units.map(u=>u.hp));
  expect(accepted.state.commandCount).toBe(before.state.commandCount+1);await expect(picker).toBeDisabled();
  expect(await page.evaluate(()=>window.fitDiagnostics().battleAudio)).toMatchObject({enabled:true,status:'ready',started:0,completed:0,dropped:0,active:null,recent:[],ownedSounds:0});
  await page.locator('#battle-party').click();await page.locator('#inspect-unit-5').click();await expect(page.getByRole('dialog')).toContainText('Snared by Mage #3');await expect(page.getByRole('dialog')).toContainText('expires after this unit’s next turn ends or source/target defeat');
  await page.screenshot({path:test.info().outputPath('mage-snare-inspection.png')});await page.locator('#inspection-close').click();
  await page.locator('#battle-log-open').click();await expect(page.getByRole('dialog')).toContainText('Snared by Mage');await page.locator('#log-close').click();
  await page.reload();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');const fresh=await readSession(page);expect(fresh.state).toEqual(before.state);expect(fresh.events).toEqual([]);expect(fresh.pending).toBeNull();expect(errors).toEqual([]);
});

test('Ranger learned actions follow level one, two and three through the real picker',async({page})=>{
  for(const [xp,mark,pin] of [[0,0,0],[60,1,0],[180,1,1]]) {
    await abilityReady(page,`/tests/fixtures/abilities/index.html?hero=ranger&xp=${xp}`);
    await expect(page.locator('#battle-ability option[value="ability:high_shot"]')).toHaveCount(1);
    await expect(page.locator('#battle-ability option[value="ability:mark_target"]')).toHaveCount(mark);
    await expect(page.locator('#battle-ability option[value="ability:pinning_shot"]')).toHaveCount(pin);
    await expect(page.locator('#battle-ability-info')).toContainText('Mark Target unlocks at level 2; Pinning Shot at level 3');
  }
});

for(const ability of ['mark_target','pinning_shot'] as const)test(`Ranger ${ability} preserves keyboard touch preview cancellation inspection and fresh reload`,async({page,isMobile})=>{
  test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await abilityReady(page,'/tests/fixtures/abilities/index.html?hero=ranger&xp=180');
  const abilityId=`ability:${ability}`,picker=page.locator('#battle-ability'),button=abilityButton(page,abilityId);
  const before=await readSession(page),storage=await page.evaluate(()=>JSON.stringify(localStorage));
  // Exercise no-roll controls with a real unlocked backend, so muted audio cannot
  // hide an accidental attack/magic cue in the presentation path.
  if(isMobile)await page.locator('#battle-sound').tap();else {await page.locator('#battle-sound').focus();await page.keyboard.press('Enter');}
  await expect.poll(()=>page.evaluate(()=>window.fitDiagnostics().battleAudio)).toMatchObject({enabled:true,status:'ready',started:0});
  expect((await readSession(page)).state).toEqual(before.state);
  await picker.selectOption(abilityId);await expect(picker).toHaveValue(abilityId);await picker.focus();
  if(isMobile)await button.tap();else await button.click();
  await page.locator('#battle-target').selectOption('2,0');
  await expect(page.locator('#battle-preview')).toContainText('no damage or roll');
  await expect(page.locator('#battle-preview')).not.toContainText('Taunt');
  const pending=(await readSession(page)).pending;expect(pending).toMatchObject({abilityId});
  const viewport=page.viewportSize()!;await page.setViewportSize({width:320,height:568});
  await expect(picker).toHaveValue(abilityId);expect((await readSession(page)).pending).toEqual(pending);
  expect((await readSession(page)).state).toEqual(before.state);expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(storage);
  await page.locator('#battle-review').scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath(`${ability}-narrow-preview.png`)});
  await page.setViewportSize(viewport);await page.keyboard.press('Escape');expect((await readSession(page)).pending).toBeNull();
  expect((await readSession(page)).state).toEqual(before.state);
  if(isMobile)await button.tap();else await button.click();await page.locator('#battle-target').selectOption('2,0');
  if(isMobile)await page.locator('#battle-review').tap();else {await page.locator('#battle-review').focus();await page.keyboard.press('Enter');}
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const accepted=await readSession(page),target=accepted.state.units.find(u=>u.id===5)!;
  expect(await page.evaluate(()=>window.fitDiagnostics().battleAudio)).toMatchObject({enabled:true,status:'ready',started:0,completed:0,dropped:0,active:null,recent:[],ownedSounds:0});
  if(ability==='mark_target')expect(target.markedBy).toBe(2);
  else expect(target.movementBlock).toEqual({sourceId:2,abilityId:'ability:pinning_shot'});
  expect(accepted.state.rng).toEqual(before.state.rng);
  expect(accepted.state.units.map(u=>u.hp)).toEqual(before.state.units.map(u=>u.hp));
  expect(accepted.state.commandCount).toBe(before.state.commandCount+1);await expect(picker).toBeDisabled();
  await page.locator('#battle-party').click();await page.locator('#inspect-unit-5').click();
  await expect(page.getByRole('dialog')).toContainText(ability==='mark_target'?'Marked by Ranger #2':'Pinned by Ranger #2');
  await page.screenshot({path:test.info().outputPath(`${ability}-inspection.png`)});await page.locator('#inspection-close').click();
  await page.locator('#battle-log-open').click();await expect(page.getByRole('dialog')).toContainText(ability==='mark_target'?'marked by Ranger':'Pinned by Ranger');await page.locator('#log-close').click();
  await page.reload();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const fresh=await readSession(page);expect(fresh.state).toEqual(before.state);expect(fresh.events).toEqual([]);expect(fresh.pending).toBeNull();
  expect(errors).toEqual([]);
});

test('Fighter healing and Taunt preserve keyboard touch cancellation inspection and fresh reload',async({page,isMobile})=>{
  test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await abilityReady(page,'/tests/fixtures/abilities/index.html?hero=fighter&xp=180');
  const full=await readSession(page),fullHeal=abilityButton(page,'ability:second_wind');
  await expect(fullHeal).toBeVisible();await expect(fullHeal).toBeDisabled();await expect(fullHeal).toHaveAccessibleName('Second Wind');await expect(fullHeal).toContainText('Full health');
  await abilityButton(page,'ability:guarded_strike').click();await page.locator('#battle-target').selectOption('1,0');await expect(page.locator('#battle-review')).toBeEnabled();
  // An unavailable numeric selection must clear the previous legal attack,
  // rather than leaving that old attack armed behind the disabled heal button.
  await page.locator('canvas').focus();await page.keyboard.press('2');await expect(page.locator('#battle-ability')).toHaveValue('ability:second_wind');
  expect((await readSession(page)).pending).toBeNull();await expect(page.locator('#battle-review')).toBeDisabled();await page.keyboard.press('s');await page.keyboard.press('c');
  expect((await readSession(page)).state).toEqual(full.state);
  await page.evaluate(()=>{(globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls='radial';globalThis.dispatchEvent(new Event('combat-controls-change'));});
  await settledReport(page);await tapBoard(page,{x:0,y:0});await expect(page.locator('#battle-radial-special')).toBeDisabled();await page.keyboard.press('Escape');
  expect((await readSession(page)).state).toEqual(full.state);
  await abilityReady(page,'/tests/fixtures/abilities/index.html?hero=fighter&xp=180&injured');
  const picker=page.locator('#battle-ability'),secondWind=abilityButton(page,'ability:second_wind'),taunt=abilityButton(page,'ability:taunt');
  await expect(picker.locator('option[value="ability:second_wind"]')).toHaveCount(1);await expect(picker.locator('option[value="ability:taunt"]')).toHaveCount(1);
  const initial=await readSession(page);
  await picker.selectOption('ability:second_wind');if(isMobile)await secondWind.tap();else await secondWind.click();
  await page.locator('#battle-target').selectOption('0,0');await expect(page.locator('#battle-preview')).toContainText('Heal 7 HP');
  await expect(page.locator('#battle-preview')).not.toContainText('Friendly fire');await expect(page.locator('#battle-ability-info')).toContainText('1/1 use');
  await page.locator('#battle-party').click();await expect(page.getByRole('dialog')).toContainText('Second Wind 1/1');await page.locator('#inspection-close').click();
  const viewport=page.viewportSize()!;await page.setViewportSize({width:320,height:568});await expect(picker).toHaveValue('ability:second_wind');
  expect((await readSession(page)).state).toEqual(initial.state);
  await page.locator('#battle-review').scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath('fighter-heal-preview-narrow.png')});
  await page.setViewportSize(viewport);await page.keyboard.press('Escape');expect((await readSession(page)).pending).toBeNull();expect((await readSession(page)).state).toEqual(initial.state);
  await secondWind.click();await page.locator('#battle-target').selectOption('0,0');
  if(isMobile)await page.locator('#battle-review').tap();else {await page.locator('#battle-review').focus();await page.keyboard.press('Enter');}
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const healed=await readSession(page);expect(healed.state.rng).toEqual(initial.state.rng);expect(healed.state.units.find(u=>u.defId==='fighter')).toMatchObject({hp:27,secondWindUsed:true,hasActed:true});
  await expect(page.locator('#battle-status')).toContainText('0/1');await page.locator('#battle-log-open').click();await expect(page.getByRole('dialog')).toContainText('heals 7 HP');await page.locator('#log-close').click();
  await page.locator('#battle-next').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  for(let i=0;i<8;i++) {const s=await readSession(page);if(s.state.units.find(u=>u.id===s.state.initiative[s.state.activeIndex])!.defId==='fighter')break;await page.locator('#battle-next').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');}
  let next=await readSession(page),fighter=next.state.units.find(u=>u.id===next.state.initiative[next.state.activeIndex])!;expect(fighter.defId).toBe('fighter');
  await picker.selectOption('ability:second_wind');await expect(secondWind).toBeDisabled();await expect(secondWind).toContainText('Use exhausted');await expect(page.locator('#battle-ability-info')).toContainText('Use exhausted');
  let enemy=next.state.units.find(u=>u.side==='enemy' && u.hp>0 && Math.abs(u.cell.x-fighter.cell.x)+Math.abs(u.cell.y-fighter.cell.y)===1);
  if(!enemy){
    const base=abilityCatalog(2),catalog=projectProgression(HERO_IDS.map(id=>progressHero(id,180,1,base)),base),reach=previewMovement(next.state,fighter.id,catalog);if(!reach.ok)throw Error(reach.reason);
    const move=reach.cells.find(c=>c.cost>0 && next.state.units.some(u=>u.side==='enemy' && u.hp>0 && Math.abs(u.cell.x-c.cell.x)+Math.abs(u.cell.y-c.cell.y)===1));if(!move)throw Error('No legal approach to Taunt');
    await playCommand(page,{type:'move',unitId:fighter.id,to:move.cell});await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    next=await readSession(page);fighter=next.state.units.find(u=>u.id===fighter.id)!;
    enemy=next.state.units.find(u=>u.side==='enemy' && u.hp>0 && Math.abs(u.cell.x-fighter.cell.x)+Math.abs(u.cell.y-fighter.cell.y)===1);
  }
  expect(enemy).toBeDefined();if(!enemy)throw Error('No adjacent enemy');
  await abilityButton(page,'ability:guarded_strike').click();await page.locator('#battle-target').selectOption(`${enemy.cell.x},${enemy.cell.y}`);await expect(page.locator('#battle-review')).toBeEnabled();
  await page.locator('canvas').focus();await page.keyboard.press('2');await expect(picker).toHaveValue('ability:second_wind');
  expect((await readSession(page)).pending).toBeNull();await expect(page.locator('#battle-review')).toBeDisabled();await page.keyboard.press('c');
  expect((await readSession(page)).state).toEqual(next.state);
  await page.evaluate(()=>{(globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls='radial';globalThis.dispatchEvent(new Event('combat-controls-change'));});
  await settledReport(page);await tapBoard(page,fighter.cell);await expect(page.locator('#battle-radial-special')).toBeDisabled();await page.keyboard.press('Escape');
  expect((await readSession(page)).state).toEqual(next.state);
  await page.evaluate(()=>{(globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls='rail';globalThis.dispatchEvent(new Event('combat-controls-change'));});
  await settledReport(page);
  await picker.selectOption('ability:taunt');if(isMobile)await taunt.tap();else await taunt.click();
  await page.locator('#battle-target').selectOption(`${enemy.cell.x},${enemy.cell.y}`);await expect(page.locator('#battle-preview')).toContainText('no roll');
  await page.locator('#battle-review').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const taunted=await readSession(page);expect(taunted.state.rng).toEqual(next.state.rng);expect(taunted.state.units.find(u=>u.id===enemy.id)?.tauntedBy).toBe(fighter.id);
  await page.locator('#battle-party').click();await page.locator(`#inspect-unit-${enemy.id}`).click();await expect(page.getByRole('dialog')).toContainText(`Taunted by Fighter #${fighter.id}`);await expect(page.getByRole('dialog')).toContainText('next turn ends');
  await page.screenshot({path:test.info().outputPath('fighter-taunt-inspection.png')});await page.locator('#inspection-close').click();
  await page.locator('#battle-log-open').click();await expect(page.getByRole('dialog')).toContainText('taunted by Fighter');await page.locator('#log-close').click();
  await page.reload();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');expect((await readSession(page)).state).toEqual(initial.state);expect((await readSession(page)).events).toEqual([]);
  expect(errors).toEqual([]);
});
for(const hero of ['fighter','ranger','mage'])test(`${hero} explicit later ability survives inspection/layout and cancels without mutation`,async({page,isMobile})=>{
  await abilityReady(page,`/tests/fixtures/abilities/index.html?hero=${hero}`);
  const picker=page.locator('#battle-ability'),button=abilityButton(page,`ability:zz_${hero}`);
  await expect(picker.locator('option')).toHaveCount(2);
  const before=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
  if(isMobile)await picker.tap();else {await picker.focus();await page.keyboard.press('Space');}
  await page.keyboard.press('z');await page.keyboard.press('Enter');
  await expect(picker).toBeFocused();
  await expect(picker).toHaveValue(`ability:zz_${hero}`);
  if(isMobile)await button.tap();else await button.click();
  await expect(button).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#battle-ability-info')).toContainText('Range 1–5');
  await page.locator('#battle-target').selectOption('1,0');
  await expect(page.locator('#battle-review')).toBeEnabled();
  expect(JSON.parse((await page.locator('#game').getAttribute('data-session'))!).pending.abilityId).toBe(`ability:zz_${hero}`);
  const prepared=await page.locator('#game').getAttribute('data-session');
  await page.locator('#battle-party').click();await page.locator('#inspection-close').click();
  await picker.scrollIntoViewIfNeeded();
  await page.screenshot({path:test.info().outputPath(`${hero}-original-viewport.png`)});
  const viewport=page.viewportSize()!;await page.setViewportSize({width:320,height:568});
  await expect(picker).toHaveValue(`ability:zz_${hero}`);
  expect(await page.locator('#game').getAttribute('data-session')).toBe(prepared);
  expect(await picker.evaluate(e=>e.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await picker.scrollIntoViewIfNeeded();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:test.info().outputPath(`${hero}-picker.png`)});
  await page.setViewportSize(viewport);await page.locator('#battle-cancel').click();
  const after=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
  expect(after.state).toEqual(before.state);expect(after.replay).toEqual(before.replay);expect(after.pending).toBeNull();
  expect(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)))).toEqual({[COMBAT_CONTROLS_KEY]:'rail'});
  if(isMobile)await button.tap();else await button.click();
  await page.locator('#battle-target').selectOption('1,0');await page.locator('#battle-review').click();
  await expect(page.getByRole('dialog')).not.toBeVisible();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  await expect(picker).toBeDisabled();
  const accepted=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
  expect(accepted.replay.commands).toHaveLength(1);expect(accepted.replay.commands[0].abilityId).toBe(`ability:zz_${hero}`);
  expect(accepted.pending).toBeNull();
  await page.reload();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const fresh=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
  expect(fresh.state).toEqual(before.state);expect(fresh.pending).toBeNull();await expect(picker).toBeEnabled();
});

test('friendly missile confirmation supports Cancel and Escape then one deliberate damage action',async({page})=>{
  await abilityReady(page,'/tests/fixtures/abilities/index.html?hero=mage');
  const before=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
  for(const dismissal of ['cancel','escape']){
    await page.locator('#battle-ability').selectOption('ability:zz_mage');await abilityButton(page,'ability:zz_mage').click();
    await page.locator('#battle-target').selectOption('4,0');
    await expect(page.locator('#battle-preview')).toContainText('Friendly fire');
    if(dismissal==='cancel')await page.locator('#battle-cancel').click();else await page.keyboard.press('Escape');
    const after=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
    expect(after.state).toEqual(before.state);expect(after.replay).toEqual(before.replay);expect(after.pending).toBeNull();
    expect(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)))).toEqual({[COMBAT_CONTROLS_KEY]:'rail'});
  }
  await abilityButton(page,'ability:zz_mage').click();await page.locator('#battle-target').selectOption('4,0');
  await page.locator('#battle-review').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const after=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
  expect(after.replay.commands).toHaveLength(1);
  expect(after.events.filter((e:{type:string})=>e.type==='missileRolled')).toHaveLength(2);
  const target=before.state.units.find((u:{cell:{x:number;y:number}})=>u.cell.x===4&&u.cell.y===0);
  expect(after.state.units.find((u:{id:number})=>u.id===target.id).hp).toBeLessThan(target.hp);
});

// Keep all three distinct picker states; abilityFixtureProgression covers the
// numeric XP/HP/missile permutations, including level five's third missile.
for(const [xp,level,missiles,maxHp] of [[0,1,1,11],[60,2,1,15],[180,3,2,19]])test(`progression XP ${xp} gates learned fixture actions and resets on reload`,async({page})=>{
 await abilityReady(page,`/tests/fixtures/abilities/index.html?hero=mage&xp=${xp}`);
 const initial=await readSession(page);
 await expect.poll(async()=>JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))??'null')?.units.find((u:{unitId:string})=>u.unitId==='mage')?.health.maxHp).toBe(maxHp);
 const health=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!).units.find((u:{unitId:string})=>u.unitId==='mage').health;expect(health.hp).toBe(maxHp);expect(health.ratio).toBe(1);
 const picker=page.locator('#battle-ability');await expect(picker.locator('option')).toHaveCount(level===1?1:level<3?2:3);
 await expect(picker.locator('option[value="ability:frost_snare"]')).toHaveCount(level>=3?1:0);
 await expect(picker.locator('option[value="ability:zz_mage"]')).toHaveCount(level===1?0:1);
 await page.locator('#battle-party').click();await expect(page.locator('#battle-dialog-message')).toContainText(`Level ${level}`);await page.locator('#inspection-close').click();
 await picker.selectOption('ability:magic_missile');await abilityButton(page,'ability:magic_missile').click();await page.locator('#battle-target').selectOption('1,0');await page.locator('#battle-review').click();
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const before=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);expect(before.events.filter((e:{type:string})=>e.type==='missileRolled')).toHaveLength(missiles);
 await page.reload();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');expect((await readSession(page)).state).toEqual(initial.state);
 await page.locator('#battle-party').click();await expect(page.locator('#battle-dialog-message')).toContainText(`Level ${level}`);await page.screenshot({path:test.info().outputPath(`progression-level-${level}.png`)});
});


test('radial multiple specials remain reachable on a narrow viewport', async ({page,isMobile}) => {
  await page.setViewportSize({width:320,height:568});
  await abilityReady(page,'/tests/fixtures/abilities/index.html?hero=mage&xp=180&real');
  await page.evaluate(() => {
    (globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls = 'radial';
    globalThis.dispatchEvent(new Event('combat-controls-change'));
  });
  await settledReport(page);
  await tapBoard(page,{x:2,y:0});
  await expect(page.locator('#battle-radial')).toBeVisible();
  await page.locator('#battle-radial-special').click();
  const choices=page.locator('#battle-radial-sub button');
  await expect(choices).toHaveCount(2);
  for (const choice of await choices.all()) {
    const box=(await choice.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x+box.width).toBeLessThanOrEqual(320);
    expect(box.y+box.height).toBeLessThanOrEqual(568);
  }
  const before=await readSession(page);
  if(isMobile) await choices.last().tap(); else await choices.last().click();
  await expect.poll(async()=> (await readSession(page)).state.commandCount).toBe(before.state.commandCount+1);
});

test('radial Frost Snare label fits at a readable font size', async ({page}) => {
  await page.setViewportSize({width:1200,height:900});
  await abilityReady(page,'/tests/fixtures/abilities/index.html?hero=mage&xp=180&real');
  await page.evaluate(() => {
    (globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls='radial';
    globalThis.dispatchEvent(new Event('combat-controls-change'));
  });
  await settledReport(page);
  await tapBoard(page,{x:2,y:0});
  const special=page.locator('#battle-radial-special');
  await expect(special).toBeEnabled();
  const title=special.locator('strong');
  await expect(title).toBeVisible();
  await expect(title).toHaveText('Frost Snare');
  expect(await title.evaluate(node => {
    const bounds=node.getBoundingClientRect();
    const text=document.createRange();
    text.selectNodeContents(node);
    return parseFloat(getComputedStyle(node).fontSize)>=10 &&
      [...text.getClientRects()].every(rect =>
        rect.left>=bounds.left && rect.right<=bounds.right &&
        rect.top>=bounds.top && rect.bottom<=bounds.bottom);
  })).toBe(true);
});

test('radial hold keeps edge actions visible and cancels at the original press', async ({page}) => {
  await page.setViewportSize({width:320,height:568});
  await abilityReady(page,'/tests/fixtures/abilities/index.html?hero=mage&xp=180&real');
  const results = await page.evaluate(async () => {
    const radialPath='/src/ui/battleRadial.ts', selectionPath='/src/ui/battleSelection.ts', fixturePath='/tests/helpers/abilityCatalog.ts';
    const {BattleRadial}=await import(/* @vite-ignore */ radialPath);
    const {BattleSelection}=await import(/* @vite-ignore */ selectionPath);
    const {abilitySession}=await import(/* @vite-ignore */ fixturePath);
    document.querySelector('#battle-radial')?.remove();
    const model=new BattleSelection(abilitySession('mage'));
    let cancelled=0;
    const committed:string[]=[];
    const radial=new BattleRadial(model,{commit:(_cell:unknown,slice:string)=>{committed.push(slice);},inspect:()=>{},plan:()=>{},cancel:()=>{cancelled++;},preview:()=>{}});
    const result=[];
    const root=radial.root as HTMLElement;
    for(const origin of [{x:8,y:8},{x:312,y:8},{x:8,y:560},{x:312,y:560}]) {
      radial.show({x:1,y:0},{mode:'hold',origin});
      const boxes=[...root.querySelectorAll<HTMLElement>('[data-slice]')].map(button=>{
        const r=button.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom};
      });
      const move=root.querySelector<HTMLElement>('#battle-radial-move')!.getBoundingClientRect();
      radial.aimAt({x:move.left+move.width/2,y:move.top+move.height/2});
      const verdict=radial.releaseAt(origin);
      radial.show({x:1,y:0},{mode:'hold',origin});
      const attack=root.querySelector<HTMLElement>('#battle-radial-attack')!.getBoundingClientRect();
      const target={x:attack.left+attack.width/2,y:attack.top+attack.height/2};
      radial.aimAt(target);
      const attackVerdict=radial.releaseAt(target);
      result.push({boxes,verdict,attackVerdict});
    }
    radial.dispose();
    return {result,cancelled,committed};
  });
  for(const {boxes,verdict,attackVerdict} of results.result) {
    for(const box of boxes) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(320);
      expect(box.bottom).toBeLessThanOrEqual(568);
    }
    expect(verdict).toBe('cancel');
    expect(attackVerdict).toBe('commit');
  }
  expect(results.cancelled).toBe(4);
  expect(results.committed).toEqual(['attack','attack','attack','attack']);
});

test('radial Special does not commit when choices appear on a narrow screen', async ({page,isMobile}) => {
  await page.setViewportSize({width:320,height:568});
  await abilityReady(page,'/tests/fixtures/abilities/index.html?hero=ranger&xp=180&real');
  await page.evaluate(() => {
    (globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls='radial';
    globalThis.dispatchEvent(new Event('combat-controls-change'));
  });
  await settledReport(page);
  await tapBoard(page,{x:2,y:0});
  const special=page.locator('#battle-radial-special');
  await expect(special).toBeEnabled();
  await special.dispatchEvent('pointerenter');
  await expect(page.locator('#battle-radial-sub')).toBeHidden();
  const before=await readSession(page);
  if(isMobile) await special.tap(); else await special.click();
  const choices=page.locator('#battle-radial-sub button');
  await expect(choices).toHaveCount(3);
  await expect(choices.first()).toBeVisible();
  await expect(page.locator('#battle-radial-attack')).toBeHidden();
  await expect(page.locator('#battle-radial-special')).toBeVisible();
  expect((await readSession(page)).state.commandCount).toBe(before.state.commandCount);
  const slice=(await special.boundingBox())!;
  for(const choice of await choices.all()) {
    const box=(await choice.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x+box.width).toBeLessThanOrEqual(320);
    expect(box.x+box.width <= slice.x || box.x >= slice.x+slice.width || box.y+box.height <= slice.y || box.y >= slice.y+slice.height).toBe(true);
  }
  if(isMobile) await choices.last().tap(); else await choices.last().click();
  await expect.poll(async()=> (await readSession(page)).state.commandCount).toBe(before.state.commandCount+1);
});

test('radial shifted hold can aim Special and still cancel at the press', async ({page}) => {
  await page.setViewportSize({width:320,height:568});
  await abilityReady(page,'/tests/fixtures/abilities/index.html?hero=mage&xp=180&real');
  const result=await page.evaluate(async()=>{
    const radialPath='/src/ui/battleRadial.ts', selectionPath='/src/ui/battleSelection.ts', fixturePath='/tests/helpers/abilityCatalog.ts';
    const {BattleRadial}=await import(/* @vite-ignore */ radialPath);
    const {BattleSelection}=await import(/* @vite-ignore */ selectionPath);
    const {abilitySession}=await import(/* @vite-ignore */ fixturePath);
    document.querySelector('#battle-radial')?.remove();
    const model=new BattleSelection(abilitySession('mage'));
    const commits:string[]=[];
    let cancels=0;
    const radial=new BattleRadial(model,{commit:(_cell:unknown,slice:string,ability?:string)=>commits.push(`${slice}:${ability}`),inspect:()=>{},plan:()=>{},cancel:()=>cancels++,preview:()=>{}});
    const root=radial.root as HTMLElement;
    const origin={x:282,y:280};
    const target={x:262,y:280};
    radial.show({x:1,y:0},{mode:'hold',origin});
    radial.aimAt(target);
    const aimed=root.dataset.aim;
    const chip=root.querySelector<HTMLElement>('#battle-radial-sub button')!;
    const rect=chip.getBoundingClientRect();
    const special=root.querySelector<HTMLElement>('#battle-radial-special')!.getBoundingClientRect();
    const targetElement=document.elementFromPoint(target.x,target.y)?.closest('[data-slice]')?.getAttribute('data-slice');
    const verdict=radial.releaseAt(target);
    const beforeChoice=[...commits];
    radial.cancel();
    radial.show({x:1,y:0},{mode:'hold',origin});
    radial.aimAt(target);
    const cancel=radial.releaseAt(origin);
    radial.show({x:1,y:0},{mode:'hold',origin});
    radial.aimAt(target);
    const chipBox=root.querySelector<HTMLElement>('#battle-radial-sub button')!.getBoundingClientRect();
    const chipTarget={x:chipBox.left+20,y:chipBox.top+chipBox.height/2};
    radial.aimAt(chipTarget);
    const chipVerdict=radial.releaseAt(chipTarget);
    radial.dispose();
    return {aimed,targetElement,verdict,beforeChoice,cancel,chipVerdict,commits,cancels,chipRight:rect.right,specialLeft:special.left};
  });
  expect(result.aimed).toBe('special');
  expect(result.targetElement).toBe('special');
  expect(result.chipRight).toBeLessThanOrEqual(result.specialLeft);
  expect(result.verdict).toBe('open-sub');
  expect(result.beforeChoice).toEqual([]);
  expect(result.cancel).toBe('cancel');
  expect(result.chipVerdict).toBe('commit');
  expect(result.commits).toHaveLength(1);
  expect(result.commits[0]).toMatch(/^special:/);
  expect(result.cancels).toBe(2);
});

test('radial compact landscape keeps every slice reachable on tap and hold', async ({page}) => {
  await page.setViewportSize({width:568,height:300});
  await abilityReady(page,'/tests/fixtures/abilities/index.html?hero=mage&xp=180&real');
  const results=await page.evaluate(async()=>{
    const radialPath='/src/ui/battleRadial.ts', selectionPath='/src/ui/battleSelection.ts', fixturePath='/tests/helpers/abilityCatalog.ts';
    const {BattleRadial}=await import(/* @vite-ignore */ radialPath);
    const {BattleSelection}=await import(/* @vite-ignore */ selectionPath);
    const {abilitySession}=await import(/* @vite-ignore */ fixturePath);
    document.querySelector('#battle-radial')?.remove();
    const commits:string[]=[];
    const radial=new BattleRadial(new BattleSelection(abilitySession('mage')),{commit:(_cell:unknown,slice:string)=>commits.push(slice),inspect:()=>{},plan:()=>{},cancel:()=>{},preview:()=>{}});
    const root=radial.root as HTMLElement;
    const layouts=[];
    for(const mode of ['tap','hold'] as const) for(const origin of [{x:8,y:8},{x:560,y:8},{x:8,y:292},{x:560,y:292}]) {
      radial.show({x:1,y:0},{mode,origin});
      const boxes=[...root.querySelectorAll<HTMLElement>('[data-slice]')].map(button=>{
        const rect=button.getBoundingClientRect();return {id:button.id,left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height};
      });
      const attack=root.querySelector<HTMLElement>('#battle-radial-attack')!.getBoundingClientRect();
      const point={x:attack.left+attack.width/2,y:attack.top+attack.height/2};
      const hit=document.elementFromPoint(point.x,point.y)?.closest('[data-slice]')?.getAttribute('data-slice');
      if(mode==='hold') {radial.aimAt(point);radial.releaseAt(point);} else root.querySelector<HTMLButtonElement>('#battle-radial-attack')!.click();
      layouts.push({boxes,hit});
    }
    radial.dispose();return {layouts,commits};
  });
  for(const {boxes,hit} of results.layouts) {
    expect(hit).toBe('attack');
    for(const box of boxes) {
      expect(box.left,box.id).toBeGreaterThanOrEqual(0);
      expect(box.top,box.id).toBeGreaterThanOrEqual(0);
      expect(box.right,box.id).toBeLessThanOrEqual(568);
      expect(box.bottom,box.id).toBeLessThanOrEqual(300);
      expect(box.width,box.id).toBeGreaterThanOrEqual(44);
      expect(box.height,box.id).toBeGreaterThanOrEqual(44);
    }
    const attack=boxes.find(box=>box.id==='battle-radial-attack')!;
    const plan=boxes.find(box=>box.id==='battle-radial-plan')!;
    expect(attack.bottom).toBeLessThanOrEqual(plan.top);
  }
  expect(results.commits).toEqual(Array(8).fill('attack'));
});

test('radial compact landscape keeps Special choices reachable', async ({page,isMobile}) => {
  await page.setViewportSize({width:568,height:300});
  await abilityReady(page,'/tests/fixtures/abilities/index.html?hero=mage&xp=180&real');
  await page.evaluate(()=>{
    (globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls='radial';
    globalThis.dispatchEvent(new Event('combat-controls-change'));
  });
  await settledReport(page);
  await tapBoard(page,{x:2,y:0});
  const special=page.locator('#battle-radial-special');
  await expect(special).toBeEnabled();
  if(isMobile) await special.tap(); else await special.click();
  const choices=page.locator('#battle-radial-sub button');
  await expect(choices).toHaveCount(2);
  const before=await readSession(page);
  for(const choice of await choices.all()) {
    const box=(await choice.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x+box.width).toBeLessThanOrEqual(568);
    expect(box.y+box.height).toBeLessThanOrEqual(300);
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  if(isMobile) await choices.last().tap(); else await choices.last().click();
  await expect.poll(async()=> (await readSession(page)).state.commandCount).toBe(before.state.commandCount+1);
});
