/**
 * Bump manually when the foundation contracts or generator change. The battle session (#10) records replays in memory. Also bump when a
 * rules change would make a recorded replay play out differently; UI orchestration does not change rules.
 */
export const RULES_VERSION = 1;
export const RNG_VERSION = 1;
export const STATE_FORMAT_VERSION = 1;
export const RULE_BOUNDS = {
  uint32: { min: 0, max: 0xffffffff },
  cursor: { min: 0, max: Number.MAX_SAFE_INTEGER },
  round: { min: 1, max: Number.MAX_SAFE_INTEGER },
  /** One bound for a battle and its replay: a battle accepts at most this many commands, so its whole log always replays. */
  commandCount: { min: 0, max: 10000 },
  dieSides: { min: 1, max: 0x100000000 },
  hp: { min: 0 },
} as const;
export const D20_SIDES = 20;
export const UINT32_RANGE = 0x100000000;
export const RNG_WARMUP_DRAWS = 12;
/** Legacy cardinal enumeration; search breaks frontier ties by cost, y, then x. */
export const MOVEMENT_DIRECTIONS = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }] as const;
/** Legacy d20 attack rules (CombatResolver.gd:1051-1060,1236-1260): flat height bonus, natural edges, damage floor and critical doubling. */
export const HEIGHT_ATTACK_MODIFIER = 2;
export const NATURAL_AUTO_MISS = 1;
export const NATURAL_CRITICAL = D20_SIDES;
export const MIN_HIT_DAMAGE = 1;
export const CRITICAL_DAMAGE_MULTIPLIER = 2;
