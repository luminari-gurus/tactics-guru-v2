import {expect,test} from '@playwright/test';
for(const hero of ['fighter','ranger','mage'])test(`${hero} explicit later ability survives inspection/layout and cancels without mutation`,async({page,isMobile})=>{
  await page.goto(`/tests/fixtures/abilities/index.html?hero=${hero}`);
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const picker=page.locator('#battle-ability'),button=page.locator('[data-action=signature]');
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
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe('{}');
  if(isMobile)await button.tap();else await button.click();
  await page.locator('#battle-target').selectOption('1,0');await page.locator('#battle-review').click();
  await expect(page.locator('#battle-dialog-message')).toContainText(`Zz ${hero[0].toUpperCase()+hero.slice(1)}`);
  await page.locator('#dialog-confirm').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  await expect(picker).toBeDisabled();
  const accepted=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
  expect(accepted.replay.commands).toHaveLength(1);expect(accepted.replay.commands[0].abilityId).toBe(`ability:zz_${hero}`);
  expect(accepted.pending).toBeNull();
  await page.reload();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const resumed=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
  expect(resumed.state).toEqual(accepted.state);expect(resumed.pending).toBeNull();await expect(picker).toBeDisabled();
});

test('friendly missile confirmation supports Cancel and Escape then one deliberate damage action',async({page})=>{
  await page.goto('/tests/fixtures/abilities/index.html?hero=mage');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const before=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
  for(const dismissal of ['cancel','escape']){
    await page.locator('#battle-ability').selectOption('ability:zz_mage');await page.locator('[data-action=signature]').click();
    await page.locator('#battle-target').selectOption('4,0');
    await expect(page.locator('#battle-preview')).toContainText('Friendly fire');
    await page.locator('#battle-review').click();await expect(page.locator('#battle-dialog-message')).toContainText('Friendly fire: this damages');
    if(dismissal==='cancel')await page.locator('#dialog-cancel').click();else await page.keyboard.press('Escape');
    const after=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
    expect(after.state).toEqual(before.state);expect(after.replay).toEqual(before.replay);expect(after.pending).toBeNull();
    expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe('{}');
  }
  await page.locator('[data-action=signature]').click();await page.locator('#battle-target').selectOption('4,0');
  await page.locator('#battle-review').click();await page.locator('#dialog-confirm').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const after=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
  expect(after.replay.commands).toHaveLength(1);
  expect(after.events.filter((e:{type:string})=>e.type==='missileRolled')).toHaveLength(2);
  const target=before.state.units.find((u:{cell:{x:number;y:number}})=>u.cell.x===4&&u.cell.y===0);
  expect(after.state.units.find((u:{id:number})=>u.id===target.id).hp).toBeLessThan(target.hp);
});

for(const [xp,level,missiles,maxHp] of [[0,1,1,11],[60,2,1,15],[180,3,2,19],[600,5,3,27]])test(`progression XP ${xp} gates learned fixture actions and resumes caster level`,async({page})=>{
 await page.goto(`/tests/fixtures/abilities/index.html?hero=mage&xp=${xp}`);await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 await expect.poll(async()=>JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))??'null')?.units.find((u:{unitId:string})=>u.unitId==='mage')?.health.maxHp).toBe(maxHp);
 const health=JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!).units.find((u:{unitId:string})=>u.unitId==='mage').health;expect(health.hp).toBe(maxHp);expect(health.ratio).toBe(1);
 const picker=page.locator('#battle-ability');await expect(picker.locator('option')).toHaveCount(level===1?1:2);
 await expect(picker.locator('option[value="ability:zz_mage"]')).toHaveCount(level===1?0:1);
 await page.locator('#battle-party').click();await expect(page.locator('#battle-dialog-message')).toContainText(`Level ${level}`);await page.locator('#inspection-close').click();
 await picker.selectOption('ability:magic_missile');await page.locator('[data-action=signature]').click();await page.locator('#battle-target').selectOption('1,0');await page.locator('#battle-review').click();await page.locator('#dialog-confirm').click();
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const before=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);expect(before.events.filter((e:{type:string})=>e.type==='missileRolled')).toHaveLength(missiles);
 await page.reload();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');expect(JSON.parse((await page.locator('#game').getAttribute('data-session'))!).state).toEqual(before.state);
 await page.locator('#battle-party').click();await expect(page.locator('#battle-dialog-message')).toContainText(`Level ${level}`);await page.screenshot({path:test.info().outputPath(`progression-level-${level}.png`)});
});
