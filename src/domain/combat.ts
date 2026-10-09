import type { ContentCatalog, UnitId } from '../content/types';
import { previewCommand, readBattleState } from './battle';
import { CRITICAL_DAMAGE_MULTIPLIER, D20_SIDES, HEIGHT_ATTACK_MODIFIER, MIN_HIT_DAMAGE, NATURAL_AUTO_MISS, NATURAL_CRITICAL, RULE_BOUNDS } from './constants';
import { rollDie } from './rng';
import { lineOfSightBlocked, manhattanDistance } from './targeting';
import type { BattleEvent, BattleState, Command, CommandResult, Rejection, UnitState } from './types';

type AttackProfile = { readonly rangeMin: number; readonly rangeMax: number; readonly baseDamage: number; readonly owners: readonly UnitId[] };
/**
 * The slice's two ordinary d20 attacks (basic_attack.tres; CombatResolver.gd:32-49,1392-1408). Both need line of sight,
 * target one enemy unit and have no accuracy or damage modifier; #8 adds fields with the first profile that differs.
 * Replays record these IDs, so they are contract: #8's catalog keeps them.
 */
const ATTACK_PROFILES: Readonly<Record<string, AttackProfile>> = {
  'ability:basic_attack': { rangeMin: 1, rangeMax: 1, baseDamage: 2, owners: ['fighter', 'ranger', 'mage', 'goblin_grunt'] },
  'ability:shortbow_shot': { rangeMin: 2, rangeMax: 4, baseDamage: 2, owners: ['goblin_archer'] },
};
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
  if (!Object.hasOwn(ATTACK_PROFILES, command.abilityId)) return { ok: false, reason: 'unknownAbility' };
  const profile = ATTACK_PROFILES[command.abilityId];
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
  const damage = Math.max(MIN_HIT_DAMAGE, profile.baseDamage + stats(catalog, actor).power);
  return { ok: true, command, targetId, bonus: stats(catalog, actor).accuracy + height, armorClass: stats(catalog, target).armorClass,
    damage, criticalDamage: damage * CRITICAL_DAMAGE_MULTIPLIER };
}
/** One d20 from the snapshot RNG; acting never ends the turn. The target was living, so HP 0 here is its one defeat. */
export function resolveAttack(state: unknown, input: unknown, catalog: ContentCatalog): CommandResult {
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
  const units = snapshot.units.map(u => u.id === command.unitId ? { ...u, hasActed: true } : u.id === targetId ? { ...u, hp } : u);
  const outcome = !units.some(u => u.side === 'player' && u.hp > 0) ? 'playerLoss' : !units.some(u => u.side === 'enemy' && u.hp > 0) ? 'playerWin' : 'ongoing';
  const events: BattleEvent[] = [{ type: 'abilityUsed', unitId: command.unitId, abilityId: command.abilityId, target: command.target },
    { type: 'attackRolled', unitId: command.unitId, targetId, natural: roll.value, bonus: preview.bonus, total, armorClass: preview.armorClass, result }];
  if (damage > 0) events.push({ type: 'damaged', unitId: targetId, damage, hp });
  if (hp === 0) events.push({ type: 'defeated', unitId: targetId });
  if (outcome !== 'ongoing') events.push({ type: 'battleEnded', outcome });
  return { ok: true, state: { ...snapshot, rng: roll.rng, units, outcome, commandCount: snapshot.commandCount + 1 }, events };
}
