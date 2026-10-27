import {expect,test} from '@playwright/test';
import { readSession, playCommand } from './helpers/battlePolicy';
import { abilityCatalog } from './helpers/abilityCatalog';
import { progressHero, projectProgression } from '../src/domain/progression';
import { HERO_IDS } from '../src/content/constants';
import { previewMovement } from '../src/domain/grid';

test('Ranger learned actions follow level one, two and three through the real picker',async({page})=>{
  for(const [xp,mark,pin] of [[0,0,0],[60,1,0],[180,1,1]]) {
    await page.goto(`/tests/fixtures/abilities/index.html?hero=ranger&xp=${xp}`);
    await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    await expect(page.locator('#battle-ability option[value="ability:high_shot"]')).toHaveCount(1);
    await expect(page.locator('#battle-ability option[value="ability:mark_target"]')).toHaveCount(mark);
    await expect(page.locator('#battle-ability option[value="ability:pinning_shot"]')).toHaveCount(pin);
    await expect(page.locator('#battle-ability-info')).toContainText('Mark Target unlocks at level 2; Pinning Shot at level 3');
  }
});

for(const ability of ['mark_target','pinning_shot'] as const)test(`Ranger ${ability} preserves keyboard touch preview cancellation inspection and exact resume`,async({page,isMobile})=>{
  test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/tests/fixtures/abilities/index.html?hero=ranger&xp=180');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const picker=page.locator('#battle-ability'),button=page.locator('[data-action=signature]'),abilityId=`ability:${ability}`;
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
  expect(target[ability==='mark_target'?'markedBy':'pinnedBy']).toBe(2);expect(accepted.state.rng).toEqual(before.state.rng);
  expect(accepted.state.units.map(u=>u.hp)).toEqual(before.state.units.map(u=>u.hp));
  expect(accepted.state.commandCount).toBe(before.state.commandCount+1);await expect(picker).toBeDisabled();
  await page.locator('#battle-party').click();await page.locator('#inspect-unit-5').click();
  await expect(page.getByRole('dialog')).toContainText(ability==='mark_target'?'Marked by Ranger #2':'Pinned by Ranger #2');
  await page.screenshot({path:test.info().outputPath(`${ability}-inspection.png`)});await page.locator('#inspection-close').click();
  await page.locator('#battle-log-open').click();await expect(page.getByRole('dialog')).toContainText(ability==='mark_target'?'marked by Ranger':'pinned by Ranger');await page.locator('#log-close').click();
  await page.reload();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const resumed=await readSession(page);expect(resumed.state).toEqual(accepted.state);expect(resumed.events).toEqual([]);expect(resumed.pending).toBeNull();
  expect(errors).toEqual([]);
});

