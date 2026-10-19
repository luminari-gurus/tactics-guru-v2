import type { CellPosition } from '../content/types';
import type { BattleEvent, Command, UnitState } from '../domain/types';
import { previewMovement } from '../domain/grid';
import { D20_SIDES, NATURAL_AUTO_MISS, NATURAL_CRITICAL } from '../domain/constants';
import type { BattleSession, ActionPreview } from '../app/BattleSession';
import type { BattleAudioSnapshot } from '../phaser/BattleAudio';
import { publicAssetUrl } from './publicAssetUrl';
import { GUARDED_STRIKE_TRADEOFF } from '../content/constants';

export type Action = 'move' | 'basic' | 'signature';
export const displayName = (id: string) => id.replace(/^ability:/,'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
export function actionCommand(session: BattleSession, action: Action, cell: CellPosition): Command | null {
  const actor = session.active;
  if (action === 'move') return {type:'move',unitId:actor.id,to:cell};
  const target = session.state.units.find(u=>u.hp>0 && u.cell.x===cell.x && u.cell.y===cell.y);
  if (!target) return null;
  const ability = action==='basic' ? session.catalog.abilities['ability:basic_attack']
    : Object.values(session.catalog.abilities).find(a=>a.id!=='ability:basic_attack' && a.owners.includes(actor.defId));
  if (!ability) return null;
  return {type:'useAbility',unitId:actor.id,abilityId:ability.id,
    target: ability.kind==='magicMissile' ? {missileTargets:[target.id]} : {unitId:target.id}};
}
export function previewText(preview: ActionPreview): string {
  if (!preview.ok) return `Unavailable: ${displayName(preview.reason.replace(/([A-Z])/g,' $1'))}`;
  if ('path' in preview) return `Move ${preview.path.length-1} steps · cost ${preview.cost} · uses movement`;
  if ('bonus' in preview) {
    const hits = Array.from({length:D20_SIDES},(_,i)=>i+1).filter(n=>n===NATURAL_CRITICAL || n!==NATURAL_AUTO_MISS && n+preview.bonus>=preview.armorClass).length;
    return `Hit ${hits*100/D20_SIDES}% · attack ${preview.bonus>=0?'+':''}${preview.bonus} vs AC ${preview.armorClass} · damage ${preview.damage} (${preview.criticalDamage} critical) · uses action`;
  }
  if ('missileCount' in preview) return `Automatic hit · ${preview.minDamage}–${preview.maxDamage} force damage · uses action`;
  return 'End this turn';
}
export function eventText(event: BattleEvent, name: (id:number)=>string): string {
  switch(event.type) {
    case 'turnStarted': return `Round ${event.round}: ${name(event.unitId)}'s turn`;
    case 'turnEnded': return `${name(event.unitId)} waits`;
    case 'moved': { const cell=event.path.at(-1)!; return `${name(event.unitId)} moves to (${cell.x}, ${cell.y})`; }
    case 'abilityUsed': return `${name(event.unitId)} uses ${displayName(event.abilityId)}`;
    case 'attackRolled': return `${name(event.unitId)}: ${event.result} (${event.natural} + ${event.bonus} vs AC ${event.armorClass})`;
    case 'damaged': return `${name(event.unitId)} takes ${event.damage} damage · ${event.hp} HP`;
    case 'defeated': return `${name(event.unitId)} defeated`;
    case 'guarded': return `${name(event.unitId)} Guarded (+2 AC)`;
    case 'guardExpired': return `${name(event.unitId)} Guarded expires`;
    case 'missileRolled': return `Missile ${event.missile}: ${event.damage} force damage`;
    case 'battleEnded': return event.outcome==='playerWin'?'Victory':'Defeat';
    default: return '';
  }
}
const LOG_LIMIT=40;
export function unitFeedback(session:BattleSession, unit:UnitState) {
  const def=unit.side==='player'?session.catalog.heroes[unit.defId]:session.catalog.enemies[unit.defId];
  const guard=unit.guarded?GUARDED_STRIKE_TRADEOFF:null;
  return {def,name:displayName(unit.defId),armorClass:def.stats.armorClass+(guard?.armorClassBonus??0),
    accuracy:def.stats.accuracy-(guard?.attackPenalty??0),
    status:unit.hp===0?'Defeated':guard?`Guarded (+${guard.armorClassBonus} AC)`:'No status effects'};
}
export function unitLabel(session:BattleSession, unit:UnitState) {
  const {def,name,status}=unitFeedback(session,unit);
  return `${name} #${unit.id} · HP ${unit.hp}/${def.stats.maxHp}${status==='No status effects'?'':` · ${status}`}`;
}
export class BattleHud {
  readonly root=document.querySelector<HTMLElement>('#battle-controls')!;
  readonly target: HTMLSelectElement;
  private readonly actorRoot=document.querySelector<HTMLElement>('#battle-actor')!;
  private readonly abort=new AbortController();
  private readonly log:string[]=[];
  constructor(private readonly session:BattleSession, callbacks:{action:(a:Action)=>void;target:(c:CellPosition)=>void;review:()=>void;cancel:()=>void;wait:()=>void;sound:()=>void;retrySound:()=>void;inspect:()=>void;inspectTarget:(id:number)=>void;log:(lines:readonly string[])=>void}) {
    this.actorRoot.hidden=false;
    this.actorRoot.innerHTML=`<p id="battle-active" aria-live="polite"></p><div class="battle-identity"><div id="battle-portraits"></div><div><h2 id="battle-actor-name" aria-live="polite"></h2><p id="battle-hp"></p><div class="battle-health" aria-hidden="true"><span></span></div><p id="battle-stats"></p><p id="battle-status"></p></div></div><p id="battle-budgets"></p>`;
    for(const unit of session.state.units.filter((u,i,all)=>all.findIndex(v=>v.defId===u.defId)===i)) {
      const info=unitFeedback(session,unit),img=document.createElement('img');
      img.src=publicAssetUrl(session.catalog.assets[info.def.portraitAssetId].runtimePath);img.alt=info.name+' portrait';
      img.className='battle-portrait';img.width=60;img.height=60;img.dataset.unitType=unit.defId;img.hidden=true;
      this.actorRoot.querySelector('#battle-portraits')!.append(img);
    }
    this.root.innerHTML=`<p class="battle-section-label">Choose your action</p><div class="battle-actions" aria-label="Acting unit actions">
      <button id="battle-move" data-action="move" aria-label="Move" aria-describedby="battle-availability"><strong>Move</strong><span>Uses movement</span></button>
      <button data-action="basic" aria-label="Basic attack" aria-describedby="battle-availability"><strong>Basic attack</strong><span>Uses action</span></button>
      <button data-action="signature" aria-describedby="battle-availability"><strong>Signature</strong><span>Uses action</span></button>
      <button id="battle-next" aria-label="Wait / End turn" aria-describedby="battle-availability"><strong>Wait / End turn</strong><span>Ends turn immediately</span></button></div>
      <p id="battle-availability"></p><section class="battle-decision" aria-label="Target and action preview"><label for="battle-target">Target / destination</label><select id="battle-target"><option value="">Choose target</option></select><p id="battle-selection">Select a tile</p><p id="battle-target-info"></p><button id="battle-inspect-target" hidden>Inspect target</button><p id="battle-preview" aria-live="polite">Choose an action and target</p><div class="battle-commit"><button id="battle-review" disabled>Review action</button><button id="battle-cancel" disabled>Cancel action</button></div></section>
      <nav class="battle-tools" aria-label="Secondary battle tools"><button id="battle-party">Inspect party</button><button id="battle-log-open">Battle log</button><button id="battle-sound" aria-pressed="false" aria-describedby="battle-sound-status">Enable sound</button><button id="battle-sound-retry" hidden>Retry sound</button></nav><p id="battle-sound-status" aria-live="polite">Sound off</p>`;
    const signal=this.abort.signal;
    this.root.querySelector('#battle-sound')!.addEventListener('click',callbacks.sound,{signal});
    this.root.querySelector('#battle-sound-retry')!.addEventListener('click',callbacks.retrySound,{signal});
    this.root.querySelector('#battle-party')!.addEventListener('click',()=>callbacks.inspect(),{signal});
    this.root.querySelector('#battle-inspect-target')!.addEventListener('click',event=>{const id=(event.currentTarget as HTMLElement).dataset.unitId;if(id)callbacks.inspectTarget(Number(id));},{signal});
    this.root.querySelector('#battle-log-open')!.addEventListener('click',()=>callbacks.log(this.log),{signal});
    this.root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>b.addEventListener('click',()=>callbacks.action(b.dataset.action as Action),{signal}));
    this.target=this.root.querySelector('#battle-target')!;
    this.target.addEventListener('change',()=>{if(this.target.value){const [x,y]=this.target.value.split(',').map(Number);callbacks.target({x,y});}},{signal});
    this.root.querySelector('#battle-review')!.addEventListener('click',callbacks.review,{signal});
    this.root.querySelector('#battle-cancel')!.addEventListener('click',callbacks.cancel,{signal});
    this.root.querySelector('#battle-next')!.addEventListener('click',callbacks.wait,{signal});
  }
  focusAction(){this.root.querySelector<HTMLButtonElement>('#battle-move:not(:disabled), #battle-next:not(:disabled)')?.focus();}
  renderSound(snapshot:BattleAudioSnapshot) {
    const button=this.root.querySelector<HTMLButtonElement>('#battle-sound')!;
    button.textContent=snapshot.enabled?'Mute':'Enable sound';button.setAttribute('aria-pressed',String(snapshot.enabled));
    this.root.querySelector<HTMLButtonElement>('#battle-sound-retry')!.hidden=snapshot.status!=='blocked';
    const labels={muted:'Sound off',loading:'Loading sound',unavailable:'Sound unavailable',hidden:'Sound paused while hidden',unlocking:'Unlocking sound',blocked:'Sound blocked',ready:'Sound on'};
    this.root.querySelector('#battle-sound-status')!.textContent=labels[snapshot.status]+(snapshot.error?`: ${snapshot.error}`:'');
  }
  render(action:Action|null, selected:CellPosition|null, message:string) {
    const s=this.session, enabled=s.phase==='player', actor=s.active;
    const info=unitFeedback(s,actor);
    this.actorRoot.querySelector('#battle-active')!.textContent=`${s.state.outcome==='ongoing'?'':s.state.outcome==='playerWin'?'Victory · ':'Defeat · '}Round ${s.state.round} · ${actor.side==='player'?'Your turn':'Enemy turn'}${s.phase==='presenting'?' · Resolving action (Animating)':s.phase==='error'?' · Battle stopped':''}`;
    this.actorRoot.querySelector('#battle-actor-name')!.textContent=info.name;
    this.actorRoot.querySelector('#battle-hp')!.textContent=`HP ${actor.hp}/${info.def.stats.maxHp}`;
    this.actorRoot.querySelectorAll<HTMLImageElement>('.battle-portrait').forEach(img=>{img.hidden=img.dataset.unitType!==actor.defId;});
    (this.actorRoot.querySelector('.battle-health span') as HTMLElement).style.width=`${100*actor.hp/info.def.stats.maxHp}%`;
    this.actorRoot.querySelector('#battle-stats')!.textContent=`AC ${info.armorClass} · Accuracy ${info.accuracy>=0?'+':''}${info.accuracy}`;
    this.actorRoot.querySelector('#battle-status')!.textContent=info.status;
    this.actorRoot.querySelector('#battle-budgets')!.textContent=`Move ${actor.hasMoved?'spent':'ready'} / Action ${actor.hasActed?'spent':'ready'}`;
    const locked=s.phase==='presenting'?'Resolving action. Gameplay is locked until presentation finishes.':s.phase==='enemy'?'Enemy turn. Hero actions are unavailable.':s.phase==='ended'?'Battle complete. Gameplay is unavailable.':s.phase==='error'?'Battle stopped. Use recovery or restart.':'';
    this.root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>{
      const spent=b.dataset.action==='move'?actor.hasMoved:actor.hasActed;
      const signature=b.dataset.action==='signature'?Object.values(s.catalog.abilities).find(a=>a.id!=='ability:basic_attack' && a.owners.includes(actor.defId)):null;
      b.disabled=!enabled || spent || (b.dataset.action==='signature' && !signature);
      b.setAttribute('aria-pressed',String(b.dataset.action===action));
      b.querySelector('span')!.textContent=!enabled?'Unavailable':spent?'Spent':b.dataset.action==='move'?'Uses movement':'Uses action';
      if(b.dataset.action==='signature'){const label=signature?displayName(signature.id):'No signature';b.querySelector('strong')!.textContent=label;b.setAttribute('aria-label',label);}
    });
    this.root.querySelector('#battle-availability')!.textContent=locked || `${actor.hasMoved?'Movement spent. ':''}${actor.hasActed?'Action spent. ':''}Choose an action, then a target. Wait ends the turn immediately.`;
    (this.root.querySelector('#battle-next') as HTMLButtonElement).disabled=!enabled;
    (this.root.querySelector('#battle-review') as HTMLButtonElement).disabled=!enabled || !s.pending;
    (this.root.querySelector('#battle-cancel') as HTMLButtonElement).disabled=!enabled || !action;
    this.root.querySelector('#battle-selection')!.textContent=selected?`Selected (${selected.x}, ${selected.y})`:'Select a tile';
    const occupants=selected?s.state.units.filter(u=>u.cell.x===selected.x&&u.cell.y===selected.y):[];
    const target=occupants.find(u=>u.hp>0)??occupants[0];
    this.root.querySelector('#battle-target-info')!.textContent=target?`Target: ${unitLabel(s,target)}`:'';
    const inspect=this.root.querySelector<HTMLButtonElement>('#battle-inspect-target')!;inspect.hidden=!target;inspect.dataset.unitId=target?String(target.id):'';
    this.root.querySelector('#battle-preview')!.textContent=s.error?`${s.phase==='error'?'Battle stopped':'Unavailable'}: ${s.error}`:message;
    document.querySelector('#battle-board-caption')!.textContent = enabled && action && action!=='move' && !actor.hasActed
      ? 'Gold: active · ✓ valid target · × unavailable · Double outline: selected'
      : 'Gold: active · White: selected · Teal: reachable';
    const options: {cell:CellPosition;label:string}[]=[];
    if(enabled && action==='move') {const reach=previewMovement(s.state,actor.id,s.catalog);if(reach.ok) for(const c of reach.cells.filter(c=>c.cost>0)) options.push({cell:c.cell,label:`(${c.cell.x}, ${c.cell.y}) · cost ${c.cost}`});}
    else if(enabled && action) for(const u of s.state.units.filter(u=>u.side!==actor.side && u.hp>0)) options.push({cell:u.cell,label:unitLabel(s,u)});
    this.target.replaceChildren(new Option('Choose target',''),...options.map(o=>new Option(o.label,`${o.cell.x},${o.cell.y}`)));
    this.target.value=selected?`${selected.x},${selected.y}`:'';this.target.disabled=!enabled || !action;
  }
  append(events:readonly BattleEvent[]) {
    for(const e of events) {const text=eventText(e,id=>displayName(this.session.state.units.find(u=>u.id===id)!.defId)+` #${id}`);if(text)this.log.push(text);}
    this.log.splice(0,Math.max(0,this.log.length-LOG_LIMIT));
  }
  dispose(){this.abort.abort();this.root.replaceChildren();this.actorRoot.replaceChildren();this.actorRoot.hidden=true;}
}
