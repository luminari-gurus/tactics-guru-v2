import type { CellPosition, ContentCatalog, MapRecord, SpawnRecord } from '../content/types';
import { HERO_IDS } from '../content/constants';
import { validateContent } from '../content/validate';
import { hasShape, isDenseArray } from './validation';
import { movementEdgeCost } from './movementEdge';
import { cellKey, routeDistances } from './routes';
import { lineCellsBetween, manhattanDistance } from './targeting';
export interface BattlefieldFailure { readonly code: 'structure' | 'movementComponent' | 'deployment' | 'engagement' | 'profile' | 'gateways'; readonly cell?: CellPosition; readonly unitId?: number; readonly detail: string }
export type BattlefieldAdmission = { readonly ok: true } | { readonly ok: false; readonly errors: readonly BattlefieldFailure[] };
export const DESERT_GATEWAYS = [{x:5,y:2},{x:5,y:9}] as const;
const adjacent = (a: CellPosition,b: CellPosition) => manhattanDistance(a,b) === 1;
/** Two units of integral flow through split vertices proves two internally disjoint routes. */
function twoRoutes(map: MapRecord, catalog: ContentCatalog, stats: {move:number;jump:number}): boolean {
  const cells = map.cells.filter(c => catalog.terrains[c.terrainId].walkable);
  const start = cellKey(DESERT_GATEWAYS[0]), end = cellKey(DESERT_GATEWAYS[1]);
  const capacity = new Map<string,Map<string,number>>();
  const add = (a:string,b:string,n:number) => { if(!capacity.has(a))capacity.set(a,new Map());if(!capacity.has(b))capacity.set(b,new Map());capacity.get(a)!.set(b,n);if(!capacity.get(b)!.has(a))capacity.get(b)!.set(a,0); };
  for(const c of cells) {
    const k=cellKey(c); add(k+'i',k+'o',k===start||k===end?2:1);
    for(const n of cells) if(adjacent(c,n) && movementEdgeCost(c,n,catalog.terrains[n.terrainId],stats)!==null) add(k+'o',cellKey(n)+'i',2);
  }
  for(let flow=0;flow<2;flow++) {
    const source=start+'i',sink=end+'o',parent=new Map<string,string>(),queue=[source];
    parent.set(source,source);
    for(let i=0;i<queue.length&&!parent.has(sink);i++)for(const [next,cap]of capacity.get(queue[i])??[])if(cap>0&&!parent.has(next)){parent.set(next,queue[i]);queue.push(next);}
    if(!parent.has(sink))return false;
    for(let v=sink;v!==source;) {const u=parent.get(v)!;capacity.get(u)!.set(v,capacity.get(u)!.get(v)!-1);capacity.get(v)!.set(u,capacity.get(v)!.get(u)!+1);v=u;}
  }
  return true;
}
/** Trusted catalog, unknown map. Full content checks run before any graph construction.
 * Other units are movable for structural engagement, but block immediate deployment exits. */
