import { awardHero, progressHero, readProgressHero } from './progression';
import { HERO_PROGRESSION } from '../content/progression';
import { freshExploration, readExploration, movableExploration, visit, poiCell, neighbors, type Exploration } from './exploration';
import { HERO_IDS } from '../content/constants';
import { dungeonContent, DUNGEON_TEMPLATE } from '../content/dungeon';
import { type ItemOwnership } from '../content/itemTypes';
import { generateMap, type GeneratedMap } from '../map/generate';
import { applyBiome } from '../map/biomes';
import { DEFAULT_BEHAVIORS, stepMovement } from '../map/movement';
import { canonical, hashJson } from './contentIdentity';
import { hasShape, isDenseArray } from './validation';
import { emptyItemOwnership, readItemOwnership, changePreparation, projectOwnedCatalog, grantOwnedItem, type ItemCommand } from './items';
import { rewardOffer, type RewardOffer } from './rewards';
import type { RunHero } from './run';
import { resolveBattlefield, sameBattlefield, layoutSeed, type BattlefieldDescriptor } from './battlefield';
import { createBattle } from './turns';
import { readBattleState } from './battle';
import type { BattleState } from './types';
import { DUNGEON_ENCOUNTER_POLICY, LEGACY_ENCOUNTER_POLICY, dungeonBiome, legacyDungeonEncounter, selectDungeonEncounter, readDungeonEncounterSelection,
  projectDungeonEnemies, type EncounterSelection, type DungeonEncounterPolicy } from './dungeonEncounters';
import { readBattlefieldDescriptor } from './battlefield';
import { encounterHpLimit } from './effects';
import { dungeonBattleCatalog } from '../content/dungeonEncounters';

export interface FloorDescriptor {
  readonly depth: number; readonly seed: number; readonly template: typeof DUNGEON_TEMPLATE;
  readonly generator: 'rooms-v1'; readonly biome: 'grassland-v1' | 'forest-v1' | 'desert-v1'; readonly mapHash: string;
  readonly upstairs: number; readonly downstairs: number;
  readonly encounters: readonly { readonly selection: EncounterSelection; readonly battlefield: BattlefieldDescriptor | null }[];
}
export interface DungeonFloor { readonly descriptor: FloorDescriptor; readonly position: number; readonly completed: number; readonly exploration: Exploration }
export interface DungeonState {
  readonly encounterPolicy: DungeonEncounterPolicy;
  readonly id: string; readonly seed: number; readonly revision: number; readonly depth: number;
  readonly floors: readonly DungeonFloor[]; readonly party: readonly RunHero[]; readonly ownership: ItemOwnership;
  readonly phase: 'ready' | 'battle' | 'reward' | 'defeat'; readonly offer: RewardOffer | null;
  readonly activeBattle: BattleState | null; readonly battlefield: BattlefieldDescriptor | null;
}
export type DungeonResult = { readonly ok: true; readonly state: DungeonState } | { readonly ok: false; readonly reason: string };
const fail = (reason: string): DungeonResult => ({ ok: false, reason });
export const safeCount = (v: unknown, min = 0): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= min;
const seedOk = (v: unknown): v is number => safeCount(v) && v <= 0xffffffff;
export const currentFloor = (s: DungeonState) => s.floors[s.depth - 1];
export const dungeonSlot = (s: DungeonState) => currentFloor(s).completed;
export const clearedDungeonSlots = (f: DungeonFloor): readonly number[] =>
  f.exploration.version === 'exploration-v2' ? f.exploration.cleared! : Array.from({length:f.completed},(_,i)=>i);
const activeDungeonSlot = (s: DungeonState): number => currentFloor(s).exploration.version === 'exploration-v2'
  ? currentFloor(s).exploration.active ?? currentFloor(s).completed : currentFloor(s).completed;
