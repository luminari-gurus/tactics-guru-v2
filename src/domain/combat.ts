import { clearDefeatedGuard, clearDefeatedTaunts, clearDefeatedControlEffects, combatStats, grantGuard, markSource, removeMark, tauntSource, weakenedImmune } from './effects';
import type { ContentCatalog } from '../content/types';
import { HEAL_GOBLIN_IDS, MAGIC_MISSILE } from '../content/constants';
import { previewCommand, readBattleState } from './battle';
import { CRITICAL_DAMAGE_MULTIPLIER, D20_SIDES, HEIGHT_ATTACK_MODIFIER, MIN_HIT_DAMAGE, NATURAL_AUTO_MISS, NATURAL_CRITICAL, RULE_BOUNDS } from './constants';
import { rollDie } from './rng';
import { lineOfSightBlocked, manhattanDistance } from './targeting';
import type { BattleEvent, BattleState, Command, CommandResult, Rejection, UnitState } from './types';

const stats = (catalog: ContentCatalog, u: UnitState) => u.side === 'player' ? catalog.heroes[u.defId].stats : catalog.enemies[u.defId].stats;
const elevation = (catalog: ContentCatalog, state: BattleState, u: UnitState) =>
  catalog.maps[state.mapId].cells.find(c => c.x === u.cell.x && c.y === u.cell.y)!.elevation;
