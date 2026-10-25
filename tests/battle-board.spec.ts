import { confirmRestart } from './helpers/battlePolicy';
import { expect, test, type Page } from '@playwright/test';
import { battleCatalog } from '../src/content/catalog';
import { buildBoardPresentation } from '../src/geometry/boardPresentation';
import { MAX_ZOOM, pickTile, screenToBoard } from '../src/geometry/picking';
import { fitBoard, projectTile, tileFaces, type Point } from '../src/geometry/iso';
import { BattleSession } from '../src/app/BattleSession';
import { hoverPreview } from '../src/ui/targetPreview';
import { encodeBattleSave } from '../src/domain/saveEnvelope';
import { BATTLE_STORAGE_KEYS } from '../src/persistence/battleStorage';
import { playerDecision } from './helpers/playerPolicy';
import { unitBounds } from '../src/geometry/canopy';

/** Real accepted seed-1 boundaries, using the same policy as battle/save coverage. */
async function occlusionBoundary(page: Page, count: number) {
  const session = new BattleSession(battleCatalog, 'map:forest_ruins', 1);
  while (session.state.commandCount < count) {
    if (session.phase === 'player') expect(session.prepare(playerDecision(session.state)).ok).toBe(true);
    const step = session.phase === 'player' ? session.confirm() : session.nextEnemy();
    if (!step) throw Error('Occlusion fixture failed to progress');
    session.finishPresentation(step.token);
  }
  expect(session.phase).toBe('player');
  const save = encodeBattleSave(session.state, battleCatalog);
  if (!save.ok) throw Error(save.reason);
  await page.addInitScript(({key, text}) => localStorage.setItem(key, text), {key:BATTLE_STORAGE_KEYS.primary, text:save.text});
  await page.goto('/'); await page.locator('#save-continue').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase', 'player');
  await expect(page).toHaveTitle('Tactics Guru v2');
  await expect(page.locator('#battle-shell')).toBeVisible();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  return session.state;
}

async function boardClick(page:Page, point:Point, touch=false) {
  const r=await settledReport(page),x=r.transform.x+point.x*r.transform.scale,y=r.transform.y+point.y*r.transform.scale;
  if(touch) await page.touchscreen.tap(x,y); else await page.mouse.click(x,y);
}

test('occluded archer exposed art selects the same legal target as the dropdown',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const state=await occlusionBoundary(page,28);
  expect(state.units.find(u=>u.id===5)).toMatchObject({defId:'goblin_archer',cell:{x:3,y:2},hp:8});
  await page.locator('[data-action=signature]').click();
  await page.locator('#battle-target').selectOption('3,2');
  const expected=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
  expect(expected.pending).toMatchObject({type:'useAbility',target:{unitId:5}});
  const preview=await page.locator('#battle-preview').textContent(),saved=await page.evaluate(()=>JSON.stringify(localStorage));
  await page.screenshot({path:info.outputPath('occluded-archer-dropdown.png')});
  // Opaque head pixel (32,18) in the canonical 64x80 sprite, anchored at (32,76).
  // Projected ground center is (40,100); displayed sprite is 40x50.
  await boardClick(page,{x:40,y:63.75},!!info.project.use.hasTouch);
  expect((await report(page)).selected).toEqual({x:3,y:2,elevation:0});
  expect(await page.locator('#battle-preview').textContent()).toBe(preview);
  expect(JSON.parse((await page.locator('#game').getAttribute('data-session'))!)).toEqual(expected);
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(saved);
  await page.screenshot({path:info.outputPath('occluded-archer-map.png')});
  // The body under solid foreground terrain cannot steal the first hit.
  await boardClick(page,{x:40,y:100},!!info.project.use.hasTouch);
  expect((await report(page)).selected).toEqual({x:4,y:3,elevation:2});
  // Transparent pixels in the same sprite rectangle still reach terrain.
  await boardClick(page,{x:21,y:54},!!info.project.use.hasTouch);
  expect((await report(page)).selected).toEqual({x:2,y:1,elevation:0});
  // A visible distant grunt remains unavailable; art picking cannot grant range.
  await page.locator('#battle-target').selectOption('4,6');
  const unavailable=await page.locator('#battle-preview').textContent();
  expect(unavailable).toContain('Unavailable');
  const invalid=await page.locator('#game').getAttribute('data-session');
  await boardClick(page,{x:-80,y:172.5},!!info.project.use.hasTouch);
  expect((await report(page)).selected).toEqual({x:4,y:6,elevation:0});
  expect(await page.locator('#battle-preview').textContent()).toBe(unavailable);
  expect(await page.locator('#game').getAttribute('data-session')).toBe(invalid);
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(saved);
  expect(state.units.find(u=>u.id===6)?.hp).toBe(0);
  // Inside the former grunt's head, clear of the shared (3,8)/(3,9) side edge.
  await boardClick(page,{x:-195,y:223.75},!!info.project.use.hasTouch);
  expect((await report(page)).selected).toEqual({x:3,y:8,elevation:1});
  expect(errors).toEqual([]);
});

