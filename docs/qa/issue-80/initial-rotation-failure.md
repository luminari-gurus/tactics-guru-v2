# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: battle-animations.spec.ts >> elevated target remains anchored through rotation during impact
- Location: tests/battle-animations.spec.ts:180:1

# Error details

```
Error: expect(received).not.toEqual(expected) // deep equality

Expected: not {"height": 720, "width": 1280}

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main "Tactics Guru game canvas" [ref=e2]:
    - generic "Battle board. Arrow keys navigate, Enter selects, Escape cancels." [ref=e3]
  - complementary "Battle controls" [ref=e4]:
    - generic [ref=e5]:
      - status [ref=e6]: Battle ready
      - button "Restart battle" [ref=e7] [cursor=pointer]
    - generic [ref=e8]:
      - generic [ref=e9]: Battle saved on this device
      - button "Save recovery" [ref=e10] [cursor=pointer]
    - generic [ref=e11]:
      - generic [ref=e12]:
        - button "Enable sound" [ref=e13] [cursor=pointer]
        - generic [ref=e14]: Sound off
      - generic "Heroes" [ref=e15]:
        - 'button "Fighter portrait Fighter #1 · HP 14/18 · Guarded" [ref=e16] [cursor=pointer]':
          - img "Fighter portrait" [ref=e17]
          - generic [ref=e18]: "Fighter #1 · HP 14/18 · Guarded"
        - 'button "Ranger portrait Ranger #2 · HP 8/12" [ref=e19] [cursor=pointer]':
          - img "Ranger portrait" [ref=e20]
          - generic [ref=e21]: "Ranger #2 · HP 8/12"
        - 'button "Mage portrait Mage #3 · HP 7/11" [ref=e22] [cursor=pointer]':
          - img "Mage portrait" [ref=e23]
          - generic [ref=e24]: "Mage #3 · HP 7/11"
      - paragraph [ref=e25]: "Victory · Round 4 · Your turn · Ranger #2 · HP 8/12 · Move ready / Action spent · Animating"
      - generic [ref=e26]:
        - button "Move" [disabled] [ref=e27]
        - button "Basic attack" [disabled] [ref=e28]
        - 'button "Signature: High Shot" [disabled] [ref=e29]'
        - button "Wait / End turn" [disabled] [ref=e30]
      - text: Target (or select a board cell)
      - combobox "Target (or select a board cell)" [disabled] [ref=e31]:
        - option "Choose target" [selected]
      - paragraph [ref=e32]: Select a tile
      - paragraph [ref=e33]: Choose an action and target
      - generic [ref=e34]:
        - button "Review action" [disabled] [ref=e35]
        - button "Cancel action" [disabled] [ref=e36]
      - group [ref=e37]:
        - generic "Battle log" [ref=e38] [cursor=pointer]
    - paragraph [ref=e39]: "Gold: active · White: selected · Teal: reachable · Tap to select · Drag to pan · Wheel/pinch to zoom · Keyboard: arrows, Enter selects, Escape cancels"
    - link "Play three-encounter run" [ref=e40] [cursor=pointer]:
      - /url: /run
```

# Test source