export function dungeonSeed(seed: number, depth: number, purpose: 'floor' | 'battle' | 'reward', slot = 0): number {
  if (!seedOk(seed) || !safeCount(depth, 1) || !safeCount(slot) || slot > 2) throw new RangeError('Invalid dungeon seed inputs');
  return Number.parseInt(hashJson({ seed, depth, purpose, slot, policy: 'dungeon-seeds-v1' }).slice(-8), 16);
}
// Saved movement validates the whole snapshot repeatedly. Cache only proven immutable
// encounter facts, never floor progress or geometry; the complete key changes on tampering.
const MAX_DUNGEON_FLOORS = 8192;
const admittedEncounters = new Map<string, true>();
function admissionKey(seed: number, selection: EncounterSelection, battlefield: BattlefieldDescriptor) {
  return hashJson({ seed, selection, battlefield });
}
function rememberAdmission(key: string) {
  admittedEncounters.delete(key); admittedEncounters.set(key, true);
  if (admittedEncounters.size > 128) admittedEncounters.delete(admittedEncounters.keys().next().value!);
}
/** Only resolved geometry is evicted. Durable descriptors/completion never enter this cache. */
export class FloorCache {
  private maps = new Map<number, GeneratedMap>();
  get size() { return this.maps.size; }
  resolve(seed: number): GeneratedMap {
    let map = this.maps.get(seed);
    if (!map) map = generateMap(seed, 'rooms');
    this.maps.delete(seed); this.maps.set(seed, map);
    if (this.maps.size > 3) this.maps.delete(this.maps.keys().next().value!);
    return map;
  }
}
/** Prior saves contain no per-slot geometry. Keep their fixed facts cheap until battle entry. */
function legacyEncounterPlans(depth: number): FloorDescriptor['encounters'] {
  return [0,1,2].map(slot=>({selection:legacyDungeonEncounter(depth,slot),battlefield:null}));
}
function floorGeometry(seed: number, depth: number, biome: FloorDescriptor['biome'], cache = new FloorCache()): Omit<FloorDescriptor, 'encounters'> {
  const floorSeed = dungeonSeed(seed, depth, 'floor'), map = cache.resolve(floorSeed);
  return { depth, seed: floorSeed, template: DUNGEON_TEMPLATE, generator: 'rooms-v1' as const, biome,
    mapHash: hashJson(map), upstairs: map.cells.indexOf(1), downstairs: map.cells.lastIndexOf(1) };
}
export function floorDescriptor(seed: number, depth: number, cache = new FloorCache(), policy: DungeonEncounterPolicy = DUNGEON_ENCOUNTER_POLICY): FloorDescriptor {
  const legacy = policy === LEGACY_ENCOUNTER_POLICY;
  const encounters = legacy ? legacyEncounterPlans(depth) : [0, 1, 2].map(slot => {
    const selection = selectDungeonEncounter(seed, depth, slot);
    const resolved = resolveBattlefield(selection.encounter, dungeonSeed(seed, depth, 'battle', slot), dungeonBattleCatalog);
    if (!resolved.ok) throw Error('Invalid dungeon encounter pairing');
    rememberAdmission(admissionKey(dungeonSeed(seed, depth, 'battle', slot), selection, resolved.descriptor));
    return { selection, battlefield: resolved.descriptor };
  });
  return { ...floorGeometry(seed, depth, legacy ? 'grassland-v1' : `${dungeonBiome(seed, depth)}-v1`, cache), encounters };
}
export function freshDungeon(id: string, seed: number, encounterPolicy: DungeonEncounterPolicy = DUNGEON_ENCOUNTER_POLICY): DungeonState {
  if (!/^[A-Za-z0-9-]{1,64}$/.test(id) || !seedOk(seed)) throw new RangeError('Invalid dungeon identity');
  if (encounterPolicy !== DUNGEON_ENCOUNTER_POLICY && encounterPolicy !== LEGACY_ENCOUNTER_POLICY) throw new RangeError('Invalid encounter policy');
  const descriptor = floorDescriptor(seed, 1, undefined, encounterPolicy);
  return { id, seed, encounterPolicy, revision: 0, depth: 1, floors: [{ descriptor, position: descriptor.upstairs, completed: 0, exploration: freshExploration(descriptor.seed, descriptor.upstairs) }],
    party: HERO_IDS.map(heroId => progressHero(heroId, 0, dungeonContent.catalog.heroes[heroId].stats.maxHp, dungeonContent.catalog)),
    ownership: emptyItemOwnership(), phase: 'ready', offer: null, activeBattle: null, battlefield: null };
}
export function dungeonBoundary(s: DungeonState) {
  const slot = dungeonSlot(s), encounterId = `${s.id}:floor:${s.depth}:encounter:${slot}`;
  return { runId: s.id, revision: s.revision, itemRevision: s.revision, encounterId, boundaryId: `${encounterId}:${s.phase}` };
}
export function dungeonOffer(s: DungeonState) {
  return rewardOffer(`${s.id}:floor:${s.depth}:reward:${dungeonSlot(s) - 1}`,
    dungeonSeed(s.seed, s.depth, 'reward', dungeonSlot(s) - 1), dungeonContent.items)!;
}
export function dungeonBattle(s: DungeonState) {
  const slot = activeDungeonSlot(s);
  if (slot >= 3) return null;
  const plan = currentFloor(s).descriptor.encounters[slot];
  const baseline = plan.selection.policy === LEGACY_ENCOUNTER_POLICY ? dungeonContent.catalog : projectDungeonEnemies(s.depth, plan.selection.kind);
  const resolved = resolveBattlefield(plan.selection.encounter, dungeonSeed(s.seed, s.depth, 'battle', slot), baseline);
  if (!resolved.ok || (plan.battlefield === null ? plan.selection.policy !== LEGACY_ENCOUNTER_POLICY : !sameBattlefield(plan.battlefield, resolved.descriptor))) return null;
  const projected = projectOwnedCatalog(s.ownership, s.party, baseline, dungeonContent.items);
  const living = new Set(s.party.filter(h => h.hp > 0).map(h => h.heroId));
  const map = { ...resolved.map, spawns: resolved.map.spawns.filter(p => p.side === 'enemies' || living.has(p.unitId)) };
  const catalog = { ...projected, maps: { ...projected.maps, [map.id]: map } };
  const created = createBattle(map.id, dungeonSeed(s.seed, s.depth, 'battle', slot), catalog);
  if (!created.ok) return null;
  const checked = readBattleState({ ...created.state, units: created.state.units.map(u => u.side === 'player'
    ? { ...u, hp: s.party.find(h => h.heroId === u.defId)!.hp } : u) }, catalog);
  return checked.ok ? { state: checked.state, catalog, battlefield: resolved.descriptor, selection: plan.selection } : null;
}
/** Validate unknown save data before it can reach generation or battle construction. */
export function readDungeon(input: unknown): DungeonResult {
  try { return readDungeonValue(input); } catch { return fail("invalidState"); }
}
function readDungeonValue(input: unknown): DungeonResult {
  if (!hasShape(input, ['id','seed','revision','depth','floors','party','ownership','phase','offer','activeBattle','battlefield', 'encounterPolicy']) ||
    typeof input.id !== 'string' || !/^[A-Za-z0-9-]{1,64}$/.test(input.id) || !seedOk(input.seed) || !safeCount(input.revision) || !safeCount(input.depth, 1) ||
    !isDenseArray(input.floors, MAX_DUNGEON_FLOORS) || !input.floors.length || input.depth > input.floors.length || !isDenseArray(input.party, 3) || input.party.length !== 3) return fail('invalidState');
  const policy = input.encounterPolicy;
  if (policy !== LEGACY_ENCOUNTER_POLICY && policy !== DUNGEON_ENCOUNTER_POLICY) return fail('invalidPolicy');
  const floors: DungeonFloor[] = [];
  for (let i = 0; i < input.floors.length; i++) {
    const f = input.floors[i];
    if (!hasShape(f, ['descriptor','position','completed','exploration']) || !hasShape(f.descriptor, ['depth','seed','template','generator','biome','mapHash','upstairs','downstairs', 'encounters']) ||
      !safeCount(f.completed) || f.completed > 3 || !safeCount(f.position) || f.position >= 400 ||
      f.descriptor.depth !== i + 1 || f.descriptor.seed !== dungeonSeed(input.seed, i + 1, 'floor') || f.descriptor.template !== DUNGEON_TEMPLATE ||
      f.descriptor.generator !== 'rooms-v1' || (policy === LEGACY_ENCOUNTER_POLICY ? f.descriptor.biome !== 'grassland-v1' : !['forest-v1', 'desert-v1'].includes(f.descriptor.biome as string)) || typeof f.descriptor.mapHash !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(f.descriptor.mapHash) ||
      !safeCount(f.descriptor.upstairs) || !safeCount(f.descriptor.downstairs) || f.descriptor.upstairs >= f.descriptor.downstairs || f.descriptor.downstairs >= 400 ||
      (i < input.floors.length - 1 && f.completed !== 3)) return fail('invalidFloor');
    let descriptor: FloorDescriptor;
    {
      if (!isDenseArray(f.descriptor.encounters, 3) || f.descriptor.encounters.length !== 3) return fail('invalidSelection');
      const encounters: FloorDescriptor['encounters'][number][] = [];
      for (const [slot, plan] of f.descriptor.encounters.entries()) {
        if (!hasShape(plan, ['selection', 'battlefield'])) return fail('invalidSelection');
        const selection = readDungeonEncounterSelection(plan.selection, i + 1, slot, f.descriptor.biome === 'forest-v1' ? 'forest' : f.descriptor.biome === 'desert-v1' ? 'desert' : 'grassland', policy);
        if (!selection) return fail('invalidSelection');
        if (plan.battlefield === null) {
          if (policy !== LEGACY_ENCOUNTER_POLICY) return fail('invalidSelection');
          encounters.push({selection,battlefield:null});
        } else {
          if (!readBattlefieldDescriptor(plan.battlefield)) return fail('invalidSelection');
          const seed = dungeonSeed(input.seed, i + 1, 'battle', slot), source=selection.encounter.source;
          if(plan.battlefield.encounterId!==selection.encounter.id || plan.battlefield.kind!==source.kind) return fail('invalidSelection');
          if(source.kind==='authored') {
            if(plan.battlefield.mapId!==source.mapId)return fail('invalidSelection');
          } else if(plan.battlefield.kind!=='generated' || plan.battlefield.layoutSeed!==layoutSeed(seed,selection.encounter.id) ||
            plan.battlefield.mapId!==`map:desert_${selection.encounter.id.slice(10)}`) return fail('invalidSelection');
          // Historical facts keep their saved hash. Resolve graph geometry when that floor
          // becomes current, including candidate travel before it can be saved/published.
          if(i+1===input.depth) {
            const key=admissionKey(seed,selection,plan.battlefield);
            if (!admittedEncounters.has(key)) {
              const resolved = resolveBattlefield(selection.encounter, seed, policy === LEGACY_ENCOUNTER_POLICY ? dungeonContent.catalog : dungeonBattleCatalog);
              if (!resolved.ok || !sameBattlefield(plan.battlefield, resolved.descriptor)) return fail('invalidSelection');
            }
            rememberAdmission(key);
          }
          encounters.push({ selection, battlefield: { ...plan.battlefield } });
        }
      }
      descriptor = { ...f.descriptor, encounters } as unknown as FloorDescriptor;
      if (policy === DUNGEON_ENCOUNTER_POLICY && i > 0 && descriptor.biome === floors[i - 1].descriptor.biome) return fail('invalidBiomeProgression');
    }
    const exploration = readExploration(f.exploration, descriptor.seed, f.position);
    if (!exploration || exploration.version === 'exploration-v2' && exploration.cleared!.length !== f.completed) return fail('invalidExploration');
    if (exploration.version === 'exploration-v2' && i + 1 !== input.depth && exploration.active !== null) return fail('invalidExploration');
    floors.push({ descriptor, position: f.position, completed: f.completed, exploration });
  }
  const party: RunHero[] = [];
  for (let i = 0; i < 3; i++) {
    const h = input.party[i], heroId = HERO_IDS[i];
    const checked = readProgressHero(h, heroId, dungeonContent.catalog);
    if (!checked) return fail('invalidParty');
    party.push(checked);
  }
  const owned = readItemOwnership(input.ownership, input.id, dungeonContent.items, id => {
    const m = new RegExp(`^${input.id}:floor:([1-9][0-9]*):reward:([01]):option:[01]$`).exec(id);
    if (!m || !safeCount(Number(m[1]), 1) || Number(m[1]) > floors.length) return false;
    const floor = floors[Number(m[1]) - 1];
    return floor.completed > Number(m[2]) && !(input.depth === Number(m[1]) && input.phase === 'reward' && floor.completed === Number(m[2]) + 1);
  });
  if (!owned.ok) return owned;
  if (!['ready','battle','reward','defeat'].includes(input.phase as string)) return fail('invalidPhase');
  const state = { ...input, encounterPolicy: policy, floors, party, ownership: owned.ownership } as unknown as DungeonState;
  const { encounters, ...geometry } = currentFloor(state).descriptor;
  if (canonical(geometry) !== canonical(floorGeometry(state.seed, state.depth, currentFloor(state).descriptor.biome))) return fail('invalidFloor');
  const slot = dungeonSlot(state), alive = party.some(h => h.hp > 0);
  if ((state.phase === 'defeat') === alive || state.phase === 'battle' && slot === 3 ||
    state.phase === 'reward' && (slot < 1 || slot > 2 || !hasShape(state.offer, ['version','id','seed','catalogIdentity','options']) ||
      !isDenseArray(state.offer.options, 2) || state.offer.options.length !== 2 || !state.offer.options.every(o => hasShape(o, ['itemId','quantity'])) || canonical(state.offer) !== canonical(dungeonOffer(state))) || state.phase !== 'reward' && state.offer !== null) return fail('invalidPhase');
  const exp = currentFloor(state).exploration;
  const active = exp.version === 'exploration-v2' ? exp.active : state.phase === 'battle' ? slot : state.phase === 'reward' ? slot - 1 : null;
  if (exp.version === 'exploration-v2' && ((state.phase === 'battle' || state.phase === 'reward') !== (active !== null))) return fail('invalidEncounterPosition');
  if ((state.phase === 'battle' || state.phase === 'reward') && (active === null || active === undefined ||
      currentFloor(state).position !== poiCell(exp.pois[active]) || exp.version === 'exploration-v2' &&
      (state.phase === 'battle' ? exp.cleared!.includes(active) : !exp.cleared!.includes(active)))) return fail('invalidEncounterPosition');
  if (state.phase === 'battle') {
    const battle = dungeonBattle(state);
    const read = battle && readBattleState(state.activeBattle, battle.catalog);
    if (!battle || !read?.ok || !sameBattlefield(state.battlefield, battle.battlefield) || read.state.seed !== battle.state.seed || read.state.mapId !== battle.state.mapId ||
      read.state.units.some(u => u.side === 'player' && u.hp > encounterHpLimit(u,party.find(h => h.heroId === u.defId)!.hp,battle.catalog))) return fail('invalidBattle');
    return { ok: true, state: { ...state, activeBattle: read.state, battlefield: battle.battlefield } };
  }
  if (state.activeBattle !== null || state.battlefield !== null) return fail('invalidBattle');
  return { ok: true, state: { ...state, offer: state.phase === 'reward' ? dungeonOffer(state) : null } };
}
function advance(s: DungeonState, patch: Partial<DungeonState>): DungeonResult {
  if (s.revision === Number.MAX_SAFE_INTEGER) return fail('resourceLimit');
  return readDungeon({ ...s, ...patch, revision: s.revision + 1 });
}
/** Pure candidate travel. The application must persist/read back before publishing it. */
export function travelDungeon(s: DungeonState, direction: 'ascend' | 'descend', revision: number): DungeonResult {
  if (direction !== 'ascend' && direction !== 'descend') return fail('invalidCommand');
  if (revision !== s.revision) return fail('staleBoundary');
  if (s.phase !== 'ready' || direction === 'descend' && dungeonSlot(s) !== 3 || direction === 'ascend' && s.depth === 1) return fail('lockedStairs');
  if (currentFloor(s).position !== (direction === 'descend' ? currentFloor(s).descriptor.downstairs : currentFloor(s).descriptor.upstairs)) return fail('remoteStairs');
  const depth = s.depth + (direction === 'descend' ? 1 : -1);
  if (!safeCount(depth, 1)) return fail('resourceLimit');
  let floors = [...s.floors];
  const current = currentFloor(s);
  floors[s.depth - 1] = { ...current, position: direction === 'descend' ? current.descriptor.downstairs : current.descriptor.upstairs };
  if (depth > floors.length) {
    const descriptor = floorDescriptor(s.seed, depth, undefined, s.encounterPolicy);
    floors = [...floors, { descriptor, position: descriptor.upstairs, completed: 0, exploration: freshExploration(descriptor.seed, descriptor.upstairs) }];
  }
  return advance(s, { depth, floors });
}
export function startDungeonBattle(s: DungeonState): DungeonResult {
  if (s.phase !== 'ready') return fail('wrongPhase');
  const f = currentFloor(s), cleared = clearedDungeonSlots(f);
  const poi = f.exploration.pois.find(p => !cleared.includes(p.encounterSlot) && f.position === poiCell(p));
  if (!poi) return fail('remoteEncounter');
  const exploration = movableExploration(f.exploration, f.descriptor.seed, f.completed, s.phase);
  const floors = [...s.floors];
  floors[s.depth-1] = {...f, exploration:{...exploration,active:poi.encounterSlot}};
  const staged = {...s,floors};
  const battle = dungeonBattle(staged);
  return battle ? advance(staged, { phase: 'battle', activeBattle: battle.state, battlefield: battle.battlefield }) : fail('invalidBattle');
}
/** Only the session owning this active battle may call this accepted-state boundary. */
export function acceptDungeonBattle(s: DungeonState, battle: BattleState): DungeonResult {
  if (s.phase !== 'battle') return fail('staleBoundary');
  const checked = readDungeon({ ...s, activeBattle: battle });
  if (!checked.ok) return checked;
  if (battle.outcome === 'ongoing') return advance(s, { activeBattle: battle });
  const party = s.party.map(h => ({ ...h, hp: battle.units.find(u => u.side === 'player' && u.defId === h.heroId)?.hp ?? 0 }));
  const floors = [...s.floors], f = currentFloor(s), selected = activeDungeonSlot(s);
  const exploration = movableExploration(f.exploration, f.descriptor.seed, f.completed, s.phase);
  if (battle.outcome === 'playerLoss') {
    floors[s.depth-1] = {...f,exploration:{...exploration,active:null}};
    return advance(s, { floors, party, phase: 'defeat', activeBattle: null, battlefield: null });
  }
  floors[s.depth - 1] = { ...f, completed: f.completed + 1,
    exploration:{...exploration,cleared:[...exploration.cleared!,selected].sort((a,b)=>a-b),active:f.completed === 2 ? null : selected} };
  const next = { ...s, floors };
  const awarded = party.map(h => awardHero(h, HERO_PROGRESSION.awards[f.descriptor.encounters[selected].selection.kind], dungeonContent.catalog));
  return advance(s, { floors, party: awarded, phase: f.completed === 2 ? 'ready' : 'reward', offer: f.completed === 2 ? null : dungeonOffer(next), activeBattle: null, battlefield: null });
}
export type DungeonItemCommand = ItemCommand | (ReturnType<typeof dungeonBoundary> & { readonly type: 'discardEquipment'; readonly instanceId: string });
export function dungeonItem(s: DungeonState, command: DungeonItemCommand): DungeonResult {
  const keys = ['type','runId','revision','itemRevision','encounterId','boundaryId'];
  if (!hasShape(command, [...keys,'instanceId']) && !hasShape(command, [...keys,'offerId','itemId']) && !hasShape(command, [...keys,'itemId','heroId']) && !hasShape(command, [...keys,'instanceId','heroId','slot'])) return fail('invalidCommand');
  const b = dungeonBoundary(s);
  if (Object.entries(b).some(([key, value]) => command[key as keyof typeof b] !== value)) return fail('staleBoundary');
  if (s.phase !== 'ready' && s.phase !== 'reward') return fail('wrongContext');
  if (command.type === 'discardEquipment') {
    if (!hasShape(command, [...keys,'instanceId'])) return fail('invalidCommand');
    if (!s.ownership.equipment.some(item => item.instanceId === command.instanceId)) return fail('notOwned');
    return advance(s, { ownership: { ...s.ownership,
      equipment: s.ownership.equipment.filter(item => item.instanceId !== command.instanceId),
      assignments: s.ownership.assignments.filter(assignment => assignment.instanceId !== command.instanceId),
    } });
  }
  if (command.type === 'claimReward') {
    if (!s.offer || command.offerId !== s.offer.id) return fail('invalidOffer');
    const ordinal = s.offer.options.findIndex(o => o.itemId === command.itemId);
    if (ordinal < 0) return fail('invalidItem');
    const granted = grantOwnedItem(s.ownership, dungeonContent.items[command.itemId], `${s.offer.id}:option:${ordinal}`);
    if (!granted) return fail('capacity');
    const floors = [...s.floors], f = currentFloor(s);
    if (f.exploration.version === 'exploration-v2') floors[s.depth-1] = {...f,exploration:{...f.exploration,active:null}};
    return advance(s, { floors, ownership: granted, phase: 'ready', offer: null });
  }
  const result = changePreparation(s.ownership, s.party, { ...command }, dungeonContent.catalog, dungeonContent.items);
  return result.ok ? advance(s, { ownership: result.ownership, party: result.party }) : result;
}

