import { combatStats, guardedEffect, markSource, movementBlockSource, tauntSource } from '../domain/effects';
import type { CellPosition } from '../content/types';
import type { BattleEvent, UnitState } from '../domain/types';
import { previewMovement } from '../domain/grid';
import { D20_SIDES, NATURAL_AUTO_MISS, NATURAL_CRITICAL } from '../domain/constants';
import type { BattleSession, ActionPreview } from '../app/BattleSession';
import type { BattleAudioSnapshot } from '../phaser/BattleAudio';
import { publicAssetUrl } from './publicAssetUrl';
import { GUARDED_STRIKE_TRADEOFF } from '../content/constants';

import { ownedAbilities, actionTargets, type Action } from './battleActions';
export const displayName = (id: string) => id.replace(/^ability:/,'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
export function previewText(preview: ActionPreview): string {
  if (!preview.ok) return `Unavailable: ${displayName(preview.reason.replace(/([A-Z])/g,' $1'))}`;
  if ('path' in preview) return `Move ${preview.path.length-1} steps · cost ${preview.cost} · uses movement`;
  if ('bonus' in preview) {
    const hits = Array.from({length:D20_SIDES},(_,i)=>i+1).filter(n=>n===NATURAL_CRITICAL || n!==NATURAL_AUTO_MISS && n+preview.bonus>=preview.armorClass).length;
    return `Hit ${hits*100/D20_SIDES}% · attack ${preview.bonus>=0?'+':''}${preview.bonus} vs AC ${preview.armorClass}${preview.markBonus?` · Mark +${preview.markBonus} (consumed on roll)`:''} · damage ${preview.damage} (${preview.criticalDamage} critical) · uses action`;
  }
  if ('missileCount' in preview) return `Automatic hit · ${preview.missileCount} ${preview.missileCount===1?'missile':'missiles'} · ${preview.minDamage}–${preview.maxDamage} force damage each · uses action`;
  if ('healing' in preview) return `Heal ${preview.healing} HP · ${preview.hp} HP after healing · uses action and 1 battle use · no roll`;
  if ('kind' in preview && preview.kind === 'taunt') return `Taunt · only target Fighter #${preview.sourceId} until target ends its next turn · uses action · no roll`;
  if ('kind' in preview && preview.kind === 'markTarget') return 'Mark Target · next player attack roll gains +2 accuracy and consumes Mark, including a miss · uses action · no damage or roll';
  if ('kind' in preview && (preview.kind === 'pinningShot' || preview.kind === 'frostSnare'))
    return `${preview.kind === 'frostSnare' ? 'Frost Snare · Snared by Mage' : 'Pinning Shot · Pinned by Ranger'} #${preview.sourceId} · prevents movement until target ends its next turn or source/target defeat · uses action · no damage or roll`;
  return 'End this turn';
}
export function eventText(event: BattleEvent, name: (id:number)=>string): string {
  switch(event.type) {
    case 'turnStarted': return `Round ${event.round}: ${name(event.unitId)}'s turn`;
    case 'turnEnded': return `${name(event.unitId)} waits`;
    case 'moveUndone': { const cell=event.path.at(-1)!; return `${name(event.unitId)} undoes movement to (${cell.x}, ${cell.y})`; }
    case 'moved': { const cell=event.path.at(-1)!; return `${name(event.unitId)} moves to (${cell.x}, ${cell.y})`; }
    case 'abilityUsed': return `${name(event.unitId)} uses ${displayName(event.abilityId)}`;
    case 'attackRolled': return `${name(event.unitId)}: ${event.result} (${event.natural} + ${event.bonus} vs AC ${event.armorClass})`;
    case 'damaged': return `${name(event.unitId)} takes ${event.damage} damage · ${event.hp} HP`;
    case 'defeated': return `${name(event.unitId)} defeated`;
    case 'guarded': return `${name(event.unitId)} Guarded (+2 AC)`;
    case 'guardExpired': return `${name(event.unitId)} Guarded expires`;
    case 'healed': return `${name(event.unitId)} heals ${event.healing} HP · ${event.hp} HP`;
    case 'taunted': return `${name(event.unitId)} taunted by ${name(event.sourceId)} until its next turn ends`;
    case 'tauntExpired': return `${name(event.unitId)} Taunt expires`;
    case 'marked': return `${name(event.unitId)} marked by ${name(event.sourceId)} (+2 on next player attack roll)`;
    case 'markConsumed': return `${name(event.unitId)} Mark consumed`;
    case 'markExpired': return `${name(event.unitId)} Mark expires`;
    case 'movementBlocked': return `${name(event.unitId)} ${event.abilityId === 'ability:frost_snare' ? 'Snared' : 'Pinned'} by ${name(event.sourceId)} until its next turn ends or source/target defeat · no damage or roll`;
    case 'movementBlockExpired': return `${name(event.unitId)} ${event.abilityId === 'ability:frost_snare' ? 'Snare' : 'Pin'} expires`;
    case 'missileRolled': return `Missile ${event.missile}: ${event.damage} force damage`;
    case 'battleEnded': return event.outcome==='playerWin'?'Victory':'Defeat';
    default: return '';
  }
}
const LOG_LIMIT=40;
export function unitFeedback(session:BattleSession, unit:UnitState) {
  const def=unit.side==='player'?session.catalog.heroes[unit.defId]:session.catalog.enemies[unit.defId];
  const guard=guardedEffect(unit)?GUARDED_STRIKE_TRADEOFF:null;
  const source=tauntSource(unit,session.state.units);
  const marker=markSource(unit,session.state.units), pinner=movementBlockSource(unit,session.state.units);
  const statuses=[...(guard?[`Guarded (+${guard.armorClassBonus} AC, −${guard.attackPenalty} attack rolls; expires immediately before this unit’s next turn)`]:[]),
    ...(source?[`Taunted by ${displayName(source.defId)} #${source.id} (only offensive target; expires after this unit’s next turn ends)`]:[]),
    ...(marker?[`Marked by Ranger #${marker.id} (+2 on next player attack roll; consumed even on miss; expires on source/target defeat)`]:[]),
    ...(pinner?[`${unit.movementBlock!.abilityId === 'ability:frost_snare' ? 'Snared by Mage' : 'Pinned by Ranger'} #${pinner.id} (movement blocked; no damage or roll; expires after this unit’s next turn ends or source/target defeat)`]:[]),
    ...(unit.defId==='fighter' && Object.values(session.catalog.abilities).some(a=>a.kind==='secondWind' && a.owners.includes(unit.defId))?[`Second Wind ${unit.secondWindUsed?'0':'1'}/1 use this battle`]:[])];
  return {def,name:displayName(unit.defId),...combatStats(unit,session.catalog),
    status:unit.hp===0?'Defeated':statuses.join(' · ')||'No status effects'};
}
export function unitLabel(session:BattleSession, unit:UnitState) {
  const {def,name,status}=unitFeedback(session,unit);
  return `${name} #${unit.id} · HP ${unit.hp}/${def.stats.maxHp}${status==='No status effects'?'':` · ${status}`}`;
}
export class BattleHud {
  readonly root=document.querySelector<HTMLElement>('#battle-controls')!;
  readonly target: HTMLSelectElement;
  readonly ability: HTMLSelectElement;
  private abilityKey="";
  private readonly actorRoot=document.querySelector<HTMLElement>('#battle-actor')!;
  private readonly abort=new AbortController();
  private readonly log:string[]=[];
  constructor(private readonly session:BattleSession, callbacks:{action:(a:Action)=>void;target:(c:CellPosition|null)=>void;confirm:()=>void;cancel:()=>void;wait:()=>void;sound:()=>void;retrySound:()=>void;inspect:()=>void;inspectTarget:(id:number)=>void;danger:()=>void;plan:()=>void;undo:()=>void;log:(lines:readonly string[])=>void}) {
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
      <label for="battle-ability">Ability</label><select id="battle-ability" aria-describedby="battle-ability-info battle-availability"></select><p id="battle-ability-info"></p><p id="battle-availability"></p><section class="battle-decision" aria-label="Target and action preview"><label for="battle-target">Target / destination</label><select id="battle-target"><option value="">Choose target</option></select><p id="battle-selection">Select a tile</p><p id="battle-target-info"></p><button id="battle-inspect-target" hidden>Inspect target</button><p id="battle-preview" aria-live="polite">Choose an action and target</p><div class="battle-commit"><button id="battle-review" disabled>Confirm action</button><button id="battle-cancel" disabled>Cancel action</button></div></section>
      <nav class="battle-tools" aria-label="Secondary battle tools"><button id="battle-plan">Plan move + ability</button><button id="battle-undo">Undo move</button><button id="battle-party">Inspect party</button><button id="battle-danger" aria-pressed="false" aria-describedby="battle-danger-info">Show enemy danger</button><button id="battle-log-open">Battle log</button><button id="battle-sound" aria-pressed="false" aria-describedby="battle-sound-status">Enable sound</button><button id="battle-sound-retry" hidden>Retry sound</button></nav><p id="battle-danger-info">Danger shows living heroes reachable by an enemy ordinary attack on its next turn, assuming current positions and statuses; it does not predict enemy choice.</p><p id="battle-sound-status" aria-live="polite">Sound off</p>`;
    const signal=this.abort.signal;
    this.root.querySelector('#battle-sound')!.addEventListener('click',callbacks.sound,{signal});
    this.root.querySelector('#battle-sound-retry')!.addEventListener('click',callbacks.retrySound,{signal});
    this.root.querySelector('#battle-plan')!.addEventListener('click',callbacks.plan,{signal});
    this.root.querySelector('#battle-undo')!.addEventListener('click',callbacks.undo,{signal});
    this.root.querySelector('#battle-danger')!.addEventListener('click',callbacks.danger,{signal});
    this.root.querySelector('#battle-party')!.addEventListener('click',()=>callbacks.inspect(),{signal});
    this.root.querySelector('#battle-inspect-target')!.addEventListener('click',event=>{const id=(event.currentTarget as HTMLElement).dataset.unitId;if(id)callbacks.inspectTarget(Number(id));},{signal});
    this.root.querySelector('#battle-log-open')!.addEventListener('click',()=>callbacks.log(this.log),{signal});
    this.ability=this.root.querySelector('#battle-ability')!;
    this.ability.addEventListener('change',()=>{if(this.ability.value)callbacks.action(this.ability.value as Action);},{signal});
    this.root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>b.addEventListener('click',()=>{
      const action=b.dataset.action==='signature'?this.ability.value:b.dataset.action;
      if(action)callbacks.action(action as Action);
    },{signal}));
    this.target=this.root.querySelector('#battle-target')!;
    this.target.addEventListener('change',()=>{if(this.target.value){const [x,y]=this.target.value.split(',').map(Number);callbacks.target({x,y});}else callbacks.target(null);},{signal});
    this.root.querySelector('#battle-review')!.addEventListener('click',callbacks.confirm,{signal});
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
  render(action:Action|null, selected:CellPosition|null, message:string, danger=false) {
    const s=this.session, enabled=s.phase==='player', actor=s.active;
    const movement=enabled?previewMovement(s.state,actor.id,s.catalog):null;
    const dangerButton=this.root.querySelector<HTMLButtonElement>('#battle-danger')!;
    dangerButton.disabled=!enabled; dangerButton.setAttribute('aria-pressed',String(danger));
    dangerButton.textContent=danger?'Hide enemy danger':'Show enemy danger';
    this.root.querySelector<HTMLButtonElement>('#battle-plan')!.disabled=!enabled || actor.hasMoved || actor.hasActed || !movement?.ok;
    this.root.querySelector<HTMLButtonElement>('#battle-undo')!.disabled=!s.canUndoMove;
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
    const abilities=ownedAbilities(s),key=abilities.map(a=>a.id).join('|');
    if(key!==this.abilityKey){this.abilityKey=key;this.ability.replaceChildren(...abilities.map(a=>new Option(displayName(a.id),a.id)));}
    if(action?.startsWith('ability:'))this.ability.value=action;
    this.ability.disabled=!enabled || actor.hasActed || !abilities.length;
    const chosen=s.catalog.abilities[this.ability.value as import('../content/types').AbilityId];
    this.root.querySelector('#battle-ability-info')!.textContent=chosen
      ? `${!enabled?locked+' ':actor.hasActed?'Action spent. ':''}Range ${chosen.rangeMin}–${chosen.rangeMax} · ${chosen.kind==='secondWind'?`Self only · heal up to ${chosen.healBase+info.def.stats.power} HP · ${actor.secondWindUsed?'0':'1'}/1 use this battle · no roll`:chosen.kind==='taunt'?'Hostile target · forced target until its next turn ends · no roll':chosen.kind==='markTarget'?'Hostile target · +2 on next player attack roll, consumed even on miss · no damage or roll':chosen.kind==='pinningShot'||chosen.kind==='frostSnare'?'Hostile target · blocks movement until its next turn ends or source/target defeat · no damage or roll':chosen.kind==='magicMissile'?'Living target, including allies · automatic force damage':chosen.kind==='guardedAttack'?'Hostile target · −2 attack / +2 AC until next turn':'Hostile target · attack roll'}${chosen.requiredLevel?` · unlock level ${chosen.requiredLevel}`:''} · uses action`
      : 'No owned abilities';
    if(actor.defId==='fighter')this.root.querySelector('#battle-ability-info')!.textContent+=' · Second Wind unlocks at level 2; Taunt at level 3';
    if(actor.defId==='ranger')this.root.querySelector('#battle-ability-info')!.textContent+=' · Mark Target unlocks at level 2; Pinning Shot at level 3';
    if(actor.defId==='mage')this.root.querySelector('#battle-ability-info')!.textContent+=' · Arc Bolt consolidated into Magic Missile (level 1); Frost Snare unlocks at level 3';
    if(chosen?.kind==='secondWind')this.root.querySelector('#battle-ability-info')!.textContent+=actor.secondWindUsed?' · Use exhausted':actor.hp===info.def.stats.maxHp?' · Full health':'';
    this.root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>{
      const spent=b.dataset.action==='move'?actor.hasMoved:actor.hasActed;
      const signature=b.dataset.action==='signature'?chosen:null;
      const unavailableHeal=signature?.kind==='secondWind' && (actor.secondWindUsed || actor.hp===info.def.stats.maxHp);
      b.disabled=!enabled || spent || (b.dataset.action==='move' && !movement?.ok) || (b.dataset.action==='signature' && !signature) || Boolean(unavailableHeal);
      b.setAttribute('aria-pressed',String(b.dataset.action==='signature'?action===chosen?.id:b.dataset.action===action));
      b.querySelector('span')!.textContent=!enabled?'Unavailable':spent?'Spent':b.disabled?'Unavailable':b.dataset.action==='move'?'Uses movement':'Uses action';
      if(b.dataset.action==='signature'){const label=signature?displayName(signature.id):'No signature';b.querySelector('strong')!.textContent=label;b.setAttribute('aria-label',label);}
    });
    this.root.querySelector('#battle-availability')!.textContent=locked || `${actor.hasMoved?'Movement spent. ':''}${actor.hasActed?'Action spent. ':''}Choose an action, then a target. Wait ends the turn immediately.`;
    (this.root.querySelector('#battle-next') as HTMLButtonElement).disabled=!enabled;
    (this.root.querySelector('#battle-review') as HTMLButtonElement).disabled=!enabled || (!s.pending && !s.pendingPlan);
    (this.root.querySelector('#battle-cancel') as HTMLButtonElement).disabled=!enabled || !action;
    this.root.querySelector('#battle-selection')!.textContent=selected?`Selected (${selected.x}, ${selected.y})`:'Select a tile';
    const occupants=selected?s.state.units.filter(u=>u.cell.x===selected.x&&u.cell.y===selected.y):[];
    const target=occupants.find(u=>u.hp>0)??occupants[0];
    this.root.querySelector('#battle-target-info')!.textContent=target?`Target: ${unitLabel(s,target)}`:'';
    const inspect=this.root.querySelector<HTMLButtonElement>('#battle-inspect-target')!;inspect.hidden=!target;inspect.dataset.unitId=target?String(target.id):'';
    this.root.querySelector('#battle-preview')!.textContent=s.error?`${s.phase==='error'?'Battle stopped':'Unavailable'}: ${s.error}`:message;
    document.querySelector('#battle-board-caption')!.textContent = (enabled && action && action!=='move' && !actor.hasActed
      ? 'Gold: active · ✓ valid target · × unavailable · Double outline: selected'
      : 'Gold: active · White: selected · Teal: reachable') + ' · Purple dots: ability reach · Pink +: target in reach · Ring: preview origin' + (danger?' · Orange triangle: hero potentially threatened':'');
    const options: {cell:CellPosition;label:string}[]=[];
    if(enabled && action==='move') {if(movement?.ok) for(const c of movement.cells.filter(c=>c.cost>0)) options.push({cell:c.cell,label:`(${c.cell.x}, ${c.cell.y}) · cost ${c.cost}`});}
    else if(enabled && action) for(const u of actionTargets(s,action)) options.push({cell:u.cell,label:unitLabel(s,u)});
    this.target.replaceChildren(new Option('Choose target',''),...options.map(o=>new Option(o.label,`${o.cell.x},${o.cell.y}`)));
    this.target.value=selected?`${selected.x},${selected.y}`:'';this.target.disabled=!enabled || !action;
  }
  append(events:readonly BattleEvent[]) {
    for(const e of events) {const text=eventText(e,id=>displayName(this.session.state.units.find(u=>u.id===id)!.defId)+` #${id}`);if(text)this.log.push(text);}
    this.log.splice(0,Math.max(0,this.log.length-LOG_LIMIT));
  }
  dispose(){this.abort.abort();this.root.replaceChildren();this.actorRoot.replaceChildren();this.actorRoot.hidden=true;}
}
