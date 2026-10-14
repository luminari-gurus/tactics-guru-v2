// Focused documentation-prototype checks; does not run or certify gameplay.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const output=fileURLToPath(new URL('./previews/',import.meta.url));
const base=process.env.DESIGN_BASE_URL ?? new URL('./mockups.html',import.meta.url).href;
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
const states=['idle','selected','preview','invalid','review','move-spent','action-spent','enemy','presenting','victory','defeat','inspection'];
const heroes={fighter:'Guarded Strike',ranger:'High Shot',mage:'Magic Missile'};
const layouts=[['desktop',1280,720,'fighter'],['portrait',412,915,'ranger'],['landscape',915,412,'mage'],['small-portrait',320,568,'fighter'],['small-landscape',568,320,'mage']];
const results={browser:browser.version(),fixtureCases:0,layouts:[],interactions:[],contrast:[],errors:[]};
async function open(page,hero,state='idle'){await page.goto(`${base}?hero=${hero}&state=${state}&export=1`);await page.locator('#portrait').waitFor();await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));assert.match(await page.title(),/Battle controls/);assert.equal(await page.locator('.stage').count(),1);}
async function measure(page){return page.evaluate(()=>{const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};return {viewport:{width:innerWidth,height:innerHeight},board:rect('.board-area'),imageRegion:rect('#board'),controls:rect('.controls'),actor:rect('.actor'),scroll:rect('.control-scroll'),horizontalOverflow:document.documentElement.scrollWidth>innerWidth,smallTargets:[...document.querySelectorAll('button,select')].filter(e=>e.getClientRects().length&& !e.closest('.reviewer')).map(e=>({id:e.id||e.textContent.trim(),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})).filter(r=>r.width<43.9||r.height<43.9),missingImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src)};});}
try{
 for(const [name,width,height,example] of layouts){
  const context=await browser.newContext({viewport:{width,height},hasTouch:name!=='desktop',deviceScaleFactor:1});
  const page=await context.newPage();page.on('pageerror',e=>results.errors.push(`${name}: ${e.message}`));page.on('console',m=>{if(m.type()==='error')results.errors.push(`${name}: ${m.text()}`);});
  await page.goto(base);await page.locator('#hero-fixture').selectOption(example);await page.locator('#state-fixture').selectOption('selected');assert.equal(await page.locator('#signature').getAttribute('aria-pressed'),'true');await page.locator('#export-view').click();assert.ok(page.url().includes('export=1'));assert.equal(await page.locator('.reviewer').isVisible(),false);
  for(const [hero,signature] of Object.entries(heroes))for(const state of states){
   await open(page,hero,state);assert.equal(await page.locator('#signature .action-name').textContent(),signature);
   assert.equal(await page.locator('#actor-name').textContent(),state==='enemy'?'Goblin archer':hero[0].toUpperCase()+hero.slice(1));
   const m=await measure(page);assert.equal(m.horizontalOverflow,false,`${name}/${hero}/${state} overflow`);assert.deepEqual(m.smallTargets,[],`${name}/${state} target size`);assert.deepEqual(m.missingImages,[]);
   assert.ok(m.imageRegion.height+0.02>=height*(height<=500&&width>height?.55:.30),'drawable board height floor');
   assert.ok(m.board.x+m.board.width<=m.controls.x+.5||m.board.y+m.board.height<=m.controls.y+.5,'board/control overlap');
   if(['enemy','presenting','victory','defeat'].includes(state))for(const id of ['move','basic','signature','wait','target','review','cancel','board'])assert.ok(await page.locator(`#${id}`).isDisabled(),`${state}/${id} lock`);
   if(state==='invalid')assert.ok(await page.locator('#review').isDisabled());
   if(state==='move-spent')assert.ok(await page.locator('#move').isDisabled());
   if(state==='action-spent')assert.ok(await page.locator('#signature').isDisabled());
   results.fixtureCases++;
  }
  await open(page,example);results.layouts.push({name,...await measure(page)});await page.screenshot({path:`${output}${name}.png`});
  await page.locator('#signature').click();await page.locator('#target').selectOption('valid');
  await page.locator('#review').scrollIntoViewIfNeeded();await page.screenshot({path:`${output}${name}-preview.png`});
  const actor=await page.locator('#actor-name').textContent();const count=await page.locator('#board-count').textContent();
  await page.locator('#review').click();await page.screenshot({path:`${output}${name}-review.png`});
  for(let i=0;i<8;i++){await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>!!document.activeElement.closest('dialog')));}
  for(let i=0;i<8;i++){await page.keyboard.press('Shift+Tab');assert.ok(await page.evaluate(()=>!!document.activeElement.closest('dialog')));}
  // Real pointer/touch input against the board while native dialog owns the top layer.
  const board=await page.locator('#board').boundingBox();
  if(name==='desktop')await page.mouse.click(board.x+5,board.y+5);else await page.touchscreen.tap(board.x+5,board.y+5);
  await page.mouse.move(board.x+8,board.y+8);await page.mouse.down();await page.mouse.move(board.x+70,board.y+45,{steps:5});await page.mouse.up();
  assert.equal(await page.locator('#board-count').textContent(),count,'modal input capture');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#dialog').evaluate(d=>d.open),false);assert.equal(await page.locator('#board-count').textContent(),count,'dismissal capture');assert.equal(await page.locator('#actor-name').textContent(),actor);assert.equal(await page.locator('#target').inputValue(),'');assert.ok(await page.locator('#review').isDisabled());assert.ok(await page.evaluate(()=>document.activeElement===document.getElementById('restart')),'disabled invoker fallback');
  await page.locator('#inspect').click();assert.match(await page.locator('#dialog-title').textContent(),/Inspection only/);assert.equal(await page.locator('#actor-name').textContent(),actor);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'inspect');
  await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#board-count').textContent(),count);
  // Each prepare path has Review, Confirm and a persistent presentation lock.
  for(const action of ['move','basic','signature']){await open(page,example);await page.locator(`#${action}`).click();await page.locator('#target').selectOption('invalid');assert.ok(await page.locator('#review').isDisabled());await page.locator('#target').selectOption('valid');await page.locator('#review').click();await page.getByRole('button',{name:'Confirm',exact:true}).click();assert.match(await page.locator('#phase').textContent(),/locked/);assert.ok(await page.locator('#wait').isDisabled());assert.equal(await page.locator('#dialog').evaluate(d=>d.open),false);}
  await open(page,example);await page.locator('#wait').click();assert.match(await page.locator('#phase').textContent(),/locked/);assert.equal(await page.locator('#dialog').evaluate(d=>d.open),false,'Wait has no review dialog');
  await open(page,example);await page.locator('#board').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#board-count').textContent(),'1');
  if(name!=='desktop'){await page.touchscreen.tap(board.x+5,board.y+5);assert.equal(await page.locator('#board-count').textContent(),'2');}
  await page.locator('#restart').click();await page.getByRole('button',{name:'Start new battle',exact:true}).click();assert.equal(await page.locator('#phase').textContent(),'Your turn');
  await open(page,example);await page.evaluate(()=>document.documentElement.style.fontSize='32px');
  await page.locator('#help').scrollIntoViewIfNeeded();const enlarged=await measure(page);assert.equal(enlarged.horizontalOverflow,false,`${name} enlarged overflow`);assert.deepEqual(enlarged.smallTargets,[]);assert.ok(enlarged.scroll.height>=44,`${name} enlarged scroll region`);assert.ok(enlarged.imageRegion.height+0.02>=height*(height<=500&&width>height?.55:.30));await page.screenshot({path:`${output}${name}-text200.png`});
  await page.locator('.actor').focus();await page.keyboard.press('End');await page.waitForFunction(()=>{const e=document.querySelector('.actor');return e.scrollHeight<=e.clientHeight||e.scrollTop>=e.scrollHeight-e.clientHeight-1;});await page.screenshot({path:`${output}${name}-text200-info.png`});
  // Synthetic safe-area insets stress layout math; this is not hardware evidence.
  await open(page,example);await page.evaluate(()=>{for(const [side,value] of Object.entries({top:24,right:24,bottom:34,left:24}))document.documentElement.style.setProperty(`--test-safe-${side}`,`${value}px`);});
  const safe=await measure(page);assert.ok(safe.board.x>=24&&safe.board.y>=24);assert.ok(safe.controls.x+safe.controls.width<=width-24+.5&&safe.controls.y+safe.controls.height<=height-34+.5);assert.equal(safe.horizontalOverflow,false);
  results.layouts.at(-1).enlarged=enlarged;results.layouts.at(-1).syntheticSafeArea=safe;
  results.interactions.push(`${name}: keyboard loop, touch/pointer and drag capture, cancellation/focus return, inspection, sound, three confirmations, immediate Wait, board activation, restart, 200% text, safe-area stress`);
  await context.close();
 }
 const luminance=hex=>{const a=hex.match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722;};
 for(const [foreground,background,minimum] of [['f5efdf','182335',4.5],['c3cbd6','26364b',4.5],['f0cf83','334155',4.5],['182335','f0cf83',4.5],['8d9bad','26364b',3],['a9ddb8','182335',4.5],['ffc1ae','182335',4.5],['c3cbd6','25374b',4.5]]){const a=luminance(foreground),b=luminance(background),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert.ok(ratio>=minimum);results.contrast.push({foreground,background,ratio:Number(ratio.toFixed(2)),minimum});}
 assert.deepEqual(results.errors,[]);
 writeFileSync(`${output}measurements.json`,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({fixtureCases:results.fixtureCases,layouts:results.layouts.length,interactions:results.interactions,errors:results.errors},null,2));
}finally{await browser.close();}
