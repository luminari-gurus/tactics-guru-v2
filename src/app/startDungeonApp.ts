import { EXPANDED_ENCOUNTER_POLICY } from '../domain/dungeonEncounters';
import { testingProgress } from '../ui/testingProgress';
import { consumeEntryIntent, routeHref } from './routes';
import { appEntry } from './entry';
import { menuReturnLink, confirmMenuDeparture } from '../ui/menuReturn';
import { DungeonMap, dungeonBiomeLabel, dungeonEncounterLabel } from '../ui/dungeonMap';
import '../style.css';
import { mountTelemetryPreferences } from '../telemetry/preferences';
import { DungeonSession } from './DungeonSession';
import { DelayedDungeonStep } from './DelayedDungeonStep';
import { RunHistory } from './RunHistory';
import { dungeonRunRecord } from '../domain/runRecords';
import { freshDungeon, FloorCache, newDungeonSeed, type DungeonState } from '../domain/dungeon';
import type { DungeonAutoCollectIntent } from '../domain/dungeonAutoCollect';
import { newDungeonEntryAction, type MenuDungeonReview } from './newDungeonEntry';
import { createDungeonStorage, removingDungeonSaveWouldReopenRun, resumableDungeonSave, resumableDungeonSlot, serializeBrowserDungeonWrite } from '../persistence/dungeonStorage';
import { dungeonElement as el, renderDungeon } from '../ui/dungeon';
import { BattleDialogs, type DialogChoice } from '../ui/dialogs';
import type { RunBattleHost } from '../phaser/BattleScene';
import { mountBattleLayout } from '../ui/battleLayout';
import { diagnosticsSnapshot } from '../diagnostics/browser';
import { observeActivePlaytime } from './ActivePlaytime';
import { readAutoCollectLootPreference } from '../ui/autoCollectLootPreference';
import { dismissClassGuidanceTip, watchClassGuidancePreferences } from '../ui/classGuidancePreferences';
import type { ClassGuidanceRun } from '../ui/classGuidance';
function newSeed(previous?: number) {
 return newDungeonSeed(()=>crypto.getRandomValues(new Uint32Array(1))[0],previous);
}
const storage=appEntry.persistent?createDungeonStorage():null,session=new DungeonSession(freshDungeon(crypto.randomUUID(),newSeed(),appEntry.persistent ? EXPANDED_ENCOUNTER_POLICY : undefined,appEntry.persistent),storage,storage?new RunHistory('dungeon'):null,undefined,serializeBrowserDungeonWrite),cache=new FloorCache();
let guidanceScope: { id: string; run: ClassGuidanceRun; persistent: boolean } | null = null;
const stopGuidanceWatch = watchClassGuidancePreferences(reset => { if (reset) guidanceScope?.run.dismissed.clear(); });
function guidanceForRun(id: string): ClassGuidanceRun {
 if(guidanceScope?.id!==id)guidanceScope={id,persistent:session.savesProgress,run:{
  get runId(){return session.savesProgress?`dungeon:${id}`:undefined;},dismissed:new Set(),
 }};
 const scope=guidanceScope,persistent=session.savesProgress;
 // Explicitly saving an unsaved attempt also retains tips dismissed earlier
 // in that same attempt. Rendering a saved run with no new choices is read-only.
 if(persistent&&!scope.persistent&&scope.run.dismissed.size) {
  dismissClassGuidanceTip(`dungeon:${id}`,[...scope.run.dismissed]);
 }
 scope.persistent=persistent;
 return scope.run;
}
const screen=el('main');screen.id='dungeon-screen';screen.dataset.boot='loading';document.body.append(screen);
const shell=document.querySelector<HTMLElement>('#battle-shell')!,panel=document.querySelector<HTMLElement>('#fit-panel')!,container=document.querySelector<HTMLElement>('#game')!,status=document.querySelector<HTMLElement>('#fit-status')!,controls=document.querySelector<HTMLElement>('#battle-controls')!,restart=document.querySelector<HTMLButtonElement>('#fit-restart')!,persistence=document.querySelector<HTMLElement>('#battle-persistence')!;
let live=true,playing=false,startup=true,reviewing=false,loading=false,loadError=false,loadGeneration=0,host:RunBattleHost|null=null;
let replacing=false;
let defeatScreen: HTMLElement | null = null;
let engine: ReturnType<typeof import('../phaser/start').createGame> | null = null;
let deferredStart: (()=>void) | null = null;
let pendingVictory: DungeonAutoCollectIntent | null = null;
const automaticStep = new DelayedDungeonStep();
const automaticStepEvents = new AbortController();
function cancelAutomaticStep() { pendingVictory = null; automaticStep.cancel(); }
function activeExploration() {
 return live&&!playing&&!loading&&!reviewing&&!startup&&!loadError&&!replacing&&!dialogs.open&&
  !document.hidden&&!screen.hidden&&screen.isConnected&&session.phase==='ready';
}
const sound={enabled:false};
const dialogs=new BattleDialogs(()=>{
 // Battle outcome cutscenes own this dialog until host.ended. Their skip or
 // close must not cancel the newly earned loot before exploration is shown.
 if(!playing||reviewing)cancelAutomaticStep();
 playtime?.pause();host?.modalTransition();queueMicrotask(()=>{playtime?.sync();deferredStart?.();});
},()=>requestNew(),()=>screen.querySelector<HTMLElement>('h1')?.focus());
const playtime=storage?observeActivePlaytime(active=>session.setPlaytimeActive(active),()=>live&&!reviewing&&!startup&&!loading&&!loadError&&!replacing&&!dialogs.open&&(playing?container.dataset.ready==='true'&&host?.session.state.outcome==='ongoing':session.phase==='ready'),async()=>await pauseForReview() && confirmMenuDeparture(()=>!startup&&session.hasUnsavedProgress,recovery)):null;
async function pauseForReview() {
 cancelAutomaticStep();
 reviewing=true;playtime?.pause();
 let cancel:()=>void=()=>{};
 const canceled=new Promise<false>(resolve=>{cancel=()=>resolve(false);});
 const cancelReview=()=>{cancel();if(startup)goToMenu();};
 dialogs.showChoices('Saving journey','Saving your journey before continuing.',[{id:'dungeon-cancel-flush',label:'Cancel',run:cancelReview}],cancelReview);
 reviewing=false;
 return live && await Promise.race([session.flushPlaytime().then(()=>true),canceled]) && live;
}
function returnLink(){
 const link=menuReturnLink(()=>!startup&&session.hasUnsavedProgress,recovery,storage?()=>pauseForReview():undefined);
 link.addEventListener('click',event=>{
  if(session.phase!=='defeat'||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  // The defeat screen owns departure once the last action has been accepted.
  event.preventDefault();event.stopImmediatePropagation();
 },{capture:true});
 return link;
}
panel.setAttribute('aria-label','Dungeon battle controls');
mountBattleLayout();window.fitDiagnostics=diagnosticsSnapshot;
const mapView=new DungeonMap(async destination=>{cancelAutomaticStep();if(!live||playing||loading||loadError||replacing||dialogs.open)return;if(await session.step({...session.spatialBoundary,destination})&&session.phase==='battle')start();},()=>!live||playing||loading||loadError||replacing||dialogs.open);
function button(label:string,run:()=>void){const n=el('button',label);n.type='button';n.onclick=run;return n;}
function evidence(state:DungeonState=session.snapshot){container.dataset.dungeonSnapshot=JSON.stringify(state);container.dataset.dungeonBattleRecord=JSON.stringify(session.completedBattle);}
function stop(){cancelAutomaticStep();clearBattleLogExport();defeatScreen=null;loadGeneration++;deferredStart=null;loading=false;loadError=false;playing=false;host=null;engine?.scene.stop('battle');controls.hidden=true;container.style.visibility='hidden';playtime?.sync();}
const goToMenu = () => location.replace(routeHref('menu', import.meta.env.BASE_URL));
const explorationTools = el('div');
const lastBattleExport = el('button','Export last battle log');
lastBattleExport.type='button';
lastBattleExport.hidden=true;
explorationTools.append(lastBattleExport);
function clearBattleLogExport(){
 lastBattleExport.onclick=null;
 lastBattleExport.hidden=true;
}
const sandboxNotice = storage ? null : testingProgress('dungeon');
if (sandboxNotice) explorationTools.append(sandboxNotice);
explorationTools.append(returnLink());
mountTelemetryPreferences(explorationTools);
function render(){
 if(!live)return;const state=session.snapshot;guidanceForRun(state.id);evidence(state);
 if(playing){persistence.querySelector('span')!.textContent=session.status;playtime?.sync();return;}
 shell.hidden=true;panel.hidden=true;screen.hidden=false;
 if(defeatScreen){
  if(defeatScreen.parentElement!==screen)screen.replaceChildren(defeatScreen);
  playtime?.sync();
  return;
 }
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
  // Recovery and replacement confirmation can open before a run is selected.
  screen.replaceChildren();
 }else {
  renderDungeon(screen,state,session,dialogs,{start,recover:storage?recovery:undefined,restart:requestNew},cache,mapView,explorationTools);
  if(loadError){
   const error=el('p',storage?'Could not load the encounter. Reload the page to try again, or open Save recovery.':'Could not load the encounter. Reload the page to try again, or start a new dungeon.');
   error.id='dungeon-load-error';error.tabIndex=-1;error.setAttribute('role','alert');
   screen.prepend(error);
  }
 }
 if(explorationTools.parentElement!==screen)screen.append(explorationTools);
 if(loading||loadError){
  explorationTools.before(el('p',storage&&!session.hasUnsavedProgress?'The encounter is saved on this device.':'Reloading will discard unsaved progress.'),button('Reload page',()=>location.reload()));
 }
 playtime?.sync();
}
function resumeDungeon(review: ReturnType<DungeonSession['inspect']>, slot?: 'primary'|'backup') {
 if(!session.continue(review,slot))return false;
 startup=false;stop();
 if(session.phase==='battle')void start();else render();
 return true;
}
function playUnsavedDungeon(){
 startup=false;session.playUnsaved();render();screen.querySelector<HTMLElement>('h1')?.focus();
}
async function requestNew(){
 cancelAutomaticStep();
 if(dialogs.open||!live||replacing)return;
 if(!storage){
  session.restart(crypto.randomUUID(),newSeed(session.snapshot.seed));
  stop();render();screen.querySelector<HTMLElement>('h1')?.focus();return;
 }
 if(!await pauseForReview())return;
 const review=session.inspect();
 const cancel=()=>{if(startup)goToMenu();else {render();screen.querySelector<HTMLElement>('h1')?.focus();}};
 dialogs.showChoices('Start new dungeon?','End this unfinished journey and replace only this device’s dungeon save with a full party and empty inventory? Export saved progress first if needed.',[
  {id:'dungeon-confirm-new',label:'Start new dungeon',run:()=>replace(review),keepOpen:true},
  {id:'dungeon-cancel-new',label:'Cancel',run:cancel},
 ],cancel);
}
async function replace(review:ReturnType<DungeonSession['inspect']>){
 cancelAutomaticStep();
 if(!live||replacing)return;
 replacing=true;render();
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
 cancelAutomaticStep();
 // Opening recovery should not scroll the exploration page behind the modal.
 const scrollTop=screen.scrollTop;
 if(!live||!storage||!await pauseForReview())return;const review=session.inspect(),choices:DialogChoice[]=[];
 const close=()=>{if(startup){goToMenu();return;}if(!playing)render();screen.querySelector<HTMLElement>('h1')?.focus();};
 for(const [i,value] of session.exports(review).entries())choices.push({id:`dungeon-export-${i}`,label:`Export ${value.label}`,keepOpen:startup,run:()=>{const url=URL.createObjectURL(new Blob([value.text],{type:'application/json'}));const a=el('a');a.href=url;a.download=`tactics-guru-dungeon-${i}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);if(!startup)close();}});
 for(const slot of ['primary','backup'] as const){
  if(resumableDungeonSave(review,slot))choices.push({id:`dungeon-continue-${slot}`,label:`Continue ${slot} dungeon`,run:()=>{if(!resumeDungeon(review,slot))recovery();}});
  if(review[slot].text!==null&&!removingDungeonSaveWouldReopenRun(review,slot))choices.push({id:`dungeon-remove-${slot}`,label:`Remove ${slot} save`,run:()=>dialogs.showChoices('Remove reviewed save?','Export first if needed. Only the reviewed dungeon slot will be removed.',[
   {id:'dungeon-remove-confirm',label:'Remove reviewed save',keepOpen:true,run:async()=>{await session.remove(slot,review);recovery();}},
   {id:'dungeon-remove-cancel',label:'Cancel',run:recovery},
  ])});
 }
 if(startup)choices.push({id:'dungeon-play-unsaved',label:'Play unsaved dungeon',run:playUnsavedDungeon});
 else choices.push({id:'dungeon-retry-save',label:'Retry saving current progress',run:async()=>{await session.retry(review);close();}});
 choices.push({id:'dungeon-close-recovery',label:'Close',run:close});
 const removalHint=removingDungeonSaveWouldReopenRun(review,'primary')||removingDungeonSaveWouldReopenRun(review,'backup')
  ? ' Remove the earlier checkpoint before removing the defeated save.' : '';
 dialogs.showChoices('Dungeon save recovery',`primary: ${review.primary.status}. backup: ${review.backup.status}. ${session.status}${removalHint}`,choices,close,{focusTitle:true});
 screen.scrollTop=scrollTop;
}
function presentationBlocked(){return document.hidden||dialogs.open||replacing;}
function whenVisible(generation:number,run:()=>void){
 if(!live||generation!==loadGeneration)return;
 if(presentationBlocked()){deferredStart=()=>whenVisible(generation,run);return;}
 deferredStart=null;
 try {run();}catch {failedLoad(generation);}
}
function failedLoad(generation:number){
 if(!live||generation!==loadGeneration)return;
 stop();loadError=true;render();screen.querySelector<HTMLElement>('#dungeon-load-error')?.focus();
}
function showDefeat(exportBattleLog: () => void){
 stop();
 const generation=loadGeneration;
 const title=el('h1','Dungeon defeat');title.tabIndex=-1;
 const actions=el('div');
 actions.append(button('Export combat log',exportBattleLog),button('Continue',()=>void finishDefeat(generation)));
 if(storage)actions.append(button('Save recovery',recovery));
 defeatScreen=el('section');
 defeatScreen.append(title,el('p','Export this battle’s log before returning to the main menu.'),actions);
 render();title.focus();
}
let finishingDefeat=false;
async function finishDefeat(generation:number){
 if(finishingDefeat||!defeatScreen||!live||generation!==loadGeneration)return;
 finishingDefeat=true;
 try {
  await session.flushPlaytime();
  if(!live||generation!==loadGeneration||session.phase!=='defeat')return;
  if(presentationBlocked()){
   // Recovery can be opened while the terminal write is waiting for its lock.
   // Recheck pending writes and run identity after the dialog closes.
   whenVisible(generation,()=>void finishDefeat(generation));
   return;
  }
  if(!confirmMenuDeparture(()=>session.savesProgress&&session.hasUnsavedProgress,recovery))return;
  const record=dungeonRunRecord(session.snapshot,Date.now());
  if(record) try {
   sessionStorage.setItem('tactics-guru:defeat-summary',JSON.stringify({record, retryHistory:!!storage&&session.hasUnsavedProgress}));
  } catch { /* The menu remains accessible without temporary storage. */ }
  location.assign(routeHref('menu',import.meta.env.BASE_URL));
 }finally{finishingDefeat=false;}
}

async function start(){
 if(!live||playing||loading||replacing)return;
 cancelAutomaticStep();
 // Lock before committing the encounter or awaiting code, so repeated input cannot enter twice.
 const generation=++loadGeneration;loading=true;loadError=false;
 playtime?.sync();
 container.dataset.ready='false';delete container.dataset.phase;
 status.textContent='Loading encounter';status.removeAttribute('role');
 render();
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
    clearBattleLogExport();
    loading=false;playing=true;screen.hidden=true;shell.hidden=false;panel.hidden=false;controls.hidden=false;container.style.visibility='visible';
    const state=session.snapshot,title=`Dungeon · Floor ${state.depth} · ${dungeonBiomeLabel(state)} · ${dungeonEncounterLabel(state,state.floors[state.depth-1].exploration.active ?? state.floors[state.depth-1].completed)}`;
    document.querySelector<HTMLElement>('#battle-heading h1')!.textContent=title;
    document.querySelector<HTMLElement>('#board-caption')!.textContent='Tap to select · Drag to pan · Wheel/pinch to zoom · Arrows and Enter to select';
    restart.textContent='Start new dungeon';persistence.hidden=false;persistence.replaceChildren(...(storage?[button('Save recovery',recovery)]:[]),el('span',session.status), returnLink());
    host={catalog:battle.catalog,session:battle,dialogs,sound,guidance:guidanceForRun(state.id),modalTransition:()=>{},ended:exportBattleLog=>{
     if(!live||!playing||generation!==loadGeneration)return;
     // This callback follows encounter-return presentation (including #397's
     // cutscene completion). Capture once before stop invalidates old work.
     if(session.phase==='defeat') {
      showDefeat(exportBattleLog);
      return;
     }
     const intent=pendingVictory;
     stop();
     lastBattleExport.onclick=exportBattleLog;
     lastBattleExport.hidden=false;
     render();screen.querySelector<HTMLElement>('h1')?.focus();
     const returnedGeneration=loadGeneration;
     if(intent&&activeExploration())automaticStep.schedule(isCurrent=>
      session.autoCollect(intent,()=>isCurrent()&&returnedGeneration===loadGeneration&&activeExploration()));
    },restart:requestNew};
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
// Loading or rendering a persisted reward never creates an intent. The session
// emits this only for a newly accepted victory; freeze its preference now.
session.onVictory=intent=>{
 cancelAutomaticStep();
 if(live&&playing&&!document.hidden&&!dialogs.open&&!reviewing&&!replacing&&readAutoCollectLootPreference())pendingVictory=intent;
};
session.onChange=()=>{if(!startup||replacing)render();};restart.addEventListener('click',()=>{restart.focus();requestNew();});
// Exploration input cancels the pending step, including while it waits for
// the save lock. Exporting the completed log is read-only.
document.addEventListener('pointerdown',event=>{if(!playing&&event.target!==lastBattleExport)cancelAutomaticStep();},{capture:true,signal:automaticStepEvents.signal});
document.addEventListener('keydown',event=>{if(!playing&&!event.repeat&&event.target!==lastBattleExport)cancelAutomaticStep();},{capture:true,signal:automaticStepEvents.signal});
document.addEventListener('click',event=>{
 // Accessibility activation can emit click without pointerdown or keydown.
 if((!playing&&event.target!==lastBattleExport)||event.target instanceof Element&&event.target.closest('a[href]'))cancelAutomaticStep();
},{capture:true,signal:automaticStepEvents.signal});
document.addEventListener('keydown',e=>{if(e.repeat&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopImmediatePropagation();}},true);
window.addEventListener('pagehide',()=>{cancelAutomaticStep();automaticStep.dispose();automaticStepEvents.abort();playtime?.dispose();live=false;stopGuidanceWatch();session.dispose();mapView.dispose();stop();engine?.destroy(true);dialogs.dispose();},{once:true});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAutomaticStep();else deferredStart?.();});
shell.hidden=true;panel.hidden=true;

if(!storage){
 startup=false;render();
}else{
 const entryIntent=consumeEntryIntent();
 const review=session.inspect();
 void session.history?.reconcileDungeonDefeat(review);
 if(entryIntent==='new'){
  let approved: MenuDungeonReview | null=null;
  try {
   const text=sessionStorage.getItem('tactics-guru:menu-new-dungeon-review');
   sessionStorage.removeItem('tactics-guru:menu-new-dungeon-review');
   if(text)approved=JSON.parse(text);
  } catch { /* Inspect the current saves when the menu handoff is unavailable. */ }
  const action=newDungeonEntryAction(review,approved);
  if(action==='confirm')void requestNew();
  else if(action==='unsaved')playUnsavedDungeon();
  else void replace(review);
 }else if(entryIntent==='recovery')void recovery();
 else if(!resumeDungeon(review)){
  if(entryIntent==='continue'&&resumableDungeonSlot(review))void recovery();
  else goToMenu();
 }
}
// Exploration and recovery are DOM routes; the battle runtime is not a startup prerequisite.
screen.dataset.boot='ready';
