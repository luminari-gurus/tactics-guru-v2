// Task-specific same-host comparison. Build both trees first; no routing (which disables HTTP cache).
// node --experimental-strip-types scripts/measure-battle-audio.ts BASELINE_DIST CANDIDATE_DIST OUTPUT.json
import { spawn } from 'node:child_process';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { platform, release, cpus } from 'node:os';
import { chromium, devices } from '@playwright/test';

const [baseline,candidate,output]=process.argv.slice(2);
if(!baseline || !candidate || !output)throw Error('Expected baseline dist, candidate dist, output JSON');
async function inventory(dir:string):Promise<{path:string;bytes:number;gzipBytes:number;sha256:string}[]> {
  const result=[];
  for(const file of await readdir(dir,{withFileTypes:true})) {
    const path=join(dir,file.name);
    if(file.isDirectory())result.push(...await inventory(path));
    else {const bytes=await readFile(path);result.push({path,bytes:bytes.length,gzipBytes:gzipSync(bytes).length,sha256:createHash('sha256').update(bytes).digest('hex')});}
  }
  return result;
}
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const samples:unknown[]=[],builds:unknown[]=[];
try {
  for(const [label,directory] of [['baseline',baseline],['candidate',candidate]]) {
    const dist=resolve(directory),port=4175,url=`http://127.0.0.1:${port}`;
    const files=await inventory(dist);
    builds.push({label,dist,files,compressedCodeBytes:files.filter(f=>/\.(js|css)$/.test(f.path)).reduce((n,f)=>n+f.gzipBytes,0),cueBytes:files.filter(f=>f.path.includes('/audio/battle/')).reduce((n,f)=>n+f.bytes,0)});
    const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort','--outDir',dist],{stdio:'pipe'});
    let serverOutput='';server.stdout.on('data',d=>serverOutput+=d);server.stderr.on('data',d=>serverOutput+=d);
    try {
      for(let i=0;;i++) {
        if(server.exitCode!==null || i>100)throw Error(`Preview failed: ${serverOutput}`);
        try {if(serverOutput.includes(url) && (await fetch(url)).ok)break;}catch{}
        await new Promise(r=>setTimeout(r,100));
      }
      for(const [profile,options] of [
        ['desktop',devices['Desktop Chrome']],['mobile-portrait',devices['Pixel 7']],
        ['mobile-landscape',{...devices['Pixel 7'],viewport:{width:915,height:412}}],
      ] as const) for(const sound of [false,true]) for(let repetition=1;repetition<=3;repetition++) {
        const context=await browser.newContext(options);
        try {
          await context.addInitScript(()=>{
            const evidence={readyMs:null as number|null,playerMs:null as number|null,firstInputMs:null as number|null,inputResponseMs:null as number|null,confirmMs:null as number|null,commitResponseMs:null as number|null};
            Object.assign(window,{__audioMeasure:evidence});
            const observer=new MutationObserver(()=>{
              const game=document.querySelector<HTMLElement>('#game');
              if(game?.dataset.ready==='true')evidence.readyMs??=performance.now();
              if(game?.dataset.phase==='player')evidence.playerMs??=performance.now();
            });observer.observe(document,{subtree:true,attributes:true,childList:true});
            document.addEventListener('click',event=>{
              const id=(event.target as HTMLElement).id;
              if(id==='battle-move') {evidence.firstInputMs=performance.now();queueMicrotask(()=>evidence.inputResponseMs=performance.now()-evidence.firstInputMs!);}
              if(id==='dialog-confirm') {evidence.confirmMs=performance.now();queueMicrotask(()=>evidence.commitResponseMs=performance.now()-evidence.confirmMs!);}
            },true);
          });
          const page=await context.newPage(),errors:string[]=[];
          page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
          for(const cache of ['cold','warm']) {
            if(cache==='cold')await page.goto(url);else await page.reload();
            await page.waitForFunction(()=>document.querySelector<HTMLElement>('#game')?.dataset.ready==='true');
            if(sound && label==='candidate')await page.locator('#battle-sound').click();
            await page.waitForFunction(()=>document.querySelector<HTMLElement>('#game')?.dataset.phase==='player');
            if(label==='candidate')await page.waitForFunction(()=>window.fitDiagnostics().battleAudio?.load!=='loading');
            await page.locator('#battle-move').click();await page.locator('#battle-target').selectOption({index:1});await page.locator('#battle-review').click();await page.locator('#dialog-confirm').click();
            await page.waitForFunction(()=>document.querySelector<HTMLElement>('#game')?.dataset.phase==='player');
            const evidence=await page.evaluate(()=>({timings:(window as unknown as {__audioMeasure:unknown}).__audioMeasure,diagnostics:window.fitDiagnostics()}));
            samples.push({label,profile,soundRequested:sound,soundEffective:label==='candidate'&&sound,repetition,cache,...evidence,errors:[...errors]});
            console.log(`${label} ${profile} sound=${sound} ${repetition} ${cache}`);
          }
        } finally {await context.close();}
      }
    } finally {server.kill();await new Promise<void>(r=>server.once('exit',()=>r()));}
  }
} finally {
  await browser.close();await mkdir(dirname(output),{recursive:true});
  await writeFile(output,JSON.stringify({capturedAt:new Date().toISOString(),host:{platform:platform(),release:release(),cpu:cpus()[0].model},browser:browser.version(),conditions:{network:'localhost, unthrottled',cpu:'unthrottled',cache:'new context for cold; same-page reload for warm; no request routing',repetitions:3,readiness:'DOM data-ready=true; first player decision recorded separately',interaction:'trusted Move button and confirm handler through microtask after synchronous render',audio:'enabled after readiness; reload defaults to muted',frames:'No merged battle frame instrumentation; F1/F2 remain unverified here'},budgets:{coldReadyMs:2500,warmReadyMs:750,compressedCodeBytes:400000,coldSceneAssetBytes:1500000,F1p50Ms:16.7,F1p95Ms:20,F2p95Ms:33.4},builds,samples},null,2)+'\n');
}
