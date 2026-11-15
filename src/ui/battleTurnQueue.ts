import type { ContentCatalog } from '../content/types';
import type { BattleState } from '../domain/types';
import { publicAssetUrl } from './publicAssetUrl';
import { turnQueue } from './turnQueue';

/** Read-only initiative strip shared by standalone, run and dungeon battle HUDs. */
export class BattleTurnQueue {
  private readonly root = document.createElement('section');
  private readonly heading = document.createElement('p');
  private readonly list = document.createElement('ol');
  private readonly abort = new AbortController();
  private key = '';

  constructor(before: HTMLElement, private readonly catalog: ContentCatalog) {
    this.root.id = 'battle-turn-order';
    this.root.setAttribute('aria-label', 'Turn order');
    this.root.hidden = true;
    this.heading.className = 'battle-turn-heading';
    this.list.id = 'battle-turn-queue';
    this.list.tabIndex = 0;
    this.list.setAttribute('aria-label', 'Living unit turn order; scroll for upcoming turns');
    this.list.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const step = Math.max(80, this.list.clientWidth / 2);
      const left = event.key === 'Home' ? 0 : event.key === 'End' ? this.list.scrollWidth
        : event.key === 'ArrowLeft' ? this.list.scrollLeft - step
        : event.key === 'ArrowRight' ? this.list.scrollLeft + step : null;
      if (left === null) return;
      event.preventDefault();
      this.list.scrollTo({ left, behavior: 'instant' });
    }, { signal: this.abort.signal });
    this.root.append(this.heading, this.list);
    before.before(this.root);
  }

  render(state: BattleState) {
    const entries = turnQueue(state);
    // Preserve the scroll position and focus during previews, hover and HP changes.
    // Only an actual order/current-actor/round change brings the current actor back.
    const key = entries.map(entry => entry.kind === 'round' ? `round:${entry.round}`
      : `${entry.unit.id}:${entry.round}:${entry.current}`).join('|');
    if (key === this.key) return;
    this.key = key;
    this.root.hidden = entries.length === 0;
    this.heading.textContent = `Turn order · Round ${state.round}`;
    this.list.replaceChildren(...entries.map(entry => {
      const item = document.createElement('li');
      if (entry.kind === 'round') {
        item.className = 'battle-turn-boundary';
        item.dataset.roundStart = String(entry.round);
        item.textContent = `Round ${entry.round}`;
        return item;
      }
      const { unit, current } = entry;
      const definition = unit.side === 'player' ? this.catalog.heroes[unit.defId] : this.catalog.enemies[unit.defId];
      const name = unit.defId.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
      item.dataset.unitId = String(unit.id);
      item.dataset.round = String(entry.round);
      item.dataset.side = unit.side;
      if (current) item.setAttribute('aria-current', 'step');
      const portrait = document.createElement('img');
      portrait.src = publicAssetUrl(this.catalog.assets[definition.portraitAssetId].runtimePath);
      portrait.alt = '';
      portrait.width = 28; portrait.height = 28;
      const text = document.createElement('span');
      const status = document.createElement('small');
      status.textContent = `${current ? 'Now · ' : ''}${unit.side === 'player' ? 'Ally' : 'Enemy'}`;
      const label = document.createElement('strong');
      label.textContent = `${name} #${unit.id}`;
      text.append(status, label);
      item.append(portrait, text);
      return item;
    }));
    this.list.scrollTo({ left: 0, behavior: 'instant' });
  }

  dispose() { this.abort.abort(); this.root.remove(); }
}
