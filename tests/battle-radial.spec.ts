import { expect, test, type Page } from '@playwright/test';
import { session, tapBoard, boardPoint, combatSkin } from './helpers/battlePolicy';
import { standaloneCatalog as catalog } from './helpers/playerPolicy';
import { previewMovement } from '../src/domain/grid';
import { previewTacticalPlan } from '../src/domain/tacticalPlan';
import { COMBAT_CONTROLS_KEY } from '../src/ui/combatControls';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try { (globalThis as { __tacticsGuruCombatControls?: string }).__tacticsGuruCombatControls = 'radial'; } catch { /* ignore */ }
    try {
      if (!sessionStorage.getItem('tactics-guru:combat-controls-init')) {
        sessionStorage.setItem('tactics-guru:combat-controls-init', '1');
        localStorage.setItem('tactics-guru:combat-controls', 'radial');
      }
    } catch { /* private mode */ }
  });
});

async function ready(page: Page) {
  await page.goto('./battle');
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  await expect.poll(() => combatSkin(page)).toBe('radial');
}

async function holdAt(page: Page, point: { x: number; y: number }) {
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.waitForTimeout(350);
}

async function reachableEmpty(page: Page) {
  const current = await session(page);
  const actor = current.state.units.find(unit => unit.id === current.state.initiative[current.state.activeIndex])!;
  const reach = previewMovement(current.state, actor.id, catalog);
  if (!reach.ok) throw Error(reach.reason);
  const cell = reach.cells.find(entry => entry.cost > 0)!.cell;
  return { actor, cell, current };
}

async function livingEnemy(page: Page) {
  const current = await session(page);
  const enemy = current.state.units.find(unit => unit.side === 'enemy' && unit.hp > 0)!;
  return { current, enemy };
}

async function radialLabelProblems(page: Page) {
  return page.locator('#battle-radial').evaluate(root => {
    const issues: string[] = [];
    const hubText = root.querySelector('#battle-radial-hub')?.textContent ?? '';
    if (/unavailable:.*unavailable:/i.test(hubText.replace(/\s+/g, ' '))) issues.push(`duplicate hub reason: ${hubText}`);
    for (const el of root.querySelectorAll<HTMLElement>('strong, span')) {
      if (el.closest('[hidden]') || !el.textContent?.trim()) continue;
      const style = getComputedStyle(el);
      const nowrap = style.whiteSpace.includes('nowrap');
      const lines = el.getClientRects().length;
      if (!nowrap || lines > 1) issues.push(`wrap (${lines}): ${el.textContent}`);
      const overflow = el.scrollWidth > el.clientWidth + 1;
      const abbreviated = style.textOverflow === 'ellipsis' && parseFloat(style.fontSize) <= 10.5;
      if (overflow && !abbreviated) issues.push(`overflow ${el.scrollWidth}>${el.clientWidth} @${style.fontSize}: ${el.textContent}`);
    }
    const plan = root.querySelector('#battle-radial-plan')?.getBoundingClientRect();
    const inspect = root.querySelector('#battle-radial-inspect')?.getBoundingClientRect();
    if (plan && inspect && plan.width && inspect.width
      && !(plan.right <= inspect.left || plan.left >= inspect.right || plan.bottom <= inspect.top || plan.top >= inspect.bottom)) {
      issues.push('plan overlaps inspect');
    }
    return issues;
  });
}

test('radial hold opens labelled slices on a reachable tile', async ({ page }) => {
  await ready(page);
  const { cell, current } = await reachableEmpty(page);
  await holdAt(page, await boardPoint(page, cell));
  await expect(page.locator('#battle-radial')).toBeVisible();
  await expect(page.locator('#battle-radial-move')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#battle-radial-attack')).toBeDisabled();
  await expect(page.locator('#battle-radial-inspect')).toBeEnabled();
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('#battle-radial')).toBeHidden();
  const after = await session(page);
  expect(after.state).toEqual(current.state);
  expect(after.replay.commands).toEqual(current.replay.commands);
});

test('radial tap fallback opens the same radial without requiring a hold', async ({ page }) => {
  await ready(page);
  const { cell } = await reachableEmpty(page);
  await tapBoard(page, cell);
  await expect(page.locator('#battle-radial')).toBeVisible();
  await expect(page.locator('#battle-radial-move')).toBeVisible();
  await page.locator('#battle-radial-hub').click({ position: { x: 44, y: 44 } });
  await expect(page.locator('#battle-radial')).toBeHidden();
  expect((await session(page)).pending).toBeNull();
});