export interface ExplorationCommand { readonly id: string; readonly depth: number; readonly revision: number; readonly destination: number }
export function stepDungeon(s: DungeonState, command: ExplorationCommand): DungeonResult {
  if (!hasShape(command, ['id','depth','revision','destination'])) return fail('invalidCommand');
  if (command.id !== s.id || command.depth !== s.depth || command.revision !== s.revision) return fail('staleBoundary');
  if (s.phase !== 'ready') return fail('wrongPhase');
  const f = currentFloor(s), map = generateMap(f.descriptor.seed,'rooms');
  if (!neighbors(f.position).includes(command.destination) || !map.cells[command.destination]) return fail('blockedStep');
  const floors = [...s.floors];
  floors[s.depth-1] = { ...f, position: command.destination, exploration: visit(f.exploration, command.destination) };
  let candidate: DungeonState = { ...s, floors };
  if (f.exploration.pois.some(p => !clearedDungeonSlots(f).includes(p.encounterSlot) && command.destination === poiCell(p))) return startDungeonBattle(candidate);
  candidate = moveDungeonEnemies(candidate);
  // Only accepted movement enters stairs; arrival, rendering and restore never travel.
  if (command.destination === f.descriptor.upstairs && s.depth > 1) return travelDungeon(candidate, 'ascend', s.revision);
  if (command.destination === f.descriptor.downstairs && f.completed === 3) return travelDungeon(candidate, 'descend', s.revision);
  return advance(candidate, {});
}

