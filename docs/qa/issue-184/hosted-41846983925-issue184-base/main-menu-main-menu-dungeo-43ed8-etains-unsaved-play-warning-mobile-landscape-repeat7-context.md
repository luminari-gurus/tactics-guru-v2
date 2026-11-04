# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: main-menu.spec.ts >> main menu: dungeon departure after rejected movement retains unsaved play warning
- Location: tests/main-menu.spec.ts:219:66

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('.dungeon-status')
Expected substring: "Movement refused"
Received string:    "Playing unsaved. Floor travel requires saving; open Save recovery."
Timeout: 5000ms

Call log:
  - Expect "toContainText" locator('.dungeon-status') with timeout 5000ms
  - waiting for locator('.dungeon-status')
    13 × locator resolved to <p role="status" class="dungeon-status">Playing unsaved. Floor travel requires saving; op…</p>
       - unexpected value "Playing unsaved. Floor travel requires saving; open Save recovery."

```

```yaml
- main "Tactics Guru game canvas"
- region "Battlefield":
  - paragraph: Tactics Guru
  - heading "Dungeon · Floor 1 · Desert · Elite encounter 2" [level=1]
  - paragraph: "Gold: active · White: selected · Teal: reachable · Purple dots: ability reach · Pink +: target in reach · Ring: preview origin"
- complementary "Proof scene diagnostics":
  - paragraph: Round 1 · Your turn
  - img "Fighter portrait"
  - heading "Fighter" [level=2]
  - paragraph: HP 18/18
  - paragraph: AC 14 · Accuracy +4
  - paragraph: No status effects
  - paragraph: Move ready / Action ready
  - button "End turn":
    - strong: End turn
    - text: Ends turn immediately
  - region "Target and action preview":
    - paragraph: Select a destination
  - navigation "Secondary battle tools":
    - button "Undo move" [disabled]
    - button "Show enemy danger"
    - group: More
  - paragraph: Danger shows living heroes reachable by an enemy attack or Weakening Hex on its next turn, assuming current positions and statuses; it does not predict enemy choice.
  - paragraph
  - paragraph: Sound off
  - status: Battle ready
  - button "Start new dungeon"
  - button "Save recovery"
  - text: Playing unsaved. Floor travel requires saving; open Save recovery.
  - link "Main menu":
    - /url: /
  - group:
    - text: Board controls
    - 'button "Ground: Behind" [disabled]'
    - 'button "Ground: In front" [disabled]'
    - 'button "Raised: Behind" [disabled]'
    - 'button "Raised: In front" [disabled]'
    - text: Tree opacity (unit behind)
    - slider "Tree opacity (unit behind)" [disabled]: "40"
    - text: 40% Move destination
    - combobox "Move destination" [disabled]:
      - option "Choose a tile" [disabled] [selected]
      - option "Raised tile (2, 2)"
    - button "Start diagnostic move" [disabled]
    - text: Idle
    - button "Play test sound" [disabled]
    - text: Loading
  - paragraph: Tap to select · Drag to pan · Wheel/pinch to zoom · Arrows and Enter to select
  - group: Measurements
  - group: Privacy & analytics
