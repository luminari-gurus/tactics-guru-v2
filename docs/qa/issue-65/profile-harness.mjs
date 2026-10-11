import {chromium} from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
for(const scene of ['proof','battle']) {
const context=await browser.newContext({viewport:{width:1280,height:720}});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(`http://127.0.0.1:4174/?scene=${scene}`);
await page.waitForFunction(()=>window.fitDiagnostics().controlsUsableMs!==null);
const cdp=await context.newCDPSession(page);
await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:100});await cdp.send('Profiler.start');
await cdp.send('Tracing.start',{categories:'devtools.timeline,v8,blink,disabled-by-default-devtools.timeline',transferMode:'ReturnAsStream'});
await page.waitForTimeout(4000);
const idle=await page.evaluate(()=>window.fitDiagnostics());
if(scene==='battle'){
const point=await page.evaluate(()=>{const r=document.querySelector('#fit-panel').getBoundingClientRect();return{x:innerWidth/2,y:r.bottom+(innerHeight-r.bottom)*.65};});
await page.mouse.move(point.x,point.y);await page.mouse.wheel(0,-100);await page.waitForTimeout(500);
await page.mouse.down();await page.mouse.move(point.x+40,point.y-25,{steps:8});await page.mouse.up();await page.waitForTimeout(500);
await page.getByRole('button',{name:'Move',exact:true}).click();await page.locator('#battle-target').selectOption({index:1});await page.waitForTimeout(500);
await page.getByRole('button',{name:'Review action'}).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();await page.locator('#game[data-phase="player"]').waitFor();await page.waitForTimeout(500);
}
const profile=await cdp.send('Profiler.stop');const done=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');const {stream}=await done;let trace='';while(true){const part=await cdp.send('IO.read',{handle:stream});trace+=part.data;if(part.eof)break;}await cdp.send('IO.close',{handle:stream});
await mkdir('/tmp/issue-65-profile',{recursive:true});
await writeFile(`/tmp/issue-65-profile/${process.argv[2]}-${scene}-cpu.json`,JSON.stringify(profile));
await writeFile(`/tmp/issue-65-profile/${process.argv[2]}-${scene}-trace.json`,trace);
await writeFile(`/tmp/issue-65-profile/${process.argv[2]}-${scene}-diagnostics.json`,JSON.stringify({idle,final:await page.evaluate(()=>window.fitDiagnostics()),errors}));
await page.screenshot({path:`/tmp/issue-65-profile/${process.argv[2]}-${scene}.png`});
await context.close();console.log(scene,'profile retained');
}
}finally{await browser.close();}