/** Advance active enemies as part of an accepted player step. */
function moveDungeonEnemies(s: DungeonState): DungeonState {
  const f = currentFloor(s), cleared = clearedDungeonSlots(f);
  if (cleared.length === 3) return s;
  const exploration = movableExploration(f.exploration, f.descriptor.seed, f.completed, s.phase);
  const map = applyBiome(generateMap(f.descriptor.seed,'rooms'), f.descriptor.biome === 'forest-v1' ? 'forest' : f.descriptor.biome === 'desert-v1' ? 'desert' : 'grassland');
  const player = {id:'player' as const,kind:'player' as const,x:f.position % 20,y:Math.floor(f.position / 20)};
  const moved = stepMovement({world:{map,placementVersion:'markers-v1',markers:[player,...exploration.pois]},behaviors:DEFAULT_BEHAVIORS,
    rng:exploration.movement!.rng,step:exploration.movement!.step}, cleared.map(i=>`enemy-${i+1}` as 'enemy-1'|'enemy-2'|'enemy-3'),
    [...(s.depth > 1 ? [f.descriptor.upstairs] : []), ...(f.completed === 3 ? [f.descriptor.downstairs] : [])]);
  const pois = exploration.pois.map((p,i)=>({...p,x:moved.world.markers[i+1].x,y:moved.world.markers[i+1].y}));
  const floors = [...s.floors];
  floors[s.depth-1] = {...f,exploration:{...exploration,pois,movement:{rng:moved.rng,step:moved.step}}};
  return {...s,floors};
}