test('repeated map selection reaches a legal ground destination behind the same platform',async({page,browserName},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await occlusionBoundary(page,9);
  await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','true');await page.locator('#battle-target').selectOption('3,5');
  const expected=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
  expect(expected.pending).toMatchObject({type:'move',to:{x:3,y:5}});
  const preview=await page.locator('#battle-preview').textContent(),saved=await page.evaluate(()=>JSON.stringify(localStorage));
  const p={x:-77,y:160}; // Inside ground (3,5), clear of touch-rounded diamond edges.
  await boardClick(page,p,!!info.project.use.hasTouch);
  expect((await report(page)).selected).toEqual({x:4,y:5,elevation:2});
  await boardClick(page,p,!!info.project.use.hasTouch);
  expect((await report(page)).selected).toEqual({x:3,y:5,elevation:0});
  expect(await page.locator('#battle-preview').textContent()).toBe(preview);
  expect(JSON.parse((await page.locator('#game').getAttribute('data-session'))!)).toEqual(expected);
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(saved);
  await page.screenshot({path:info.outputPath('occluded-ground-map.png')});
  await expect(page.locator('#battle-board-caption')).toContainText('Overlap 2/2');
  expect(await page.locator('#battle-board-caption').evaluate(node=>{
    const range=document.createRange();range.setStart(node.firstChild!,0);range.setEnd(node.firstChild!,11);
    const text=range.getBoundingClientRect(),box=node.getBoundingClientRect();
    return text.top>=box.top && text.bottom<=box.bottom;
  })).toBe(true); // The cycle hint must be visible without scrolling the compact caption.
  const select=()=>boardClick(page,p,!!info.project.use.hasTouch);
  // Hover never advances the explicitly selected alternate cell.
  const r=await settledReport(page);
  await page.mouse.move(r.transform.x+p.x*r.transform.scale,r.transform.y+p.y*r.transform.scale);
  expect((await report(page)).selected).toEqual({x:3,y:5,elevation:0});
  await select();expect((await report(page)).selected).toEqual({x:4,y:5,elevation:2});
  await select();expect((await report(page)).selected).toEqual({x:3,y:5,elevation:0});
  await page.locator('#battle-target').selectOption('3,5'); // Native control clears overlap history.
  await select();expect((await report(page)).selected).toEqual({x:4,y:5,elevation:2});
  await select();
  await page.locator('#battle-party').click();
  const locked=await report(page);await select();expect((await report(page)).selectionEvents).toBe(locked.selectionEvents);
  await page.locator('#inspection-close').click();
  await select();expect((await report(page)).selected).toEqual({x:4,y:5,elevation:2});
  await select();await page.locator('canvas').focus();await page.keyboard.press('Enter');
  expect((await report(page)).selected).toEqual({x:3,y:5,elevation:0});
  await select();expect((await report(page)).selected).toEqual({x:4,y:5,elevation:2});
  // Action changes reset the sequence, and a fresh transformed-camera hit still cycles.
  await page.locator('[data-action=basic]').click();await page.locator('#battle-move').click();
  await select();expect((await report(page)).selected).toEqual({x:4,y:5,elevation:2});
  await select();
  const before=await settledReport(page);
  const x=before.transform.x+p.x*before.transform.scale,y=before.transform.y+p.y*before.transform.scale;
  await page.mouse.move(x,y);
  if(browserName==='webkit'){
    // Mobile WebKit's driver has no wheel API; exercise a real camera drag instead.
    await page.mouse.down();await page.mouse.move(x+16,y+10,{steps:3});await page.mouse.up();
  }else await page.mouse.wheel(0,-100);
  const transformed=await settledReport(page);
  expect(transformed.transform).not.toEqual(before.transform);
  expect(transformed.selectionEvents).toBe(before.selectionEvents);
  await select();expect((await report(page)).selected).toEqual({x:4,y:5,elevation:2});
  await select();expect((await report(page)).selected).toEqual({x:3,y:5,elevation:0});
  expect(JSON.parse((await page.locator('#game').getAttribute('data-session'))!)).toEqual(expected);
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(saved);
  // Only explicit confirmation commits the selected legal move.
  await page.locator('#battle-review').click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const moved=JSON.parse((await page.locator('#game').getAttribute('data-session'))!).state;
  expect(moved.commandCount).toBe(expected.state.commandCount+1);
  expect(moved.units.find((u:any)=>u.id===expected.pending.unitId).cell).toEqual({x:3,y:5});
  expect(errors).toEqual([]);
});

async function report(page: Page) {
  return JSON.parse((await page.locator('#game').getAttribute('data-battle-report'))!);
}

