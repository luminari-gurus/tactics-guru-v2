import type { BattleEvent } from '../domain/types';

export interface BattleLogEntry {
  readonly type: BattleEvent['type'];
  readonly text: string;
}

const filters = [
  ['all', 'All'],
  ['actions', 'Actions'],
  ['damageHealing', 'Damage & Healing'],
  ['statusSaves', 'Status & Saves'],
] as const;

type LogFilter = typeof filters[number][0];

const categoryByEvent = {
  initiativeRolled: 'actions',
  turnStarted: 'actions',
  turnEnded: 'actions',
  moved: 'actions',
  pushed: 'actions',
  moveUndone: 'actions',
  abilityUsed: 'actions',
  battleEnded: 'actions',
  attackRolled: 'damageHealing',
  missileRolled: 'damageHealing',
  damaged: 'damageHealing',
  defeated: 'damageHealing',
  healed: 'damageHealing',
  saveRolled: 'statusSaves',
  weakened: 'statusSaves',
  weakenedExpired: 'statusSaves',
  guarded: 'statusSaves',
  guardExpired: 'statusSaves',
  taunted: 'statusSaves',
  tauntExpired: 'statusSaves',
  marked: 'statusSaves',
  markConsumed: 'statusSaves',
  markExpired: 'statusSaves',
  movementBlocked: 'statusSaves',
  movementBlockExpired: 'statusSaves',
} satisfies Record<BattleEvent['type'], Exclude<LogFilter, 'all'>>;

export function filterBattleLog(entries: readonly BattleLogEntry[], filter: LogFilter): readonly BattleLogEntry[] {
  return filter === 'all' ? entries : entries.filter(entry => categoryByEvent[entry.type] === filter);
}

export function createBattleLogContent(entries: readonly BattleLogEntry[]): HTMLElement {
  const content = document.createElement('div');
  const group = document.createElement('div');
  group.id = 'battle-log-filters';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Filter battle log');

  const empty = document.createElement('p');
  empty.setAttribute('role', 'status');
  const list = document.createElement('ol');
  list.id = 'battle-log';
  list.setAttribute('aria-label', 'Battle log');

  const buttons = filters.map(([filter, label]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => render(filter));
    group.append(button);
    return { filter, button };
  });

  function render(selected: LogFilter) {
    for (const { filter, button } of buttons) {
      button.setAttribute('aria-pressed', String(filter === selected));
    }
    const visibleEntries = filterBattleLog(entries, selected);
    list.replaceChildren(...visibleEntries.map(({ text }) => {
      const item = document.createElement('li');
      item.textContent = text;
      return item;
    }));
    list.hidden = visibleEntries.length === 0;
    empty.textContent = visibleEntries.length ? '' : selected === 'all' ? 'No events yet.' : 'No events for this filter.';
    empty.hidden = !list.hidden;
  }

  content.append(group, empty, list);
  render('all');
  return content;
}
