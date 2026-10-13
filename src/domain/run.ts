import { HERO_IDS } from '../content/constants';
import type { ContentCatalog, HeroId } from '../content/types';
import { contentVersion } from './battle';
import { RULE_BOUNDS, RNG_VERSION, RULES_VERSION } from './constants';
import { isIntegerIn, nextUint32, seedRng } from './rng';
import type { Versions } from './types';
import { hasShape, isDenseArray } from './validation';

export const RUN_FORMAT_VERSION = 1;
export const RUN_MAX_REVISION = 16;
export type EncounterId = `encounter:${string}`;
export interface RunDefinition { readonly encounters: readonly [EncounterId, EncounterId, EncounterId] }
export interface RunHero { readonly heroId: HeroId; readonly hp: number }
export interface PendingReward { readonly id: string; readonly seed: number }
type RunPhase =
  | { readonly phase: 'battle'; readonly pendingReward: null }
  | { readonly phase: 'reward'; readonly pendingReward: PendingReward }
  | { readonly phase: 'victory' | 'defeat'; readonly pendingReward: null };
export type RunState = {
  readonly format: typeof RUN_FORMAT_VERSION;
  readonly versions: Versions;
  readonly id: string;
  readonly seed: number;
  readonly encounters: RunDefinition['encounters'];
  readonly encounterIndex: number;
  readonly revision: number;
  readonly party: readonly RunHero[];
} & RunPhase;
export type RunFailure = { readonly ok: false; readonly reason: 'invalidRun' | 'invalidCommand' | 'staleBoundary' | 'wrongPhase' };
export type RunRead = { readonly ok: true; readonly state: RunState } | RunFailure;
interface BoundaryCommand {
  readonly runId: string; readonly revision: number; readonly encounterId: EncounterId; readonly boundaryId: string;
}
export type RunCommand = BoundaryCommand & (
  | { readonly type: 'completeBattle'; readonly outcome: 'victory' | 'defeat'; readonly party: readonly RunHero[] }
  | { readonly type: 'acknowledgeReward' }
  | { readonly type: 'startNewRun'; readonly newRunId: string; readonly newSeed: number }
);
export type RunEvent =
  | { readonly type: 'rewardPending'; readonly reward: PendingReward }
  | { readonly type: 'encounterReady'; readonly encounterId: EncounterId }
  | { readonly type: 'runEnded'; readonly outcome: 'victory' | 'defeat' }
  | { readonly type: 'runStarted'; readonly runId: string };
export type RunResult = { readonly ok: true; readonly state: RunState; readonly events: readonly RunEvent[] } | RunFailure;
export interface RunBattleDescriptor {
  readonly encounterId: EncounterId; readonly seed: number; readonly boundaryId: string; readonly party: readonly RunHero[];
}
/** Shape for the future run codec; not accepted by the existing battle-save decoder.
 * Inventory/equipment and concrete offers are added and validated by #79/#80. */
export interface RunSaveExtension<ActiveBattle> {
  readonly run: RunState;
  readonly activeBattle: ActiveBattle | null;
}

function isRunId(value: unknown): value is string { return typeof value === 'string' && /^[A-Za-z0-9-]{1,64}$/.test(value); }
function isDefinition(value: unknown): value is RunDefinition {
  return hasShape(value, ['encounters']) && isDenseArray(value.encounters, 3) && value.encounters.length === 3 &&
    value.encounters.every(id => typeof id === 'string' && /^encounter:[A-Za-z0-9_-]{1,64}$/.test(id)) && new Set(value.encounters).size === 3;
}
function readParty(input: unknown, catalog: ContentCatalog): RunHero[] | null {
  if (!isDenseArray(input, 3) || input.length !== 3) return null;
  const party: RunHero[] = [];
  for (let i = 0; i < HERO_IDS.length; i++) {
    const hero = input[i], heroId = HERO_IDS[i];
    if (!hasShape(hero, ['heroId', 'hp']) || hero.heroId !== heroId ||
      !isIntegerIn(hero.hp, { min: 0, max: catalog.heroes[heroId].stats.maxHp })) return null;
    party.push({ heroId, hp: hero.hp });
  }
  return party;
}

