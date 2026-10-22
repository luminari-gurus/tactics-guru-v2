import { hasShape } from './validation';
import { sameBattlefield } from './battlefield';
import { readBattleState, readReplay } from './battle';
import { canonical } from './contentIdentity';
import { createBattle, dispatch } from './turns';
import { createRun, describeRunBattle, runBoundaryId, transitionRun } from './run';
import { emptyItemOwnership, readRunItems } from './items';
import { createRewardOffer } from './rewards';
import { readRunSnapshot, runBattleCatalog, resolveRunBattlefield, type RunSaveContext, type RunSnapshot } from './runSaveEnvelope';
import type { BattleEvent, BattleState } from './types';

/** The single canonical entry boundary for a run battle, including carried HP. */
export function createRunBattle(input: unknown, context: RunSaveContext) {
  const read = readRunItems(input, context.definition, context.catalog, context.items);
  if (!read.ok) return read;
  const catalog = runBattleCatalog(read.state, context), entry = describeRunBattle(read.state.run);
  const encounter = context.encounters.find(e => e.id === entry?.encounterId);
  if (!catalog || !entry || !encounter) return { ok: false, reason: 'invalidRun' } as const;
  const resolved = resolveRunBattlefield(read.state,context);
  if(!resolved?.ok)return {ok:false,reason:'invalidRun'} as const;
  const created = createBattle(resolved.map.id, entry.seed, catalog);
  if (!created.ok) return created;
  const checked = readBattleState({ ...created.state, units: created.state.units.map(unit => unit.side === 'player'
    ? { ...unit, hp: entry.party.find(hero => hero.heroId === unit.defId)!.hp } : unit) }, catalog);
  return checked.ok ? { ...checked, catalog, battlefield:resolved.descriptor } : checked;
}

/** Canonical replay remains tied to the validated run entry; arbitrary snapshots are not starts. */
export function replayRunBattle(input: unknown, entry: unknown, context: RunSaveContext) {
  const created = createRunBattle(entry, context);
  if (!created.ok) return { ok: false, reason: 'invalidReplay' } as const;
  if(!hasShape(input,['format','versions','initial','commands','battlefield']) || !sameBattlefield(input.battlefield,created.battlefield))return {ok:false,reason:'invalidReplay'} as const;
  const {battlefield: _,...record}=input;
  const read = readReplay(record, created.catalog);
  if (!read.ok || canonical(read.replay.initial) !== canonical(created.state)) return { ok: false, reason: 'invalidReplay' } as const;
  let state = created.state; const events: BattleEvent[] = [];
  for (const command of read.replay.commands) {
    const result = dispatch(state, command, created.catalog);
    if (!result.ok) return result;
    state = result.state; events.push(...result.events);
  }
  return { ok: true, state, events } as const;
}

export function freshRunSnapshot(id: string, seed: number, context: RunSaveContext): RunSnapshot {
  const run = createRun(id, seed, context.definition, context.catalog);
  if (!run.ok) throw Error('Invalid fresh run');
  return { items: { run: run.state, ownership: emptyItemOwnership(), offer: null, itemRevision: 0 }, activeBattle: null, battlefield:null };
}

/** Caller must supply its owned accepted battle. This helper validates the aggregate before publication. */
export function completeRunBattle(snapshot: RunSnapshot, battle: BattleState, context: RunSaveContext) {
  const read = readRunSnapshot({ ...snapshot, activeBattle: battle }, context);
  if (!read.ok || battle.outcome === 'ongoing') return { ok: false, reason: 'invalidState' } as const;
  const run = snapshot.items.run;
  const next = transitionRun(run, { type: 'completeBattle', runId: run.id, revision: run.revision,
    encounterId: run.encounters[run.encounterIndex], boundaryId: runBoundaryId(run),
    outcome: battle.outcome === 'playerWin' ? 'victory' : 'defeat',
    party: run.party.map(hero => ({ ...hero, hp: battle.units.find(u => u.side === 'player' && u.defId === hero.heroId)?.hp ?? 0 })) },
    context.definition, context.catalog);
  if (!next.ok) return next;
  return readRunSnapshot({ items: { ...snapshot.items, run: next.state, offer: createRewardOffer(next.state, context.items) }, activeBattle: null, battlefield:null }, context);
}
