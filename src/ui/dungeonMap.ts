import type { DungeonState } from '../domain/dungeon';
import { currentFloor, clearedDungeonSlots } from '../domain/dungeon';
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

/** View-local art state and bindings; no simulation timer or authoritative DOM state. */
export class DungeonMap {
  readonly root = document.createElement('section');
  private art: ArtStyle = 'simple';
  private live = true;
  private state: DungeonState | null = null;
  private map: GeneratedMap | null = null;
  private readonly heading = document.createElement('h2');
  private readonly select = document.createElement('select');
  private readonly wasd: HTMLInputElement;
  private readonly grid = document.createElement('div');
  private readonly markerDescription = document.createElement('p');
  private readonly feedback = document.createElement('p');
  private readonly controls: { button: HTMLButtonElement; dx: number; dy: number }[] = [];
  private readonly cells: HTMLSpanElement[] = [];
  private readonly terrainCells = new Set<HTMLElement>();
  private readonly fallbackCells = new Set<HTMLElement>();
  private visual: { map: GeneratedMap; biome: string; revealed: Set<number>; sight: Set<number>; markers: number[] } | null = null;
  private readonly abort = new AbortController();
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
    this.markerDescription.id = 'dungeon-map-markers';
    this.markerDescription.hidden = true;
    this.grid.setAttribute('aria-describedby', this.markerDescription.id);
    this.grid.addEventListener('click',e=>{
      if(!this.live||!this.state||!this.map||this.locked()||document.hidden||!(e.target instanceof Element))return;
      const cell=e.target.closest<HTMLElement>('[data-cell]');if(!cell)return;
      const destination=Number(cell.dataset.cell),floor=currentFloor(this.state);
      if(neighbors(floor.position,this.map.width,this.map.height).includes(destination))this.move(destination);
      else this.feedback.textContent='Choose an adjacent cell or use the direction controls.';
    },{signal});
    this.feedback.id='dungeon-map-feedback';this.feedback.setAttribute('role','status');
    const directions=el('div');directions.className='dungeon-directions';directions.setAttribute('role','group');directions.setAttribute('aria-label','Move player');
    for(const [name,dx,dy] of [['North',0,-1],['East',1,0],['South',0,1],['West',-1,0]] as const){
      const button=el('button');button.id=`dungeon-step-${name.toLowerCase()}`;button.type='button';button.setAttribute('aria-label',name);
      button.append(el('span',name[0]));
      button.addEventListener('click',()=>this.step(dx+dy*(this.map?.width??20)),{signal});
      this.controls.push({button,dx,dy});directions.append(button);
    }
    const center=el('span');center.className='dungeon-compass-center';center.setAttribute('aria-hidden','true');directions.append(center);
    this.root.append(this.heading,this.grid,this.markerDescription,directions,this.feedback,label,keyboardPreference);
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
  dispose() { this.live = false; this.abort.abort(); }
  render(state: DungeonState, map: GeneratedMap) { this.state = state; this.map = map; this.draw(); }
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
    const focused = this.root.contains(document.activeElement) ? document.activeElement as HTMLElement : null;
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
    const showUpstairs = s.depth > 1 && revealed.has(f.descriptor.upstairs);
    const showDownstairs = f.completed === 3 && revealed.has(f.descriptor.downstairs);
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
    if (showDownstairs) markerDescriptions.push(`Downstairs at ${location(f.descriptor.downstairs)}.`);
    const description = markerDescriptions.join(' ') || 'No visible encounters or discovered stairs.';
    if (this.markerDescription.textContent !== description) this.markerDescription.textContent = description;
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
    const markers=[f.position,f.descriptor.upstairs,f.descriptor.downstairs,...pois.keys()];
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
      if(known){
        const terrain=`${biome.id}-${open?'open':'blocked'}`;
        if(cell.dataset.terrain!==terrain){cell.dataset.terrain=terrain;artDirty.add(cell);}
        this.terrainCells.add(cell);
        if(showUpstairs&&i===f.descriptor.upstairs)text='↑';
        if(showDownstairs&&i===f.descriptor.downstairs)text='↓';
        const p=pois.get(i);if(p){if(!cleared.includes(p.encounterSlot))text='M';else if(!(showUpstairs&&i===f.descriptor.upstairs)&&!(showDownstairs&&i===f.descriptor.downstairs))text='✓';poi=p.id;}
      } else if(cell.dataset.terrain!==undefined) {
        delete cell.dataset.terrain;cell.style.backgroundImage='';this.terrainCells.delete(cell);this.fallbackCells.delete(cell);
      }
      if(i===f.position)text='●';
      if(cell.textContent!==text)cell.textContent=text;
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
