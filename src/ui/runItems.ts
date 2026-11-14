import type { HeroId } from '../content/types';
import type { ItemDef } from '../content/itemTypes';
import type { ItemCommand } from '../domain/items';
import { progressionLabel } from '../domain/progression';
import { preparationItemTarget, projectItemCatalog } from '../domain/items';
import type { RunItemSession } from '../app/RunItemSession';
import { BattleDialogs } from './dialogs';
import './runItems.css';

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '') => {
  const node = document.createElement(tag); node.textContent = text; return node;
};
const heroLabel = (id: HeroId) => id[0].toUpperCase() + id.slice(1);
const encounterLabel = (id: string) => id.split(':').at(-1)!.split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
const effect = (def: ItemDef) => def.effect.kind === 'restoreHp' ? `Restore ${def.effect.amount} HP` :
  def.effect.kind === 'revive' ? `Revive a fallen hero at ${def.effect.percent}% HP (rounded down, minimum 1)` :
    `+${def.effect.amount} ${def.effect.stat === 'armorClass' ? 'armor class' : 'accuracy'}`;
/** Mount once per flow, dispose before replacement. Caller owns the sole modal instance. */
export function mountRunItems(root: HTMLElement, session: RunItemSession, dialogs: BattleDialogs) {
  const abort = new AbortController();
  let renderAbort = new AbortController();
  dialogs.element.classList.add('run-item-dialog');
  root.classList.add('run-items');
  const focus = () => root.querySelector<HTMLElement>('button:not(:disabled)')?.focus();
  const button = (label: string, run: () => void) => {
    const node = element('button', label); node.type = 'button';
    node.addEventListener('click', run, { signal: renderAbort.signal }); return node;
  };
  const review = (label: string, command: ItemCommand) => {
    dialogs.showChoices('Review item choice', label, [
      { id: 'item-confirm', label: 'Confirm', run: () => { session.dispatch(command); focus(); } },
      { id: 'item-cancel', label: 'Cancel', run: focus },
    ], focus);
  };
  // A held activation key must not flow through a replaced control or modal.
  document.addEventListener('keydown', event => {
    if (event.repeat && (event.key === 'Enter' || event.key === ' ') &&
      (root.contains(event.target as Node) || dialogs.element.contains(event.target as Node))) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, { capture: true, signal: abort.signal });
  root.addEventListener('pointerdown', event => event.stopPropagation(), { signal: abort.signal });
  root.addEventListener('click', event => event.stopPropagation(), { signal: abort.signal });
  const render = () => {
    renderAbort.abort(); renderAbort = new AbortController();
    const { items, activeBattle } = session.snapshot;
    const { run, ownership } = items;
    const title = element('h1', run.phase === 'reward' ? 'Choose one reward' : 'Party items');
    title.tabIndex = -1;
    const phase = activeBattle ? 'Battle in progress' : run.phase === 'battle' ? 'Prepare party' : run.phase === 'reward' ? 'Reward choice' : run.phase === 'victory' ? 'Victory' : 'Defeat';
    const description = element('p', `Encounter ${run.encounterIndex + 1} of 3 · ${encounterLabel(run.encounters[run.encounterIndex])} · ${phase}`);
    const status = element('p', session.status); status.setAttribute('role', 'status'); status.id = 'run-item-status';
    const allowed = !activeBattle && (run.phase === 'reward' || run.phase === 'battle' && run.encounterIndex > 0);
    const unavailable = allowed ? '' : activeBattle ? 'Items are unavailable during a battle.' : 'Items are unavailable in this phase.';
    const party = element('section'); party.setAttribute('aria-label', 'Party');
    const projected = projectItemCatalog(items, session.context.definition, session.context.catalog, session.context.items);
    for (const hero of run.party) {
      const def = session.context.catalog.heroes[hero.heroId];
      const stats = projected.ok ? projected.catalog.heroes[hero.heroId].stats : def.stats;
      const assignment = ownership.assignments.find(a => a.heroId === hero.heroId);
      const owned = ownership.equipment.find(i => i.instanceId === assignment?.instanceId);
      const displayedHp = activeBattle ? activeBattle.units.find(u => u.side === 'player' && u.defId === hero.heroId)?.hp ?? 0 : hero.hp;
      party.append(element('p', `${heroLabel(hero.heroId)}: ${displayedHp}/${stats.maxHp} HP · ${progressionLabel(hero)}${displayedHp === 0 ? ' · Defeated' : ''} · Accuracy ${stats.accuracy} · Armor class ${stats.armorClass} · Charm: ${owned ? session.context.items[owned.itemId].label : 'none'}`));
    }
    const rewards = element('section'); rewards.setAttribute('aria-label', 'Rewards');
    if (items.offer) {
      rewards.append(element('h2', 'Claim one item'));
      for (const option of items.offer.options) {
        const def = session.context.items[option.itemId];
        const command: ItemCommand = { ...session.boundary(), type: 'claimReward', offerId: items.offer.id, itemId: def.id };
        const claim = button(`Claim ${def.label}`, () => review(`Claim ${def.label}? This advances to the next encounter's preparation.`, command));
        claim.disabled = !allowed;
        const row = element('div'); row.append(element('p', `${def.label} · ${effect(def)}`), claim); rewards.append(row);
      }
    }
    const inventory = element('section'); inventory.setAttribute('aria-label', 'Owned items'); inventory.append(element('h2', 'Owned items'));
    if (!ownership.consumables.length && !ownership.equipment.length) inventory.append(element('p', 'No owned items yet.'));
    const targets = (def: ItemDef, id: string) => {
      const select = element('select'); select.id = id; select.setAttribute('aria-label', `${def.label} target`);
      for (const hero of run.party) {
        const preview = preparationItemTarget(def, hero, run.party);
        const reason = preview.ok ? '' : preview.reason;
        const option = element('option', `${heroLabel(hero.heroId)}${reason ? ` (${reason})` : ''}`);
        option.value = hero.heroId; option.disabled = !!reason; select.append(option);
      }
      const first = [...select.options].find(o => !o.disabled); select.value = first?.value ?? '';
      select.disabled = !allowed || !first;
      return select;
    };
    for (const stack of ownership.consumables) {
      const def = session.context.items[stack.itemId], row = element('div');
      const select = targets(def, `target-${def.id}`);
      const use = button(`Use ${def.label}`, () => {
        const hero = run.party.find(h => h.heroId === select.value);
        if (!hero) return;
        const preview = preparationItemTarget(def, hero, run.party), name = heroLabel(hero.heroId);
        const result = preview.ok ? `${name} will have ${preview.hp}/${hero.maxHp} HP.` : `${name} cannot use this item (${preview.reason}).`;
        review(`Use ${def.label} on ${name}? ${result}`,
          { ...session.boundary(), type: 'useItem', itemId: def.id, heroId: hero.heroId });
      });
      use.disabled = select.disabled;
      row.append(element('p', `${def.label} ×${stack.quantity} · ${effect(def)}`), select, use);
      if (!select.value) row.append(element('p', def.effect.kind === 'revive' ? 'No eligible fallen hero.' : 'No eligible living target with missing HP.'));
      inventory.append(row);
    }
    for (const instance of ownership.equipment) {
      const def = session.context.items[instance.itemId]; if (def.kind !== 'equipment') continue;
      const assignment = ownership.assignments.find(a => a.instanceId === instance.instanceId), row = element('div');
      const select = targets(def, `target-${instance.instanceId}`);
      const action = assignment ? 'Unequip' : 'Equip';
      const equip = button(`${action} ${def.label}`, () => review(`${action} ${def.label}?`,
        { ...session.boundary(), type: assignment ? 'unequipItem' : 'equipItem', instanceId: instance.instanceId,
          heroId: assignment?.heroId ?? select.value as HeroId, slot: def.slot }));
      equip.disabled = !allowed || (assignment ? run.party.find(h => h.heroId === assignment.heroId)!.hp === 0 : select.disabled);
      row.append(element('p', `${def.label} · ${effect(def)} · ${def.slot}${assignment ? ` · ${heroLabel(assignment.heroId)}` : ''}`));
      if (!assignment) row.append(select);
      row.append(equip); inventory.append(row);
    }
    root.replaceChildren(title, description, status, element('p', unavailable || 'Items may be used now, before the next battle starts.'), party, rewards, inventory);
  };
  session.onChange = render;
  render();
  return () => { session.onChange = null; abort.abort(); renderAbort.abort(); dialogs.close(); dialogs.element.classList.remove('run-item-dialog'); root.classList.remove('run-items'); root.replaceChildren(); };
}
