import { test as base, type Request } from '@playwright/test';
export { expect } from '@playwright/test';

/** Build-owned filenames only: discard origins, query/hash and arbitrary paths. */
function asset(raw: string, origin: string | undefined): string {
 try { const url=new URL(raw);return url.origin===origin&&url.pathname.length<=256?url.pathname.replace(/:\d+(?::\d+)?$/,'').match(/\/assets\/[A-Za-z0-9_-]+-[A-Za-z0-9_-]{8}\.(?:js|css)$/)?.[0] ?? '[other]':'[other]'; }
 catch { return '[other]'; }
}
function failure(raw: string): string {
 const allowed=['ERR_ABORTED','ERR_FAILED','ERR_INTERNET_DISCONNECTED','ERR_CONNECTION_REFUSED','ERR_CONNECTION_RESET','ERR_NAME_NOT_RESOLVED','ERR_TIMED_OUT','ERR_NETWORK_CHANGED','ERR_BLOCKED_BY_CLIENT','Load request cancelled','Importing a module script failed','Failed to fetch dynamically imported module','Unable to preload CSS','Load failed'];
 return allowed.find(value=>raw.slice(0,2000).includes(value)) ?? '[redacted]';
}

/** Observe without routing requests, waiting, retrying, or reading browser storage. */
export const test = base.extend<{ startupDiagnostics: void }>({
 startupDiagnostics: [async ({page}, use, info) => {
  const origin=typeof info.project.use.baseURL==='string'?new URL(info.project.use.baseURL).origin:undefined;
  const assetPath=(raw:string)=>asset(raw,origin);
  const events: Record<string, unknown>[] = [], pending = new Map<Request, string>();
  const record = (value: Record<string, unknown>) => { if(events.length === 128)events.shift();events.push({at:Date.now(),...value}); };
  page.on('request', request => {
   if(!['document','script','stylesheet'].includes(request.resourceType()))return;
   const path=assetPath(request.url());if(pending.size<64)pending.set(request,path);
   record({kind:'request',type:request.resourceType(),path});
  });
  page.on('requestfinished', request => { if(pending.delete(request))record({kind:'finished',path:assetPath(request.url())}); });
  page.on('requestfailed', request => { pending.delete(request);record({kind:'requestfailed',path:assetPath(request.url()),error:failure(request.failure()?.errorText ?? '')}); });
  page.on('response', response => { if(response.status()>=400)record({kind:'http-error',path:assetPath(response.url()),status:response.status()}); });
  page.on('pageerror', error => record({kind:'pageerror',name:['Error','TypeError','SyntaxError','RangeError','ReferenceError','URIError','EvalError','AggregateError'].includes(error.name)?error.name:'Error',error:failure(error.message),frames:(error.stack?.slice(0,4000).match(/https?:\/\/[^\s)]+/g) ?? []).slice(-8).map(assetPath)}));
  page.on('console', message => { if(message.type()==='error')record({kind:'console-error',error:failure(message.text())}); });
  page.on('crash', () => record({kind:'crash'}));
  page.on('framenavigated', frame => { if(frame===page.mainFrame())record({kind:'navigation'}); });
  await page.addInitScript(() => {
   const samples: Record<string, unknown>[] = [];
   (window as unknown as {__tacticsStartupProbe:unknown}).__tacticsStartupProbe=samples;
   let previous='';
   const sample=()=>{
    const text=document.querySelector('#fit-status')?.textContent ?? '';
    const state={ready:document.readyState,screen:!!document.querySelector('#dungeon-screen'),boot:document.querySelector<HTMLElement>('#dungeon-screen')?.dataset.boot==='ready',status:/error/i.test(text)?'error':/ready/i.test(text)?'ready':/loading/i.test(text)?'loading':'other'};
    const key=JSON.stringify(state);if(key===previous)return;previous=key;
    if(samples.length===32)samples.shift();samples.push({at:performance.now(),...state});
   };
   new MutationObserver(sample).observe(document,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-boot','data-ready']});
   document.addEventListener('DOMContentLoaded',sample);window.addEventListener('load',sample);sample();
  });
  await use();
  if(info.status===info.expectedStatus)return;
  const capture=page.evaluate(()=>({
   samples:(window as unknown as {__tacticsStartupProbe:unknown}).__tacticsStartupProbe,
   ready:document.readyState,visibility:document.visibilityState,
   scripts:Array.from(document.scripts).slice(0,32).map(s=>s.src),
   styles:Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).slice(0,32).map(l=>({url:l.href,sheet:!!l.sheet})),
   resources:performance.getEntriesByType('resource').filter(e=>['script','link'].includes((e as PerformanceResourceTiming).initiatorType)).slice(-64).map(e=>({url:e.name,duration:e.duration})),
  })).catch(()=>null);
  let timer:ReturnType<typeof setTimeout>|undefined;
  const snapshot=await Promise.race([capture,new Promise<null>(resolve=>{timer=setTimeout(()=>resolve(null),1500);})]);
  clearTimeout(timer);
  const browser=snapshot?{...snapshot,scripts:snapshot.scripts.map(assetPath),styles:snapshot.styles.map(s=>({...s,url:assetPath(s.url)})),resources:snapshot.resources.map(r=>({...r,url:assetPath(r.url)}))}:null;
  await info.attach('startup-evidence',{body:JSON.stringify({events,pending:[...pending.values()],browser},null,2),contentType:'application/json'});
 },{auto:true}],
});
