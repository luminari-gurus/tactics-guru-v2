import { RNG_WARMUP_DRAWS, RULE_BOUNDS, UINT32_RANGE } from './constants';
import { hasShape, isDenseArray } from './validation';

export interface RngState {
  readonly words: readonly [number, number, number, number];
  /** Total raw draws since warmup; explicit so counter wrap is unambiguous. */
  readonly cursor: number;
}
export function isIntegerIn(value: unknown, bounds: { readonly min: number; readonly max: number }): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= bounds.min && value <= bounds.max;
}
export function isRngState(value: unknown): value is RngState {
  return hasShape(value, ['words','cursor']) && isDenseArray(value.words, 4) && value.words.length === 4 &&
    value.words.every(w => isIntegerIn(w, RULE_BOUNDS.uint32)) && isIntegerIn(value.cursor, RULE_BOUNDS.cursor);
}
export function nextUint32(input: RngState): { value: number; rng: RngState } {
  if (!isRngState(input) || input.cursor === RULE_BOUNDS.cursor.max) throw new RangeError('Invalid or exhausted RNG state');
  const [a,b,c,counter] = input.words;
  const value = (a + b + counter) >>> 0;
  return { value, rng: { words: [ (b ^ (b >>> 9)) >>> 0, (c + (c << 3)) >>> 0,
    (((c << 21) | (c >>> 11)) + value) >>> 0, (counter + 1) >>> 0 ], cursor: input.cursor + 1 } };
}
export function seedRng(seed: number): RngState {
  if (!isIntegerIn(seed, RULE_BOUNDS.uint32)) throw new RangeError('Invalid seed');
  let rng: RngState = { words: [0,seed,0,1], cursor: 0 };
  for (let i = 0; i < RNG_WARMUP_DRAWS; i++) rng = nextUint32(rng).rng;
  return { words: rng.words, cursor: 0 };
}
export function rollDie(input: RngState, sides: number): { value: number; rng: RngState } {
  if (!isIntegerIn(sides, RULE_BOUNDS.dieSides)) throw new RangeError('Invalid die sides');
  const limit = UINT32_RANGE - UINT32_RANGE % sides;
  let result = nextUint32(input);
  while (result.value >= limit) result = nextUint32(result.rng);
  return { value: result.value % sides + 1, rng: result.rng };
}