test('completed pen taps keep overlap cycling after leaving hover range',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await occlusionBoundary(page,9);
  await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption('3,5');
  const expected=await page.locator('#game').getAttribute('data-session');
  const saved=await page.evaluate(()=>JSON.stringify(localStorage));
  const preview=await page.locator('#battle-preview').textContent();
  const pen=await page.context().newCDPSession(page);
  const tap=async()=>{
    const r=await settledReport(page),x=r.transform.x-77*r.transform.scale,y=r.transform.y+160*r.transform.scale;
    await pen.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1,pointerType:'pen'});
    await pen.send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',buttons:0,clickCount:1,pointerType:'pen'});
    // Emulate the post-release boundary event of a pen without hover (or leaving hover range).
    await page.locator('canvas').dispatchEvent('pointerleave',{pointerType:'pen',pointerId:2,clientX:x,clientY:y,buttons:0});
  };
  await tap();expect((await report(page)).selected).toEqual({x:4,y:5,elevation:2});
  await tap();expect((await report(page)).selected).toEqual({x:3,y:5,elevation:0});
  expect(await page.locator('#game').getAttribute('data-session')).toBe(expected);
  expect(await page.locator('#battle-preview').textContent()).toBe(preview);
  await page.screenshot({path:info.outputPath('pen-overlap-ground.png')});
  await tap();expect((await report(page)).selected).toEqual({x:4,y:5,elevation:2});
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(saved);
  expect(errors).toEqual([]);
});

test('right-click cancels a prepared move through the existing action path and respects modal locks',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await occlusionBoundary(page,9);await page.locator('#battle-move').click();
  const p={x:-77,y:160};await boardClick(page,p);await boardClick(page,p);
  const prepared=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
  expect(prepared.pending).toEqual({type:'move',unitId:2,to:{x:3,y:5}});
  const saved=await page.evaluate(()=>JSON.stringify(localStorage));
  const rightClick=async()=>{
    const r=await settledReport(page);
    await page.mouse.click(r.transform.x+p.x*r.transform.scale,r.transform.y+p.y*r.transform.scale,{button:'right'});
  };
  await page.locator('#battle-party').click();const locked=await page.locator('#game').getAttribute('data-session');
  await rightClick();await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.locator('#game').getAttribute('data-session')).toBe(locked);
  await page.locator('#inspection-close').click();
  await page.locator('#battle-target').selectOption('3,5');
  await rightClick();
  expect(JSON.parse((await page.locator('#game').getAttribute('data-session'))!)).toEqual({...prepared,pending:null});
  await expect(page.locator('#battle-review')).toBeDisabled();
  await expect(page.locator('#battle-move')).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('#battle-move')).toBeFocused();
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(saved);
  await page.screenshot({path:info.outputPath('right-click-cancelled.png')});
  // A new choice starts at the foreground, with no stale overlap index or held gesture.
  await page.locator('#battle-move').click();await boardClick(page,p);
  expect((await report(page)).selected).toEqual({x:4,y:5,elevation:2});
  expect(errors).toEqual([]);
});

async function settledReport(page: Page) {
  // Let panel layout, ResizeObserver and the next render finish before using coordinates.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))));
  return report(page);
}

test('layout clamping resets overlap history when the actual camera changes',async({page})=>{
  await page.setViewportSize({width:750,height:342});
  await occlusionBoundary(page,9);await page.locator('#battle-move').click();
  const point={x:-77,y:160};
  await boardClick(page,point);
  let r=await settledReport(page);
  await page.mouse.move(r.transform.x+point.x*r.transform.scale,r.transform.y+point.y*r.transform.scale);
  await page.mouse.wheel(0,10000);await settledReport(page); // Minimum zoom for the current caption layout.
  await boardClick(page,point);
  expect((await report(page)).selected).toEqual({x:4,y:5,elevation:2});
  const before=await settledReport(page);
  await page.locator('#battle-board-caption').evaluate(node=>{
    node.style.boxSizing='border-box';node.style.maxHeight=`${node.getBoundingClientRect().height-1}px`;
  });
  await expect.poll(async()=>(await report(page)).transform.scale).toBeGreaterThan(before.transform.scale);
  r=await settledReport(page);
  // This is a real camera change smaller than the repeated-click distance threshold.
  expect(Math.hypot(r.transform.x+point.x*r.transform.scale-before.transform.x-point.x*before.transform.scale,
    r.transform.y+point.y*r.transform.scale-before.transform.y-point.y*before.transform.scale)).toBeLessThan(6);
  await boardClick(page,point);
  expect((await report(page)).selected).toEqual({x:4,y:5,elevation:2});
});

