import type { DungeonFloor, DungeonState } from '../domain/dungeon';
import { currentFloor, clearedDungeonSlots, dungeonStairStatus } from '../domain/dungeon';
import { dungeonContent } from '../content/dungeon';
import type { ItemId } from '../content/itemTypes';
import { currentSight, neighbors, poiCell } from '../domain/exploration';
import type { GeneratedMap } from '../map/generate';
import { createMapArt, ART_STYLES, type ArtStyle } from '../map/art';
import { BIOMES, type Terrain } from '../map/biomes';

export function dungeonBiomeLabel(s: DungeonState): string {
  return BIOMES.find(b => b.version === currentFloor(s).descriptor.biome)!.label;
}
export function dungeonEncounterLabel(s: DungeonState, slot: number): string {
  const kind = currentFloor(s).descriptor.encounters[slot].selection.kind;
  return kind === 'boss' ? 'Guardian · Goblins' : `${kind[0].toUpperCase()}${kind.slice(1)} encounter ${slot + 1}`;
}

const WASD_PREFERENCE_KEY = 'tactics-guru:dungeon-wasd';

type LootContent = { readonly cell: number; readonly itemId: ItemId; readonly remaining: 0 | 1 };

/** Presentation groups contents without changing encounter reward identities or pickup order. */
export function dungeonLootPiles(floor: DungeonFloor & { readonly loot?: readonly LootContent[] }): Map<number, readonly LootContent[]> {
  const piles = new Map<number, LootContent[]>();
  for (const loot of floor.loot ?? []) {
    if (!loot.remaining) continue;
    const contents = piles.get(loot.cell) ?? [];
    contents.push(loot);
    piles.set(loot.cell, contents);
  }
  return piles;
}

export function dungeonLootContents(contents: readonly LootContent[]): string {
  const quantities = new Map<ItemId, number>();
  for (const loot of contents) if (loot.remaining) quantities.set(loot.itemId, (quantities.get(loot.itemId) ?? 0) + loot.remaining);
  return [...quantities].sort(([a], [b]) => a.localeCompare(b))
    .map(([itemId, quantity]) => `${dungeonContent.items[itemId].label} ×${quantity}`).join(', ');
}