test('Fighter healing and Taunt preserve keyboard touch cancellation inspection and resume',async({page,isMobile})=>{
  test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/tests/fixtures/abilities/index.html?hero=fighter&xp=180&injured');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const picker=page.locator('#battle-ability'),signature=page.locator('[data-action=signature]');
  await expect(picker.locator('option[value="ability:second_wind"]')).toHaveCount(1);await expect(picker.locator('option[value="ability:taunt"]')).toHaveCount(1);
  const initial=await readSession(page);
  await picker.selectOption('ability:second_wind');if(isMobile)await signature.tap();else await signature.click();
  await page.locator('#battle-target').selectOption('0,0');await expect(page.locator('#battle-preview')).toContainText('Heal 7 HP');
  await expect(page.locator('#battle-preview')).not.toContainText('Friendly fire');await expect(page.locator('#battle-ability-info')).toContainText('1/1 use');
  await page.locator('#battle-party').click();await expect(page.getByRole('dialog')).toContainText('Second Wind 1/1');await page.locator('#inspection-close').click();
  const viewport=page.viewportSize()!;await page.setViewportSize({width:320,height:568});await expect(picker).toHaveValue('ability:second_wind');
  expect((await readSession(page)).state).toEqual(initial.state);
  await page.locator('#battle-review').scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath('fighter-heal-preview-narrow.png')});
  await page.setViewportSize(viewport);await page.keyboard.press('Escape');expect((await readSession(page)).pending).toBeNull();expect((await readSession(page)).state).toEqual(initial.state);
  await signature.click();await page.locator('#battle-target').selectOption('0,0');
  if(isMobile)await page.locator('#battle-review').tap();else {await page.locator('#battle-review').focus();await page.keyboard.press('Enter');}
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const healed=await readSession(page);expect(healed.state.rng).toEqual(initial.state.rng);expect(healed.state.units.find(u=>u.defId==='fighter')).toMatchObject({hp:27,secondWindUsed:true,hasActed:true});
  await expect(page.locator('#battle-status')).toContainText('0/1');await page.locator('#battle-log-open').click();await expect(page.getByRole('dialog')).toContainText('heals 7 HP');await page.locator('#log-close').click();
  await page.reload();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');expect((await readSession(page)).state).toEqual(healed.state);
  await page.locator('#battle-next').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  for(let i=0;i<8;i++) {const s=await readSession(page);if(s.state.units.find(u=>u.id===s.state.initiative[s.state.activeIndex])!.defId==='fighter')break;await page.locator('#battle-next').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');}
  let next=await readSession(page),fighter=next.state.units.find(u=>u.id===next.state.initiative[next.state.activeIndex])!;expect(fighter.defId).toBe('fighter');
  await picker.selectOption('ability:second_wind');await expect(signature).toBeDisabled();await expect(page.locator('#battle-ability-info')).toContainText('Use exhausted');
  let enemy=next.state.units.find(u=>u.side==='enemy' && u.hp>0 && Math.abs(u.cell.x-fighter.cell.x)+Math.abs(u.cell.y-fighter.cell.y)===1);
  if(!enemy){
    const base=abilityCatalog(2),catalog=projectProgression(HERO_IDS.map(id=>progressHero(id,180,1,base)),base),reach=previewMovement(next.state,fighter.id,catalog);if(!reach.ok)throw Error(reach.reason);
    const move=reach.cells.find(c=>c.cost>0 && next.state.units.some(u=>u.side==='enemy' && u.hp>0 && Math.abs(u.cell.x-c.cell.x)+Math.abs(u.cell.y-c.cell.y)===1));if(!move)throw Error('No legal approach to Taunt');
    await playCommand(page,{type:'move',unitId:fighter.id,to:move.cell});await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    next=await readSession(page);fighter=next.state.units.find(u=>u.id===fighter.id)!;
    enemy=next.state.units.find(u=>u.side==='enemy' && u.hp>0 && Math.abs(u.cell.x-fighter.cell.x)+Math.abs(u.cell.y-fighter.cell.y)===1);
  }
  expect(enemy).toBeDefined();if(!enemy)throw Error('No adjacent enemy');
  await picker.selectOption('ability:taunt');if(isMobile)await signature.tap();else await signature.click();
  await page.locator('#battle-target').selectOption(`${enemy.cell.x},${enemy.cell.y}`);await expect(page.locator('#battle-preview')).toContainText('no roll');
  await page.locator('#battle-review').click();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const taunted=await readSession(page);expect(taunted.state.rng).toEqual(next.state.rng);expect(taunted.state.units.find(u=>u.id===enemy.id)?.tauntedBy).toBe(fighter.id);
  await page.locator('#battle-party').click();await page.locator(`#inspect-unit-${enemy.id}`).click();await expect(page.getByRole('dialog')).toContainText(`Taunted by Fighter #${fighter.id}`);await expect(page.getByRole('dialog')).toContainText('next turn ends');
  await page.screenshot({path:test.info().outputPath('fighter-taunt-inspection.png')});await page.locator('#inspection-close').click();
  await page.locator('#battle-log-open').click();await expect(page.getByRole('dialog')).toContainText('taunted by Fighter');await page.locator('#log-close').click();
  await page.reload();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');expect((await readSession(page)).state).toEqual(taunted.state);expect((await readSession(page)).events).toEqual([]);
  expect(errors).toEqual([]);
});
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
  await expect(page.getByRole('dialog')).not.toBeVisible();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
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
    if(dismissal==='cancel')await page.locator('#battle-cancel').click();else await page.keyboard.press('Escape');
    const after=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
    expect(after.state).toEqual(before.state);expect(after.replay).toEqual(before.replay);expect(after.pending).toBeNull();
    expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe('{}');
  }
  await page.locator('[data-action=signature]').click();await page.locator('#battle-target').selectOption('4,0');
  await page.locator('#battle-review').click();
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
 await picker.selectOption('ability:magic_missile');await page.locator('[data-action=signature]').click();await page.locator('#battle-target').selectOption('1,0');await page.locator('#battle-review').click();
 await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
 const before=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);expect(before.events.filter((e:{type:string})=>e.type==='missileRolled')).toHaveLength(missiles);
 await page.reload();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');expect(JSON.parse((await page.locator('#game').getAttribute('data-session'))!).state).toEqual(before.state);
 await page.locator('#battle-party').click();await expect(page.locator('#battle-dialog-message')).toContainText(`Level ${level}`);await page.screenshot({path:test.info().outputPath(`progression-level-${level}.png`)});
});
