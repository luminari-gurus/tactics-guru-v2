import { freshExploration, readExploration, visit, poiCell, neighbors, type Exploration } from './exploration';
import { HERO_IDS } from '../content/constants';
import { dungeonContent, DUNGEON_TEMPLATE } from '../content/dungeon';
import { type ItemOwnership } from '../content/itemTypes';
import { generateMap, type GeneratedMap } from '../map/generate';
import { canonical, hashJson } from './contentIdentity';
import { hasShape, isDenseArray } from './validation';
import { emptyItemOwnership, readItemOwnership, changePreparation, projectOwnedCatalog, grantOwnedItem, type ItemCommand } from './items';
import { rewardOffer, type RewardOffer } from './rewards';
import type { RunHero } from './run';
import { resolveBattlefield, sameBattlefield, type BattlefieldDescriptor } from './battlefield';
import { createBattle } from './turns';
import { readBattleState } from './battle';
import type { BattleState } from './types';

export interface FloorDescriptor {
  readonly depth: number; readonly seed: number; readonly template: typeof DUNGEON_TEMPLATE;
  readonly generator: 'rooms-v1'; readonly biome: 'grassland-v1'; readonly mapHash: string;
  readonly upstairs: number; readonly downstairs: number;
}
export interface DungeonFloor { readonly descriptor: FloorDescriptor; readonly position: number; readonly completed: number; readonly exploration: Exploration }
export interface DungeonState {
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
export function dungeonSeed(seed: number, depth: number, purpose: 'floor' | 'battle' | 'reward', slot = 0): number {
  if (!seedOk(seed) || !safeCount(depth, 1) || !safeCount(slot) || slot > 2) throw new RangeError('Invalid dungeon seed inputs');
  return Number.parseInt(hashJson({ seed, depth, purpose, slot, policy: 'dungeon-seeds-v1' }).slice(-8), 16);
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
export function floorDescriptor(seed: number, depth: number, cache = new FloorCache()): FloorDescriptor {
  const floorSeed = dungeonSeed(seed, depth, 'floor'), map = cache.resolve(floorSeed);
  return { depth, seed: floorSeed, template: DUNGEON_TEMPLATE, generator: 'rooms-v1', biome: 'grassland-v1',
    mapHash: hashJson(map), upstairs: map.cells.indexOf(1), downstairs: map.cells.lastIndexOf(1) };
}
export function freshDungeon(id: string, seed: number): DungeonState {
  if (!/^[A-Za-z0-9-]{1,64}$/.test(id) || !seedOk(seed)) throw new RangeError('Invalid dungeon identity');
  const descriptor = floorDescriptor(seed, 1);
  return { id, seed, revision: 0, depth: 1, floors: [{ descriptor, position: descriptor.upstairs, completed: 0, exploration: freshExploration(descriptor.seed, descriptor.upstairs) }],
    party: HERO_IDS.map(heroId => ({ heroId, hp: dungeonContent.catalog.heroes[heroId].stats.maxHp })),
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
  if (dungeonSlot(s) >= 3) return null;
  const resolved = resolveBattlefield(dungeonContent.encounters[dungeonSlot(s)], dungeonSeed(s.seed, s.depth, 'battle', dungeonSlot(s)), dungeonContent.catalog);
  if (!resolved.ok) return null;
  const projected = projectOwnedCatalog(s.ownership, s.party, dungeonContent.catalog, dungeonContent.items);
  const living = new Set(s.party.filter(h => h.hp > 0).map(h => h.heroId));
  const map = { ...resolved.map, spawns: resolved.map.spawns.filter(p => p.side === 'enemies' || living.has(p.unitId)) };
  const catalog = { ...projected, maps: { ...projected.maps, [map.id]: map } };
  const created = createBattle(map.id, dungeonSeed(s.seed, s.depth, 'battle', dungeonSlot(s)), catalog);
  if (!created.ok) return null;
  const checked = readBattleState({ ...created.state, units: created.state.units.map(u => u.side === 'player'
    ? { ...u, hp: s.party.find(h => h.heroId === u.defId)!.hp } : u) }, catalog);
  return checked.ok ? { state: checked.state, catalog, battlefield: resolved.descriptor } : null;
}
/** Validate unknown save data before it can reach generation or battle construction. */
export function readDungeon(input: unknown): DungeonResult {
  try { return readDungeonValue(input); } catch { return fail("invalidState"); }
}
export function readLegacyDungeon(input: unknown): DungeonResult {
  try { return readDungeonValue(input, true); } catch { return fail("invalidState"); }
}
function readDungeonValue(input: unknown, legacy = false): DungeonResult {
  if (!hasShape(input, ['id','seed','revision','depth','floors','party','ownership','phase','offer','activeBattle','battlefield']) ||
    typeof input.id !== 'string' || !/^[A-Za-z0-9-]{1,64}$/.test(input.id) || !seedOk(input.seed) || !safeCount(input.revision) || !safeCount(input.depth, 1) ||
    !isDenseArray(input.floors, 8192) || !input.floors.length || input.depth > input.floors.length || !isDenseArray(input.party, 3) || input.party.length !== 3) return fail('invalidState');
  const floors: DungeonFloor[] = [];
  for (let i = 0; i < input.floors.length; i++) {
    const f = input.floors[i];
    if (!hasShape(f, legacy ? ['descriptor','position','completed'] : ['descriptor','position','completed','exploration']) || !hasShape(f.descriptor, ['depth','seed','template','generator','biome','mapHash','upstairs','downstairs']) ||
      !safeCount(f.completed) || f.completed > 3 || !safeCount(f.position) || f.position >= 400 ||
      f.descriptor.depth !== i + 1 || f.descriptor.seed !== dungeonSeed(input.seed, i + 1, 'floor') || f.descriptor.template !== DUNGEON_TEMPLATE ||
      f.descriptor.generator !== 'rooms-v1' || f.descriptor.biome !== 'grassland-v1' || typeof f.descriptor.mapHash !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(f.descriptor.mapHash) ||
      !safeCount(f.descriptor.upstairs) || !safeCount(f.descriptor.downstairs) || f.descriptor.upstairs >= f.descriptor.downstairs || f.descriptor.downstairs >= 400 ||
      (legacy && f.position !== f.descriptor.upstairs && f.position !== f.descriptor.downstairs) || (i < input.floors.length - 1 && f.completed !== 3)) return fail('invalidFloor');
    const descriptor = { ...f.descriptor } as unknown as FloorDescriptor;
    const exploration = legacy ? freshExploration(descriptor.seed, f.position) : readExploration(f.exploration, descriptor.seed, f.position);
    if (!exploration) return fail('invalidExploration');
    floors.push({ descriptor, position: f.position, completed: f.completed, exploration });
  }
  const party: RunHero[] = [];
  for (let i = 0; i < 3; i++) {
    const h = input.party[i], heroId = HERO_IDS[i];
    if (!hasShape(h, ['heroId','hp']) || h.heroId !== heroId || !safeCount(h.hp) || h.hp > dungeonContent.catalog.heroes[heroId].stats.maxHp) return fail('invalidParty');
    party.push({ heroId, hp: h.hp });
  }
  const owned = readItemOwnership(input.ownership, input.id, dungeonContent.items, id => {
    const m = new RegExp(`^${input.id}:floor:([1-9][0-9]*):reward:([01]):option:[01]$`).exec(id);
    if (!m || !safeCount(Number(m[1]), 1) || Number(m[1]) > floors.length) return false;
    const floor = floors[Number(m[1]) - 1];
    return floor.completed > Number(m[2]) && !(input.depth === Number(m[1]) && input.phase === 'reward' && floor.completed === Number(m[2]) + 1);
  });
  if (!owned.ok) return owned;
  if (!['ready','battle','reward','defeat'].includes(input.phase as string)) return fail('invalidPhase');
  const state = { ...input, floors, party, ownership: owned.ownership } as unknown as DungeonState;
  if (canonical(currentFloor(state).descriptor) !== canonical(floorDescriptor(state.seed, state.depth))) return fail('invalidFloor');
  const slot = dungeonSlot(state), alive = party.some(h => h.hp > 0);
  if ((state.phase === 'defeat') === alive || state.phase === 'battle' && slot === 3 ||
    state.phase === 'reward' && (slot < 1 || slot > 2 || !hasShape(state.offer, ['version','id','seed','catalogIdentity','options']) ||
      !isDenseArray(state.offer.options, 2) || state.offer.options.length !== 2 || !state.offer.options.every(o => hasShape(o, ['itemId','quantity'])) || canonical(state.offer) !== canonical(dungeonOffer(state))) || state.phase !== 'reward' && state.offer !== null) return fail('invalidPhase');
  if (!legacy && (state.phase === 'battle' || state.phase === 'reward') && currentFloor(state).position !== poiCell(currentFloor(state).exploration.pois[state.phase === 'battle' ? slot : slot - 1])) return fail('invalidEncounterPosition');
  if (legacy) {
    for (let i = 0; i < floors.length; i++) {
      const f = floors[i]; let exploration = f.exploration;
      for (let j = 0; j < f.completed; j++) exploration = visit(exploration, poiCell(exploration.pois[j]));
      const activeSlot = i === state.depth - 1 && (state.phase === 'battle' || state.phase === 'reward') ? state.phase === 'battle' ? slot : slot - 1 : null;
      const position = activeSlot === null ? f.position : poiCell(exploration.pois[activeSlot]);
      floors[i] = { ...f, position, exploration: visit(exploration, position) };
    }
  }
  if (state.phase === 'battle') {
    const battle = dungeonBattle(state);
    const read = battle && readBattleState(state.activeBattle, battle.catalog);
    if (!battle || !read?.ok || !sameBattlefield(state.battlefield, battle.battlefield) || read.state.seed !== battle.state.seed || read.state.mapId !== battle.state.mapId ||
      read.state.units.some(u => u.side === 'player' && u.hp > party.find(h => h.heroId === u.defId)!.hp)) return fail('invalidBattle');
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
    const descriptor = floorDescriptor(s.seed, depth);
    floors = [...floors, { descriptor, position: descriptor.upstairs, completed: 0, exploration: freshExploration(descriptor.seed, descriptor.upstairs) }];
  }
  return advance(s, { depth, floors });
}
export function startDungeonBattle(s: DungeonState): DungeonResult {
  if (s.phase !== 'ready') return fail('wrongPhase');
  const f = currentFloor(s);
  if (f.completed >= 3 || f.position !== poiCell(f.exploration.pois[f.completed])) return fail('remoteEncounter');
  const battle = dungeonBattle(s);
  return battle ? advance(s, { phase: 'battle', activeBattle: battle.state, battlefield: battle.battlefield }) : fail('invalidBattle');
}
/** Only the session owning this active battle may call this accepted-state boundary. */
export function acceptDungeonBattle(s: DungeonState, battle: BattleState): DungeonResult {
  if (s.phase !== 'battle') return fail('staleBoundary');
  const checked = readDungeon({ ...s, activeBattle: battle });
  if (!checked.ok) return checked;
  if (battle.outcome === 'ongoing') return advance(s, { activeBattle: battle });
  const party = s.party.map(h => ({ ...h, hp: battle.units.find(u => u.side === 'player' && u.defId === h.heroId)?.hp ?? 0 }));
  const floors = [...s.floors], f = currentFloor(s);
  if (battle.outcome === 'playerLoss') return advance(s, { party, phase: 'defeat', activeBattle: null, battlefield: null });
  floors[s.depth - 1] = { ...f, completed: f.completed + 1 };
  const next = { ...s, floors };
  return advance(s, { floors, party, phase: f.completed === 2 ? 'ready' : 'reward', offer: f.completed === 2 ? null : dungeonOffer(next), activeBattle: null, battlefield: null });
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
    return granted ? advance(s, { ownership: granted, phase: 'ready', offer: null }) : fail('capacity');
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
  const candidate = { ...s, floors };
  if (f.completed < 3 && command.destination === poiCell(f.exploration.pois[f.completed])) return startDungeonBattle(candidate);
  return advance(s, { floors });
}
