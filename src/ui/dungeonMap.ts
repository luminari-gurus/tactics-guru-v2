import type { DungeonState } from '../domain/dungeon';
import { currentFloor } from '../domain/dungeon';
import { neighbors, poiCell } from '../domain/exploration';
import type { GeneratedMap } from '../map/generate';
import { createMapArt, ART_STYLES, type ArtStyle } from '../map/art';
import { BIOMES, applyBiome, type Terrain } from '../map/biomes';

export function dungeonBiomeLabel(s: DungeonState): string {
  return BIOMES.find(b => b.version === currentFloor(s).descriptor.biome)!.label;
}
export function dungeonEncounterLabel(s: DungeonState, slot: number): string {
  const kind = currentFloor(s).descriptor.encounters[slot].selection.kind;
  return kind === 'boss' ? 'Guardian · Goblins' : `${kind[0].toUpperCase()}${kind.slice(1)} encounter ${slot + 1}`;
}

/** View-local art state and bindings; no simulation timer or authoritative DOM state. */
export class DungeonMap {
  readonly root = document.createElement('section');
  private art: ArtStyle = 'simple';
  private live = true;
  private state: DungeonState | null = null;
  private map: GeneratedMap | null = null;
  private readonly abort = new AbortController();
  private readonly treatment = createMapArt(() => { if (this.live) this.paintArt(); });
  constructor(private readonly move: (destination: number) => void, private readonly locked: () => boolean) {
    this.root.setAttribute('aria-label','Floor exploration');
    this.root.addEventListener('keydown',e => {
      if (!(e.target instanceof HTMLElement) || e.target.id !== 'dungeon-map') return;
      const offsets: Record<string,number> = { ArrowUp:-20,w:-20,ArrowRight:1,d:1,ArrowDown:20,s:20,ArrowLeft:-1,a:-1 };
      const delta = offsets[e.key]; if (delta === undefined) return;
      e.preventDefault(); if (!e.repeat) this.step(delta);
    },{signal:this.abort.signal});
  }
  dispose() { this.live = false; this.abort.abort(); }
  render(state: DungeonState, map: GeneratedMap) { this.state = state; this.map = map; this.draw(); }
  private step(delta: number) {
    if (!this.state || this.locked() || document.hidden) return;
    const f = currentFloor(this.state), destination = f.position + delta;
    // Send an invalid sentinel at row wrap so authoritative rejection supplies feedback.
    this.move(neighbors(f.position).includes(destination) ? destination : -1);
  }
  private draw() {
    if (!this.live || !this.state || !this.map) return;
    const focused = this.root.contains(document.activeElement) ? (document.activeElement as HTMLElement).id : '';
    const s = this.state, f = currentFloor(s), map = this.map;
    const biome = BIOMES.find(b => b.version === f.descriptor.biome)!, treated = applyBiome(map, biome.id);
    const el = <K extends keyof HTMLElementTagNameMap>(tag:K,text='') => { const n=document.createElement(tag);n.textContent=text;return n; };
    const heading = el('h2',`Explore ${biome.label} · Floor ${s.depth}`);
    const label = el('label','Map art '), select=el('select');select.id='dungeon-art';select.setAttribute('aria-label','Map art');
    for (const style of ART_STYLES) { const o=el('option',style.label);o.value=style.id;select.append(o); } select.value=this.art;
    select.onchange=()=>{this.art=select.value as ArtStyle;this.paintArt();};label.append(select);
    const grid=el('div');grid.id='dungeon-map';grid.tabIndex=0;grid.setAttribute('role','application');grid.setAttribute('aria-label',`Floor ${s.depth} map. Player row ${Math.floor(f.position/20)+1}, column ${f.position%20+1}. Arrow or WASD keys move one cell.`);
    grid.dataset.position=String(f.position);grid.dataset.art=this.art;grid.dataset.biome=biome.id;
    const pois=new Map(f.exploration.pois.map(p=>[poiCell(p),p]));
    for(let i=0;i<400;i++) {
      const cell=el('span');cell.dataset.cell=String(i);cell.setAttribute('aria-hidden','true');
      const visible=f.exploration.revealed.includes(i), open=map.cells[i]===1;
      cell.className=visible?open?'explore-open':'explore-wall':'explore-hidden';
      if(visible){cell.dataset.terrain=treated.terrain[i];
        if(i===f.descriptor.upstairs)cell.textContent='↑';
        if(i===f.descriptor.downstairs)cell.textContent='↓';
        const p=pois.get(i);if(p){cell.textContent=p.encounterSlot<f.completed?'✓':String(p.encounterSlot+1);cell.dataset.poi=p.id;}
      }
      if(i===f.position){cell.textContent='●';cell.dataset.player='true';}
      grid.append(cell);
    }
    grid.onclick=e=>{if(this.locked()||document.hidden)return;const cell=(e.target as HTMLElement).closest<HTMLElement>('[data-cell]');if(!cell)return;const destination=Number(cell.dataset.cell);if(neighbors(f.position).includes(destination)){this.move(destination);}else {feedback.textContent='Choose an adjacent cell or use the direction controls.';}};
    const feedback=el('p',`Player cell ${f.position} · Revealed ${f.exploration.revealed.length}/400 · Visited ${f.exploration.visited.length}. `);feedback.id='dungeon-map-feedback';feedback.setAttribute('role','status');
    const directions=el('div');directions.className='dungeon-directions';directions.setAttribute('role','group');directions.setAttribute('aria-label','Move player');
    for(const [name,delta] of [['North',-20],['East',1],['South',20],['West',-1]] as const){const b=el('button',name);b.id=`dungeon-step-${name.toLowerCase()}`;b.type='button';b.disabled=s.phase!=='ready';b.onclick=()=>this.step(delta);directions.append(b);}
    const list=el('ul');list.setAttribute('aria-label','Discovered places');
    const entries=[{id:'stairs-up',cell:f.descriptor.upstairs,label:'Upstairs',status:s.depth===1?'Exit unavailable':'Available'},...f.exploration.pois.map(p=>({id:p.id,cell:poiCell(p),label:`${dungeonEncounterLabel(s,p.encounterSlot)} · ${biome.label} · Floor ${s.depth}`,status:p.encounterSlot<f.completed?'Cleared':p.encounterSlot===f.completed?(s.phase==='ready'?'Available':s.phase==='reward'?'Reward pending':s.phase==='battle'?'In battle':'Unavailable after defeat'):'Locked'})),{id:'stairs-down',cell:f.descriptor.downstairs,label:'Downstairs',status:f.completed===3?'Unlocked':'Guardian locked'}];
    for(const p of entries)if(f.exploration.revealed.includes(p.cell)){const row=el('li',`${p.label} · row ${Math.floor(p.cell/20)+1}, column ${p.cell%20+1} · ${p.status}${f.exploration.visited.includes(p.cell)?' · Visited':''}`);row.dataset.poiId=p.id;list.append(row);}
    this.root.replaceChildren(heading,label,el('p','● Player · 1/2 encounters · 3 guardian · ✓ cleared · ↑/↓ stairs. Reveal reaches two cells, including through walls. Tap adjacent cells or use direction controls.'),grid,directions,feedback,list);
    this.paintArt();
    if(focused)this.root.querySelector<HTMLElement>(`#${focused}`)?.focus({preventScroll:true});
  }
  /** Image completion changes pixels only; never detach active input or scroll targets. */
  private paintArt() {
    if (!this.live || !this.state) return;
    let fallback = false;
    for (const cell of this.root.querySelectorAll<HTMLElement>('[data-terrain]')) {
      const art = this.treatment(cell.dataset.terrain as Terrain, this.art);
      cell.style.backgroundImage = art.url ? `url("${art.url}")` : '';
      fallback ||= Boolean(art.fallback);
    }
    const grid = this.root.querySelector<HTMLElement>('#dungeon-map'); if (grid) grid.dataset.art = this.art;
    const feedback = this.root.querySelector<HTMLElement>('#dungeon-map-feedback'), f = currentFloor(this.state);
    if (feedback) feedback.textContent = `Player cell ${f.position} · Revealed ${f.exploration.revealed.length}/400 · Visited ${f.exploration.visited.length}. ${fallback ? 'Artwork loading or unavailable; Simple fallback.' : ''}`;
  }
}
