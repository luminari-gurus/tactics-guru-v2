import '../style.css';
import '../ui/runFlow.css';
import { authoredRun, authoredEncounters, runCatalog } from '../content/encounters';
import { itemCatalog } from '../content/items';
import { freshRunSnapshot } from '../domain/runBattle';
import { type RunSaveContext } from '../domain/runSaveEnvelope';
import { RunItemSession } from './RunItemSession';
import { BattleDialogs, type DialogChoice } from '../ui/dialogs';
import { mountRunItems } from '../ui/runItems';
import { BattleScene, type RunBattleHost } from '../phaser/BattleScene';
import { createGame } from '../phaser/start';
import { diagnosticsSnapshot } from '../diagnostics/browser';
import type Phaser from 'phaser';
import { createRunStorage, type RunLoadResult } from '../persistence/runStorage';
import { mountBattleLayout } from '../ui/battleLayout';

const context: RunSaveContext = { definition: authoredRun, encounters: authoredEncounters, catalog: runCatalog, items: itemCatalog };
const storage=createRunStorage(context),initial=storage.load();
const controller = new RunItemSession(initial.ok && initial.selected ? initial.selected.state : freshRunSnapshot(crypto.randomUUID(), 13, context), context,storage);
const container = document.querySelector<HTMLElement>('#game')!;
const panel = document.querySelector<HTMLElement>('#fit-panel')!;
const status = document.querySelector<HTMLElement>('#fit-status')!;
const restart = document.querySelector<HTMLButtonElement>('#fit-restart')!;
const controls = document.querySelector<HTMLElement>('#battle-controls')!;
const persistence = document.querySelector<HTMLElement>('#battle-persistence')!;
const screen = document.createElement('section');screen.id='run-screen';screen.setAttribute('aria-label','Authored run');document.body.append(screen);
const items = document.createElement('div');
const actions = document.createElement('div');actions.className='run-actions';
const nav = document.createElement('a');nav.href=import.meta.env.BASE_URL;nav.textContent='Single battle';nav.className='run-entry-link';
const progress=document.createElement('p');progress.id='run-progress';panel.prepend(progress);
panel.append(nav);
document.querySelectorAll<HTMLElement>('#fit-panel > details').forEach(e=>e.hidden=true);
document.querySelector<HTMLElement>('#board-caption')!.textContent='Tap to select · Drag to pan · Wheel/pinch to zoom · Keyboard: arrows, Enter selects, Escape cancels';
panel.setAttribute('aria-label','Run battle controls');restart.textContent='Start new run';
mountBattleLayout();
const shell = document.querySelector<HTMLElement>('#battle-shell')!;
let engine: Phaser.Game | null = null, host: RunBattleHost | null = null, mounted: (()=>void) | null = null;
let live=true, playing=false, startup=true;
const sound={enabled:false};
const dialogs=new BattleDialogs(()=>host?.modalTransition(),()=>requestNew());
window.fitDiagnostics=diagnosticsSnapshot;
function button(label:string,run:()=>void,id?:string) {
 const node=document.createElement('button');node.type='button';node.textContent=label;if(id)node.id=id;node.addEventListener('click',run);return node;
}
function evidence() { container.dataset.runSnapshot=JSON.stringify(controller.snapshot); container.dataset.runBattleRecord=JSON.stringify(controller.completedBattle); }
function fail(message:string) {status.textContent=`Error: ${message}. Reload to retry.`;status.setAttribute('role','alert');restart.disabled=false;}
function setStatus(value:'loading'|'ready'|'error') {
 status.textContent=value==='ready'?'Battle ready':value==='loading'?'Loading':'Error';
 container.dataset.ready=String(value==='ready');restart.disabled=value!=='ready';
}
function unmount() {mounted?.();mounted=null;}
function stopBattle() {
 playing=false;host=null;engine?.scene.stop('battle');controls.hidden=true;container.style.visibility='hidden';
}
function endBattle() {if(!live || !playing)return;stopBattle();render();screen.querySelector<HTMLElement>('h1')?.focus();}
function startBattle() {
 if(!live || playing)return;
 // Save callbacks during construction publish evidence, not a competing screen.
 playing=true;const session=controller.startEncounter();
 if(!session){playing=false;render();return;}
 unmount();controller.onChange=()=>{evidence();const label=persistence.querySelector('span');if(label)label.textContent=controller.status;};screen.hidden=true;shell.hidden=false;panel.hidden=false;controls.hidden=false;container.style.visibility='visible';
 document.querySelector<HTMLElement>('#battle-heading h1')!.textContent=progress.textContent;
 persistence.hidden=false;
 persistence.replaceChildren(button('Save recovery',()=>showRecovery()),document.createElement('span'));
 persistence.querySelector('span')!.textContent=controller.status;
 host={catalog:session.catalog,session,dialogs,sound,modalTransition:()=>{},ended:endBattle,restart:requestNew};
 const scene=new BattleScene(setStatus,fail,host);
 setStatus('loading');
 if(!engine)engine=createGame(scene,true);
 else {engine.scene.remove('battle');engine.scene.add('battle',scene,true);}
 evidence();
}
function replace(review:RunLoadResult) {
 if(controller.replace(review,crypto.randomUUID(),(controller.snapshot.items.run.seed+1)>>>0)) {
  startup=false;stopBattle();render();screen.querySelector<HTMLElement>('h1')?.focus();
 } else {if(!playing)render();showRecovery();}
}
function requestNew() {
 if(!live || dialogs.open)return;
 const review=controller.inspect();
 dialogs.showChoices('Start new run?', 'Replace this run with a full party, empty inventory and a fresh seed? Export saved data first if needed.',[
  {id:'run-confirm-new',label:'Start new run',run:()=>replace(review)},
  {id:'run-cancel-new',label:'Cancel',run:()=>restart.focus()},
 ],()=>restart.focus());
}
function showRecovery() {
 const closeRecovery=()=>{
  if(!live || playing)return;
  render();
  // Boundary rendering replaces the invoker, so focus its new equivalent afterward.
  [...screen.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent==='Save recovery')?.focus();
 };
 const review=controller.inspect(),choices:DialogChoice[]=[];
 for(const [index,{slot,text}] of controller.recoveryTexts(review).entries()) {
  choices.push({id:`run-export-${slot}-${index}`,label:`Export ${slot} save`,run:()=>{
   const url=URL.createObjectURL(new Blob([JSON.stringify({slot,text})],{type:'application/json'}));
   const link=document.createElement('a');link.href=url;link.download=`tactics-guru-run-${slot}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }});
  if(review.ok && 'text' in review.inspection[slot] && review.inspection[slot].text===text)choices.push({id:`run-remove-${slot}`,label:`Remove ${slot} save`,run:()=>{
   dialogs.showChoices('Remove reviewed save?',`Export first if needed. Remove the reviewed ${slot} bytes?`,[
    {id:'run-confirm-remove',label:'Remove reviewed save',run:()=>{controller.remove(slot,review);showRecovery();}},
    {id:'run-cancel-remove',label:'Cancel',run:()=>showRecovery()},
   ]);
  }});
 }
 if(startup && review.ok && review.selected)choices.push({id:'run-recover-continue',label:'Continue saved run',run:()=>continueRun(review)});
 choices.push({id:'run-retry-save',label:startup?'Retry storage':'Retry saving',run:()=>{if(!startup)controller.save();showRecovery();}},
  {id:'run-close-recovery',label:'Close',run:closeRecovery});
 const message=review.ok?`primary: ${review.inspection.primary.status}. backup: ${review.inspection.backup.status}. ${controller.status}`:`Storage ${review.kind}. Your run can continue unsaved.`;
 dialogs.showChoices('Run save recovery',message,choices,closeRecovery);
}
function continueRun(review:RunLoadResult) {
 if(!controller.continue(review))return;
 startup=false;render();
 if(controller.snapshot.activeBattle)startBattle();
}
function render() {
 if(!live)return;evidence();
 const snapshot=controller.snapshot,run=snapshot.items.run;
 progress.textContent=`Encounter ${run.encounterIndex+1} of 3 · ${run.encounters[run.encounterIndex].replace('encounter:','').replaceAll('_',' ')}`;
 if(playing){const label=persistence.querySelector('span');if(label)label.textContent=controller.status;return;}
 unmount();shell.hidden=true;panel.hidden=true;screen.hidden=false;container.style.visibility='hidden';
 screen.replaceChildren(items,actions);actions.replaceChildren();
 mounted=mountRunItems(items,controller,dialogs,{continueRun,recover:showRecovery});
 const itemRender=controller.onChange!;
 controller.onChange=()=>{itemRender();evidence();renderActions();};
 if(startup) {
  controller.onChange=null;
  const review=controller.inspect();
  const title=items.querySelector('h1')!;title.textContent='Three-encounter run';
  if(review.ok && review.selected)actions.append(button('Continue saved run',()=>continueRun(review),'run-continue'));
  actions.append(button('Start new run',()=>{
   if(review.ok && Object.values(review.inspection).every(s=>s.status==='missing')) {
    startup=false;controller.save();render();
   } else requestNew();
  },'run-start'));
  if(!review.ok || (!review.selected && Object.values(review.inspection).some(slot=>slot.status==='unavailable')))actions.append(button('Play unsaved run',()=>{startup=false;controller.save();render();},'run-unsaved'));
  actions.append(button('Save recovery',showRecovery,'run-recovery'));
  // Startup is read-only: the seed placeholder is never saved or rendered as owned progress.
  items.replaceChildren(title);actions.append(nav.cloneNode(true));controller.onChange=()=>{evidence();};
 } else renderActions();
 const title=items.querySelector('h1');if(title)title.setAttribute('tabindex','-1');
}
function renderActions() {
 actions.replaceChildren();
 const snapshot=controller.snapshot,run=snapshot.items.run;
 if(run.phase==='battle' && !snapshot.activeBattle) actions.append(button('Start encounter',startBattle,'run-start-encounter'));
 else if(run.phase==='victory' || run.phase==='defeat') {
  items.querySelector('h1')!.textContent=run.phase==='victory'?'Run victory':'Run defeat';
  actions.append(button('Start new run',()=>replace(controller.inspect()),'run-new'));
 }
 actions.append(nav.cloneNode(true));
}
restart.addEventListener('click',requestNew);
// Repeated activation must not cross replaced controls or trigger another destructive intent.
document.addEventListener('keydown',e=>{if(e.repeat && (e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopImmediatePropagation();}},true);
window.addEventListener('error',()=>fail('The run encountered a runtime error'));
window.addEventListener('unhandledrejection',()=>fail('The run encountered an asynchronous error'));
window.addEventListener('pagehide',()=>{live=false;controller.dispose();stopBattle();unmount();dialogs.dispose();},{once:true});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
render();