test('hovered origins show only ability reach without changing selection, pending commands or saves',async({page},info)=>{
  await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const initial=await settledReport(page),before=await page.locator('#game').getAttribute('data-session');
  const state=JSON.parse(before!).state,origin={x:11,y:11};
  expect(initial.reachable).not.toContainEqual(origin);
  const saved=await page.evaluate(()=>JSON.stringify(localStorage));
  const hover=async(cell:{x:number;y:number})=>{
    const r=await settledReport(page),tile=r.tiles.find((t:any)=>t.x===cell.x&&t.y===cell.y),p=projectTile(tile);
    await page.mouse.move(r.transform.x+p.x*r.transform.scale,r.transform.y+p.y*r.transform.scale);
  };
  await hover(origin);
  const expectedHover=hoverPreview(new BattleSession(battleCatalog,state,state.seed),origin);
  await expect.poll(async()=>(await report(page)).hover).toEqual(expectedHover);
  expect(expectedHover?.cells).not.toContainEqual(origin);
  expect((await report(page)).reachable).toEqual(initial.reachable);
  await expect(page.locator('#battle-board-caption')).toContainText('Purple dots: ability reach');
  await expect(page.locator('#battle-board-caption')).toContainText('Pink +: target in reach');
  const shown=await settledReport(page);expect(shown.selected).toBeNull();expect(shown.selectionEvents).toBe(initial.selectionEvents);
  expect(await page.locator('#game').getAttribute('data-session')).toBe(before);
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(saved);
  await page.screenshot({path:info.outputPath('hover-movement-range.png')});
  // Screenshot regression: occupied goblin cells must remain in the preview, including Magic Missile reach.
  const mageOrigin={x:4,y:8};
  if(state.units.find((u:any)=>u.id===initial.activeId).defId!=='mage')throw Error('Expected authored opening mage turn');
  await hover(mageOrigin);
  const magePreview=hoverPreview(new BattleSession(battleCatalog,state,state.seed),mageOrigin)!;
  const goblin=state.units.find((u:any)=>u.side==='enemy' && magePreview.targets.some(c=>c.x===u.cell.x&&c.y===u.cell.y));
  expect(goblin).toBeDefined();
  await expect.poll(async()=>(await report(page)).hover?.cells).toContainEqual(goblin.cell);
  await expect.poll(async()=>(await report(page)).hover?.targets).toContainEqual(goblin.cell);
  expect(await page.locator('#game').getAttribute('data-session')).toBe(before);
  await settledReport(page);await page.screenshot({path:info.outputPath('hover-goblin-target.png')});
  await page.mouse.move(1,1);await expect.poll(async()=>(await report(page)).hover).toBeNull();
  await hover(origin);await page.mouse.wheel(0,-100);
  await expect.poll(async()=>(await report(page)).hover).toBeNull();
  await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption({index:1});
  const prepared=await page.locator('#game').getAttribute('data-session'),destination=JSON.parse(prepared!).pending.to;
  await hover(origin);await expect.poll(async()=>(await report(page)).hover?.origin).toEqual(origin);
  expect(await page.locator('#game').getAttribute('data-session')).toBe(prepared);
  await page.mouse.move(1,1);await expect.poll(async()=>(await report(page)).hover?.origin).toEqual(destination);
  await page.locator('#battle-cancel').click();await expect.poll(async()=>(await report(page)).hover).toBeNull();
  // Native destination controls and keyboard navigation expose the same hypothetical-origin query.
  await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption({index:1});
  await expect.poll(async()=>(await report(page)).hover).not.toBeNull();
  const selected=(await report(page)).selected;
  const next=[{key:'ArrowRight',x:selected.x+1,y:selected.y},{key:'ArrowDown',x:selected.x,y:selected.y+1},
    {key:'ArrowLeft',x:selected.x-1,y:selected.y},{key:'ArrowUp',x:selected.x,y:selected.y-1}]
    .find(c=>hoverPreview(new BattleSession(battleCatalog,state,state.seed),{x:c.x,y:c.y}))!;
  await page.locator('canvas').focus();await page.keyboard.press(next.key);
  const navigated=await report(page);expect(navigated.hover?.origin).toMatchObject({x:navigated.selected.x,y:navigated.selected.y});
  // Tab to the native control without pointer movement: its destination must replace the keyboard origin.
  for(let i=0;i<20 && !await page.locator('#battle-target').evaluate(el=>el===document.activeElement);i++)await page.keyboard.press('Tab');
  await expect(page.locator('#battle-target')).toBeFocused();
  await page.locator('#battle-target').selectOption({index:1});
  await expect.poll(async()=>JSON.parse((await page.locator('#game').getAttribute('data-session'))!).pending?.type).toBe('move');
  const nativeSession=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
  expect(nativeSession.pending.type).toBe('move');
  expect(nativeSession.pending.to).not.toEqual(navigated.hover.origin);
  await expect.poll(async()=>(await report(page)).selected).toMatchObject(nativeSession.pending.to);
  await expect.poll(async()=>(await report(page)).hover).toEqual(hoverPreview(new BattleSession(battleCatalog,state,state.seed),nativeSession.pending.to));
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(saved);
  await page.keyboard.press('Escape');await expect.poll(async()=>(await report(page)).hover).toBeNull();
  await hover(origin);await page.locator('#fit-restart').click();await confirmRestart(page);
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');expect((await report(page)).hover).toBeNull();
  expect((await report(page)).objectCount).toBe(initial.objectCount);
});