test('radial hub cancel records no command after leaving a slice', async ({ page }) => {
  await ready(page);
  const { cell, current } = await reachableEmpty(page);
  const origin = await boardPoint(page, cell);
  await holdAt(page, origin);
  await expect(page.locator('#battle-radial')).toBeVisible();
  const hub = page.locator('#battle-radial-hub');
  const box = (await hub.boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  await page.mouse.move(cx + 80, cy, { steps: 8 });
  await expect(page.locator('#battle-radial')).not.toHaveAttribute('data-aim', 'hub');
  await page.mouse.move(cx, cy, { steps: 8 });
  await expect(hub).toContainText(/cancel/i);
  await page.mouse.up();
  await expect(page.locator('#battle-radial')).toBeHidden();
  const after = await session(page);
  expect(after.state).toEqual(current.state);
  expect(after.state.rng).toEqual(current.state.rng);
  expect(after.replay.commands).toEqual(current.replay.commands);
  expect(after.pending).toBeNull();
});

test('radial End turn is docked at 48 px and commits immediately', async ({ page }) => {
  await ready(page);
  const next = page.locator('#battle-next');
  await expect(next).toHaveText(/End turn/);
  await expect(next).toBeVisible();
  const box = (await next.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(48);
  const before = await session(page);
  await next.click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  const after = await session(page);
  expect(after.replay.commands.length).toBeGreaterThan(before.replay.commands.length);
  expect(after.replay.commands.some(command => command.type === 'endTurn')).toBe(true);
});

test('pan vs hold: a 20 px drag before 300 ms pans and never opens the radial', async ({ page }) => {
  await ready(page);
  const { cell } = await reachableEmpty(page);
  const origin = await boardPoint(page, cell);
  const before = JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!).transform;
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  await page.mouse.move(origin.x + 24, origin.y, { steps: 4 });
  await page.waitForTimeout(350);
  await expect(page.locator('#battle-radial')).toBeHidden();
  await page.mouse.up();
  const after = JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!).transform;
  expect(after).not.toEqual(before);
  expect((await session(page)).pending).toBeNull();
});

test('radial special commits the only legal special without a sub-ring', async ({ page }) => {
  await ready(page);
  const { enemy, current } = await livingEnemy(page);
  await tapBoard(page, enemy.cell);
  await expect(page.locator('#battle-radial')).toBeVisible();
  if (await page.locator('#battle-radial-special').isDisabled()) {
    await page.locator('#battle-radial-hub').click();
    return;
  }
  await page.locator('#battle-radial-special').click();
  await expect(page.locator('#battle-radial-sub')).toBeHidden();
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  const after = await session(page);
  expect(after.state.commandCount).toBeGreaterThan(current.state.commandCount);
});

test('radial hold release on the hub commits the default move in one step', async ({ page }) => {
  await ready(page);
  const { cell, current } = await reachableEmpty(page);
  await holdAt(page, await boardPoint(page, cell));
  await expect(page.locator('#battle-radial')).toBeVisible();
  await page.mouse.up();
  await expect(page.locator('#battle-radial')).toBeHidden();
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  const after = await session(page);
  expect(after.state.commandCount).toBeGreaterThan(current.state.commandCount);
  expect(after.replay.commands.some(command => command.type === 'move')).toBe(true);
});

test('plan move slice reopens the radial at the chosen tile', async ({ page }) => {
  await ready(page);
  const { cell, current } = await reachableEmpty(page);
  await tapBoard(page, cell);
  await expect(page.locator('#battle-radial-plan')).toBeEnabled();
  await page.locator('#battle-radial-plan').click();
  await expect(page.locator('#battle-radial')).toBeHidden();
  await tapBoard(page, cell);
  await expect(page.locator('#battle-radial')).toBeVisible();
  await expect(page.locator('#battle-radial-attack')).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(page.locator('#battle-radial')).toBeHidden();
  const after = await session(page);
  expect(after.state).toEqual(current.state);
  expect(after.state.rng).toEqual(current.state.rng);
  expect(after.replay.commands).toEqual(current.replay.commands);
});

