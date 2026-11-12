import { progressionLabel } from '../domain/progression';
import { DungeonMap, dungeonBiomeLabel } from './dungeonMap';
import { poiCell } from '../domain/exploration';
import { dungeonContent } from '../content/dungeon';
import { dungeonBoundary, currentFloor, clearedDungeonSlots, FloorCache, type DungeonItemCommand, type DungeonState } from '../domain/dungeon';
import type { DungeonSession } from '../app/DungeonSession';
import { ITEM_BOUNDS } from '../content/itemTypes';
import type { HeroId } from '../content/types';
import { preparationItemTarget, projectOwnedCatalog } from '../domain/items';
import { BattleDialogs } from './dialogs';
import { publicAssetUrl } from './publicAssetUrl';
import fighterSheet from './dungeonPortraits/fighter.webp?url';
import rangerSheet from './dungeonPortraits/ranger.webp?url';
import mageSheet from './dungeonPortraits/mage.webp?url';
import './dungeon.css';
export const dungeonElement = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '') => { const n = document.createElement(tag); n.textContent = text; return n; };

const sheetPortraits: Record<HeroId, string> = { fighter: fighterSheet, ranger: rangerSheet, mage: mageSheet };

function portrait(name: string, src: string | undefined, size: number) {
  const frame = dungeonElement('span', name[0]);
  frame.className = 'dungeon-portrait';
  frame.setAttribute('aria-hidden', 'true');
  if (src) {
    const img = dungeonElement('img');
    img.alt = '';
    img.width = img.height = size;
    img.addEventListener('error', () => img.remove(), { once: true });
    img.src = src;
    frame.append(img);
  }
  return frame;
}