test('selection labels retain the zoomed and panned camera without gameplay commands', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Battle ready');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const initial = await settledReport(page);
  const local = projectTile({ x: 11, y: 11, elevation: 0 });
  await page.mouse.move(initial.transform.x + local.x * initial.transform.scale, initial.transform.y + local.y * initial.transform.scale);
  await page.mouse.wheel(0, -100);
  await expect.poll(async () => (await report(page)).transform.scale).toBeGreaterThan(initial.transform.scale);
  const zoomed = await settledReport(page);
  const start = { x: zoomed.transform.x + local.x * zoomed.transform.scale, y: zoomed.transform.y + local.y * zoomed.transform.scale };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 50, start.y - 20, { steps: 5 });
  await page.mouse.up();
  const panned = await settledReport(page);
  expect(panned.transform.x).toBeGreaterThan(zoomed.transform.x);
  expect(panned.selectionEvents).toBe(0);
  for (const cell of [{ x: 11, y: 11, elevation: 0 }, null, { x: 5, y: 5, elevation: 2 }, { x: 11, y: 11, elevation: 0 }]) {
    const current = await settledReport(page);
    const point = cell ? projectTile(cell) : { x: 0, y: 0 };
    const screen = cell ? { x: current.transform.x + point.x * current.transform.scale, y: current.transform.y + point.y * current.transform.scale }
      : { x: current.region.x+5, y: current.region.y+current.region.height-5 };
    expect(screen.x).toBeGreaterThanOrEqual(0);
    expect(screen.x).toBeLessThan(current.viewport.width);
    expect(screen.y).toBeGreaterThanOrEqual(0);
    expect(screen.y).toBeLessThan(current.viewport.height);
    expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, screen)).toBe('CANVAS');
    // Clear with a real canvas click outside the board, not a controller shortcut.
    await page.mouse.click(screen.x, screen.y);
    await expect.poll(async () => (await report(page)).selected).toEqual(cell);
    await expect(page.locator('#battle-selection')).toHaveText(cell ? `Selected (${cell.x}, ${cell.y})` : 'Select a tile');
    const after = await settledReport(page);
    expect(after.transform.x).toBeCloseTo(panned.transform.x, 5);
    expect(after.transform.y).toBeCloseTo(panned.transform.y, 5);
    expect(after.transform.scale).toBeCloseTo(panned.transform.scale, 5);
    expect(after.commandCount).toBe(initial.commandCount);
  }
  // Active-unit labels have different lengths too; ending a turn is the only command.
  const activeLabels = new Set<string>();
  for (let turn = 0; turn < initial.units.length; turn++) {
    const beforeCount = (await report(page)).commandCount;
    await page.getByRole('button', { name: 'Wait / End turn' }).click();
    // The renderer reports the pre-tween snapshot during animation. Wait for the
    // accepted command and settled player phase before asserting rendered state.
    await expect.poll(async () => JSON.parse((await page.locator('#game').getAttribute('data-session'))!).state.commandCount).toBeGreaterThan(beforeCount);
    await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    const after = await settledReport(page);
    activeLabels.add((await page.locator('#battle-actor-name').textContent())!);
    expect(after.transform).toEqual(panned.transform);
    expect(after.commandCount).toBeGreaterThan(beforeCount);
  }
  expect(activeLabels.size).toBeGreaterThan(1);
  await page.getByRole('button', { name: 'Restart battle' }).click();await confirmRestart(page);
  await expect(page.getByRole('status')).toHaveText('Battle ready');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const restarted = await settledReport(page);
  expect(restarted.selected).toBeNull();
  expect(restarted.selectionEvents).toBe(0);
  const freshSession=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
  expect(freshSession.replay.initial.commandCount).toBe(0);
  expect(freshSession.replay.initial.seed).toBe(2);
  expect(freshSession.replay.commands.every((c:any)=>freshSession.state.units.find((u:any)=>u.id===c.unitId).side==='enemy')).toBe(true);
  expect(restarted.objectCount).toBe(initial.objectCount);
  // A different seed/active hero can change HUD height. Reset must fit the
  // current available area rather than reuse the prior seed's absolute origin.

  // Reported bounds are screen-space and include canopy/unit art; recover the
  // unchanged map's local extent from the original fit, not the reset transform.
  const localBounds={
    left:(initial.bounds.left-initial.transform.x)/initial.transform.scale,
    right:(initial.bounds.right-initial.transform.x)/initial.transform.scale,
    top:(initial.bounds.top-initial.transform.y)/initial.transform.scale,
    bottom:(initial.bounds.bottom-initial.transform.y)/initial.transform.scale,
  };
  const expectedFit=fitBoard(localBounds,restarted.region);
  expect(restarted.transform.scale).toBeCloseTo(expectedFit.scale,5);
  expect(restarted.transform.x).toBeCloseTo(expectedFit.x,5);
  expect(restarted.transform.y).toBeCloseTo(expectedFit.y,5);
  await page.mouse.click(restarted.transform.x + local.x * restarted.transform.scale, restarted.transform.y + local.y * restarted.transform.scale);
  expect((await settledReport(page)).selectionEvents).toBe(1);
});