```ts
  86  | }
  87  |
  88  | for(const kind of kinds)test(`${kind}: real controls, travel/impact, transformed anchors and exactly one accepted result`,async({page},info)=>{
  89  |   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  90  |   const fixture=boundary(kind),keyboard=kind==='magic_missile';await boot(page,fixture);
  91  |   const baseline=(await report(page)).objectCount,savedBefore=await stored(page);
  92  |   // A signature aimed at its own actor must remain a rejected preview, with no cue or save.
  93  |   await press(page,'[data-action="signature"]',keyboard);await page.locator('canvas').focus();await page.keyboard.press('Enter');
  94  |   await expect(page.locator('#battle-preview')).toContainText('Unavailable');await expect(page.locator('#battle-review')).toBeDisabled();
  95  |   expect((await report(page)).effect).toBeNull();expect((await readSession(page)).state).toEqual(fixture.before);expect(await stored(page)).toEqual(savedBefore);
  96  |   await press(page,'#battle-cancel',keyboard);
  97  |   await review(page,fixture,keyboard);await page.keyboard.press('Escape');
  98  |   expect((await report(page)).effect).toBeNull();expect((await readSession(page)).state).toEqual(fixture.before);expect(await stored(page)).toEqual(savedBefore);
  99  |   // Transform before the effect through real board gestures.
  100 |   const point=await page.evaluate(()=>{const p=document.querySelector('#fit-panel')!.getBoundingClientRect();return {x:innerWidth/2,y:p.bottom+(innerHeight-p.bottom)*0.6};});
  101 |   await page.mouse.move(point.x,point.y);await page.mouse.wheel(0,-80);
  102 |   await review(page,fixture,keyboard);await confirmFrozen(page);
  103 |   const accepted=await readSession(page),saved=await stored(page);
  104 |   expect(accepted.state).toEqual(fixture.after);expect(accepted.events).toEqual(fixture.events);
  105 |   expect(accepted.continuation!.commands).toEqual([fixture.command]);
  106 |   const expected=dispatch(fixture.before,fixture.command,catalog);expect(expected.ok).toBe(true);
  107 |   if(expected.ok)expect(accepted.state).toEqual(expected.state);
  108 |   await page.keyboard.press('Enter');await page.keyboard.press('Space');
  109 |   await expect(page.locator('#battle-next')).toBeDisabled();await expect(page.locator('[data-action="signature"]')).toBeDisabled();
  110 |   await page.clock.runFor(112);const travel=await report(page);aligned(travel,fixture);
  111 |   expect(travel.effect.progress).toBeGreaterThan(0);expect(travel.effect.progress).toBeLessThan(0.45);
  112 |   await page.screenshot({path:info.outputPath(`${kind}-travel.png`)});
  113 |   // Pan/zoom during flight without changing the accepted simulation.
  114 |   await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+25,point.y-15,{steps:3});await page.mouse.up();
  115 |   await page.mouse.wheel(0,-50);await page.clock.runFor(176);
  116 |   const impact=await report(page);aligned(impact,fixture);expect(impact.transform).not.toEqual(travel.transform);
  117 |   expect(impact.effect.progress).toBeGreaterThanOrEqual(0.45);
  118 |   expect(impact.effect.feedback.filter((f:any)=>f.visible).map((f:any)=>({unitId:f.unitId,text:f.text})))
  119 |     .toEqual(abilityPresentation(fixture.events).feedback.map(f=>({unitId:f.unitId,text:f.text})));
  120 |   await page.screenshot({path:info.outputPath(`${kind}-impact.png`)});
  121 |   const capture=(r:any)=>({viewport:r.viewport,transform:r.transform,effect:r.effect,
  122 |     units:r.units.filter((u:any)=>u.id===r.effect.actorId || u.id===r.effect.targetId),objectCount:r.objectCount});
  123 |   writeFileSync(info.outputPath('animation.json'),JSON.stringify({viewport:page.viewportSize(),fixture,travel:capture(travel),impact:capture(impact)},null,2));
  124 |   expect((await readSession(page)).state).toEqual(accepted.state);expect(await stored(page)).toEqual(saved);
  125 |   await page.clock.runFor(500);await ready(page);
  126 |   expect((await report(page)).effect).toBeNull();expect((await report(page)).objectCount).toBe(baseline);
  127 |   expect((await readSession(page)).state).toEqual(fixture.after);expect(await stored(page)).toEqual(saved);expect(errors).toEqual([]);
  128 | });
  129 |
  130 | for(const [kind,outcome] of [['guarded_strike','miss'],['high_shot','miss'],['high_shot','critical'],['magic_missile','defeat']] as const)
  131 | test(`${kind}: ${outcome} feedback matches resolved events`,async({page},info)=>{
  132 |   const fixture=boundary(kind,outcome);await boot(page,fixture);await review(page,fixture);await confirmFrozen(page);await page.clock.runFor(288);
  133 |   const r=await report(page);aligned(r,fixture);
  134 |   const feedback=abilityPresentation(fixture.events).feedback;
  135 |   expect(r.effect.feedback.map((f:any)=>({unitId:f.unitId,text:f.text}))).toEqual(feedback.map(f=>({unitId:f.unitId,text:f.text})));
  136 |   expect(r.effect.feedback.every((f:any)=>f.visible)).toBe(true);
  137 |   if(outcome==='miss'){expect(feedback.some(f=>f.text==='Miss')).toBe(true);expect(feedback.some(f=>f.text.includes('−'))).toBe(false);}
  138 |   if(kind==='guarded_strike')expect(feedback).toContainEqual({unitId:r.effect.actorId,kind:'guard',text:'Guarded'});
  139 |   const positions=r.effect.feedback.map((f:any)=>`${f.x},${f.y}`);expect(new Set(positions).size).toBe(positions.length);
  140 |   await page.screenshot({path:info.outputPath(`${kind}-${outcome}.png`)});await page.clock.runFor(500);
  141 |   expect((await report(page)).effect).toBeNull();expect((await readSession(page)).state).toEqual(fixture.after);
  142 | });
  143 |
  144 | for(const kind of kinds)test(`${kind}: repeated cancellation, modal refresh, resize and restart during travel and impact`,async({page})=>{
  145 |   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  146 |   const fixture=boundary(kind);await boot(page,fixture);await review(page,fixture);await confirmFrozen(page);await page.clock.runFor(96);
  147 |   const saved=await stored(page);
  148 |   await page.locator('#fit-restart').click({force:true});await page.locator('#save-cancel-reset').click({force:true});
  149 |   aligned(await report(page),fixture);
  150 |   const size=page.viewportSize()!;await page.setViewportSize({width:size.height,height:size.width});await page.clock.runFor(64);
  151 |   aligned(await report(page),fixture);
  152 |   await page.evaluate(()=>{
  153 |     Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
  154 |     for(let i=0;i<3;i++)document.dispatchEvent(new Event('visibilitychange'));
  155 |   });
  156 |   await ready(page);expect((await report(page)).effect).toBeNull();expect((await readSession(page)).state).toEqual(fixture.after);expect(await stored(page)).toEqual(saved);
  157 |   await page.evaluate(()=>{delete (document as unknown as {hidden?:boolean}).hidden;document.dispatchEvent(new Event('visibilitychange'));});
  158 |   await page.clock.runFor(700);expect((await readSession(page)).state).toEqual(fixture.after);
  159 |   // Restore only this known legal boundary via the real persisted-save startup for each teardown phase.
  160 |   for(const time of [96,288]){
  161 |     const encoded=encodeBattleSave(fixture.before,catalog);if(!encoded.ok)throw Error(encoded.reason);
  162 |     await page.evaluate(({keys,text})=>{localStorage.setItem(keys.primary,text);localStorage.setItem(keys.backup,text);},{keys,text:encoded.text});
  163 |     await page.reload();await page.clock.resume();await page.locator('#save-continue').click();await ready(page);
  164 |     await review(page,fixture);await confirmFrozen(page);await page.clock.runFor(time);
  165 |     await page.locator('#fit-restart').click({force:true});await confirmRestart(page,true);await page.clock.resume();await ready(page);
  166 |     expect((await readSession(page)).state.seed).toBe(fixture.before.seed+1);expect((await report(page)).effect).toBeNull();
  167 |     await expect(page.locator('canvas')).toHaveCount(1);
  168 |   }
  169 |   expect(errors).toEqual([]);
  170 | });
  171 |
  172 | for(const kind of kinds)test(`${kind}: reload resumes accepted save without historical effects`,async({page})=>{
  173 |   const fixture=boundary(kind);await boot(page,fixture);await review(page,fixture);await confirmFrozen(page);await page.clock.runFor(112);
  174 |   const saved=await stored(page);await page.reload();await page.clock.resume();await expect(page.locator('#save-continue')).toBeVisible();
  175 |   expect(await stored(page)).toEqual(saved);await page.locator('#save-continue').click();await ready(page);
  176 |   expect((await readSession(page)).state).toEqual(fixture.after);expect((await readSession(page)).events).toEqual([]);
  177 |   expect((await report(page)).effect).toBeNull();expect(await stored(page)).toEqual(saved);
  178 | });
  179 |
  180 | test('elevated target remains anchored through rotation during impact',async({page},info)=>{
  181 |   const fixture=boundary('high_shot','any',true);await boot(page,fixture);await review(page,fixture);await confirmFrozen(page);
  182 |   await page.clock.runFor(288);const before=await report(page);aligned(before,fixture);
  183 |   const unit=fixture.before.units.find(u=>u.id===before.effect.targetId)!;
  184 |   expect(before.tiles.find((t:any)=>t.x===unit.cell.x && t.y===unit.cell.y).elevation).toBeGreaterThan(0);
  185 |   const size=page.viewportSize()!;await page.setViewportSize({width:size.height,height:size.width});await page.clock.runFor(64);
> 186 |   const after=await report(page);aligned(after,fixture);expect(after.viewport).not.toEqual(before.viewport);
      |                                                                                    ^ Error: expect(received).not.toEqual(expected) // deep equality
  187 |   await page.screenshot({path:info.outputPath('elevated-rotated-impact.png')});
  188 |   await page.clock.runFor(500);expect((await report(page)).effect).toBeNull();expect((await readSession(page)).state).toEqual(fixture.after);
  189 | });
  190 |
  191 | test.describe('ability departure through real browser history',()=>{
  192 |   for(const kind of kinds)test(`${kind}: cached return preserves exact accepted slots until Continue`,async({page,baseURL})=>{
  193 |     const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  194 |     await page.addInitScript(()=>window.addEventListener('pageshow',event=>{if(event.persisted)sessionStorage.setItem('test:animation-cached-return','yes');}));
  195 |     const fixture=boundary(kind);await boot(page,fixture);await review(page,fixture);await confirmFrozen(page);await page.clock.runFor(112);
  196 |     const saved=await stored(page),map=new URL('map',baseURL).href;
  197 |     await page.evaluate(map=>location.assign(map),map);await expect(page.locator('#map-grid span')).toHaveCount(400);
  198 |     await page.goBack({waitUntil:'commit'});await page.clock.resume();await expect(page.locator('#save-continue')).toBeVisible();
  199 |     expect(await page.evaluate(()=>sessionStorage.getItem('test:animation-cached-return'))).toBe('yes');
  200 |     expect(await stored(page)).toEqual(saved);expect(await page.locator('#game').getAttribute('data-session')).toBeNull();
  201 |     await page.locator('#save-continue').click();await ready(page);
  202 |     expect((await readSession(page)).state).toEqual(fixture.after);expect((await readSession(page)).events).toEqual([]);
  203 |     expect((await report(page)).effect).toBeNull();expect(await stored(page)).toEqual(saved);expect(errors).toEqual([]);
  204 |   });
  205 | });
  206 |
```
