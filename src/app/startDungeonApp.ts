import { DungeonMap, dungeonBiomeLabel, dungeonEncounterLabel } from '../ui/dungeonMap';
import '../style.css';
import { mountTelemetryPreferences } from '../telemetry/preferences';
import { DungeonSession } from './DungeonSession';
import { freshDungeon, FloorCache } from '../domain/dungeon';
import { createDungeonStorage } from '../persistence/dungeonStorage';
import { dungeonElement as el, renderDungeon } from '../ui/dungeon';
import { BattleDialogs, type DialogChoice } from '../ui/dialogs';
import { BattleScene, type RunBattleHost } from '../phaser/BattleScene';
import { createGame } from '../phaser/start';
import { mountBattleLayout } from '../ui/battleLayout';
import { diagnosticsSnapshot } from '../diagnostics/browser';
const storage=createDungeonStorage(),session=new DungeonSession(freshDungeon(crypto.randomUUID(),13),storage),cache=new FloorCache();
const screen=el('main');screen.id='dungeon-screen';document.body.append(screen);
const shell=document.querySelector<HTMLElement>('#battle-shell')!,panel=document.querySelector<HTMLElement>('#fit-panel')!,container=document.querySelector<HTMLElement>('#game')!,status=document.querySelector<HTMLElement>('#fit-status')!,controls=document.querySelector<HTMLElement>('#battle-controls')!,restart=document.querySelector<HTMLButtonElement>('#fit-restart')!,persistence=document.querySelector<HTMLElement>('#battle-persistence')!;
let live=true,playing=false,startup=true,host:RunBattleHost|null=null;
const sound={enabled:false};
const dialogs=new BattleDialogs(()=>host?.modalTransition(),()=>requestNew(),()=>screen.querySelector<HTMLElement>('h1')?.focus());
const engine=createGame([],true);
mountBattleLayout();window.fitDiagnostics=diagnosticsSnapshot;
const mapView=new DungeonMap(destination=>{if(!live||playing||dialogs.open)return;const s=session.snapshot;if(session.step({id:s.id,depth:s.depth,revision:s.revision,destination})&&session.snapshot.phase==='battle')start();},()=>!live||playing||dialogs.open);
function button(label:string,run:()=>void){const n=el('button',label);n.type='button';n.onclick=run;return n;}
function evidence(){container.dataset.dungeonSnapshot=JSON.stringify(session.snapshot);container.dataset.dungeonBattleRecord=JSON.stringify(session.completedBattle);}
function stop(){playing=false;host=null;engine.scene.stop('battle');controls.hidden=true;container.style.visibility='hidden';}
function render(){
 if(!live)return;evidence();
 if(playing){persistence.querySelector('span')!.textContent=session.status;return;}
 shell.hidden=true;panel.hidden=true;screen.hidden=false;
 if(startup){
  const title=el('h1','Dungeon floors');title.tabIndex=-1;
  screen.replaceChildren(title,el('p','Continuing floors with deterministic battles, all encounters required for descent and backtracking. Saves stay on this device.'));
  const review=session.inspect(),valid=review.primary.status==='valid'||review.backup.status==='valid';
  const resume=button('Continue saved dungeon',()=>{if(session.continue(review)){startup=false;render();if(session.snapshot.activeBattle)start();}});resume.disabled=!valid;
  screen.append(resume,button('Start new dungeon',requestNew),button('Save recovery',recovery));
  const unsaved=button('Play unsaved dungeon',()=>{startup=false;session.playUnsaved();render();});
  screen.append(el('p','Unsaved play permits battles; floor travel is blocked until progress can be saved.'),unsaved);
  const link=el('a','Three-battle scenario');link.href=`${import.meta.env.BASE_URL}run`;screen.append(link);
 }else renderDungeon(screen,session,dialogs,{start,recover:recovery,restart:requestNew},cache,mapView);
 mountTelemetryPreferences(screen);
}
function requestNew(){
 if(dialogs.open||!live)return;
 const review=session.inspect();
 dialogs.showChoices('Start new dungeon?','Replace only this device’s dungeon save with a full party and empty inventory? Export saved progress first if needed.',[
  {id:'dungeon-confirm-new',label:'Start new dungeon',run:()=>{if(session.replace(review,crypto.randomUUID(),(session.snapshot.seed+1)>>>0)){startup=false;stop();render();screen.querySelector<HTMLElement>('h1')?.focus();}else recovery();}},
  {id:'dungeon-cancel-new',label:'Cancel',run:()=>{render();screen.querySelector<HTMLElement>('h1')?.focus();}},
 ]);
}
function recovery(){
 if(!live)return;const review=session.inspect(),choices:DialogChoice[]=[];
 const close=()=>{if(!playing)render();screen.querySelector<HTMLElement>('h1')?.focus();};
 for(const [i,value] of session.exports(review).entries())choices.push({id:`dungeon-export-${i}`,label:`Export ${value.label}`,run:()=>{const url=URL.createObjectURL(new Blob([value.text],{type:'application/json'}));const a=el('a');a.href=url;a.download=`tactics-guru-dungeon-${i}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);close();}});
 for(const slot of ['primary','backup'] as const){
  if(review[slot].status==='valid')choices.push({id:`dungeon-continue-${slot}`,label:`Continue ${slot} dungeon`,run:()=>{if(session.continue(review,slot)){startup=false;stop();render();if(session.snapshot.activeBattle)start();}else recovery();}});
  if(review[slot].text!==null)choices.push({id:`dungeon-remove-${slot}`,label:`Remove ${slot} save`,run:()=>dialogs.showChoices('Remove reviewed save?','Export first if needed. Only the reviewed dungeon slot will be removed.',[
   {id:'dungeon-remove-confirm',label:'Remove reviewed save',run:()=>{session.remove(slot,review);recovery();}},
   {id:'dungeon-remove-cancel',label:'Cancel',run:recovery},
  ])});
 }
 choices.push({id:'dungeon-retry-save',label:'Retry saving current progress',run:()=>{if(startup){close();return;}session.retry(review);close();}}, {id:'dungeon-close-recovery',label:'Close',run:close});
 dialogs.showChoices('Dungeon save recovery',`primary: ${review.primary.status}. backup: ${review.backup.status}. ${session.status}`,choices,close);
}
function start(){
 if(!live||playing)return;const battle=session.startEncounter();if(!battle){render();return;}
 playing=true;screen.hidden=true;shell.hidden=false;panel.hidden=false;controls.hidden=false;container.style.visibility='visible';
 const state=session.snapshot,title=`Dungeon · Floor ${state.depth} · ${dungeonBiomeLabel(state)} · ${dungeonEncounterLabel(state,state.floors[state.depth-1].exploration.active ?? state.floors[state.depth-1].completed)}`;
 document.querySelector<HTMLElement>('#battle-heading h1')!.textContent=title;
 document.querySelector<HTMLElement>('#board-caption')!.textContent='Tap to select · Drag to pan · Wheel/pinch to zoom · Arrows and Enter to select';
 restart.textContent='Start new dungeon';persistence.hidden=false;persistence.replaceChildren(button('Save recovery',recovery),el('span',session.status));
 document.querySelectorAll<HTMLElement>('#fit-panel > details').forEach(n=>n.hidden=true);
 host={catalog:battle.catalog,session:battle,dialogs,sound,modalTransition:()=>{},ended:()=>{if(!live||!playing)return;stop();render();screen.querySelector<HTMLElement>('h1')?.focus();},restart:requestNew};
 engine.scene.remove('battle');engine.scene.add('battle',new BattleScene(value=>{status.textContent=value==='ready'?'Battle ready':value==='loading'?'Loading':'Error';container.dataset.ready=String(value==='ready');restart.disabled=value!=='ready';},message=>{status.textContent=`Error: ${message}. Reload to retry.`;status.setAttribute('role','alert');restart.disabled=false;},host),true);
 evidence();
}
session.onChange=()=>render();restart.addEventListener('click',()=>{restart.focus();requestNew();});
document.addEventListener('keydown',e=>{if(e.repeat&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopImmediatePropagation();}},true);
window.addEventListener('pagehide',()=>{live=false;session.dispose();mapView.dispose();stop();dialogs.dispose();},{once:true});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
render();