test('authored camera keeps zoom bounds and refits on real orientation changes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Battle ready');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  for (const viewport of [{ width: 412, height: 839 }, { width: 915, height: 412 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => (await report(page)).viewport).toEqual(viewport);
    await page.getByRole('button', { name: 'Restart battle' }).click();await confirmRestart(page);
    await expect(page.getByRole('status')).toHaveText('Battle ready');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    const fitted = await settledReport(page);
    await page.mouse.move(fitted.region.x+5,fitted.region.y+fitted.region.height-5);
    for (let wheel = 0; wheel < 8; wheel++) {
      // Chromium scales native wheel deltas by emulated DPR; exceed the input
      // clamp deliberately, and settle each event rather than assuming delivery.
      await page.mouse.wheel(0, -10000);
      await settledReport(page);
    }
    await expect.poll(async () => (await report(page)).transform.scale).toBeCloseTo(fitted.transform.scale * MAX_ZOOM, 5);
    // A genuine viewport change preserves relative zoom, not absolute scale.
    const nextViewport = { width: viewport.height, height: viewport.width };
    await page.setViewportSize(nextViewport);
    await expect.poll(async () => (await report(page)).viewport).toEqual(nextViewport);

    const localBounds = {
      left: (fitted.bounds.left - fitted.transform.x) / fitted.transform.scale,
      right: (fitted.bounds.right - fitted.transform.x) / fitted.transform.scale,
      top: (fitted.bounds.top - fitted.transform.y) / fitted.transform.scale,
      bottom: (fitted.bounds.bottom - fitted.transform.y) / fitted.transform.scale,
    };
    const nextFit = fitBoard(localBounds, (await settledReport(page)).region);
    expect((await settledReport(page)).transform.scale).toBeCloseTo(nextFit.scale * MAX_ZOOM, 5);
    await page.mouse.move((await report(page)).region.x+5,(await report(page)).region.y+5);
    for (let wheel = 0; wheel < 8; wheel++) {
      await page.mouse.wheel(0, 10000);
      await settledReport(page);
    }
    await expect.poll(async () => (await report(page)).transform.scale).toBeCloseTo(nextFit.scale, 5);
    expect((await settledReport(page)).commandCount).toBe(fitted.commandCount);
    // Refit at minimum zoom must keep the entire board clear of controls.
    await page.setViewportSize(viewport);
    await expect.poll(async () => (await report(page)).viewport).toEqual(viewport);
    const resized = await settledReport(page);
    expect(resized.bounds.left).toBeGreaterThanOrEqual(15);
    expect(resized.bounds.right).toBeLessThanOrEqual(viewport.width - 15);
    expect(resized.bounds.bottom).toBeLessThanOrEqual(viewport.height - 15);
    expect(resized.bounds.top).toBeGreaterThanOrEqual(await page.locator('#battle-board-region').evaluate(region => region.getBoundingClientRect().top + 15));
  }
});

test('default authored board renders canonical units, highlights and stable restarts', async ({ page }) => {
  const errors: string[] = [];
  const assetRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const assetPaths = new Set(Object.values(battleCatalog.assets).map(asset => asset.runtimePath));
  page.on('request', request => { const path = new URL(request.url()).pathname.replace(/^\/assets\/[a-f0-9]{16}(?=\/(?:battle|proof)\/)/, ''); if (assetPaths.has(path)) assetRequests.push(path); });
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Battle ready');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const initial = await report(page);
  expect(initial.tiles).toHaveLength(144);
  expect(initial.units.map((u: any) => u.unitId)).toEqual(['fighter', 'ranger', 'mage', 'goblin_grunt', 'goblin_archer', 'goblin_grunt']);
  expect(initial.reachable.length).toBeGreaterThan(0);
  expect(initial.canopies.length).toBeGreaterThan(0);
  expect(initial.surfaceCornerError).toBeLessThan(0.001);
  expect(initial.units.every((u: any) => u.anchorError < 0.001)).toBe(true);
  expect(initial.depthOrder).toEqual([...initial.depthOrder].sort((a, b) => a - b));
  for (const unit of initial.units) {
    const asset = battleCatalog.assets[unit.assetId as keyof typeof battleCatalog.assets];
    expect(asset.kind).toBe('unit-sprite');
    if (asset.kind === 'unit-sprite') expect(unit.origin).toEqual({ x: asset.anchor.x / asset.runtimeWidth, y: asset.anchor.y / asset.runtimeHeight });
  }
  for (const [orientation, viewport] of Object.entries({ portrait: { width: 390, height: 844 }, landscape: { width: 844, height: 390 } })) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => (await report(page)).viewport).toEqual(viewport);
    const value = await report(page);
    expect(value.bounds.left).toBeGreaterThanOrEqual(15);
    expect(value.bounds.right).toBeLessThanOrEqual(viewport.width - 15);
    expect(value.bounds.bottom).toBeLessThanOrEqual(viewport.height - 15);
    expect(value.bounds.top).toBeGreaterThanOrEqual(await page.locator('#battle-board-region').evaluate(region => region.getBoundingClientRect().top + 15));
    await page.screenshot({ path: test.info().outputPath(`authored-${orientation}.png`) });
  }
  for (let run = 0; run < 4; run++) {
    await page.getByRole('button', { name: 'Restart battle' }).click();await confirmRestart(page);
    await expect(page.getByRole('status')).toHaveText('Battle ready');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    const value = await report(page);
    expect(value.objectCount).toBe(initial.objectCount);
    expect(value.selectionEvents).toBe(0);
    const fresh=JSON.parse((await page.locator('#game').getAttribute('data-session'))!);
    expect(fresh.replay.initial.seed).toBe(run+2);
    expect(fresh.replay.initial.commandCount).toBe(0);
    await page.getByRole('button', { name: 'Wait / End turn' }).click();
    await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
    expect((await report(page)).commandCount).toBeGreaterThan(value.commandCount);
    const view = (await report(page)).transform;
    const local = projectTile({ x: 11, y: 11, elevation: 0 });
    await page.mouse.click(view.x + local.x * view.scale, view.y + local.y * view.scale);
    await expect.poll(async () => (await report(page)).selectionEvents).toBe(1);
    await expect(page.locator('canvas')).toHaveCount(1);
  }
  expect([...new Set(assetRequests)].sort()).toEqual([...assetPaths].sort());
  for(const asset of Object.values(battleCatalog.assets)) expect(assetRequests.filter(p=>p===asset.runtimePath)).toHaveLength(1);
  expect(errors).toEqual([]);
});

