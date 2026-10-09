import type { ContentCatalog } from '../content/types';
import { FIGHTING_DEFENSIVELY, MAGIC_MISSILE } from '../content/constants';
import { previewCommand, readBattleState } from './battle';
import { CRITICAL_DAMAGE_MULTIPLIER, D20_SIDES, HEIGHT_ATTACK_MODIFIER, MIN_HIT_DAMAGE, NATURAL_AUTO_MISS, NATURAL_CRITICAL, RULE_BOUNDS } from './constants';
import { rollDie } from './rng';
import { lineOfSightBlocked, manhattanDistance } from './targeting';
import type { BattleEvent, BattleState, Command, CommandResult, Rejection, UnitState } from './types';

const stats = (catalog: ContentCatalog, u: UnitState) => u.side === 'player' ? catalog.heroes[u.defId].stats : catalog.enemies[u.defId].stats;
const elevation = (catalog: ContentCatalog, state: BattleState, u: UnitState) =>
  catalog.maps[state.mapId].cells.find(c => c.x === u.cell.x && c.y === u.cell.y)!.elevation;
export type AttackPreview = { readonly ok: true; readonly command: Extract<Command, { type: 'useAbility' }>; readonly targetId: number;
  readonly bonus: number; readonly armorClass: number; readonly damage: number; readonly criticalDamage: number };