test('undo and danger remain reachable beside the radial End turn control', async ({ page }) => {
  await ready(page);
  const { cell } = await reachableEmpty(page);
  await tapBoard(page, cell);
  await expect(page.locator('#battle-radial')).toBeVisible();
  await page.locator('#battle-radial-move').click();
  await expect(page.locator('#battle-undo')).toBeEnabled();
  const before = await session(page);
  await page.locator('#battle-undo').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  const undone = await session(page);
  expect(undone.state.rng).toEqual(before.state.rng);
  const danger = page.locator('#battle-danger');
  await danger.click();
  await expect(danger).toHaveAttribute('aria-pressed', 'true');
  await danger.click();
  await expect(danger).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#battle-overflow summary').click();
  await expect(page.locator('#battle-party')).toBeVisible();
  await expect(page.locator('#battle-log-open')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Auto', exact: true })).toBeVisible();
});

test('prefers-reduced-motion skips the hold timer and still opens via tap fallback', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  const { cell } = await reachableEmpty(page);
  await tapBoard(page, cell);
  await expect(page.locator('#battle-radial')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#battle-radial')).toBeHidden();
});

test('orientation change keeps the radial End turn control usable', async ({ page }) => {
  await ready(page);
  const viewport = page.viewportSize()!;
  await page.setViewportSize({ width: Math.max(viewport.height, 700), height: Math.min(viewport.width, 420) });
  await expect(page.locator('#battle-next')).toBeVisible();
  const box = (await page.locator('#battle-next').boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(48);
  const { cell } = await reachableEmpty(page);
  await tapBoard(page, cell);
  await expect(page.locator('#battle-radial')).toBeVisible();
  await page.keyboard.press('Escape');
});

test('radial labels stay on one line without overflowing', async ({ page }) => {
  await ready(page);
  const { cell } = await reachableEmpty(page);
  await tapBoard(page, cell);
  await expect(page.locator('#battle-radial')).toBeVisible();
  expect(await radialLabelProblems(page)).toEqual([]);
  await page.locator('#battle-radial-move').click();
  await expect(page.locator('#battle-undo')).toBeEnabled();
  const { enemy } = await livingEnemy(page);
  await tapBoard(page, enemy.cell);
  await expect(page.locator('#battle-radial')).toBeVisible();
  await expect(page.locator('#battle-radial-move')).toBeDisabled();
  expect(await radialLabelProblems(page)).toEqual([]);
  const hub = await page.locator('#battle-radial-hub').innerText();
  expect(hub.toLowerCase().split('\n').filter((line, index, all) => line && all.indexOf(line) !== index)).toEqual([]);
  await page.locator('#battle-radial-hub').click({ position: { x: 44, y: 44 } });
});

test('radial plan specials can be chosen after a destination', async ({ page }) => {
  await ready(page);
  const current = await session(page);
  const actor = current.state.units.find(unit => unit.id === current.state.initiative[current.state.activeIndex])!;
  const reach = previewMovement(current.state, actor.id, catalog);
  if (!reach.ok) throw Error(reach.reason);
  const enemies = current.state.units.filter(unit => unit.side === 'enemy' && unit.hp > 0);
  const abilities = Object.values(catalog.abilities).filter(ability => ability.id !== 'ability:basic_attack' && ability.owners.includes(actor.defId));
  let setup: { dest: { x: number; y: number }; enemy: typeof enemies[number] } | null = null;
  for (const destination of reach.cells.filter(entry => entry.cost > 0)) {
    const occupied = current.state.units.some(unit => unit.hp > 0 && unit.cell.x === destination.cell.x && unit.cell.y === destination.cell.y);
    if (occupied) continue;
    const move = { type: 'move' as const, unitId: actor.id, to: destination.cell };
    for (const ability of abilities) {
      if (ability.kind === 'secondWind') continue;
      for (const enemy of enemies) {
        const command = { type: 'useAbility' as const, unitId: actor.id, abilityId: ability.id, target: { unitId: enemy.id } };
        if (previewTacticalPlan(current.state, move, command, catalog).ok) {
          setup = { dest: destination.cell, enemy };
          break;
        }
      }
      if (setup) break;
    }
    if (setup) break;
  }
  expect(setup).not.toBeNull();
  if (!setup) return;
  await tapBoard(page, setup.dest);
  await page.locator('#battle-radial-plan').click();
  await tapBoard(page, setup.dest);
  await expect(page.locator('#battle-radial')).toBeVisible();
  await expect(page.locator('#battle-radial-special')).toBeEnabled();
  await page.locator('#battle-radial-special').click();
  const sub = page.locator('#battle-radial-sub');
  if (await sub.isVisible()) await sub.locator('button').first().click();
  await expect(page.locator('#battle-radial')).toBeHidden();
  await tapBoard(page, setup.enemy.cell);
  await expect.poll(async () => (await session(page)).state.commandCount).toBeGreaterThan(current.state.commandCount);
});

test('radial special tap waits for a sub-ring choice after pointerenter', async ({ page }) => {
  await ready(page);
  const { enemy, current } = await livingEnemy(page);
  await tapBoard(page, enemy.cell);
  await expect(page.locator('#battle-radial')).toBeVisible();
  const special = page.locator('#battle-radial-special');
  if (await special.isDisabled()) {
    await page.locator('#battle-radial-hub').click();
    return;
  }
  await special.dispatchEvent('pointerenter');
  await special.click();
  const sub = page.locator('#battle-radial-sub');
  if (await sub.isVisible()) {
    expect((await session(page)).state.commandCount).toBe(current.state.commandCount);
    expect((await session(page)).pending).toBeNull();
    await expect(page.locator('#battle-radial')).toBeVisible();
    await sub.locator('button').first().click();
  }
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  const after = await session(page);
  expect(after.state.commandCount).toBeGreaterThan(current.state.commandCount);
});

test('radial hold aiming continues when a slice leaves the board region', async ({ page }) => {
  await ready(page);
  const { cell } = await reachableEmpty(page);
  const origin = await boardPoint(page, cell);
  await holdAt(page, origin);
  await expect(page.locator('#battle-radial')).toBeVisible();
  const dock = (await page.locator('#battle-next').boundingBox())!;
  await page.mouse.move(dock.x + dock.width / 2, dock.y + dock.height / 2);
  await expect(page.locator('#battle-radial')).toBeVisible();
  await page.mouse.up();
});

test('combat controls persist Radial across a reload', async ({ page }) => {
  await ready(page);
  expect(await page.evaluate(key => localStorage.getItem(key), COMBAT_CONTROLS_KEY)).toBe('radial');
  await page.locator('#battle-overflow summary').click();
  await page.getByRole('radio', { name: 'Auto', exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), COMBAT_CONTROLS_KEY)).toBe('auto');
  await page.reload();
  await page.locator('#save-continue').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  expect(await page.evaluate(key => localStorage.getItem(key), COMBAT_CONTROLS_KEY)).toBe('auto');
});

test('radial hold dismisses when a second touch lands on the overlay', async ({ page }) => {
  await ready(page);
  const {cell,current}=await reachableEmpty(page);
  await holdAt(page,await boardPoint(page,cell));
  await expect(page.locator('#battle-radial')).toBeVisible();
  await page.locator('#battle-radial-hub').dispatchEvent('pointerdown', {
    pointerId:42,pointerType:'touch',button:0,isPrimary:false,bubbles:true,
  });
  await expect(page.locator('#battle-radial')).toBeHidden();
  await page.mouse.up();
  const after=await session(page);
  expect(after.state).toEqual(current.state);
  expect(after.state.rng).toEqual(current.state.rng);
  expect(after.replay.commands).toEqual(current.replay.commands);
  expect(after.pending).toBeNull();
  await tapBoard(page,cell);
  await expect(page.locator('#battle-radial')).toBeVisible();
});

test('radial hold dismisses on a native second touch over the overlay', async ({page,browserName,isMobile}) => {
  test.skip(browserName !== 'chromium' || !isMobile, 'Chromium touch emulation uses CDP; other profiles cover overlay interruption separately.');
  await ready(page);
  const {cell,current}=await reachableEmpty(page);
  const origin=await boardPoint(page,cell);
  const cdp=await page.context().newCDPSession(page);
  const first={x:origin.x,y:origin.y,id:1};
  try {
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first]});
    await expect(page.locator('#battle-radial')).toBeVisible();
    const hub=(await page.locator('#battle-radial-hub').boundingBox())!;
    const second={x:hub.x+hub.width/2,y:hub.y+hub.height/2,id:2};
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first,second]});
    await expect(page.locator('#battle-radial')).toBeHidden();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[second]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    const after=await session(page);
    expect(after.state).toEqual(current.state);
    expect(after.state.rng).toEqual(current.state.rng);
    expect(after.replay.commands).toEqual(current.replay.commands);
    expect(after.pending).toBeNull();
    await tapBoard(page,cell);
    await expect(page.locator('#battle-radial')).toBeVisible();
  } finally { await cdp.detach(); }
});