for (const failure of ['missing', 'corrupt'] as const) {
  test(`default battle reports a controlled ${failure} canonical sprite error`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/proof/fighter.png', route => failure === 'missing'
      ? route.fulfill({ status: 404 }) : route.fulfill({ contentType: 'image/png', body: 'invalid PNG bytes' }));
    await page.goto('/');
    await expect(page.getByRole('status')).toContainText('Asset load failed');
    await expect(page.locator('#game')).toHaveAttribute('data-ready', 'false');
    await expect(page.getByRole('button', { name: 'Restart battle' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Move', exact: true })).toBeDisabled();
    expect(errors).toEqual([]);
  });
}

test('picks authored elevated tops and visible side faces outside living unit art', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Battle ready');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const { tiles } = buildBoardPresentation(battleCatalog, 'map:forest_ruins');
  const units=(await settledReport(page)).units.filter((unit:any)=>unit.health.hp>0);
  for (const elevation of [0, 1, 2]) {
    for (const face of ['top', 'left', 'right'] as const) {
      const tile = tiles.find(tile => {
        if (tile.elevation !== elevation) return false;
        const vertices: readonly Point[] = tileFaces(tile)[face];
        const point = { x: vertices.reduce<number>((sum, p) => sum + p.x, 0) / 4, y: vertices.reduce<number>((sum, p) => sum + p.y, 0) / 4 };
        return pickTile(tiles, point) === tile && !units.some((unit:any)=>{
          const b=unitBounds(unit.tile,unit.origin);
          return point.x>=b.left && point.x<b.right && point.y>=b.top && point.y<b.bottom;
        });
      });
      expect(tile).toBeDefined();
      const vertices: readonly Point[] = tileFaces(tile!)[face];
      const point = { x: vertices.reduce<number>((sum, p) => sum + p.x, 0) / 4, y: vertices.reduce<number>((sum, p) => sum + p.y, 0) / 4 };
      const view = (await settledReport(page)).transform;
      await page.mouse.click(view.x + point.x * view.scale, view.y + point.y * view.scale);
      expect((await report(page)).selected).toEqual({ x: tile!.x, y: tile!.y, elevation });
    }
  }
  await page.screenshot({ path: test.info().outputPath('selected-elevated.png') });
  const value = await report(page);
  const unit = value.units[0];
  const point = projectTile(unit.tile);
  const view = (await settledReport(page)).transform;
  await page.mouse.click(view.x + point.x * view.scale, view.y + point.y * view.scale);
  const intended = pickTile(tiles, point)!;
  expect((await report(page)).selected).toEqual({ x: intended.x, y: intended.y, elevation: intended.elevation });
});

test('authored visible picking survives resize, pan, zoom, DPR and drag completion', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Battle ready');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const tiles = buildBoardPresentation(battleCatalog, 'map:forest_ruins').tiles;
  const session = await page.context().newCDPSession(page);
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(async () => (await report(page)).viewport).toEqual(viewport);
    for (const dpr of [1, 3]) {
      await page.getByRole('button', { name: 'Restart battle' }).click();await confirmRestart(page);
      await expect(page.getByRole('status')).toHaveText('Battle ready');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
      await session.send('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: dpr, mobile: false });
      await expect.poll(() => page.evaluate(() => devicePixelRatio)).toBe(dpr);
      const value = await report(page);
      const view = value.transform;
      const local = projectTile({ x: 11, y: 11, elevation: 0 });
      const point = { x: view.x + local.x * view.scale, y: view.y + local.y * view.scale };
      await page.mouse.click(point.x, point.y);
      const selected = pickTile(tiles, screenToBoard(point, view));
      expect((await report(page)).selected).toEqual(selected && { x: selected.x, y: selected.y, elevation: selected.elevation });
      await page.mouse.wheel(0, -100);
      await expect.poll(async () => (await report(page)).transform.scale).toBeGreaterThan(view.scale);
      const before = await report(page);
      await page.mouse.down();
      await page.mouse.move(point.x + 25, point.y - 20, { steps: 5 });
      await page.mouse.up();
      expect((await report(page)).selectionEvents).toBe(before.selectionEvents);
      const transformed = (await report(page)).transform;
      const next = { x: transformed.x + local.x * transformed.scale, y: transformed.y + local.y * transformed.scale };
      await page.mouse.click(next.x, next.y);
      expect((await report(page)).selected).toEqual({ x: 11, y: 11, elevation: 0 });
    }
    await session.send('Emulation.clearDeviceMetricsOverride');
  }
});