/** run-v1: purpose-separated, fresh sfc32 state; never touches a battle RNG. */
export function deriveRunSeed(seed: number, purpose: 'encounter' | 'reward', index: number): number {
  if (!isIntegerIn(seed, RULE_BOUNDS.uint32) || !isIntegerIn(index, { min: 0, max: 2 }) ||
    (purpose !== 'encounter' && purpose !== 'reward')) throw new RangeError('Invalid run seed inputs');
  const tag = purpose === 'encounter' ? 0x454e4331 : 0x52574431;
  const mixed = (seed ^ tag ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
  return nextUint32(seedRng(mixed)).value;
}
function identity(state: Pick<RunState, 'id' | 'encounterIndex'>, purpose: 'battle' | 'reward' | 'outcome'): string {
  return `${state.id}:${purpose}:${state.encounterIndex}`;
}
export function runBoundaryId(state: RunState): string {
  return identity(state, state.phase === 'battle' ? 'battle' : state.phase === 'reward' ? 'reward' : 'outcome');
}

/** Trusted definition/catalog, unknown saved state; returns an owned copy. */
export function readRunState(input: unknown, definition: RunDefinition, catalog: ContentCatalog): RunRead {
  const invalid: RunFailure = { ok: false, reason: 'invalidRun' };
  if (!isDefinition(definition) || !hasShape(input, ['format', 'versions', 'id', 'seed', 'encounters', 'encounterIndex', 'revision', 'party', 'phase', 'pendingReward']) ||
    input.format !== RUN_FORMAT_VERSION || !hasShape(input.versions, ['rules', 'rng', 'content']) ||
    input.versions.rules !== RULES_VERSION || input.versions.rng !== RNG_VERSION || input.versions.content !== contentVersion(catalog) ||
    !isRunId(input.id) || !isIntegerIn(input.seed, RULE_BOUNDS.uint32) || !isIntegerIn(input.encounterIndex, { min: 0, max: 2 }) ||
    !isIntegerIn(input.revision, { min: 0, max: RUN_MAX_REVISION }) || !isDenseArray(input.encounters, 3) || input.encounters.length !== 3 ||
    !input.encounters.every((id, i) => id === definition.encounters[i])) return invalid;
  const party = readParty(input.party, catalog);
  if (!party) return invalid;
  const alive = party.some(h => h.hp > 0), index = input.encounterIndex;
  // Run HP is encounter-entry HP; current first-battle damage belongs to its snapshot.
  if (input.phase === 'battle' && index === 0 &&
    party.some(hero => hero.hp !== catalog.heroes[hero.heroId].stats.maxHp)) return invalid;
  const base = { format: RUN_FORMAT_VERSION, versions: { rules: RULES_VERSION, rng: RNG_VERSION, content: input.versions.content },
    id: input.id, seed: input.seed, encounters: [...definition.encounters] as [EncounterId, EncounterId, EncounterId],
    encounterIndex: index, revision: input.revision, party } as const;
  if (input.phase === 'reward') {
    if (!alive || index === 2 || input.revision !== index * 2 + 1 || !hasShape(input.pendingReward, ['id', 'seed']) ||
      input.pendingReward.id !== identity(base, 'reward') || input.pendingReward.seed !== deriveRunSeed(base.seed, 'reward', index)) return invalid;
    return { ok: true, state: { ...base, phase: 'reward', pendingReward: { id: input.pendingReward.id, seed: input.pendingReward.seed as number } } };
  }
  if (input.pendingReward !== null) return invalid;
  if (input.phase === 'battle' && alive && input.revision === index * 2 ||
    input.phase === 'victory' && alive && index === 2 && input.revision === 5 ||
    input.phase === 'defeat' && !alive && input.revision === index * 2 + 1) {
    return { ok: true, state: { ...base, phase: input.phase as 'battle' | 'victory' | 'defeat', pendingReward: null } };
  }
  return invalid;
}
export function createRun(id: string, seed: number, definition: RunDefinition, catalog: ContentCatalog): RunRead {
  if (!isDefinition(definition)) return { ok: false, reason: 'invalidRun' };
  return readRunState({ format: RUN_FORMAT_VERSION, versions: { rules: RULES_VERSION, rng: RNG_VERSION, content: contentVersion(catalog) },
    id, seed, encounters: [...definition.encounters], encounterIndex: 0, revision: 0,
    party: HERO_IDS.map(heroId => ({ heroId, hp: catalog.heroes[heroId].stats.maxHp })), phase: 'battle', pendingReward: null }, definition, catalog);
}
/** Pure previews of an already validated state; no draws or state changes. */
export function describeRunBattle(state: RunState): RunBattleDescriptor | null {
  return state.phase !== 'battle' ? null : { encounterId: state.encounters[state.encounterIndex], seed: deriveRunSeed(state.seed, 'encounter', state.encounterIndex),
    boundaryId: runBoundaryId(state), party: state.party.filter(h => h.hp > 0).map(h => ({ ...h })) };
}

/** Reference boundary reducer. Reward acknowledgement is NOT an inventory grant. */
export function transitionRun(input: unknown, command: unknown, definition: RunDefinition, catalog: ContentCatalog): RunResult {
  const read = readRunState(input, definition, catalog);
  if (!read.ok) return read;
  const state = read.state;
  const common = ['type', 'runId', 'revision', 'encounterId', 'boundaryId'];
  if (!hasShape(command, [...common, 'outcome', 'party']) && !hasShape(command, common) && !hasShape(command, [...common, 'newRunId', 'newSeed']))
    return { ok: false, reason: 'invalidCommand' };
  if (command.runId !== state.id || command.revision !== state.revision || command.encounterId !== state.encounters[state.encounterIndex] ||
    command.boundaryId !== runBoundaryId(state)) return { ok: false, reason: 'staleBoundary' };
  if (command.type === 'completeBattle' && hasShape(command, [...common, 'outcome', 'party'])) {
    if (state.phase !== 'battle') return { ok: false, reason: 'wrongPhase' };
    const party = readParty(command.party, catalog);
    if (!party || party.some((hero, i) => hero.hp > state.party[i].hp) ||
      (command.outcome !== 'victory' && command.outcome !== 'defeat') || (command.outcome === 'victory') !== party.some(h => h.hp > 0))
      return { ok: false, reason: 'invalidCommand' };
    const base = { ...state, party, revision: state.revision + 1 };
    if (command.outcome === 'defeat' || state.encounterIndex === 2) {
      const outcome = command.outcome;
      return { ok: true, state: { ...base, phase: outcome, pendingReward: null }, events: [{ type: 'runEnded', outcome }] };
    }
    const reward = { id: identity(state, 'reward'), seed: deriveRunSeed(state.seed, 'reward', state.encounterIndex) };
    return { ok: true, state: { ...base, phase: 'reward', pendingReward: reward }, events: [{ type: 'rewardPending', reward: { ...reward } }] };
  }
  if (command.type === 'acknowledgeReward' && hasShape(command, common)) {
    if (state.phase !== 'reward') return { ok: false, reason: 'wrongPhase' };
    const next: RunState = { ...state, encounterIndex: state.encounterIndex + 1, revision: state.revision + 1, phase: 'battle', pendingReward: null };
    return { ok: true, state: next, events: [{ type: 'encounterReady', encounterId: next.encounters[next.encounterIndex] }] };
  }
  if (command.type === 'startNewRun' && hasShape(command, [...common, 'newRunId', 'newSeed'])) {
    if (state.phase !== 'victory' && state.phase !== 'defeat') return { ok: false, reason: 'wrongPhase' };
    if (!isRunId(command.newRunId) || !isIntegerIn(command.newSeed, RULE_BOUNDS.uint32) || command.newRunId === state.id || command.newSeed === state.seed)
      return { ok: false, reason: 'invalidCommand' };
    const created = createRun(command.newRunId, command.newSeed, definition, catalog);
    return created.ok ? { ...created, events: [{ type: 'runStarted', runId: created.state.id }] } : created;
  }
  return { ok: false, reason: 'invalidCommand' };
}
