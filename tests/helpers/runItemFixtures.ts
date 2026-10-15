import { authoredEncounters, authoredRun, runCatalog } from '../../src/content/encounters';
import { itemCatalog } from '../../src/content/items';
import { createRun, deriveRunSeed, runBoundaryId, transitionRun, type RunState } from '../../src/domain/run';
import { createRewardOffer } from '../../src/domain/rewards';
import { emptyItemOwnership, type RunItems } from '../../src/domain/items';
import { runBattleCatalog, type RunSaveContext, type RunSnapshot } from '../../src/domain/runSaveEnvelope';
import { createBattle } from '../../src/domain/turns';
export const runContext: RunSaveContext = { definition: authoredRun, encounters: authoredEncounters, catalog: runCatalog, items: itemCatalog };
function state<T extends { ok: boolean; state?: unknown }>(result: T): NonNullable<T['state']> {
  if (!result.ok) throw Error('Invalid run fixture'); return result.state!;
}
export const itemBoundary = (items: RunItems) => ({ runId: items.run.id, revision: items.run.revision,
  encounterId: items.run.encounters[items.run.encounterIndex], boundaryId: runBoundaryId(items.run), itemRevision: items.itemRevision });
/** Explicit boundary fixtures, never evidence of a legal full playthrough. */
export function rewardSnapshot(seed = 123): RunSnapshot {
  const initial = state(createRun('item-fixture', seed, authoredRun, runCatalog)) as RunState;
  const run = state(transitionRun(initial, { runId: initial.id, revision: initial.revision, encounterId: initial.encounters[0],
    boundaryId: runBoundaryId(initial), type: 'completeBattle', outcome: 'victory', party: initial.party.map(h => ({ ...h, hp: h.heroId === 'mage' ? 0 : 4 })) }, authoredRun, runCatalog));
  return { items: { run: run as RunState, ownership: emptyItemOwnership(), offer: createRewardOffer(run as RunState, itemCatalog), itemRevision: 0 }, activeBattle: null };
}
export function preparedSnapshot(): RunSnapshot {
  const reward = rewardSnapshot();
  const { itemRevision: _, ...boundary } = itemBoundary(reward.items);
  const result = transitionRun(reward.items.run, { ...boundary, type: 'acknowledgeReward' }, authoredRun, runCatalog);
  if (!result.ok) throw Error('Invalid fixture');
  return { activeBattle: null, items: { ...reward.items, run: result.state, offer: null, ownership: {
    consumables: [{ itemId: 'item:healing_draught', quantity: 2 }],
    equipment: [{ instanceId: 'item-fixture:reward:0:option:0', itemId: 'item:warding_charm' }], assignments: [],
  } } };
}
export function activeSnapshot(): RunSnapshot {
  const prepared = preparedSnapshot();
  const catalog = runBattleCatalog(prepared.items, runContext)!;
  const battle = createBattle(authoredEncounters[1].mapId, deriveRunSeed(prepared.items.run.seed, 'encounter', 1), catalog);
  if (!battle.ok) throw Error('Invalid fixture');
  return { ...prepared, activeBattle: { ...battle.state, units: battle.state.units.map(u => u.side === 'player'
    ? { ...u, hp: prepared.items.run.party.find(h => h.heroId === u.defId)!.hp } : u) } };
}