test('legal player movement updates elevation, reachability and canopy occlusion', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const initial = await settledReport(page);
  const elevated = initial.reachable.find((c: {x:number;y:number}) => initial.tiles.find((t:any)=>t.x===c.x && t.y===c.y)?.elevation===1);
  expect(elevated).toBeDefined();
  await page.getByRole('button',{name:'Move',exact:true}).click();
  await page.locator('#battle-target').selectOption(`${elevated.x},${elevated.y}`);
  await page.getByRole('button',{name:'Confirm action'}).click();
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const after = await settledReport(page);
  const moved = after.units.find((u:any)=>u.id===initial.activeId);
  expect(moved.tile).toEqual({...elevated,elevation:1});
  const anchor = projectTile(moved.tile);
  expect(moved.position.x).toBe(anchor.x);
  expect(moved.position.y).toBeCloseTo(anchor.y + moved.bobOffset, 5);
  expect(moved.bobOffset).toBeGreaterThanOrEqual(-2);
  expect(moved.bobOffset).toBeLessThanOrEqual(0);
  expect(moved.anchorError).toBeLessThan(0.001);
  expect(after.reachable).toEqual([]);
  expect(after.commandCount).toBe(initial.commandCount+1);
  await page.screenshot({path:test.info().outputPath('player-elevated-move.png')});
  // Canopy visibility comes from living unit geometry, including automatically moved enemies.
  const { canopyOccludes, unitBounds, CANOPY_ART } = await import('../src/geometry/canopy');
  const state=JSON.parse((await page.locator('#game').getAttribute('data-session'))!).state;
  for(const canopy of after.canopies){
    const overlaps=state.units.some((u:any)=>{
      if(u.hp<=0)return false;
      const unit=after.units.find((v:any)=>v.id===u.id);
      const art=unitBounds(unit.tile,unit.origin);
      // Foliage conservatively clears the complete 2px idle envelope.
      return canopyOccludes(canopy.tile,unit.tile,{...art,top:art.top-2},catalogMapHeight);
    });
    expect(canopy.alpha).toBe(overlaps?CANOPY_ART.fadedAlpha:1);
  }
});
const catalogMapHeight=battleCatalog.maps['map:forest_ruins'].height;

test('touch pinch and cancelled pointer cannot select or move a unit', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Battle ready');
  await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const value = await report(page);
  const x = value.transform.x, y = value.transform.y + 440 * value.transform.scale;
  const session = await page.context().newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', points: { x: number; y: number; id: number }[]) => session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  await touch('touchStart', [{ x, y, id: 1 }]);
  await touch('touchEnd', []);
  const selected = await report(page);
  expect(selected.selected).toEqual({ x: 11, y: 11, elevation: 0 });
  await touch('touchStart', [{ x: x - 10, y, id: 1 }, { x: x + 10, y, id: 2 }]);
  await touch('touchMove', [{ x: x - 25, y, id: 1 }, { x: x + 25, y, id: 2 }]);
  await touch('touchEnd', [{ x: x - 25, y, id: 1 }]);
  await touch('touchEnd', []);
  expect((await report(page)).selectionEvents).toBe(selected.selectionEvents);
  expect((await report(page)).commandCount).toBe(value.commandCount);
  await touch('touchStart', [{ x, y, id: 3 }]);
  await touch('touchCancel', []);
  expect((await report(page)).selectionEvents).toBe(selected.selectionEvents);
});

test('drawable boundaries and layout changes discard captured gestures without board pass-through',async({page})=>{
  await page.goto('/');await expect(page.locator('#game')).toHaveAttribute('data-phase','player');
  const initial=await settledReport(page),r=initial.region,x=r.x+r.width/2,y=r.y+r.height/2;
  await page.mouse.move(x,y);await page.mouse.down();
  await page.mouse.move(r.x+r.width+15,y);await page.mouse.move(x+15,y);await page.mouse.up();
  let after=await settledReport(page);expect(after.transform).toEqual(initial.transform);expect(after.selectionEvents).toBe(initial.selectionEvents);
  await page.locator('#battle-scroll').hover();await page.mouse.wheel(0,200);after=await settledReport(page);
  expect(after.transform).toEqual(initial.transform);expect(after.commandCount).toBe(initial.commandCount);
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-10,y,id:1},{x:x+10,y,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x-10,y,id:1},{x:x+10,y,id:2}]});
  const outside=await settledReport(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-20,y,id:1},{x:x+20,y,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  after=await settledReport(page);expect(after.transform).toEqual(outside.transform);expect(after.selectionEvents).toBe(initial.selectionEvents);
  await page.mouse.move(x,y);await page.mouse.down();
  const size=page.viewportSize()!;await page.setViewportSize({width:size.height,height:size.width});
  await expect.poll(async()=>(await report(page)).viewport).toEqual({width:size.height,height:size.width});
  const resized=await settledReport(page);await page.mouse.move(resized.region.x+30,resized.region.y+30);await page.mouse.up();
  after=await settledReport(page);expect(after.transform).toEqual(resized.transform);expect(after.selectionEvents).toBe(initial.selectionEvents);
  expect(after.commandCount).toBe(initial.commandCount);await expect(page.locator('canvas')).toHaveCount(1);await cdp.detach();
});