export function renderDungeon(root: HTMLElement, s: DungeonState, session: DungeonSession, dialogs: BattleDialogs,
  actions: { start: () => void; recover?: () => void; restart: () => void }, cache: FloorCache, mapView: DungeonMap) {
  const focusId = root.contains(document.activeElement) ? document.activeElement?.id : undefined;
  const el = dungeonElement, floor = currentFloor(s);
  const title = el('h1', s.phase === 'defeat' ? `Dungeon defeat · ${dungeonBiomeLabel(s)} · Floor ${s.depth}` : `Dungeon · Floor ${s.depth} · ${dungeonBiomeLabel(s)}`); title.tabIndex = -1;
  const status = el('p',session.status);status.className='dungeon-status';status.setAttribute('role','status');
  let header=root.querySelector<HTMLElement>(':scope > .dungeon-header');
  let play=root.querySelector<HTMLElement>(':scope > .dungeon-play');
  let sidebar=play?.querySelector<HTMLElement>('.dungeon-sidebar');
  let after=root.querySelector<HTMLElement>(':scope > .dungeon-secondary');
  const openPanels = new Set(Array.from(after?.querySelectorAll('details[open]') ?? [], panel => panel.id));
  if (!header || !play || !sidebar || !after) {
    header=el('header');header.className='dungeon-header';
    play=el('div');play.className='dungeon-play';
    sidebar=el('div');sidebar.className='dungeon-sidebar';
    after=el('div');after.className='dungeon-secondary';
    play.append(sidebar,mapView.root);
    root.replaceChildren(header,play,after);
  }
  // Keep the map mounted so it retains focus, scroll position, and art selection.
  for (const child of [...root.children]) if (child !== header && child !== play && child !== after) child.remove();
  header.replaceChildren(title,status);
  sidebar.replaceChildren();
  after.replaceChildren();
  const disclosure = (id: string, label: string) => {
    const panel = el('details'), summary = el('summary', label);
    panel.id = id;
    panel.open = openPanels.has(id);
    summary.id = `${id}-summary`;
    panel.append(summary);
    return panel;
  };
  const button = (label: string, run: () => void, disabled = false, id?: string) => {
    const b=el('button',label);b.type='button';b.disabled=disabled;if(id)b.id=id;b.onclick=run;return b;
  };
  const review = (label: string, command: DungeonItemCommand) => dialogs.showChoices('Review item choice', label,[
    {id:'dungeon-item-confirm',label:'Confirm',run:()=>{session.dispatch(command);root.querySelector<HTMLElement>('h1')?.focus();}},
    {id:'dungeon-item-cancel',label:'Cancel',run:()=>root.querySelector<HTMLElement>('h1')?.focus()},
  ]);

  mapView.render(s,cache.resolve(floor.descriptor.seed, floor.descriptor.generator, floor.descriptor.size ?? 20));
  const canEnter=s.phase==='ready'&&floor.completed<3&&floor.exploration.pois.some(p=>!clearedDungeonSlots(floor).includes(p.encounterSlot)&&floor.position===poiCell(p, floor.descriptor.size ?? 20));
  if(canEnter)sidebar.append(button('Enter encounter',actions.start,false,'dungeon-start-encounter'));
  const travel=disclosure('dungeon-travel','Travel and map guide');
  travel.append(
    el('p','Tap an adjacent cell, use the compass, or press the arrow or WASD keys to move. Enemies move when you move.'),
    el('p','● Player · M encounter or guardian · ✓ cleared · ↑ upstairs · ↓ downstairs. Hatching marks remembered terrain.'),
    el('p','Walk onto an uncleared enemy to start an encounter. Clear all three encounters and resolve pending rewards to unlock descent.'),
    el('p','Move onto an available stair to travel automatically. On arrival or after continuing a save, step off and back onto the stair to travel again. Upstairs is unavailable on floor 1.'),
  );
  const party = el('section');
  party.className = 'dungeon-party';
  party.setAttribute('aria-label', 'Party');
  const roster = el('div');
  roster.className = 'dungeon-roster';
  party.append(el('h2', 'Party'), roster);
  const { catalog, items } = dungeonContent;
  for (const hero of s.party) {
    const { heroId, maxHp } = hero;
    const name = heroId[0].toUpperCase() + heroId.slice(1);
    const hp = s.activeBattle ? s.activeBattle.units.find(unit => unit.side === 'player' && unit.defId === heroId)?.hp ?? 0 : hero.hp;
    const condition = hp === 0 ? 'Defeated' : hp < maxHp ? 'Injured' : '';
    const hpLabel = `${hp}/${maxHp} HP`;
    const id = `dungeon-hero-${heroId}`;
    const card = el('div');
    card.className = 'dungeon-hero';
    const inspect = button(name, () => {
      const stats = projectOwnedCatalog(s.ownership, s.party, catalog, items).heroes[heroId].stats;
      const sheet = el('div');
      sheet.className = 'dungeon-sheet';
      const details = el('dl');
      details.append(
        el('dt', 'Health'), el('dd', condition ? `${hpLabel} · ${condition}` : hpLabel),
        el('dt', 'Accuracy'), el('dd', String(stats.accuracy)),
        el('dt', 'Armor class'), el('dd', String(stats.armorClass)),
      );
      sheet.append(portrait(name, sheetPortraits[heroId], 96), details, el('p', progressionLabel(hero)));
      dialogs.showChoices(`${name} character sheet`, sheet, [
        { id: 'dungeon-sheet-close', label: 'Close', run: () => {} },
      ], () => {}, { focusTitle: true, returnFocus: () => root.querySelector<HTMLElement>(`#${id}`) });
    }, false, id);
    inspect.setAttribute('aria-haspopup', 'dialog');
    const thumbnail = catalog.assets[catalog.heroes[heroId].portraitAssetId]?.runtimePath;
    inspect.prepend(portrait(name, thumbnail ? publicAssetUrl(thumbnail) : undefined, 48));
    const health = el('meter');
    health.min = 0;
    health.max = maxHp;
    health.value = hp;
    health.setAttribute('aria-label', `${name} health`);
    health.setAttribute('aria-valuetext', `${hp} of ${maxHp} hit points${condition ? `, ${condition.toLowerCase()}` : ''}`);
    card.append(inspect, health, el('span', hpLabel));
    if (condition) card.append(el('span', condition));
    roster.append(card);
  }
  sidebar.append(party);
  if(s.offer){const rewards=el('section');rewards.setAttribute('aria-label','Rewards');rewards.append(el('h2','Choose one reward'));
    for(const o of s.offer.options){const command:DungeonItemCommand={...dungeonBoundary(s),type:'claimReward',offerId:s.offer.id,itemId:o.itemId};rewards.append(button(`Claim ${dungeonContent.items[o.itemId].label}`,()=>review(`Claim ${dungeonContent.items[o.itemId].label} and prepare the next encounter?`,command)));}
    const decline:DungeonItemCommand={...dungeonBoundary(s),type:'declineReward',offerId:s.offer.id};
    rewards.append(button('Decline reward',()=>review('Continue without claiming either reward?',decline)));
    sidebar.append(rewards);
  }
  if(s.phase==='ready'&&floor.completed===3)sidebar.append(el('p','Descent unlocked. Walk onto the downstairs to continue.'));
  const inventory=disclosure('dungeon-inventory','Owned items');
  inventory.append(el('p',`Charms ${s.ownership.equipment.length}/${ITEM_BOUNDS.equipmentInstances.max} · Discard a charm with confirmation to free space.`));
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
  }after.append(inventory,travel);
  if(actions.recover)after.append(button('Save recovery',actions.recover,false,'dungeon-save-recovery'));
  after.append(button('Start new dungeon',actions.restart,false,'dungeon-restart'));
  const nav=el('nav');for(const [path,label] of [['run','Three-battle scenario'],['battle','Single battle'],['map','Map prototype']]){const a=el('a',label);a.href=`${import.meta.env.BASE_URL}${path}`;nav.append(a);}after.append(nav);
  if(focusId){
    const target=root.querySelector<HTMLElement>(`#${CSS.escape(focusId)}`);
    const focusTarget=target?.matches('.dungeon-directions button:disabled')?root.querySelector<HTMLElement>('#dungeon-map'):target;
    focusTarget?.focus({preventScroll:true});
  }
}
