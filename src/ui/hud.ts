import type { CellPosition } from '../content/types';
import type { BattleEvent, Command, UnitState } from '../domain/types';
import { previewMovement } from '../domain/grid';
import { D20_SIDES, NATURAL_AUTO_MISS, NATURAL_CRITICAL } from '../domain/constants';
import type { BattleSession, ActionPreview } from '../app/BattleSession';

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
export class BattleHud {
  readonly root=document.querySelector<HTMLElement>('#battle-controls')!;
  readonly target: HTMLSelectElement;
  private readonly abort=new AbortController();
  private readonly party = new Map<number,HTMLButtonElement>();
  private readonly log:string[]=[];
  constructor(private readonly session:BattleSession, callbacks:{action:(a:Action)=>void;target:(c:CellPosition)=>void;review:()=>void;cancel:()=>void;wait:()=>void}) {
    this.root.innerHTML=`<div id="battle-party" aria-label="Heroes"></div><p id="battle-active"></p><div class="fit-controls battle-actions"><button id="battle-move" data-action="move">Move</button><button data-action="basic">Basic attack</button><button data-action="signature">Signature</button><button id="battle-next">Wait / End turn</button></div><label for="battle-target">Target (or select a board cell)</label><select id="battle-target"><option value="">Choose target</option></select><p id="battle-selection">Select a tile</p><p id="battle-preview" aria-live="polite">Choose an action and target</p><div class="fit-controls"><button id="battle-review" disabled>Review action</button><button id="battle-cancel" disabled>Cancel action</button></div><details id="battle-log-panel"><summary>Battle log</summary><ol id="battle-log" aria-label="Battle log"></ol></details>`;
    const signal=this.abort.signal;
    this.root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>b.addEventListener('click',()=>callbacks.action(b.dataset.action as Action),{signal}));
    this.target=this.root.querySelector('#battle-target')!;
    this.target.addEventListener('change',()=>{if(this.target.value){const [x,y]=this.target.value.split(',').map(Number);callbacks.target({x,y});}},{signal});
    this.root.querySelector('#battle-review')!.addEventListener('click',callbacks.review,{signal});
    this.root.querySelector('#battle-cancel')!.addEventListener('click',callbacks.cancel,{signal});
    this.root.querySelector('#battle-next')!.addEventListener('click',callbacks.wait,{signal});
    for(const unit of session.state.units.filter(u=>u.side==='player')) {
      if(unit.side!=='player') continue;
      const hero=session.catalog.heroes[unit.defId], b=document.createElement('button'), img=document.createElement('img'), text=document.createElement('span');
      img.src=session.catalog.assets[hero.portraitAssetId].runtimePath;img.alt=`${displayName(unit.defId)} portrait`;img.width=32;img.height=32;
      b.append(img,text); b.addEventListener('click',()=>{this.root.querySelector('#battle-preview')!.textContent=`${this.unitLabel(session.state.units.find(u=>u.id===unit.id)!)} · inspection only`;},{signal});
      this.root.querySelector('#battle-party')!.append(b);this.party.set(unit.id,b);
    }
  }
  private unitLabel(u:UnitState) {const def=u.side==='player'?this.session.catalog.heroes[u.defId]:this.session.catalog.enemies[u.defId];return `${displayName(u.defId)} #${u.id} · HP ${u.hp}/${def.stats.maxHp}${u.guarded?' · Guarded':''}`;}
  render(action:Action|null, selected:CellPosition|null, message:string) {
    const s=this.session, enabled=s.phase==='player', actor=s.active;
    for(const u of s.state.units.filter(u=>u.side==='player')) { const b=this.party.get(u.id)!;b.querySelector('span')!.textContent=this.unitLabel(u);b.setAttribute('aria-current',String(u.id===actor.id)); }
    this.root.querySelector('#battle-active')!.textContent=`${s.state.outcome==='ongoing'?'':s.state.outcome==='playerWin'?'Victory · ':'Defeat · '}Round ${s.state.round} · ${actor.side==='player'?'Your turn':'Enemy turn'} · ${this.unitLabel(actor)} · Move ${actor.hasMoved?'spent':'ready'} / Action ${actor.hasActed?'spent':'ready'}${s.phase==='presenting'?' · Animating':''}`;
    this.root.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b=>{b.disabled=!enabled || (b.dataset.action==='move'?actor.hasMoved:actor.hasActed);b.setAttribute('aria-pressed',String(b.dataset.action===action));if(b.dataset.action==='signature') {const a=Object.values(s.catalog.abilities).find(a=>a.id!=='ability:basic_attack' && a.owners.includes(actor.defId));b.textContent=a?`Signature: ${displayName(a.id)}`:'Signature';}});
    (this.root.querySelector('#battle-next') as HTMLButtonElement).disabled=!enabled;
    (this.root.querySelector('#battle-review') as HTMLButtonElement).disabled=!enabled || !s.pending;
    (this.root.querySelector('#battle-cancel') as HTMLButtonElement).disabled=!enabled || !action;
    this.root.querySelector('#battle-selection')!.textContent=selected?`Selected (${selected.x}, ${selected.y})`:'Select a tile';
    this.root.querySelector('#battle-preview')!.textContent=s.error?`${s.phase==='error'?'Battle stopped':'Unavailable'}: ${s.error}`:message;
    const options: {cell:CellPosition;label:string}[]=[];
    if(enabled && action==='move') {const reach=previewMovement(s.state,actor.id,s.catalog);if(reach.ok) for(const c of reach.cells.filter(c=>c.cost>0)) options.push({cell:c.cell,label:`(${c.cell.x}, ${c.cell.y}) · cost ${c.cost}`});}
    else if(enabled && action) for(const u of s.state.units.filter(u=>u.side!==actor.side && u.hp>0)) options.push({cell:u.cell,label:this.unitLabel(u)});
    this.target.replaceChildren(new Option('Choose target',''),...options.map(o=>new Option(o.label,`${o.cell.x},${o.cell.y}`)));
    this.target.value=selected?`${selected.x},${selected.y}`:'';this.target.disabled=!enabled || !action;
  }
  append(events:readonly BattleEvent[]) {
    for(const e of events) {const text=eventText(e,id=>displayName(this.session.state.units.find(u=>u.id===id)!.defId)+` #${id}`);if(text)this.log.push(text);}
    this.log.splice(0,Math.max(0,this.log.length-LOG_LIMIT));
    this.root.querySelector('#battle-log')!.replaceChildren(...this.log.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
  }
  dispose(){this.abort.abort();this.root.replaceChildren();}
}