```

# Test source

```ts
  134 |   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  135 |   const bounds=await page.locator('#main-menu').boundingBox();expect(bounds!.width).toBeLessThanOrEqual(512);
  136 |   for(const button of await page.locator('[data-menu-action]').all())expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  137 |   await page.getByRole('link',{name:'Map inspection'}).scrollIntoViewIfNeeded();await expect(page.getByRole('link',{name:'Map inspection'})).toBeInViewport();
  138 |   await page.screenshot({path:test.info().outputPath(`menu-${width}x${height}.png`),fullPage:true});
  139 |  }
  140 | });
  141 | test('main menu: supplied background compositions remain independent of controls',async({page})=>{
  142 |  await page.goto('./');
  143 |  for(const art of ['dawn','midnight']){
  144 |   await page.locator('.menu-backdrop').evaluate((node,name)=>{(node as HTMLImageElement).src=`${(node as HTMLImageElement).src.replace(/[^/]+$/,'')}${name}.webp`;},art);
  145 |   await expect.poll(()=>page.locator('.menu-backdrop').evaluate(n=>(n as HTMLImageElement).complete&&(n as HTMLImageElement).naturalWidth>0)).toBe(true);
  146 |   await page.screenshot({path:test.info().outputPath(`background-${art}.png`),fullPage:true});
  147 |   await expect(page.locator('[data-menu-action]')).toHaveText(['Continue','New Game','Hall of Records','Settings']);
  148 |  }
  149 | });
  150 | test('main menu: stale Continue and closed-set intents preserve missing or damaged saves',async({page})=>{
  151 |  await page.goto('./?game=battle&entry=continue');await expect(page.getByRole('dialog')).toContainText('Saved battle');
  152 |  expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.includes(':battle:')))).toEqual([]);
  153 |  await page.goto('./?game=run&entry=continue');await expect(page.getByRole('dialog')).toContainText('Run save recovery');
  154 |  await page.goto('./?game=dungeon&entry=continue');await expect(page.getByRole('dialog')).toContainText('Dungeon save recovery');
  155 |  expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.includes(':dungeon:')||key.includes(':run:')))).toEqual([]);
  156 |  await page.goto('./?game=dungeon&entry=unrecognized');await expect(page.locator('dialog')).not.toBeVisible();
  157 |  await expect(page).toHaveURL(/\/\?game=dungeon$/);
  158 |  await page.goto('./?game=battle&entry=new');await expect(page.getByRole('dialog')).toContainText('Start a new battle?');
  159 |  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  160 |  await page.goto('./?game=run&entry=new');await expect(page.getByRole('dialog')).toContainText('Start new run?');
  161 |  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  162 |  await page.goto('./?game=battle&entry=unrecognized');await expect(page.locator('dialog')).not.toBeVisible();
  163 |  await expect(page).toHaveURL(/\/\?game=battle$/);
  164 |  await page.goto('./?game=run&entry=unrecognized');await expect(page.locator('dialog')).not.toBeVisible();
  165 |  await expect(page).toHaveURL(/\/\?game=run$/);
  166 | });
  167 | test('main menu: failed new-game write retains exportable recovery copies',async({page})=>{
  168 |  const text=menuFixture('dungeon');
  169 |  await page.addInitScript(({key,text})=>{
  170 |   localStorage.setItem(key,text);const original=Storage.prototype.setItem;
  171 |   Storage.prototype.setItem=function(key,value){if(key.includes(':dungeon:'))throw new DOMException('full','QuotaExceededError');original.call(this,key,value);};
  172 |  },{key:keys.dungeon.primary,text});
  173 |  await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Start new dungeon',exact:true}).click();
  174 |  await expect(page.getByRole('dialog')).toContainText('Dungeon save recovery');
  175 |  const download=page.waitForEvent('download');await page.getByRole('button',{name:/Export primary/}).click();
  176 |  const file=await (await download).path();expect(readFileSync(file!,'utf8')).toBe(text);
  177 |  await expect(page.locator('#dungeon-screen')).toContainText('Progress unsaved');
  178 | });
  179 |
  180 | test('main menu: terminal battle saves resume their existing outcome UI',async({page})=>{
  181 |  const text=terminalMenuBattle();await page.addInitScript(({key,text})=>localStorage.setItem(key,text),{key:keys.battle.primary,text});
  182 |  await page.goto('./');await page.getByRole('button',{name:'Continue',exact:true}).click();
  183 |  await expect(page.locator('#game')).toHaveAttribute('data-phase','ended');
  184 |  await expect(page.getByRole('dialog')).toContainText(/Victory|Defeat/);
  185 |  await page.getByRole('dialog').getByRole('button',{name:'Main menu',exact:true}).focus();
  186 |  await page.keyboard.press('Enter');
  187 |  await expect(page.locator('#main-menu')).toBeVisible();
  188 |  expect(await page.evaluate(key=>localStorage.getItem(key),keys.battle.primary)).toBe(text);
  189 | });
  190 | test('main menu: unsaved run still warns after a rejected reward command',async({page})=>{
  191 |  const text=rewardRunFixture();
  192 |  await page.addInitScript(({key,text})=>{
  193 |   localStorage.setItem(key,text);const original=Storage.prototype.setItem;
  194 |   Storage.prototype.setItem=function(key,value){if(String(key).includes(':run:'))throw new DOMException('full','QuotaExceededError');original.call(this,key,value);};
  195 |  },{key:keys.run.primary,text});
  196 |  await page.goto('./?game=run');await page.getByRole('button',{name:'Continue saved run',exact:true}).click();
  197 |  const claim=page.getByRole('button',{name:/^Claim /}).first();
  198 |  await expect(claim).toBeVisible();await claim.click();await page.locator('#item-confirm').click();
  199 |  await expect(page.locator('#run-item-status')).toContainText(/unsaved/i);
  200 |  const action=page.getByRole('button',{name:/^(Use|Equip) /}).first();
  201 |  await expect(action).toBeVisible();
  202 |  const select=page.locator('#run-screen select').first();
  203 |  if(await select.count())await select.evaluate(node=>{const target=node as HTMLSelectElement;const mage=[...target.options].find(option=>option.value==='mage');if(mage){mage.disabled=false;target.value='mage';}});
  204 |  await action.click({force:true});await page.locator('#item-confirm').click();
  205 |  await expect(page.locator('#run-item-status')).toContainText('Nothing changed');
  206 |  page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('link',{name:'Main menu',exact:true}).last().click();
  207 |  await expect(page.getByRole('dialog')).toContainText('Run save recovery');
  208 | });
  209 | test('main menu: unsaved return cancellation opens recovery and accepted leave reaches menu',async({page})=>{
  210 |  await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError');}}));
  211 |  await page.goto('./?game=run');await page.getByRole('button',{name:'Play unsaved run',exact:true}).click();
  212 |  page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('link',{name:'Main menu',exact:true}).last().click();
  213 |  await expect(page.getByRole('dialog')).toContainText('Run save recovery');
  214 |  await page.locator('#run-close-recovery').click();
  215 |  page.once('dialog',dialog=>dialog.accept());await page.getByRole('link',{name:'Main menu',exact:true}).last().click();
  216 |  await expect(page.locator('#main-menu')).toBeVisible();await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
  217 | });
  218 |
  219 | for(const path of ['unsaved play','failed replacement'] as const)test(`main menu: dungeon departure after rejected movement retains ${path} warning`,async({page})=>{
  220 |  if(path==='failed replacement')await page.addInitScript(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.includes(':dungeon:'))throw new DOMException('full','QuotaExceededError');set.call(this,key,value);};});
  221 |  await page.goto('./?game=dungeon');
  222 |  if(path==='unsaved play'){
  223 |   await page.getByRole('button',{name:'Play unsaved dungeon',exact:true}).click();
  224 |   await page.locator('.dungeon-directions button:not(:disabled)').first().click();
  225 |  }else{
  226 |   await page.getByRole('button',{name:'Start new dungeon',exact:true}).click();await page.locator('#dungeon-confirm-new').click();
  227 |   await expect(page.getByRole('dialog')).toContainText('Dungeon save recovery');
  228 |   await page.locator('#dungeon-close-recovery').click();
  229 |  }
  230 |  const before=await page.locator('#game').getAttribute('data-dungeon-snapshot');
  231 |  const blocked=await page.locator('.dungeon-directions button:disabled').first().getAttribute('aria-label');
  232 |  const arrows:Record<string,string>={North:'ArrowUp',East:'ArrowRight',South:'ArrowDown',West:'ArrowLeft'};
  233 |  await page.locator('#dungeon-map').press(arrows[blocked!]);
