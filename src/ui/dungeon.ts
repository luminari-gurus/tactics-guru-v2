import { progressionLabel } from '../domain/progression';
import { DungeonMap, dungeonBiomeLabel, dungeonEncounterLabel } from './dungeonMap';
import { poiCell } from '../domain/exploration';
import { dungeonContent } from '../content/dungeon';
import { dungeonBoundary, currentFloor, clearedDungeonSlots, FloorCache, type DungeonItemCommand, type DungeonState } from '../domain/dungeon';
import type { DungeonSession } from '../app/DungeonSession';
import { ITEM_BOUNDS } from '../content/itemTypes';
import type { HeroId } from '../content/types';
import { preparationItemTarget, projectOwnedCatalog } from '../domain/items';
import { BattleDialogs } from './dialogs';
import './dungeon.css';
export const dungeonElement = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '') => { const n = document.createElement(tag); n.textContent = text; return n; };
export function renderDungeon(root: HTMLElement, s: DungeonState, session: DungeonSession, dialogs: BattleDialogs,
  actions: { start: () => void; recover?: () => void; restart: () => void }, cache: FloorCache, mapView: DungeonMap) {
  const focusId=(document.activeElement as HTMLElement|null)?.id;
  const el = dungeonElement, floor = currentFloor(s);
  const title = el('h1', s.phase === 'defeat' ? `Dungeon defeat · ${dungeonBiomeLabel(s)} · Floor ${s.depth}` : `Dungeon · Floor ${s.depth} · ${dungeonBiomeLabel(s)}`); title.tabIndex = -1;
  const status = el('p',session.status);status.className='dungeon-status';status.setAttribute('role','status');
  let before=root.querySelector<HTMLElement>(':scope > [data-dungeon-part="before"]');
  let after=root.querySelector<HTMLElement>(':scope > [data-dungeon-part="after"]');
  if (!before || !after || mapView.root.parentElement !== root) {
    before=el('div');before.dataset.dungeonPart='before';after=el('div');after.dataset.dungeonPart='after';
    root.replaceChildren(before,mapView.root,after);
  }
  // Rebuild the host-owned footer on every render while keeping the map mounted.
  for (const child of [...root.children]) if (child !== before && child !== mapView.root && child !== after) child.remove();
  before.replaceChildren(title,el('p',floor.completed === 3 ? 'All encounters cleared. Walk to the stairs to continue.' : 'Walk onto any uncleared enemy to start its encounter. Clear all three encounters to unlock the stairs.'),status);
  after.replaceChildren();
  const button = (label: string, run: () => void, disabled = false, id?: string) => {
    const b=el('button',label);b.type='button';b.disabled=disabled;if(id)b.id=id;b.onclick=run;return b;
  };
  const review = (label: string, command: DungeonItemCommand) => dialogs.showChoices('Review item choice', label,[
    {id:'dungeon-item-confirm',label:'Confirm',run:()=>{session.dispatch(command);root.querySelector<HTMLElement>('h1')?.focus();}},
    {id:'dungeon-item-cancel',label:'Cancel',run:()=>root.querySelector<HTMLElement>('h1')?.focus()},
  ]);

  mapView.render(s,cache.resolve(floor.descriptor.seed, floor.descriptor.generator, floor.descriptor.size ?? 20));
  const canEnter=s.phase==='ready'&&floor.completed<3&&floor.exploration.pois.some(p=>!clearedDungeonSlots(floor).includes(p.encounterSlot)&&floor.position===poiCell(p, floor.descriptor.size ?? 20));
  if(canEnter)after.append(button('Enter encounter',actions.start,false,'dungeon-start-encounter'));
  const travel=el('section');travel.setAttribute('aria-label','Stairs');
  travel.append(el('h2','Stairs'),el('p','Move onto an available stair to travel automatically. On arrival or after continuing a save, move off and back onto the stair to travel again. Upstairs is unavailable on floor 1.'),el('p',floor.completed===3?'All encounters cleared. Descent is unlocked.':'Clear all three encounters and claim pending rewards to unlock descent.'));after.append(travel);
  const party=el('section');party.setAttribute('aria-label','Party');party.append(el('h2','Party'));
  const projected=projectOwnedCatalog(s.ownership,s.party,dungeonContent.catalog,dungeonContent.items);
  for(const h of s.party){const stats=projected.heroes[h.heroId].stats;party.append(el('p',`${h.heroId}: ${s.activeBattle?s.activeBattle.units.find(u=>u.side==='player'&&u.defId===h.heroId)?.hp??0:h.hp}/${stats.maxHp} HP · ${progressionLabel(h)} · Accuracy ${stats.accuracy} · Armor class ${stats.armorClass}${h.hp===0?' · Defeated':''}`));}after.append(party);
  if(s.offer){const rewards=el('section');rewards.setAttribute('aria-label','Rewards');rewards.append(el('h2','Choose one reward'));
    for(const o of s.offer.options){const command:DungeonItemCommand={...dungeonBoundary(s),type:'claimReward',offerId:s.offer.id,itemId:o.itemId};rewards.append(button(`Claim ${dungeonContent.items[o.itemId].label}`,()=>review('Claim this item and prepare the next encounter?',command)));}
    const decline:DungeonItemCommand={...dungeonBoundary(s),type:'declineReward',offerId:s.offer.id};
    rewards.append(button('Decline reward',()=>review('Continue without claiming either reward?',decline)));
    after.append(rewards);
  }
  const inventory=el('section');inventory.setAttribute('aria-label','Owned items');inventory.append(el('h2','Owned items'),el('p',`Charms ${s.ownership.equipment.length}/${ITEM_BOUNDS.equipmentInstances.max} · Discard a charm with confirmation to free space.`));
  if(!s.ownership.consumables.length&&!s.ownership.equipment.length)inventory.append(el('p','No owned items yet.'));
  for(const entry of [...s.ownership.consumables,...s.ownership.equipment]){
    const def=dungeonContent.items[entry.itemId],row=el('div'),select=el('select');select.setAttribute('aria-label',`${def.label} target`);
    for(const h of s.party){
      const preview=preparationItemTarget(def,h,s.party);
      const o=el('option',preview.ok?h.heroId:`${h.heroId} (${preview.reason})`);
      o.value=h.heroId;o.disabled=!preview.ok;select.append(o);
    }
    select.value=[...select.options].find(o=>!o.disabled)?.value??'';
    row.append(el('p',`${def.label}${'quantity'in entry?` ×${entry.quantity}`:''}`),select);
    if('quantity'in entry){
      row.append(button(`Use ${def.label}`,()=>{
        const hero=s.party.find(h=>h.heroId===select.value);
        if(!hero)return;
        const preview=preparationItemTarget(def,hero,s.party);
        const result=preview.ok?`${hero.heroId} will have ${preview.hp}/${hero.maxHp} HP.`:`${hero.heroId} cannot use this item (${preview.reason}).`;
        review(`Use ${def.label} on ${hero.heroId}? ${result}`,
          {...dungeonBoundary(s),type:'useItem',itemId:def.id,heroId:hero.heroId});
      },!select.value||!['ready','reward'].includes(s.phase)));
    }
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
  }after.append(inventory);
  if(actions.recover)after.append(button('Save recovery',actions.recover));
  after.append(button('Start new dungeon',actions.restart));
  const nav=el('nav');for(const [path,label] of [['run','Three-battle scenario'],['battle','Single battle'],['map','Map prototype']]){const a=el('a',label);a.href=`${import.meta.env.BASE_URL}${path}`;nav.append(a);}after.append(nav);
  if(focusId){
    const target=root.querySelector<HTMLElement>(`#${focusId}`);
    const focusTarget=target?.matches('.dungeon-directions button:disabled')?root.querySelector<HTMLElement>('#dungeon-map'):target;
    focusTarget?.focus({preventScroll:true});
  }
}