/** View-local art state and bindings; no simulation timer or authoritative DOM state. */
export class DungeonMap {
  readonly root = document.createElement('section');
  readonly controlsRoot = document.createElement('div');
  private art: ArtStyle = 'simple';
  private live = true;
  private state: DungeonState | null = null;
  private map: GeneratedMap | null = null;
  private readonly heading = document.createElement('h2');
  private readonly select = document.createElement('select');
  private readonly wasd: HTMLInputElement;
  private readonly grid = document.createElement('div');
  private readonly viewport = document.createElement('div');
  private readonly directions = document.createElement('div');
  private readonly markerDescription = document.createElement('p');
  private readonly lootGuide = document.createElement('p');
  private readonly lootHere = document.createElement('p');
  private readonly lootStatus = document.createElement('p');
  private readonly feedback = document.createElement('p');
  private readonly controls: { button: HTMLButtonElement; dx: number; dy: number }[] = [];
  private readonly cells: HTMLSpanElement[] = [];
  private readonly terrainCells = new Set<HTMLElement>();
  private readonly fallbackCells = new Set<HTMLElement>();
  private visual: { map: GeneratedMap; biome: string; revealed: Set<number>; sight: Set<number>; markers: number[] } | null = null;
  private readonly abort = new AbortController();
  private readonly resize = new ResizeObserver(() => this.scheduleLayout(false, true));
  private layoutFrame = 0;
  private layoutDirty = true;
  private revealPlayer = false;
  private layoutSize = { width: 0, height: 0 };
  private layoutParent: HTMLElement | null = null;
  private layoutScreen: HTMLElement | null = null;
  private layoutHeader: HTMLElement | null = null;
  private viewportScroll = { left: 0, top: 0 };
  private layoutGeometry: {
    width: number; height: number; left: number; top: number;
    cellWidth: number; cellHeight: number; columnStride: number; rowStride: number;
    maxLeft: number; maxTop: number;
  } | null = null;
  private readonly treatment = createMapArt(() => { if (this.live) this.paintArt(); });
  constructor(private readonly move: (destination: number) => void, private readonly locked: () => boolean) {
    const el = <K extends keyof HTMLElementTagNameMap>(tag:K,text='') => { const n=document.createElement(tag);n.textContent=text;return n; };
    const signal = this.abort.signal;
    this.root.setAttribute('aria-label','Floor exploration');
    const label = el('label','Map art ');
    this.select.id='dungeon-art';this.select.setAttribute('aria-label','Map art');
    for (const style of ART_STYLES) { const option=el('option',style.label);option.value=style.id;this.select.append(option); }
    this.select.value=this.art;
    this.select.addEventListener('change',()=>{this.art=this.select.value as ArtStyle;this.paintArt();},{signal});
    label.append(this.select);
    const keyboardPreference = el('label');
    const wasd = el('input');
    wasd.type = 'checkbox';
    wasd.checked = true;
    try { wasd.checked = localStorage.getItem(WASD_PREFERENCE_KEY) !== 'off'; }
    catch { /* Storage can be unavailable in a sandbox. */ }
    wasd.addEventListener('change', () => {
      try { localStorage.setItem(WASD_PREFERENCE_KEY, wasd.checked ? 'on' : 'off'); }
      catch { /* The checkbox still applies for this visit. */ }
      this.updateKeyboardLabel();
    }, {signal});
    this.wasd = wasd;
    keyboardPreference.append(wasd, ' Enable WASD movement');
    this.grid.id='dungeon-map';this.grid.tabIndex=0;this.grid.setAttribute('role','application');
    this.viewport.className = 'dungeon-map-viewport';
    this.viewport.append(this.grid);
    this.grid.addEventListener('focus', () => this.scheduleLayout(true), {signal});
    this.markerDescription.id = 'dungeon-map-markers';
    this.markerDescription.hidden = true;
    this.grid.setAttribute('aria-describedby', this.markerDescription.id);
    this.lootGuide.className = 'dungeon-loot-guide';
    this.lootGuide.textContent = '◆ Loot · Step onto it to collect what fits.';
    this.lootGuide.hidden = true;
    this.lootHere.className = 'dungeon-loot-here';
    this.lootHere.hidden = true;
    this.lootStatus.className = 'dungeon-loot-status';
    this.lootStatus.setAttribute('role', 'status');
    this.lootStatus.setAttribute('aria-atomic', 'true');
    this.grid.addEventListener('click',e=>{
      if(!this.live||!this.state||!this.map||this.locked()||document.hidden||!(e.target instanceof Element))return;
      const cell=e.target.closest<HTMLElement>('[data-cell]');if(!cell)return;
      const destination=Number(cell.dataset.cell),floor=currentFloor(this.state);
      if(neighbors(floor.position,this.map.width,this.map.height).includes(destination))this.move(destination);
      else this.feedback.textContent='Choose an adjacent cell or use the direction controls.';
    },{signal});
    this.feedback.id='dungeon-map-feedback';this.feedback.setAttribute('role','status');
    const directions=this.directions;directions.className='dungeon-directions';directions.setAttribute('role','group');directions.setAttribute('aria-label','Move player');
    const lootOverlay = el('div');
    lootOverlay.className = 'dungeon-loot-messages';
    lootOverlay.append(this.lootStatus, this.lootHere, this.lootGuide);
    directions.append(this.viewport, lootOverlay);
    for(const [name,dx,dy,arrow] of [['North',0,-1,'↑'],['East',1,0,'→'],['South',0,1,'↓'],['West',-1,0,'←']] as const){
      const button=el('button');button.id=`dungeon-step-${name.toLowerCase()}`;button.type='button';button.setAttribute('aria-label',name);
      const icon=el('span',arrow);icon.className='dungeon-direction-arrow';icon.setAttribute('aria-hidden','true');
      const label=el('span',name[0]);label.setAttribute('aria-hidden','true');
      button.append(icon,label);
      button.addEventListener('click',()=>this.step(dx+dy*(this.map?.width??20)),{signal});
      this.controls.push({button,dx,dy});directions.append(button);
    }
    this.root.append(this.heading,directions,this.markerDescription);
    this.controlsRoot.className = 'dungeon-map-controls';
    this.controlsRoot.append(this.feedback,label,keyboardPreference);
    this.resize.observe(this.viewport);
    this.resize.observe(this.grid);
    this.resize.observe(this.heading);
    this.viewport.addEventListener('scroll', () => {
      this.viewportScroll = { left: this.viewport.scrollLeft, top: this.viewport.scrollTop };
    }, {signal, passive: true});
    window.addEventListener('resize', () => this.scheduleLayout(false, true), {signal});
    window.visualViewport?.addEventListener('resize', () => this.scheduleLayout(false, true), {signal});
    document.addEventListener('keydown',e => {
      if (this.state?.phase !== 'ready' || !this.root.isConnected || this.root.closest('[hidden]') ||
        this.locked() || document.hidden || e.defaultPrevented || e.isComposing ||
        e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.target instanceof HTMLElement && (e.target.isContentEditable ||
        e.target.closest('input, textarea, select, dialog[open], [role="menu"], [role="listbox"], [role="combobox"]'))) return;
      if (e.key.length === 1 && !wasd.checked) return;
      const width = this.map?.width ?? 20;
      const offsets = new Map([['ArrowUp', -width], ['w', -width], ['ArrowRight', 1], ['d', 1],
        ['ArrowDown', width], ['s', width], ['ArrowLeft', -1], ['a', -1]]);
      const delta = offsets.get(e.key);
      if (delta === undefined) return;
      e.preventDefault();
      if (!e.repeat) this.step(delta);
    },{signal});
  }
  dispose() { this.live = false; this.abort.abort(); this.resize.disconnect(); cancelAnimationFrame(this.layoutFrame); }
  render(state: DungeonState, map: GeneratedMap, lootStatus: string) {
    const moved = !this.state || this.map !== map || currentFloor(this.state).position !== currentFloor(state).position;
    const refit = !this.state || this.map !== map || this.state.phase !== state.phase || this.layoutParent !== this.root.parentElement;
    this.layoutParent = this.root.parentElement;
    if (this.lootStatus.textContent !== lootStatus) this.lootStatus.textContent = lootStatus;
    this.state = state; this.map = map; this.draw(); this.scheduleLayout(moved, refit);
  }
  /** Fit controls to the visible screen; scroll only the map window when following movement. */
  private scheduleLayout(reveal: boolean, refit = false) {
    this.revealPlayer ||= reveal;
    this.layoutDirty ||= refit;
    if (!this.live || this.layoutFrame) return;
    this.layoutFrame = requestAnimationFrame(() => {
      this.layoutFrame = 0;
      if (!this.live) return;
      if (!this.root.isConnected || this.root.closest('[hidden]')) {
        this.layoutSize = { width: 0, height: 0 };
        this.layoutGeometry = null;
        this.layoutDirty = true;
        return;
      }
      if (this.layoutDirty || !this.layoutGeometry) {
        this.layoutDirty = false;
        this.fitViewport();
      }
      if (!this.revealPlayer || !this.state || !this.map || !this.layoutGeometry) return;
      this.revealPlayer = false;
      const position = currentFloor(this.state).position, geometry = this.layoutGeometry;
      const left = geometry.left + position % this.map.width * geometry.columnStride;
      const top = geometry.top + Math.floor(position / this.map.width) * geometry.rowStride;
      const margin = Math.max(geometry.cellWidth, geometry.cellHeight);
      let { left: scrollLeft, top: scrollTop } = this.viewportScroll;
      // Ordinary visible steps use cached geometry instead of flushing the freshly updated HUD layout.
      if (left - margin < scrollLeft) scrollLeft = left - margin;
      else if (left + geometry.cellWidth + margin > scrollLeft + geometry.width) scrollLeft = left + geometry.cellWidth + margin - geometry.width;
      if (top - margin < scrollTop) scrollTop = top - margin;
      else if (top + geometry.cellHeight + margin > scrollTop + geometry.height) scrollTop = top + geometry.cellHeight + margin - geometry.height;
      scrollLeft = Math.max(0, Math.min(geometry.maxLeft, scrollLeft));
      scrollTop = Math.max(0, Math.min(geometry.maxTop, scrollTop));
      if (scrollLeft !== this.viewportScroll.left || scrollTop !== this.viewportScroll.top) {
        this.viewportScroll = { left: scrollLeft, top: scrollTop };
        this.viewport.scrollTo({ left: scrollLeft, top: scrollTop, behavior: 'instant' });
      }
    });
  }
  /** Geometry changes are observed separately from movement; duplicate notifications preserve manual panning. */
  private fitViewport() {
    if (!this.map) return;
    const screen = this.root.closest<HTMLElement>('#dungeon-screen');
    if (!screen) return;
    if (screen !== this.layoutScreen) {
      if (this.layoutScreen) this.resize.unobserve(this.layoutScreen);
      this.layoutScreen = screen; this.resize.observe(screen);
    }
    const header = screen.querySelector<HTMLElement>(':scope > .dungeon-header');
    if (header !== this.layoutHeader) {
      if (this.layoutHeader) this.resize.unobserve(this.layoutHeader);
      this.layoutHeader = header;
      if (header) this.resize.observe(header);
    }
    const frame = this.directions.getBoundingClientRect(), screenBounds = screen.getBoundingClientRect();
    const visible = window.visualViewport;
    const bottom = Math.min(screenBounds.bottom, visible ? visible.offsetTop + visible.height : innerHeight);
    const padding = parseFloat(getComputedStyle(screen).paddingBottom);
    const gap = parseFloat(getComputedStyle(this.directions).rowGap);
    const rails = this.controls[0].button.offsetHeight + this.controls[2].button.offsetHeight + 2 * gap;
    // Including outer scroll keeps the size stable while inspecting secondary panels.
    const available = Math.max(64, Math.floor(bottom - frame.top - screen.scrollTop - padding - rails));
    const height = `${available}px`;
    if (this.viewport.style.getPropertyValue('--dungeon-map-max-height') !== height) {
      this.viewport.style.setProperty('--dungeon-map-max-height', height);
    }
    const size = { width: this.viewport.clientWidth, height: this.viewport.clientHeight };
    // Resize notifications can arrive after a player has started inspecting the map.
    // Follow once for an actual size change, not again for a delayed duplicate event.
    this.revealPlayer ||= size.width !== this.layoutSize.width || size.height !== this.layoutSize.height;
    this.layoutSize = size;
    const grid = this.grid.getBoundingClientRect(), view = this.viewport.getBoundingClientRect();
    const style = getComputedStyle(this.grid);
    const borderLeft = parseFloat(style.borderLeftWidth), borderTop = parseFloat(style.borderTopWidth);
    const columnGap = parseFloat(style.columnGap), rowGap = parseFloat(style.rowGap);
    const columnStride = (grid.width - borderLeft - parseFloat(style.borderRightWidth) + columnGap) / this.map.width;
    const rowStride = (grid.height - borderTop - parseFloat(style.borderBottomWidth) + rowGap) / this.map.height;
    this.viewportScroll = { left: this.viewport.scrollLeft, top: this.viewport.scrollTop };
    this.layoutGeometry = {
      ...size,
      left: grid.left - view.left - this.viewport.clientLeft + this.viewportScroll.left + borderLeft,
      top: grid.top - view.top - this.viewport.clientTop + this.viewportScroll.top + borderTop,
      cellWidth: columnStride - columnGap, cellHeight: rowStride - rowGap, columnStride, rowStride,
      maxLeft: this.viewport.scrollWidth - size.width, maxTop: this.viewport.scrollHeight - size.height,
    };
  }
  private step(delta: number) {
    if (!this.live || !this.state || this.locked() || document.hidden) return;
    const f = currentFloor(this.state), destination = f.position + delta;
    // Send an invalid sentinel at row wrap so authoritative rejection supplies feedback.
    this.move(neighbors(f.position, this.map?.width ?? 20, this.map?.height ?? 20).includes(destination) ? destination : -1);
  }
  private updateKeyboardLabel() {
    if (!this.state || !this.map) return;
    const position = currentFloor(this.state).position, width = this.map.width;
    const keys = this.wasd.checked ? 'Arrow or WASD keys' : 'Arrow keys';
    const label = `Floor ${this.state.depth} map. Player row ${Math.floor(position / width) + 1}, column ${position % width + 1}. ${keys} move one cell.`;
    if (this.grid.getAttribute('aria-label') !== label) this.grid.setAttribute('aria-label', label);
  }
  private draw() {
    if (!this.live || !this.state || !this.map) return;
    const active = document.activeElement;
    const focused = active instanceof HTMLElement && (this.root.contains(active) || this.controlsRoot.contains(active)) ? active : null;
    const s = this.state, f = currentFloor(s), map = this.map, grid=this.grid;
    const biome = BIOMES.find(b => b.version === f.descriptor.biome)!;
    const heading=`Explore ${biome.label} · Floor ${s.depth}`;
    if(this.heading.textContent!==heading)this.heading.textContent=heading;
    this.updateKeyboardLabel();
    for (const [property, value] of [['--dungeon-map-columns', String(map.width)], ['--dungeon-map-rows', String(map.height)]]) {
      if (grid.style.getPropertyValue(property) !== value) grid.style.setProperty(property, value);
    }
    if(grid.dataset.position!==String(f.position))grid.dataset.position=String(f.position);
    if(grid.dataset.biome!==biome.id)grid.dataset.biome=biome.id;
    const revealed = new Set(f.exploration.revealed);
    const sight = new Set(currentSight(f.position, map));
    const piles = dungeonLootPiles(f);
    const shownLoot = new Map([...piles].filter(([cell]) => revealed.has(cell)));
    const showUpstairs = s.depth > 1 && revealed.has(f.descriptor.upstairs);
    const showDownstairs = dungeonStairStatus(s, 'descend') === 'available' && revealed.has(f.descriptor.downstairs);
    const cleared=clearedDungeonSlots(f);
    const activeSlot = f.exploration.version === 'exploration-v2' ? f.exploration.active
      : s.phase === 'reward' ? f.completed - 1 : s.phase === 'battle' ? f.completed : null;
    const markerDescriptions: string[] = [];
    const location = (cell: number) => `row ${Math.floor(cell / map.width) + 1}, column ${cell % map.width + 1}`;
    if (showUpstairs) markerDescriptions.push(`Upstairs at ${location(f.descriptor.upstairs)}.`);
    const shownPois = f.exploration.pois.filter(poi => {
      const cell = poiCell(poi, map.width);
      return cleared.includes(poi.encounterSlot) ? revealed.has(cell) : sight.has(cell);
    });
    for (const poi of shownPois) {
      const cell = poiCell(poi, map.width);
      const slot = poi.encounterSlot;
      const status = slot === activeSlot && s.phase === 'reward' ? 'Reward pending'
        : cleared.includes(slot) ? 'Cleared'
        : s.phase === 'defeat' ? 'Unavailable after defeat'
        : slot === activeSlot && s.phase === 'battle' ? 'In battle' : 'Available';
      markerDescriptions.push(`${dungeonEncounterLabel(s, slot)} at ${location(cell)}. ${status}.`);
    }
    for (const [cell, contents] of shownLoot) {
      markerDescriptions.push(`Loot at ${location(cell)}: ${dungeonLootContents(contents)}.${cell === f.position ? ' Beneath the party.' : ''}`);
    }
    if (showDownstairs) markerDescriptions.push(`Downstairs at ${location(f.descriptor.downstairs)}.`);
    const description = markerDescriptions.join(' ') || 'No visible encounters, loot or discovered stairs.';
    if (this.markerDescription.textContent !== description) this.markerDescription.textContent = description;
    const beneathParty = piles.get(f.position);
    this.lootGuide.hidden = shownLoot.size === 0 || !!beneathParty || !!this.lootStatus.textContent;
    this.lootHere.hidden = !beneathParty;
    const contentsHere = beneathParty ? `Loot here: ${dungeonLootContents(beneathParty)}. Items stay on the ground until they fit in your inventory.` : '';
    if (this.lootHere.textContent !== contentsHere) this.lootHere.textContent = contentsHere;
    const pois=new Map([...shownPois].sort((a,b)=>Number(cleared.includes(b.encounterSlot))-Number(cleared.includes(a.encounterSlot))).map(p=>[poiCell(p,map.width),p]));
    const total=map.width*map.height;
    let rebuild=this.cells.length!==total||grid.children.length!==total;
    if (rebuild) {
      const fragment=document.createDocumentFragment();this.cells.length=0;this.terrainCells.clear();this.fallbackCells.clear();
      for(let i=0;i<total;i++) {const cell=document.createElement('span');cell.dataset.cell=String(i);cell.setAttribute('aria-hidden','true');this.cells.push(cell);fragment.append(cell);}
      grid.replaceChildren(fragment);
    }
    const prior=this.visual;
    rebuild ||= !prior || prior.map!==map || prior.biome!==biome.id;
    const markers=[f.position,f.descriptor.upstairs,f.descriptor.downstairs,...pois.keys(),...shownLoot.keys()];
    const dirty=new Set<number>(),artDirty=new Set<HTMLElement>();
    if(rebuild) {for(let i=0;i<total;i++)dirty.add(i);}
    else if(prior) {
      for(const index of markers)dirty.add(index);
      for(const index of prior.markers)dirty.add(index);
      for(const index of revealed)if(!prior.revealed.has(index))dirty.add(index);
      for(const index of prior.revealed)if(!revealed.has(index))dirty.add(index);
      for(const index of sight)if(!prior.sight.has(index))dirty.add(index);
      for(const index of prior.sight)if(!sight.has(index))dirty.add(index);
    }
    for(const i of dirty) {
      const cell=this.cells[i];
      const known = revealed.has(i), open = map.cells[i] === 1;
      const terrainClass = open ? 'explore-open' : 'explore-wall';
      const className = known ? terrainClass + (sight.has(i) ? '' : ' explore-remembered') : 'explore-hidden';
      if(cell.className!==className)cell.className=className;
      let text='', poi: string | undefined;
      const loot = shownLoot.get(i);
      if(known){
        const terrain=`${biome.id}-${open?'open':'blocked'}`;
        if(cell.dataset.terrain!==terrain){cell.dataset.terrain=terrain;artDirty.add(cell);}
        this.terrainCells.add(cell);
        if(showUpstairs&&i===f.descriptor.upstairs)text='↑';
        if(showDownstairs&&i===f.descriptor.downstairs)text='↓';
        const p=pois.get(i);if(p){if(!cleared.includes(p.encounterSlot))text='M';else if(!(showUpstairs&&i===f.descriptor.upstairs)&&!(showDownstairs&&i===f.descriptor.downstairs))text='✓';poi=p.id;}
        if (loot && (!text || text === '✓')) text = '◆';
      } else if(cell.dataset.terrain!==undefined) {
        delete cell.dataset.terrain;cell.style.backgroundImage='';this.terrainCells.delete(cell);this.fallbackCells.delete(cell);
      }
      if(i===f.position)text='●';
      if(cell.textContent!==text)cell.textContent=text;
      if (loot) {
        const count = String(loot.length);
        if (cell.dataset.loot !== count) cell.dataset.loot = count;
        if (text !== '◆') cell.dataset.lootOverlay = 'true';
        else delete cell.dataset.lootOverlay;
      } else {
        delete cell.dataset.loot;
        delete cell.dataset.lootOverlay;
      }
      if(poi===undefined){if(cell.dataset.poi!==undefined)delete cell.dataset.poi;}else if(cell.dataset.poi!==poi)cell.dataset.poi=poi;
      if(i===f.position){if(cell.dataset.player!=='true')cell.dataset.player='true';}else if(cell.dataset.player!==undefined)delete cell.dataset.player;
    }
    this.visual={map,biome:biome.id,revealed,sight,markers};
    const adjacent=neighbors(f.position,map.width,map.height);
    for(const {button,dx,dy} of this.controls){
      const destination=f.position+dx+dy*map.width;
      const disabled=s.phase!=='ready'||!adjacent.includes(destination)||!map.cells[destination];
      if(button.disabled!==disabled)button.disabled=disabled;
    }
    // Movement only treats newly changed terrain. Style changes and image completion repaint remembered and visible terrain.
    this.paintArt(artDirty);
    if(focused&&document.activeElement!==focused&&focused.isConnected)focused.focus({preventScroll:true});
  }
  /** Image completion changes pixels only; never detach active input or scroll targets. */
  private paintArt(cells: Iterable<HTMLElement> = this.terrainCells) {
    if (!this.live || !this.state) return;
    for (const cell of cells) {
      const art = this.treatment(cell.dataset.terrain as Terrain, this.art);
      const background = art.url ? `url("${art.url}")` : '';
      if(cell.style.backgroundImage!==background)cell.style.backgroundImage=background;
      if(art.fallback)this.fallbackCells.add(cell);else this.fallbackCells.delete(cell);
    }
    if(this.grid.dataset.art!==this.art)this.grid.dataset.art=this.art;
    const f = currentFloor(this.state);
    const feedback=`Player cell ${f.position} · In sight ${this.visual?.sight.size ?? 0} · Discovered ${f.exploration.revealed.length}/${(this.map?.width??20)*(this.map?.height??20)} · Visited ${f.exploration.visited.length}. ${this.fallbackCells.size ? 'Artwork loading or unavailable; Simple fallback.' : ''}`;
    if(this.feedback.textContent!==feedback)this.feedback.textContent=feedback;
  }
}