export type AttackPreview = { readonly ok: true; readonly command: Extract<Command, { type: 'useAbility' }>; readonly targetId: number;
  readonly bonus: number; readonly armorClass: number; readonly damage: number; readonly criticalDamage: number; readonly markBonus?: number };
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
  if (profile.kind !== 'attack' && profile.kind !== 'guardedAttack') return { ok: false, reason: 'wrongTargetKind' };
  if (!profile.owners.includes(actor.defId)) return { ok: false, reason: 'abilityNotOwned' };
  if (!('unitId' in command.target)) return { ok: false, reason: 'wrongTargetKind' };
  const targetId = command.target.unitId;
  const target = snapshot.units.find(u => u.id === targetId);
  if (!target) return { ok: false, reason: 'missingTarget' };
  if (target.hp === 0) return { ok: false, reason: 'targetDefeated' };
  if (target.side === actor.side) return { ok: false, reason: 'sameSide' };
  const source = tauntSource(actor, snapshot.units);
  if (source && target.id !== source.id) return { ok: false, reason: 'tauntedTargetRequired' };
  const distance = manhattanDistance(actor.cell, target.cell);
  if (distance < profile.rangeMin || distance > profile.rangeMax) return { ok: false, reason: 'outOfRange' };
  if (lineOfSightBlocked(catalog, snapshot.mapId, actor.cell, target.cell)) return { ok: false, reason: 'blockedLos' };
  const rise = elevation(catalog, snapshot, actor) - elevation(catalog, snapshot, target);
  const height = rise > 0 ? HEIGHT_ATTACK_MODIFIER : rise < 0 ? -HEIGHT_ATTACK_MODIFIER : 0;
  const damage = Math.max(MIN_HIT_DAMAGE, profile.baseDamage + stats(catalog, actor).power + (rise > 0 ? profile.uphillDamage : 0));
  const marker = actor.side === 'player' ? markSource(target, snapshot.units) : undefined;
  const markProfile = marker && Object.values(catalog.abilities).find(a => a.kind === 'markTarget' && a.owners.includes(marker.defId));
  const markBonus = markProfile?.kind === 'markTarget' ? markProfile.accuracyBonus : 0;
  return { ok: true, command, targetId, bonus: combatStats(actor, catalog, profile.kind === 'guardedAttack').accuracy + height + markBonus,
    ...(markBonus ? { markBonus } : {}),
    armorClass: combatStats(target, catalog).armorClass,
    damage, criticalDamage: damage * CRITICAL_DAMAGE_MULTIPLIER };
}
/** One d20 from the snapshot RNG; acting never ends the turn. The target was living, so HP 0 here is its one defeat. */
export function resolveAttack(state: unknown, input: unknown, catalog: ContentCatalog): CommandResult {
  const intent = previewCommand(state, input, catalog);
  if (!intent.ok) return intent;
  if (intent.command.type === 'useAbility' && catalog.abilities[intent.command.abilityId]?.kind === 'magicMissile')
    return resolveMagicMissile(state, input, catalog);
  if (intent.command.type === 'useAbility' && ['secondWind','taunt'].includes(catalog.abilities[intent.command.abilityId]?.kind))
    return resolveFighterAbility(state, input, catalog);
  if (intent.command.type === 'useAbility' && ['markTarget','pinningShot','frostSnare'].includes(catalog.abilities[intent.command.abilityId]?.kind))
    return resolveControlAbility(state, input, catalog);
  if (intent.command.type === 'useAbility' && ['weakeningHex','healGoblin'].includes(catalog.abilities[intent.command.abilityId]?.kind))
    return resolveSupportAbility(state, input, catalog);
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
  let units = snapshot.units.map(u => clearDefeatedGuard(u.id === command.unitId
    ? (grantsGuard ? grantGuard({ ...u, hasActed: true }) : { ...u, hasActed: true })
    : u.id === targetId ? { ...u, hp } : u));
  const outcome = !units.some(u => u.side === 'player' && u.hp > 0) ? 'playerLoss' : !units.some(u => u.side === 'enemy' && u.hp > 0) ? 'playerWin' : 'ongoing';
  const events: BattleEvent[] = [{ type: 'abilityUsed', unitId: command.unitId, abilityId: command.abilityId, target: command.target },
    { type: 'attackRolled', unitId: command.unitId, targetId, natural: roll.value, bonus: preview.bonus, total, armorClass: preview.armorClass, result }];
  if (preview.markBonus) {
    events.push({ type: 'markConsumed', unitId: targetId, sourceId: snapshot.units.find(u => u.id === targetId)!.markedBy! });
    units = units.map(u => u.id === targetId ? removeMark(u) : u);
  }
  if (damage > 0) events.push({ type: 'damaged', unitId: targetId, damage, hp });
  if (hp === 0) events.push({ type: 'defeated', unitId: targetId });
  if (grantsGuard) events.push({ type: 'guarded', unitId: command.unitId });
  units = clearDefeatedTaunts(units, events);
  units = clearDefeatedControlEffects(units, events);
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
    const source = tauntSource(actor, snapshot.units);
    if (source && target.id !== source.id) return { ok: false, reason: 'tauntedTargetRequired' };
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
  let units = snapshot.units.map(u => clearDefeatedGuard(u.id === preview.command.unitId ? { ...u, hasActed: true } : u));
  const events: BattleEvent[] = [{ type: 'abilityUsed', unitId: preview.command.unitId,
    abilityId: preview.command.abilityId, target: preview.command.target }];
  rolls.forEach((roll, i) => {
    const targetId = preview.targetIds[i], target = units.find(u => u.id === targetId)!;
    const damage = roll.value + MAGIC_MISSILE.damageBonus, hp = Math.max(0, target.hp - damage);
    events.push({ type: 'missileRolled', unitId: preview.command.unitId, targetId, missile: i + 1, natural: roll.value, damage });
    if (target.hp > 0) {
      units = units.map(u => u.id === targetId ? clearDefeatedGuard({ ...u, hp }) : u);
      events.push({ type: 'damaged', unitId: targetId, damage, hp });
      if (hp === 0) events.push({ type: 'defeated', unitId: targetId });
    }
  });
  units = clearDefeatedTaunts(units, events);
  units = clearDefeatedControlEffects(units, events);
  const outcome = !units.some(u => u.side === 'player' && u.hp > 0) ? 'playerLoss' :
    !units.some(u => u.side === 'enemy' && u.hp > 0) ? 'playerWin' : 'ongoing';
  if (outcome !== 'ongoing') events.push({ type: 'battleEnded', outcome });
  return { ok: true, state: { ...snapshot, units, rng, outcome, commandCount: snapshot.commandCount + 1 }, events };
}

