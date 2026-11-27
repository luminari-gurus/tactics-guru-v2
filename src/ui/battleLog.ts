import type { AbilityId, BattleEvent, BattleState, Versions } from '../domain/types';

const LOG_LIMIT = 40;
const LOG_FILENAME = 'tactics-guru-combat-log.json';

interface LogUnit {
  readonly id: number;
  readonly name: string;
}

type LogAction =
  | { readonly type: 'ability'; readonly abilityId: AbilityId; readonly label: string }
  | { readonly type: 'turnStart' | 'move' | 'undoMove' | 'endTurn' | 'drinkDraught' | 'event'; readonly label: string };

interface LogContext {
  readonly round: number;
  readonly actor: LogUnit;
  readonly commandNumber: number;
  readonly action: LogAction;
}

function actionFor(event: BattleEvent, displayName: (id: string) => string): LogAction {
  switch (event.type) {
    case 'abilityUsed': return { type: 'ability', abilityId: event.abilityId, label: displayName(event.abilityId) };
    case 'moved': return { type: 'move', label: 'Move' };
    case 'moveUndone': return { type: 'undoMove', label: 'Undo move' };
    case 'turnEnded': return { type: 'endTurn', label: 'End turn' };
    case 'healed': return { type: 'drinkDraught', label: 'Drink Healing Draught' };
    default: return { type: 'event', label: 'Combat event' };
  }
}

function resultFor(event: BattleEvent) {
  switch (event.type) {
    case 'attackRolled':
      return { outcome: event.result, natural: event.natural, bonus: event.bonus, total: event.total, armorClass: event.armorClass };
    case 'saveRolled':
      return { saved: event.saved, natural: event.natural, modifier: event.modifier, total: event.total, dc: event.dc };
    case 'missileRolled':
      return { missile: event.missile, natural: event.natural, damage: event.damage };
    case 'damaged': return { damage: event.damage, hp: event.hp };
    case 'healed': return { healing: event.healing, hp: event.hp };
    case 'battleEnded': return { outcome: event.outcome };
  }
}

interface LogEvent {
  readonly type: BattleEvent['type'];
  readonly text: string;
  readonly unit?: LogUnit;
  readonly target?: LogUnit;
  readonly source?: LogUnit;
  readonly result?: ReturnType<typeof resultFor>;
}

export interface BattleLogEntry extends LogEvent {
  readonly context: LogContext;
}

export interface BattleLogSnapshot {
  readonly entries: readonly BattleLogEntry[];
  readonly resumed: boolean;
  readonly truncated: boolean;
}

type LogBoundary = Pick<BattleState, 'round' | 'commandCount' | 'initiative' | 'activeIndex' | 'units'>;

export class BattleLog {
  private readonly entries: BattleLogEntry[] = [];
  private truncated = false;

  constructor(
    initial: LogBoundary,
    private readonly resumed: boolean,
    private readonly displayName: (id: string) => string,
    private readonly formatEvent: (event: BattleEvent, name: (id: number) => string) => string,
  ) {
    this.append(initial, [{ type: 'turnStarted', round: initial.round, unitId: initial.initiative[initial.activeIndex] }], initial.commandCount);
  }

  append(before: LogBoundary, events: readonly BattleEvent[], commandNumber = before.commandCount + 1): void {
    const first = events[0];
    if (!first) return;
    const unit = (id: number): LogUnit => {
      const defId = before.units.find(candidate => candidate.id === id)!.defId;
      return { id, name: `${this.displayName(defId)} #${id}` };
    };
    const context: LogContext = {
      round: before.round,
      actor: unit(before.initiative[before.activeIndex]),
      commandNumber,
      action: actionFor(first, this.displayName),
    };
    for (const event of events) {
      const text = this.formatEvent(event, id => unit(id).name);
      if (!text) continue;
      const eventContext: LogContext = event.type === 'turnStarted'
        ? { round: event.round, actor: unit(event.unitId), commandNumber, action: { type: 'turnStart', label: 'Turn begins' } }
        : context;
      const result = resultFor(event);
      this.entries.push({
        type: event.type, text, context: eventContext,
        ...('unitId' in event && { unit: unit(event.unitId) }),
        ...('targetId' in event && { target: unit(event.targetId) }),
        ...('sourceId' in event && { source: unit(event.sourceId) }),
        ...(result && { result }),
      });
    }
    const overflow = this.entries.length - LOG_LIMIT;
    if (overflow > 0) {
      this.entries.splice(0, overflow);
      this.truncated = true;
    }
  }

  snapshot(): BattleLogSnapshot {
    return { entries: [...this.entries], resumed: this.resumed, truncated: this.truncated };
  }
}

interface LogGroup extends LogContext {
  readonly entries: LogEvent[];
}

export function groupBattleLog(entries: readonly BattleLogEntry[]): readonly LogGroup[] {
  const groups: LogGroup[] = [];
  for (const { context, ...event } of entries) {
    const previous = groups.at(-1);
    if (previous?.commandNumber === context.commandNumber && previous.action.type === context.action.type) {
      previous.entries.push(event);
    } else {
      groups.push({ ...context, entries: [event] });
    }
  }
  return groups;
}

export function serializeBattleLog(log: BattleLogSnapshot, build: typeof __BUILD_INFO__, versions: Versions): string {
  return JSON.stringify({
    format: 'tactics-guru-combat-log',
    version: 1,
    build: { commit: build.commit, dirty: build.dirty },
    versions: { rules: versions.rules, rng: versions.rng, content: versions.content },
    history: { limit: LOG_LIMIT, resumed: log.resumed, truncated: log.truncated },
    groups: groupBattleLog(log.entries),
  }, null, 2) + '\n';
}

export function downloadBattleLog(log: BattleLogSnapshot, build: typeof __BUILD_INFO__, versions: Versions): void {
  const text = serializeBattleLog(log, build, versions);
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = LOG_FILENAME;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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

  const retention = document.createElement('p');
  retention.textContent = `Latest ${LOG_LIMIT} events in this encounter. Reload clears earlier events.`;
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
    list.replaceChildren(...groupBattleLog(visibleEntries).map(({ round, actor, action, entries }) => {
      const item = document.createElement('li');
      const heading = document.createElement('strong');
      heading.textContent = `Round ${round} · ${actor.name} · ${action.label}`;
      const events = document.createElement('ol');
      for (const { text } of entries) {
        const line = document.createElement('li');
        line.textContent = text;
        events.append(line);
      }
      item.append(heading, events);
      return item;
    }));
    list.hidden = visibleEntries.length === 0;
    empty.textContent = visibleEntries.length ? '' : selected === 'all' ? 'No events yet.' : 'No events for this filter.';
    empty.hidden = !list.hidden;
  }

  content.append(retention, group, empty, list);
  render('all');
  return content;
}
