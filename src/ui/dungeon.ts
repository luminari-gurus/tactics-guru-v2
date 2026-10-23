import { progressionLabel } from '../domain/progression';
import { DungeonMap, dungeonBiomeLabel, dungeonEncounterLabel } from './dungeonMap';
import { poiCell } from '../domain/exploration';
import { dungeonContent } from '../content/dungeon';
import { dungeonBoundary, currentFloor, FloorCache, type DungeonItemCommand } from '../domain/dungeon';
import type { DungeonSession } from '../app/DungeonSession';
import { ITEM_BOUNDS } from '../content/itemTypes';
import type { HeroId } from '../content/types';
import { projectOwnedCatalog } from '../domain/items';
import { BattleDialogs } from './dialogs';
import './dungeon.css';
export const dungeonElement = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '') => { const n = document.createElement(tag); n.textContent = text; return n; };
export function renderDungeon(root: HTMLElement, session: DungeonSession, dialogs: BattleDialogs,
  actions: { start: () => void; recover: () => void; restart: () => void }, cache: FloorCache, mapView: DungeonMap) {
  const focusId=(document.activeElement as HTMLElement|null)?.id;
  const el = dungeonElement, s = session.snapshot, floor = currentFloor(s);
  const title = el('h1', s.phase === 'defeat' ? `Dungeon defeat · ${dungeonBiomeLabel(s)} · Floor ${s.depth}` : `Dungeon · Floor ${s.depth} · ${dungeonBiomeLabel(s)}`); title.tabIndex = -1;
  const status = el('p',session.status);status.className='dungeon-status';status.setAttribute('role','status');
  const knownNext = floor.completed < 3 && floor.exploration.revealed.includes(poiCell(floor.exploration.pois[floor.completed]));
  root.replaceChildren(title,el('p',floor.completed === 3 ? 'Guardian defeated. Walk to the stairs to continue.' : `Three encounters per floor. ${knownNext ? `Next: ${dungeonEncounterLabel(s,floor.completed)}.` : 'Explore to find the next encounter.'} Defeat the goblin guardian to unlock the stairs.`),status);
  const button = (label: string, run: () => void, disabled = false, id?: string) => {
    const b=el('button',label);b.type='button';b.disabled=disabled;if(id)b.id=id;b.onclick=run;return b;
  };
  const review = (label: string, command: DungeonItemCommand) => dialogs.showChoices('Review item choice', label,[
    {id:'dungeon-item-confirm',label:'Confirm',run:()=>{session.dispatch(command);root.querySelector<HTMLElement>('h1')?.focus();}},
    {id:'dungeon-item-cancel',label:'Cancel',run:()=>root.querySelector<HTMLElement>('h1')?.focus()},
  ]);

  mapView.render(s,cache.resolve(floor.descriptor.seed));root.append(mapView.root);
  const canEnter=s.phase==='ready'&&floor.completed<3&&floor.position===poiCell(floor.exploration.pois[floor.completed]);
  if(canEnter)root.append(button('Enter encounter',actions.start,false,'dungeon-start-encounter'));
  const travel=el('section');travel.setAttribute('aria-label','Stairs');
  travel.append(el('h2','Stairs'),el('p','Walk onto the matching stair to use it. Upstairs is unavailable on floor 1.'),el('p',floor.completed===3?'Guardian defeated. Descent is unlocked.':'Defeat the guardian and claim pending rewards to unlock descent.'),
    button('Ascend',()=>session.travel('ascend',s.revision),s.depth===1||s.phase!=='ready'||floor.position!==floor.descriptor.upstairs,'dungeon-ascend'),
    button('Descend',()=>session.travel('descend',s.revision),floor.completed!==3||s.phase!=='ready'||floor.position!==floor.descriptor.downstairs,'dungeon-descend'));root.append(travel);
  const party=el('section');party.setAttribute('aria-label','Party');party.append(el('h2','Party'));
  const projected=projectOwnedCatalog(s.ownership,s.party,dungeonContent.catalog,dungeonContent.items);
  for(const h of s.party){const stats=projected.heroes[h.heroId].stats;party.append(el('p',`${h.heroId}: ${s.activeBattle?s.activeBattle.units.find(u=>u.side==='player'&&u.defId===h.heroId)?.hp??0:h.hp}/${stats.maxHp} HP · ${progressionLabel(h)} · Accuracy ${stats.accuracy} · Armor class ${stats.armorClass}${h.hp===0?' · Defeated':''}`));}root.append(party);
  if(s.offer){const rewards=el('section');rewards.setAttribute('aria-label','Rewards');rewards.append(el('h2','Choose one reward'));
    for(const o of s.offer.options){const command:DungeonItemCommand={...dungeonBoundary(s),type:'claimReward',offerId:s.offer.id,itemId:o.itemId};rewards.append(button(`Claim ${dungeonContent.items[o.itemId].label}`,()=>review('Claim this item and prepare the next encounter?',command)));}root.append(rewards);}
  const inventory=el('section');inventory.setAttribute('aria-label','Owned items');inventory.append(el('h2','Owned items'),el('p',`Charms ${s.ownership.equipment.length}/${ITEM_BOUNDS.equipmentInstances.max} · Discard a charm with confirmation to free space.`));
  if(!s.ownership.consumables.length&&!s.ownership.equipment.length)inventory.append(el('p','No owned items yet.'));
  for(const entry of [...s.ownership.consumables,...s.ownership.equipment]){
    const def=dungeonContent.items[entry.itemId],row=el('div'),select=el('select');select.setAttribute('aria-label',`${def.label} target`);
    for(const h of s.party){const o=el('option',h.heroId);o.value=h.heroId;o.disabled=h.hp===0||!def.eligibleHeroes.includes(h.heroId)||def.kind==='consumable'&&h.hp===h.maxHp;select.append(o);}
    select.value=[...select.options].find(o=>!o.disabled)?.value??'';
    row.append(el('p',`${def.label}${'quantity'in entry?` ×${entry.quantity}`:''}`),select);
    if('quantity'in entry){row.append(button(`Use ${def.label}`,()=>review(`Use ${def.label}?`,{...dungeonBoundary(s),type:'useItem',itemId:def.id,heroId:select.value as HeroId}),!select.value||!['ready','reward'].includes(s.phase)));}
    else{row.dataset.instanceId=entry.instanceId;const instanceId=entry.instanceId,assignment=s.ownership.assignments.find(a=>a.instanceId===instanceId);
      row.append(button(assignment?`Unequip ${def.label}`:`Equip ${def.label}`,()=>review(`${assignment?'Unequip':'Equip'} ${def.label}?`,{...dungeonBoundary(s),type:assignment?'unequipItem':'equipItem',instanceId,heroId:assignment?.heroId??select.value as HeroId,slot:'charm'}),(!assignment&&!select.value)||!['ready','reward'].includes(s.phase)));}
    if('instanceId'in entry){
      const command:DungeonItemCommand={...dungeonBoundary(s),type:'discardEquipment',instanceId:entry.instanceId};
      const assignment=s.ownership.assignments.find(a=>a.instanceId===entry.instanceId);
      const focus=()=>root.querySelector<HTMLElement>('h1')?.focus();
      row.append(button(`Discard ${def.label}`,()=>dialogs.showChoices('Discard charm?',`Permanently discard ${def.label}${assignment?` and unequip it from ${assignment.heroId}`:''}? No item or currency is received.`,[
        {id:'dungeon-discard-cancel',label:'Cancel',run:focus},
        {id:'dungeon-discard-confirm',label:'Discard charm',run:()=>{session.dispatch(command);focus();}},
      ],focus),!['ready','reward'].includes(s.phase)));
    }
    inventory.append(row);
  }root.append(inventory,button('Save recovery',actions.recover),button('Start new dungeon',actions.restart));
  const nav=el('nav');for(const [path,label] of [['run','Three-battle scenario'],['','Single battle'],['map','Map prototype']]){const a=el('a',label);a.href=`${import.meta.env.BASE_URL}${path}`;nav.append(a);}root.append(nav);
  if(focusId){
    const target=root.querySelector<HTMLElement>(`#${focusId}`);
    const focusTarget=target?.matches('.dungeon-directions button:disabled')?root.querySelector<HTMLElement>('#dungeon-map'):target;
    focusTarget?.focus({preventScroll:true});
  }
}