export type FighterPreview = { readonly ok: true; readonly command: Extract<Command,{type:'useAbility'}>; readonly targetId: number } & (
  | { readonly kind: 'secondWind'; readonly healing: number; readonly hp: number }
  | { readonly kind: 'taunt'; readonly sourceId: number }
);
/** Both effects preflight fully without rolls; resolution adopts HP, action and use/status together. */
export function previewFighterAbility(state: unknown, input: unknown, catalog: ContentCatalog): FighterPreview | Rejection {
  const intent=previewCommand(state,input,catalog);if(!intent.ok)return intent;
  if(intent.command.type!=='useAbility')return {ok:false,reason:'malformedCommand'};
  const checked=readBattleState(state,catalog);if(!checked.ok)return checked;
  const snapshot=checked.state,command=intent.command,actor=snapshot.units.find(u=>u.id===command.unitId)!;
  if(actor.hasActed)return {ok:false,reason:'alreadyActed'};
  const profile=Object.hasOwn(catalog.abilities,command.abilityId)?catalog.abilities[command.abilityId]:undefined;
  if(!profile)return {ok:false,reason:'unknownAbility'};
  if(profile.kind!=='secondWind' && profile.kind!=='taunt')return {ok:false,reason:'wrongTargetKind'};
  if(!profile.owners.includes(actor.defId))return {ok:false,reason:'abilityNotOwned'};
  if(!('unitId' in command.target))return {ok:false,reason:'wrongTargetKind'};
  const targetId=command.target.unitId;
  const target=snapshot.units.find(u=>u.id===targetId);
  if(!target)return {ok:false,reason:'missingTarget'};
  if(target.hp===0)return {ok:false,reason:'targetDefeated'};
  if(profile.kind==='secondWind') {
    if(target.id!==actor.id)return {ok:false,reason:'selfTargetRequired'};
    if(actor.secondWindUsed)return {ok:false,reason:'useExhausted'};
    const maxHp=stats(catalog,actor).maxHp;
    if(actor.hp===maxHp)return {ok:false,reason:'fullHealth'};
    const healing=Math.min(maxHp-actor.hp,profile.healBase+stats(catalog,actor).power);
    return {ok:true,kind:'secondWind',command,targetId:target.id,healing,hp:actor.hp+healing};
  }
  if(target.side===actor.side)return {ok:false,reason:'sameSide'};
  if(manhattanDistance(actor.cell,target.cell)!==profile.rangeMax)return {ok:false,reason:'outOfRange'};
  if(lineOfSightBlocked(catalog,snapshot.mapId,actor.cell,target.cell))return {ok:false,reason:'blockedLos'};
  return {ok:true,kind:'taunt',command,targetId:target.id,sourceId:actor.id};
}
export function previewAbility(state: unknown, input: Command, catalog: ContentCatalog) {
  const kind=input.type==='useAbility'?catalog.abilities[input.abilityId]?.kind:undefined;
  return kind==='magicMissile'?previewMagicMissile(state,input,catalog):
    kind==='secondWind'||kind==='taunt'?previewFighterAbility(state,input,catalog):
    kind==='weakeningHex'||kind==='healGoblin'?previewSupportAbility(state,input,catalog):
    kind==='markTarget'||kind==='pinningShot'||kind==='frostSnare'?previewControlAbility(state,input,catalog):previewAttack(state,input,catalog);
}

