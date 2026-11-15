import { expect, test, type Page } from '@playwright/test';
import { session, readSession, tapBoard, boardPoint, combatSkin } from './helpers/battlePolicy';
import { BATTLE_STORAGE_KEYS } from '../src/persistence/battleStorage';
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
      const text = document.createRange();
      text.selectNodeContents(el);
      const overflow = text.getBoundingClientRect().width > el.clientWidth;
      if (overflow) issues.push(`overflow ${el.scrollWidth}>${el.clientWidth} @${style.fontSize}: ${el.textContent}`);
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

test('keyboard-only shortcuts aim radial movement before one explicit confirmation',async({page})=>{
  await ready(page);
  const {actor,cell,current}=await reachableEmpty(page);
  await page.locator('canvas').focus();
  for(let x=actor.cell.x;x!==cell.x;x+=Math.sign(cell.x-x))await page.keyboard.press(cell.x>x?'ArrowRight':'ArrowLeft');
  for(let y=actor.cell.y;y!==cell.y;y+=Math.sign(cell.y-y))await page.keyboard.press(cell.y>y?'ArrowDown':'ArrowUp');
  await page.keyboard.press('m');
  await expect(page.locator('#battle-radial-move')).toBeFocused();
  await expect(page.locator('#battle-radial-hub')).toContainText('Move');
  expect((await session(page)).state).toEqual(current.state);
  await page.screenshot({path:test.info().outputPath('keyboard-radial-move.png')});
  await page.keyboard.press('c');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const moved=await session(page);
  expect(moved.state.commandCount).toBe(current.state.commandCount+1);
  expect(moved.state.units.find(u=>u.id===actor.id)!.cell).toEqual(cell);
  await page.keyboard.press('m');await page.keyboard.press('c');
  expect((await session(page)).state).toEqual(moved.state);
});

