// Matched #68 profiling; instrumentation is separate from uninstrumented v3 timing captures.
import { chromium, devices } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
const [label, source, output] = process.argv.slice(2);
if (!label || !source || !output) throw new Error('Usage: node docs/qa/issue-68/profile.mjs LABEL BUILD_WORKTREE OUTPUT');
const out=resolve(output); await mkdir(out,{recursive:true});
const server=spawn(process.execPath,[resolve(source,'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port','4174','--strictPort'],{cwd:source,stdio:'pipe'});
let serverError='';server.stderr.on('data',b=>serverError+=b);
let browser;
try {
  for(let attempt=0;;attempt++) {
    if(server.exitCode!==null)throw new Error(serverError);
    try {if((await fetch('http://127.0.0.1:4174')).ok)break;}catch{}
    if(attempt>100)throw new Error('Preview unavailable');
    await new Promise(r=>setTimeout(r,100));
  }
  browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
  for(const [name,options] of [
    ['desktop',devices['Desktop Chrome']],['portrait',devices['Pixel 7']],
    ['landscape',{...devices['Pixel 7'],viewport:{width:915,height:412}}],
  ]) {
    const context=await browser.newContext(options);
    await context.addInitScript(()=>{
      const stats={frames:[],draws:0,vertices:0,uploads:[],textures:[],canvasWork:[],maxTextureSize:null,gpu:null};
      const textureIds=new WeakMap(),canvasIds=new WeakMap();let nextTexture=0,nextCanvas=0,lastDraws=0,lastVertices=0;
      const records=new Map(),canvasWork=new Map();
      const canvasId=c=>{if(!canvasIds.has(c))canvasIds.set(c,++nextCanvas);return canvasIds.get(c);};
      for(const method of ['fill','stroke','fillRect','strokeRect','drawImage']) {
        const original=CanvasRenderingContext2D.prototype[method];
        CanvasRenderingContext2D.prototype[method]=function(...args){
          const start=performance.now();try{return original.apply(this,args);}finally{
            if(!this.canvas.isConnected){const id=canvasId(this.canvas),r=canvasWork.get(id)??{id,width:0,height:0,operations:0,operationMs:0};r.width=this.canvas.width;r.height=this.canvas.height;r.operations++;r.operationMs+=performance.now()-start;canvasWork.set(id,r);}
          }
        };
      }
      const original=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(...args){
        const gl=original.apply(this,args);
        if(!gl||!String(args[0]).includes('webgl')||gl.__issue68)return gl;
        gl.__issue68=true;
        stats.maxTextureSize=gl.getParameter(gl.MAX_TEXTURE_SIZE);
        const info=gl.getExtension('WEBGL_debug_renderer_info');stats.gpu=info?{vendor:gl.getParameter(info.UNMASKED_VENDOR_WEBGL),renderer:gl.getParameter(info.UNMASKED_RENDERER_WEBGL)}:null;
        const create=gl.createTexture.bind(gl),del=gl.deleteTexture.bind(gl),upload=gl.texImage2D.bind(gl);
        gl.createTexture=()=>{const t=create();textureIds.set(t,++nextTexture);return t;};
        gl.deleteTexture=t=>{records.delete(textureIds.get(t));return del(t);};
        gl.texImage2D=(...a)=>{
          const t=gl.getParameter(gl.TEXTURE_BINDING_2D),id=textureIds.get(t),image=a.length===6?a[5]:null;
          const width=image?.width??a[3],height=image?.height??a[4],start=performance.now();
          const result=upload(...a);
          const r={id,width,height,level:a[1],nominalBytes:width*height*4,source:image?.src??(image instanceof HTMLCanvasElement?'canvas:'+canvasId(image):null)};
          if(id&&a[1]===0)records.set(id,r);
          stats.uploads.push({...r,atMs:start,uploadMs:performance.now()-start});return result;
        };
        for(const method of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']) {
          if(!gl[method])continue;const draw=gl[method].bind(gl);
          gl[method]=(...a)=>{stats.draws++;stats.vertices+=(method.includes('Arrays')?a[2]:a[1])*(method.includes('Instanced')?a[a.length-1]:1);return draw(...a);};
        }
        return gl;
      };
      const tick=timestamp=>{if(stats.frames.length<5000)stats.frames.push({atMs:timestamp,draws:stats.draws-lastDraws,vertices:stats.vertices-lastVertices});lastDraws=stats.draws;lastVertices=stats.vertices;requestAnimationFrame(tick);};requestAnimationFrame(tick);
      window.issue68Resources=()=>({...stats,textures:[...records.values()],canvasWork:[...canvasWork.values()]});
    });
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    const ready=async()=>{await page.getByRole('status').filter({hasText:'Battle ready'}).waitFor();await page.locator('#game[data-phase="player"]').waitFor();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
    const report=()=>page.locator('#game').evaluate(el=>JSON.parse(el.dataset.battleReport));
    const resources=()=>page.evaluate(()=>window.issue68Resources());
    await page.goto('http://127.0.0.1:4174/?scene=battle');await ready();
    const initial={report:await report(),resources:await resources(),diagnostics:await page.evaluate(()=>window.fitDiagnostics())};
    await page.screenshot({path:`${out}/${label}-${name}-fit.png`});
    const cdp=await context.newCDPSession(page);let traceStarted=false;
    if(name==='desktop') {
      await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:100});await cdp.send('Profiler.start');
      await cdp.send('Tracing.start',{categories:'devtools.timeline,v8,blink,gpu,disabled-by-default-devtools.timeline',transferMode:'ReturnAsStream'});traceStarted=true;
    }
    const windows=[];
    const windowStart=()=>page.evaluate(()=>performance.now());
    const windowEnd=async(action,start)=>windows.push({action,startMs:start,endMs:await windowStart()});
    let start=await windowStart();await page.waitForTimeout(4000);await windowEnd('idle',start);
    const point=await page.evaluate(()=>{const r=document.querySelector('#fit-panel').getBoundingClientRect();return{x:innerWidth/2,y:r.bottom+(innerHeight-r.bottom)*.65};});
    start=await windowStart();await page.mouse.move(point.x,point.y);await page.mouse.wheel(0,-100);await page.waitForTimeout(500);await windowEnd('zoom',start);
    start=await windowStart();await page.mouse.down();await page.mouse.move(point.x+40,point.y-25,{steps:8});await page.mouse.up();await page.waitForTimeout(500);await windowEnd('pan',start);
    start=await windowStart();await page.getByRole('button',{name:'Move',exact:true}).click();await page.locator('#battle-target').selectOption({index:1});await page.waitForTimeout(500);await windowEnd('selection',start);
    await page.screenshot({path:`${out}/${label}-${name}-overlays.png`});
    start=await windowStart();await page.getByRole('button',{name:'Review action'}).click();await page.getByRole('button',{name:'Confirm',exact:true}).click();await ready();await page.waitForTimeout(500);await windowEnd('move',start);
    const interaction={report:await report(),resources:await resources(),diagnostics:await page.evaluate(()=>window.fitDiagnostics())};
    await page.screenshot({path:`${out}/${label}-${name}-moved.png`});
    if(traceStarted){
      const cpu=await cdp.send('Profiler.stop');await writeFile(`${out}/${label}-cpu.json`,JSON.stringify(cpu));
      const done=new Promise(r=>cdp.once('Tracing.tracingComplete',r));await cdp.send('Tracing.end');const {stream}=await done;let trace='';
      for(;;){const part=await cdp.send('IO.read',{handle:stream});trace+=part.data;if(part.eof)break;}await cdp.send('IO.close',{handle:stream});
      await writeFile(`${out}/${label}-trace.json.gz`,gzipSync(trace));
    }
    await page.mouse.move(point.x,point.y);for(let i=0;i<8;i++){await page.mouse.wheel(0,-10000);await page.waitForTimeout(50);}
    await page.screenshot({path:`${out}/${label}-${name}-max-zoom.png`});const maxZoom=await report();
    const restarts=[];for(let run=0;run<6;run++){await page.getByRole('button',{name:'Restart battle'}).click();await ready();restarts.push({report:await report(),resources:await resources()});}
    const result={label,profile:name,browserVersion:browser.version(),build:initial.diagnostics.build,initial,interaction,maxZoom,windows,restarts,errors,
      notes:'WebGL calls and nominal level-0 RGBA texture bytes, including retained sources and renderer targets. Offscreen canvas operation time excludes orchestration/driver work. GPU model is reported; isolated GPU elapsed timer is unavailable. Profiling instrumentation is outside v3 timing captures.'};
    await writeFile(`${out}/${label}-${name}-profile.json`,JSON.stringify(result,null,2)+'\n');
    if(errors.length)throw new Error(errors.join('; '));
    console.log(label,name,'profile, visual fixtures and six restarts retained');await context.close();
  }
}finally{await browser?.close();server.kill();}
