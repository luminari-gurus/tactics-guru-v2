import { testingProgress } from '../ui/testingProgress';
import { consumeEntryIntent, resolveAppEntry, routeHref } from './routes';
import { menuReturnLink } from '../ui/menuReturn';
import { mountTelemetryPreferences } from '../telemetry/preferences';
import { reportFailure } from '../telemetry/telemetry';
import '../style.css';
import '../ui/runFlow.css';
import { runSaveContext as context } from './runContext';
import { freshRunSnapshot } from '../domain/runBattle';
import { RunItemSession } from './RunItemSession';
import { BattleDialogs } from '../ui/dialogs';
import { mountRunItems } from '../ui/runItems';
import { BattleScene, type RunBattleHost } from '../phaser/BattleScene';
import { createGame } from '../phaser/start';
import { diagnosticsSnapshot } from '../diagnostics/browser';
import { mountBattleLayout } from '../ui/battleLayout';
import { showGameError } from '../ui/gameError';

const menuRun = new URLSearchParams(location.search).get('game') === 'run' &&
  resolveAppEntry(location.pathname, '', import.meta.env.BASE_URL).route === 'menu';
consumeEntryIntent();
const controller = new RunItemSession(freshRunSnapshot(crypto.randomUUID(), 13, context), context, null);
const container = document.querySelector<HTMLElement>('#game')!;
const panel = document.querySelector<HTMLElement>('#fit-panel')!;
const status = document.querySelector<HTMLElement>('#fit-status')!;
const restart = document.querySelector<HTMLButtonElement>('#fit-restart')!;
const controls = document.querySelector<HTMLElement>('#battle-controls')!;
const sessionNotice = document.querySelector<HTMLElement>('#battle-persistence')!;
const screen = document.createElement('section');screen.id='run-screen';screen.setAttribute('aria-label','Authored run');document.body.append(screen);
const items = document.createElement('div');
const actions = document.createElement('div');actions.className='run-actions';
const nav = document.createElement('a');nav.href=routeHref('battle',import.meta.env.BASE_URL);nav.textContent='Single battle';nav.className='run-entry-link';
const progress=document.createElement('p');progress.id='run-progress';panel.prepend(progress);
const dungeonNav = document.createElement('a'); dungeonNav.href=`${import.meta.env.BASE_URL}dungeon`; dungeonNav.textContent='Dungeon floors'; dungeonNav.className='run-entry-link';
panel.append(nav, dungeonNav, menuReturnLink());
document.querySelector<HTMLElement>('#board-caption')!.textContent='Tap to select · Drag to pan · Wheel/pinch to zoom · Keyboard: arrows, Enter selects, Escape cancels';
panel.setAttribute('aria-label','Run battle controls');restart.textContent='Start new run';
mountBattleLayout();
const shell = document.querySelector<HTMLElement>('#battle-shell')!;
let host: RunBattleHost | null = null, mounted: (()=>void) | null = null;
let live=true, playing=false, startup=true;
const sound={enabled:false};
const dialogs=new BattleDialogs(()=>host?.modalTransition(),()=>requestNew());
window.fitDiagnostics=diagnosticsSnapshot;
function button(label:string,run:()=>void,id?:string) {
 const node=document.createElement('button');node.type='button';node.textContent=label;if(id)node.id=id;node.addEventListener('click',run);return node;
}
function evidence() { container.dataset.runSnapshot=JSON.stringify(controller.snapshot); container.dataset.runBattleRecord=JSON.stringify(controller.completedBattle); }
function fail(message:string,handled=true) {container.dataset.ready='false';if(handled)reportFailure('scene_load', { route: 'run' });showGameError(`Error: ${message}. Reload to retry.`);restart.disabled=false;}
function setStatus(value:'loading'|'ready'|'error') {
 status.textContent=value==='ready'?'Battle ready':value==='loading'?'Loading':'Error';
 container.dataset.ready=String(value==='ready');restart.disabled=value!=='ready';
}
function unmount() {mounted?.();mounted=null;}
function stopBattle() {
 playing=false;host=null;engine.scene.stop('battle');controls.hidden=true;container.style.visibility='hidden';
}
function endBattle() {if(!live || !playing)return;stopBattle();render();screen.querySelector<HTMLElement>('h1')?.focus();}
function startBattle() {
 if(!live || playing)return;
 // Session updates during construction publish evidence, not a competing screen.
 playing=true;const session=controller.startEncounter();
 if(!session){playing=false;render();return;}
 unmount();controller.onChange=evidence;screen.hidden=true;shell.hidden=false;panel.hidden=false;controls.hidden=false;container.style.visibility='visible';
 renderProgress();
 sessionNotice.hidden=false;
 sessionNotice.replaceChildren(testingProgress('run'));
 host={catalog:session.catalog,session,dialogs,sound,modalTransition:()=>{},ended:endBattle,restart:requestNew};
 const scene=new BattleScene(setStatus,fail,host);
 setStatus('loading');
 engine.scene.remove('battle');engine.scene.add('battle',scene,true);
 evidence();
}
function requestNew() {
 if(!live || dialogs.open)return;
 if (playing && menuRun) {
  dialogs.showChoices('Start new run?', 'End this run and start a fresh attempt.', [
   { id: 'run-confirm-restart', label: 'Start new run', run: restartRun },
   { id: 'run-cancel-restart', label: 'Cancel', run: () => {} },
  ], () => {});
  return;
 }
 restartRun();
}
function restartRun() {
 if(startup)controller.startNew();
 else controller.restart(crypto.randomUUID(),(controller.snapshot.items.run.seed+1)>>>0);
 startup=false;stopBattle();render();screen.querySelector<HTMLElement>('h1')?.focus();
}
function renderProgress() {
 const run=controller.snapshot.items.run;
 const label=`Encounter ${run.encounterIndex+1} of 3 · ${run.encounters[run.encounterIndex].replace('encounter:','').replaceAll('_',' ')}`;
 progress.textContent=label;
 document.querySelector<HTMLElement>('#battle-heading h1')!.textContent=label;
}
function render() {
 if(!live)return;evidence();renderProgress();
 if(playing)return;
 unmount();shell.hidden=true;panel.hidden=true;screen.hidden=false;container.style.visibility='hidden';
 screen.replaceChildren(items,actions);
 if (startup) {
  const title = document.createElement('h1');
  title.textContent = 'Three-encounter run';
  items.replaceChildren(title);
  actions.replaceChildren(button('Start new run',requestNew,'run-start'),testingProgress('run'));
  appendNavigation();
  controller.onChange=evidence;
  return;
 }
 mounted=mountRunItems(items,controller,dialogs);
 const itemRender=controller.onChange!;
 controller.onChange=()=>{itemRender();evidence();renderActions();};
 renderActions();
}
function appendNavigation() {
 actions.append(nav.cloneNode(true),dungeonNav.cloneNode(true),menuReturnLink());
 mountTelemetryPreferences(actions);
}
function renderActions() {
 actions.replaceChildren();
 const snapshot=controller.snapshot,run=snapshot.items.run;
 if(run.phase==='battle' && !snapshot.activeBattle) {
  actions.append(button('Start encounter',startBattle,'run-start-encounter'));
 }
 else if(run.phase==='victory' || run.phase==='defeat') {
  items.querySelector('h1')!.textContent=run.phase==='victory'?'Run victory':'Run defeat';
  actions.append(button('Start new run',requestNew,'run-new'));
 }
 appendNavigation();
}
restart.addEventListener('click',()=>{restart.focus();requestNew();});
// Repeated activation must not cross replaced controls or trigger another destructive intent.
document.addEventListener('keydown',e=>{if(e.repeat && (e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopImmediatePropagation();}},true);
window.addEventListener('error',()=>fail('The run encountered a runtime error',false));
window.addEventListener('unhandledrejection',()=>fail('The run encountered an asynchronous error',false));
window.addEventListener('pagehide',()=>{live=false;controller.dispose();stopBattle();unmount();dialogs.dispose();},{once:true});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
render();
// Prepare the one engine while the read-only start screen is displayed. No
// battle scene is created until the existing controls request it.
const engine=createGame([],true);
