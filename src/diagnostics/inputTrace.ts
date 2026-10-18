/** Opt-in, bounded local capture. No telemetry or persisted game data. */
const enabled = typeof location !== 'undefined' && new URLSearchParams(location.search).get('input-debug') === '1';
const events: unknown[] = [];
const counts: Record<string, number> = {};
export function inputTrace(type: string, detail: unknown): void {
  if (!enabled) return;
  counts[type] = (counts[type] ?? 0) + 1;
  events.push({type, ms: Math.round(performance.now()), detail});
  if (events.length > 100) events.shift();
}
if (enabled) {
  const rect = (element: Element | null) => {
    if (!element) return null;
    const r = element.getBoundingClientRect();
    return {x:r.x,y:r.y,width:r.width,height:r.height};
  };
  const capture = (event: TouchEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    inputTrace(event.type, {
      target: target?.tagName, id: target?.id,
      contacts: Array.from(event.touches, t => ({id:t.identifier,x:t.clientX,y:t.clientY})),
      canvas:rect(document.querySelector('canvas')),
      region:rect(document.querySelector('#battle-board-region')),
      viewport:{width:innerWidth,height:innerHeight,visualWidth:visualViewport?.width,visualHeight:visualViewport?.height,offsetTop:visualViewport?.offsetTop},
    });
  };
  for (const type of ['touchstart','touchmove','touchend','touchcancel']) document.addEventListener(type, capture as EventListener, {capture:true,passive:true});
  const install = () => {
    const panel = document.createElement('details');
    panel.style.cssText='position:fixed;left:4px;bottom:4px;z-index:99999;background:#101828;color:white;padding:6px;max-width:85vw;max-height:45vh;overflow:auto;font:12px sans-serif;pointer-events:auto';
    const summary=document.createElement('summary');summary.textContent='Input report';
    const button=document.createElement('button');button.textContent='Capture / copy report';
    const output=document.createElement('textarea');output.readOnly=true;output.setAttribute('aria-label','Input diagnostic report');output.style.cssText='display:block;width:70vw;height:20vh';
    button.onclick=()=>{
      const report={build:__BUILD_INFO__,userAgent:navigator.userAgent,counts,events,board:document.querySelector<HTMLElement>('#game')?.dataset.battleReport};
      output.value=JSON.stringify(report);output.select();
      void navigator.clipboard?.writeText(output.value).then(()=>{button.textContent='Report copied';}).catch(()=>{button.textContent='Select and copy report below';});
    };
    panel.append(summary,button,output);document.body.append(panel);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
}
