import type { ContentCatalog, MapId } from '../content/types';
import type { ItemCatalog } from '../content/itemTypes';
import { contentVersion, readBattleState } from './battle';
import { canonical, hashJson } from './contentIdentity';
import { projectItemCatalog, readRunItems, type RunItems } from './items';
import { itemCatalogIdentity } from './rewards';
import { deriveRunSeed, type RunDefinition } from './run';
import type { BattleState } from './types';
import type { SaveFailure } from './saveEnvelope';
import { hasShape } from './validation';

export const RUN_SAVE_KIND = 'tactics-guru:run-snapshot';
export const RUN_SAVE_FORMAT = 1;
export const RUN_SAVE_MAX_CODE_UNITS = 32_768;
/** Trusted validated definitions. Always pass the immutable BASE catalog. */
export interface RunSaveContext {
  readonly definition: RunDefinition;
  readonly encounters: readonly { readonly id: string; readonly mapId: MapId }[];
  readonly catalog: ContentCatalog;
  readonly items: ItemCatalog;
}
export interface RunSnapshot { readonly items: RunItems; readonly activeBattle: BattleState | null }
export type RunSnapshotRead = { readonly ok: true; readonly state: RunSnapshot } | SaveFailure;

/** Equipment is projected exactly once; absent heroes are removed from the encounter roster.
 * #80 uses this same catalog for construction, dispatch and restoration. */
export function runBattleCatalog(items: RunItems, context: RunSaveContext): ContentCatalog | null {
  const projected = projectItemCatalog(items, context.definition, context.catalog, context.items);
  const encounter = context.encounters.find(e => e.id === items.run.encounters[items.run.encounterIndex]);
  if (!projected.ok || !encounter || items.run.phase !== 'battle') return null;
  const map = projected.catalog.maps[encounter.mapId];
  if (!map) return null;
  const living = new Set(items.run.party.filter(h => h.hp > 0).map(h => h.heroId));
  return { ...projected.catalog, maps: { ...projected.catalog.maps, [map.id]: { ...map,
    spawns: map.spawns.filter(s => s.side === 'enemies' || living.has(s.unitId)) } } };
}

export function readRunSnapshot(input: unknown, context: RunSaveContext): RunSnapshotRead {
  const invalid = { ok: false, reason: 'invalidState' } as const;
  if (!hasShape(input, ['items', 'activeBattle'])) return invalid;
  const checked = readRunItems(input.items, context.definition, context.catalog, context.items);
  if (!checked.ok) return invalid;
  const items = checked.state;
  if (input.activeBattle === null) return { ok: true, state: { items, activeBattle: null } };
  const catalog = runBattleCatalog(items, context);
  if (!catalog) return invalid;
  const battle = readBattleState(input.activeBattle, catalog);
  const encounter = context.encounters.find(e => e.id === items.run.encounters[items.run.encounterIndex]);
  if (!battle.ok || battle.state.mapId !== encounter?.mapId ||
    battle.state.seed !== deriveRunSeed(items.run.seed, 'encounter', items.run.encounterIndex)) return invalid;
  // No healing exists during a battle. Entry HP is the upper bound, not live HP.
  if (battle.state.units.some(u => u.side === 'player' && u.hp > items.run.party.find(h => h.heroId === u.defId)!.hp)) return invalid;
  return { ok: true, state: { items, activeBattle: battle.state } };
}

function identity(context: RunSaveContext) {
  return { content: contentVersion(context.catalog), items: itemCatalogIdentity(context.items),
    encounters: hashJson({ definition: context.definition, encounters: context.encounters }) };
}
export function encodeRunSave(input: unknown, context: RunSaveContext): { readonly ok: true; readonly text: string } | SaveFailure {
  const read = readRunSnapshot(input, context);
  if (!read.ok) return read;
  const body = { kind: RUN_SAVE_KIND, format: RUN_SAVE_FORMAT, identity: identity(context), payload: read.state };
  const text = canonical({ ...body, digest: hashJson(body) });
  return text.length > RUN_SAVE_MAX_CODE_UNITS ? { ok: false, reason: 'tooLarge' } : { ok: true, text };
}
export function decodeRunSave(text: string, context: RunSaveContext): RunSnapshotRead {
  if (typeof text !== 'string') return { ok: false, reason: 'invalidJson' };
  if (text.length > RUN_SAVE_MAX_CODE_UNITS) return { ok: false, reason: 'tooLarge' };
  let input: unknown;
  try { input = JSON.parse(text); } catch { return { ok: false, reason: 'invalidJson' }; }
  if (!hasShape(input, ['kind', 'format', 'identity', 'payload', 'digest']) ||
    !hasShape(input.identity, ['content', 'items', 'encounters']) || typeof input.digest !== 'string' ||
    !/^sha256:[0-9a-f]{64}$/.test(input.digest)) return { ok: false, reason: 'invalidEnvelope' };
  const expected = identity(context);
  if (input.kind !== RUN_SAVE_KIND || input.format !== RUN_SAVE_FORMAT || input.identity.content !== expected.content ||
    input.identity.items !== expected.items || input.identity.encounters !== expected.encounters) return { ok: false, reason: 'incompatible' };
  const read = readRunSnapshot(input.payload, context);
  if (!read.ok) return read;
  const body = { kind: RUN_SAVE_KIND, format: RUN_SAVE_FORMAT, identity: expected, payload: read.state };
  return hashJson(body) === input.digest ? read : { ok: false, reason: 'corrupt' };
}