/** Legality and every number resolution uses; no RNG access. Target checks follow TargetingService.gd:28-49. */
export function previewAttack(state: unknown, input: unknown, catalog: ContentCatalog): AttackPreview | Rejection {
  const intent = previewCommand(state, input, catalog); if (!intent.ok) return intent;
  if (intent.command.type !== 'useAbility') return { ok: false, reason: 'malformedCommand' };
  const checked = readBattleState(state, catalog); if (!checked.ok) return checked;
  const snapshot = checked.state; const command = intent.command;
  const actor = snapshot.units.find(u => u.id === command.unitId)!;
  if (actor.hasActed) return { ok: false, reason: 'alreadyActed' };
  if (!Object.hasOwn(catalog.abilities, command.abilityId)) return { ok: false, reason: 'unknownAbility' };
  const profile = catalog.abilities[command.abilityId];
  if (profile.kind === 'magicMissile') return { ok: false, reason: 'wrongTargetKind' };
  if (!profile.owners.includes(actor.defId)) return { ok: false, reason: 'abilityNotOwned' };
  if (!('unitId' in command.target)) return { ok: false, reason: 'wrongTargetKind' };
  const targetId = command.target.unitId;
  const target = snapshot.units.find(u => u.id === targetId);
  if (!target) return { ok: false, reason: 'missingTarget' };
  if (target.hp === 0) return { ok: false, reason: 'targetDefeated' };
  if (target.side === actor.side) return { ok: false, reason: 'sameSide' };
  const distance = manhattanDistance(actor.cell, target.cell);
  if (distance < profile.rangeMin || distance > profile.rangeMax) return { ok: false, reason: 'outOfRange' };
  if (lineOfSightBlocked(catalog, snapshot.mapId, actor.cell, target.cell)) return { ok: false, reason: 'blockedLos' };
  const rise = elevation(catalog, snapshot, actor) - elevation(catalog, snapshot, target);
  const height = rise > 0 ? HEIGHT_ATTACK_MODIFIER : rise < 0 ? -HEIGHT_ATTACK_MODIFIER : 0;
  const damage = Math.max(MIN_HIT_DAMAGE, profile.baseDamage + stats(catalog, actor).power + (rise > 0 ? profile.uphillDamage : 0));
  const penalty = profile.kind === 'guardedAttack' || actor.guarded ? FIGHTING_DEFENSIVELY.attackPenalty : 0;
  return { ok: true, command, targetId, bonus: stats(catalog, actor).accuracy + height - penalty,
    armorClass: stats(catalog, target).armorClass + (target.guarded ? FIGHTING_DEFENSIVELY.armorClassBonus : 0),
    damage, criticalDamage: damage * CRITICAL_DAMAGE_MULTIPLIER };
}
/** One d20 from the snapshot RNG; acting never ends the turn. The target was living, so HP 0 here is its one defeat. */
export function resolveAttack(state: unknown, input: unknown, catalog: ContentCatalog): CommandResult {
  const intent = previewCommand(state, input, catalog);
  if (!intent.ok) return intent;
  if (intent.command.type === 'useAbility' && catalog.abilities[intent.command.abilityId]?.kind === 'magicMissile')
    return resolveMagicMissile(state, input, catalog);
  const preview = previewAttack(state, input, catalog); if (!preview.ok) return preview;
  const checked = readBattleState(state, catalog); if (!checked.ok) return checked;
  const snapshot = checked.state; const { command, targetId } = preview;
  let roll: ReturnType<typeof rollDie>;
  // A validated RNG throws only when its cursor runs out, which a redraw can reach one step early.
  try { roll = rollDie(snapshot.rng, D20_SIDES); } catch { return { ok: false, reason: 'invalidState' }; }
  const total = roll.value + preview.bonus;
  const result = roll.value === NATURAL_CRITICAL ? 'critical' : roll.value !== NATURAL_AUTO_MISS && total >= preview.armorClass ? 'hit' : 'miss';
  const damage = result === 'critical' ? preview.criticalDamage : result === 'hit' ? preview.damage : 0;
  const hp = Math.max(RULE_BOUNDS.hp.min, snapshot.units.find(u => u.id === targetId)!.hp - damage);
  const grantsGuard = catalog.abilities[command.abilityId].kind === 'guardedAttack';
  const units = snapshot.units.map(u => u.id === command.unitId ? { ...u, hasActed: true, ...(grantsGuard ? { guarded: true as const } : {}) } : u.id === targetId ? { ...u, hp } : u);
  const outcome = !units.some(u => u.side === 'player' && u.hp > 0) ? 'playerLoss' : !units.some(u => u.side === 'enemy' && u.hp > 0) ? 'playerWin' : 'ongoing';
  const events: BattleEvent[] = [{ type: 'abilityUsed', unitId: command.unitId, abilityId: command.abilityId, target: command.target },
    { type: 'attackRolled', unitId: command.unitId, targetId, natural: roll.value, bonus: preview.bonus, total, armorClass: preview.armorClass, result }];
  if (damage > 0) events.push({ type: 'damaged', unitId: targetId, damage, hp });
  if (hp === 0) events.push({ type: 'defeated', unitId: targetId });
  if (grantsGuard) events.push({ type: 'guarded', unitId: command.unitId });
  if (outcome !== 'ongoing') events.push({ type: 'battleEnded', outcome });
  return { ok: true, state: { ...snapshot, rng: roll.rng, units, outcome, commandCount: snapshot.commandCount + 1 }, events };
}

export type MagicMissilePreview = { readonly ok: true; readonly command: Extract<Command, { type: 'useAbility' }>;
  readonly targetIds: readonly number[]; readonly missileCount: number; readonly minDamage: 2; readonly maxDamage: 5 };
