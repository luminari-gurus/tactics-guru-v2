import { testingProgress } from '../ui/testingProgress';
import { consumeEntryIntent, routeHref } from './routes';
import { appEntry } from './entry';
import { menuReturnLink, confirmMenuDeparture } from '../ui/menuReturn';
import { mountTelemetryPreferences } from '../telemetry/preferences';
import { reportFailure } from '../telemetry/telemetry';
import '../style.css';
import '../ui/runFlow.css';
import { runSaveContext as context } from './runContext';
import { freshRunSnapshot } from '../domain/runBattle';
import { RunItemSession } from './RunItemSession';
import { RunHistory } from './RunHistory';
import { BattleDialogs, type DialogChoice } from '../ui/dialogs';
import { mountRunItems } from '../ui/runItems';
import { BattleScene, type RunBattleHost } from '../phaser/BattleScene';
import { createGame } from '../phaser/start';
import { diagnosticsSnapshot } from '../diagnostics/browser';
import { createRunStorage, serializeBrowserRunWrite, type RunLoadResult } from '../persistence/runStorage';
import { mountBattleLayout } from '../ui/battleLayout';
import { showGameError } from '../ui/gameError';
import { observeActivePlaytime } from './ActivePlaytime';

const storage=appEntry.persistent?createRunStorage(context):null,initial=storage?.load();
const controller = new RunItemSession(initial?.ok && initial.selected ? initial.selected.state : freshRunSnapshot(crypto.randomUUID(), 13, context, appEntry.persistent), context,storage,serializeBrowserRunWrite,storage ? new RunHistory('run') : null);
const container = document.querySelector<HTMLElement>('#game')!;
const panel = document.querySelector<HTMLElement>('#fit-panel')!;
const status = document.querySelector<HTMLElement>('#fit-status')!;
const restart = document.querySelector<HTMLButtonElement>('#fit-restart')!;
const controls = document.querySelector<HTMLElement>('#battle-controls')!;
const persistence = document.querySelector<HTMLElement>('#battle-persistence')!;
const screen = document.createElement('section');screen.id='run-screen';screen.setAttribute('aria-label','Authored run');document.body.append(screen);
const items = document.createElement('div');
const actions = document.createElement('div');actions.className='run-actions';
const nav = document.createElement('a');nav.href=routeHref('battle',import.meta.env.BASE_URL);nav.textContent='Single battle';nav.className='run-entry-link';
const progress=document.createElement('p');progress.id='run-progress';panel.prepend(progress);
const dungeonNav = document.createElement('a'); dungeonNav.href=`${import.meta.env.BASE_URL}dungeon`; dungeonNav.textContent='Dungeon floors'; dungeonNav.className='run-entry-link';
panel.append(nav, dungeonNav, returnLink());
document.querySelector<HTMLElement>('#board-caption')!.textContent='Tap to select · Drag to pan · Wheel/pinch to zoom · Keyboard: arrows, Enter selects, Escape cancels';
panel.setAttribute('aria-label','Run battle controls');restart.textContent='Start new run';
mountBattleLayout();
const shell = document.querySelector<HTMLElement>('#battle-shell')!;
let host: RunBattleHost | null = null, mounted: (()=>void) | null = null;
let live=true, playing=false, startup=true,reviewing=false;
const sound={enabled:false};
const dialogs=new BattleDialogs(()=>{playtime?.pause();host?.modalTransition();queueMicrotask(()=>playtime?.sync());},()=>requestNew());
const playtime=storage?observeActivePlaytime(active=>controller.setPlaytimeActive(active),()=>live&&!reviewing&&!startup&&playing&&!replacementPending&&!dialogs.open&&container.dataset.ready==='true'&&host?.session.state.outcome==='ongoing',async()=>await pauseForReview() && confirmMenuDeparture(()=>!startup&&controller.hasUnsavedProgress,showRecovery)):null;
function returnLink(){return menuReturnLink(()=>!startup&&controller.hasUnsavedProgress,showRecovery,storage?()=>pauseForReview():undefined);}
async function pauseForReview() {
 reviewing=true;playtime?.pause();
 let cancel:()=>void=()=>{};
 const canceled=new Promise<false>(resolve=>{cancel=()=>resolve(false);});
 dialogs.showChoices('Saving journey','Saving your journey before continuing.',[{id:'run-cancel-flush',label:'Cancel',run:cancel}],cancel);
 reviewing=false;
 const ready=await Promise.race([controller.flushPlaytime().then(()=>true),canceled]);
 if(!live||!ready)return false;
 // Keep this modal open until its caller replaces it or navigates. Closing here
 // would briefly resume time in the microtask before the actual review opens.
 return true;
}
window.fitDiagnostics=diagnosticsSnapshot;
function button(label:string,run:()=>void,id?:string) {
 const node=document.createElement('button');node.type='button';node.textContent=label;if(id)node.id=id;node.addEventListener('click',run);return node;
}
function evidence() { container.dataset.runSnapshot=JSON.stringify(controller.snapshot); container.dataset.runBattleRecord=JSON.stringify(controller.completedBattle); }
function fail(message:string,handled=true) {container.dataset.ready='false';playtime?.sync();if(handled)reportFailure('scene_load', { route: 'run' });showGameError(`Error: ${message}. Reload to retry.`);restart.disabled=false;}
function setStatus(value:'loading'|'ready'|'error') {
 status.textContent=value==='ready'?'Battle ready':value==='loading'?'Loading':'Error';
 container.dataset.ready=String(value==='ready');restart.disabled=value!=='ready';
 playtime?.sync();
}
function unmount() {mounted?.();mounted=null;}
function stopBattle() {
 playing=false;host=null;engine.scene.stop('battle');controls.hidden=true;container.style.visibility='hidden';
 playtime?.sync();
}
function endBattle() {if(!live || !playing)return;stopBattle();render();screen.querySelector<HTMLElement>('h1')?.focus();}
function startBattle() {
 if(!live || playing || replacementPending)return;
 // Save callbacks during construction publish evidence, not a competing screen.
 playing=true;const session=controller.startEncounter();
 if(!session){playing=false;render();return;}
 unmount();controller.onChange=()=>{evidence();const label=persistence.querySelector('span');if(label)label.textContent=controller.status;};screen.hidden=true;shell.hidden=false;panel.hidden=false;controls.hidden=false;container.style.visibility='visible';
 renderProgress();
 persistence.hidden=false;
 persistence.replaceChildren(...(storage?[button('Save recovery',()=>showRecovery())]:[]),document.createElement('span'));
 persistence.querySelector('span')!.textContent=controller.status;
 host={catalog:session.catalog,session,dialogs,sound,modalTransition:()=>{},ended:endBattle,restart:requestNew};
 const scene=new BattleScene(setStatus,fail,host);
 setStatus('loading');
 engine.scene.remove('battle');engine.scene.add('battle',scene,true);
 evidence();
}
let replacementPending=false;
async function replace(review:RunLoadResult) {
 if(replacementPending)return;
 replacementPending=true;
 dialogs.showChoices('Starting new run','Preparing your next journey.',[]);
 try {
  const accepted=await controller.replace(review,crypto.randomUUID(),(controller.snapshot.items.run.seed+1)>>>0);
  replacementPending=false;
  if(!live)return;
  if(accepted) {
   startup=false;stopBattle();dialogs.close();render();screen.querySelector<HTMLElement>('h1')?.focus();
  } else {if(!playing)render();showRecovery();}
 } finally {replacementPending=false;}
}
async function requestNew() {
 if(!live || dialogs.open || replacementPending)return;
 if(!storage){
  if(startup)controller.startNew();
  else controller.restart(crypto.randomUUID(),(controller.snapshot.items.run.seed+1)>>>0);
  startup=false;stopBattle();render();screen.querySelector<HTMLElement>('h1')?.focus();return;
 }
 if(!await pauseForReview())return;
 const review=controller.inspect();
 const cancel=()=>{if(startup){render();screen.querySelector<HTMLElement>('#run-start')?.focus();}else restart.focus();};
 dialogs.showChoices('Start new run?', 'End this unfinished journey and start with a full party, empty inventory and a fresh seed? Export saved data first if needed.',[
  {id:'run-confirm-new',label:'Start new run',run:()=>replace(review),keepOpen:true},
  {id:'run-cancel-new',label:'Cancel',run:cancel},
 ],cancel);
}
async function showRecovery() {
 if(!storage)return;
 if(!await pauseForReview())return;
 const closeRecovery=()=>{
  if(!live || playing)return;
  render();
  // Boundary rendering replaces the invoker, so focus its new equivalent afterward.
  [...screen.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent==='Save recovery')?.focus();
 };
 const review=controller.inspect(),choices:DialogChoice[]=[];
 if(!startup && controller.hasUnsavedProgress)choices.push({id:'run-export-current',label:'Export unsaved run',run:()=>{
  const encoded=controller.exportCurrent();
  if(!encoded.ok)return;
  const url=URL.createObjectURL(new Blob([encoded.text],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='tactics-guru-run-unsaved.json';
  link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);closeRecovery();
 }});
 for(const [index,{slot,text}] of controller.recoveryTexts(review).entries()) {
  choices.push({id:`run-export-${slot}-${index}`,label:`Export ${slot} save`,run:()=>{
   const url=URL.createObjectURL(new Blob([JSON.stringify({slot,text})],{type:'application/json'}));
   const link=document.createElement('a');link.href=url;link.download=`tactics-guru-run-${slot}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);closeRecovery();
  }});
  if(review.ok && 'text' in review.inspection[slot] && review.inspection[slot].text===text)choices.push({id:`run-remove-${slot}`,label:`Remove ${slot} save`,run:()=>{
   dialogs.showChoices('Remove reviewed save?',`Export first if needed. Remove the reviewed ${slot} bytes?`,[
    {id:'run-confirm-remove',label:'Remove reviewed save',keepOpen:true,run:()=>controller.queueWrite(()=>{controller.remove(slot,review);showRecovery();})},
    {id:'run-cancel-remove',label:'Cancel',run:()=>showRecovery()},
   ]);
  }});
 }
 if((startup || controller.isUnsavedOnly || controller.hasSaveConflict) && review.ok && review.selected)choices.push({id:'run-recover-continue',label:'Continue saved run',run:()=>continueRun(review)});
 choices.push({id:'run-retry-save',label:startup?'Retry storage':'Retry saving',run:()=>{if(startup)showRecovery();else controller.requestSave(showRecovery);}},
  {id:'run-close-recovery',label:'Close',run:closeRecovery});
 const message=review.ok?`primary: ${review.inspection.primary.status}. backup: ${review.inspection.backup.status}. ${controller.status}`:`Storage ${review.kind}. Your run can continue unsaved.`;
 dialogs.showChoices('Run save recovery',message,choices,closeRecovery);
}
function continueRun(review:RunLoadResult) {
 if(!controller.continue(review)){showRecovery();return;}
 startup=false;stopBattle();render();
 if(controller.snapshot.activeBattle)startBattle();
}
function renderProgress() {
 const run=controller.snapshot.items.run;
 const label=`Encounter ${run.encounterIndex+1} of 3 · ${run.encounters[run.encounterIndex].replace('encounter:','').replaceAll('_',' ')}`;
 progress.textContent=label;
 document.querySelector<HTMLElement>('#battle-heading h1')!.textContent=label;
}
function render() {
 if(!live)return;evidence();renderProgress();
 if(playing){const label=persistence.querySelector('span');if(label)label.textContent=controller.status;return;}
 unmount();shell.hidden=true;panel.hidden=true;screen.hidden=false;container.style.visibility='hidden';
 screen.replaceChildren(items,actions);actions.replaceChildren();
 mounted=mountRunItems(items,controller,dialogs,{continueRun,recover:showRecovery});
 const itemRender=controller.onChange!;
 controller.onChange=()=>{itemRender();evidence();renderActions();};
 if(startup) {
  controller.onChange=null;
  const title=items.querySelector('h1')!;title.textContent='Three-encounter run';
  if(storage){
  const review=controller.inspect();
  if(review.ok && review.selected)actions.append(button('Continue saved run',()=>continueRun(review),'run-continue'));
  actions.append(button('Start new run',()=>{
   const review=controller.inspect();
   if(review.ok && Object.values(review.inspection).every(s=>s.status==='missing')) {
    if(initial?.ok && initial.selected)replace(review);
    else {startup=false;controller.startNew();render();}
   } else requestNew();
  },'run-start'));
  if(!review.ok || (!review.selected && Object.values(review.inspection).some(slot=>slot.status==='unavailable')))actions.append(button('Play unsaved run',()=>{startup=false;controller.playUnsaved();render();},'run-unsaved'));
  actions.append(button('Save recovery',showRecovery,'run-recovery'));
  }else actions.append(button('Start new run',requestNew,'run-start'),testingProgress('run'));
  // Startup is read-only: the seed placeholder is never saved or rendered as owned progress.
  items.replaceChildren(title);actions.append(nav.cloneNode(true), dungeonNav.cloneNode(true), returnLink());mountTelemetryPreferences(actions);controller.onChange=()=>{evidence();};
 } else renderActions();
 const title=items.querySelector('h1');if(title)title.setAttribute('tabindex','-1');
}
function renderActions() {
 actions.replaceChildren();
 if(!storage)actions.append(testingProgress('run'));
 const snapshot=controller.snapshot,run=snapshot.items.run;
 if(run.phase==='battle' && !snapshot.activeBattle) {
  const enter=button('Start encounter',startBattle,'run-start-encounter');enter.disabled=replacementPending;actions.append(enter);
 }
 else if(run.phase==='victory' || run.phase==='defeat') {
  items.querySelector('h1')!.textContent=run.phase==='victory'?'Run victory':'Run defeat';
  actions.append(button('Start new run',()=>{
   if(!replacementPending){if(storage)replace(controller.inspect());else requestNew();}
  },'run-new'));
 }
  actions.append(nav.cloneNode(true), dungeonNav.cloneNode(true), returnLink());mountTelemetryPreferences(actions);
}
restart.addEventListener('click',()=>{restart.focus();requestNew();});
// Repeated activation must not cross replaced controls or trigger another destructive intent.
document.addEventListener('keydown',e=>{if(e.repeat && (e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopImmediatePropagation();}},true);
window.addEventListener('error',()=>fail('The run encountered a runtime error',false));
window.addEventListener('unhandledrejection',()=>fail('The run encountered an asynchronous error',false));
window.addEventListener('pagehide',()=>{playtime?.dispose();live=false;controller.dispose();stopBattle();unmount();dialogs.dispose();},{once:true});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
render();
// Prepare the one engine while the read-only start screen is displayed. No
// battle scene or save is created until the existing controls request it.
const engine=createGame([],true);

const entryIntent=storage?consumeEntryIntent():null;
if(entryIntent==='continue')continueRun(controller.inspect());
else if(entryIntent==='recovery')showRecovery();
else if(entryIntent==='new')requestNew();