test('radial invalid reselection clears the previous command before switching to rail', async ({page}) => {
  await page.setViewportSize({width:412,height:915});
  await ready(page);
  const current=await session(page);
  const actor=current.state.units.find(unit=>unit.id===current.state.initiative[current.state.activeIndex])!;
  const reach=previewMovement(current.state,actor.id,catalog);
  if(!reach.ok) throw Error(reach.reason);
  const enemy=current.state.units.find(unit=>unit.side==='enemy' && unit.hp>0)!;
  const enemyPoint=await boardPoint(page,enemy.cell);
  let destination: {x:number;y:number}|null=null;
  for(const entry of reach.cells.filter(entry=>entry.cost>0)) {
    const point=await boardPoint(page,entry.cell);
    if(Math.hypot(point.x-enemyPoint.x,point.y-enemyPoint.y)>200) {destination=entry.cell;break;}
  }
  expect(destination).not.toBeNull();
  if(!destination) throw Error('No reachable tile far enough from the enemy');
  await tapBoard(page,destination);
  await expect.poll(async()=> (await session(page)).pending).toMatchObject({type:'move',to:destination});
  await tapBoard(page,enemy.cell);
  await expect(page.locator('#battle-target-info')).toContainText('Goblin');
  await expect(page.locator('#battle-radial-attack')).toBeDisabled();
  expect((await session(page)).pending).toBeNull();
  await page.evaluate(()=>{delete (globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls;});
  await page.locator('#battle-overflow summary').click();
  await page.getByRole('radio',{name:'Rail',exact:true}).click();
  await expect(page.locator('#battle-review')).toBeDisabled();
  expect((await session(page)).state).toEqual(current.state);
  expect((await session(page)).replay.commands).toEqual(current.replay.commands);
});

test('radial switching to rail preserves a valid unchanged selection', async ({page}) => {
  await ready(page);
  const {cell}=await reachableEmpty(page);
  await tapBoard(page,cell);
  const prepared=(await session(page)).pending;
  expect(prepared).toMatchObject({type:'move',to:cell});
  await page.evaluate(()=>{delete (globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls;});
  await page.locator('#battle-overflow summary').click();
  await page.getByRole('radio',{name:'Rail',exact:true}).click();
  await expect(page.locator('#battle-review')).toBeEnabled();
  expect((await session(page)).pending).toEqual(prepared);
});

test('radial plan cancellation stays available while choosing a destination or target', async ({page}) => {
  const initial=page.viewportSize()!;
  if(initial.width<initial.height) await page.setViewportSize({width:320,height:568});
  await ready(page);
  const {cell,current}=await reachableEmpty(page);
  const cancel=page.getByRole('button',{name:'Cancel plan'});
  await expect(cancel).toBeHidden();
  for(const stage of ['destination','target'] as const) {
    await tapBoard(page,cell);
    await expect(page.locator('#battle-radial')).toBeVisible();
    await page.locator('#battle-radial-plan').click();
    await expect(page.locator('#battle-radial')).toBeHidden();
    await expect(cancel).toBeVisible();
    if(stage==='target') {
      await tapBoard(page,cell);
      await expect(page.locator('#battle-radial')).toBeVisible();
      await expect(cancel).toBeHidden();
      await page.locator('#battle-radial-attack').click();
      await expect(page.locator('#battle-radial')).toBeHidden();
      await expect(page.locator('#battle-preview')).toContainText('Tap an enemy');
      await expect(cancel).toBeVisible();
    }
    const box=(await cancel.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    const viewport=page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x+box.width).toBeLessThanOrEqual(viewport.width);
    expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);
    if(test.info().project.use.hasTouch) await cancel.tap();
    else { await cancel.focus(); await page.keyboard.press('Enter'); }
    await expect(cancel).toBeHidden();
    const after=await session(page);
    expect(after.state).toEqual(current.state);
    expect(after.state.rng).toEqual(current.state.rng);
    expect(after.replay.commands).toEqual(current.replay.commands);
    expect(after.pending).toBeNull();
    await tapBoard(page,cell);
    await expect(page.locator('#battle-radial-move')).toBeEnabled();
    await page.locator('#battle-radial-hub').click();
  }
});

test('radial compact landscape fits controls and keeps tap and hold usable', async ({page}) => {
  await page.setViewportSize({width:568,height:300});
  await ready(page);
  const {cell,current}=await reachableEmpty(page);
  await tapBoard(page,cell);
  await expect(page.locator('#battle-radial')).toBeVisible();
  for(const slice of await page.locator('#battle-radial [data-slice]').all()) {
    const box=(await slice.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x+box.width).toBeLessThanOrEqual(568);
    expect(box.y+box.height).toBeLessThanOrEqual(300);
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  expect(await radialLabelProblems(page)).toEqual([]);
  const plan=page.locator('#battle-radial-plan');
  if(test.info().project.use.hasTouch) await plan.tap(); else await plan.click();
  const cancel=page.getByRole('button',{name:'Cancel plan'});
  await expect(cancel).toBeVisible();
  if(test.info().project.use.hasTouch) await cancel.tap(); else await cancel.click();
  expect((await session(page)).state).toEqual(current.state);
  await holdAt(page,await boardPoint(page,cell));
  await expect(page.locator('#battle-radial')).toBeVisible();
  await page.mouse.up();
  await expect.poll(async()=> (await session(page)).state.commandCount).toBeGreaterThan(current.state.commandCount);
});
