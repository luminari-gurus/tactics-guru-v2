import type { HeroId } from '../content/types';
import type { ItemDef } from '../content/itemTypes';
import type { ItemCommand } from '../domain/items';
import { projectItemCatalog } from '../domain/items';
import type { RunItemSession } from '../app/RunItemSession';
import type { RunLoadResult } from '../persistence/runStorage';
import { BattleDialogs, type DialogChoice } from './dialogs';
import './runItems.css';

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '') => {
  const node = document.createElement(tag); node.textContent = text; return node;
};
const heroLabel = (id: HeroId) => id[0].toUpperCase() + id.slice(1);
const encounterLabel = (id: string) => id.split(':').at(-1)!.split('_').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
const effect = (def: ItemDef) => def.effect.kind === 'restoreHp' ? `Restore ${def.effect.amount} HP` :
  `+${def.effect.amount} ${def.effect.stat === 'armorClass' ? 'armor class' : 'accuracy'}`;
/** Mount once per flow, dispose before replacement. Caller owns the sole modal instance. */
export function mountRunItems(root: HTMLElement, session: RunItemSession, dialogs: BattleDialogs,
  host?: { continueRun: (load: RunLoadResult) => void; recover: () => void }) {
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
  const showRecovery = (load: RunLoadResult = session.inspect()) => {
    const choices: DialogChoice[] = [];
    if (load.ok) {
      for (const slot of ['primary', 'backup'] as const) {
        const value = load.inspection[slot];
        if ('text' in value && value.text !== null) {
          const text = value.text;
          choices.push({ id: `export-${slot}`, label: `Export ${slot} save`, run: () => {
            const url = URL.createObjectURL(new Blob([JSON.stringify({ slot, text })], { type: 'application/json' }));
            const link = element('a'); link.href = url; link.download = `tactics-guru-run-${slot}.json`; link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000); focus();
          } });
          choices.push({ id: `remove-${slot}`, label: `Remove ${slot} save`, run: () => {
            dialogs.showChoices('Remove saved data?', `Remove the reviewed ${slot} run save? Export it first if needed.`, [
              { id: 'remove-confirm', label: 'Remove reviewed save', run: () => { session.remove(slot, load); focus(); } },
              { id: 'remove-cancel', label: 'Cancel', run: focus },
            ], focus);
          } });
        }
      }
    }
    choices.push({ id: 'retry-save', label: 'Retry saving', run: () => { session.save(); focus(); } },
      { id: 'recovery-cancel', label: 'Cancel', run: focus });
    const message = load.ok ? ['primary', 'backup'].map(slot => `${slot}: ${load.inspection[slot as 'primary' | 'backup'].status}`).join('. ')
      : `Storage ${load.kind}. Play can continue unsaved.`;
    dialogs.showChoices('Save recovery', message, choices, focus);
  };
  // The live flow owns scene navigation and retained recovery copies.
  const recover = (load?: RunLoadResult) => host ? host.recover() : showRecovery(load);
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
      party.append(element('p', `${heroLabel(hero.heroId)}: ${displayedHp}/${def.stats.maxHp} HP${displayedHp === 0 ? ' · Defeated' : ''} · Accuracy ${stats.accuracy} · Armor class ${stats.armorClass} · Charm: ${owned ? session.context.items[owned.itemId].label : 'none'}`));
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
        const max = session.context.catalog.heroes[hero.heroId].stats.maxHp;
        const reason = hero.hp === 0 ? 'defeated' : !def.eligibleHeroes.includes(hero.heroId) ? 'ineligible' :
          def.kind === 'consumable' && hero.hp === max ? 'full HP' : '';
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
      const use = button(`Use ${def.label}`, () => review(`Use ${def.label} on ${select.selectedOptions[0]?.text}?`,
        { ...session.boundary(), type: 'useItem', itemId: def.id, heroId: select.value as HeroId }));
      use.disabled = select.disabled;
      row.append(element('p', `${def.label} ×${stack.quantity} · ${effect(def)}`), select, use);
      if (!select.value) row.append(element('p', 'No eligible living target with missing HP.'));
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
    const persistence = element('section'); persistence.setAttribute('aria-label', 'Run save');
    persistence.append(button('Continue saved run', () => {
      const load = session.inspect();
      if (!load.ok || !load.selected) { recover(load); return; }
      dialogs.showChoices('Continue saved run?', load.selected.slot === 'backup' ? 'Recover backup. Some progress may be lost.' : 'Restore the saved run boundary.', [
        { id: 'continue-run', label: 'Continue', run: () => { if (host) host.continueRun(load); else session.continue(load); focus(); } },
        { id: 'continue-cancel', label: 'Cancel', run: focus },
      ], focus);
    }), button('Save recovery', () => recover()));
    root.replaceChildren(title, description, status, element('p', unavailable || 'Items may be used now, before the next battle starts.'), party, rewards, inventory, persistence);
  };
  session.onChange = render;
  render();
  return () => { session.onChange = null; abort.abort(); renderAbort.abort(); dialogs.close(); dialogs.element.classList.remove('run-item-dialog'); root.classList.remove('run-items'); root.replaceChildren(); };
}