test('keyboard-only shortcuts leave held radial gestures and skin changes under existing control',async({page})=>{
  await ready(page);
  const {cell,current}=await reachableEmpty(page);
  await holdAt(page,await boardPoint(page,cell));
  await expect(page.locator('#battle-radial')).toBeVisible();
  await page.keyboard.press('m');await page.keyboard.press('c');
  expect((await session(page)).state).toEqual(current.state);
  await page.keyboard.press('Escape');await page.mouse.up();
  expect((await session(page)).state).toEqual(current.state);
  await tapBoard(page,cell);await page.keyboard.press('m');
  await expect(page.locator('#battle-radial-move')).toBeFocused();
  await page.evaluate(()=>{
    (globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls='rail';
    globalThis.dispatchEvent(new Event('combat-controls-change'));
  });
  await expect(page.locator('#battle-radial')).toBeHidden();
  await expect(page.locator('#battle-review')).toBeDisabled();
  await page.locator('canvas').focus();await page.keyboard.press('c');
  expect((await session(page)).state).toEqual(current.state);
});

test('radial tap fallback is dismissed without a command when the page is hidden', async ({ page }) => {
  await ready(page);
  const { cell, current } = await reachableEmpty(page);
  await tapBoard(page, cell);
  await expect(page.locator('#battle-radial')).toBeVisible();
  expect((await session(page)).pending).toMatchObject({ type: 'move', to: cell });
  for (const hidden of [true, false]) {
    await page.evaluate(value => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => value });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value ? 'hidden' : 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
    await expect(page.locator('#battle-radial')).toBeHidden();
  }
  const after = await session(page);
  expect(after.pending).toBeNull();
  expect(after.state).toEqual(current.state);
  expect(after.replay.commands).toEqual(current.replay.commands);
  await tapBoard(page, cell);
  await expect(page.locator('#battle-radial-move')).toHaveAttribute('aria-pressed', 'true');
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

test('radial hold on an unavailable slice dismisses without committing', async ({ page }) => {
  await ready(page);
  const { cell, current } = await reachableEmpty(page);
  await holdAt(page, await boardPoint(page, cell));
  const attack = page.locator('#battle-radial-attack');
  await expect(attack).toBeDisabled();
  const box = (await attack.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.up();
  await expect(page.locator('#battle-radial')).toBeHidden();
  const after = await session(page);
  expect(after.pending).toBeNull();
  expect(after.state).toEqual(current.state);
  expect(after.replay.commands).toEqual(current.replay.commands);
  await tapBoard(page, cell);
  await expect(page.locator('#battle-radial-move')).toBeEnabled();
});

test('radial hold accepts a planned destination and opens the follow-up choices', async ({ page }) => {
  await ready(page);
  const { cell, current } = await reachableEmpty(page);
  await tapBoard(page, cell);
  await page.locator('#battle-radial-plan').click();
  await holdAt(page, await boardPoint(page, cell));
  await expect(page.locator('#battle-radial')).toBeHidden();
  await page.mouse.up();
  await expect(page.locator('#battle-radial')).toBeVisible();
  await expect(page.locator('#battle-radial-attack')).toHaveAttribute('aria-pressed', 'true');
  const after = await session(page);
  expect(after.pending).toBeNull();
  expect(after.state).toEqual(current.state);
  expect(after.replay.commands).toEqual(current.replay.commands);
  await page.locator('#battle-radial-attack').click();
  await expect(page.locator('#battle-preview')).toContainText('Tap an enemy');
});

test('radial hold handles unavailable slices and planned destinations with native touch', async ({ page, browserName, isMobile }) => {
  test.skip(browserName !== 'chromium' || !isMobile, 'Native touch holds use Chromium CDP.');
  await ready(page);
  const { cell, current } = await reachableEmpty(page);
  const origin = await boardPoint(page, cell);
  const cdp = await page.context().newCDPSession(page);
  const touch = async (type: 'touchStart' | 'touchMove', point: {x:number; y:number}) => {
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [{ ...point, id: 1 }] });
  };
  const lift = async () => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
  try {
    await touch('touchStart', origin);
    await expect(page.locator('#battle-radial')).toBeVisible();
    const box = (await page.locator('#battle-radial-attack').boundingBox())!;
    await touch('touchMove', { x: box.x + box.width / 2, y: box.y + box.height / 2 });
    await lift();
    await expect(page.locator('#battle-radial')).toBeHidden();
    expect((await session(page)).pending).toBeNull();
    await tapBoard(page, cell);
    await page.locator('#battle-radial-plan').tap();
    await touch('touchStart', await boardPoint(page, cell));
    await page.waitForTimeout(350);
    await lift();
    await expect(page.locator('#battle-radial-attack')).toHaveAttribute('aria-pressed', 'true');
    const after = await session(page);
    expect(after.state).toEqual(current.state);
    expect(after.replay.commands).toEqual(current.replay.commands);
    await page.locator('#battle-radial-attack').tap();
    await expect(page.locator('#battle-preview')).toContainText('Tap an enemy');
  } finally { await cdp.detach(); }
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
  const resized={ width: Math.max(viewport.height, 700), height: Math.min(viewport.width, 420) };
  await page.setViewportSize(resized);
  await expect.poll(async()=>JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!).viewport).toEqual(resized);
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
  const bounds = await page.locator('#battle-board-region').boundingBox();
  const radial = (await page.locator('#battle-radial').boundingBox())!;
  if (bounds && bounds.width >= radial.width + 4 && bounds.height >= radial.height + 100) {
    expect(radial.x).toBeGreaterThanOrEqual(bounds.x);
    expect(radial.x + radial.width).toBeLessThanOrEqual(bounds.x + bounds.width);
    expect(radial.y).toBeGreaterThanOrEqual(bounds.y);
    const plan = (await page.locator('#battle-radial-plan').boundingBox())!;
    expect(plan.y + plan.height).toBeLessThanOrEqual(bounds.y + bounds.height);
  }
  await page.screenshot({ path: test.info().outputPath('radial-labels.png') });
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

for(const keyboard of [false,true])test(keyboard?'keyboard-only shortcuts retain radial plan specials and follow-up confirmation':'radial plan specials can be chosen after a destination', async ({ page }) => {
  await ready(page);
  const current = await session(page);
  const actor = current.state.units.find(unit => unit.id === current.state.initiative[current.state.activeIndex])!;
  const reach = previewMovement(current.state, actor.id, catalog);
  if (!reach.ok) throw Error(reach.reason);
  const enemies = current.state.units.filter(unit => unit.side === 'enemy' && unit.hp > 0);
  const abilities = Object.values(catalog.abilities).filter(ability => ability.id !== 'ability:basic_attack' && ability.owners.includes(actor.defId));
  let setup: { dest: { x: number; y: number }; enemy: typeof enemies[number]; abilityId: string } | null = null;
  for (const destination of reach.cells.filter(entry => entry.cost > 0)) {
    const occupied = current.state.units.some(unit => unit.hp > 0 && unit.cell.x === destination.cell.x && unit.cell.y === destination.cell.y);
    if (occupied) continue;
    const move = { type: 'move' as const, unitId: actor.id, to: destination.cell };
    for (const ability of abilities) {
      if (ability.kind === 'secondWind') continue;
      for (const enemy of enemies) {
        const command = { type: 'useAbility' as const, unitId: actor.id, abilityId: ability.id, target: { unitId: enemy.id } };
        if (previewTacticalPlan(current.state, move, command, catalog).ok) {
          setup = { dest: destination.cell, enemy, abilityId: ability.id };
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
  if(keyboard){
    const ids=await page.locator('#battle-ability option').evaluateAll(options=>options.map(option=>(option as HTMLOptionElement).value));
    await page.keyboard.press(String(ids.indexOf(setup.abilityId)+1));
    expect((await session(page)).state).toEqual(current.state);
    await page.keyboard.press('c');
    expect((await session(page)).state).toEqual(current.state);
  }else{
    await page.locator('#battle-radial-special').click();
    const sub = page.locator('#battle-radial-sub');
    if (await sub.isVisible()) await sub.locator('button').first().click();
  }
  await expect(page.locator('#battle-radial')).toBeHidden();
  await tapBoard(page, setup.enemy.cell);
  await expect.poll(async () => (await session(page)).state.commandCount).toBeGreaterThan(current.state.commandCount);
  if(keyboard){
    await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    expect((await session(page)).state.commandCount).toBe(current.state.commandCount+2);
  }
});

test('radial special tap waits for a sub-ring choice after hovering', async ({ page }) => {
  await ready(page);
  const { enemy, current } = await livingEnemy(page);
  await tapBoard(page, enemy.cell);
  await expect(page.locator('#battle-radial')).toBeVisible();
  const special = page.locator('#battle-radial-special');
  if (await special.isDisabled()) {
    await page.locator('#battle-radial-hub').click();
    return;
  }
  await special.hover();
  await expect(special).toHaveAttribute('aria-pressed', 'true');
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
  const fresh=(await session(page)).state;
  expect(await page.evaluate(key => localStorage.getItem(key), COMBAT_CONTROLS_KEY)).toBe('radial');
  await page.locator('#battle-overflow summary').click();
  await page.getByRole('radio', { name: 'Auto', exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), COMBAT_CONTROLS_KEY)).toBe('auto');
  await page.reload();
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  await expect(page.locator('#save-continue')).toHaveCount(0);
  expect((await session(page)).state).toEqual(fresh);
  expect(await page.evaluate(key => localStorage.getItem(key), COMBAT_CONTROLS_KEY)).toBe('auto');
});

test.describe('radial session boundary',()=>{
  test('radial menu battle starts fresh on reload',async({page})=>{
    await page.goto('./');await page.getByRole('link',{name:'Standalone battle',exact:true}).click();
    await expect(page.locator('#game')).toHaveAttribute('data-phase','player');await expect.poll(()=>combatSkin(page)).toBe('radial');
    const initial=(await readSession(page)).state;
    await page.getByRole('button',{name:'End turn',exact:true}).click();
    await expect.poll(async()=>(await readSession(page)).state.commandCount).toBeGreaterThan(initial.commandCount);
    await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    const primary=await page.evaluate(key=>localStorage.getItem(key),BATTLE_STORAGE_KEYS.primary);expect(primary).toBeNull();
    await page.reload();await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    expect((await readSession(page)).state).toEqual(initial);
    expect(await page.evaluate(key=>localStorage.getItem(key),BATTLE_STORAGE_KEYS.primary)).toBe(primary);
  });
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

test('radial tap fallback dialog dismissal clears the prepared action', async ({page}) => {
  await ready(page);
  const {cell,current}=await reachableEmpty(page);
  await tapBoard(page,cell);
  expect((await session(page)).pending).toMatchObject({type:'move',to:cell});
  await page.locator('#battle-overflow summary').click();
  await page.locator('#battle-log-open').click();
  await expect(page.locator('#battle-radial')).toBeHidden();
  await page.locator('#log-close').click();
  expect((await session(page)).pending).toBeNull();
  await page.evaluate(()=>{delete (globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls;});
  await page.getByRole('radio',{name:'Rail',exact:true}).click();
  await expect(page.locator('#battle-review')).toBeDisabled();
  await page.locator('#battle-move').click();
  await expect(page.locator('#battle-review')).toBeDisabled();
  expect((await session(page)).pending).toBeNull();
  await page.locator('#battle-target').selectOption(`${cell.x},${cell.y}`);
  await expect(page.locator('#battle-review')).toBeEnabled();
  expect((await session(page)).pending).toMatchObject({type:'move',to:cell});
  const after=await session(page);
  expect(after.state).toEqual(current.state);
  expect(after.replay.commands).toEqual(current.replay.commands);
});

test('radial tap fallback inspect clears the prepared action', async ({page}) => {
  await ready(page);
  const {cell,current}=await reachableEmpty(page);
  await tapBoard(page,cell);
  expect((await session(page)).pending).toMatchObject({type:'move',to:cell});
  await page.locator('#battle-radial-inspect').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('#inspection-close').click();
  const after=await session(page);
  expect(after.pending).toBeNull();
  expect(after.state).toEqual(current.state);
  expect(after.replay.commands).toEqual(current.replay.commands);
});

test('radial switching to rail applies for the page when saving fails', async ({page}) => {
  await ready(page);
  await page.evaluate(key=>{
    delete (globalThis as {__tacticsGuruCombatControls?:string}).__tacticsGuruCombatControls;
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(name,value){if(name===key)throw new Error('storage unavailable');original.call(this,name,value);};
  },COMBAT_CONTROLS_KEY);
  await page.locator('#battle-overflow summary').click();
  await page.getByRole('radio',{name:'Rail',exact:true}).click();
  await expect.poll(()=>combatSkin(page)).toBe('rail');
  await expect(page.getByRole('radio',{name:'Rail',exact:true})).toBeChecked();
  await expect(page.locator('[data-combat-controls] [role="status"]')).toContainText('choice applies until you leave the page');
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

for (const height of [300, 234]) test(`radial compact landscape fits controls and keeps tap and hold usable at ${height}px`, async ({page}) => {
  await page.setViewportSize({width:568,height});
  await ready(page);
  const {cell,current}=await reachableEmpty(page);
  await tapBoard(page,cell);
  await expect(page.locator('#battle-radial')).toBeVisible();
  for(const slice of await page.locator('#battle-radial [data-slice]').all()) {
    const box=(await slice.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x+box.width).toBeLessThanOrEqual(568);
    expect(box.y+box.height).toBeLessThanOrEqual(height);
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


test('radial compact hold can inspect at the inner edge of the slice', async ({page}) => {
  await page.setViewportSize({width:568,height:234});
  await ready(page);
  const {cell,current}=await reachableEmpty(page);
  await holdAt(page,await boardPoint(page,cell));
  await expect(page.locator('#battle-radial')).toBeVisible();
  const move=(await page.locator('#battle-radial-move').boundingBox())!;
  await page.mouse.move(move.x+move.width/2,move.y+move.height/2);
  const inspect=page.locator('#battle-radial-inspect');
  const box=(await inspect.boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+1);
  await expect(inspect).toHaveAttribute('aria-pressed','true');
  await page.mouse.up();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect((await session(page)).state.commandCount).toBe(current.state.commandCount);
});

test('radial resize dismisses an open tap menu without committing or stranding it', async ({page}) => {
  await page.setViewportSize({width:915,height:412});
  await ready(page);
  const current=await session(page);
  const board=(await page.locator('#battle-board-region').boundingBox())!;
  const map=catalog.maps[current.state.mapId];
  let cell:{x:number;y:number}|null=null;
  for(const tile of map.cells) {
    const p=await boardPoint(page,tile);
    if(p.x>460 && p.x<board.x+board.width-10 && p.y>board.y+10 && p.y<board.y+board.height-10){cell=tile;break;}
  }
  expect(cell).not.toBeNull();
  if(!cell) throw Error('No selectable cell near the right edge');
  await tapBoard(page,cell);
  await expect(page.locator('#battle-radial')).toBeVisible();
  const hub=(await page.locator('#battle-radial-hub').boundingBox())!;
  expect(hub.x).toBeGreaterThan(412);
  const resized={width:412,height:915};
  await page.setViewportSize(resized);
  await expect.poll(async()=>JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!).viewport).toEqual(resized);
  await expect(page.locator('#battle-radial')).toBeHidden();
  const after=await session(page);
  expect(after.state).toEqual(current.state);
  expect(after.state.rng).toEqual(current.state.rng);
  expect(after.replay.commands).toEqual(current.replay.commands);
  expect(after.pending).toBeNull();
  const next=await reachableEmpty(page);
  await tapBoard(page,next.cell);
  await expect(page.locator('#battle-radial')).toBeVisible();
  const reopened=(await page.locator('#battle-radial-hub').boundingBox())!;
  expect(reopened.x).toBeGreaterThanOrEqual(0);
  expect(reopened.x+reopened.width).toBeLessThanOrEqual(resized.width);
});

test('radial resize cancels a held gesture and ignores the trailing release', async ({page}) => {
  await page.setViewportSize({width:915,height:412});
  await ready(page);
  const {cell,current}=await reachableEmpty(page);
  await holdAt(page,await boardPoint(page,cell));
  await expect(page.locator('#battle-radial')).toBeVisible();
  expect((await session(page)).pending).toMatchObject({type:'move',to:cell});
  const resized={width:412,height:915};
  await page.setViewportSize(resized);
  await expect.poll(async()=>JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!).viewport).toEqual(resized);
  await expect(page.locator('#battle-radial')).toBeHidden();
  await page.mouse.up();
  const after=await session(page);
  expect(after.state).toEqual(current.state);
  expect(after.state.rng).toEqual(current.state.rng);
  expect(after.replay.commands).toEqual(current.replay.commands);
  expect(after.pending).toBeNull();
});

test('radial stays open on a layout reflow without a viewport resize', async ({page}) => {
  await page.setViewportSize({width:1000,height:800});
  await ready(page);
  const {cell}=await reachableEmpty(page);
  await tapBoard(page,cell);
  await expect(page.locator('#battle-radial')).toBeVisible();
  const pending=(await session(page)).pending;
  expect(pending).toMatchObject({type:'move',to:cell});
  const caption=page.locator('#battle-board-caption');
  const board=page.locator('#battle-board-region');
  const plan=page.locator('#battle-radial-plan');
  const originalPlan=(await plan.boundingBox())!;
  await caption.evaluate(node=>{node.style.paddingTop='60px';});
  await expect.poll(async()=> {
    const bounds=(await board.boundingBox())!;
    return bounds.y+bounds.height;
  }).toBeLessThan(originalPlan.y+originalPlan.height);
  const bounds=(await board.boundingBox())!;
  expect(bounds.height).toBeGreaterThan(320);
  await expect.poll(async()=> {
    const box=(await plan.boundingBox())!;
    return box.y+box.height;
  }).toBeLessThanOrEqual(bounds.y+bounds.height);
  await expect(page.locator('#battle-radial')).toBeVisible();
  expect((await session(page)).pending).toEqual(pending);
});


test('radial resize cancels an unconfirmed plan when its menu is open', async ({page}) => {
  await page.setViewportSize({width:915,height:412});
  await ready(page);
  const {cell,current}=await reachableEmpty(page);
  await tapBoard(page,cell);
  const plan=page.locator('#battle-radial-plan');
  if(test.info().project.use.hasTouch) await plan.tap(); else await plan.click();
  await tapBoard(page,cell);
  await expect(page.locator('#battle-radial')).toBeVisible();
  await expect(page.locator('#battle-radial-attack')).toHaveAttribute('aria-pressed','true');
  const resized={width:412,height:915};
  await page.setViewportSize(resized);
  await expect.poll(async()=>JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!).viewport).toEqual(resized);
  await expect(page.locator('#battle-radial')).toBeHidden();
  await expect(page.getByRole('button',{name:'Cancel plan'})).toBeHidden();
  const after=await session(page);
  expect(after.state).toEqual(current.state);
  expect(after.state.rng).toEqual(current.state.rng);
  expect(after.replay.commands).toEqual(current.replay.commands);
  expect(after.pending).toBeNull();
  const next=await reachableEmpty(page);
  await tapBoard(page,next.cell);
  await expect(page.locator('#battle-radial-move')).toHaveAttribute('aria-pressed','true');
});

test('radial resize cancels a native touch hold without accepting a command', async ({page,browserName,isMobile}) => {
  test.skip(browserName!=='chromium' || !isMobile, 'Chromium native touch uses CDP; other profiles cover the resize path separately.');
  await page.setViewportSize({width:915,height:412});
  await ready(page);
  const {cell,current}=await reachableEmpty(page);
  const origin=await boardPoint(page,cell);
  const cdp=await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:origin.x,y:origin.y,id:1}]});
    await expect(page.locator('#battle-radial')).toBeVisible();
    const resized={width:412,height:915};
    await page.setViewportSize(resized);
    await expect.poll(async()=>JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!).viewport).toEqual(resized);
    await expect(page.locator('#battle-radial')).toBeHidden();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    const after=await session(page);
    expect(after.state).toEqual(current.state);
    expect(after.replay.commands).toEqual(current.replay.commands);
    expect(after.pending).toBeNull();
  } finally { await cdp.detach(); }
});


test('radial preference replaces the side rail with a bottom dock at 1280x720', {tag:'@fixed-viewport'}, async ({ page }) => {
  await page.setViewportSize({width:1280,height:720});
  await ready(page);
  const board = (await page.locator('#battlefield').boundingBox())!;
  const dock = (await page.locator('#fit-panel').boundingBox())!;
  expect(dock.y).toBeGreaterThanOrEqual(board.y + board.height);
  expect(Math.abs(dock.x - board.x)).toBeLessThan(2);
  expect(Math.abs(dock.width - board.width)).toBeLessThan(2);
  await expect(page.locator('[data-action="move"]')).toBeHidden();
  await expect(page.locator('#battle-target')).toBeHidden();
  await expect(page.locator('#battle-next')).toBeVisible();
  const { cell } = await reachableEmpty(page);
  await tapBoard(page, cell);
  await expect(page.locator('#battle-radial-move')).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('radial-dock.png') });
});