export function validateBattlefield(input: unknown, catalog: ContentCatalog, desert = false): BattlefieldAdmission {
  // The existing bounded content reader checks exact cells, elevations, references and spawns.
  if (!hasShape(input,['id','width','height','cells','spawns']) || !isDenseArray(input.cells,1024) || !isDenseArray(input.spawns,64)) return {ok:false,errors:[{code:'structure',detail:'Expected map'}]};
  const map = input as unknown as MapRecord;
  const checked=validateContent({...catalog,maps:{[map.id]:map}});
  if(!checked.ok)return {ok:false,errors:checked.errors.map(e=>({code:'structure',detail:e.path+': '+e.message}))};
  const errors: BattlefieldFailure[]=[];
  const fail=(code:BattlefieldFailure['code'],detail:string,cell?:CellPosition,unitId?:number)=>errors.push({code,detail,...(cell?{cell:{x:cell.x,y:cell.y}}:{}),...(unitId?{unitId}:{})});
  const units=map.spawns.map(s=>s.side==='heroes'?catalog.heroes[s.unitId]:catalog.enemies[s.unitId]);
  if(!units.length || HERO_IDS.some(id=>map.spawns.filter(s=>s.side==='heroes'&&s.unitId===id).length!==1) || !map.spawns.some(s=>s.side==='enemies'))return {ok:false,errors:[{code:'structure',detail:'Expected full supported hero roster and enemies'}]};
  const stats={move:Math.min(...units.map(u=>u.stats.move)),jump:Math.min(...units.map(u=>u.stats.jump))};
  const walkable=map.cells.filter(c=>catalog.terrains[c.terrainId].walkable),tiles=new Map(map.cells.map(c=>[cellKey(c),c]));
  if(!walkable.length)return {ok:false,errors:[{code:'structure',detail:'No walkable cells'}]};
  const forward=routeDistances(map,catalog,stats,walkable[0]),back=routeDistances(map,catalog,stats,walkable[0],new Set(),true);
  for(const c of walkable)if(!forward.has(cellKey(c))||!back.has(cellKey(c)))fail('movementComponent','Cell is not mutually reachable',c);
  const exits=(s:SpawnRecord, occupied:ReadonlySet<string>, capabilities=stats)=>walkable.filter(c=>adjacent(s,c)&&movementEdgeCost(tiles.get(cellKey(s))!,c,catalog.terrains[c.terrainId],capabilities,occupied.has(cellKey(c)))!==null);
  for(let mask=1;mask<8;mask++) {
    const spawns=map.spawns.filter(s=>s.side==='enemies'||(mask&(1<<HERO_IDS.indexOf(s.unitId)))!==0);
    const occupied=new Set(spawns.map(cellKey));
    for(const actor of spawns) {
      const actorStats=actor.side==='heroes'?catalog.heroes[actor.unitId].stats:catalog.enemies[actor.unitId].stats;
      if(!exits(actor,occupied,actorStats).length)fail('deployment',`No immediate exit in subset ${mask}`,actor,actor.id);
      const abilities=Object.values(catalog.abilities).filter(a=>a.owners.includes(actor.unitId));
      const opponents=spawns.filter(s=>s.side!==actor.side);
      const engaged=opponents.some(target=>{
        const reachable=routeDistances(map,catalog,actorStats,actor,new Set([cellKey(target)]));
        return walkable.some(c=>reachable.has(cellKey(c))&&abilities.some(a=>{
          const range=manhattanDistance(c,target);
          return range>=a.rangeMin&&range<=a.rangeMax&&!lineCellsBetween(c,target).some(p=>catalog.terrains[tiles.get(cellKey(p))!.terrainId].blocksLineOfSight);
        }));
      });
      if(!engaged)fail('engagement',`No damaging ability position in subset ${mask}`,actor,actor.id);
    }
  }
  if(desert) {
    if(map.width!==12||map.height!==12||map.cells.filter(c=>c.terrainId==='sand'&&c.elevation===0).length<116||map.cells.filter(c=>c.terrainId==='rock').length>14||map.cells.some(c=>!['sand','rock'].includes(c.terrainId)||c.elevation>1))fail('profile','Desert dimensions, density or elevation');
    if(map.cells.some(c=>(c.y<=2||c.y>=9||(c.x>=4&&c.x<=7))&&(c.terrainId!=='sand'||c.elevation!==0)))fail('profile','Deployment bands and protected approaches must stay flat open sand');
    const raised=new Set(walkable.filter(c=>c.elevation===1).map(cellKey));
    while(raised.size) {
      const queue=[tiles.get(raised.values().next().value!)!];raised.delete(cellKey(queue[0]));
      for(let i=0;i<queue.length;i++)for(const c of walkable)if(c.elevation===1&&adjacent(c,queue[i])&&raised.delete(cellKey(c)))queue.push(c);
      if(queue.length<4)fail('profile','Raised patch has fewer than four cells',queue[0]);
    }
    for(const s of map.spawns)if(tiles.get(cellKey(s))!.elevation!==0||exits(s,new Set()).length<2)fail('profile','Spawn needs flat terrain and two terrain exits',s,s.id);
    if(!twoRoutes(map,catalog,stats))fail('gateways','Two internally disjoint gateway routes required');
  }
  return errors.length?{ok:false,errors}:{ok:true};
}