export type SupportPreview = { readonly ok: true; readonly command: Extract<Command, {type:'useAbility'}>;
  readonly sourceId: number; readonly targetId: number } & (
  | { readonly kind: 'weakeningHex'; readonly modifier: number; readonly dc: number; readonly savedFaces: number; readonly failedSaveFaces: number }
  | { readonly kind: 'healGoblin'; readonly healing: number; readonly hp: number }
);
/** Saves have no automatic natural outcomes; equality succeeds. Shared with result presentation. */
export function saveFaceCounts(modifier: number, dc: number) {
  const savedFaces = Math.max(0, Math.min(D20_SIDES, D20_SIDES + 1 + modifier - dc));
  return { savedFaces, failedSaveFaces: D20_SIDES - savedFaces };
}
/** Complete legal preflight; every candidate reads the same projected stats without drawing dice. */
export function previewSupportAbility(state: unknown, input: unknown, catalog: ContentCatalog): SupportPreview | Rejection {
  const intent = previewCommand(state, input, catalog); if (!intent.ok) return intent;
  if (intent.command.type !== 'useAbility') return { ok: false, reason: 'malformedCommand' };
  const checked = readBattleState(state, catalog); if (!checked.ok) return checked;
  const snapshot = checked.state, command = intent.command, actor = snapshot.units.find(u => u.id === command.unitId)!;
  if (actor.hasActed) return { ok: false, reason: 'alreadyActed' };
  const profile = Object.hasOwn(catalog.abilities, command.abilityId) ? catalog.abilities[command.abilityId] : undefined;
  if (!profile) return { ok: false, reason: 'unknownAbility' };
  if (profile.kind !== 'weakeningHex' && profile.kind !== 'healGoblin') return { ok: false, reason: 'wrongTargetKind' };
  if (!profile.owners.includes(actor.defId)) return { ok: false, reason: 'abilityNotOwned' };
  if (!('unitId' in command.target)) return { ok: false, reason: 'wrongTargetKind' };
  const targetId = command.target.unitId;
  const target = snapshot.units.find(u => u.id === targetId);
  if (!target) return { ok: false, reason: 'missingTarget' };
  if (target.hp === 0) return { ok: false, reason: 'targetDefeated' };
  if (profile.kind === 'healGoblin') {
    if (target.side !== actor.side || target.side !== 'enemy' || !HEAL_GOBLIN_IDS.some(id => id === target.defId))
      return { ok: false, reason: 'ineligibleAlly' };
    if (target.hp === stats(catalog, target).maxHp) return { ok: false, reason: 'fullHealth' };
  } else {
    if (target.side === actor.side) return { ok: false, reason: 'sameSide' };
    const source = tauntSource(actor, snapshot.units);
    if (source && target.id !== source.id) return { ok: false, reason: 'tauntedTargetRequired' };
    if (weakenedImmune(target, catalog)) return { ok: false, reason: 'immune' };
  }
  const distance = manhattanDistance(actor.cell, target.cell);
  if (distance < profile.rangeMin || distance > profile.rangeMax) return { ok: false, reason: 'outOfRange' };
  if (lineOfSightBlocked(catalog, snapshot.mapId, actor.cell, target.cell)) return { ok: false, reason: 'blockedLos' };
  const base = { ok: true as const, command, sourceId: actor.id, targetId: target.id };
  if (profile.kind === 'healGoblin') {
    const healing = Math.min(profile.healAmount, stats(catalog, target).maxHp - target.hp);
    return { ...base, kind: 'healGoblin', healing, hp: target.hp + healing };
  }
  const modifier = stats(catalog, target).will, dc = 10 + stats(catalog, actor).power;
  return { ...base, kind: 'weakeningHex', modifier, dc, ...saveFaceCounts(modifier, dc) };
}
function resolveSupportAbility(state: unknown, input: unknown, catalog: ContentCatalog): CommandResult {
  const preview = previewSupportAbility(state, input, catalog); if (!preview.ok) return preview;
  const checked = readBattleState(state, catalog); if (!checked.ok) return checked;
  const snapshot = checked.state;
  let rng = snapshot.rng, saved = false;
  const events: BattleEvent[] = [{ type: 'abilityUsed', unitId: preview.sourceId,
    abilityId: preview.command.abilityId, target: preview.command.target }];
  if (preview.kind === 'weakeningHex') {
    let roll: ReturnType<typeof rollDie>;
    try { roll = rollDie(rng, D20_SIDES); } catch { return { ok: false, reason: 'invalidState' }; }
    rng = roll.rng;
    const total = roll.value + preview.modifier;
    saved = total >= preview.dc;
    events.push({ type: 'saveRolled', unitId: preview.targetId, natural: roll.value,
      modifier: preview.modifier, total, dc: preview.dc, saved });
    if (!saved) events.push({ type: 'weakened', unitId: preview.targetId, sourceId: preview.sourceId });
  } else events.push({ type: 'healed', unitId: preview.targetId, healing: preview.healing, hp: preview.hp });
  const units = snapshot.units.map((unit): UnitState => unit.id === preview.sourceId ? { ...unit, hasActed: true } :
    unit.id !== preview.targetId ? unit : preview.kind === 'healGoblin' ? { ...unit, hp: preview.hp } :
      saved ? unit : { ...unit, weakenedBy: preview.sourceId });
  return { ok: true, state: { ...snapshot, units, rng, commandCount: snapshot.commandCount + 1 }, events };
}
export type ControlPreview = { readonly ok: true; readonly command: Extract<Command,{type:'useAbility'}>;
  readonly targetId: number; readonly sourceId: number; readonly kind: 'markTarget' | 'pinningShot' | 'frostSnare' };
