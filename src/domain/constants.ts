/** Bump manually when the foundation contracts or generator change. */
export const RULES_VERSION = 1;
export const RNG_VERSION = 1;
export const STATE_FORMAT_VERSION = 1;
export const RULE_BOUNDS = {
  uint32: { min: 0, max: 0xffffffff },
  cursor: { min: 0, max: Number.MAX_SAFE_INTEGER },
  round: { min: 1, max: Number.MAX_SAFE_INTEGER },
  commandCount: { min: 0, max: Number.MAX_SAFE_INTEGER },
  dieSides: { min: 1, max: 0x100000000 },
  hp: { min: 0 },
  maxReplayCommands: 10000,
} as const;
export const D20_SIDES = 20;
export const UINT32_RANGE = 0x100000000;
export const RNG_WARMUP_DRAWS = 12;
/** Legacy cardinal enumeration; search breaks frontier ties by cost, y, then x. */
export const MOVEMENT_DIRECTIONS = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }] as const;
