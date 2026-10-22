import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
const [baseline, output] = process.argv.slice(2);
const require = createRequire(resolve(baseline, 'package.json'));
const { webkit, devices } = require('@playwright/test');
const server = spawn(process.execPath, [resolve(baseline,'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port','4175','--strictPort'], {cwd:baseline,stdio:'ignore'});
let browser;
try {
  for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4175/dungeon')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await webkit.launch();const receipts=[];
  for(const [name,device,viewport] of [['desktop','Desktop Safari',null],['portrait','iPhone 13',null],['landscape','iPhone 13',{width:844,height:390}]]){
    const {defaultBrowserType,...options}=devices[device];const context=await browser.newContext({...options,...(viewport?{viewport}:{})});const page=await context.newPage();
    await page.goto('http://127.0.0.1:4175/dungeon');await page.getByRole('button',{name:'Play unsaved dungeon',exact:true}).click();
    receipts.push(await page.evaluate(async name=>{const samples=[];let previous=await new Promise(r=>requestAnimationFrame(r));for(let i=0;i<30;i++){const now=await new Promise(r=>requestAnimationFrame(r));samples.push(now-previous);previous=now;}const sorted=[...samples].sort((a,b)=>a-b);return {name,build:window.fitDiagnostics().build,userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight},samples,idleP50:sorted[14],idleP95:sorted[28],budget:{idleP50:16.7,idleP95:20}};},name));await context.close();
  }
  writeFileSync(output,JSON.stringify({note:'Unchanged base floor summary; same 30-rAF idle sampling as feature receipts. Above-budget samples remain failures; no exception is granted.',receipts},null,2)+'\n');
} finally {await browser?.close();server.kill('SIGTERM');}