/** Assign every missile before drawing damage. An automatic hit still requires a living creature and clear line of effect. */
export function previewMagicMissile(state: unknown, input: unknown, catalog: ContentCatalog): MagicMissilePreview | Rejection {
  const intent = previewCommand(state, input, catalog); if (!intent.ok) return intent;
  if (intent.command.type !== 'useAbility') return { ok: false, reason: 'malformedCommand' };
  const checked = readBattleState(state, catalog); if (!checked.ok) return checked;
  const snapshot = checked.state, command = intent.command;
  const actor = snapshot.units.find(u => u.id === command.unitId)!;
  if (actor.hasActed) return { ok: false, reason: 'alreadyActed' };
  if (!Object.hasOwn(catalog.abilities, command.abilityId)) return { ok: false, reason: 'unknownAbility' };
  const profile = catalog.abilities[command.abilityId];
  if (profile.kind !== 'magicMissile') return { ok: false, reason: 'wrongTargetKind' };
  if (!profile.owners.includes(actor.defId)) return { ok: false, reason: 'abilityNotOwned' };
  const missileCount = Math.min(MAGIC_MISSILE.maxMissiles, Math.floor((profile.casterLevel + 1) / 2));
  const targetIds = 'missileTargets' in command.target ? command.target.missileTargets :
    'unitId' in command.target ? Array<number>(missileCount).fill(command.target.unitId) : undefined;
  if (!targetIds) return { ok: false, reason: 'wrongTargetKind' };
  if (targetIds.length !== missileCount) return { ok: false, reason: 'wrongMissileCount' };
  const targets: UnitState[] = [];
  for (const id of targetIds) {
    const target = snapshot.units.find(u => u.id === id);
    if (!target) return { ok: false, reason: 'missingTarget' };
    if (target.hp === 0) return { ok: false, reason: 'targetDefeated' };
    const distance = manhattanDistance(actor.cell, target.cell);
    if (distance < profile.rangeMin || distance > profile.rangeMax)
      return { ok: false, reason: 'outOfRange' };
    if (lineOfSightBlocked(catalog, snapshot.mapId, actor.cell, target.cell)) return { ok: false, reason: 'blockedLos' };
    if (targets.some(other => manhattanDistance(other.cell, target.cell) > MAGIC_MISSILE.targetSpread))
      return { ok: false, reason: 'targetsTooFarApart' };
    targets.push(target);
  }
  return { ok: true, command, targetIds, missileCount, minDamage: 2, maxDamage: 5 };
}
export function resolveMagicMissile(state: unknown, input: unknown, catalog: ContentCatalog): CommandResult {
  const preview = previewMagicMissile(state, input, catalog); if (!preview.ok) return preview;
  const checked = readBattleState(state, catalog); if (!checked.ok) return checked;
  const snapshot = checked.state;
  let rng = snapshot.rng;
  const rolls: ReturnType<typeof rollDie>[] = [];
  // Draw all dice locally first: cursor exhaustion rejects the entire cast without partial damage.
  try { for (let i = 0; i < preview.missileCount; i++) { const roll = rollDie(rng, MAGIC_MISSILE.damageDie); rolls.push(roll); rng = roll.rng; } }
  catch { return { ok: false, reason: 'invalidState' }; }
  let units = snapshot.units.map(u => u.id === preview.command.unitId ? { ...u, hasActed: true } : u);
  const events: BattleEvent[] = [{ type: 'abilityUsed', unitId: preview.command.unitId,
    abilityId: preview.command.abilityId, target: preview.command.target }];
  rolls.forEach((roll, i) => {
    const targetId = preview.targetIds[i], target = units.find(u => u.id === targetId)!;
    const damage = roll.value + MAGIC_MISSILE.damageBonus, hp = Math.max(0, target.hp - damage);
    events.push({ type: 'missileRolled', unitId: preview.command.unitId, targetId, missile: i + 1, natural: roll.value, damage });
    if (target.hp > 0) {
      units = units.map(u => u.id === targetId ? { ...u, hp } : u);
      events.push({ type: 'damaged', unitId: targetId, damage, hp });
      if (hp === 0) events.push({ type: 'defeated', unitId: targetId });
    }
  });
  const outcome = !units.some(u => u.side === 'player' && u.hp > 0) ? 'playerLoss' :
    !units.some(u => u.side === 'enemy' && u.hp > 0) ? 'playerWin' : 'ongoing';
  if (outcome !== 'ongoing') events.push({ type: 'battleEnded', outcome });
  return { ok: true, state: { ...snapshot, units, rng, outcome, commandCount: snapshot.commandCount + 1 }, events };
}
