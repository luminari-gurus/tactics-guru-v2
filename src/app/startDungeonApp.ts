import { testingProgress } from '../ui/testingProgress';
import { consumeEntryIntent } from './routes';
import { appEntry } from './entry';
import { menuReturnLink, confirmMenuDeparture } from '../ui/menuReturn';
import { DungeonMap, dungeonBiomeLabel, dungeonEncounterLabel } from '../ui/dungeonMap';
import '../style.css';
import { mountTelemetryPreferences } from '../telemetry/preferences';
import { DungeonSession } from './DungeonSession';
import { RunHistory } from './RunHistory';
import { freshDungeon, FloorCache, newDungeonSeed, type DungeonState } from '../domain/dungeon';
import { bothDungeonSlotsMissing, createDungeonStorage, serializeBrowserDungeonWrite } from '../persistence/dungeonStorage';
import { dungeonElement as el, renderDungeon } from '../ui/dungeon';
import { BattleDialogs, type DialogChoice } from '../ui/dialogs';
import type { RunBattleHost } from '../phaser/BattleScene';
import { mountBattleLayout } from '../ui/battleLayout';
import { diagnosticsSnapshot } from '../diagnostics/browser';
import { observeActivePlaytime } from './ActivePlaytime';
function newSeed(previous?: number) {
 return newDungeonSeed(()=>crypto.getRandomValues(new Uint32Array(1))[0],previous);
}
const storage=appEntry.persistent?createDungeonStorage():null,session=new DungeonSession(freshDungeon(crypto.randomUUID(),newSeed(),undefined,appEntry.persistent),storage,storage?new RunHistory('dungeon'):null,undefined,serializeBrowserDungeonWrite),cache=new FloorCache();
const screen=el('main');screen.id='dungeon-screen';screen.dataset.boot='loading';document.body.append(screen);
const shell=document.querySelector<HTMLElement>('#battle-shell')!,panel=document.querySelector<HTMLElement>('#fit-panel')!,container=document.querySelector<HTMLElement>('#game')!,status=document.querySelector<HTMLElement>('#fit-status')!,controls=document.querySelector<HTMLElement>('#battle-controls')!,restart=document.querySelector<HTMLButtonElement>('#fit-restart')!,persistence=document.querySelector<HTMLElement>('#battle-persistence')!;
let live=true,playing=false,startup=true,reviewing=false,loading=false,loadError=false,loadGeneration=0,host:RunBattleHost|null=null;
let replacing=false;
let engine: ReturnType<typeof import('../phaser/start').createGame> | null = null;
let deferredStart: (()=>void) | null = null;
const sound={enabled:false};
const dialogs=new BattleDialogs(()=>{playtime?.pause();host?.modalTransition();queueMicrotask(()=>{playtime?.sync();deferredStart?.();});},()=>requestNew(),()=>screen.querySelector<HTMLElement>('h1')?.focus());
const playtime=storage?observeActivePlaytime(active=>session.setPlaytimeActive(active),()=>live&&!reviewing&&!startup&&!loading&&!loadError&&!replacing&&!dialogs.open&&(playing?container.dataset.ready==='true'&&host?.session.state.outcome==='ongoing':session.phase==='ready'),async()=>await pauseForReview() && confirmMenuDeparture(()=>!startup&&session.hasUnsavedProgress,recovery)):null;
async function pauseForReview() {
 reviewing=true;playtime?.pause();
 let cancel:()=>void=()=>{};
 const canceled=new Promise<false>(resolve=>{cancel=()=>resolve(false);});
 dialogs.showChoices('Saving journey','Saving your journey before continuing.',[{id:'dungeon-cancel-flush',label:'Cancel',run:cancel}],cancel);
 reviewing=false;
 return live && await Promise.race([session.flushPlaytime().then(()=>true),canceled]) && live;
}
function returnLink(){return menuReturnLink(()=>!startup&&session.hasUnsavedProgress,recovery,storage?()=>pauseForReview():undefined);}
panel.setAttribute('aria-label','Dungeon battle controls');
mountBattleLayout();window.fitDiagnostics=diagnosticsSnapshot;
const mapView=new DungeonMap(async destination=>{if(!live||playing||loading||loadError||replacing||dialogs.open)return;if(await session.step({...session.spatialBoundary,destination})&&session.phase==='battle')start();},()=>!live||playing||loading||loadError||replacing||dialogs.open);
function button(label:string,run:()=>void){const n=el('button',label);n.type='button';n.onclick=run;return n;}
function evidence(state:DungeonState=session.snapshot){container.dataset.dungeonSnapshot=JSON.stringify(state);container.dataset.dungeonBattleRecord=JSON.stringify(session.completedBattle);}
function stop(){loadGeneration++;deferredStart=null;loading=false;loadError=false;playing=false;host=null;engine?.scene.stop('battle');controls.hidden=true;container.style.visibility='hidden';playtime?.sync();}
const explorationTools = el('div');
const sandboxNotice = storage ? null : testingProgress('dungeon');
if (sandboxNotice) explorationTools.append(sandboxNotice);
explorationTools.append(returnLink());
mountTelemetryPreferences(explorationTools);
function render(){
 if(!live)return;const state=session.snapshot;evidence(state);
 if(playing){persistence.querySelector('span')!.textContent=session.status;playtime?.sync();return;}
 shell.hidden=true;panel.hidden=true;screen.hidden=false;
 if(replacing){
  const title=el('h1','Starting new dungeon');title.tabIndex=-1;
  const message=el('p','Preparing your next journey.');message.setAttribute('role','status');
  screen.replaceChildren(title,message);
 }else if(loading){
  const title=el('h1','Loading encounter');title.tabIndex=-1;
  const message=el('p','Preparing the battle.');message.setAttribute('role','status');
  screen.replaceChildren(title,message,button('Start new dungeon',requestNew));
  if(storage)screen.append(button('Save recovery',recovery));
 }else if(startup){
  const title=el('h1','Dungeon floors');title.tabIndex=-1;
  screen.replaceChildren(title,el('p','Continuing floors with deterministic battles, all encounters required for descent and backtracking.'+(storage?' Saves stay on this device.':'')));
  if(storage){
  const review=session.inspect(),valid=review.primary.status==='valid'||review.backup.status==='valid';
  const resume=button('Continue saved dungeon',()=>{if(session.continue(review)){startup=false;render();if(session.snapshot.activeBattle)start();}});resume.disabled=!valid;
  screen.append(resume,button('Start new dungeon',requestNew),button('Save recovery',recovery));
  const unsaved=button('Play unsaved dungeon',()=>{startup=false;session.playUnsaved();render();});
  screen.append(el('p','Unsaved play permits battles; floor travel is blocked until progress can be saved.'),unsaved);
  }else screen.append(testingProgress('dungeon'),button('Start new dungeon',requestNew));
  const link=el('a','Three-battle scenario');link.href=`${import.meta.env.BASE_URL}run`;screen.append(link);
 }else {
  renderDungeon(screen,state,session,dialogs,{start,recover:storage?recovery:undefined,restart:requestNew},cache,mapView,explorationTools);
  if(loadError){
   const error=el('p',storage?'Could not load the encounter. Reload the page to try again, or open Save recovery.':'Could not load the encounter. Reload the page to try again, or start a new dungeon.');
   error.id='dungeon-load-error';error.tabIndex=-1;error.setAttribute('role','alert');
   screen.prepend(error);
  }
 }
 if(sandboxNotice)sandboxNotice.hidden=startup;
 if(explorationTools.parentElement!==screen)screen.append(explorationTools);
 if(loading||loadError){
  explorationTools.before(el('p',storage&&!session.hasUnsavedProgress?'The encounter is saved on this device.':'Reloading will discard unsaved progress.'),button('Reload page',()=>location.reload()));
 }
 playtime?.sync();
}
async function requestNew(){
 if(dialogs.open||!live||replacing)return;
 if(!storage){
  if(startup)session.save();else session.restart(crypto.randomUUID(),newSeed(session.snapshot.seed));
  startup=false;stop();render();screen.querySelector<HTMLElement>('h1')?.focus();return;
 }
 if(!await pauseForReview())return;
 const review=session.inspect();
 dialogs.showChoices('Start new dungeon?','End this unfinished journey and replace only this device’s dungeon save with a full party and empty inventory? Export saved progress first if needed.',[
  {id:'dungeon-confirm-new',label:'Start new dungeon',run:()=>replace(review),keepOpen:true},
  {id:'dungeon-cancel-new',label:'Cancel',run:()=>{render();screen.querySelector<HTMLElement>('h1')?.focus();}},
 ]);
}
async function replace(review:ReturnType<DungeonSession['inspect']>){
 if(!live||replacing)return;
 replacing=true;
 dialogs.showChoices('Preparing new dungeon','Starting your next journey.',[]);
 try {
  const accepted=await session.replace(review,crypto.randomUUID(),newSeed(session.snapshot.seed));
  replacing=false;
  if(!live)return;
  if(accepted){startup=false;stop();dialogs.close();render();screen.querySelector<HTMLElement>('h1')?.focus();if(session.hasUnsavedProgress)recovery();}
  else {render();recovery();}
 }finally{replacing=false;}
}
async function recovery(){
 // Opening recovery should not scroll the exploration page behind the modal.
 const scrollTop=screen.scrollTop;
 if(!live||!storage||!await pauseForReview())return;const review=session.inspect(),choices:DialogChoice[]=[];
 const close=()=>{if(!playing)render();screen.querySelector<HTMLElement>('h1')?.focus();};
 for(const [i,value] of session.exports(review).entries())choices.push({id:`dungeon-export-${i}`,label:`Export ${value.label}`,run:()=>{const url=URL.createObjectURL(new Blob([value.text],{type:'application/json'}));const a=el('a');a.href=url;a.download=`tactics-guru-dungeon-${i}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);close();}});
 for(const slot of ['primary','backup'] as const){
  if(review[slot].status==='valid')choices.push({id:`dungeon-continue-${slot}`,label:`Continue ${slot} dungeon`,run:()=>{if(session.continue(review,slot)){startup=false;stop();render();if(session.snapshot.activeBattle)start();}else recovery();}});
  if(review[slot].text!==null)choices.push({id:`dungeon-remove-${slot}`,label:`Remove ${slot} save`,run:()=>dialogs.showChoices('Remove reviewed save?','Export first if needed. Only the reviewed dungeon slot will be removed.',[
   {id:'dungeon-remove-confirm',label:'Remove reviewed save',keepOpen:true,run:async()=>{await session.remove(slot,review);recovery();}},
   {id:'dungeon-remove-cancel',label:'Cancel',run:recovery},
  ])});
 }
 choices.push({id:'dungeon-retry-save',label:'Retry saving current progress',run:async()=>{if(startup){close();return;}await session.retry(review);close();}}, {id:'dungeon-close-recovery',label:'Close',run:close});
 dialogs.showChoices('Dungeon save recovery',`primary: ${review.primary.status}. backup: ${review.backup.status}. ${session.status}`,choices,close,{focusTitle:true});
 screen.scrollTop=scrollTop;
}
function whenVisible(generation:number,run:()=>void){
 if(!live||generation!==loadGeneration)return;
 if(document.hidden||dialogs.open||replacing){deferredStart=()=>whenVisible(generation,run);return;}
 deferredStart=null;
 try {run();}catch {failedLoad(generation);}
}
function failedLoad(generation:number){
 if(!live||generation!==loadGeneration)return;
 stop();loadError=true;render();screen.querySelector<HTMLElement>('#dungeon-load-error')?.focus();
}
async function start(){
 if(!live||playing||loading||replacing)return;
 // Lock before committing the encounter or awaiting code, so repeated input cannot enter twice.
 const generation=++loadGeneration;loading=true;loadError=false;
 playtime?.sync();
 container.dataset.ready='false';delete container.dataset.phase;
 status.textContent='Loading encounter';status.removeAttribute('role');
 try {
  const battle=await session.startEncounter();if(!battle){loading=false;render();return;}
  render();
  const [runtime,{BattleScene}]=await Promise.all([import('../phaser/start'),import('../phaser/BattleScene')]);
  if(!live||generation!==loadGeneration)return;
  whenVisible(generation,()=>{
   const currentEngine=engine??(engine=runtime.createGame([],true));
   runtime.whenGameReady(currentEngine,()=>whenVisible(generation,()=>{
   // A pagehide can arrive while the engine's default textures are still loading.
   if(!live||generation!==loadGeneration)return;
   try {
    loading=false;playing=true;screen.hidden=true;shell.hidden=false;panel.hidden=false;controls.hidden=false;container.style.visibility='visible';
    const state=session.snapshot,title=`Dungeon · Floor ${state.depth} · ${dungeonBiomeLabel(state)} · ${dungeonEncounterLabel(state,state.floors[state.depth-1].exploration.active ?? state.floors[state.depth-1].completed)}`;
    document.querySelector<HTMLElement>('#battle-heading h1')!.textContent=title;
    document.querySelector<HTMLElement>('#board-caption')!.textContent='Tap to select · Drag to pan · Wheel/pinch to zoom · Arrows and Enter to select';
    restart.textContent='Start new dungeon';persistence.hidden=false;persistence.replaceChildren(...(storage?[button('Save recovery',recovery)]:[]),el('span',session.status), returnLink());
    host={catalog:battle.catalog,session:battle,dialogs,sound,showOutcomeCutscenes:true,modalTransition:()=>{},ended:()=>{if(!live||!playing||generation!==loadGeneration)return;stop();render();screen.querySelector<HTMLElement>('h1')?.focus();},restart:requestNew};
    currentEngine.scene.remove('battle');currentEngine.scene.add('battle',new BattleScene(value=>{
     if(!live||generation!==loadGeneration)return;
     status.textContent=value==='ready'?'Battle ready':value==='loading'?'Loading':'Error';container.dataset.ready=String(value==='ready');restart.disabled=value!=='ready';
     playtime?.sync();
    },message=>{
     if(!live||generation!==loadGeneration)return;
     status.textContent=`Error: ${message}. Reload to retry.`;status.setAttribute('role','alert');restart.disabled=false;
     container.dataset.ready='false';playtime?.sync();
    },host),true);
    evidence();
   }catch { failedLoad(generation); }
   }));
  });
 }catch { failedLoad(generation); }
}
session.onChange=()=>render();restart.addEventListener('click',()=>{restart.focus();requestNew();});
document.addEventListener('keydown',e=>{if(e.repeat&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopImmediatePropagation();}},true);
window.addEventListener('pagehide',()=>{playtime?.dispose();live=false;session.dispose();mapView.dispose();stop();engine?.destroy(true);dialogs.dispose();},{once:true});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)deferredStart?.();});
render();

const entryIntent=storage?consumeEntryIntent():null;
if(entryIntent==='new'){
 let approved: { primary?: { status?: string; text?: string | null }; backup?: { status?: string; text?: string | null } } | null=null;
 try {
  const text=sessionStorage.getItem('tactics-guru:menu-new-dungeon-review');
  sessionStorage.removeItem('tactics-guru:menu-new-dungeon-review');
  if(text)approved=JSON.parse(text);
 } catch { /* A missing or unreadable handoff requires a new confirmation. */ }
 const review=session.inspect();
 const matches=(['primary','backup'] as const).every(slot=>review[slot].status!=='unavailable' && approved?.[slot]?.status===review[slot].status && approved?.[slot]?.text===review[slot].text);
 const empty=bothDungeonSlotsMissing(review);
 if(matches || empty)void replace(review);
 else requestNew();
}
else if(entryIntent==='recovery')recovery();
else if(entryIntent==='continue'){
 const review=session.inspect();
 if(session.continue(review)){startup=false;render();if(session.snapshot.activeBattle)start();}
 else recovery();
}
// Exploration and recovery are DOM routes; the battle runtime is not a startup prerequisite.
screen.dataset.boot='ready';