> 234 |  await expect(page.locator('.dungeon-status')).toContainText('Movement refused');
      |                                                ^ Error: expect(locator).toContainText(expected) failed
  235 |  const cancel=page.waitForEvent('dialog');
  236 |  const departure=page.getByRole('link',{name:'Main menu',exact:true}).click();
  237 |  await (await cancel).dismiss();await departure;
  238 |  await expect(page.getByRole('dialog')).toContainText('Dungeon save recovery');
  239 |  expect(await page.locator('#game').getAttribute('data-dungeon-snapshot')).toBe(before);
  240 |  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export current progress',exact:true}).last().click();
  241 |  const file=await (await download).path();expect(JSON.parse(readFileSync(file!,'utf8')).payload).toEqual(JSON.parse(before!));
  242 |  const accept=page.waitForEvent('dialog');const leave=page.getByRole('link',{name:'Main menu',exact:true}).click();
  243 |  await (await accept).accept();await leave;await expect(page.locator('#main-menu')).toBeVisible();
  244 | });
  245 | for(const condition of ['missing','invalid','unavailable'] as const)test(`main menu: startup battle recovery can return with ${condition} storage`,async({page})=>{
  246 |  if(condition==='invalid')await page.addInitScript(key=>localStorage.setItem(key,'invalid preserved battle'),keys.battle.primary);
  247 |  if(condition==='unavailable')await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError');}}));
  248 |  await page.goto('./?game=battle&entry=recovery');await expect(page.getByRole('dialog')).toContainText('Saved battle');
  249 |  await page.getByRole('dialog').getByRole('button',{name:'Main menu',exact:true}).click();
  250 |  await expect(page.locator('#main-menu')).toBeVisible();
  251 |  if(condition!=='unavailable')expect(await page.evaluate(key=>localStorage.getItem(key),keys.battle.primary)).toBe(condition==='invalid'?'invalid preserved battle':null);
  252 | });
  253 |
  254 | // Item durability uses the menu's real run owner; the dev fixture stays transient.
  255 | async function menuItemReport(page:Page) { return {snapshot:JSON.parse(await page.locator('#game').getAttribute('data-run-snapshot')??'null')}; }
  256 | async function openMenuRunItems(page:Page,snapshot:RunSnapshot) {
  257 |  const encoded=encodeRunSave(snapshot,runContext);if(!encoded.ok)throw Error(encoded.reason);
  258 |  await page.goto('./?game=run');
  259 |  await page.evaluate(({keys,text})=>{localStorage.setItem(keys.primary,text);localStorage.setItem(keys.backup,text);},{keys:RUN_STORAGE_KEYS,text:encoded.text});
  260 |  await reloadMenuRunItems(page);
  261 | }
  262 | async function reloadMenuRunItems(page:Page) {
  263 |  await page.reload();await page.locator('#run-continue').click();await expect(page.locator('#run-item-status')).toBeVisible();
  264 | }
  265 | async function confirmMenuItem(page:Page) {await page.locator('#item-confirm').click();await expect(page.locator('dialog')).not.toBeVisible();}
  266 | async function activateMenuItem(page:Page,name:string,touch:boolean) {
  267 |  const button=page.getByRole('button',{name,exact:true});if(touch)await button.tap();else await button.click();
  268 | }
  269 | test('main menu: reward claim advances exactly once and survives pending/claimed reload', async ({ page }, info) => {
  270 |   const seed = Array.from({ length: 100 }, (_, i) => i).find(s => rewardSnapshot(s).items.offer!.options.some(o => o.itemId === 'item:healing_draught'))!;
  271 |   await openMenuRunItems(page,rewardSnapshot(seed)); const pending = (await menuItemReport(page)).snapshot;
  272 |   await reloadMenuRunItems(page); expect((await menuItemReport(page)).snapshot).toEqual(pending);
  273 |   await activateMenuItem(page, 'Claim Healing Draught', info.project.name !== 'desktop');
  274 |   if (info.project.name === 'desktop') await page.getByRole('button', { name: 'Confirm', exact: true }).dblclick();
  275 |   else {
  276 |     const box = await page.getByRole('button', { name: 'Confirm', exact: true }).boundingBox();
  277 |     for (let i = 0; i < 2; i++) await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
  278 |     if (await page.locator('dialog').isVisible()) await page.keyboard.press('Escape');
  279 |   }
  280 |   await expect(page.getByRole('heading', { name: 'Party items', exact: true })).toBeVisible();
  281 |   const claimed = (await menuItemReport(page)).snapshot;
  282 |   expect(claimed.items.run.encounterIndex).toBe(1); expect(claimed.items.itemRevision).toBe(1);
  283 |   expect(claimed.items.ownership.consumables).toEqual([{ itemId: 'item:healing_draught', quantity: 1 }]);
  284 |   await reloadMenuRunItems(page); expect((await menuItemReport(page)).snapshot).toEqual(claimed);
  285 | });
  286 | test('main menu: real item use, equip and unequip preserve ownership/stats across reload', async ({ page }, info) => {
  287 |   await openMenuRunItems(page,preparedSnapshot());
  288 |   const select = page.getByRole('combobox', { name: 'Healing Draught target' });
  289 |   await expect(select.locator('option', { hasText: 'Mage (defeated)' })).toBeDisabled();
  290 |   await select.selectOption('ranger');
  291 |   await activateMenuItem(page, 'Use Healing Draught', info.project.name !== 'desktop'); await confirmMenuItem(page);
  292 |   const used = (await menuItemReport(page)).snapshot;
  293 |   expect(used.items.run.party[1].hp).toBe(10); expect(used.items.ownership.consumables[0].quantity).toBe(1);
  294 |   await reloadMenuRunItems(page); expect((await menuItemReport(page)).snapshot).toEqual(used);
  295 |   await page.getByRole('combobox', { name: 'Warding Charm target' }).selectOption('ranger');
  296 |   await activateMenuItem(page, 'Equip Warding Charm', info.project.name !== 'desktop'); await confirmMenuItem(page);
  297 |   const equipped = (await menuItemReport(page)).snapshot;
  298 |   expect(equipped.items.ownership.assignments).toHaveLength(1);
  299 |   const fighter = await page.getByRole('region', { name: 'Party', exact: true }).textContent();
  300 |   await reloadMenuRunItems(page); expect((await menuItemReport(page)).snapshot).toEqual(equipped);
  301 |   expect(await page.getByRole('region', { name: 'Party', exact: true }).textContent()).toBe(fighter);
  302 |   await page.getByRole('button', { name: 'Continue saved run', exact: true }).click();
  303 |   await page.getByRole('button', { name: 'Continue', exact: true }).click();
  304 |   expect((await menuItemReport(page)).snapshot).toEqual(equipped);
  305 |   await page.getByRole('button', { name: 'Unequip Warding Charm' }).click(); await confirmMenuItem(page);
  306 |   expect((await menuItemReport(page)).snapshot.items.ownership.assignments).toEqual([]);
  307 | });
  308 | test('main menu: corruption preserves bytes, exports raw data and requires reviewed removal before saving', async ({ page }) => {
  309 |   await openMenuRunItems(page,preparedSnapshot());
  310 |   const backup = await page.evaluate(key => localStorage.getItem(key), RUN_STORAGE_KEYS.backup);
  311 |   await page.evaluate(key => localStorage.setItem(key, '  {broken raw\n\ud800'), RUN_STORAGE_KEYS.primary);
  312 |   await reloadMenuRunItems(page);
  313 |   await expect(page.locator('#run-item-status')).toContainText('Continued backup');
  314 |   await page.getByRole('button', { name: 'Use Healing Draught' }).click(); await confirmMenuItem(page);
  315 |   await expect(page.locator('#run-item-status')).toContainText('unsaved');
  316 |   expect(await page.evaluate(key => localStorage.getItem(key), RUN_STORAGE_KEYS.primary)).toBe('  {broken raw\n\ud800');
  317 |   expect(await page.evaluate(key => localStorage.getItem(key), RUN_STORAGE_KEYS.backup)).toBe(backup);
  318 |   await page.getByRole('button', { name: 'Save recovery', exact: true }).click();
  319 |   const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export primary save' }).click();
  320 |   const file = await download; expect(JSON.parse(await readFile((await file.path())!, 'utf8'))).toEqual({ slot: 'primary', text: '  {broken raw\n\ud800' });
  321 |   await page.getByRole('button', { name: 'Save recovery', exact: true }).click();
  322 |   await page.getByRole('button', { name: 'Remove primary save' }).click();
  323 |   await page.getByRole('button', { name: 'Remove reviewed save' }).click();
  324 |   expect(await page.evaluate(key => localStorage.getItem(key), RUN_STORAGE_KEYS.primary)).toBeNull();
  325 |   await page.locator('#run-close-recovery').click();
  326 |   await page.getByRole('button', { name: 'Save recovery', exact: true }).click();
  327 |   await page.getByRole('button', { name: 'Retry saving' }).click();
  328 |   await expect(page.locator('#run-item-status')).toContainText('Run saved');
  329 |   const saved = (await menuItemReport(page)).snapshot; await reloadMenuRunItems(page); expect((await menuItemReport(page)).snapshot).toEqual(saved);
  330 | });
  331 | test('main menu: stale recovery review refuses changed bytes', async ({ page }) => {
  332 |   await openMenuRunItems(page,preparedSnapshot());
  333 |   await page.getByRole('button', { name: 'Save recovery', exact: true }).click();
  334 |   await page.getByRole('button', { name: 'Remove primary save' }).click();
```
