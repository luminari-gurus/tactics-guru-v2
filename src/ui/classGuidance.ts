import type { BattleSession } from '../app/BattleSession';
import { GUARDED_STRIKE_TRADEOFF, MAGIC_MISSILE } from '../content/constants';
import type { Ability, AbilityId, ContentCatalog, HeroId } from '../content/types';
import { BATTLE_KEYS, ownedAbilities } from './battleActions';

export interface ClassTip {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  readonly abilityId?: AbilityId;
}

const name = (id: string) => id.replace(/^ability:/, '').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());

function skillTip(ability: Ability, hero: HeroId, catalog: ContentCatalog): ClassTip | null {
  let text: string;
  switch (ability.kind) {
    case 'attack':
      text = ability.uphillDamage ? `Hits deal +${ability.uphillDamage} damage when you stand above the target.`
        : 'Attack an enemy with an attack roll; check the hit chance in the preview.';
      break;
    case 'guardedAttack':
      text = `−${GUARDED_STRIKE_TRADEOFF.attackPenalty} to attack rolls, +${GUARDED_STRIKE_TRADEOFF.armorClassBonus} AC until your next turn, even on a miss. Does not stack.`;
      break;
    case 'magicMissile': {
      // The catalog supplies the projected caster level; the shared constants
      // match previewMagicMissile's bounded count and resolveMagicMissile's dice.
      const count = Math.min(MAGIC_MISSILE.maxMissiles, Math.floor((ability.casterLevel + 1) / 2));
      text = `${count} ${count === 1 ? 'missile hits' : 'missiles hit'} automatically for 1d${MAGIC_MISSILE.damageDie}+${MAGIC_MISSILE.damageBonus} force each. Can damage allies.`;
      break;
    }
    case 'secondWind':
      text = `Heal yourself up to ${ability.healBase + catalog.heroes[hero].stats.power} HP, capped by max HP; ${ability.usesPerBattle} use per battle.`;
      break;
    case 'taunt':
      text = 'An enemy must target you with offensive actions until its next turn ends or either unit is defeated.';
      break;
    case 'markTarget':
      text = `+${ability.accuracyBonus} accuracy for the next player attack roll against the marked enemy; consumed even on a miss. No damage.`;
      break;
    case 'pinningShot':
    case 'frostSnare':
      text = "Blocks enemy movement until its next turn ends or either unit is defeated; no damage or roll.";
      break;
    case 'weakeningHex':
    case 'healGoblin':
      return null; // These are enemy-only profiles, not player class tutorials.
  }
  return { id: `skill:${ability.id}:v1`, title: `${name(hero)} tip · ${name(ability.id)}`, text, abilityId: ability.id };
}

/** Read learned skills from the current projected catalog without preparing an intent. */
export function classTipForTurn(session: BattleSession, seen: readonly string[]): ClassTip | null {
  if (session.phase !== 'player' || session.state.outcome !== 'ongoing' || session.active.side !== 'player') return null;
  const hero = session.active.defId;
  const tips = ownedAbilities(session).map(ability => skillTip(ability, hero, session.catalog))
    .filter((tip): tip is ClassTip => tip !== null);
  if (!tips.length) return null;
  const known = new Set(seen);
  return tips.find(tip => !known.has(tip.id)) ?? tips[(session.state.round - 1) % tips.length];
}

/** The radial commits by action activation/hold release; it has no universal second confirmation step. */
export function previewLesson(skin: 'rail' | 'radial'): { readonly id: string; readonly text: string } {
  return skin === 'rail'
    ? { id: 'preview:rail:v1', text: `Choose an action and target, review the preview, then Confirm action (${BATTLE_KEYS.confirm.toUpperCase()}). ${BATTLE_KEYS.cancel} cancels. Wait / End turn ends your turn immediately.` }
    : { id: 'preview:radial:v1', text: `Choose a tile and review an action. Tapping an action or releasing a hold can execute it; Special may open skill choices. ${BATTLE_KEYS.cancel} cancels. End turn is immediate.` };
}
