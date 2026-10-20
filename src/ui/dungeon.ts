import { dungeonContent } from '../content/dungeon';
import { dungeonBoundary, currentFloor, FloorCache, dungeonSlot } from '../domain/dungeon';
import type { DungeonSession } from '../app/DungeonSession';
import type { ItemCommand } from '../domain/items';
import type { HeroId } from '../content/types';
import { projectOwnedCatalog } from '../domain/items';
import { BattleDialogs } from './dialogs';
import './dungeon.css';
export const dungeonElement = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '') => { const n = document.createElement(tag); n.textContent = text; return n; };
export function renderDungeon(root: HTMLElement, session: DungeonSession, dialogs: BattleDialogs,
  actions: { start: () => void; recover: () => void; restart: () => void }, cache: FloorCache) {
  const el = dungeonElement, s = session.snapshot, floor = currentFloor(s);
  const title = el('h1', s.phase === 'defeat' ? 'Dungeon defeat' : `Dungeon · Floor ${s.depth}`); title.tabIndex = -1;
  const status = el('p',session.status);status.className='dungeon-status';status.setAttribute('role','status');
  root.replaceChildren(title,el('p','Continuing floors · Current encounter template: three battles; the third guards the stairs.'),status);
  const button = (label: string, run: () => void, disabled = false, id?: string) => {
    const b=el('button',label);b.type='button';b.disabled=disabled;if(id)b.id=id;b.onclick=run;return b;
  };
  const review = (label: string, command: ItemCommand) => dialogs.showChoices('Review item choice', label,[
    {id:'dungeon-item-confirm',label:'Confirm',run:()=>{session.dispatch(command);root.querySelector<HTMLElement>('h1')?.focus();}},
    {id:'dungeon-item-cancel',label:'Cancel',run:()=>root.querySelector<HTMLElement>('h1')?.focus()},
  ]);
  const board=el('section');board.setAttribute('aria-label','Floor summary');
  const cells=cache.resolve(floor.descriptor.seed).cells;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 200 200');svg.setAttribute('role','img');svg.setAttribute('aria-label',`Floor ${s.depth}: Rooms, Grassland. Player at cell ${floor.position}. Upstairs ${floor.descriptor.upstairs}, downstairs ${floor.descriptor.downstairs}.`);
  for(let i=0;i<400;i++)if(cells[i]){const r=document.createElementNS(svg.namespaceURI,'rect');r.setAttribute('x',String(i%20*10));r.setAttribute('y',String(Math.floor(i/20)*10));r.setAttribute('width','9');r.setAttribute('height','9');r.setAttribute('fill','#526348');svg.append(r);}
  for(const [cell,label,color] of [[floor.descriptor.upstairs,'↑','#dae4c9'],[floor.descriptor.downstairs,'↓','#e1b96a'],[floor.position,'●','#8cd7ed']] as const){const t=document.createElementNS(svg.namespaceURI,'text');t.setAttribute('x',String(cell%20*10+5));t.setAttribute('y',String(Math.floor(cell/20)*10+8));t.setAttribute('text-anchor','middle');t.setAttribute('font-size','9');t.setAttribute('fill',color);t.textContent=label;svg.append(t);}
  board.append(svg,el('p',`Player cell ${floor.position} · Upstairs ${floor.descriptor.upstairs} · Downstairs ${floor.descriptor.downstairs}`),el('p','Floor summary: use the encounter and stair controls below. Spatial exploration is not yet available.'));
  const list=el('ol');
  dungeonContent.encounters.forEach((e,i)=>list.append(el('li',`${i===2?'Guardian · ':''}${e.id.replace('encounter:','').replaceAll('_',' ')} · ${i<floor.completed?'Cleared':i===dungeonSlot(s)?s.phase==='reward'?'Reward pending':'Next':'Locked'}`)));
  board.append(list);root.append(board);
  const battleLabel=s.activeBattle?'Continue encounter':floor.completed===2?'Challenge guardian':'Start encounter';
  root.append(button(battleLabel,actions.start,s.phase==='defeat'||s.phase==='reward'||floor.completed===3,'dungeon-start-encounter'));
  const travel=el('section');travel.setAttribute('aria-label','Stairs');
  travel.append(el('h2','Stairs'),el('p',floor.completed===3?'Guardian defeated. Descent is unlocked.':'Defeat the guardian and claim pending rewards to unlock descent.'),
    button('Ascend',()=>session.travel('ascend',s.revision),s.depth===1||s.phase!=='ready','dungeon-ascend'),
    button('Descend',()=>session.travel('descend',s.revision),floor.completed!==3||s.phase!=='ready','dungeon-descend'));root.append(travel);
  const party=el('section');party.setAttribute('aria-label','Party');party.append(el('h2','Party'));
  const projected=projectOwnedCatalog(s.ownership,s.party,dungeonContent.catalog,dungeonContent.items);
  for(const h of s.party){const stats=projected.heroes[h.heroId].stats;party.append(el('p',`${h.heroId}: ${s.activeBattle?s.activeBattle.units.find(u=>u.side==='player'&&u.defId===h.heroId)?.hp??0:h.hp}/${stats.maxHp} HP · Accuracy ${stats.accuracy} · Armor class ${stats.armorClass}${h.hp===0?' · Defeated':''}`));}root.append(party);
  if(s.offer){const rewards=el('section');rewards.setAttribute('aria-label','Rewards');rewards.append(el('h2','Choose one reward'));
    for(const o of s.offer.options){const command:ItemCommand={...dungeonBoundary(s),type:'claimReward',offerId:s.offer.id,itemId:o.itemId};rewards.append(button(`Claim ${dungeonContent.items[o.itemId].label}`,()=>review('Claim this item and prepare the next encounter?',command)));}root.append(rewards);}
  const inventory=el('section');inventory.setAttribute('aria-label','Owned items');inventory.append(el('h2','Owned items'));
  if(!s.ownership.consumables.length&&!s.ownership.equipment.length)inventory.append(el('p','No owned items yet.'));
  for(const entry of [...s.ownership.consumables,...s.ownership.equipment]){
    const def=dungeonContent.items[entry.itemId],row=el('div'),select=el('select');select.setAttribute('aria-label',`${def.label} target`);
    for(const h of s.party){const o=el('option',h.heroId);o.value=h.heroId;o.disabled=h.hp===0||!def.eligibleHeroes.includes(h.heroId)||def.kind==='consumable'&&h.hp===dungeonContent.catalog.heroes[h.heroId].stats.maxHp;select.append(o);}
    select.value=[...select.options].find(o=>!o.disabled)?.value??'';
    row.append(el('p',`${def.label}${'quantity'in entry?` ×${entry.quantity}`:''}`),select);
    if('quantity'in entry){row.append(button(`Use ${def.label}`,()=>review(`Use ${def.label}?`,{...dungeonBoundary(s),type:'useItem',itemId:def.id,heroId:select.value as HeroId}),!select.value||!['ready','reward'].includes(s.phase)));}
    else{const instanceId=entry.instanceId,assignment=s.ownership.assignments.find(a=>a.instanceId===instanceId);
      row.append(button(assignment?`Unequip ${def.label}`:`Equip ${def.label}`,()=>review(`${assignment?'Unequip':'Equip'} ${def.label}?`,{...dungeonBoundary(s),type:assignment?'unequipItem':'equipItem',instanceId,heroId:assignment?.heroId??select.value as HeroId,slot:'charm'}),(!assignment&&!select.value)||!['ready','reward'].includes(s.phase)));}
    inventory.append(row);
  }root.append(inventory,button('Save recovery',actions.recover),button('Start new dungeon',actions.restart));
  const nav=el('nav');for(const [path,label] of [['run','Three-battle scenario'],['','Single battle'],['map','Map prototype']]){const a=el('a',label);a.href=`${import.meta.env.BASE_URL}${path}`;nav.append(a);}root.append(nav);
}
