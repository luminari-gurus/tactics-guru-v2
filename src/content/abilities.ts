import type { AbilityId, Ability } from './types';
import { GUARDED_STRIKE_TRADEOFF } from './constants';

// Baseline ranges/damage: docs/tech_design.phaser4.draft.md §6.2.
// Guarded Strike uses a fixed Combat Expertise-inspired tradeoff; Magic Missile uses the 3.5E automatic-hit damage rules.
export const attackAbilities = {
  'ability:basic_attack': { id: 'ability:basic_attack', kind: 'attack', owners: ['fighter', 'ranger', 'mage', 'goblin_grunt'],
    rangeMin: 1, rangeMax: 1, baseDamage: 2, uphillDamage: 0 },
  'ability:shortbow_shot': { id: 'ability:shortbow_shot', kind: 'attack', owners: ['goblin_archer'],
    rangeMin: 2, rangeMax: 4, baseDamage: 2, uphillDamage: 0 },
  'ability:high_shot': { id: 'ability:high_shot', kind: 'attack', owners: ['ranger'],
    rangeMin: 2, rangeMax: 5, baseDamage: 2, uphillDamage: 2 },
  'ability:guarded_strike': { id: 'ability:guarded_strike', kind: 'guardedAttack', owners: ['fighter'],
    rangeMin: 1, rangeMax: 1, baseDamage: 2, uphillDamage: 0, ...GUARDED_STRIKE_TRADEOFF },
  'ability:magic_missile': { id: 'ability:magic_missile', kind: 'magicMissile', owners: ['mage'], casterLevel: 1, rangeMin: 1, rangeMax: 5 },
} as const satisfies Readonly<Record<AbilityId, Ability>>;