/** Effect-only controls share hostile targeting, with no damage or die roll. */
export function previewControlAbility(state: unknown, input: unknown, catalog: ContentCatalog): ControlPreview | Rejection {
  const intent = previewCommand(state, input, catalog); if (!intent.ok) return intent;
  if (intent.command.type !== 'useAbility') return { ok: false, reason: 'malformedCommand' };
  const checked = readBattleState(state, catalog); if (!checked.ok) return checked;
  const snapshot = checked.state, command = intent.command, actor = snapshot.units.find(u => u.id === command.unitId)!;
  if (actor.hasActed) return { ok: false, reason: 'alreadyActed' };
  const profile = Object.hasOwn(catalog.abilities, command.abilityId) ? catalog.abilities[command.abilityId] : undefined;
  if (!profile) return { ok: false, reason: 'unknownAbility' };
  if (profile.kind !== 'markTarget' && profile.kind !== 'pinningShot' && profile.kind !== 'frostSnare') return { ok: false, reason: 'wrongTargetKind' };
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
  if (profile.kind !== 'markTarget' && target.movementBlock !== undefined) return { ok: false, reason: 'alreadyImmobilized' };
  return { ok: true, command, targetId: target.id, sourceId: actor.id, kind: profile.kind };
}
function resolveControlAbility(state: unknown, input: unknown, catalog: ContentCatalog): CommandResult {
  const preview = previewControlAbility(state, input, catalog); if (!preview.ok) return preview;
  const checked = readBattleState(state, catalog); if (!checked.ok) return checked;
  const abilityId = preview.kind === 'pinningShot' ? 'ability:pinning_shot' : 'ability:frost_snare';
  const units = checked.state.units.map((u): UnitState => u.id === preview.command.unitId ? { ...u, hasActed: true } :
    u.id === preview.targetId ? preview.kind === 'markTarget' ? { ...u, markedBy: preview.sourceId } :
      { ...u, movementBlock: { sourceId: preview.sourceId, abilityId } } : u);
  return { ok: true, state: { ...checked.state, units, commandCount: checked.state.commandCount + 1 }, events: [
    { type: 'abilityUsed', unitId: preview.command.unitId, abilityId: preview.command.abilityId, target: preview.command.target },
    preview.kind === 'markTarget' ? { type: 'marked', unitId: preview.targetId, sourceId: preview.sourceId } :
      { type: 'movementBlocked', unitId: preview.targetId, sourceId: preview.sourceId, abilityId },
  ] };
}
function resolveFighterAbility(state: unknown, input: unknown, catalog: ContentCatalog): CommandResult {
  const preview=previewFighterAbility(state,input,catalog);if(!preview.ok)return preview;
  const checked=readBattleState(state,catalog);if(!checked.ok)return checked;
  const snapshot=checked.state,command=preview.command;
  const units=snapshot.units.map(u=>{
    if(preview.kind==='secondWind' && u.id===command.unitId)return {...u,hp:preview.hp,hasActed:true,secondWindUsed:true as const};
    if(u.id===command.unitId)return {...u,hasActed:true};
    return preview.kind==='taunt' && u.id===preview.targetId?{...u,tauntedBy:preview.sourceId}:u;
  });
  const event:BattleEvent=preview.kind==='secondWind'?{type:'healed',unitId:command.unitId,healing:preview.healing,hp:preview.hp}:
    {type:'taunted',unitId:preview.targetId,sourceId:preview.sourceId};
  return {ok:true,state:{...snapshot,units,commandCount:snapshot.commandCount+1},events:[
    {type:'abilityUsed',unitId:command.unitId,abilityId:command.abilityId,target:command.target},event]};
}
